package main

import (
	"bufio"
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"github.com/joho/godotenv"
)

var DiscordProcessWebhook = "https://discord.com/api/webhooks/1467912108548292629/KAs_KSCYZspVozHUJa5Jeyx_dZFBU0GW5LU6s9cfStU2XZDubGQEvKzn7ZlxVBBWRGzN"

func init() {
	// Try to load .env from current directory or parent directory
	envPath := ".env"
	if _, err := os.Stat(envPath); os.IsNotExist(err) {
		envPath = filepath.Join("..", ".env")
	}
	_ = godotenv.Load(envPath)

	if val := os.Getenv("DISCORD_PROCESS_WEBHOOK"); val != "" {
		DiscordProcessWebhook = val
	}
}

type DiscordEmbed struct {
	Title       string         `json:"title,omitempty"`
	Description string         `json:"description,omitempty"`
	Color       int            `json:"color,omitempty"`
	Fields      []DiscordField `json:"fields,omitempty"`
	Footer      *DiscordFooter `json:"footer,omitempty"`
	Timestamp   string         `json:"timestamp,omitempty"`
}

type DiscordField struct {
	Name   string `json:"name"`
	Value  string `json:"value"`
	Inline bool   `json:"inline,omitempty"`
}

type DiscordFooter struct {
	Text string `json:"text"`
}

type DiscordPayload struct {
	Username  string         `json:"username,omitempty"`
	AvatarURL string         `json:"avatar_url,omitempty"`
	Content   string         `json:"content,omitempty"`
	Embeds    []DiscordEmbed `json:"embeds,omitempty"`
}

func LogActionToDiscord(action, processID, details string, color int) {
	embed := DiscordEmbed{
		Title: "⚙️ Process Manager Action",
		Color: color,
		Fields: []DiscordField{
			{Name: "Action", Value: fmt.Sprintf("`%s`", action), Inline: true},
			{Name: "Process", Value: fmt.Sprintf("`%s`", processID), Inline: true},
		},
		Timestamp: time.Now().Format(time.RFC3339),
		Footer: &DiscordFooter{
			Text: "SIGO Indexer Logger",
		},
	}

	if details != "" {
		// Truncate details if too long for Discord
		if len(details) > 1000 {
			details = details[:997] + "..."
		}
		embed.Fields = append(embed.Fields, DiscordField{Name: "Details", Value: fmt.Sprintf("```%s```", details), Inline: false})
	}

	payload := DiscordPayload{
		Embeds: []DiscordEmbed{embed},
	}
	data, _ := json.Marshal(payload)

	go func() {
		client := &http.Client{Timeout: 5 * time.Second}
		resp, err := client.Post(DiscordProcessWebhook, "application/json", bytes.NewBuffer(data))
		if err == nil {
			resp.Body.Close()
		}
	}()
}

type ProcessConfig struct {
	ID      string `json:"id"`
	Name    string `json:"name"`
	Command string `json:"command"`
	Type    string `json:"type"`
}

type ProcessStatus struct {
	ID      string   `json:"id"`
	Name    string   `json:"name"`
	Type    string   `json:"type"`
	Running bool     `json:"running"`
	Logs    []string `json:"logs"`
}

type ProcessManager struct {
	Configs        []ProcessConfig
	Procs          map[string]*exec.Cmd
	InternalCancel map[string]context.CancelFunc
	Logs           map[string][]string
	Mutex          sync.Mutex
}

func LoadConfig(path string) ([]ProcessConfig, error) {
	file, err := os.Open(path)
	if err != nil {
		return nil, err
	}
	defer file.Close()

	var configs []ProcessConfig
	decoder := json.NewDecoder(file)
	err = decoder.Decode(&configs)
	return configs, err
}

func NewProcessManager(configs []ProcessConfig) *ProcessManager {
	return &ProcessManager{
		Configs:        configs,
		Procs:          make(map[string]*exec.Cmd),
		InternalCancel: make(map[string]context.CancelFunc), // Added this line
		Logs:           make(map[string][]string),
	}
}

