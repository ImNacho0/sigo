package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"time"
)

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

func SendSearchLog(user, license, target, query string, resultsCount int, success, cached bool) {
	status := "❌ Sin resultados"
	color := 0x992d22 // Red

	if success {
		suffix := ""
		if cached {
			suffix = " (Local)"
		}
		status = fmt.Sprintf("✅ %d Resultados encontrados%s", resultsCount, suffix)
		color = DiscordBrandColor
	}

	embed := DiscordEmbed{
		Title: "🔍 Registro de Búsqueda",
		Color: color,
		Fields: []DiscordField{
			{Name: "👤 Usuario", Value: user, Inline: true},
			{Name: "🔑 Licencia", Value: fmt.Sprintf("`%s`", license), Inline: true},
			{Name: "🎯 Target", Value: fmt.Sprintf("`%s`", target), Inline: true},
			{Name: "🔎 Query", Value: fmt.Sprintf("`%s`", query), Inline: false},
			{Name: "", Value: status, Inline: false},
		},
		Timestamp: time.Now().Format(time.RFC3339),
		Footer: &DiscordFooter{
			Text: "UCO Web Logger",
		},
	}

	payload := DiscordPayload{
		Embeds: []DiscordEmbed{embed},
	}

	go sendToDiscord(DiscordSearchWebhook, payload)
}

func SendChatMirror(username, message string) {
	payload := DiscordPayload{
		Username: username,
		Content:  message,
	}
	go sendToDiscord(DiscordChatWebhook, payload)
}

func sendToDiscord(url string, payload DiscordPayload) {
	data, _ := json.Marshal(payload)
	req, err := http.NewRequest("POST", url, bytes.NewBuffer(data))
	if err != nil {
		fmt.Println("Error creating discord request:", err)
		return
	}
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 5 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		fmt.Println("Error sending to discord:", err)
		return
	}
	defer resp.Body.Close()
}
