package main

import (
	"fmt"
	"log"
	"mime"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"github.com/joho/godotenv"
	"golang.org/x/net/proxy"
)

var (
	TorProxy             = "127.0.0.1:9050"
	BackendURL           = "http://127.0.0.1:5000"
	BearerToken          string
	ListenAddr           = "0.0.0.0:80"
	TorListenAddr        = "127.0.0.1:8081"
	GeminiAPIKey         string
	GeminiURL            = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key="
	DiscordSearchWebhook string
	DiscordChatWebhook   string
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

	// Try to load .env from current directory or parent directory
	envPath := ".env"
	if _, err := os.Stat(envPath); os.IsNotExist(err) {
		// Try parent directory (e.g. when running from server/ directory)
		envPath = filepath.Join("..", ".env")
	}

	// Load it if we found it (it's okay if not, environment variables might be set directly)
	_ = godotenv.Load(envPath)

	// Load secrets from environment
	BearerToken = getEnvOrDefault("BACKEND_BEARER_TOKEN", "SVwp00yfJjx2FTuV5AmFVEMUknsfd6sdertgajksfgyr1GBoKQjCK")
	GeminiAPIKey = getEnvOrDefault("GEMINI_API_KEY", "AIzaSyD6aNe6lx4vFQ7yYKubkBiRatM2rRkA4oE")
	DiscordSearchWebhook = getEnvOrDefault("DISCORD_SEARCH_WEBHOOK", "https://discord.com/api/webhooks/1467911384950903041/QlKl4UheCp4lxVDYsmqM_KplKoF_38Z8pVuZWYOGBCDKYex8zvLKOm26U-CA3QRkZS9I")
	DiscordChatWebhook = getEnvOrDefault("DISCORD_CHAT_WEBHOOK", "https://discord.com/api/webhooks/1467911978834985023/-Inj6yUzEbEZAj_SQ1jqpdTY4EC8aISCA4CDCe1rU_qdjGsFy0JUrjj5zZ6Eb-BPQHVK")

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

func getEnvOrDefault(key, fallback string) string {
	if value, exists := os.LookupEnv(key); exists && value != "" {
		return value
	}
	return fallback
}