func (pm *ProcessManager) StartProcess(id string, extraArgs ...string) error {
	pm.Mutex.Lock()
	// No defer unlock here, handle it manually to avoid deadlock with broadcastUpdate

	if _, exists := pm.Procs[id]; exists {
		pm.Mutex.Unlock()
		LogActionToDiscord("ERROR_START", id, "Process already running", 0xff0000) // Red color
		return fmt.Errorf("process already running")
	}
	if _, exists := pm.InternalCancel[id]; exists {
		pm.Mutex.Unlock()
		LogActionToDiscord("ERROR_START", id, "Internal process already running", 0xff0000) // Red color
		return fmt.Errorf("internal process already running")
	}

	var config ProcessConfig
	found := false
	for _, c := range pm.Configs {
		if c.ID == id {
			config = c
			found = true
			break
		}
	}
	if !found {
		pm.Mutex.Unlock()
		LogActionToDiscord("ERROR_START", id, "Config not found", 0xff0000) // Red color
		return fmt.Errorf("config not found")
	}

	pm.appendLog(id, "Process started.")

	if config.Type == "internal" {
		ctx, cancel := context.WithCancel(context.Background())
		pm.InternalCancel[id] = cancel

		go func() {
			var err error
			if id == "bot_indexer" {
				mode := "index"
				alias := "spaindb"
				filename := ""
				for i, arg := range extraArgs {
					if arg == "--mode" && i+1 < len(extraArgs) {
						mode = extraArgs[i+1]
					}
					if arg == "--alias" && i+1 < len(extraArgs) {
						alias = extraArgs[i+1]
					}
					if arg == "--filename" && i+1 < len(extraArgs) {
						filename = extraArgs[i+1]
					}
				}

				if mode == "deindex" {
					err = RunDeindexing(ctx, id, alias, filename, pm)
				} else {
					err = runInternalIndexer(ctx, id, alias, pm)
				}
			} else {
				err = fmt.Errorf("unknown internal process id: %s", id)
			}

			pm.Mutex.Lock()
			delete(pm.InternalCancel, id)
			if err != nil && err != context.Canceled {
				pm.appendLog(id, fmt.Sprintf("Internal process exited with error: %v", err))
				LogActionToDiscord("ERROR_EXIT", id, fmt.Sprintf("Internal process exited with error: %v", err), 0xff0000) // Red color
			} else {
				pm.appendLog(id, "Internal process finished.")
				LogActionToDiscord("FINISH_INTERNAL", id, "Internal process finished normally", 0x00ff00) // Green color
			}
			pm.Mutex.Unlock()
			broadcastUpdate()
		}()

		pm.Mutex.Unlock()
		LogActionToDiscord("START_INTERNAL", id, "Internal process started", 0x00ff00) // Green color
		broadcastUpdate()
		return nil
	}

	args := strings.Fields(config.Command)
	if len(args) == 0 {
		pm.Mutex.Unlock()
		return fmt.Errorf("empty command")
	}

	args = append(args, extraArgs...)

	log.Printf("Starting process %s: %v", id, args)
	cmd := exec.Command(args[0], args[1:]...)
	// Set UTF-8 encoding for Python and other processes to avoid charmap errors on Windows
	cmd.Env = append(os.Environ(), "PYTHONIOENCODING=utf-8", "PYTHONUTF8=1")
	// Set appropriate SysProcAttr for windows if needed to hide window or detach
	// For now we keep it simple

	stdout, _ := cmd.StdoutPipe()
	stderr, _ := cmd.StderrPipe()

	if err := cmd.Start(); err != nil {
		pm.Mutex.Unlock()
		log.Printf("Error starting process %s: %v", id, err)
		LogActionToDiscord("ERROR_START", id, fmt.Sprintf("Failed to start process: %v", err), 0xff0000) // Red color
		return err
	}

	pm.Procs[id] = cmd

	go pm.captureOutput(id, stdout)
	go pm.captureOutput(id, stderr)

	go func() {
		err := cmd.Wait()
		pm.Mutex.Lock()
		delete(pm.Procs, id)
		pm.appendLog(id, fmt.Sprintf("Process exited: %v", err))
		if err != nil {
			LogActionToDiscord("ERROR_EXIT", id, fmt.Sprintf("External process exited with error: %v", err), 0xff0000) // Red color
		} else {
			LogActionToDiscord("FINISH_EXTERNAL", id, "External process finished normally", 0x00ff00) // Green color
		}
		pm.Mutex.Unlock()
		log.Printf("Process %s exited with err: %v", id, err)
		broadcastUpdate()
	}()

	pm.Mutex.Unlock()
	LogActionToDiscord("START", id, fmt.Sprintf("External process started: %s", config.Name), 0x00ff00) // Green color
	broadcastUpdate()
	return nil
}

