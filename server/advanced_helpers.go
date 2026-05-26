package main

import (
	"encoding/json"
	"fmt"
	"regexp"
	"strings"
)

// ExtractionResult mirrors the TS interface in SearchResultsModal.tsx.
type ExtractionResult struct {
	Type     string // DNI | NIE | Phone | Email | IBAN | Plate | Name | Address
	Value    string
	IsStrong bool
}

// normalizeText strips Spanish diacritics, preserving case (e.g. "José" → "Jose",
// "MUÑOZ" → "MUNOZ"). Matches the TS normalizeText() in the modal.
var normalizeReplacer = strings.NewReplacer(
	"á", "a", "é", "e", "í", "i", "ó", "o", "ú", "u", "ñ", "n", "ü", "u",
	"Á", "A", "É", "E", "Í", "I", "Ó", "O", "Ú", "U", "Ñ", "N", "Ü", "U",
)

func normalizeText(s string) string {
	return normalizeReplacer.Replace(s)
}

// commonAccents mirrors the TS dictionary in generateVariants().
var commonAccents = map[string]string{
	"sanchez": "Sánchez", "perez": "Pérez", "rodriguez": "Rodríguez",
	"martinez": "Martínez", "lopez": "López", "gonzalez": "González",
	"hernandez": "Hernández", "jimenez": "Jiménez", "alvarez": "Álvarez",
	"fernandez": "Fernández", "gomez": "Gómez", "diaz": "Díaz",
	"vazquez": "Vázquez", "munoz": "Muñoz", "nunez": "Núñez",
	"marin": "Marín", "beltran": "Beltrán", "millan": "Millán",
	"galan": "Galán", "roman": "Román", "roldan": "Roldán",
	"solis": "Solís",
	"jose":  "José", "maria": "María", "jesus": "Jesús",
	"angel": "Ángel", "adrian": "Adrián", "agustin": "Agustín",
	"andres": "Andrés", "cesar": "César", "cristobal": "Cristóbal",
	"damian": "Damián", "efrain": "Efraín", "eloisa": "Eloísa",
	"estefania": "Estefanía", "fabian": "Fabián", "german": "Germán",
	"hernan": "Hernán", "ines": "Inés", "ivan": "Iván",
	"joaquin": "Joaquín", "julian": "Julián", "martin": "Martín",
	"nestor": "Néstor", "oscar": "Óscar", "ramon": "Ramón",
	"raul": "Raúl", "ruben": "Rubén", "sebastian": "Sebastián",
	"tomas": "Tomás", "victor": "Víctor",
}

var dniLetters = "TRWAGMYFPDXBNJZSQVHLCKE"
var reCleanWord = regexp.MustCompile(`[^a-zñ]`)
var reDigits = regexp.MustCompile(`\D`)
var reAllDigits8 = regexp.MustCompile(`^\d{8}$`)
var reDNI8plus1 = regexp.MustCompile(`^\d{8}[A-Z]$`)
var reWordSpace = regexp.MustCompile(`\s+`)

// generateVariantsGo mirrors generateVariants() from the modal. Returns the
// extra query variants (not including the original input).
func generateVariantsGo(input string) []string {
	trimmed := strings.TrimSpace(input)
	variants := make(map[string]struct{})

	normalized := normalizeText(trimmed)
	if !strings.EqualFold(normalized, trimmed) {
		variants[normalized] = struct{}{}
	}

	words := strings.Fields(trimmed)
	mixedWords := make([]string, len(words))
	upperWords := make([]string, len(words))
	for i, w := range words {
		clean := reCleanWord.ReplaceAllString(strings.ToLower(w), "")
		if rep, ok := commonAccents[clean]; ok {
			if w == strings.ToUpper(w) {
				mixedWords[i] = strings.ToUpper(rep)
			} else {
				mixedWords[i] = rep
			}
			upperWords[i] = strings.ToUpper(rep)
		} else {
			mixedWords[i] = w
			upperWords[i] = strings.ToUpper(w)
		}
	}
	variantMixed := strings.Join(mixedWords, " ")
	variantUpper := strings.Join(upperWords, " ")

	if variantMixed != trimmed {
		variants[variantMixed] = struct{}{}
	}
	if variantUpper != trimmed {
		variants[variantUpper] = struct{}{}
	}
	if !strings.EqualFold(variantMixed, trimmed) {
		variants[strings.ToLower(variantMixed)] = struct{}{}
	}

	digits := reDigits.ReplaceAllString(trimmed, "")
	if len(digits) >= 9 {
		last9 := digits[len(digits)-9:]
		variants[last9] = struct{}{}
		variants["+34"+last9] = struct{}{}
		variants["0034"+last9] = struct{}{}
		variants["34"+last9] = struct{}{}
	}
	if reAllDigits8.MatchString(trimmed) {
		var num int
		fmt.Sscanf(trimmed, "%d", &num)
		variants[trimmed+string(dniLetters[num%23])] = struct{}{}
	}
	if reDNI8plus1.MatchString(strings.ToUpper(trimmed)) {
		variants[trimmed[:8]] = struct{}{}
	}

	delete(variants, trimmed)
	delete(variants, strings.ToLower(trimmed))
	delete(variants, strings.ToUpper(trimmed))

	out := make([]string, 0, len(variants))
	for v := range variants {
		out = append(out, v)
	}
	return out
}

