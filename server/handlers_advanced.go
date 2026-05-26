package main

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"strings"
	"time"
)

// ================= ADVANCED SEARCH (SSE) =================
//
// Single entry point for the "advanced-search" target on /gateway. Charges a
// fixed cost (AdvancedSearchCost) once, orchestrates the full investigation
// against Elasticsearch (msearch) and Python /padronesp, and streams progress
// to the browser via Server-Sent Events.
//
// Spain-only. Mirrors the iterative logic that used to live in
// SearchResultsModal.tsx (runAssistant + processPerson).

const advancedESIndex = "espana,padronespana"
const advancedHitSize = 50
const advancedMaxCohabitants = 5
const advancedMaxStrongPerIter = 7
const advancedStrongIterations = 2
const advancedMaxTabsPerPerson = 15

func handleAdvancedSearch(w http.ResponseWriter, r *http.Request, licenseKey string) {
	var input struct {
		Query string `json:"query"`
	}
	body, _ := io.ReadAll(r.Body)
	if err := json.Unmarshal(body, &input); err != nil {
		writeJSONError(w, http.StatusBadRequest, "JSON inválido")
		return
	}
	query := strings.TrimSpace(input.Query)
	if query == "" {
		writeJSONError(w, http.StatusBadRequest, "Query vacío")
		return
	}

	if ESHost == "" || ESUser == "" || ESPasswd == "" {
		writeJSONError(w, http.StatusInternalServerError, "Elasticsearch no configurado en el servidor")
		return
	}

	// At this point quota has already been charged by handleGateway via
	// CheckQuotaAdvanced — we never refund. From here on, errors are reported
	// inside the SSE stream and the session continues best-effort.

	flusher, ok := w.(http.Flusher)
	if !ok {
		writeJSONError(w, http.StatusInternalServerError, "Streaming no soportado")
		return
	}

	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")
	w.Header().Set("X-Accel-Buffering", "no")
	w.WriteHeader(http.StatusOK)

	send := func(event string, data interface{}) {
		payload, err := json.Marshal(data)
		if err != nil {
			return
		}
		fmt.Fprintf(w, "event: %s\ndata: %s\n\n", event, payload)
		flusher.Flush()
	}

	// Emit current quota snapshot so the UI can update its counter.
	licenseManager.mu.Lock()
	var used, quota int
	if lic, ok := licenseManager.Licenses[licenseKey]; ok {
		used = lic.UsedSearch
		quota = lic.QuotaSearch
	}
	licenseManager.mu.Unlock()
	send("quota", map[string]interface{}{
		"used_search":  used,
		"quota_search": quota,
		"cost":         AdvancedSearchCost,
	})

	ctx := r.Context()
	totalUniqueHits := 0

	// PersonIdx 0 — the original target. The modal already added it to its
	// people[] when the search modal opened, so we do NOT emit a "person"
	// event for index 0.
	totalUniqueHits += runPersonAdvanced(ctx, send, 0, query)

	// Cohabitants from Padrón. Padrón is invoked once via Python (preserves
	// anti-scrap, AI localization and caching under "padron:<name>").
	cohabitants := fetchPadronCohabitants(ctx, query)
	for i, name := range cohabitants {
		if i >= advancedMaxCohabitants {
			break
		}
		personIdx := i + 1
		normalized := strings.ToUpper(strings.TrimSpace(name))
		send("person", map[string]interface{}{
			"personIdx": personIdx,
			"id":        strings.ReplaceAll(normalized, " ", "_"),
			"name":      normalized,
			"query":     name,
		})
		totalUniqueHits += runPersonAdvanced(ctx, send, personIdx, name)
	}

	send("done", map[string]interface{}{
		"total_people": 1 + min(len(cohabitants), advancedMaxCohabitants),
		"total_hits":   totalUniqueHits,
	})

	// One Discord log entry per session (not per sub-query) to avoid spam.
	go logSearch(r, "advanced-search", query, totalUniqueHits, true, false)
}

