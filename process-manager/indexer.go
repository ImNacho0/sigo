package main

import (
	"bufio"
	"bytes"
	"context"
	"encoding/csv"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"
)

const batchSize = 500

var dataFolder string

func init() {
	execPath, err := os.Executable()
	if err != nil {
		execPath = "."
	}
	dataFolder = filepath.Join(filepath.Dir(execPath), "indexar", "db")
}

type esDocument struct {
	Index  string                 `json:"_index"`
	Source map[string]interface{} `json:"_source"`
}

// runInternalIndexer is the entrypoint for the goroutine
func runInternalIndexer(ctx context.Context, id string, alias string, pm *ProcessManager) error {
	pm.log(id, fmt.Sprintf("Starting internal indexer. Target alias: %s", alias))
	pm.log(id, fmt.Sprintf("Scanning folder: %s", dataFolder))

	if info, statErr := os.Stat(dataFolder); statErr != nil {
		pm.log(id, fmt.Sprintf("❌ Cannot access folder %s: %v", dataFolder, statErr))
		return statErr
	} else if !info.IsDir() {
		pm.log(id, fmt.Sprintf("❌ %s is not a directory.", dataFolder))
		return fmt.Errorf("not a directory: %s", dataFolder)
	}

	files, totalScanned, err := getDataFiles(dataFolder)
	if err != nil {
		pm.log(id, fmt.Sprintf("Error reading directory: %v", err))
		return err
	}

	pm.log(id, fmt.Sprintf("Scanned %d entries, matched %d files with supported extensions.", totalScanned, len(files)))

	if len(files) == 0 {
		pm.log(id, "No supported files (JSON, CSV, TXT, JSONL) found to index.")
		return nil
	}

	pm.log(id, fmt.Sprintf("Found %d files. Starting bulk index...", len(files)))

	var buffer []esDocument
	filesProcessed := 0

	for _, file := range files {
		select {
		case <-ctx.Done():
			pm.log(id, "Indexer stopped by user.")
			return ctx.Err()
		default:
			// continue processing
		}

		data, err := readFileData(file)
		if err != nil {
			pm.log(id, fmt.Sprintf("Error loading %s: %v", filepath.Base(file), err))
			continue
		}

		for _, item := range data {
			// Add file origin
			item["file"] = filepath.Base(file)

			doc := esDocument{
				Index:  "spaindb", // Always index into spaindb
				Source: item,
			}
			buffer = append(buffer, doc)

			if len(buffer) >= batchSize {
				if err := sendBulk(buffer, pm, id); err != nil {
					pm.log(id, fmt.Sprintf("Bulk index error: %v", err))
				}
				buffer = nil // reset buffer
			}
		}

		filesProcessed++
		pm.log(id, fmt.Sprintf("✅ Processed %d/%d: %s", filesProcessed, len(files), filepath.Base(file)))
	}

	// Send remaining
	if len(buffer) > 0 {
		if err := sendBulk(buffer, pm, id); err != nil {
			pm.log(id, fmt.Sprintf("Final bulk index error: %v", err))
		}
	}

	// Update the alias filter in Elasticsearch
	var fileNames []string
	for _, f := range files {
		fileNames = append(fileNames, filepath.Base(f))
	}

	if err := updateAliasFilter("spaindb", alias, fileNames, pm, id); err != nil {
		pm.log(id, fmt.Sprintf("Error updating alias %s: %v", alias, err))
	} else {
		pm.log(id, fmt.Sprintf("✅ Alias %s updated with %d files.", alias, len(fileNames)))

		// Calculate total size of indexed files
		var totalSize int64
		for _, f := range files {
			if info, err := os.Stat(f); err == nil {
				totalSize += info.Size()
			}
		}

		// Notify backend to update stats cache
		go func() {
			url := fmt.Sprintf("%s/api/stats/invalidate?alias=%s&size=%d", getWebServerBaseURL(), alias, totalSize)
			if _, err := http.Get(url); err != nil {
				pm.log(id, fmt.Sprintf("Warning: Could not update backend stats: %v", err))
			} else {
				pm.log(id, "✅ Backend stats cache updated.")
			}
		}()
	}

	pm.log(id, "✅ Indexing completed successfully.")
	return nil
}

