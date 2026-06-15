package controllers

import (
	"encoding/json"
	"fmt"
	"math"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"

	"urbangrow-backend/config"
	"urbangrow-backend/models"

	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"
)

// GetSpaces - GET /api/lahan
func GetSpaces(c *gin.Context) {
	userID, _ := c.Get("user_id")
	uid := userID.(uint)

	var spaces []models.Space
	config.DB.Where("id_user = ?", uid).Find(&spaces)

	c.JSON(http.StatusOK, gin.H{"data": spaces})
}

// CreateSpace - POST /api/lahan
func CreateSpace(c *gin.Context) {
	userID, _ := c.Get("user_id")
	uid := userID.(uint)

	var input struct {
		NamaLahan   string  `json:"nama_lahan" binding:"required"`
		LokasiLahan string  `json:"lokasi_lahan" binding:"required"`
		LuasLahan   float64 `json:"luas_lahan" binding:"required"`
		SuhuLahan   float64 `json:"suhu_lahan" binding:"required"`
		CahayaLahan float64 `json:"cahaya_lahan" binding:"required"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	lokasi := input.LokasiLahan
	space := models.Space{
		NamaLahan:   input.NamaLahan,
		LokasiLahan: &lokasi,
		LuasLahan:   input.LuasLahan,
		SuhuLahan:   input.SuhuLahan,
		CahayaLahan: input.CahayaLahan,
		IDUser:      uid,
	}

	if err := config.DB.Create(&space).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal menyimpan lahan"})
		return
	}

	// Get recommendations for this new space
	var semuaKatalog []models.KatalogTanaman
	config.DB.Find(&semuaKatalog)

	rekomendasi := getRekomendasiAI(space, semuaKatalog)

	c.JSON(http.StatusCreated, gin.H{
		"success":     true,
		"message":     "Lahan berhasil dianalisis!",
		"data":        space,
		"rekomendasi": rekomendasi,
	})
}

// GetSpaceRekomendasi - GET /api/lahan/rekomendasi/:id
func GetSpaceRekomendasi(c *gin.Context) {
	id := c.Param("id")

	var lahan models.Space
	if err := config.DB.Where("id_lahan = ?", id).First(&lahan).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Lahan tidak ditemukan"})
		return
	}

	var semuaKatalog []models.KatalogTanaman
	config.DB.Find(&semuaKatalog)

	rekomendasi := getRekomendasiAI(lahan, semuaKatalog)

	c.JSON(http.StatusOK, gin.H{
		"lahan":       lahan,
		"rekomendasi": rekomendasi,
	})
}

func getRekomendasiMath(lahan models.Space, semuaKatalog []models.KatalogTanaman) []RekomendasiItem {
	var matches []RekomendasiItem
	for _, k := range semuaKatalog {
		if lahan.SuhuLahan >= k.SuhuMin && lahan.SuhuLahan <= k.SuhuMax {
			ideal := (k.SuhuMin + k.SuhuMax) / 2
			jarak := math.Abs(lahan.SuhuLahan - ideal)
			radius := (k.SuhuMax - k.SuhuMin) / 2
			score := 100.0
			if radius > 0 {
				score = (1 - (jarak / radius)) * 100
			}
			skor := int(math.Round(math.Max(50, score)))
			matches = append(matches, RekomendasiItem{
				IDTanaman:     k.IDTanaman,
				NamaTanaman:   k.NamaTanaman,
				SuhuMin:       k.SuhuMin,
				SuhuMax:       k.SuhuMax,
				CahayaJam:     k.CahayaJam,
				FotoTanaman:   k.FotoTanaman,
				SkorKecocokan: skor,
				VideoID:       k.VideoID,
			})
		}
	}

	// Sort by score desc
	for i := 0; i < len(matches); i++ {
		for j := i + 1; j < len(matches); j++ {
			if matches[j].SkorKecocokan > matches[i].SkorKecocokan {
				matches[i], matches[j] = matches[j], matches[i]
			}
		}
	}

	return matches
}

func getRekomendasiAI(lahan models.Space, semuaKatalog []models.KatalogTanaman) []RekomendasiItem {
	groqKey := os.Getenv("GROQ_API_KEY")
	if groqKey == "" {
		return getRekomendasiMath(lahan, semuaKatalog)
	}

	var catalogStr string
	for _, k := range semuaKatalog {
		catalogStr += fmt.Sprintf("- ID: %d, Nama: %s, Suhu Ideal: %.1f-%.1f C, Cahaya: %.1f jam\n", k.IDTanaman, k.NamaTanaman, k.SuhuMin, k.SuhuMax, k.CahayaJam)
	}

	prompt := fmt.Sprintf(`Berikan 3 rekomendasi tanaman terbaik untuk lahan dengan Suhu Rata-rata %.1f°C dan Sinar Matahari %.1f jam.
Pilih HANYA dari daftar tanaman berikut:
%s
Analisis kecocokannya berdasarkan parameter lahan. 
Hasilkan output HANYA dalam format JSON array persis seperti ini (tanpa markdown atau teks tambahan apa pun):
[
  {
    "id_tanaman": [integer ID],
    "skor_kecocokan": [integer 0-100],
    "alasan_ai": "[Alasan singkat mengapa tanaman ini cocok]"
  }
]`, lahan.SuhuLahan, lahan.CahayaLahan, catalogStr)

	aiResponse := callGroqAPI(groqKey, prompt, "llama-3.3-70b-versatile", 0.5)
	
	var aiResults []struct {
		IDTanaman     uint   `json:"id_tanaman"`
		SkorKecocokan int    `json:"skor_kecocokan"`
		AlasanAI      string `json:"alasan_ai"`
	}

	aiResponse = strings.TrimPrefix(aiResponse, "```json")
	aiResponse = strings.TrimPrefix(aiResponse, "```")
	aiResponse = strings.TrimSuffix(aiResponse, "```")
	aiResponse = strings.TrimSpace(aiResponse)

	if err := json.Unmarshal([]byte(aiResponse), &aiResults); err != nil {
		return getRekomendasiMath(lahan, semuaKatalog)
	}

	var finalMatches []RekomendasiItem
	katalogMap := make(map[uint]models.KatalogTanaman)
	for _, k := range semuaKatalog {
		katalogMap[k.IDTanaman] = k
	}

	for _, aiRes := range aiResults {
		if k, ok := katalogMap[aiRes.IDTanaman]; ok {
			finalMatches = append(finalMatches, RekomendasiItem{
				IDTanaman:     k.IDTanaman,
				NamaTanaman:   k.NamaTanaman,
				SuhuMin:       k.SuhuMin,
				SuhuMax:       k.SuhuMax,
				CahayaJam:     k.CahayaJam,
				FotoTanaman:   k.FotoTanaman,
				SkorKecocokan: aiRes.SkorKecocokan,
				AlasanAI:      aiRes.AlasanAI,
				VideoID:       k.VideoID,
			})
		}
	}

	return finalMatches
}

// EditSpace - GET /api/lahan/:id
func GetSpace(c *gin.Context) {
	userID, _ := c.Get("user_id")
	uid := userID.(uint)
	id := c.Param("id")

	var space models.Space
	if err := config.DB.Where("id_lahan = ? AND id_user = ?", id, uid).First(&space).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Lahan tidak ditemukan"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": space})
}

