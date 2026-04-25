package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"sync"
	"time"

	"github.com/gorilla/websocket"
)

var pm *ProcessManager
var downloadStatuses = make(map[string]*DownloadProgress)
var statusMutex sync.Mutex

type DownloadProgress struct {
	Active   bool   `json:"active"`
	Filename string `json:"filename"`
	Percent  int    `json:"percent"`
	Speed    string `json:"speed"`
	TimeLeft string `json:"time_left"`
	Paused   bool   `json:"paused"`
}

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool { return true },
}

type BroadcastMessage struct {
	Type string      `json:"type"`
	Data interface{} `json:"data"`
}

type SafeClient struct {
	conn  *websocket.Conn
	mutex sync.Mutex
}

func (sc *SafeClient) WriteJSON(v interface{}) error {
	sc.mutex.Lock()
	defer sc.mutex.Unlock()
	return sc.conn.WriteJSON(v)
}

func (sc *SafeClient) Close() error {
	return sc.conn.Close()
}

var clients = make(map[*SafeClient]bool)
var clientsMutex sync.RWMutex
var broadcast = make(chan BroadcastMessage, 100)

func main() {
	configs, err := LoadConfig("configs/config.json")
	if err != nil {
		log.Fatal("Error loading config:", err)
	}

	pm = NewProcessManager(configs)
	StartCPUTracker()

	// Start system stats ticker
	go func() {
		for {
			stats, err := GetSystemStats()
			if err == nil {
				broadcast <- BroadcastMessage{Type: "stats", Data: stats}
			}

			// Also broadcast process status periodically
			broadcast <- BroadcastMessage{Type: "processes", Data: pm.GetStatuses()}

			// And download statuses
			statusMutex.Lock()
			if len(downloadStatuses) > 0 {
				broadcast <- BroadcastMessage{Type: "progress_multi", Data: downloadStatuses}
			} else {
				broadcast <- BroadcastMessage{Type: "progress_multi", Data: map[string]*DownloadProgress{}}
			}
			statusMutex.Unlock()

			time.Sleep(1 * time.Second)
		}
	}()

	go handleMessages()

	http.Handle("/", http.FileServer(http.Dir("./web")))
	http.HandleFunc("/ws", handleConnections)
	http.HandleFunc("/api/processes/start", handleStartProcess)
	http.HandleFunc("/api/processes/stop", handleStopProcess)
	http.HandleFunc("/api/processes/deindex", handleDeindex)
	http.HandleFunc("/api/progress", handleProgressUpdate)
	http.HandleFunc("/api/progress/toggle", handleProgressToggle)

	fmt.Println("Server started on :8081")
	err = http.ListenAndServe(":8081", nil)
	if err != nil {
		log.Fatal("ListenAndServe: ", err)
	}
}

func handleConnections(w http.ResponseWriter, r *http.Request) {
	ws, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("Upgrade error from %s: %v", r.RemoteAddr, err)
		return
	}
	log.Printf("New WebSocket client connected: %s", r.RemoteAddr)
	defer ws.Close()

	safeClient := &SafeClient{conn: ws}

	clientsMutex.Lock()
	clients[safeClient] = true
	clientsMutex.Unlock()

	// Push current status immediately after connection in a goroutine
	go func(sc *SafeClient) {
		stats, err := GetSystemStats()
		if err == nil {
			sc.WriteJSON(BroadcastMessage{Type: "stats", Data: stats})
		}
		sc.WriteJSON(BroadcastMessage{Type: "processes", Data: pm.GetStatuses()})
		statusMutex.Lock()
		if len(downloadStatuses) > 0 {
			sc.WriteJSON(BroadcastMessage{Type: "progress_multi", Data: downloadStatuses})
		}
		statusMutex.Unlock()
	}(safeClient)

	for {
		var msg interface{}
		err := ws.ReadJSON(&msg)
		if err != nil {
			clientsMutex.Lock()
			delete(clients, safeClient)
			clientsMutex.Unlock()
			break
		}
	}
}

func handleMessages() {
	for msg := range broadcast {
		clientsMutex.RLock()
		for client := range clients {
			// Run in goroutine to avoid blocking the whole broadcast loop on one slow client
			go func(c *SafeClient, m BroadcastMessage) {
				err := c.WriteJSON(m)
				if err != nil {
					c.Close()
					clientsMutex.Lock()
					delete(clients, c)
					clientsMutex.Unlock()
				}
			}(client, msg)
		}
		clientsMutex.RUnlock()
	}
}

func broadcastUpdate() {
	if pm != nil {
		broadcast <- BroadcastMessage{Type: "processes", Data: pm.GetStatuses()}
	}
}

func handleStartProcess(w http.ResponseWriter, r *http.Request) {
	id := r.URL.Query().Get("id")
	alias := r.URL.Query().Get("alias")

	log.Printf("Starting process: %s", id)
	if r.Method != "POST" {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var err error
	if id == "bot_indexer" && alias != "" {
		err = pm.StartProcess(id, "--alias", alias)
	} else {
		err = pm.StartProcess(id)
	}

	if err != nil {
		log.Printf("Start error: %v", err)
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusOK)
}

func handleStopProcess(w http.ResponseWriter, r *http.Request) {
	if r.Method != "POST" {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}
	id := r.URL.Query().Get("id")
	if err := pm.StopProcess(id); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusOK)
}

func handleDeindex(w http.ResponseWriter, r *http.Request) {
	if r.Method != "POST" {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}
	alias := r.URL.Query().Get("alias")
	filename := r.URL.Query().Get("filename")

	if alias == "" || filename == "" {
		http.Error(w, "Alias and filename are required", http.StatusBadRequest)
		return
	}

	// We use the same bot_indexer ID to share the log view and process status
	err := pm.StartProcess("bot_indexer", "--mode", "deindex", "--alias", alias, "--filename", filename)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusOK)
}

func handleProgressUpdate(w http.ResponseWriter, r *http.Request) {
	if r.Method != "POST" {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var progress DownloadProgress
	if err := json.NewDecoder(r.Body).Decode(&progress); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	if progress.Filename == "" {
		http.Error(w, "Filename is required", http.StatusBadRequest)
		return
	}

	statusMutex.Lock()
	if progress.Active {
		// Preserve paused state if exists
		if existing, ok := downloadStatuses[progress.Filename]; ok {
			progress.Paused = existing.Paused
		}
		downloadStatuses[progress.Filename] = &progress
	} else {
		delete(downloadStatuses, progress.Filename)
	}
	statusMutex.Unlock()

	json.NewEncoder(w).Encode(map[string]bool{"paused": progress.Paused})
}

func handleProgressToggle(w http.ResponseWriter, r *http.Request) {
	if r.Method != "POST" {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	filename := r.URL.Query().Get("filename")
	statusMutex.Lock()
	if ds, ok := downloadStatuses[filename]; ok {
		ds.Paused = !ds.Paused
		broadcast <- BroadcastMessage{Type: "progress_multi", Data: downloadStatuses}
	}
	statusMutex.Unlock()
	w.WriteHeader(http.StatusOK)
}
