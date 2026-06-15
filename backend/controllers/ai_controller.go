package controllers

import (
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	"urbangrow-backend/config"
	"urbangrow-backend/middleware"
	"urbangrow-backend/models"

	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"
)

// GetAiChat - GET /api/ai-assistant (returns chat history)
func GetAiChat(c *gin.Context) {
	userID, _ := c.Get("user_id")
	uid := userID.(uint)

	var history []models.Chat
	config.DB.Where("user_id = ?", uid).Order("created_at DESC").Limit(10).Find(&history)

	// Reverse for chronological order
	for i, j := 0, len(history)-1; i < j; i, j = i+1, j-1 {
		history[i], history[j] = history[j], history[i]
	}

	c.JSON(http.StatusOK, gin.H{"data": history})
}

// AiChat - POST /api/ai-ask
func AiChat(c *gin.Context) {
	userID, _ := c.Get("user_id")
	uid := userID.(uint)

	message := c.PostForm("message")
	lat := c.PostForm("lat")
	lon := c.PostForm("lon")

	// Get weather context
	weatherContext := getWeatherContext(lat, lon)

	// Get schedule context
	scheduleContext := getScheduleContext(uid)

	systemPrompt := fmt.Sprintf(`Anda adalah Pakar Pertanian UrbanGrow yang cerdas.
DATA CUACA REAL-TIME: %s
DATA PENJADWALAN USER: %s

Tugas Anda:
1. Membantu petani dengan masalah tanaman, hama, dan nutrisi.
2. Memberikan saran pencegahan berdasarkan DATA CUACA di atas (Predictive Analytics). 
   - Jika user bertanya tentang cuaca, hubungkan dengan dampaknya ke tanaman.
   - Gunakan data lokasi yang tertera di konteks cuaca untuk memberikan jawaban yang spesifik.
3. Jika ada foto daun, lakukan analisa penyakit secara visual.

Jawablah dengan gaya bahasa yang ramah dan solutif.`, weatherContext, scheduleContext)

	groqApiKey := os.Getenv("GROQ_API_KEY")
	var imagePath *string
	var aiReply string

	userPrompt := "Pertanyaan user: " + message
	if message == "" {
		userPrompt = "Pertanyaan user: (User mengirim gambar untuk dianalisa)"
	}

	// Check for image upload
	file, err := c.FormFile("image")
	if err == nil {
		// === USE GEMINI VISION FOR IMAGE ===
		geminiApiKey := os.Getenv("GEMINI_API_KEY")
		if geminiApiKey == "" {
			c.JSON(http.StatusInternalServerError, gin.H{"response": "GEMINI_API_KEY tidak dikonfigurasi"})
			return
		}

		filename := fmt.Sprintf("%d_%s", time.Now().Unix(), file.Filename)
		uploadPath := "uploads/chats/" + filename
		
		// Ensure directory exists
		os.MkdirAll("uploads/chats", 0755)
		
		if err := c.SaveUploadedFile(file, uploadPath); err == nil {
			path := "chats/" + filename
			imagePath = &path
		}

		// Read and encode image
		openedFile, err := file.Open()
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"response": "Error membaca gambar: " + err.Error()})
			return
		}
		defer openedFile.Close()

		imageBytes, _ := io.ReadAll(openedFile)
		imageData := base64.StdEncoding.EncodeToString(imageBytes)

		// Detect mime type
		mimeType := "image/jpeg"
		if strings.HasSuffix(strings.ToLower(file.Filename), ".png") {
			mimeType = "image/png"
		} else if strings.HasSuffix(strings.ToLower(file.Filename), ".gif") {
			mimeType = "image/gif"
		} else if strings.HasSuffix(strings.ToLower(file.Filename), ".webp") {
			mimeType = "image/webp"
		}

		// Call Gemini API
		fullPrompt := systemPrompt + "\n\n" + userPrompt
		payload := map[string]interface{}{
			"contents": []map[string]interface{}{
				{
					"parts": []interface{}{
						map[string]string{"text": fullPrompt},
						map[string]interface{}{
							"inlineData": map[string]string{
								"mimeType": mimeType,
								"data":      imageData,
							},
						},
					},
				},
			},
			"generationConfig": map[string]interface{}{
				"temperature": 0.4,
				"maxOutputTokens": 2048,
			},
		}

		jsonPayload, _ := json.Marshal(payload)
		url := fmt.Sprintf("https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=%s", geminiApiKey)
		req, _ := http.NewRequest("POST", url, strings.NewReader(string(jsonPayload)))
		req.Header.Set("Content-Type", "application/json")

		client := &http.Client{Timeout: 60 * time.Second}
		resp, err := client.Do(req)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"response": "Error koneksi ke Gemini API: " + err.Error()})
			return
		}
		defer resp.Body.Close()

		body, _ := io.ReadAll(resp.Body)

		var result map[string]interface{}
		json.Unmarshal(body, &result)

		if candidates, ok := result["candidates"].([]interface{}); ok && len(candidates) > 0 {
			if candidate, ok := candidates[0].(map[string]interface{}); ok {
				if content, ok := candidate["content"].(map[string]interface{}); ok {
					if parts, ok := content["parts"].([]interface{}); ok && len(parts) > 0 {
						if part, ok := parts[0].(map[string]interface{}); ok {
							if text, ok := part["text"].(string); ok {
								aiReply = text
							}
						}
					}
				}
			}
		}

		if aiReply == "" {
			aiReply = "Maaf, respons kosong dari Gemini Vision."
		}

	} else {
		// === USE GROQ FOR TEXT ONLY ===
		if groqApiKey == "" {
			c.JSON(http.StatusInternalServerError, gin.H{"response": "GROQ_API_KEY tidak dikonfigurasi"})
			return
		}

		payload := map[string]interface{}{
			"model": "llama-3.3-70b-versatile",
			"messages": []map[string]string{
				{"role": "system", "content": systemPrompt},
				{"role": "user", "content": userPrompt},
			},
			"temperature": 0.6,
		}

		jsonPayload, _ := json.Marshal(payload)
		req, _ := http.NewRequest("POST", "https://api.groq.com/openai/v1/chat/completions", strings.NewReader(string(jsonPayload)))
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("Authorization", "Bearer "+groqApiKey)

		client := &http.Client{Timeout: 60 * time.Second}
		resp, err := client.Do(req)
		if err != nil {
			errMsg := err.Error()
			if strings.Contains(strings.ToLower(errMsg), "timeout") {
				errMsg = "Koneksi ke Groq API terputus (Timeout). Silakan ulangi."
			}
			c.JSON(http.StatusInternalServerError, gin.H{"response": "Error Sistem: " + errMsg})
			return
		}
		defer resp.Body.Close()

		body, _ := io.ReadAll(resp.Body)

		var result map[string]interface{}
		json.Unmarshal(body, &result)

		if choices, ok := result["choices"].([]interface{}); ok && len(choices) > 0 {
			if choice, ok := choices[0].(map[string]interface{}); ok {
				if msg, ok := choice["message"].(map[string]interface{}); ok {
					if content, ok := msg["content"].(string); ok {
						aiReply = content
					}
				}
			}
		}

		if aiReply == "" {
			aiReply = "Maaf, respons kosong."
		}
	}

	// Save to database
	chat := models.Chat{
		UserID:   uid,
		Message:  &message,
		Image:    imagePath,
		Response: aiReply,
	}
	config.DB.Create(&chat)

	c.JSON(http.StatusOK, gin.H{"response": aiReply})
}

