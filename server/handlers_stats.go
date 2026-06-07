package main

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"
)

// CountryStats representa las estadísticas de un país (formato de respuesta)
type CountryStats struct {
	DocCount int    `json:"doc_count"`
	LeakSize string `json:"leakSize"`
	LastScan string `json:"last_scan"`
}

// statsAliasToCountry mapea el alias del índice ES al código de país del frontend
var statsAliasToCountry = map[string]string{
	"espana":     "es",
	"argentina":  "ar",
	"elsalvador": "sv",
	"nicaragua":  "ni",
	"peru":       "pe",
	"chile":      "cl",
	"bolivia":    "bo",
	"ecuador":    "ec",
	"venezuela":  "ve",
	"paraguay":   "py",
	"mexico":     "mx",
}

// statsAliasOrder define el orden estable de aliases para construir el _msearch
var statsAliasOrder = []string{
	"espana", "argentina", "elsalvador", "nicaragua", "peru",
	"chile", "bolivia", "ecuador", "venezuela", "paraguay", "mexico",
}

// expectedCountries es la lista de IDs de países que devuelve la API
var expectedCountries = []string{"es", "cl", "pe", "ar", "sv", "ni", "bo", "ec", "ve", "py", "mx"}

// lastScanByCountry guarda el último escaneo (timestamp) por país.
// Lo actualiza el indexer vía /api/stats/invalidate.
var (
	lastScanByCountry = make(map[string]time.Time)
	lastScanMux       sync.RWMutex
)

func lastScanFilePath() string {
	return filepath.Join("configs", "last_scan.json")
}

func saveLastScan() {
	lastScanMux.RLock()
	data := make(map[string]int64, len(lastScanByCountry))
	for k, v := range lastScanByCountry {
		if !v.IsZero() {
			data[k] = v.Unix()
		}
	}
	lastScanMux.RUnlock()

	b, err := json.Marshal(data)
	if err != nil {
		return
	}
	if err := os.WriteFile(lastScanFilePath(), b, 0644); err != nil {
		log.Printf("Warning: could not save last_scan.json: %v", err)
	}
}

func loadLastScan() map[string]time.Time {
	b, err := os.ReadFile(lastScanFilePath())
	if err != nil {
		return nil
	}
	var data map[string]int64
	if err := json.Unmarshal(b, &data); err != nil {
		return nil
	}
	result := make(map[string]time.Time, len(data))
	for k, ts := range data {
		result[k] = time.Unix(ts, 0)
	}
	return result
}

// esStatsEntry representa el resultado crudo desde Elasticsearch por país
type esStatsEntry struct {
	DocCount  int64
	SizeBytes int64
}

