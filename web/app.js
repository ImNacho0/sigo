let socket;
const statusDot = document.querySelector(".status-dot");

const cpuVal = document.getElementById("cpu-val");
const cpuBar = document.getElementById("cpu-bar");
const ramVal = document.getElementById("ram-val");
const ramBar = document.getElementById("ram-bar");
const activeSystems = document.getElementById("active-systems");

const downloadsContainer = document.getElementById("downloads-container");
const downloadTemplate = document.getElementById("download-template");

const processList = document.getElementById("process-list");
const logOverlay = document.getElementById("log-overlay");
const logContent = document.getElementById("log-content");
const logTitle = document.getElementById("log-title");

let currentLogs = {}; // Map Process ID -> Log Array

function connect() {
    socket = new WebSocket("ws://" + window.location.host + "/ws");

    socket.onopen = () => {
        console.log("WebSocket connected");
        if (statusDot) {
            statusDot.classList.add("healthy");
            statusDot.style.background = "#00ff00"; // Green
        }
    };

    socket.onclose = () => {
        console.warn("WebSocket disconnected, retrying...");
        if (statusDot) {
            statusDot.classList.remove("healthy");
            statusDot.style.background = "#ff4b2b"; // Red
        }
        setTimeout(connect, 2000);
    };

    socket.onerror = (err) => {
        console.error("WebSocket error:", err);
    };

    socket.onmessage = (event) => {
        try {
            const msg = JSON.parse(event.data);
            console.log("WebSocket message received:", msg.type);

            switch (msg.type) {
                case "stats":
                    updateStats(msg.data);
                    break;
                case "processes":
                    updateProcesses(msg.data);
                    break;
                case "progress_multi":
                    updateProgressMulti(msg.data);
                    break;
            }
        } catch (e) {
            console.error("Error parsing WebSocket message:", e, event.data);
        }
    };
}

function updateStats(data) {
    const cpu = Math.round(data.cpu);
    const ram = Math.round(data.ram);

    if (cpuVal) cpuVal.textContent = `${cpu}%`;
    if (cpuBar) cpuBar.style.width = `${cpu}%`;

    if (ramVal) ramVal.textContent = `${ram}%`;
    if (ramBar) ramBar.style.width = `${ram}%`;
}

function updateProgressMulti(data) {
    const activeFilenames = Object.keys(data);

    // Remove cards that are no longer active
    const cards = downloadsContainer.querySelectorAll('.download-card');
    cards.forEach(card => {
        if (!activeFilenames.includes(card.dataset.filename)) {
            card.remove();
        }
    });

    activeFilenames.forEach(filename => {
        const dlData = data[filename];
        let card = downloadsContainer.querySelector(`[data-filename="${CSS.escape(filename)}"]`);

        if (!card) {
            const clone = downloadTemplate.content.cloneNode(true);
            card = clone.querySelector('.download-card');
            card.dataset.filename = filename;
            downloadsContainer.appendChild(card);
        }

        const nameEl = card.querySelector('.dl-name');
        const percentEl = card.querySelector('.dl-percent');
        const barEl = card.querySelector('.progress-fill');
        const speedEl = card.querySelector('.dl-speed');
        const timeEl = card.querySelector('.dl-time');
        const pauseBtn = card.querySelector('.pause-btn');
        const iconContainer = card.querySelector('.pause-icon');

        nameEl.textContent = filename;
        percentEl.textContent = `${dlData.percent}%`;
        barEl.style.width = `${dlData.percent}%`;
        speedEl.textContent = dlData.speed || "";
        timeEl.textContent = dlData.time_left || "";

        // SVG Icons
        const playIcon = `<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>`;
        const pauseIconSvg = `<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>`;

        if (dlData.paused) {
            if (iconContainer.dataset.state !== "play") {
                iconContainer.innerHTML = playIcon;
                iconContainer.dataset.state = "play";
            }
            card.classList.add("paused-active");
        } else {
            if (iconContainer.dataset.state !== "pause") {
                iconContainer.innerHTML = pauseIconSvg;
                iconContainer.dataset.state = "pause";
            }
            card.classList.remove("paused-active");
        }

        pauseBtn.onclick = () => toggleDownloadPause(filename);
    });
}