// UpdateSpace - PUT /api/lahan/:id
func UpdateSpace(c *gin.Context) {
	userID, _ := c.Get("user_id")
	uid := userID.(uint)
	id := c.Param("id")

	var input struct {
		NamaLahan          string  `json:"nama_lahan" binding:"required"`
		LokasiLahan        string  `json:"lokasi_lahan" binding:"required"`
		LuasLahan          float64 `json:"luas_lahan" binding:"required"`
		SuhuLahan          float64 `json:"suhu_lahan" binding:"required"`
		CahayaLahan        float64 `json:"cahaya_lahan" binding:"required"`
		PasswordKonfirmasi string  `json:"password_konfirmasi" binding:"required"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var space models.Space
	if err := config.DB.Where("id_lahan = ? AND id_user = ?", id, uid).First(&space).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Lahan tidak ditemukan"})
		return
	}

	// Verify password
	var user models.User
	config.DB.Where("id_user = ?", uid).First(&user)
	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(input.PasswordKonfirmasi)); err != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": "Konfirmasi Password Salah!"})
		return
	}

	lokasi := input.LokasiLahan
	oldNamaLahan := space.NamaLahan
	
	space.NamaLahan = input.NamaLahan
	space.LokasiLahan = &lokasi
	space.LuasLahan = input.LuasLahan
	space.SuhuLahan = input.SuhuLahan
	space.CahayaLahan = input.CahayaLahan

	config.DB.Save(&space)

	if oldNamaLahan != input.NamaLahan {
		config.DB.Model(&models.Penjadwalan{}).
			Where("user_id = ? AND nama_lahan = ?", uid, oldNamaLahan).
			Update("nama_lahan", input.NamaLahan)
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Data lahan berhasil diperbarui!", "data": space})
}

// DeleteSpace - DELETE /api/lahan/:id
func DeleteSpace(c *gin.Context) {
	userID, _ := c.Get("user_id")
	uid := userID.(uint)
	id := c.Param("id")

	var input struct {
		PasswordKonfirmasi string `json:"password_konfirmasi" binding:"required"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var space models.Space
	if err := config.DB.Where("id_lahan = ? AND id_user = ?", id, uid).First(&space).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Lahan tidak ditemukan"})
		return
	}

	var user models.User
	config.DB.Where("id_user = ?", uid).First(&user)
	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(input.PasswordKonfirmasi)); err != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": "Gagal menghapus! Password yang Anda masukkan salah."})
		return
	}

	config.DB.Delete(&space)

	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Lahan berhasil dihapus secara permanen."})
}

