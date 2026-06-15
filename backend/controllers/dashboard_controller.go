package controllers

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"math"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"

	"urbangrow-backend/config"
	"urbangrow-backend/models"

	"github.com/gin-gonic/gin"
)

// DashboardData response struct
type DashboardData struct {
	Weather            map[string]interface{}   `json:"weather"`
	JadwalUser         []JadwalDashboard        `json:"jadwal_user"`
	TotalLahan         int64                    `json:"total_lahan"`
	TotalUser          int64                    `json:"total_user"`
	TotalTanaman       int64                    `json:"total_tanaman"`
	TotalLuas          float64                  `json:"total_luas"`
	BibitDefault       []models.KatalogTanaman  `json:"bibit_default"`
	Labels             []string                 `json:"labels"`
	LuasValues         []float64                `json:"luas_values"`
	SuhuValues         []float64                `json:"suhu_values"`
	PlantLabels        []string                 `json:"plant_labels"`
	PlantCounts        []int                    `json:"plant_counts"`
	TotalTugasSelesai  int                      `json:"total_tugas_selesai"`
	TotalTugasSisa     int                      `json:"total_tugas_sisa"`
	RekomendasiLahan   []string                 `json:"rekomendasi_lahan"`
	RekomendasiDetails [][]RekomendasiItem      `json:"rekomendasi_details"`
	SaranWaktu         string                   `json:"saran_waktu"`
}

type RekomendasiItem struct {
	IDTanaman      uint    `json:"id_tanaman"`
	NamaTanaman    string  `json:"nama_tanaman"`
	SuhuMin        float64 `json:"suhu_min"`
	SuhuMax        float64 `json:"suhu_max"`
	CahayaJam      float64 `json:"cahaya_jam"`
	FotoTanaman    *string `json:"foto_tanaman"`
	SkorKecocokan  int     `json:"skor_kecocokan"`
	AlasanAI       string  `json:"alasan_ai"`
	VideoID        *string `json:"video_id"`
}

type JadwalDashboard struct {
	models.Penjadwalan
	HariKe              int                  `json:"hari_ke"`
	TotalHariPanen       int                 `json:"total_hari_panen"`
	ProgresPersen        int                 `json:"progres_persen"`
	DaftarTugasHariIni   []TugasItem         `json:"daftar_tugas_hari_ini"`
	TugasTotalCount      int                 `json:"tugas_total_count"`
	TugasSelesaiCount    int                 `json:"tugas_selesai_count"`
	TugasPersen          int                 `json:"tugas_persen"`
	FotoTanaman          *string             `json:"foto_tanaman"`
}

type TugasItem struct {
	Time     string `json:"time"`
	Name     string `json:"name"`
	Desc     string `json:"desc"`
	Category string `json:"category"`
	Step     int    `json:"step"`
	StartNum int    `json:"start_num"`
	EndNum   int    `json:"end_num"`
}

