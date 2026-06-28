package main

import (
	"fmt"
	"log"
	"mime"
	"net/http"
	"net/url"
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
	ListenAddr           = "0.0.0.0:8080"
	TorListenAddr        = "127.0.0.1:8081"
	AIProvider           string
	AIProviderKey        string
	AIProviderURL        = "https://openrouter.ai/api/v1/chat/completions"
	AIProviderModel      = "poolside/laguna-xs.2:free"
	DiscordSearchWebhook string
	DiscordChatWebhook   string
	DiscordBrandColor    = 0x1a4031 // Dark Green from branding

	// Elasticsearch (direct access from Go, used by advanced-search)
	ESHost   string
	ESUser   string
	ESPasswd string

	// Advanced Search cost in QuotaSearch units (atomic charge per session)
	AdvancedSearchCost = 3
)

// Runtime tokens for inbound bridge security (configured via environment)
var DiscordBridgeToken string

var torClient *http.Client

// aiClient is a direct HTTP client with no proxy — used for external AI API calls.
// Proxy: nil in http.Transport still uses ProxyFromEnvironment (e.g. Tor via HTTP_PROXY).
// We must pass an explicit no-op function to truly bypass all proxies.
var aiClient = &http.Client{
	Timeout: 30 * time.Second,
	Transport: &http.Transport{
		Proxy: func(*http.Request) (*url.URL, error) { return nil, nil },
	},
}

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

var globalCache = NewAPICache(200)

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

	// Load secrets and configurable addresses from environment
	ListenAddr = getEnvOrDefault("BACKEND_LISTEN_ADDR", "0.0.0.0:8080")
	BearerToken = getEnvOrDefault("BACKEND_BEARER_TOKEN", "SVwp00yfJjx2FTuV5AmFVEMUknsfd6sdertgajksfgyr1GBoKQjCK")
	AIProviderKey = getEnvOrDefault("OPENROUTER_API_KEY", "")
	DiscordSearchWebhook = getEnvOrDefault("DISCORD_SEARCH_WEBHOOK", "https://discord.com/api/webhooks/1467911384950903041/QlKl4UheCp4lxVDYsmqM_KplKoF_38Z8pVuZWYOGBCDKYex8zvLKOm26U-CA3QRkZS9I")
	DiscordChatWebhook = getEnvOrDefault("DISCORD_CHAT_WEBHOOK", "https://discord.com/api/webhooks/1467911978834985023/-Inj6yUzEbEZAj_SQ1jqpdTY4EC8aISCA4CDCe1rU_qdjGsFy0JUrjj5zZ6Eb-BPQHVK")

	// Setup runtime tokens for inbound Discord bridge
	DiscordBridgeToken = os.Getenv("DISCORD_BRIDGE_TOKEN")

	// Elasticsearch credentials (direct access for advanced-search)
	ESHost = getEnvOrDefault("ES_HOST", "")
	ESUser = getEnvOrDefault("ES_USER", "")
	ESPasswd = getEnvOrDefault("ES_PASSWD", "")

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