// --- Katalog Controllers ---

// GetKatalog - GET /api/katalog
func GetKatalog(c *gin.Context) {
	var tanaman []models.KatalogTanaman
	config.DB.Find(&tanaman)
	c.JSON(http.StatusOK, gin.H{"data": tanaman})
}

// CreateKatalog - POST /api/katalog
func CreateKatalog(c *gin.Context) {
	namaTanaman := c.PostForm("nama_tanaman")
	suhuMinStr := c.PostForm("suhu_min")
	suhuMaxStr := c.PostForm("suhu_max")
	cahayaJamStr := c.PostForm("cahaya_jam")
	humidityAvgStr := c.PostForm("humidity_avg")
	rainfallAvgStr := c.PostForm("rainfall_avg")
	cahayaMinStr := c.PostForm("cahaya_min")
	rentangSuhu := c.PostForm("rentang_suhu")
	jarakTanamIdeal := c.PostForm("jarak_tanam_ideal")
	deskripsiEdukasi := c.PostForm("deskripsi_edukasi")
	videoID := c.PostForm("video_id")

	suhuMin, _ := strconv.ParseFloat(suhuMinStr, 64)
	suhuMax, _ := strconv.ParseFloat(suhuMaxStr, 64)
	cahayaJam, _ := strconv.ParseFloat(cahayaJamStr, 64)
	humidityAvg, _ := strconv.ParseFloat(humidityAvgStr, 64)
	rainfallAvg, _ := strconv.ParseFloat(rainfallAvgStr, 64)
	cahayaMin, _ := strconv.ParseFloat(cahayaMinStr, 64)

	tanaman := models.KatalogTanaman{
		NamaTanaman:      namaTanaman,
		SuhuMin:          suhuMin,
		SuhuMax:          suhuMax,
		CahayaJam:        cahayaJam,
		HumidityAvg:      humidityAvg,
		RainfallAvg:      rainfallAvg,
		CahayaMin:        cahayaMin,
		RentangSuhu:      &rentangSuhu,
		JarakTanamIdeal:  &jarakTanamIdeal,
		DeskripsiEdukasi: &deskripsiEdukasi,
		VideoID:          &videoID,
	}

	// Handle image upload
	file, err := c.FormFile("gambar_tanaman")
	if err == nil {
		filename := strconv.FormatInt(timeNowUnix(), 10) + "_" + file.Filename
		uploadPath := "uploads/bibit/" + filename
		if err := c.SaveUploadedFile(file, uploadPath); err == nil {
			tanaman.FotoTanaman = &filename
		}
	}

	if err := config.DB.Create(&tanaman).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal menambahkan bibit"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"success": true, "message": "Bibit edukasi baru berhasil ditambah!", "data": tanaman})
}

