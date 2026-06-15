package main

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"

	"urbangrow-backend/config"
	"urbangrow-backend/models"

	"github.com/joho/godotenv"
)

func main() {
	err := godotenv.Load()
	if err != nil {
		log.Println("No .env file found")
	}
	config.ConnectDatabase()

	groqKey := os.Getenv("GROQ_API_KEY")
	if groqKey == "" {
		log.Fatal("GROQ_API_KEY is not set")
	}

	var tanamanList []models.KatalogTanaman
	config.DB.Find(&tanamanList)

	for _, t := range tanamanList {
		nama := t.NamaTanaman
		fmt.Println("Calling Groq API for:", nama)

		prompt := `Buatkan siklus hidup (lifecycle) yang akurat dan realistis untuk tanaman ` + nama + `. 
Format WAJIB JSON persis seperti ini:
{
    "plant": "` + nama + `",
    "total_days": [total durasi panen dalam hari],
    "stages": [
        {
            "name": "[Nama Fase]",
            "duration_days": [durasi fase ini dalam hari],
            "description": "[Deskripsi]"
        }
    ]
}`
		
		aiResponse := callGroqAPI(groqKey, prompt, "llama-3.3-70b-versatile", 0.5)
		if aiResponse == "" {
			fmt.Println("❌ Gagal mendapatkan data untuk:", nama)
			continue
		}

		startIdx := strings.Index(aiResponse, "{")
		endIdx := strings.LastIndex(aiResponse, "}")
		if startIdx != -1 && endIdx != -1 && endIdx > startIdx {
			aiResponse = aiResponse[startIdx : endIdx+1]
		}

		var result map[string]interface{}
		if err := json.Unmarshal([]byte(aiResponse), &result); err != nil {
			fmt.Println("❌ JSON parse error untuk:", nama, "Error:", err)
			continue
		}

		var durasiInt int
		if totalDays, ok := result["total_days"].(float64); ok {
			durasiInt = int(totalDays)
		} else if totalDaysStr, ok := result["total_days"].(string); ok {
			durasiInt, _ = strconv.Atoi(totalDaysStr)
		}

		if durasiInt > 0 {
			// Update KatalogTanaman
			config.DB.Model(&models.KatalogTanaman{}).Where("nama_tanaman = ?", nama).Update("estimasi_hari_panen", durasiInt)
			
			// Update Penjadwalan yang ada agar sama (Dashboard/Alur Kerja)
			config.DB.Model(&models.Penjadwalan{}).Where("nama_tanaman = ?", nama).Update("durasi_panen", durasiInt)
			
			fmt.Printf("✅ %s: %d hari\n", nama, durasiInt)
		}
	}
	fmt.Println("Sinkronisasi selesai!")
}

func callGroqAPI(apiKey, prompt, model string, temperature float64) string {
	url := "https://api.groq.com/openai/v1/chat/completions"

	payload := map[string]interface{}{
		"model": model,
		"messages": []map[string]string{
			{"role": "user", "content": prompt},
		},
		"temperature": temperature,
	}

	jsonPayload, _ := json.Marshal(payload)

	req, _ := http.NewRequest("POST", url, strings.NewReader(string(jsonPayload)))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+apiKey)

	client := &http.Client{Timeout: 120 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		log.Println("Groq API call failed:", err)
		return ""
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)

	var result map[string]interface{}
	if err := json.Unmarshal(body, &result); err != nil {
		return ""
	}

	if choices, ok := result["choices"].([]interface{}); ok && len(choices) > 0 {
		if choice, ok := choices[0].(map[string]interface{}); ok {
			if message, ok := choice["message"].(map[string]interface{}); ok {
				if content, ok := message["content"].(string); ok {
					return content
				}
			}
		}
	}

	return ""
}