// AiClear - POST /api/ai-clear
func AiClear(c *gin.Context) {
	userID, _ := c.Get("user_id")
	uid := userID.(uint)

	config.DB.Where("user_id = ?", uid).Delete(&models.Chat{})

	c.JSON(http.StatusOK, gin.H{"message": "Riwayat chat berhasil dihapus."})
}

func getWeatherContext(lat, lon string) string {
	weatherKey := os.Getenv("OPENWEATHER_API_KEY")
	if weatherKey == "" {
		return "Data cuaca tidak tersedia."
	}

	city := "Malang"
	var weatherURL string
	if lat != "" && lon != "" {
		weatherURL = fmt.Sprintf("https://api.openweathermap.org/data/2.5/forecast?lat=%s&lon=%s&appid=%s&units=metric&lang=id", lat, lon, weatherKey)
	} else {
		weatherURL = fmt.Sprintf("https://api.openweathermap.org/data/2.5/forecast?q=%s&appid=%s&units=metric&lang=id", city, weatherKey)
	}

	client := &http.Client{Timeout: 5 * time.Second}
	resp, err := client.Get(weatherURL)
	if err != nil {
		return "Data cuaca tidak tersedia."
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	var data map[string]interface{}
	if json.Unmarshal(body, &data) != nil {
		return "Data cuaca tidak tersedia."
	}

	detectedLocation := city
	if cityData, ok := data["city"].(map[string]interface{}); ok {
		if name, ok := cityData["name"].(string); ok {
			detectedLocation = name
		}
	}

	listData, ok := data["list"].([]interface{})
	if !ok || len(listData) == 0 {
		return "Data cuaca tidak tersedia."
	}

	current, ok := listData[0].(map[string]interface{})
	if !ok {
		return "Data cuaca tidak tersedia."
	}

	temp := 0.0
	desc := ""
	if mainData, ok := current["main"].(map[string]interface{}); ok {
		if t, ok := mainData["temp"].(float64); ok {
			temp = t
		}
	}
	if weatherArr, ok := current["weather"].([]interface{}); ok && len(weatherArr) > 0 {
		if w, ok := weatherArr[0].(map[string]interface{}); ok {
			if d, ok := w["description"].(string); ok {
				desc = d
			}
		}
	}

	forecastRain := false
	for i := 0; i < 3 && i < len(listData); i++ {
		if item, ok := listData[i].(map[string]interface{}); ok {
			if weatherArr, ok := item["weather"].([]interface{}); ok && len(weatherArr) > 0 {
				if w, ok := weatherArr[0].(map[string]interface{}); ok {
					if main, ok := w["main"].(string); ok {
						if strings.Contains(strings.ToLower(main), "rain") {
							forecastRain = true
							break
						}
					}
				}
			}
		}
	}

	rainNotice := "Tidak ada prediksi hujan dalam waktu dekat."
	if forecastRain {
		rainNotice = "WARNING: Ada prediksi hujan dalam beberapa jam kedepan."
	}

	return fmt.Sprintf("Cuaca di %s: %.1f°C, %s. %s", detectedLocation, temp, desc, rainNotice)
}

func getScheduleContext(userID uint) string {
	var schedules []models.Penjadwalan
	config.DB.Preload("Details").Where("user_id = ?", userID).Find(&schedules)

	if len(schedules) == 0 {
		return "User belum memiliki jadwal tanam aktif."
	}

	context := "Jadwal Tanam User Saat Ini:\n"
	for _, j := range schedules {
		if j.TanggalTanam != nil && *j.TanggalTanam != "" {
			dtTanam, err := time.Parse("2006-01-02", *j.TanggalTanam)
			if err != nil {
				dtTanam, _ = time.Parse("2006-01-02 15:04:05", *j.TanggalTanam)
			}
			today := time.Now().Truncate(24 * time.Hour)
			dtTanam = dtTanam.Truncate(24 * time.Hour)
			hariKe := int(today.Sub(dtTanam).Hours()/24) + 1

			var details []models.PenjadwalanDetail
			config.DB.Where("penjadwalan_id = ? AND hari_ke = ?", j.ID, hariKe).Find(&details)

			var kegiatan []string
			for _, d := range details {
				kegiatan = append(kegiatan, d.Kegiatan)
			}

			currentTasks := "Tidak ada tugas khusus"
			if len(kegiatan) > 0 {
				currentTasks = strings.Join(kegiatan, ", ")
			}
			context += fmt.Sprintf("- Tanaman: %s, Hari ke: %d. Tugas hari ini: %s.\n", j.NamaTanaman, hariKe, currentTasks)
		}
	}

	return context
}

// --- Community Chat Controllers ---

// GetChatMessages - GET /api/chat/messages
func GetChatMessages(c *gin.Context) {
	userID, _ := c.Get("user_id")
	uid := userID.(uint)

	var user models.User
	config.DB.Where("id_user = ?", uid).First(&user)

	query := config.DB.Preload("User").Order("created_at DESC").Limit(50)
	if user.ChatClearedAt != nil {
		query = query.Where("created_at > ?", *user.ChatClearedAt)
	}

	var messages []models.ChatMessage
	query.Find(&messages)

	// Reverse for chronological order
	for i, j := 0, len(messages)-1; i < j; i, j = i+1, j-1 {
		messages[i], messages[j] = messages[j], messages[i]
	}

	type MessageResponse struct {
		ID        uint   `json:"id"`
		UserID    uint   `json:"user_id"`
		Message   string `json:"message"`
		CreatedAt string `json:"created_at"`
		User      struct {
			IDUser   uint    `json:"id_user"`
			Nama     string  `json:"nama"`
			LogoPath *string `json:"logo_path"`
		} `json:"user"`
	}

	var response []MessageResponse
	for _, m := range messages {
		mr := MessageResponse{
			ID:        m.ID,
			UserID:    m.UserID,
			Message:   m.Message,
			CreatedAt: m.CreatedAt.Format(time.RFC3339),
		}
		mr.User.IDUser = m.User.IDUser
		mr.User.Nama = m.User.Nama
		mr.User.LogoPath = m.User.LogoPath
		response = append(response, mr)
	}

	c.JSON(http.StatusOK, response)
}

// SendChatMessage - POST /api/chat/send
func SendChatMessage(c *gin.Context) {
	userID, _ := c.Get("user_id")
	uid := userID.(uint)

	var input struct {
		Message string `json:"message" binding:"required,max=1000"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	chatMessage := models.ChatMessage{
		UserID:  uid,
		Message: input.Message,
	}
	config.DB.Create(&chatMessage)

	// Load user for response
	config.DB.Preload("User").First(&chatMessage, chatMessage.ID)

	// Broadcast via WebSocket (will be handled in websocket.go)
	BroadcastChatMessage(chatMessage)

	c.JSON(http.StatusOK, gin.H{"status": "success", "message": chatMessage})
}

// ClearChat - DELETE /api/chat/clear
func ClearChat(c *gin.Context) {
	userID, _ := c.Get("user_id")
	uid := userID.(uint)

	now := time.Now()
	config.DB.Model(&models.User{}).Where("id_user = ?", uid).Update("chat_cleared_at", now)

	c.JSON(http.StatusOK, gin.H{"status": "success"})
}

// --- Admin Controllers ---

// AdminLogin - POST /api/admin/login
func AdminLogin(c *gin.Context) {
	var input struct {
		Email    string `json:"email" binding:"required,email"`
		Password string `json:"password" binding:"required"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var user models.User
	if err := config.DB.Where("email = ? AND role = ?", input.Email, "admin").First(&user).Error; err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Email atau password salah, atau akun ini bukan admin."})
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(input.Password)); err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Email atau password salah, atau akun ini bukan admin."})
		return
	}

	token, err := middleware.GenerateToken(user.IDUser, user.Email, user.Role)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal generate token"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Login admin berhasil!",
		"token":   token,
		"user": gin.H{
			"id_user": user.IDUser,
			"nama":    user.Nama,
			"email":   user.Email,
			"role":    user.Role,
		},
	})
}