// UpdateKatalog - PUT /api/katalog/:id
func UpdateKatalog(c *gin.Context) {
	id := c.Param("id")

	var tanaman models.KatalogTanaman
	if err := config.DB.First(&tanaman, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Tanaman tidak ditemukan"})
		return
	}

	namaTanaman := c.PostForm("nama_tanaman")
	if namaTanaman != "" {
		tanaman.NamaTanaman = namaTanaman
	}

	if v := c.PostForm("suhu_min"); v != "" {
		tanaman.SuhuMin, _ = strconv.ParseFloat(v, 64)
	}
	if v := c.PostForm("suhu_max"); v != "" {
		tanaman.SuhuMax, _ = strconv.ParseFloat(v, 64)
	}
	if v := c.PostForm("cahaya_jam"); v != "" {
		tanaman.CahayaJam, _ = strconv.ParseFloat(v, 64)
	}
	if v := c.PostForm("humidity_avg"); v != "" {
		tanaman.HumidityAvg, _ = strconv.ParseFloat(v, 64)
	}
	if v := c.PostForm("rainfall_avg"); v != "" {
		tanaman.RainfallAvg, _ = strconv.ParseFloat(v, 64)
	}
	if v := c.PostForm("cahaya_min"); v != "" {
		tanaman.CahayaMin, _ = strconv.ParseFloat(v, 64)
	}
	if v := c.PostForm("rentang_suhu"); v != "" {
		tanaman.RentangSuhu = &v
	}
	if v := c.PostForm("jarak_tanam_ideal"); v != "" {
		tanaman.JarakTanamIdeal = &v
	}
	if v := c.PostForm("deskripsi_edukasi"); v != "" {
		tanaman.DeskripsiEdukasi = &v
	}
	if v := c.PostForm("video_id"); v != "" {
		tanaman.VideoID = &v
	}

	// Handle new image
	file, err := c.FormFile("gambar_tanaman")
	if err == nil {
		filename := strconv.FormatInt(timeNowUnix(), 10) + "_" + file.Filename
		uploadPath := "uploads/bibit/" + filename
		if err := c.SaveUploadedFile(file, uploadPath); err == nil {
			tanaman.FotoTanaman = &filename
		}
	}

	config.DB.Save(&tanaman)
	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Data berhasil diubah", "data": tanaman})
}

// GetAiLifecycle - GET /api/katalog/:id/ai-lifecycle
func GetAiLifecycle(c *gin.Context) {
	id := c.Param("id")

	var tanaman models.KatalogTanaman
	if err := config.DB.First(&tanaman, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Tanaman tidak ditemukan"})
		return
	}

	groqKey := config.GetEnv("GROQ_API_KEY", "")
	if groqKey == "" {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "API Key tidak dikonfigurasi"})
		return
	}

	prompt := `Buatkan siklus hidup (lifecycle) yang akurat dan realistis untuk tanaman ` + tanaman.NamaTanaman + `. 
Format WAJIB JSON persis seperti ini:
{
    "plant": "` + tanaman.NamaTanaman + `",
    "total_days": [total durasi panen dalam hari],
    "stages": [
        {"phase": "Perkecambahan", "days": [durasi fase ini], "action": "[tips/aksi perawatan spesifik untuk fase ini]"},
        {"phase": "Vegetatif", "days": [durasi fase ini], "action": "[tips/aksi perawatan spesifik untuk fase ini]"},
        {"phase": "Pembungaan/Pembuahan", "days": [durasi fase ini], "action": "[tips/aksi perawatan spesifik untuk fase ini]"},
        {"phase": "Pemanenan", "days": [durasi fase ini], "action": "[tips/aksi perawatan spesifik untuk fase ini]"}
    ]
}
Hanya kembalikan JSON object murni tanpa markdown blocks.`

	aiResponse := callGroqAPI(groqKey, prompt, "llama-3.3-70b-versatile", 0.5)
	if aiResponse == "" {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "AI gagal memberikan data"})
		return
	}

	// Clean markdown
	aiResponse = cleanJSONResponse(aiResponse)

	var result map[string]interface{}
	if err := json.Unmarshal([]byte(aiResponse), &result); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Response JSON invalid"})
		return
	}

	c.JSON(http.StatusOK, result)
}

func cleanJSONResponse(s string) string {
	s = strings.TrimPrefix(s, "```json")
	s = strings.TrimPrefix(s, "```")
	s = strings.TrimSuffix(s, "```")
	return strings.TrimSpace(s)
}

func timeNowUnix() int64 {
	return time.Now().Unix()
}