func updateAliasFilter(index, alias string, newFiles []string, pm *ProcessManager, id string) error {
	esHost, esUser, esPass := getESConfig()

	// 1. Fetch current alias definition
	reqUrl := fmt.Sprintf("%s/%s/_alias/%s", esHost, index, alias)
	req, _ := http.NewRequest("GET", reqUrl, nil)
	req.SetBasicAuth(esUser, esPass)

	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Do(req)
	var currentFiles []string

	if err == nil && resp.StatusCode == 200 {
		var aliasData map[string]interface{}
		bodyBytes, _ := io.ReadAll(resp.Body)
		if err := json.Unmarshal(bodyBytes, &aliasData); err == nil {
			currentFiles = extractFilesFromAlias(aliasData, alias)
		}
	} else if err != nil {
		pm.log(id, fmt.Sprintf("Warning: could not fetch current alias %s: %v", alias, err))
	}

	if resp != nil {
		resp.Body.Close()
	}

	// Log what we found
	if len(currentFiles) > 0 {
		pm.log(id, fmt.Sprintf("Found %d existing files in alias %s filter.", len(currentFiles), alias))
	} else {
		pm.log(id, fmt.Sprintf("No existing files found in alias %s filter (generating new entry).", alias))
	}

	// 2. Merge existing files with new files, ensuring uniqueness
	fileSet := make(map[string]bool)
	for _, f := range currentFiles {
		fileSet[f] = true
	}
	for _, f := range newFiles {
		fileSet[f] = true
	}

	var mergedFiles []string
	for f := range fileSet {
		mergedFiles = append(mergedFiles, f)
	}

	// 3. Construct update payload
	payload := map[string]interface{}{
		"actions": []map[string]interface{}{
			{
				"add": map[string]interface{}{
					"index": index,
					"alias": alias,
					"filter": map[string]interface{}{
						"terms": map[string]interface{}{
							"file.keyword": mergedFiles,
						},
					},
				},
			},
		},
	}

	payloadBytes, _ := json.Marshal(payload)
	postReq, _ := http.NewRequest("POST", esHost+"/_aliases", bytes.NewBuffer(payloadBytes))
	postReq.Header.Set("Content-Type", "application/json")
	postReq.SetBasicAuth(esUser, esPass)

	postResp, err := client.Do(postReq)
	if err != nil {
		return err
	}
	defer postResp.Body.Close()

	if postResp.StatusCode >= 400 {
		body, _ := io.ReadAll(postResp.Body)
		return fmt.Errorf("ES aliases update failed (%s): %s", postResp.Status, string(body))
	}

	return nil
}

