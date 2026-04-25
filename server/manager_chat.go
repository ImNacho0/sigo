package main

import (
	"sync"
)

// ChatManager now supports per-session SSE streams.
// Each sessionID can have multiple SSE clients subscribed.
type ChatManager struct {
	mu      sync.Mutex
	History []ChatMessage
	// Sessions maps a session_id to its set of subscriber channels
	Sessions map[string]map[chan ChatMessage]bool
}

var chatManager = &ChatManager{
	History:  make([]ChatMessage, 0),
	Sessions: make(map[string]map[chan ChatMessage]bool),
}

// AddClient subscribes a new SSE client to a specific session.
func (cm *ChatManager) AddClient(sessionID string, ch chan ChatMessage) {
	cm.mu.Lock()
	defer cm.mu.Unlock()
	if cm.Sessions[sessionID] == nil {
		cm.Sessions[sessionID] = make(map[chan ChatMessage]bool)
	}
	cm.Sessions[sessionID][ch] = true
}

// RemoveClient unsubscribes a SSE client from a specific session.
func (cm *ChatManager) RemoveClient(sessionID string, ch chan ChatMessage) {
	cm.mu.Lock()
	defer cm.mu.Unlock()
	if cm.Sessions[sessionID] != nil {
		delete(cm.Sessions[sessionID], ch)
	}
	close(ch)
}

// Broadcast sends a message to all connected clients for all sessions (legacy path).
// Maintained for backward compatibility with existing UI streams that listen
// to a per-session channel by supplying a SessionID in the message.
func (cm *ChatManager) Broadcast(msg ChatMessage) {
	cm.mu.Lock()
	defer cm.mu.Unlock()
	cm.History = append(cm.History, msg)
	// If a message carries a SessionID, route only to that session's clients.
	// Otherwise, broadcast to all sessions (legacy behavior).
	if msg.SessionID != "" {
		if clients, ok := cm.Sessions[msg.SessionID]; ok {
			for ch := range clients {
				select {
				case ch <- msg:
				default:
					// Skip if the client is not ready
				}
			}
		}
		return
	}
	for _, clients := range cm.Sessions {
		for ch := range clients {
			select {
			case ch <- msg:
			default:
			}
		}
	}
}

// BroadcastToSession is a convenience wrapper to send a message to a specific session.
func (cm *ChatManager) BroadcastToSession(sessionID string, msg ChatMessage) {
	cm.mu.Lock()
	defer cm.mu.Unlock()
	// Persist history
	cm.History = append(cm.History, msg)
	if clients, ok := cm.Sessions[sessionID]; ok {
		for ch := range clients {
			select {
			case ch <- msg:
			default:
			}
		}
	}
}