// runPersonAdvanced runs the full investigation pipeline for one person and
// returns the count of hits surfaced. Mirrors processPerson() from the modal.
func runPersonAdvanced(ctx context.Context, send func(string, interface{}), personIdx int, query string) int {
	totalHits := 0
	visited := map[string]bool{strings.ToUpper(strings.TrimSpace(query)): true}
	accumulated := make([]map[string]interface{}, 0, 64)

	// Phase: initial
	send("phase", map[string]interface{}{"personIdx": personIdx, "phase": "initial"})
	send("log", map[string]interface{}{
		"personIdx": personIdx, "type": "info",
		"message": fmt.Sprintf("🔍 Iniciando rastreo avanzado para: %s", strings.ToUpper(query)),
	})
	send("log", map[string]interface{}{
		"personIdx": personIdx, "type": "info",
		"message": fmt.Sprintf("📡 Realizando búsqueda inicial para: %s...", strings.ToUpper(query)),
	})

	initialGroups, err := esMsearch(ctx, []string{query})
	if err != nil {
		send("error", map[string]interface{}{"message": fmt.Sprintf("Fallo en búsqueda inicial: %v", err)})
		return 0
	}
	cacheSearchResult(query, initialGroups[0].RawHits)
	originalResults := flattenAndFilter(initialGroups[0].RawHits)
	if len(originalResults) > 0 {
		send("log", map[string]interface{}{
			"personIdx": personIdx, "type": "success",
			"message": fmt.Sprintf("Motor [searchesp] devolvió %d resultados.", len(originalResults)),
		})
	}
	send("tab", map[string]interface{}{
		"personIdx": personIdx,
		"tabId":     "original",
		"label":     "Original",
		"type":      "original",
		"results":   originalResults,
	})
	accumulated = append(accumulated, originalResults...)
	totalHits += len(originalResults)

	// Phase: variants
	send("phase", map[string]interface{}{"personIdx": personIdx, "phase": "variants"})
	variants := filterUnvisited(generateVariantsGo(query), visited)
	if len(variants) > 0 {
		varGroups, err := esMsearch(ctx, variants)
		if err == nil {
			flatVariants := make([]map[string]interface{}, 0)
			for i, v := range variants {
				cacheSearchResult(v, varGroups[i].RawHits)
				flatVariants = append(flatVariants, flattenAndFilter(varGroups[i].RawHits)...)
			}
			flatVariants = dedupResults(flatVariants, accumulated)
			if len(flatVariants) > 0 {
				send("tab", map[string]interface{}{
					"personIdx": personIdx,
					"tabId":     "variants",
					"label":     "Variantes",
					"type":      "variants",
					"results":   flatVariants,
				})
				accumulated = append(accumulated, flatVariants...)
				totalHits += len(flatVariants)
			}
		} else {
			send("log", map[string]interface{}{
				"personIdx": personIdx, "type": "warning",
				"message": fmt.Sprintf("Fallo en variantes: %v", err),
			})
		}
	}

	// Phases: strong identifiers (up to advancedStrongIterations iterations)
	tabsCount := 2 // original + variants
	for iter := 1; iter <= advancedStrongIterations; iter++ {
		send("phase", map[string]interface{}{
			"personIdx": personIdx,
			"phase":     fmt.Sprintf("strong-%d", iter),
		})

		discovered := extractDataGo(accumulated)
		strongIds := make([]string, 0, advancedMaxStrongPerIter)
		for _, d := range discovered {
			if !d.IsStrong {
				continue
			}
			up := strings.ToUpper(d.Value)
			if visited[up] {
				continue
			}
			strongIds = append(strongIds, d.Value)
			if len(strongIds) >= advancedMaxStrongPerIter {
				break
			}
		}
		if len(strongIds) == 0 {
			break
		}

		send("log", map[string]interface{}{
			"personIdx": personIdx, "type": "info",
			"message": fmt.Sprintf("🔥 Iteración %d: Investigando %d vectores críticos...", iter, len(strongIds)),
			"payload": strongIds,
		})

		// Build a flat query list for one msearch, tracking which queries
		// belong to which strong id so we can group hits back per tab.
		type group struct {
			id      string
			queries []string
		}
		groups := make([]group, 0, len(strongIds))
		flatQueries := make([]string, 0, len(strongIds)*3)
		for _, id := range strongIds {
			visited[strings.ToUpper(id)] = true
			qs := []string{id}
			if len(strongIds) <= 5 {
				for _, v := range generateVariantsGo(id) {
					up := strings.ToUpper(v)
					if !visited[up] {
						visited[up] = true
						qs = append(qs, v)
					}
				}
			}
			groups = append(groups, group{id: id, queries: qs})
			flatQueries = append(flatQueries, qs...)
		}

		msResults, err := esMsearch(ctx, flatQueries)
		if err != nil {
			send("log", map[string]interface{}{
				"personIdx": personIdx, "type": "warning",
				"message": fmt.Sprintf("Fallo en iteración %d: %v", iter, err),
			})
			continue
		}

		offset := 0
		for _, g := range groups {
			combined := make([]map[string]interface{}, 0)
			for _, q := range g.queries {
				cacheSearchResult(q, msResults[offset].RawHits)
				combined = append(combined, flattenAndFilter(msResults[offset].RawHits)...)
				offset++
			}
			combined = dedupResults(combined, accumulated)
			if len(combined) == 0 {
				continue
			}
			if tabsCount >= advancedMaxTabsPerPerson {
				break
			}
			send("tab", map[string]interface{}{
				"personIdx": personIdx,
				"tabId":     g.id,
				"label":     g.id,
				"type":      "strong",
				"results":   combined,
			})
			accumulated = append(accumulated, combined...)
			totalHits += len(combined)
			tabsCount++
		}
	}

	send("log", map[string]interface{}{
		"personIdx": personIdx, "type": "success",
		"message": "🏁 Investigación finalizada correctamente.",
	})
	return totalHits
}

