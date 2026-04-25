package main

import (
	"fmt"
	"net/http"
	"sync"
	"time"
)

// CountryStats representa las estadísticas de un país
type CountryStats struct {
	DocCount     int       `json:"doc_count"`
	LeakSize     string    `json:"leakSize"`
	LastScan     string    `json:"last_scan"`
	LastScanTime time.Time `json:"-"` // No se serializa, solo para cálculos internos
}

// Cache global de estadísticas
var (
	statsCache     = make(map[string]CountryStats)
	statsCacheMux  sync.RWMutex
	statsCacheTime time.Time
)

// getRelativeTime convierte una fecha a formato relativo (ej: "hace 4 días")
func getRelativeTime(t time.Time) string {
	now := time.Now()
	diff := now.Sub(t)

	seconds := int(diff.Seconds())
	minutes := int(diff.Minutes())
	hours := int(diff.Hours())
	days := int(diff.Hours() / 24)
	weeks := days / 7
	months := days / 30
	years := days / 365

	if seconds < 60 {
		if seconds == 1 {
			return "hace 1 segundo"
		}
		return fmt.Sprintf("hace %d segundos", seconds)
	} else if minutes < 60 {
		if minutes == 1 {
			return "hace 1 minuto"
		}
		return fmt.Sprintf("hace %d minutos", minutes)
	} else if hours < 24 {
		if hours == 1 {
			return "hace 1 hora"
		}
		return fmt.Sprintf("hace %d horas", hours)
	} else if days < 7 {
		if days == 1 {
			return "hace 1 día"
		}
		return fmt.Sprintf("hace %d días", days)
	} else if weeks < 4 {
		if weeks == 1 {
			return "hace 1 semana"
		}
		return fmt.Sprintf("hace %d semanas", weeks)
	} else if months < 12 {
		if months == 1 {
			return "hace 1 mes"
		}
		return fmt.Sprintf("hace %d meses", months)
	} else {
		if years == 1 {
			return "hace 1 año"
		}
		return fmt.Sprintf("hace %d años", years)
	}
}

// handleStats devuelve las estadísticas de todos los países desde la API Python
func handleStats(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Método no permitido", http.StatusMethodNotAllowed)
		return
	}

	// Proxy request to Python API
	req, err := http.NewRequest("GET", BackendURL+"/stats", nil)
	if err != nil {
		http.Error(w, "Error creando petición", http.StatusInternalServerError)
		return
	}

	// Forward authorization header from original request
	if auth := r.Header.Get("Authorization"); auth != "" {
		req.Header.Set("Authorization", auth)
	} else if cookie, err := r.Cookie("UCO_SESSION"); err == nil {
		// If no Bearer token, use session cookie as Bearer token
		req.Header.Set("Authorization", "Bearer "+cookie.Value)
	}

	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		http.Error(w, "Error conectando con API", http.StatusBadGateway)
		return
	}
	defer resp.Body.Close()

	// Copy response headers
	for key, values := range resp.Header {
		for _, value := range values {
			w.Header().Add(key, value)
		}
	}

	w.WriteHeader(resp.StatusCode)

	// Stream response body
	var buf [4096]byte
	for {
		n, err := resp.Body.Read(buf[:])
		if n > 0 {
			w.Write(buf[:n])
		}
		if err != nil {
			break
		}
	}
}