function toggleDownloadPause(filename) {
    fetch(`/api/progress/toggle?filename=${encodeURIComponent(filename)}`, { method: 'POST' })
        .catch(err => console.error("Error toggling pause:", err));
}

function updateProcesses(data) {
    const activeCount = data.filter(p => p.running).length;
    const inactiveCount = data.length - activeCount;
    if (activeSystems) activeSystems.textContent = `${activeCount} Active / ${inactiveCount} Inactive`;

    data.forEach(proc => {
        let card = document.getElementById(`proc-${proc.id}`);
        if (!card) {
            card = createProcessCard(proc);
            processList.appendChild(card);
        }

        const toggle = card.querySelector('.toggle-switch');
        const indicator = card.querySelector('.status-indicator');

        if (proc.id === 'bot_indexer') {
            const btnIdx = card.querySelector('#btn-index-db');
            const btnDeidx = card.querySelector('#btn-deindex-db');
            if (proc.running) {
                indicator.innerHTML = '<span class="status-dot healthy"></span> Processing...';
                if (btnIdx) btnIdx.disabled = true;
                if (btnDeidx) btnDeidx.disabled = true;
            } else {
                indicator.innerHTML = '<span class="status-dot inactive"></span> Stopped';
                if (btnIdx) btnIdx.disabled = false;
                if (btnDeidx) btnDeidx.disabled = false;
            }
        } else {
            const toggle = card.querySelector('.toggle-switch');
            if (proc.running) {
                if (toggle) toggle.classList.add('active');
                indicator.innerHTML = '<span class="status-dot healthy"></span> Running';
            } else {
                if (toggle) toggle.classList.remove('active');
                indicator.innerHTML = '<span class="status-dot inactive"></span> Stopped';
            }
        }

        currentLogs[proc.id] = proc.logs;

        if (!logOverlay.classList.contains("hidden") && logTitle.dataset.id === proc.id) {
            renderLogs(proc.id);
        }
    });
}

function createProcessCard(proc) {
    const div = document.createElement('div');
    div.className = 'process-card';
    div.id = `proc-${proc.id}`;

    if (proc.id === 'bot_indexer') {
        div.innerHTML = `
            <div class="process-header" style="align-items: center; justify-content: space-between;">
                <div class="indexer-box" style="margin: 0; padding: 0; background: transparent; border: none; display: flex; gap: 8px;">
                    <div class="select-wrapper">
                        <select id="alias-selector" class="glass-select" style="padding: 6px 24px 6px 10px; font-size: 12px;">
                            <option value="" disabled selected>Target Alias...</option>
                            <option value="espana">España</option>
                            <option value="argentina">Argentina</option>
                            <option value="elsalvador">El Salvador</option>
                            <option value="nicaragua">Nicaragua</option>
                            <option value="peru">Perú</option>
                            <option value="chile">Chile</option>
                            <option value="bolivia">Bolivia</option>
                            <option value="ecuador">Ecuador</option>
                            <option value="venezuela">Venezuela</option>
                            <option value="paraguay">Paraguay</option>
                            <option value="mexico">México</option>
                        </select>
                    </div>
                    <button id="btn-index-db" onclick="startIndexer()" class="btn-primary" style="padding: 6px 12px; font-size: 12px;">
                        <svg width="18" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 4px;"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                        Indexar
                    </button>
                    <button id="btn-deindex-db" onclick="deindexFile()" class="btn-primary" style="padding: 6px 12px; font-size: 12px; background: linear-gradient(135deg, #dc3545 0%, #a71d2a 100%); box-shadow: 0 4px 12px rgba(220, 53, 69, 0.2);">
                        <svg width="18" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 4px;"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                        Desindexar
                    </button>
                </div>
            </div>
            <div class="process-actions" style="margin-top: 12px; padding-top: 12px; border-top: 1px solid rgba(255,255,255,0.05); display: flex; align-items: center; justify-content: space-between;">
                <div class="status-indicator">
                    <span class="status-dot inactive"></span> Stopped
                </div>
                <button class="btn-log" onclick="openLogs('${proc.id}')" style="margin-left: auto;">View Logs</button>
            </div>
        `;
    } else {
        div.innerHTML = `
            <div class="process-header">
                <div class="process-info">
                    <span class="process-name">${proc.name || proc.id}</span>
                    <span class="process-type">${proc.type}</span>
                </div>
                <div class="toggle-switch" onclick="toggleProcess('${proc.id}')">
                    <div class="toggle-knob"></div>
                </div>
            </div>
            <div class="process-actions">
                <div class="status-indicator">
                    <span class="status-dot inactive"></span> Stopped
                </div>
                <button class="btn-log" onclick="openLogs('${proc.id}')">View Logs</button>
            </div>
        `;
    }
    return div;
}

