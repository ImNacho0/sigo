package main

import (
	"encoding/json"
	"net/http"
	"strings"
	"time"
)

// ================= AUTH HANDLERS =================

func handleRoot(w http.ResponseWriter, r *http.Request) {
	// 1. Assets and Static Files
	if strings.HasPrefix(r.URL.Path, "/assets/") ||
		strings.HasSuffix(r.URL.Path, ".css") ||
		strings.HasSuffix(r.URL.Path, ".js") ||
		strings.HasSuffix(r.URL.Path, ".webp") ||
		strings.HasSuffix(r.URL.Path, ".jpg") ||
		strings.HasSuffix(r.URL.Path, ".png") ||
		strings.HasSuffix(r.URL.Path, ".svg") ||
		strings.HasSuffix(r.URL.Path, ".html") ||
		r.URL.Path == "/favicon.ico" {
		fs := http.FileServer(http.Dir("./static"))
		fs.ServeHTTP(w, r)
		return
	}

	// 2. Auth Check for main app
	cookie, err := r.Cookie("UCO_SESSION")
	if err == nil {
		licenseManager.mu.Lock()
		if lic, ok := licenseManager.Licenses[cookie.Value]; ok {
			if !time.Now().After(lic.Expiration) && lic.Type != "api" {
				// We could set a context value here if needed
			}
		}
		licenseManager.mu.Unlock()
	}

	// If not authenticated and not on a public path, and not an API call (handled by middleware)
	// we serve index.html regardless of the path to let React handle the internal "routing"
	// (even if we don't use React Router yet, it's safer for SPA)

	// Special Case: If we want to force Login page for non-authenticated users
	// But in our React app, App.tsx handles the Login view if not authenticated.
	// So we always serve index.html for "/" or unknown paths.

	http.ServeFile(w, r, "./static/index.html")
}

func handleLogin(w http.ResponseWriter, r *http.Request) {
	http.ServeFile(w, r, "./static/login.html")
}

func handleVerifyLicense(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Método no permitido", http.StatusMethodNotAllowed)
		return
	}

	var input struct {
		Key string `json:"key"`
	}
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		http.Error(w, "JSON inválido", http.StatusBadRequest)
		return
	}

	licenseManager.mu.Lock()
	lic, ok := licenseManager.Licenses[input.Key]
	licenseManager.mu.Unlock()

	if !ok {
		http.Error(w, "Licencia no encontrada", http.StatusUnauthorized)
		return
	}

	if time.Now().After(lic.Expiration) {
		http.Error(w, "Licencia expirada", http.StatusForbidden)
		return
	}

	if lic.Type == "api" {
		http.Error(w, "Esta licencia es solo para uso de API", http.StatusForbidden)
		return
	}

	http.SetCookie(w, &http.Cookie{
		Name:     "UCO_SESSION",
		Value:    input.Key,
		Path:     "/",
		HttpOnly: true,
		SameSite: http.SameSiteLaxMode,
		MaxAge:   3600 * 24,
	})

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "ok", "name": lic.Name})
}

func handleAuthStatus(w http.ResponseWriter, r *http.Request) {
	cookie, err := r.Cookie("UCO_SESSION")
	if err != nil {
		http.Error(w, "No session", http.StatusUnauthorized)
		return
	}

	licenseManager.mu.Lock()
	lic, ok := licenseManager.Licenses[cookie.Value]
	licenseManager.mu.Unlock()

	if !ok || lic.Type == "api" {
		http.Error(w, "Licencia no válida o restringida", http.StatusUnauthorized)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"key":          lic.Key,
		"name":         lic.Name,
		"role":         lic.Role,
		"type":         lic.Type,
		"used_search":  lic.UsedSearch,
		"quota_search": lic.QuotaSearch,
		"used_padron":  lic.UsedPadron,
		"quota_padron": lic.QuotaPadron,
	})
}

func handleLogout(w http.ResponseWriter, r *http.Request) {
	http.SetCookie(w, &http.Cookie{
		Name:     "UCO_SESSION",
		Value:    "",
		Path:     "/",
		MaxAge:   -1,
		HttpOnly: true,
	})
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
}

func securityMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// 1. Auth check for API / Gateway calls
		isInternal := strings.HasPrefix(r.URL.Path, "/api/") || r.URL.Path == "/gateway"

		// Public endpoints that don't require authentication
		publicEndpoints := []string{"/api/stats", "/api/stats/invalidate"}
		isPublic := false
		for _, endpoint := range publicEndpoints {
			if r.URL.Path == endpoint {
				isPublic = true
				break
			}
		}

		if isInternal && !isPublic {
			authorized := false

			// Check license in Authorization Header OR Cookie
			token := ""
			isBearer := false
			authHeader := r.Header.Get("Authorization")
			if strings.HasPrefix(authHeader, "Bearer ") {
				token = strings.TrimPrefix(authHeader, "Bearer ")
				isBearer = true
			}

			if token == "" {
				if cookie, err := r.Cookie("UCO_SESSION"); err == nil {
					token = cookie.Value
				}
			}

			if token != "" {
				licenseManager.mu.Lock()
				if lic, ok := licenseManager.Licenses[token]; ok {
					// Rule: Web-only licenses cannot use Bearer token
					if isBearer && lic.Type == "web" {
						authorized = false
					} else if !isBearer && lic.Type == "api" {
						// Rule: API-only licenses cannot use Web Cookie
						authorized = false
					} else {
						authorized = true
					}
				}
				licenseManager.mu.Unlock()
			}

			if !authorized {
				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(http.StatusUnauthorized)
				json.NewEncoder(w).Encode(map[string]string{
					"error": "Acceso restringido. Se requiere una licencia activa para operar en la Red SIGO.",
				})
				return
			}
		}

		// 2. Security Headers (Rest remains the same)
		w.Header().Set("X-Content-Type-Options", "nosniff")
		w.Header().Set("X-Frame-Options", "SAMEORIGIN")
		w.Header().Set("X-XSS-Protection", "1; mode=block")
		w.Header().Set("Referrer-Policy", "no-referrer")

		// Content Security Policy (CSP)
		csp := "default-src 'self'; " +
			"script-src 'self' 'unsafe-inline'; " +
			"style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
			"img-src 'self' data: https://*.basemaps.cartocdn.com https://flagcdn.com; " +
			"font-src 'self' https://fonts.gstatic.com; " +
			"connect-src 'self' https://unpkg.com; " +
			"frame-ancestors 'none'; " +
			"base-uri 'self'; " +
			"form-action 'self';"
		w.Header().Set("Content-Security-Policy", csp)

		// HSTS (Strict-Transport-Security)
		w.Header().Set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload")

		// Remove Server header
		w.Header().Del("Server")

		next.ServeHTTP(w, r)
	})
}
