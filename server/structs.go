package main

import "time"

// ================= LICENSING MODELS =================

type License struct {
	Key         string    `json:"key"`
	Name        string    `json:"name"`
	Type        string    `json:"type"` // "web", "api", "all"
	Expiration  time.Time `json:"expiration"`
	QuotaSearch int       `json:"quota_search"`
	QuotaPadron int       `json:"quota_padron"`
	UsedSearch  int       `json:"used_search"`
	UsedPadron  int       `json:"used_padron"`
	LastReset   time.Time `json:"last_reset"`
	Role        string    `json:"role"` // "owner", "staff", "user"
}

// ================= CHAT MODELS =================

type ChatMessage struct {
	ID string `json:"id"`
	// Optional: session identifier for per-session SSE routing
	SessionID string    `json:"session_id,omitempty"`
	Type      string    `json:"type"` // "message", "delete"
	Sender    string    `json:"sender"`
	Role      string    `json:"role"` // "owner", "staff", "user"
	Content   string    `json:"content"`
	Timestamp time.Time `json:"timestamp"`
	IsSystem  bool      `json:"is_system"`
}

// ================= PROXY / DATA MODELS =================

type Person map[string]interface{}

type AddressGroup struct {
	Years  map[int]bool
	People []Person
}

type PadronPersona map[string]interface{}

type PadronAddress struct {
	Direccion    string          `json:"direccion"`
	CodigoPostal string          `json:"codigo_postal"`
	Localizacion string          `json:"localizacion"`
	Personas     []PadronPersona `json:"personas"`
	Years        []int           `json:"years"`
}

type PadronResponse struct {
	Direcciones []PadronAddress `json:"direcciones"`
	Objetivo    string          `json:"objetivo"`
}