// extractData regex patterns. RE2 has no lookbehind but we don't need it.
var (
	reDNI     = regexp.MustCompile(`(?i)\b\d{8}[TRWAGMYFPDXBNJZSQVHLCKE]\b`)
	reNIE     = regexp.MustCompile(`(?i)\b[XYZ]\d{7}[TRWAGMYFPDXBNJZSQVHLCKE]\b`)
	rePhone   = regexp.MustCompile(`(?:\+34|0034|34)?[6789]\d{8}\b`)
	reEmail   = regexp.MustCompile(`[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}`)
	reIBAN    = regexp.MustCompile(`\bES\d{22}\b`)
	rePlate   = regexp.MustCompile(`(?i)\b\d{4}[B-DF-HJ-NP-TV-Z]{3}\b`)
	reName    = regexp.MustCompile(`(?i)[A-ZÁÉÍÓÚÑ]{2,}(?:\s[A-ZÁÉÍÓÚÑ]{2,}){1,3}`)
	reChunks  = regexp.MustCompile(`[^"{}\[\],:]{10,150}`)
	reHasDigit = regexp.MustCompile(`\d`)
)

var addressKeywords = []string{"calle", "c/", "/c", "av", "avenida", "avda", "nº", "paseo", "plaza", "pza", "edificio", "urbanizacion", "urb"}
var nameForbiddenKeywords = []string{"calle", "avenida", "plaza", "edificio", "piso", "portal", "nacional", "provincia", "municipio", "comunidad"}

// extractDataGo mirrors extractData() from the modal. Marshals the input to
// JSON and runs the same regex set over it.
func extractDataGo(data interface{}) []ExtractionResult {
	raw, _ := json.Marshal(data)
	text := string(raw)

	resultsMap := make(map[string]ExtractionResult)

	strongPatterns := []struct {
		Name string
		Re   *regexp.Regexp
	}{
		{"DNI", reDNI}, {"NIE", reNIE}, {"Phone", rePhone},
		{"Email", reEmail}, {"IBAN", reIBAN}, {"Plate", rePlate},
	}

	for _, p := range strongPatterns {
		for _, m := range p.Re.FindAllString(text, -1) {
			val := strings.ToUpper(strings.ReplaceAll(m, " ", ""))
			if val == "A@A.COM" {
				continue
			}
			key := p.Name + ":" + val
			if _, exists := resultsMap[key]; !exists {
				resultsMap[key] = ExtractionResult{Type: p.Name, Value: val, IsStrong: true}
			}
		}
	}

	// Names: weak signal
	for _, m := range reName.FindAllString(text, -1) {
		cleaned := strings.TrimSpace(m)
		if reHasDigit.MatchString(cleaned) {
			continue
		}
		parts := strings.Fields(cleaned)
		if len(parts) < 2 || len(parts) > 4 {
			continue
		}
		lower := strings.ToLower(cleaned)
		bad := false
		for _, kw := range nameForbiddenKeywords {
			if strings.Contains(lower, kw) {
				bad = true
				break
			}
		}
		if bad {
			continue
		}
		val := strings.ToUpper(cleaned)
		key := "Name:" + val
		if _, exists := resultsMap[key]; !exists {
			resultsMap[key] = ExtractionResult{Type: "Name", Value: cleaned, IsStrong: false}
		}
	}

	// Addresses: weak signal
	for _, chunk := range reChunks.FindAllString(text, -1) {
		lower := strings.ToLower(chunk)
		hasKw := false
		for _, kw := range addressKeywords {
			if strings.Contains(lower, kw) {
				hasKw = true
				break
			}
		}
		if !hasKw {
			continue
		}
		hasNum := reHasDigit.MatchString(chunk)
		if !(hasNum || len(chunk) > 20) {
			continue
		}
		trimmed := strings.TrimSpace(chunk)
		key := "Address:" + strings.ToUpper(trimmed)
		if _, exists := resultsMap[key]; !exists {
			resultsMap[key] = ExtractionResult{Type: "Address", Value: trimmed, IsStrong: false}
		}
	}

	out := make([]ExtractionResult, 0, len(resultsMap))
	for _, v := range resultsMap {
		out = append(out, v)
	}
	return out
}