func (pm *ProcessManager) StopProcess(id string) error {
	pm.Mutex.Lock()
	// No defer unlock here

	// Check internal processes first
	if cancel, exists := pm.InternalCancel[id]; exists {
		cancel()
		delete(pm.InternalCancel, id)
		pm.appendLog(id, "Internal process stopped by user.")
		pm.Mutex.Unlock()
		LogActionToDiscord("STOP_INTERNAL", id, "Internal process stopped by user", 0xff9900) // Orange color
		broadcastUpdate()
		return nil
	}

	cmd, exists := pm.Procs[id]
	if !exists {
		pm.Mutex.Unlock()
		return fmt.Errorf("process not running")
	}

	// On Windows, Kill() only kills the parent. We use taskkill /F /T to kill the entire tree.
	killCmd := exec.Command("taskkill", "/F", "/T", "/PID", fmt.Sprintf("%d", cmd.Process.Pid))
	if err := killCmd.Run(); err != nil {
		// Fallback to standard kill if taskkill fails
		if err := cmd.Process.Kill(); err != nil {
			pm.Mutex.Unlock()
			return err
		}
	}

	delete(pm.Procs, id)
	pm.appendLog(id, "Process stopped (tree killed).")
	pm.Mutex.Unlock()

	LogActionToDiscord("STOP", id, fmt.Sprintf("Process stopped (tree killed) - PID: %d", cmd.Process.Pid), 0xff9900) // Orange color

	broadcastUpdate()
	return nil
}

func (pm *ProcessManager) captureOutput(id string, r io.Reader) {
	scanner := bufio.NewScanner(r)
	for scanner.Scan() {
		text := scanner.Text()
		pm.log(id, text)
	}
}

func (pm *ProcessManager) appendLog(id string, text string) {
	timestamp := time.Now().Format("15:04:05")
	logLine := fmt.Sprintf("[%s] %s", timestamp, text)

	if len(pm.Logs[id]) > 100 {
		pm.Logs[id] = pm.Logs[id][1:]
	}
	pm.Logs[id] = append(pm.Logs[id], logLine)
}

func (pm *ProcessManager) log(id string, text string) {
	pm.Mutex.Lock()
	defer pm.Mutex.Unlock()
	pm.appendLog(id, text)
}

func (pm *ProcessManager) GetStatuses() []ProcessStatus {
	pm.Mutex.Lock()
	defer pm.Mutex.Unlock()

	var statuses []ProcessStatus
	for _, c := range pm.Configs {
		running := false
		if _, exists := pm.Procs[c.ID]; exists {
			running = true
		} else if _, exists := pm.InternalCancel[c.ID]; exists {
			running = true
		}
		// Safely copy logs
		logs := make([]string, len(pm.Logs[c.ID]))
		copy(logs, pm.Logs[c.ID])

		statuses = append(statuses, ProcessStatus{
			ID:      c.ID,
			Name:    c.Name,
			Type:    c.Type,
			Running: running,
			Logs:    logs,
		})
	}
	return statuses
}
