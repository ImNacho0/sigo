package main

import (
	"fmt"
	"mime"
	"net/http"
	"os"
	"sync"
	"time"

	"log"
	"strings"

	"golang.org/x/net/proxy"
)

const (
	TorProxy      = "127.0.0.1:9050"
	BackendURL    = "http://127.0.0.1:5000"
	BearerToken   = "SVwp00yfJjx2FTuV5AmFVEMUknsfd6sdertgajksfgyr1GBoKQjCK"
	ListenAddr    = "0.0.0.0:80"
	TorListenAddr = "127.0.0.1:8081"
	GeminiAPIKey  = "AIzaSyD6aNe6lx4vFQ7yYKubkBiRatM2rRkA4oE"
	GeminiURL     = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key="

	// Discord Webhooks
	DiscordSearchWebhook = "https://discord.com/api/webhooks/1467911384950903041/QlKl4UheCp4lxVDYsmqM_KplKoF_38Z8pVuZWYOGBCDKYex8zvLKOm26U-CA3QRkZS9I"
	DiscordChatWebhook   = "https://discord.com/api/webhooks/1467911978834985023/-Inj6yUzEbEZAj_SQ1jqpdTY4EC8aISCA4CDCe1rU_qdjGsFy0JUrjj5zZ6Eb-BPQHVK"
	DiscordBrandColor    = 0x1a4031 // Dark Green from branding
)

// Runtime tokens for inbound bridge security (configured via environment)
var DiscordBridgeToken string

var torClient *http.Client
var INCIVE_FILES []string

// Cache structures
type CacheEntry struct {
	Data       []byte
	StatusCode int
}

type APICache struct {
	mu    sync.Mutex
	items map[string]CacheEntry
	order []string
	limit int
}

func NewAPICache(limit int) *APICache {
	return &APICache{
		items: make(map[string]CacheEntry),
		order: make([]string, 0, limit),
		limit: limit,
	}
}

func (c *APICache) Get(key string) (CacheEntry, bool) {
	c.mu.Lock()
	defer c.mu.Unlock()
	entry, ok := c.items[key]
	return entry, ok
}

func (c *APICache) Set(key string, data []byte, statusCode int) {
	c.mu.Lock()
	defer c.mu.Unlock()

	// If already in cache, just update (rare for our usage)
	if _, ok := c.items[key]; ok {
		c.items[key] = CacheEntry{Data: data, StatusCode: statusCode}
		return
	}

	// Evict oldest if limit reached
	if len(c.order) >= c.limit {
		oldest := c.order[0]
		delete(c.items, oldest)
		c.order = c.order[1:]
	}

	c.items[key] = CacheEntry{Data: data, StatusCode: statusCode}
	c.order = append(c.order, key)
}

var globalCache = NewAPICache(100)

func init() {
	// Register WebP MIME type (Correcting from WP2 experiment)
	mime.AddExtensionType(".webp", "image/webp")

	// Setup runtime tokens for inbound Discord bridge
	DiscordBridgeToken = os.Getenv("DISCORD_BRIDGE_TOKEN")

	// Match Python logic for INCIVE_FILES
	for i := 1; i <= 52; i++ {
		INCIVE_FILES = append(INCIVE_FILES, fmt.Sprintf("INCIVE DE PADRON ELECTORAL 2011_%d.json", i))
	}
	for i := 1; i <= 53; i++ {
		INCIVE_FILES = append(INCIVE_FILES, fmt.Sprintf("INCIVE DE PADRON ELECTORAL 2018_%d.json", i))
	}
	for i := 1; i <= 52; i++ {
		INCIVE_FILES = append(INCIVE_FILES, fmt.Sprintf("INCIVE DE PADRON ELECTORAL 2022_%d.json", i))
	}
}

func initTorClient() {
	dialer, err := proxy.SOCKS5("tcp", TorProxy, nil, proxy.Direct)
	if err != nil {
		log.Fatalf("Error creating TOR proxy dialer: %v", err)
	}

	httpTransport := &http.Transport{
		Dial: dialer.Dial,
	}

	torClient = &http.Client{
		Transport: httpTransport,
		Timeout:   180 * time.Second,
	}
}

// getHttpClient chooses between TOR and Direct based on URL
func getHttpClient(targetURL string) *http.Client {
	if strings.Contains(targetURL, ".onion") {
		return torClient
	}
	return http.DefaultClient
}