// flattenObjectGo mirrors flattenObject() — recursively flattens nested maps
// with underscore-joined keys, and parses embedded JSON strings.
func flattenObjectGo(obj interface{}, prefix string) map[string]interface{} {
	out := make(map[string]interface{})
	m, ok := obj.(map[string]interface{})
	if !ok {
		if prefix != "" {
			out[prefix] = obj
		}
		return out
	}
	for k, v := range m {
		newKey := k
		if prefix != "" {
			newKey = prefix + "_" + k
		}
		switch val := v.(type) {
		case map[string]interface{}:
			for kk, vv := range flattenObjectGo(val, newKey) {
				out[kk] = vv
			}
		case string:
			t := strings.TrimSpace(val)
			if strings.HasPrefix(t, "{") && strings.HasSuffix(t, "}") {
				var parsed map[string]interface{}
				if err := json.Unmarshal([]byte(t), &parsed); err == nil {
					for kk, vv := range flattenObjectGo(parsed, newKey) {
						out[kk] = vv
					}
					continue
				}
			}
			out[newKey] = val
		default:
			out[newKey] = v
		}
	}
	return out
}

// isBadSpainCensoFile mirrors isBadSpainCensoFile() — rejects file names that
// match the C11/C18/C21 ".TXT" leaked census format.
func isBadSpainCensoFile(fileName string) bool {
	if fileName == "" {
		return false
	}
	name := strings.ToUpper(strings.TrimSpace(fileName))
	startsBad := strings.HasPrefix(name, "C11") || strings.HasPrefix(name, "C18") || strings.HasPrefix(name, "C21")
	return startsBad && strings.HasSuffix(name, ".TXT")
}

var spainFilterFields = []string{"_source_file", "source_file", "file", "_file", "filename", "_source_content_file"}

// shouldFilterSpainHit mirrors shouldFilterSpainHit() — drops hits that look
// like they came from the leaked Spain census files.
func shouldFilterSpainHit(hit map[string]interface{}) bool {
	if hit == nil {
		return false
	}
	for _, f := range spainFilterFields {
		if v, ok := hit[f].(string); ok && isBadSpainCensoFile(v) {
			return true
		}
	}
	if src, ok := hit["_source"].(map[string]interface{}); ok {
		for _, f := range spainFilterFields {
			if v, ok := src[f].(string); ok && isBadSpainCensoFile(v) {
				return true
			}
		}
	}
	for _, v := range hit {
		if s, ok := v.(string); ok && isBadSpainCensoFile(s) {
			return true
		}
	}
	return false
}

// extractPadronNamesFromHTML mirrors the parsePadronHtml + cohabitant
// discovery used by the original runAssistant. Pulls names from the padron
// HTML report (text field) excluding the query target.
var rePadronPerson = regexp.MustCompile(`(?s)<div class="ai-person">.*?•\s*<b>(.*?)</b>`)

func extractPadronNames(html, target string) []string {
	names := make([]string, 0)
	seen := make(map[string]bool)
	targetUpper := strings.ToUpper(strings.TrimSpace(target))

	for _, m := range rePadronPerson.FindAllStringSubmatch(html, -1) {
		name := strings.TrimSpace(m[1])
		upper := strings.ToUpper(name)
		if upper == targetUpper || seen[upper] {
			continue
		}
		seen[upper] = true
		names = append(names, name)
	}
	return names
}