// handleStatsInvalidate actualiza las estadísticas cuando el indexer termina
func handleStatsInvalidate(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Método no permitido", http.StatusMethodNotAllowed)
		return
	}

	alias := r.URL.Query().Get("alias")
	sizeStr := r.URL.Query().Get("size")

	if alias == "" {
		http.Error(w, "Alias requerido", http.StatusBadRequest)
		return
	}

	// Convertir size de bytes a GB
	var size int64
	if sizeStr != "" {
		fmt.Sscanf(sizeStr, "%d", &size)
	}

	sizeGB := float64(size) / (1024 * 1024 * 1024)
	leakSize := fmt.Sprintf("%.1f GB", sizeGB)

	// Mapear alias a country ID
	countryMap := map[string]string{
		"espana":      "es",
		"argentina":   "ar",
		"elsalvador":  "sv",
		"nicaragua":   "ni",
		"peru":        "pe",
		"chile":       "cl",
		"bolivia":     "bo",
		"ecuador":     "ec",
		"venezuela":   "ve",
		"paraguay":    "py",
	}

	countryID, ok := countryMap[alias]
	if !ok {
		http.Error(w, "Alias desconocido", http.StatusBadRequest)
		return
	}

	// Actualizar cache con el tamaño real
	statsCacheMux.Lock()
	if stat, exists := statsCache[countryID]; exists {
		now := time.Now()
		stat.LeakSize = leakSize
		stat.LastScan = getRelativeTime(now)
		stat.LastScanTime = now
		statsCache[countryID] = stat
	}
	statsCacheMux.Unlock()

	w.WriteHeader(http.StatusOK)
	w.Write([]byte("OK"))
}

// updateStatsCache actualiza el cache de estadísticas
// Esta función debe ser llamada cuando se actualicen las estadísticas reales
func updateStatsCache(countryID string, docCount int, leakSize string) {
	statsCacheMux.Lock()
	defer statsCacheMux.Unlock()

	now := time.Now()
	statsCache[countryID] = CountryStats{
		DocCount:     docCount,
		LeakSize:     leakSize,
		LastScan:     getRelativeTime(now),
		LastScanTime: now,
	}
	statsCacheTime = now
}

// initStatsCache inicializa el cache con datos por defecto
func initStatsCache() {
	statsCacheMux.Lock()
	defer statsCacheMux.Unlock()

	now := time.Now()
	// Simular diferentes tiempos de escaneo para cada país
	statsCache = map[string]CountryStats{
		"es": {DocCount: 37945702, LeakSize: "15.2 GB", LastScan: getRelativeTime(now.Add(-2 * 24 * time.Hour)), LastScanTime: now.Add(-2 * 24 * time.Hour)},
		"cl": {DocCount: 13891097, LeakSize: "5.8 GB", LastScan: getRelativeTime(now.Add(-3 * 24 * time.Hour)), LastScanTime: now.Add(-3 * 24 * time.Hour)},
		"pe": {DocCount: 31888853, LeakSize: "12.4 GB", LastScan: getRelativeTime(now.Add(-5 * 24 * time.Hour)), LastScanTime: now.Add(-5 * 24 * time.Hour)},
		"ar": {DocCount: 46654581, LeakSize: "18.9 GB", LastScan: getRelativeTime(now.Add(-1 * 24 * time.Hour)), LastScanTime: now.Add(-1 * 24 * time.Hour)},
		"sv": {DocCount: 6364000, LeakSize: "2.1 GB", LastScan: getRelativeTime(now.Add(-7 * 24 * time.Hour)), LastScanTime: now.Add(-7 * 24 * time.Hour)},
		"ni": {DocCount: 4006750, LeakSize: "1.6 GB", LastScan: getRelativeTime(now.Add(-10 * 24 * time.Hour)), LastScanTime: now.Add(-10 * 24 * time.Hour)},
		"bo": {DocCount: 12388571, LeakSize: "4.8 GB", LastScan: getRelativeTime(now.Add(-15 * 24 * time.Hour)), LastScanTime: now.Add(-15 * 24 * time.Hour)},
		"ec": {DocCount: 18190000, LeakSize: "7.2 GB", LastScan: getRelativeTime(now.Add(-20 * 24 * time.Hour)), LastScanTime: now.Add(-20 * 24 * time.Hour)},
		"ve": {DocCount: 28838499, LeakSize: "11.5 GB", LastScan: getRelativeTime(now.Add(-30 * 24 * time.Hour)), LastScanTime: now.Add(-30 * 24 * time.Hour)},
		"py": {DocCount: 2576026, LeakSize: "1.0 GB", LastScan: getRelativeTime(now.Add(-45 * 24 * time.Hour)), LastScanTime: now.Add(-45 * 24 * time.Hour)},
	}
	statsCacheTime = now
}