// AdminDashboard - GET /api/admin/dashboard
func AdminDashboard(c *gin.Context) {
	var settings []models.Setting
	config.DB.Find(&settings)

	settingsMap := make(map[string]string)
	for _, s := range settings {
		settingsMap[s.Key] = s.Value
	}

	// Get stats
	var totalUsers int64
	config.DB.Model(&models.User{}).Count(&totalUsers)
	var totalSpaces int64
	config.DB.Model(&models.Space{}).Count(&totalSpaces)
	var totalKatalog int64
	config.DB.Model(&models.KatalogTanaman{}).Count(&totalKatalog)
	var totalJadwal int64
	config.DB.Model(&models.Penjadwalan{}).Count(&totalJadwal)

	c.JSON(http.StatusOK, gin.H{
		"settings": settingsMap,
		"stats": gin.H{
			"total_users":   totalUsers,
			"total_spaces":  totalSpaces,
			"total_katalog": totalKatalog,
			"total_jadwal":  totalJadwal,
		},
	})
}

// UpdateSettings - POST /api/admin/settings
func UpdateSettings(c *gin.Context) {
	var input map[string]string
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	for key, value := range input {
		config.DB.Where("key = ?", key).Assign(models.Setting{Key: key, Value: value}).FirstOrCreate(&models.Setting{})
		config.DB.Model(&models.Setting{}).Where("`key` = ?", key).Update("value", value)
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Pengaturan teks berhasil disimpan! ✅"})
}

// BroadcastChatMessage sends a chat message to all WebSocket clients
// This is a placeholder - actual implementation in websocket.go
var BroadcastChatMessage func(msg models.ChatMessage)

func init() {
	// Default no-op
	BroadcastChatMessage = func(msg models.ChatMessage) {
		log.Println("WebSocket broadcast: message from user", msg.UserID)
	}
}