// GetDashboard - GET /api/dashboard
func GetDashboard(c *gin.Context) {
	userID, _ := c.Get("user_id")
	uid := userID.(uint)

	// 1. Get user's spaces
	var userLahan []models.Space
	config.DB.Where("id_user = ?", uid).Find(&userLahan)

	// Statistics
	var totalLahan int64
	config.DB.Model(&models.Space{}).Where("id_user = ?", uid).Count(&totalLahan)
	var totalUser int64
	config.DB.Model(&models.User{}).Count(&totalUser)
	var totalTanaman int64
	config.DB.Model(&models.KatalogTanaman{}).Count(&totalTanaman)

	var totalLuas float64
	for _, l := range userLahan {
		totalLuas += l.LuasLahan
	}

	// Bibit Default (latest 6)
	var bibitDefault []models.KatalogTanaman
	config.DB.Order("created_at DESC").Limit(6).Find(&bibitDefault)

	// All katalog for recommendations
	var semuaKatalog []models.KatalogTanaman
	config.DB.Find(&semuaKatalog)

	// Labels & Values for charts
	labels := make([]string, len(userLahan))
	luasValues := make([]float64, len(userLahan))
	suhuValues := make([]float64, len(userLahan))
	for i, l := range userLahan {
		labels[i] = l.NamaLahan
		luasValues[i] = l.LuasLahan
		suhuValues[i] = l.SuhuLahan
	}

	// Recommendations
	rekomendasiLahan, rekomendasiDetails := getRekomendasiLahan(userLahan, semuaKatalog)

	// User schedules
	var jadwalUser []models.Penjadwalan
	config.DB.Where("user_id = ?", uid).Find(&jadwalUser)

	// Plant distribution
	plantGroups := make(map[string]int)
	for _, j := range jadwalUser {
		plantGroups[j.NamaTanaman]++
	}
	var plantLabels []string
	var plantCounts []int
	for k, v := range plantGroups {
		plantLabels = append(plantLabels, k)
		plantCounts = append(plantCounts, v)
	}

	// Katalog keyed by name
	katalogRaw := make(map[string]models.KatalogTanaman)
	for _, k := range semuaKatalog {
		katalogRaw[k.NamaTanaman] = k
	}

	// Time suggestion
	hour := time.Now().Hour()
	saranWaktu := "Sore (16:00 - 18:00)"
	if hour < 11 {
		saranWaktu = "Pagi (07:00 - 09:00)"
	}

	// Process tasks
	totalTugasSelesai, totalTugasSisa, jadwalDashboard := calculateTaskStatistics(jadwalUser, katalogRaw)

	// Weather
	weather := fetchWeatherData()

	data := DashboardData{
		Weather:            weather,
		JadwalUser:         jadwalDashboard,
		TotalLahan:         totalLahan,
		TotalUser:          totalUser,
		TotalTanaman:       totalTanaman,
		TotalLuas:          totalLuas,
		BibitDefault:       bibitDefault,
		Labels:             labels,
		LuasValues:         luasValues,
		SuhuValues:         suhuValues,
		PlantLabels:        plantLabels,
		PlantCounts:        plantCounts,
		TotalTugasSelesai:  totalTugasSelesai,
		TotalTugasSisa:     totalTugasSisa,
		RekomendasiLahan:   rekomendasiLahan,
		RekomendasiDetails: rekomendasiDetails,
		SaranWaktu:         saranWaktu,
	}

	c.JSON(http.StatusOK, data)
}