function toggleProcess(id) {
    const card = document.getElementById(`proc-${id}`);
    const toggle = card.querySelector('.toggle-switch');
    const isRunning = toggle.classList.contains('active');
    const endpoint = isRunning ? 'stop' : 'start';

    fetch(`/api/processes/${endpoint}?id=${id}`, { method: 'POST' })
        .catch(err => {
            console.error(`Error ${endpoint}ing process:`, err);
            alert(`Error: ${err.message}`);
        });
}

function startIndexer() {
    const alias = document.getElementById('alias-selector').value;
    if (!alias) {
        alert("Please select an alias.");
        return;
    }

    // Disable button temporarily
    const btn = document.getElementById('btn-index-db');
    btn.disabled = true;

    // We target the bot_indexer process specifically
    fetch(`/api/processes/start?id=bot_indexer&alias=${encodeURIComponent(alias)}`, { method: 'POST' })
        .then(res => {
            if (!res.ok) throw new Error("Failed to start indexer. It might already be running.");
            console.log("Indexer started with alias:", alias);
            // Optionally auto-open logs for bot_indexer
            setTimeout(() => openLogs('bot_indexer'), 500);
        })
        .catch(err => {
            console.error("Error starting indexer:", err);
            alert(err.message);
        })
        .finally(() => {
            btn.disabled = false;
        });
}

function deindexFile() {
    const alias = document.getElementById('alias-selector').value;
    if (!alias) {
        alert("Please select an alias first.");
        return;
    }

    const filename = prompt("Ingrese el nombre del archivo exacto a desindexar (ej: CENSO.txt):");
    if (!filename) return;

    if (!confirm(`¿Estás seguro de que quieres eliminar todos los registros de "${filename}" del alias "${alias}" y de spaindb?`)) {
        return;
    }

    const btn = document.getElementById('btn-deindex-db');
    btn.disabled = true;

    fetch(`/api/processes/deindex?alias=${encodeURIComponent(alias)}&filename=${encodeURIComponent(filename)}`, { method: 'POST' })
        .then(res => {
            if (!res.ok) return res.text().then(t => { throw new Error(t) });
            // Alert success but don't open logs
            alert(`Desindexación de "${filename}" iniciada con éxito.`);
        })
        .catch(err => {
            console.error("Error deindexing:", err);
            alert("Error: " + err.message);
        })
        .finally(() => {
            btn.disabled = false;
        });
}

function openLogs(id) {
    logTitle.textContent = `Logs: ${id}`;
    logTitle.dataset.id = id;
    renderLogs(id);
    logOverlay.classList.remove("hidden");
    document.body.style.overflow = 'hidden';
}

function renderLogs(id) {
    const logs = currentLogs[id] || [];
    logContent.textContent = logs.join('\n');
    logContent.scrollTop = logContent.scrollHeight;
}

function closeLogs() {
    logOverlay.classList.add("hidden");
    logTitle.dataset.id = "";
    document.body.style.overflow = 'auto';
}

// Start connection
connect();
