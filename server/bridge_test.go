package main

import (
	"bytes"
	"encoding/json"
	"net/http/httptest"
	"os"
	"testing"
)

func TestDiscordInboundBroadcastToSession(t *testing.T) {
	// Prepare a test token
	os.Setenv("DISCORD_BRIDGE_TOKEN", "test-token")
	// Reinitialize the runtime token used by the handler
	DiscordBridgeToken = os.Getenv("DISCORD_BRIDGE_TOKEN")

	sessionID := "sess-1"
	ch := make(chan ChatMessage, 1)
	chatManager.AddClient(sessionID, ch)

	payload := map[string]interface{}{
		"content":    "hello from discord",
		"origin":     "discord",
		"session_id": sessionID,
		"channel":    "disc-channel-1",
	}
	body, _ := json.Marshal(payload)
	req := httptest.NewRequest("POST", "/api/chat/send", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Discord-Bridge-Token", "test-token")

	w := httptest.NewRecorder()
	// Call the handler
	handleChatSend(w, req)

	if w.Result().StatusCode != 200 {
		t.Fatalf("expected 200, got %d", w.Result().StatusCode)
	}

	// Verify we received the message on the session channel
	select {
	case msg := <-ch:
		if msg.Content != "hello from discord" {
			t.Fatalf("unexpected content: %s", msg.Content)
		}
		if msg.SessionID != sessionID {
			t.Fatalf("unexpected session_id: %s", msg.SessionID)
		}
	default:
		t.Fatalf("expected message on session channel, got none")
	}
}
