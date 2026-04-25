package main

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"
)

func handleChatHistory(w http.ResponseWriter, r *http.Request) {
	chatManager.mu.Lock()
	defer chatManager.mu.Unlock()
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(chatManager.History)
}

func handleChatSend(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Support both internal UI messages and Discord-originated messages
	var req struct {
		Content   string `json:"content"`
		Origin    string `json:"origin"`     // e.g., "web" or "discord"
		Channel   string `json:"channel"`    // optional: Discord channel id
		SessionID string `json:"session_id"` // optional: explicit session id
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid JSON", http.StatusBadRequest)
		return
	}

	content := strings.TrimSpace(req.Content)
	if content == "" {
		return
	}

	// Enforce 200-char limit for content
	if len(content) > 200 {
		content = content[:200]
	}

	// If origin is discord, route to the corresponding session via session_id
	if strings.EqualFold(req.Origin, "discord") {
		// Simple security: validate a shared token if configured
		bridgeToken := r.Header.Get("X-Discord-Bridge-Token")
		if DiscordBridgeToken != "" && bridgeToken != DiscordBridgeToken {
			http.Error(w, "Unauthorized bridge token", http.StatusUnauthorized)
			return
		}
		if req.SessionID == "" {
			http.Error(w, "Missing session_id for Discord-originated message", http.StatusBadRequest)
			return
		}
		senderName := "Discord"
		if req.Channel != "" {
			senderName = fmt.Sprintf("Discord:%s", req.Channel)
		}
		msg := ChatMessage{
			ID:        fmt.Sprintf("%d", time.Now().UnixNano()),
			Type:      "message",
			Sender:    senderName,
			Role:      "bot",
			Content:   content,
			Timestamp: time.Now(),
			IsSystem:  false,
			SessionID: req.SessionID,
		}
		chatManager.BroadcastToSession(req.SessionID, msg)
		w.WriteHeader(http.StatusOK)
		return
	}

	// Default: standard UI-originated message (user) from web UI
	senderName := "Desconocido"
	senderRole := "user"
	cookie, err := r.Cookie("UCO_SESSION")
	if err == nil {
		licenseManager.mu.Lock()
		if lic, ok := licenseManager.Licenses[cookie.Value]; ok {
			senderName = lic.Name
			if lic.Role != "" {
				senderRole = lic.Role
			}
		}
		licenseManager.mu.Unlock()
	}

	msg := ChatMessage{
		ID:        fmt.Sprintf("%d", time.Now().UnixNano()),
		Type:      "message",
		Sender:    senderName,
		Role:      senderRole,
		Content:   content,
		Timestamp: time.Now(),
		IsSystem:  false,
	}

	// Mirror to Discord (existing behavior)
	SendChatMirror(senderName, content)

	chatManager.Broadcast(msg)
	w.WriteHeader(http.StatusOK)
}

func handleChatDelete(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// 1. Check Permissions
	cookie, err := r.Cookie("UCO_SESSION")
	if err != nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	canDelete := false
	licenseManager.mu.Lock()
	if lic, ok := licenseManager.Licenses[cookie.Value]; ok {
		if lic.Role == "owner" || lic.Role == "staff" {
			canDelete = true
		}
	}
	licenseManager.mu.Unlock()

	if !canDelete {
		http.Error(w, "Forbidden", http.StatusForbidden)
		return
	}

	// 2. Get Message ID
	var req struct {
		ID string `json:"id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid JSON", http.StatusBadRequest)
		return
	}

	// 3. Mark as deleted in History
	chatManager.mu.Lock()
	for i, msg := range chatManager.History {
		if msg.ID == req.ID {
			chatManager.History[i].Content = "Mensaje eliminado"
			chatManager.History[i].Type = "delete"
			break
		}
	}
	chatManager.mu.Unlock()

	// Broadcast delete event to all sessions
	deleteMsg := ChatMessage{
		ID:   req.ID,
		Type: "delete",
	}
	// We use the same broadcast mechanism but without per-session targeting
	go func() {
		chatManager.mu.Lock()
		defer chatManager.mu.Unlock()
		for _, clients := range chatManager.Sessions {
			for ch := range clients {
				select {
				case ch <- deleteMsg:
				default:
				}
			}
		}
	}()

	w.WriteHeader(http.StatusOK)
}

func handleChatStream(w http.ResponseWriter, r *http.Request) {
	// Expect session_id to multiplex streams per session
	sessionID := r.URL.Query().Get("session_id")
	if strings.TrimSpace(sessionID) == "" {
		http.Error(w, "Missing session_id", http.StatusBadRequest)
		return
	}

	// Set headers for SSE
	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")
	w.Header().Set("Access-Control-Allow-Origin", "*")

	// Create a channel for this client and subscribe to the specific session
	clientChan := make(chan ChatMessage, 10)
	chatManager.AddClient(sessionID, clientChan)

	// Ensure we remove client when connection closes
	defer chatManager.RemoveClient(sessionID, clientChan)

	// Listen for connection close
	notify := r.Context().Done()

	for {
		select {
		case <-notify:
			return
		case msg := <-clientChan:
			data, err := json.Marshal(msg)
			if err != nil {
				continue
			}
			fmt.Fprintf(w, "data: %s\n\n", data)
			w.(http.Flusher).Flush()
		}
	}
}
