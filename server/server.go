package main

import (
	"fmt"
	"log"
	"net/http"
)

func main() {
	initTorClient()

	// Initialize License Manager
	licenseManager = NewLicenseManager("configs/licenses.json")

	// Initialize Stats Cache
	initStatsCache()

	// Start Admin Server (Local Only)
	go startAdminServer()

	mux := http.NewServeMux()

	// 1. Handlers
	mux.HandleFunc("/", handleRoot)
	mux.HandleFunc("/login", handleLogin)               // New Login Page
	mux.HandleFunc("/auth/verify", handleVerifyLicense) // New Verify API
	mux.HandleFunc("/auth/status", handleAuthStatus)    // Get Current License Info
	mux.HandleFunc("/auth/logout", handleLogout)        // Logout
	mux.HandleFunc("/gateway", handleGateway)

	// Keep existing API endpoints as fallback/legacy but protected
	mux.HandleFunc("/api/searchesp", handleSearchEsp)
	mux.HandleFunc("/api/searcharg", handleSearchArg)
	mux.HandleFunc("/api/searchslv", handleSearchSlv)
	mux.HandleFunc("/api/searchnic", handleSearchNic)
	mux.HandleFunc("/api/searchper", handleSearchPer)
	mux.HandleFunc("/api/searchchi", handleSearchChi)
	mux.HandleFunc("/api/padronesp", handlePadronEsp)
	mux.HandleFunc("/api/simplify", handleSimplify)
	mux.HandleFunc("/api/stats", handleStats)
	mux.HandleFunc("/api/stats/invalidate", handleStatsInvalidate)

	// Chat Endpoints
	mux.HandleFunc("/api/chat/history", handleChatHistory)
	mux.HandleFunc("/api/chat/send", handleChatSend)
	mux.HandleFunc("/api/chat/stream", handleChatStream)
	mux.HandleFunc("/api/chat/delete", handleChatDelete)

	// Admin Endpoints on main port
	mux.HandleFunc("/api/list", adminHandleList)
	mux.HandleFunc("/api/create", adminHandleCreate)
	mux.HandleFunc("/api/update", adminHandleUpdate)
	mux.HandleFunc("/api/delete", adminHandleDelete)

	fmt.Printf(" - Acceso Web: http://%s (Seamless / Interno)\n", ListenAddr)
	fmt.Printf(" - Protección SIGO: Activa para peticiones externas.\n")

	// Bind to all interfaces to allow Tailscale/VPN access
	log.Fatal(http.ListenAndServe(ListenAddr, securityMiddleware(mux)))
}