// Cache de resultados de ES (60s TTL)
var (
	esStatsCacheVal map[string]esStatsEntry
	esStatsCacheAt  time.Time
	esStatsCacheMux sync.Mutex
	esStatsTTL      = 60 * time.Second
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

// formatLeakSize convierte bytes a GB decimales (10^9), no GiB binarios.
func formatLeakSize(bytes int64) string {
	gb := float64(bytes) / 1e9
	return fmt.Sprintf("%.1f GB", gb)
}

// fetchAllStatsFromES dispara un _msearch contra Elasticsearch obteniendo
// doc_count (hits.total.value) y bytes (aggs.bytes.value) para cada alias.
func fetchAllStatsFromES() map[string]esStatsEntry {
	if ESHost == "" || ESUser == "" || ESPasswd == "" {
		return nil
	}

	var ndjson bytes.Buffer
	for _, alias := range statsAliasOrder {
		header := map[string]interface{}{"index": alias}
		body := map[string]interface{}{
			"track_total_hits": true,
			"size":             0,
			"aggs": map[string]interface{}{
				"bytes": map[string]interface{}{
					"sum": map[string]interface{}{
						"field": "_size",
					},
				},
			},
		}
		hb, _ := json.Marshal(header)
		bb, _ := json.Marshal(body)
		ndjson.Write(hb)
		ndjson.WriteByte('\n')
		ndjson.Write(bb)
		ndjson.WriteByte('\n')
	}

	url := strings.TrimRight(ESHost, "/") + "/_msearch"
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	req, err := http.NewRequestWithContext(ctx, "POST", url, &ndjson)
	if err != nil {
		return nil
	}
	req.SetBasicAuth(ESUser, ESPasswd)
	req.Header.Set("Content-Type", "application/x-ndjson")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		io.Copy(io.Discard, resp.Body)
		return nil
	}

	var parsed struct {
		Responses []struct {
			Hits struct {
				Total struct {
					Value int64 `json:"value"`
				} `json:"total"`
			} `json:"hits"`
			Aggregations struct {
				Bytes struct {
					Value float64 `json:"value"`
				} `json:"bytes"`
			} `json:"aggregations"`
		} `json:"responses"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&parsed); err != nil {
		return nil
	}

	out := make(map[string]esStatsEntry, len(statsAliasOrder))
	for i, alias := range statsAliasOrder {
		if i >= len(parsed.Responses) {
			break
		}
		r := parsed.Responses[i]
		code, ok := statsAliasToCountry[alias]
		if !ok {
			continue
		}
		out[code] = esStatsEntry{
			DocCount:  r.Hits.Total.Value,
			SizeBytes: int64(r.Aggregations.Bytes.Value),
		}
	}
	return out
}

// getCachedESStats devuelve los stats cacheados (60s TTL).
// Si la caché está vencida intenta refetch; si falla, devuelve el último valor conocido.
func getCachedESStats() map[string]esStatsEntry {
	esStatsCacheMux.Lock()
	defer esStatsCacheMux.Unlock()

	if esStatsCacheVal != nil && time.Since(esStatsCacheAt) < esStatsTTL {
		return esStatsCacheVal
	}

	fresh := fetchAllStatsFromES()
	if fresh != nil {
		esStatsCacheVal = fresh
		esStatsCacheAt = time.Now()
	}
	return esStatsCacheVal
}

// invalidateESStatsCache fuerza el refetch en la próxima lectura.
func invalidateESStatsCache() {
	esStatsCacheMux.Lock()
	esStatsCacheAt = time.Time{}
	esStatsCacheMux.Unlock()
}

// handleStats devuelve las estadísticas de todos los países leyendo de ES.
func handleStats(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Método no permitido", http.StatusMethodNotAllowed)
		return
	}

	esStats := getCachedESStats()

	lastScanMux.RLock()
	scans := make(map[string]time.Time, len(lastScanByCountry))
	for k, v := range lastScanByCountry {
		scans[k] = v
	}
	lastScanMux.RUnlock()

	out := make(map[string]CountryStats, len(expectedCountries))
	for _, id := range expectedCountries {
		cs := CountryStats{
			DocCount: 0,
			LeakSize: "0.0 GB",
			LastScan: "—",
		}
		if es, ok := esStats[id]; ok {
			cs.DocCount = int(es.DocCount)
			cs.LeakSize = formatLeakSize(es.SizeBytes)
		}
		if t, ok := scans[id]; ok && !t.IsZero() {
			cs.LastScan = getRelativeTime(t)
		}
		out[id] = cs
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(out)
}

// handleStatsInvalidate actualiza el último escaneo y fuerza refetch de ES.
// El parámetro `size` (si viene) se ignora: el tamaño real se obtiene desde ES.
func handleStatsInvalidate(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Método no permitido", http.StatusMethodNotAllowed)
		return
	}

	alias := r.URL.Query().Get("alias")
	if alias == "" {
		http.Error(w, "Alias requerido", http.StatusBadRequest)
		return
	}

	countryID, ok := statsAliasToCountry[alias]
	if !ok {
		http.Error(w, "Alias desconocido", http.StatusBadRequest)
		return
	}

	lastScanMux.Lock()
	lastScanByCountry[countryID] = time.Now()
	lastScanMux.Unlock()

	saveLastScan()
	invalidateESStatsCache()

	w.WriteHeader(http.StatusOK)
	w.Write([]byte("OK"))
}

// initStatsCache inicializa estructuras internas cargando el last_scan persistido
// (si existe). doc_count y leakSize se obtienen de ES en el primer request.
func initStatsCache() {
	persisted := loadLastScan()

	lastScanMux.Lock()
	lastScanByCountry = make(map[string]time.Time, len(expectedCountries))
	for _, id := range expectedCountries {
		if t, ok := persisted[id]; ok {
			lastScanByCountry[id] = t
		} else {
			lastScanByCountry[id] = time.Time{}
		}
	}
	lastScanMux.Unlock()
}
