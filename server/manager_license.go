package main

import (
	"encoding/json"
	"fmt"
	"os"
	"sync"
	"time"
)

type LicenseManager struct {
	mu       sync.Mutex
	Licenses map[string]*License
	FilePath string
}

var licenseManager *LicenseManager

func NewLicenseManager(filePath string) *LicenseManager {
	lm := &LicenseManager{
		Licenses: make(map[string]*License),
		FilePath: filePath,
	}
	lm.Load()
	// Start day reset loop
	go func() {
		for {
			now := time.Now()
			// Reset at midnight
			next := time.Date(now.Year(), now.Month(), now.Day()+1, 0, 0, 0, 0, now.Location())
			time.Sleep(time.Until(next))
			lm.ResetQuotas()
		}
	}()
	return lm
}

func (lm *LicenseManager) Load() {
	lm.mu.Lock()
	defer lm.mu.Unlock()
	data, err := os.ReadFile(lm.FilePath)
	if err == nil {
		json.Unmarshal(data, &lm.Licenses)
	}
}

func (lm *LicenseManager) Save() {
	lm.mu.Lock()
	defer lm.mu.Unlock()
	data, _ := json.MarshalIndent(lm.Licenses, "", "  ")
	os.WriteFile(lm.FilePath, data, 0644)
}

func (lm *LicenseManager) ResetQuotas() {
	lm.mu.Lock()
	defer lm.mu.Unlock()
	for _, l := range lm.Licenses {
		l.UsedSearch = 0
		l.UsedPadron = 0
		l.LastReset = time.Now()
	}
	// Save state
	data, _ := json.MarshalIndent(lm.Licenses, "", "  ")
	os.WriteFile(lm.FilePath, data, 0644)
}

func (lm *LicenseManager) CheckQuota(key string, isPadron bool) error {
	lm.mu.Lock()
	defer lm.mu.Unlock()

	lic, ok := lm.Licenses[key]
	if !ok {
		return fmt.Errorf("Licencia no encontrada")
	}
	if time.Now().After(lic.Expiration) {
		return fmt.Errorf("Licencia expirada")
	}

	// Lazy daily reset check
	if lic.LastReset.YearDay() != time.Now().YearDay() || lic.LastReset.Year() != time.Now().Year() {
		lic.UsedSearch = 0
		lic.UsedPadron = 0
		lic.LastReset = time.Now()
	}

	if isPadron {
		if lic.UsedPadron >= lic.QuotaPadron {
			return fmt.Errorf("Cuota de Padrón excedida (%d/%d)", lic.UsedPadron, lic.QuotaPadron)
		}
		lic.UsedPadron++
	} else {
		if lic.UsedSearch >= lic.QuotaSearch {
			return fmt.Errorf("Cuota de Búsqueda excedida (%d/%d)", lic.UsedSearch, lic.QuotaSearch)
		}
		lic.UsedSearch++
	}

	// Save state
	data, _ := json.MarshalIndent(lm.Licenses, "", "  ")
	os.WriteFile(lm.FilePath, data, 0644)

	return nil
}

// CheckQuotaAdvanced atomically charges `cost` units against UsedSearch for
// the given license. If the remaining quota is insufficient, nothing is
// mutated and an error is returned. Used by the advanced-search endpoint to
// guarantee that the cost (3 by default) is taken once per session.
func (lm *LicenseManager) CheckQuotaAdvanced(key string, cost int) error {
	lm.mu.Lock()
	defer lm.mu.Unlock()

	lic, ok := lm.Licenses[key]
	if !ok {
		return fmt.Errorf("Licencia no encontrada")
	}
	if time.Now().After(lic.Expiration) {
		return fmt.Errorf("Licencia expirada")
	}

	if lic.LastReset.YearDay() != time.Now().YearDay() || lic.LastReset.Year() != time.Now().Year() {
		lic.UsedSearch = 0
		lic.UsedPadron = 0
		lic.LastReset = time.Now()
	}

	if lic.UsedSearch+cost > lic.QuotaSearch {
		return fmt.Errorf("Cuota insuficiente para Búsqueda Avanzada (%d/%d, requiere %d)",
			lic.UsedSearch, lic.QuotaSearch, cost)
	}

	lic.UsedSearch += cost

	data, _ := json.MarshalIndent(lm.Licenses, "", "  ")
	os.WriteFile(lm.FilePath, data, 0644)

	return nil
}
