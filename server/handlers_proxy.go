package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"sort"
	"strings"
)

func handleGateway(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Método no permitido", http.StatusMethodNotAllowed)
		return
	}

	var req struct {
		Target string          `json:"target"`
		Data   json.RawMessage `json:"data"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "JSON inválido: "+err.Error(), http.StatusBadRequest)
		return
	}

	// 2. Identify License & Quota Check
	// Look for license in Cookie or Authorization header
	var licenseKey string
	if cookie, err := r.Cookie("UCO_SESSION"); err == nil {
		licenseKey = cookie.Value
	}
	if licenseKey == "" {
		authHeader := r.Header.Get("Authorization")
		if strings.HasPrefix(authHeader, "Bearer ") {
			licenseKey = strings.TrimPrefix(authHeader, "Bearer ")
		}
	}

	// advanced-search has its own atomic quota (AdvancedSearchCost units)
	// and streams via SSE. Branch BEFORE the regular per-request CheckQuota.
	if req.Target == "advanced-search" {
		if licenseKey == "" {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusUnauthorized)
			json.NewEncoder(w).Encode(map[string]string{"error": "Licencia requerida"})
			return
		}
		if err := licenseManager.CheckQuotaAdvanced(licenseKey, AdvancedSearchCost); err != nil {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusForbidden)
			json.NewEncoder(w).Encode(map[string]string{"error": err.Error()})
			return
		}
		r.Body = io.NopCloser(bytes.NewBuffer(req.Data))
		handleAdvancedSearch(w, r, licenseKey)
		return
	}

	if licenseKey != "" {
		isPadron := req.Target == "padronesp" || req.Target == "searchcenso"
		if err := licenseManager.CheckQuota(licenseKey, isPadron); err != nil {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusForbidden)
			json.NewEncoder(w).Encode(map[string]string{"error": err.Error()})
			return
		}
	}

	// Route based on target
	switch req.Target {
	case "searchesp":
		r.Body = io.NopCloser(bytes.NewBuffer(req.Data))
		handleSearchEsp(w, r)
	case "searcharg":
		r.Body = io.NopCloser(bytes.NewBuffer(req.Data))
		handleSearchArg(w, r)
	case "searchslv":
		r.Body = io.NopCloser(bytes.NewBuffer(req.Data))
		handleSearchSlv(w, r)
	case "searchnic":
		r.Body = io.NopCloser(bytes.NewBuffer(req.Data))
		handleSearchNic(w, r)
	case "searchper":
		r.Body = io.NopCloser(bytes.NewBuffer(req.Data))
		handleSearchPer(w, r)
	case "searchchi":
		r.Body = io.NopCloser(bytes.NewBuffer(req.Data))
		handleSearchChi(w, r)
	case "searchcan":
		r.Body = io.NopCloser(bytes.NewBuffer(req.Data))
		handleSearchCan(w, r)
	case "searchbol":
		r.Body = io.NopCloser(bytes.NewBuffer(req.Data))
		handleSearchBol(w, r)
	case "searchecu":
		r.Body = io.NopCloser(bytes.NewBuffer(req.Data))
		handleSearchEcu(w, r)
	case "searchven":
		r.Body = io.NopCloser(bytes.NewBuffer(req.Data))
		handleSearchVen(w, r)
	case "searchpar":
		r.Body = io.NopCloser(bytes.NewBuffer(req.Data))
		handleSearchPar(w, r)
	case "searchmex":
		r.Body = io.NopCloser(bytes.NewBuffer(req.Data))
		handleSearchMex(w, r)
	case "searchcenso":
		r.Body = io.NopCloser(bytes.NewBuffer(req.Data))
		handleSearchCenso(w, r)
	case "padronesp":
		r.Body = io.NopCloser(bytes.NewBuffer(req.Data))
		handlePadronEsp(w, r)
	case "simplify":
		r.Body = io.NopCloser(bytes.NewBuffer(req.Data))
		handleSimplify(w, r)
	default:
		http.Error(w, "Operación interna desconocida", http.StatusBadRequest)
	}
}

func handleSearchEsp(w http.ResponseWriter, r *http.Request) {
	proxyRequest(w, r, BackendURL+"/searchesp")
}

func handleSearchArg(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusMethodNotAllowed)
		json.NewEncoder(w).Encode(map[string]string{"text": "❌ Método no permitido."})
		return
	}

	// 1. Forward request to Python API to get raw data
	// We need to read the body first to send it
	bodyBytes, _ := io.ReadAll(r.Body)
	// Restore body for the proxy call equivalent (manually doing it here)
	r.Body = io.NopCloser(bytes.NewBuffer(bodyBytes))

	// Create request to Python API
	req, err := http.NewRequest("POST", BackendURL+"/searcharg", bytes.NewBuffer(bodyBytes))
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		log.Printf("[500 ERROR] en %s: %v", r.URL.Path, err)
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "❌ Error al crear la petición interna."})
		return
	}
	req.Header.Set("Authorization", "Bearer "+BearerToken)
	req.Header.Set("Content-Type", "application/json")

	resp, err := getHttpClient(BackendURL).Do(req)
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadGateway)
		json.NewEncoder(w).Encode(map[string]string{"text": "❌ Error de conexión con el backend (Argentina)."})
		return
	}
	defer resp.Body.Close()

	// 2. Parse response
	var apiResp map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&apiResp); err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadGateway)
		json.NewEncoder(w).Encode(map[string]string{"text": "❌ Respuesta inválida del servidor de datos."})
		return
	}

	// Check if we have cached response
	cacheKey := "arg:" + string(bodyBytes)
	if entry, ok := globalCache.Get(cacheKey); ok {
		go func() {
			var input map[string]interface{}
			json.Unmarshal(bodyBytes, &input)
			query := "Desconocido"
			if val, ok := input["query"]; ok {
				query = fmt.Sprint(val)
			} else if val, ok := input["nombre"]; ok {
				query = fmt.Sprint(val)
			}

			var cached []interface{}
			json.Unmarshal(entry.Data, &cached)
			logSearch(r, "searcharg", query, len(cached), true, true)
		}()
		w.Header().Set("Content-Type", "application/json")
		w.Header().Set("X-Cache", "HIT")
		w.Write(entry.Data)
		return
	}

	// Check if we have raw_data or an error/text message
	if text, ok := apiResp["text"].(string); ok {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{"text": text})
		return
	}

	rawData, ok := apiResp["raw_data"].(string)
	if !ok || rawData == "" {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{"text": "❌ No se recibieron datos para analizar."})
		return
	}

	// Process raw string data into structured JSON (Server-side parsing)
	var processedResults []map[string]interface{}
	lines := strings.Split(rawData, "\n")

	for _, line := range lines {
		line = strings.TrimSpace(line)
		if line == "" {
			continue
		}

		var rawRecord map[string]interface{}
		// Try to parse line as JSON
		if err := json.Unmarshal([]byte(line), &rawRecord); err == nil {
			record := make(map[string]interface{})

			// Normalize keys
			for k, v := range rawRecord {
				kLower := strings.ToLower(k)
				switch kLower {
				case "fechadenacimiento", "fecha_nacimiento", "birthdate", "fec_nac":
					record["fecha_nacimiento"] = v
				case "nombrecompleto", "nombre_completo", "nombre", "name", "fullname":
					record["nombre_completo"] = v
				case "direccion", "domicilio", "address", "dir":
					record["domicilio"] = v
				case "telefono", "phone", "celular", "movil", "tel":
					record["telefono"] = v
				case "documento", "dni", "nro_doc":
					record["dni"] = v
				default:
					record[kLower] = v
				}
			}

			// Calculate age if fecha_nacimiento exists
			if dob, ok := record["fecha_nacimiento"].(string); ok {
				if age, valid := calculateAgeGo(dob); valid {
					record["edad"] = age
				}
			}
			processedResults = append(processedResults, record)
		} else {
			// Fallback for non-JSON lines (shouldn't happen with current data but good for safety)
			// process as unstructured text if needed, or skip.
			// For now, we'll wrap it in a simple object to avoid data loss
			processedResults = append(processedResults, map[string]interface{}{"raw_text": line})
		}
	}

	// Log to Discord
	go func() {
		// Try to extract query from request body
		var input map[string]interface{}
		json.Unmarshal(bodyBytes, &input)
		query := "Desconocido"
		if val, ok := input["query"]; ok {
			query = fmt.Sprint(val)
		} else if val, ok := input["nombre"]; ok {
			query = fmt.Sprint(val)
		}

		logSearch(r, "searcharg", query, len(processedResults), true, false)
	}()

	// Save to cache
	respBytes, _ := json.Marshal(processedResults)
	globalCache.Set(cacheKey, respBytes, http.StatusOK)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(processedResults)
}

func handleSearchSlv(w http.ResponseWriter, r *http.Request) {
	proxyRequest(w, r, BackendURL+"/searchslv")
}

func handleSearchNic(w http.ResponseWriter, r *http.Request) {
	proxyRequest(w, r, BackendURL+"/searchnic")
}

func handleSearchPer(w http.ResponseWriter, r *http.Request) {
	proxyRequest(w, r, BackendURL+"/searchper")
}

func handleSearchChi(w http.ResponseWriter, r *http.Request) {
	proxyRequest(w, r, BackendURL+"/searchchi")
}

func handleSearchCan(w http.ResponseWriter, r *http.Request) {
	proxyRequest(w, r, BackendURL+"/searchcan")
}

func handleSearchBol(w http.ResponseWriter, r *http.Request) {
	proxyRequest(w, r, BackendURL+"/searchbol")
}

func handleSearchEcu(w http.ResponseWriter, r *http.Request) {
	proxyRequest(w, r, BackendURL+"/searchecu")
}

func handleSearchVen(w http.ResponseWriter, r *http.Request) {
	proxyRequest(w, r, BackendURL+"/searchven")
}

func handleSearchPar(w http.ResponseWriter, r *http.Request) {
	proxyRequest(w, r, BackendURL+"/searchpar")
}

func handleSearchMex(w http.ResponseWriter, r *http.Request) {
	proxyRequest(w, r, BackendURL+"/searchmex")
}

func handleSearchCenso(w http.ResponseWriter, r *http.Request) {
	proxyRequest(w, r, BackendURL+"/searchcenso")
}

func handlePadronEsp(w http.ResponseWriter, r *http.Request) {
	handlePadronGeneric(w, r, "padron", "/padronesp")
}

func handlePadronGeneric(w http.ResponseWriter, r *http.Request, cachePrefix, apiEndpoint string) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var input struct {
		Nombre string `json:"nombre"`
	}
	bodyBytes, _ := io.ReadAll(r.Body)
	json.Unmarshal(bodyBytes, &input)
	nombreBusqueda := strings.TrimSpace(input.Nombre)

	if nombreBusqueda == "" {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{"text": "❌ Por favor, introduce un nombre y apellidos."})
		return
	}

	// Check Cache
	cacheKey := cachePrefix + ":" + nombreBusqueda
	if entry, ok := globalCache.Get(cacheKey); ok {
		// Log even on cache hit
		go func() {
			totalCached := 0
			var cachedData struct {
				Text string `json:"text"`
			}
			if err := json.Unmarshal(entry.Data, &cachedData); err == nil {
				totalCached = strings.Count(cachedData.Text, "ai-person")
			}
			cleanTarget := strings.TrimPrefix(apiEndpoint, "/")
			logSearch(r, cleanTarget, nombreBusqueda, totalCached, true, true)
		}()

		w.Header().Set("Content-Type", "application/json")
		w.Header().Set("X-Cache", "HIT")
		w.WriteHeader(entry.StatusCode)
		w.Write(entry.Data)
		return
	}

	// 1) Search using the Onion's /padron endpoint
	outgoingReqBody, _ := json.Marshal(input)
	req, err := http.NewRequest("POST", BackendURL+apiEndpoint, bytes.NewBuffer(outgoingReqBody))
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{"text": "❌ Error interno al crear la petición."})
		return
	}
	req.Header.Set("Authorization", "Bearer "+BearerToken)
	req.Header.Set("Content-Type", "application/json")

	resp, err := getHttpClient(BackendURL).Do(req)
	if err != nil {
		log.Printf("ERROR TOR (%s %s): %v", outgoingReqBody, BackendURL+apiEndpoint, err)
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadGateway)
		json.NewEncoder(w).Encode(map[string]string{"error": "❌ Error de conexión con la red TOR."})
		return
	}
	log.Printf("RESP TOR (%s): %d", apiEndpoint, resp.StatusCode)
	defer resp.Body.Close()

	respData, _ := io.ReadAll(resp.Body)
	var padronData PadronResponse
	if err := json.Unmarshal(respData, &padronData); err != nil {
		// Fallback for debugging if it's not the expected object
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{"text": "❌ Formato de respuesta no reconocido. Verifique la API."})
		return
	}

	if len(padronData.Direcciones) == 0 {
		respJSON, _ := json.Marshal(map[string]string{"text": "❌ No se encontró ninguna coincidencia en los archivos."})
		globalCache.Set(cacheKey, respJSON, http.StatusOK)
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		w.Write(respJSON)
		return
	}

	// 2) Generate Report
	var report strings.Builder
	totalPeople := 0

	for _, addr := range padronData.Direcciones {
		// ... existing code ...
		totalPeople += len(addr.Personas)

		yearsTxt := []string{}
		for _, y := range addr.Years {
			yearsTxt = append(yearsTxt, fmt.Sprintf("%d", y))
		}
		sort.Strings(yearsTxt)

		// Localization formatting: "Valencia, Valencia, Comunidad Valenciana"
		loc := addr.Localizacion
		// Remove Markdown and bullets
		loc = strings.ReplaceAll(loc, "**", "")
		loc = strings.ReplaceAll(loc, "*", "")

		// Map of labels to remove
		labels := []string{
			"Municipio:", "Provincia:", "Comunidad Autónoma:",
			"Comunidad Autonoma:", "Comunidad:", "Localidad:",
		}

		var parts []string
		lines := strings.Split(loc, "\n")
		for _, line := range lines {
			val := strings.TrimSpace(line)
			if val == "" {
				continue
			}

			// Remove leading dash or bullet if present
			val = strings.TrimPrefix(val, "-")
			val = strings.TrimSpace(val)

			for _, label := range labels {
				if strings.HasPrefix(strings.ToLower(val), strings.ToLower(label)) {
					val = val[len(label):]
					break
				}
			}
			val = strings.TrimSpace(val)
			if val != "" {
				parts = append(parts, val)
			}
		}
		loc = strings.Join(parts, ", ")

		report.WriteString(fmt.Sprintf("<b>· Dirección:</b> <pre>%s</pre>\n", addr.Direccion))
		if cachePrefix == "padron" {
			report.WriteString(fmt.Sprintf("<b>· Código Postal:</b> <pre>%s</pre>\n", addr.CodigoPostal))
			report.WriteString(fmt.Sprintf("<b>· Años registrados:</b> <pre>%s</pre>\n", strings.Join(yearsTxt, ", ")))
			report.WriteString(fmt.Sprintf("<b>· Localización:</b> <pre>%s</pre>\n", loc))
		}

		// 3) Process cohabitants
		cohabitants := make([]Person, len(addr.Personas))
		for i, p := range addr.Personas {
			cohabitants[i] = Person(p)
			// Priority to "Nombre y apellidos" for the inferRelationships helper
			if name, ok := cohabitants[i]["nombre"].(string); ok && cohabitants[i]["Nombre y apellidos"] == nil {
				cohabitants[i]["Nombre y apellidos"] = name
			}
		}

		// Relationship inference
		cohabitants = inferRelationshipsGo(nombreBusqueda, cohabitants)

		// Demographic classification
		ages := []int{}
		for _, p := range cohabitants {
			if age, ok := p["age"].(int); ok {
				ages = append(ages, age)
			}
		}
		clasificacion := classifyDemographicsGo(ages)

		report.WriteString(fmt.Sprintf("<b>· Personas empadronadas:</b> <pre>%d</pre>\n", len(cohabitants)))
		report.WriteString(fmt.Sprintf("<b>· Clasificación del hogar:</b> <pre>%s</pre>\n\n", clasificacion))

		for _, p := range cohabitants {
			nombre := fmt.Sprintf("%v", p["Nombre y apellidos"])
			fecha := fmt.Sprintf("%v", p["fecha_nacimiento"])
			if fecha == "<nil>" || fecha == "" {
				fecha = "Sin fecha"
			}
			ageStr := "—"
			if age, ok := p["age"].(int); ok {
				ageStr = fmt.Sprintf("%d", age)
			}
			rel := fmt.Sprintf("%v", p["parentesco"])
			nuc := fmt.Sprintf("%v", p["nuc"])
			if nuc == "<nil>" {
				nuc = "—"
			}

			report.WriteString("<div class=\"ai-person\">\n")
			report.WriteString(fmt.Sprintf("• <b>%s</b>\n", nombre))
			report.WriteString(fmt.Sprintf(" ├ 📅 Nacimiento: <code>%s</code>\n", fecha))
			report.WriteString(fmt.Sprintf(" ├ 🎂 Edad: <code>%s</code>\n", ageStr))
			report.WriteString(fmt.Sprintf(" ├ 👪 Relación con objetivo: <code>%s</code>\n", rel))

			if cachePrefix == "padronarg" {
				dniVal := p["dni"]
				dniStr := "—"
				if dniVal != nil {
					// Handle scientific notation from JSON floats
					if f, ok := dniVal.(float64); ok {
						dniStr = fmt.Sprintf("%.0f", f)
					} else {
						dniStr = fmt.Sprintf("%v", dniVal)
					}
				}

				report.WriteString(fmt.Sprintf(" ├ 🆔 DNI: <code>%s</code>\n", dniStr))
				if tel, ok := p["telefono"].(string); ok && tel != "" && tel != "None" {
					report.WriteString(fmt.Sprintf(" ├ 📞 Teléfono: <code>%s</code>\n", tel))
				}
				if mun, ok := p["municipio"].(string); ok && mun != "" {
					report.WriteString(fmt.Sprintf(" ├ 🏙️ Municipio: <code>%s</code>\n", mun))
				}
				if prov, ok := p["provincia"].(string); ok && prov != "" {
					report.WriteString(fmt.Sprintf(" └ 🗺️ Provincia: <code>%s</code>\n", prov))
				}
			} else {
				report.WriteString(fmt.Sprintf(" └ 🆔 NUC: <code>%s</code>\n\n", nuc))
			}
			report.WriteString("</div>\n")
		}
		report.WriteString("<b class=\"separator\">─────</b>\n\n")
	}

	respJSON, _ := json.Marshal(map[string]string{"text": report.String()})
	globalCache.Set(cacheKey, respJSON, http.StatusOK)

	logSearch(r, strings.TrimPrefix(apiEndpoint, "/"), nombreBusqueda, totalPeople, true, false)

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	w.Write(respJSON)
}

func handleSimplify(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var input interface{}
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		http.Error(w, "Invalid JSON", http.StatusBadRequest)
		return
	}

	// Clean/Filter data like in main.py
	content := filterSQL(input)
	contentStr, _ := json.MarshalIndent(content, "", "  ")

	prompt := fmt.Sprintf(`
            Analiza el siguiente documento de texto y extrae de forma exhaustiva toda la información asociada a cada persona identificada. 
            Cada persona puede contener distintos campos (nombre, teléfono, email, DNI, dirección, etc.), incluyendo campos no convencionales 
            como fecha de nacimiento, redes sociales, apodos, etc.

		⚠️ REGLA DE ORO DE ESTRUCTURA:
		- Crea UNA SOLA etiqueta <div class="ai-person"> por cada persona.
		- CADA dato (nombre, teléfono, email, DNI, cada dirección) DEBE aparecer en su PROPIA LÍNEA.
		- Usa el guion inicial (-) al principio de cada línea de datos.
		- El nombre de la persona va en la primera línea SIN guion.
		
		✅ IMPORTANTE:
		- Usa SOLO las siguientes etiquetas HTML:
			<b>negrita</b>, <i>cursiva</i>, <u>subrayado</u>, <a href="...">enlace</a>, <code>código</code>, <div class="ai-person">...</div>

		❌ NO uses estas etiquetas:
			<h1>, <h2>, <h3>, <p>, <ul>, <li>, <br>, <span>, <blockquote>, etc.

		❌ NO encierres el resultado en bloques de código como `+"```html```"+` o similares

		❌ NO uses <br>, <p>, ni otras etiquetas de formato

		📄 Devuelve los resultados en formato HTML con una sección separada por persona. Usa el siguiente formato EXACTO:

		<div class="ai-person">
<b>👤 Juan Pérez</b>
- <b>📞 Teléfono:</b> <code>612345678</code>
- <b>✉️ Email:</b> <code>juan@example.com</code>
- <b>💳 DNI:</b> <code>12345678A</code>
- <b>🏠 Dirección:</b> <code>Calle Mayor 1, Madrid</code>
</div>

		<div class="ai-person">
<b>👤 María García</b>
- <b>✉️ Email:</b> <code>maria@example.com</code>
- <b>🌐 Red social:</b> <a href="https://instagram.com/mariag">@mariag</a>
- <b>🤓 Apodo:</b> <i>Mari</i>
</div>

		Ahora, analiza este documento:
%s`, string(contentStr))

	text, err := callGroq(prompt)
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// Log to Discord
	logSearch(r, "simplify", "Analizar/Simplificar datos", 1, true, false)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"text":    text,
		"success": true,
	})
}

func callGroq(prompt string) (string, error) {
	if GroqAPIKey == "" {
		return "", fmt.Errorf("GROQ_API_KEY not configured")
	}

	reqBody := map[string]interface{}{
		"model": GroqModel,
		"messages": []interface{}{
			map[string]interface{}{
				"role":    "user",
				"content": prompt,
			},
		},
		"max_tokens": 4096,
	}

	reqBytes, _ := json.Marshal(reqBody)
	req, err := http.NewRequest("POST", GroqURL, bytes.NewBuffer(reqBytes))
	if err != nil {
		return "", fmt.Errorf("error building Groq request: %v", err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+GroqAPIKey)

	resp, err := aiClient.Do(req)
	if err != nil {
		return "", fmt.Errorf("error calling Groq API: %v", err)
	}
	defer resp.Body.Close()

	var groqResp struct {
		Choices []struct {
			Message struct {
				Content string `json:"content"`
			} `json:"message"`
		} `json:"choices"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&groqResp); err != nil {
		return "", fmt.Errorf("error parsing Groq response: %v", err)
	}
	if len(groqResp.Choices) == 0 {
		return "", fmt.Errorf("no choices from Groq")
	}

	text := groqResp.Choices[0].Message.Content
	return cleanAIResponse(text), nil
}

