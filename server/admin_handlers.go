package main

import (
	"encoding/json"
	"fmt"
	"net/http"
	"time"
)

// startAdminServer builds the admin panel mux and starts the listener
func startAdminServer() {
	adminMux := http.NewServeMux()

	// 1. Static Assets specifically for Admin (or reuse)
	adminMux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/" {
			http.ServeFile(w, r, "./static/admin.html")
			return
		}
		// Serve other static files from /static
		http.ServeFile(w, r, "./static"+r.URL.Path)
	})

	// 2. API Endpoints
	adminMux.HandleFunc("/api/list", adminHandleList)
	adminMux.HandleFunc("/api/create", adminHandleCreate)
	adminMux.HandleFunc("/api/update", adminHandleUpdate)
	adminMux.HandleFunc("/api/delete", adminHandleDelete)

	fmt.Println(" - [ADMIN] Panel Operativo: http://redsigo:8082 (Acceso VPN)")
	http.ListenAndServe(":8082", adminMux)
}

func adminHandleList(w http.ResponseWriter, r *http.Request) {
	licenseManager.mu.Lock()
	defer licenseManager.mu.Unlock()

	var list []*License
	for _, l := range licenseManager.Licenses {
		list = append(list, l)
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(list)
}

func adminHandleCreate(w http.ResponseWriter, r *http.Request) {
	fmt.Println(" [ADMIN] Recibida petición en /api/create")
	var input License
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		http.Error(w, "JSON inválido", http.StatusBadRequest)
		return
	}

	if input.Key == "" || input.Name == "" {
		http.Error(w, "Faltan datos", http.StatusBadRequest)
		return
	}

	input.LastReset = time.Now()

	licenseManager.mu.Lock()
	licenseManager.Licenses[input.Key] = &input
	licenseManager.mu.Unlock()

	// Save outside the lock
	licenseManager.Save()
	fmt.Printf(" [ADMIN] Licencia creada: %s\n", input.Key)

	w.WriteHeader(http.StatusOK)
}

func adminHandleUpdate(w http.ResponseWriter, r *http.Request) {
	fmt.Println(" [ADMIN] Recibida petición en /api/update")
	var input License
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		http.Error(w, "JSON inválido", http.StatusBadRequest)
		return
	}

	licenseManager.mu.Lock()
	existing, ok := licenseManager.Licenses[input.Key]
	if !ok {
		licenseManager.mu.Unlock()
		http.Error(w, "Licencia no encontrada", http.StatusNotFound)
		return
	}

	// Update fields but preserve stats
	existing.Name = input.Name
	existing.Type = input.Type
	existing.Role = input.Role
	existing.Expiration = input.Expiration
	existing.QuotaSearch = input.QuotaSearch
	existing.QuotaPadron = input.QuotaPadron

	licenseManager.mu.Unlock() // UNLOCK BEFORE SAVE

	licenseManager.Save()
	fmt.Printf(" [ADMIN] Licencia actualizada: %s\n", input.Key)
	w.WriteHeader(http.StatusOK)
}

func adminHandleDelete(w http.ResponseWriter, r *http.Request) {
	var input struct {
		Key string `json:"key"`
	}
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		http.Error(w, "JSON inválido", http.StatusBadRequest)
		return
	}

	licenseManager.mu.Lock()
	delete(licenseManager.Licenses, input.Key)
	licenseManager.mu.Unlock()

	licenseManager.Save()

	w.WriteHeader(http.StatusOK)
}
