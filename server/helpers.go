package main

import (
	"fmt"
	"math"
	"regexp"
	"strings"
	"time"
)

// Age calculation helper
func calculateAgeGo(fecha string) (int, bool) {
	fecha = strings.TrimSpace(fecha)
	if fecha == "" || fecha == "Sin fecha" || fecha == "<nil>" || fecha == "None" {
		return 0, false
	}

	var t time.Time
	var err error
	formats := []string{"02/01/2006", "2006-01-02", "02-01-2006", "2006/01/02"}
	for _, f := range formats {
		t, err = time.Parse(f, fecha)
		if err == nil {
			break
		}
	}

	if err != nil {
		return 0, false
	}

	now := time.Now()
	age := now.Year() - t.Year()
	if now.YearDay() < t.YearDay() {
		age--
	}
	return age, true
}

func classifyDemographicsGo(ages []int) string {
	if len(ages) == 0 {
		return "Demografía no identificada"
	}
	joven, adulto, senior := false, false, false
	for _, age := range ages {
		if age < 30 {
			joven = true
		}
		if age >= 30 && age < 60 {
			adulto = true
		}
		if age >= 60 {
			senior = true
		}
	}
	if joven && !adulto && !senior {
		return "Hogar joven"
	}
	if adulto && !joven && !senior {
		return "Hogar adulto"
	}
	if senior && !joven && !adulto {
		return "Hogar sénior"
	}
	return "Hogar mixto"
}

func cleanNameGo(s string) string {
	s = strings.ReplaceAll(s, "–", " ")
	s = strings.ReplaceAll(s, "—", " ")
	s = strings.ReplaceAll(s, "-", " ")
	s = strings.ReplaceAll(s, "á", "a")
	s = strings.ReplaceAll(s, "é", "e")
	s = strings.ReplaceAll(s, "í", "i")
	s = strings.ReplaceAll(s, "ó", "o")
	s = strings.ReplaceAll(s, "ú", "u")
	s = strings.ReplaceAll(s, "ñ", "n")
	extras := "«»“”´`·•ºª!\"#$%&'()*+,./:;<=>?@[\\]^_`{|}~"
	for _, c := range extras {
		s = strings.ReplaceAll(s, string(c), " ")
	}
	s = strings.ToLower(s)
	reg := regexp.MustCompile(`\s+`)
	s = reg.ReplaceAllString(s, " ")
	return strings.TrimSpace(s)
}

func splitSurnamesGo(fullname string) []string {
	cleaned := cleanNameGo(fullname)
	tokens := strings.Fields(cleaned)
	// Return all tokens as potential surnames/names for matching
	return tokens
}

func inferRelationshipsGo(target string, people []Person) []Person {
	targetNorm := cleanNameGo(target)
	var targetPerson Person
	targetTokens := strings.Fields(targetNorm)

	for i := range people {
		pName := cleanNameGo(fmt.Sprintf("%v", people[i]["Nombre y apellidos"]))
		pTokens := strings.Fields(pName)

		// Map for fast lookup
		pTokenMap := make(map[string]bool)
		for _, t := range pTokens {
			pTokenMap[t] = true
		}

		// Check if all target tokens are in person tokens
		match := true
		if len(targetTokens) == 0 {
			match = false
		}
		for _, t := range targetTokens {
			if !pTokenMap[t] {
				match = false
				break
			}
		}

		if match {
			targetPerson = people[i]
			people[i]["parentesco"] = "OBJETIVO"
			break
		}
	}

	// Calculate ages first
	for i := range people {
		if age, ok := calculateAgeGo(fmt.Sprintf("%v", people[i]["fecha_nacimiento"])); ok {
			people[i]["age"] = age
		}
	}

	if targetPerson == nil {
		for i := range people {
			people[i]["parentesco"] = "Relación no identificada"
		}
		return people
	}

	targetAge, hasTargetAge := targetPerson["age"].(int)
	targetSurnames := make(map[string]bool)
	for _, s := range splitSurnamesGo(fmt.Sprintf("%v", targetPerson["Nombre y apellidos"])) {
		targetSurnames[s] = true
	}

	for i := range people {
		p := people[i]
		pName := fmt.Sprintf("%v", p["Nombre y apellidos"])
		if cleanNameGo(pName) == cleanNameGo(fmt.Sprintf("%v", targetPerson["Nombre y apellidos"])) {
			p["parentesco"] = "Persona objetivo"
			continue
		}

		age, hasAge := p["age"].(int)
		pSurnames := splitSurnamesGo(pName)
		shareSurname := false
		for _, s := range pSurnames {
			if targetSurnames[s] {
				shareSurname = true
				break
			}
		}

		if !hasAge || !hasTargetAge {
			if shareSurname {
				p["parentesco"] = "Relación probable (según apellidos)"
			} else {
				p["parentesco"] = "Relación no identificada"
			}
			continue
		}

		diff := age - targetAge
		if diff >= 45 {
			p["parentesco"] = "Abuelo/a"
		} else if diff >= 17 && diff < 45 {
			if shareSurname {
				p["parentesco"] = "Padre/Madre"
			} else {
				p["parentesco"] = "Adulto mayor (posible padre/madre sin apellidos coincidentes)"
			}
		} else if diff <= -17 && diff > -45 && shareSurname {
			p["parentesco"] = "Hijo/a"
		} else if diff <= -45 {
			p["parentesco"] = "Nieto/a"
		} else if shareSurname && math.Abs(float64(diff)) <= 10 {
			p["parentesco"] = "Hermano/a"
		} else if age >= 18 && targetAge >= 18 && math.Abs(float64(diff)) <= 15 {
			p["parentesco"] = "Pareja / Cónyuge"
		} else {
			if shareSurname {
				p["parentesco"] = "Relación probable (según apellidos)"
			} else {
				p["parentesco"] = "Relación no identificada"
			}
		}
	}
	return people
}

func filterSQL(data interface{}) interface{} {
	switch v := data.(type) {
	case string:
		if strings.Contains(strings.ToUpper(v), "INSERT INTO") {
			return ""
		}
		return v
	case map[string]interface{}:
		newMap := make(map[string]interface{})
		for key, value := range v {
			newVal := filterSQL(value)
			if newVal != nil && newVal != "" {
				newMap[key] = newVal
			}
		}
		if len(newMap) == 0 {
			return nil
		}
		return newMap
	case []interface{}:
		newList := make([]interface{}, 0)
		for _, item := range v {
			newVal := filterSQL(item)
			if newVal != nil && newVal != "" {
				newList = append(newList, newVal)
			}
		}
		if len(newList) == 0 {
			return nil
		}
		return newList
	}
	return data
}