func cleanAIResponse(text string) string {
	// Remove markdown code blocks and various labels
	text = strings.ReplaceAll(text, "```html", "")
	text = strings.ReplaceAll(text, "```HTML", "")
	text = strings.ReplaceAll(text, "```", "")

	// Remove literal "html" label if Gemini forgets to wrap it but still adds it
	text = strings.TrimPrefix(strings.TrimSpace(text), "html")
	text = strings.TrimPrefix(strings.TrimSpace(text), "HTML")

	// Remove leading/trailing whitespace
	text = strings.TrimSpace(text)

	return text
}

func proxyRequest(w http.ResponseWriter, r *http.Request, targetURL string) {
	if r.Method != http.MethodPost {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusMethodNotAllowed)
		json.NewEncoder(w).Encode(map[string]string{"text": "❌ Método no permitido."})
		return
	}

	// Read body from incoming request
	body, err := io.ReadAll(r.Body)
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		log.Printf("[500 ERROR] en %s: %v", r.URL.Path, err)
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "❌ Error al leer el cuerpo de la petición."})
		return
	}
	defer r.Body.Close()

	// Check Cache
	cacheKey := fmt.Sprintf("proxy:%s:%s", targetURL, string(body))
	if entry, ok := globalCache.Get(cacheKey); ok {
		go func() {
			// Extract clean target name
			cleanTarget := targetURL
			if idx := strings.LastIndex(targetURL, "/"); idx != -1 {
				cleanTarget = targetURL[idx+1:]
			}

			// Try to extract query from body
			var input map[string]interface{}
			json.Unmarshal(body, &input)
			query := "Desconocido"
			if val, ok := input["nombre"]; ok {
				query = fmt.Sprint(val)
			} else if val, ok := input["query"]; ok {
				query = fmt.Sprint(val)
			} else if val, ok := input["dni"]; ok {
				query = "DNI: " + fmt.Sprint(val)
			}

			var output []interface{}
			count := 0
			json.Unmarshal(entry.Data, &output) // try array
			if len(output) == 0 {
				var mapOut map[string]interface{}
				if err := json.Unmarshal(entry.Data, &mapOut); err == nil {
					if res, ok := mapOut["results"].([]interface{}); ok {
						count = len(res)
					}
				}
			} else {
				count = len(output)
			}
			logSearch(r, cleanTarget, query, count, true, true)
		}()

		w.Header().Set("Content-Type", "application/json")
		w.Header().Set("X-Cache", "HIT")
		w.WriteHeader(entry.StatusCode)
		w.Write(entry.Data)
		return
	}

	// Create new request to Onion API
	req, err := http.NewRequest("POST", targetURL, bytes.NewBuffer(body))
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		log.Printf("[500 ERROR] en %s: %v", r.URL.Path, err)
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "❌ Error al crear la petición proxy."})
		return
	}

	req.Header.Set("Authorization", "Bearer "+BearerToken)
	req.Header.Set("Content-Type", "application/json")

	// Execute request
	log.Printf("PROXY REQ: POST %s", targetURL)
	resp, err := getHttpClient(targetURL).Do(req)
	if err != nil {
		log.Printf("PROXY ERROR (%s): %v", targetURL, err)
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadGateway)
		json.NewEncoder(w).Encode(map[string]string{"error": fmt.Sprintf("❌ Error de conexión con la red Onion: %v", err)})
		return
	}
	log.Printf("PROXY RESP (%s): %d", targetURL, resp.StatusCode)
	defer resp.Body.Close()

	// Read response body to cache it
	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		http.Error(w, "Error reading response body", http.StatusInternalServerError)
		return
	}

	// Cache if successful
	if resp.StatusCode == http.StatusOK {
		globalCache.Set(cacheKey, respBody, resp.StatusCode)
	}

	// Forward response back to client
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(resp.StatusCode)
	w.Write(respBody)

	// Attempt to log proxy requests (searchesp, searchslv, etc)
	go func() {
		// key finding
		var input map[string]interface{}
		json.Unmarshal(body, &input)

		query := "Desconocido"
		if val, ok := input["nombre"]; ok {
			query = fmt.Sprint(val)
		} else if val, ok := input["query"]; ok {
			query = fmt.Sprint(val)
		} else if val, ok := input["dni"]; ok {
			query = "DNI: " + fmt.Sprint(val)
		}

		// Result count approximation
		var output []interface{}
		count := 0
		if err := json.Unmarshal(respBody, &output); err == nil {
			count = len(output)
		} else {
			// Maybe it's a map with "results"
			var mapOut map[string]interface{}
			if err := json.Unmarshal(respBody, &mapOut); err == nil {
				if res, ok := mapOut["results"].([]interface{}); ok {
					count = len(res)
				}
			}
		}

		// Clean target for log
		cleanTarget := targetURL
		if idx := strings.LastIndex(targetURL, "/"); idx != -1 {
			cleanTarget = targetURL[idx+1:]
		}

		logSearch(r, cleanTarget, query, count, resp.StatusCode == 200, false)
	}()
}

// Helper to log searches
func logSearch(r *http.Request, target, query string, count int, success, cached bool) {
	cookie, _ := r.Cookie("UCO_SESSION")
	licenseKey := ""
	userName := "Desconocido"

	if cookie != nil {
		licenseKey = cookie.Value
	} else {
		// Try Bearer token
		authHeader := r.Header.Get("Authorization")
		if strings.HasPrefix(authHeader, "Bearer ") {
			licenseKey = strings.TrimPrefix(authHeader, "Bearer ")
		}
	}

	if licenseKey != "" {
		licenseManager.mu.Lock()
		if lic, ok := licenseManager.Licenses[licenseKey]; ok {
			userName = lic.Name
			// Optional: Append type to username for clarity?
			// userName = fmt.Sprintf("%s (%s)", lic.Name, strings.ToUpper(lic.Type))
		}
		licenseManager.mu.Unlock()
	}
	SendSearchLog(userName, licenseKey, target, query, count, success, cached)
}