func RunDeindexing(ctx context.Context, id string, alias string, filename string, pm *ProcessManager) error {
	pm.log(id, fmt.Sprintf("Starting deindexing for file: %s in alias: %s", filename, alias))

	esHost, esUser, esPass := getESConfig()
	client := &http.Client{Timeout: 60 * time.Second}

	// 1. Delete documents from spaindb
	pm.log(id, fmt.Sprintf("Deleting documents from spaindb where file = %s...", filename))
	deleteQuery := map[string]interface{}{
		"query": map[string]interface{}{
			"term": map[string]interface{}{
				"file.keyword": filename,
			},
		},
	}
	queryBytes, _ := json.Marshal(deleteQuery)
	req, _ := http.NewRequest("POST", esHost+"/spaindb/_delete_by_query?conflicts=proceed&wait_for_completion=true", bytes.NewBuffer(queryBytes))
	req.Header.Set("Content-Type", "application/json")
	req.SetBasicAuth(esUser, esPass)

	resp, err := client.Do(req)
	if err != nil {
		return fmt.Errorf("error deleting documents: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		body, _ := io.ReadAll(resp.Body)
		pm.log(id, fmt.Sprintf("Delete by query error: %s", string(body)))
	} else {
		pm.log(id, "✅ Documents deleted from spaindb.")
	}

	// 2. Remove file from alias filter
	pm.log(id, fmt.Sprintf("Removing %s from alias %s filter...", filename, alias))

	// Fetch current alias
	reqUrl := fmt.Sprintf("%s/spaindb/_alias/%s", esHost, alias)
	getReq, _ := http.NewRequest("GET", reqUrl, nil)
	getReq.SetBasicAuth(esUser, esPass)

	getResp, err := client.Do(getReq)
	var currentFiles []string
	if err == nil && getResp.StatusCode == 200 {
		var aliasData map[string]interface{}
		bodyBytes, _ := io.ReadAll(getResp.Body)
		if err := json.Unmarshal(bodyBytes, &aliasData); err == nil {
			allFiles := extractFilesFromAlias(aliasData, alias)
			for _, f := range allFiles {
				if f != filename {
					currentFiles = append(currentFiles, f)
				}
			}
		}
	}
	if getResp != nil {
		getResp.Body.Close()
	}

	// 3. Update alias with filtered list
	payload := map[string]interface{}{
		"actions": []map[string]interface{}{
			{
				"add": map[string]interface{}{
					"index": "spaindb",
					"alias": alias,
					"filter": map[string]interface{}{
						"terms": map[string]interface{}{
							"file.keyword": currentFiles,
						},
					},
				},
			},
		},
	}

	payloadBytes, _ := json.Marshal(payload)
	postReq, _ := http.NewRequest("POST", esHost+"/_aliases", bytes.NewBuffer(payloadBytes))
	postReq.Header.Set("Content-Type", "application/json")
	postReq.SetBasicAuth(esUser, esPass)

	postResp, err := client.Do(postReq)
	if err != nil {
		return fmt.Errorf("error updating alias: %v", err)
	}
	defer postResp.Body.Close()

	if postResp.StatusCode >= 400 {
		body, _ := io.ReadAll(postResp.Body)
		return fmt.Errorf("ES aliases update failed: %s", string(body))
	}

	// Calculate remaining size after deindexing
	var totalSize int64
	for _, f := range currentFiles {
		filePath := filepath.Join(dataFolder, f)
		if info, err := os.Stat(filePath); err == nil {
			totalSize += info.Size()
		}
	}

	// Notify backend to update stats cache
	go func() {
		url := fmt.Sprintf("%s/api/stats/invalidate?alias=%s&size=%d", getWebServerBaseURL(), alias, totalSize)
		if _, err := http.Get(url); err != nil {
			pm.log(id, fmt.Sprintf("Warning: Could not update backend stats: %v", err))
		} else {
			pm.log(id, "✅ Backend stats cache updated.")
		}
	}()

	pm.log(id, fmt.Sprintf("✅ Alias %s updated. File %s removed from filter.", alias, filename))
	pm.log(id, "✅ Deindexing completed successfully.")
	return nil
}

// extractFilesFromAlias parses the ES alias definition to find filenames in terms/term filters
func extractFilesFromAlias(data map[string]interface{}, aliasName string) []string {
	var files []string
	fileSet := make(map[string]bool)

	// Iterate over all indices in the response
	for _, idxDataVal := range data {
		idxData, ok := idxDataVal.(map[string]interface{})
		if !ok {
			continue
		}
		aliases, ok := idxData["aliases"].(map[string]interface{})
		if !ok {
			continue
		}
		aliasInfo, ok := aliases[aliasName].(map[string]interface{})
		if !ok {
			continue
		}
		filter, ok := aliasInfo["filter"].(map[string]interface{})
		if !ok {
			continue
		}

		// Handle "terms" filter (multiple files)
		if terms, ok := filter["terms"].(map[string]interface{}); ok {
			for _, key := range []string{"file.keyword", "file"} {
				if filesArr, ok := terms[key].([]interface{}); ok {
					for _, f := range filesArr {
						if str, ok := f.(string); ok {
							fileSet[str] = true
						}
					}
				}
			}
		}

		// Handle "term" filter (single file)
		if term, ok := filter["term"].(map[string]interface{}); ok {
			for _, key := range []string{"file.keyword", "file"} {
				if f, ok := term[key].(string); ok {
					fileSet[f] = true
				}
			}
		}
	}

	for f := range fileSet {
		files = append(files, f)
	}
	return files
}

func getWebServerBaseURL() string {
	addr := os.Getenv("BACKEND_LISTEN_ADDR")
	if addr == "" {
		addr = "0.0.0.0:8080"
	}
	addr = strings.Replace(addr, "0.0.0.0:", "127.0.0.1:", 1)
	return "http://" + addr
}

func getESConfig() (string, string, string) {
	esHost := os.Getenv("ES_HOST")
	if esHost == "" {
		esHost = "http://localhost:9200"
	}
	esUser := os.Getenv("ES_USER")
	if esUser == "" {
		esUser = "elastic"
	}
	esPass := os.Getenv("ES_PASSWD")
	if esPass == "" {
		esPass = "changeme"
	}
	return esHost, esUser, esPass
}

func getDataFiles(dir string) ([]string, int, error) {
	var files []string
	var totalScanned int
	err := filepath.Walk(dir, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return nil // skip errors on individual entries
		}
		if !info.IsDir() {
			totalScanned++
			ext := strings.ToLower(filepath.Ext(info.Name()))
			if ext == ".json" || ext == ".csv" || ext == ".txt" || ext == ".jsonl" {
				files = append(files, path)
			}
		}
		return nil
	})
	return files, totalScanned, err
}