func getRekomendasiLahan(userLahan []models.Space, semuaKatalog []models.KatalogTanaman) ([]string, [][]RekomendasiItem) {
	var labels []string
	var details [][]RekomendasiItem

	for _, lhn := range userLahan {
		var matches []RekomendasiItem
		for _, k := range semuaKatalog {
			if lhn.SuhuLahan >= k.SuhuMin && lhn.SuhuLahan <= k.SuhuMax {
				ideal := (k.SuhuMin + k.SuhuMax) / 2
				jarak := math.Abs(lhn.SuhuLahan - ideal)
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

		// Sort by score desc and take top 3
		for i := 0; i < len(matches); i++ {
			for j := i + 1; j < len(matches); j++ {
				if matches[j].SkorKecocokan > matches[i].SkorKecocokan {
					matches[i], matches[j] = matches[j], matches[i]
				}
			}
		}
		if len(matches) > 3 {
			matches = matches[:3]
		}

		label := "Belum Ada yang Cocok"
		if len(matches) > 0 {
			label = matches[0].NamaTanaman
		}
		labels = append(labels, label)
		details = append(details, matches)
	}

	return labels, details
}

func calculateTaskStatistics(jadwalUser []models.Penjadwalan, katalogRaw map[string]models.KatalogTanaman) (int, int, []JadwalDashboard) {
	totalTugasSelesai := 0
	totalTugasSisa := 0
	var jadwalDashboard []JadwalDashboard

	for _, j := range jadwalUser {
		jd := JadwalDashboard{Penjadwalan: j}

		if j.TanggalTanam != nil && *j.TanggalTanam != "" {
			dtTanam, err := time.Parse("2006-01-02", *j.TanggalTanam)
			if err != nil {
				dtTanam, err = time.Parse("2006-01-02 15:04:05", *j.TanggalTanam)
			}
			if err != nil {
				dtTanam, err = time.Parse("1/2/2006", *j.TanggalTanam)
			}
			if err != nil {
				dtTanam, err = time.Parse("01/02/2006", *j.TanggalTanam)
			}
			if err == nil {
				now := time.Now().Truncate(24 * time.Hour)
				dtTanam = dtTanam.Truncate(24 * time.Hour)
				hariKe := int(now.Sub(dtTanam).Hours()/24) + 1
				if hariKe < 1 {
					hariKe = 1
				}

				// Get today's tasks
				var tugasHariIni []models.PenjadwalanDetail
				config.DB.Where("penjadwalan_id = ? AND hari_ke = ?", j.ID, hariKe).Find(&tugasHariIni)

				// Count completed logs today
				var logSelesaiCount int64
				today := time.Now().Format("2006-01-02")
				config.DB.Model(&models.LogPerawatan{}).
					Where("penjadwalan_id = ? AND DATE(tanggal_selesai) = ?", j.ID, today).
					Count(&logSelesaiCount)

				var daftarTugas []TugasItem
				if len(tugasHariIni) == 0 {
					totalTugasSisa += max(0, 3-int(logSelesaiCount))
					totalTugasSelesai += int(logSelesaiCount)

					daftarTugas = []TugasItem{
						{Time: "07:00 - 09:00", Name: "Penyiraman Rutin", Desc: "Lakukan penyiraman rutin sesuai kebutuhan tanaman.", Category: "Penyiraman", Step: 1, StartNum: 700, EndNum: 900},
						{Time: "13:00 - 15:00", Name: "Pemantauan Kebun", Desc: "Cek kondisi daun dan kelembapan media tanam.", Category: "Lainnya", Step: 2, StartNum: 1300, EndNum: 1500},
					}
				} else {
					totalTugasSelesai += int(logSelesaiCount)
					totalTugasSisa += max(0, len(tugasHariIni)-int(logSelesaiCount))

					for idx, d := range tugasHariIni {
						t := "08:00 - 09:00"
						startNum := 800
						endNum := 900
						if d.Kategori == "Penyiraman" {
							if idx == 0 {
								t = "07:00 - 09:00"
								startNum = 700
								endNum = 900
							} else {
								t = "16:00 - 18:00"
								startNum = 1600
								endNum = 1800
							}
						} else if d.Kategori == "Pemupukan" {
							t = "09:00 - 10:00"
							startNum = 900
							endNum = 1000
						}
						daftarTugas = append(daftarTugas, TugasItem{
							Time: t, Name: d.Kegiatan, Desc: d.Deskripsi,
							Category: d.Kategori, Step: idx + 1,
							StartNum: startNum, EndNum: endNum,
						})
					}
				}

				tanamanInfo, exists := katalogRaw[j.NamaTanaman]
				estimasiKatalog := 90
				if exists && tanamanInfo.EstimasiHariPanen != nil {
					estimasiKatalog = *tanamanInfo.EstimasiHariPanen
				}

				totalHariPanen := estimasiKatalog
				if j.DurasiPanen != nil && *j.DurasiPanen > 0 {
					totalHariPanen = *j.DurasiPanen
				}

				progresPersen := int(math.Min(float64(hariKe)*100/float64(totalHariPanen), 100))

				tugasCountReal := len(daftarTugas)
				tugasPersen := 0
				if tugasCountReal > 0 {
					tugasPersen = int(math.Min(100, float64(logSelesaiCount)*100/float64(tugasCountReal)))
				}

				jd.HariKe = hariKe
				jd.TotalHariPanen = totalHariPanen
				jd.ProgresPersen = progresPersen
				jd.DaftarTugasHariIni = daftarTugas
				jd.TugasTotalCount = tugasCountReal
				jd.TugasSelesaiCount = int(logSelesaiCount)
				jd.TugasPersen = tugasPersen

				if exists {
					jd.FotoTanaman = tanamanInfo.FotoTanaman
				}
			}
		} else {
			tanamanInfo, exists := katalogRaw[j.NamaTanaman]
			totalHP := 90
			if exists && tanamanInfo.EstimasiHariPanen != nil {
				totalHP = *tanamanInfo.EstimasiHariPanen
			}
			jd.TotalHariPanen = totalHP
			jd.ProgresPersen = 0
			jd.DaftarTugasHariIni = []TugasItem{}
			if exists {
				jd.FotoTanaman = tanamanInfo.FotoTanaman
			}
		}

		jadwalDashboard = append(jadwalDashboard, jd)
	}

	return totalTugasSelesai, totalTugasSisa, jadwalDashboard
}

func fetchWeatherData() map[string]interface{} {
	weather := map[string]interface{}{
		"temp":     28,
		"desc":     "Partly cloudy",
		"humidity": 68,
		"wind":     6,
		"icon":     "02d",
	}

	weatherKey := os.Getenv("OPENWEATHER_API_KEY")
	if weatherKey == "" {
		return weather
	}

	url := fmt.Sprintf("https://api.openweathermap.org/data/2.5/weather?q=Malang&appid=%s&units=metric&lang=id", weatherKey)

	client := &http.Client{Timeout: 5 * time.Second}
	resp, err := client.Get(url)
	if err != nil {
		log.Println("Weather fetch failed:", err)
		return weather
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return weather
	}

	var wData map[string]interface{}
	if err := json.Unmarshal(body, &wData); err != nil {
		return weather
	}

	if mainData, ok := wData["main"].(map[string]interface{}); ok {
		if temp, ok := mainData["temp"].(float64); ok {
			weather["temp"] = int(math.Round(temp))
		}
		if humidity, ok := mainData["humidity"].(float64); ok {
			weather["humidity"] = int(humidity)
		}
	}

	if weatherArr, ok := wData["weather"].([]interface{}); ok && len(weatherArr) > 0 {
		if w, ok := weatherArr[0].(map[string]interface{}); ok {
			if desc, ok := w["description"].(string); ok {
				weather["desc"] = strings.ToUpper(desc[:1]) + desc[1:]
			}
			if icon, ok := w["icon"].(string); ok {
				weather["icon"] = icon
			}
		}
	}

	if windData, ok := wData["wind"].(map[string]interface{}); ok {
		if speed, ok := windData["speed"].(float64); ok {
			weather["wind"] = int(math.Round(speed * 3.6))
		}
	}

	return weather
}

// SimpanTanam - POST /api/simpan-tanam
func SimpanTanam(c *gin.Context) {
	userID, _ := c.Get("user_id")
	uid := userID.(uint)

	var input struct {
		Lahan   string `json:"lahan" binding:"required"`
		Tanaman string `json:"tanaman" binding:"required"`
		Tanggal string `json:"tanggal" binding:"required"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	penjadwalan := models.Penjadwalan{
		UserID:       uid,
		NamaLahan:    input.Lahan,
		NamaTanaman:  input.Tanaman,
		TanggalTanam: &input.Tanggal,
	}

	if err := config.DB.Create(&penjadwalan).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal membuat jadwal"})
		return
	}

	// Generate AI Schedule in background
	go generateAISchedule(penjadwalan.ID, input.Tanaman)

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Jadwal berhasil dibuat!",
		"data":    penjadwalan,
	})
}

func generateAISchedule(penjadwalanID uint, namaTanaman string) {
	groqKey := os.Getenv("GROQ_API_KEY")
	weatherKey := os.Getenv("OPENWEATHER_API_KEY")
	if groqKey == "" {
		log.Println("GROQ_API_KEY not set, skipping AI schedule generation")
		return
	}

	// Get tanaman info
	var tanaman models.KatalogTanaman
	config.DB.Where("nama_tanaman = ?", namaTanaman).First(&tanaman)

	// Get weather
	temp := 27.0
	humidity := 70.0
	desc := "cerah"

	if weatherKey != "" {
		url := fmt.Sprintf("https://api.openweathermap.org/data/2.5/weather?q=Malang&appid=%s&units=metric&lang=id", weatherKey)
		client := &http.Client{Timeout: 5 * time.Second}
		resp, err := client.Get(url)
		if err == nil {
			defer resp.Body.Close()
			body, _ := io.ReadAll(resp.Body)
			var wData map[string]interface{}
			if json.Unmarshal(body, &wData) == nil {
				if mainData, ok := wData["main"].(map[string]interface{}); ok {
					if t, ok := mainData["temp"].(float64); ok {
						temp = t
					}
					if h, ok := mainData["humidity"].(float64); ok {
						humidity = h
					}
				}
				if weatherArr, ok := wData["weather"].([]interface{}); ok && len(weatherArr) > 0 {
					if w, ok := weatherArr[0].(map[string]interface{}); ok {
						if d, ok := w["description"].(string); ok {
							desc = d
						}
					}
				}
			}
		}
	}

	suhuMin := tanaman.SuhuMin
	suhuMax := tanaman.SuhuMax
	cahayaJam := tanaman.CahayaJam
	humidityAvg := tanaman.HumidityAvg

	if suhuMin == 0 { suhuMin = 20 }
	if suhuMax == 0 { suhuMax = 30 }
	if cahayaJam == 0 { cahayaJam = 12 }
	if humidityAvg == 0 { humidityAvg = 70 }

	prompt := fmt.Sprintf(`Rancanglah jadwal perawatan harian otomatis untuk tanaman %s mulai dari hari ke-1 hingga masa panen asli tanaman tersebut (jangan dipukul rata 90 hari, sesuaikan dengan siklus hidup aslinya, misal kelapa 1095 hari). 
Gunakan data spesifikasi dari katalog sebagai acuan utama (suhu ideal %.0f°C - %.0f°C, kebutuhan cahaya %.0f jam/hari, dan kelembapan %.0f%%). 
Sesuaikan instruksi kegiatan secara dinamis dengan membandingkannya terhadap kondisi cuaca real-time saat ini (suhu %.1f°C, kelembapan %.0f%%, dan kondisi %s) agar rekomendasi penyiraman dan pemupukan menjadi akurat. 
Setiap tugas HARUS memiliki jam pengerjaan spesifik (waktu_mulai dan waktu_selesai dalam format "HH:MM", contoh: "07:00", "09:00"). Distribusikan tugas sepanjang hari (pagi 06:00-09:00, siang 11:00-14:00, sore 16:00-18:00).
Hasilkan output HANYA dalam format JSON object seperti ini:
{
  "estimasi_panen_hari": [integer total hari panen asli tanaman, contoh: 1095],
  "jadwal": [
    {
      "hari_ke": 1,
      "kegiatan": "Penyiraman",
      "deskripsi": "...",
      "kategori": "Penyiraman",
      "waktu_mulai": "07:00",
      "waktu_selesai": "09:00"
    }
  ]
}
Berikan beberapa sampel kegiatan yang mewakili siklus perawatan, tidak perlu menuliskan tiap hari jika polanya berulang.`,
		namaTanaman, suhuMin, suhuMax, cahayaJam, humidityAvg, temp, humidity, desc)

	aiResponse := callGroqAPI(groqKey, prompt, "llama-3.3-70b-versatile", 0.5)
	if aiResponse == "" {
		return
	}

	// Clean markdown JSON
	aiResponse = strings.TrimPrefix(aiResponse, "```json")
	aiResponse = strings.TrimPrefix(aiResponse, "```")
	aiResponse = strings.TrimSuffix(aiResponse, "```")
	aiResponse = strings.TrimSpace(aiResponse)

	var aiResult struct {
		EstimasiPanenHari int `json:"estimasi_panen_hari"`
		Jadwal            []struct {
			HariKe       int    `json:"hari_ke"`
			Kegiatan     string `json:"kegiatan"`
			Deskripsi    string `json:"deskripsi"`
			Kategori     string `json:"kategori"`
			WaktuMulai   string `json:"waktu_mulai"`
			WaktuSelesai string `json:"waktu_selesai"`
		} `json:"jadwal"`
	}

	if err := json.Unmarshal([]byte(aiResponse), &aiResult); err != nil {
		log.Println("Failed to parse AI schedule:", err)
		return
	}

	maxHari := aiResult.EstimasiPanenHari
	for _, task := range aiResult.Jadwal {
		wMulai := task.WaktuMulai
		wSelesai := task.WaktuSelesai
		if wMulai == "" {
			wMulai = "07:00"
		}
		if wSelesai == "" {
			wSelesai = "09:00"
		}
		detail := models.PenjadwalanDetail{
			PenjadwalanID: penjadwalanID,
			HariKe:        task.HariKe,
			Kegiatan:      task.Kegiatan,
			Deskripsi:     task.Deskripsi,
			Kategori:      task.Kategori,
			WaktuMulai:    wMulai,
			WaktuSelesai:  wSelesai,
		}
		config.DB.Create(&detail)
		if maxHari == 0 && task.HariKe > maxHari {
			maxHari = task.HariKe
		}
	}

	if maxHari > 0 {
		config.DB.Model(&models.Penjadwalan{}).Where("id = ?", penjadwalanID).Update("durasi_panen", maxHari)
		
		// Update KatalogTanaman if it has no harvest estimation yet
		config.DB.Model(&models.KatalogTanaman{}).
			Where("nama_tanaman = ? AND (estimasi_hari_panen IS NULL OR estimasi_hari_panen = 0)", namaTanaman).
			Update("estimasi_hari_panen", maxHari)
	}

	log.Printf("✅ AI Schedule generated for penjadwalan #%d: %d tasks, Panen: %d hari", penjadwalanID, len(aiResult.Jadwal), maxHari)
}

// SyncKatalogAi - POST /api/sync-katalog-ai
func SyncKatalogAi(c *gin.Context) {
	groqKey := os.Getenv("GROQ_API_KEY")
	if groqKey == "" {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "GROQ_API_KEY tidak dikonfigurasi"})
		return
	}

	var tanamanList []string
	config.DB.Model(&models.KatalogTanaman{}).Pluck("nama_tanaman", &tanamanList)

	tanamanStr := strings.Join(tanamanList, ", ")
	prompt := fmt.Sprintf(`Berikan estimasi masa panen (dalam satuan hari) untuk daftar tanaman berikut: %s. 
Hasilkan output hanya dalam format JSON object dengan format: {"Nama Tanaman": durasi_hari}. 
Pastikan durasi yang diberikan akurat berdasarkan siklus hidup asli tanaman tersebut (contoh: Padi sekitar 110-120 hari). 
Berikan nilai integer tunggal untuk tiap tanaman.`, tanamanStr)

	aiResponse := callGroqAPI(groqKey, prompt, "llama-3.3-70b-versatile", 0.5)
	if aiResponse == "" {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "AI gagal memberikan data yang valid."})
		return
	}

	// Clean markdown
	aiResponse = strings.TrimPrefix(aiResponse, "```json")
	aiResponse = strings.TrimPrefix(aiResponse, "```")
	aiResponse = strings.TrimSuffix(aiResponse, "```")
	aiResponse = strings.TrimSpace(aiResponse)

	var harvestData map[string]interface{}
	if err := json.Unmarshal([]byte(aiResponse), &harvestData); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "AI gagal memberikan data yang valid."})
		return
	}

	for nama, durasi := range harvestData {
		var durasiInt int
		switch v := durasi.(type) {
		case float64:
			durasiInt = int(v)
		case string:
			durasiInt, _ = strconv.Atoi(v)
		}
		if durasiInt > 0 {
			config.DB.Model(&models.KatalogTanaman{}).Where("nama_tanaman = ?", nama).Update("estimasi_hari_panen", durasiInt)
		}
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Estimasi panen berhasil disinkronkan dengan AI!"})
}

// HapusJadwal - DELETE /api/semua-jadwal/:id
func HapusJadwal(c *gin.Context) {
	userID, _ := c.Get("user_id")
	uid := userID.(uint)
	id := c.Param("id")

	var jadwal models.Penjadwalan
	if err := config.DB.Where("id = ? AND user_id = ?", id, uid).First(&jadwal).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Jadwal tidak ditemukan"})
		return
	}

	// Delete details first
	config.DB.Where("penjadwalan_id = ?", jadwal.ID).Delete(&models.PenjadwalanDetail{})
	config.DB.Where("penjadwalan_id = ?", jadwal.ID).Delete(&models.LogPerawatan{})
	config.DB.Delete(&jadwal)

	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Jadwal berhasil dihapus!"})
}

// Helper
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

func max(a, b int) int {
	if a > b {
		return a
	}
	return b
}

// GetSettingsPublic - GET /api/settings
func GetSettingsPublic(c *gin.Context) {
	var settings []models.Setting
	config.DB.Find(&settings)

	settingsMap := make(map[string]string)
	for _, s := range settings {
		settingsMap[s.Key] = s.Value
	}

	c.JSON(http.StatusOK, gin.H{
		"settings": settingsMap,
	})
}