// ================= ELASTICSEARCH MSEARCH =================

type msearchGroup struct {
	RawHits []map[string]interface{} // hits as ES returns them (with _source, _index, _id)
}

// esMsearch fires a single _msearch HTTP request with one (header, body) pair
// per query and returns a slice of msearchGroup parallel to the input queries.
func esMsearch(ctx context.Context, queries []string) ([]msearchGroup, error) {
	if len(queries) == 0 {
		return nil, nil
	}

	var ndjson bytes.Buffer
	for _, q := range queries {
		header, _ := json.Marshal(map[string]string{"index": advancedESIndex})
		body, _ := json.Marshal(map[string]interface{}{
			"query": map[string]interface{}{
				"match": map[string]interface{}{
					"content": map[string]interface{}{
						"query":    q,
						"operator": "and",
					},
				},
			},
			"size": advancedHitSize,
		})
		ndjson.Write(header)
		ndjson.WriteByte('\n')
		ndjson.Write(body)
		ndjson.WriteByte('\n')
	}

	url := strings.TrimRight(ESHost, "/") + "/_msearch"
	reqCtx, cancel := context.WithTimeout(ctx, 60*time.Second)
	defer cancel()
	req, err := http.NewRequestWithContext(reqCtx, "POST", url, &ndjson)
	if err != nil {
		return nil, err
	}
	req.SetBasicAuth(ESUser, ESPasswd)
	req.Header.Set("Content-Type", "application/x-ndjson")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("ES error: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		bodyText, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("ES status %d: %s", resp.StatusCode, string(bodyText))
	}

	var parsed struct {
		Responses []struct {
			Hits struct {
				Hits []map[string]interface{} `json:"hits"`
			} `json:"hits"`
			Error interface{} `json:"error,omitempty"`
		} `json:"responses"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&parsed); err != nil {
		return nil, fmt.Errorf("ES decode: %w", err)
	}

	out := make([]msearchGroup, len(queries))
	for i := range queries {
		if i >= len(parsed.Responses) {
			break
		}
		out[i] = msearchGroup{RawHits: parsed.Responses[i].Hits.Hits}
	}
	return out, nil
}

// ================= PADRON HELPER =================

// fetchPadronCohabitants calls Python /padronesp and extracts cohabitant
// names from the returned HTML report. Also caches the response under the
// same key proxyRequest uses, so a later padronesp search becomes instant.
func fetchPadronCohabitants(ctx context.Context, query string) []string {
	bodyJSON, _ := json.Marshal(map[string]string{"nombre": query})
	reqCtx, cancel := context.WithTimeout(ctx, 60*time.Second)
	defer cancel()
	req, err := http.NewRequestWithContext(reqCtx, "POST", BackendURL+"/padronesp", bytes.NewBuffer(bodyJSON))
	if err != nil {
		log.Printf("[ADVANCED] padron request build error: %v", err)
		return nil
	}
	req.Header.Set("Authorization", "Bearer "+BearerToken)
	req.Header.Set("Content-Type", "application/json")

	resp, err := getHttpClient(BackendURL).Do(req)
	if err != nil {
		log.Printf("[ADVANCED] padron HTTP error: %v", err)
		return nil
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return nil
	}

	// Python returns the structured JSON, but our padron handler in Go wraps
	// it into {"text": "<html>"}. We replicate that step here so the cache
	// key matches the format proxyRequest stores.
	respBytes, _ := io.ReadAll(resp.Body)

	// We expect the Python shape: { "objetivo": ..., "direcciones": [...] }
	// then handlePadronGeneric in Go renders an HTML "text" payload. Rather
	// than re-implement that full renderer, we cache nothing for the padron
	// here (the caller can hit /gateway/padronesp normally to rebuild and
	// cache via proxyRequest). What we DO need is the cohabitant names — we
	// can pull them directly from the JSON shape.
	_ = respBytes

	var padron struct {
		Objetivo    string `json:"objetivo"`
		Direcciones []struct {
			Personas []struct {
				Nombre string `json:"nombre"`
			} `json:"personas"`
		} `json:"direcciones"`
	}
	if err := json.Unmarshal(respBytes, &padron); err != nil {
		return nil
	}

	seen := make(map[string]bool)
	targetUpper := strings.ToUpper(strings.TrimSpace(query))
	out := make([]string, 0)
	for _, dir := range padron.Direcciones {
		for _, p := range dir.Personas {
			n := strings.TrimSpace(p.Nombre)
			up := strings.ToUpper(n)
			if n == "" || up == targetUpper || seen[up] {
				continue
			}
			seen[up] = true
			out = append(out, n)
		}
	}
	return out
}

// ================= HELPERS =================

// cacheSearchResult writes the per-query result into globalCache using the
// EXACT key that proxyRequest uses for /searchesp, so a later manual search
// for the same identifier is an instant cache hit.
func cacheSearchResult(query string, rawHits []map[string]interface{}) {
	body, _ := json.Marshal(map[string]string{"query": query})
	cacheKey := fmt.Sprintf("proxy:%s/searchesp:%s", BackendURL, string(body))
	hits := rawHits
	if hits == nil {
		hits = make([]map[string]interface{}, 0)
	}
	payload, _ := json.Marshal(map[string]interface{}{
		"query":   query,
		"results": hits,
	})
	globalCache.Set(cacheKey, payload, http.StatusOK)
}

// flattenAndFilter turns raw ES hits into the flat map shape the modal
// expects, dropping leaked-census files for Spain.
func flattenAndFilter(rawHits []map[string]interface{}) []map[string]interface{} {
	out := make([]map[string]interface{}, 0, len(rawHits))
	for _, h := range rawHits {
		if shouldFilterSpainHit(h) {
			continue
		}
		src, ok := h["_source"].(map[string]interface{})
		var subject interface{} = h
		if ok {
			subject = src
		}
		flat := flattenObjectGo(subject, "")
		if shouldFilterSpainHit(flat) {
			continue
		}
		out = append(out, flat)
	}
	return out
}

// dedupResults removes entries from `incoming` whose JSON encoding already
// appears in `accumulated`. Cheap content-based dedup, mirrors the modal's
// seenResultsContent Set.
func dedupResults(incoming, accumulated []map[string]interface{}) []map[string]interface{} {
	seen := make(map[string]bool, len(accumulated))
	for _, h := range accumulated {
		if b, err := json.Marshal(h); err == nil {
			seen[string(b)] = true
		}
	}
	out := make([]map[string]interface{}, 0, len(incoming))
	for _, h := range incoming {
		b, err := json.Marshal(h)
		if err != nil {
			continue
		}
		if seen[string(b)] {
			continue
		}
		seen[string(b)] = true
		out = append(out, h)
	}
	return out
}

func filterUnvisited(queries []string, visited map[string]bool) []string {
	out := make([]string, 0, len(queries))
	for _, q := range queries {
		up := strings.ToUpper(q)
		if visited[up] {
			continue
		}
		visited[up] = true
		out = append(out, q)
	}
	return out
}

func writeJSONError(w http.ResponseWriter, status int, msg string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(map[string]string{"error": msg})
}