func readFileData(path string) ([]map[string]interface{}, error) {
	ext := strings.ToLower(filepath.Ext(path))

	if ext == ".csv" {
		return readCSV(path)
	}

	// For JSON, try parsing the whole file first
	if ext == ".json" {
		content, err := os.ReadFile(path)
		if err == nil {
			var data interface{}
			if err := json.Unmarshal(content, &data); err == nil {
				var result []map[string]interface{}
				switch v := data.(type) {
				case []interface{}:
					for _, item := range v {
						if m, ok := item.(map[string]interface{}); ok {
							result = append(result, m)
						}
					}
				case map[string]interface{}:
					result = append(result, v)
				}
				if len(result) > 0 {
					return result, nil
				}
			}
		}
	}

	// Fallback for failed JSON, or for TXT/JSONL: Read line by line
	return readLines(path)
}

func readLines(path string) ([]map[string]interface{}, error) {
	file, err := os.Open(path)
	if err != nil {
		return nil, err
	}
	defer file.Close()

	var result []map[string]interface{}
	scanner := bufio.NewScanner(file)
	// Increase max capacity for scanning long lines (10MB)
	buf := make([]byte, bufio.MaxScanTokenSize)
	scanner.Buffer(buf, 10*1024*1024)

	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line == "" {
			continue
		}

		var m map[string]interface{}
		// Try parsing as JSON object
		if err := json.Unmarshal([]byte(line), &m); err == nil {
			result = append(result, m)
		} else {
			// Not a valid JSON object, treat as plain text
			result = append(result, map[string]interface{}{
				"content": line,
			})
		}
	}

	if err := scanner.Err(); err != nil {
		return nil, err
	}

	return result, nil
}

func readCSV(path string) ([]map[string]interface{}, error) {
	file, err := os.Open(path)
	if err != nil {
		return nil, err
	}
	defer file.Close()

	reader := csv.NewReader(file)
	// Some CSVs may have varying fields or trailing commas
	reader.FieldsPerRecord = -1
	reader.LazyQuotes = true

	if _, err := reader.Read(); err != nil {
		return nil, fmt.Errorf("failed to read csv headers: %v", err)
	}

	var result []map[string]interface{}
	for {
		record, err := reader.Read()
		if err == io.EOF {
			break
		}
		if err != nil {
			continue // skip bad rows
		}

		values := make([]string, 0, len(record))
		for _, val := range record {
			if val != "" {
				values = append(values, val)
			}
		}
		result = append(result, map[string]interface{}{
			"content": strings.Join(values, " "),
		})
	}
	return result, nil
}

func sendBulk(docs []esDocument, pm *ProcessManager, id string) error {
	// Build NDJSON payload for _bulk API
	var buf bytes.Buffer
	for _, doc := range docs {
		meta := map[string]interface{}{
			"index": map[string]interface{}{
				"_index": doc.Index,
			},
		}
		metaBytes, _ := json.Marshal(meta)
		buf.Write(metaBytes)
		buf.WriteByte('\n')

		sourceBytes, _ := json.Marshal(doc.Source)
		buf.Write(sourceBytes)
		buf.WriteByte('\n')
	}

	esHost, esUser, esPass := getESConfig()

	req, err := http.NewRequest("POST", esHost+"/_bulk", &buf)
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/x-ndjson")
	req.SetBasicAuth(esUser, esPass)

	client := &http.Client{Timeout: 60 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("ES responded with status %sc: %s", resp.Status, string(body))
	}

	return nil
}
