package controllers

import (
	"fmt"
	"math"
	"net/http"
	"strings"
	"time"

	"urbangrow-backend/config"
	"urbangrow-backend/models"
	ws "urbangrow-backend/websocket"

	"github.com/gin-gonic/gin"
)

// JadwalResponse represents schedule data with computed fields
type JadwalResponse struct {
	models.Penjadwalan
	HariKe             int          `json:"hari_ke"`
	TotalHariPanen     int          `json:"total_hari_panen"`
	ProgresPersen      int          `json:"progres_persen"`
	DaftarTugasHariIni []TugasJadwal `json:"daftar_tugas_hari_ini"`
	MissedTasksCount   int          `json:"missed_tasks_count"`
}

type TugasJadwal struct {
	Step        int    `json:"step"`
	Name        string `json:"name"`
	Description string `json:"description"`
	Fase        string `json:"fase"`
	AlatBahan   string `json:"alat_bahan"`
	Category    string `json:"category"`
	Time        string `json:"time"`
	StartNum    int    `json:"start_num"`
	EndNum      int    `json:"end_num"`
	IsDone      bool   `json:"is_done"`
	IsOverdue   bool   `json:"is_overdue"`
	IsFuture    bool   `json:"is_future"`
}

// GetJadwal - GET /api/semua-jadwal
func GetJadwal(c *gin.Context) {
	userID, _ := c.Get("user_id")
	uid := userID.(uint)

	var semuaJadwal []models.Penjadwalan
	config.DB.Preload("Details").Where("user_id = ?", uid).Find(&semuaJadwal)

	var katalogList []models.KatalogTanaman
	config.DB.Find(&katalogList)
	katalogRaw := make(map[string]models.KatalogTanaman)
	for _, k := range katalogList {
		katalogRaw[k.NamaTanaman] = k
	}

	now := time.Now()
	currentTime := now.Hour()*100 + now.Minute()

	var responses []JadwalResponse

	for _, j := range semuaJadwal {
		jr := JadwalResponse{Penjadwalan: j}

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
				dtSekarang := time.Now().Truncate(24 * time.Hour)
				dtTanam = dtTanam.Truncate(24 * time.Hour)
				hariKe := int(dtSekarang.Sub(dtTanam).Hours()/24) + 1
				if hariKe < 1 {
					hariKe = 1
				}

				jr.HariKe = hariKe
				jr.TotalHariPanen = 90
				if j.DurasiPanen != nil && *j.DurasiPanen > 0 {
					jr.TotalHariPanen = *j.DurasiPanen
				}
				jr.ProgresPersen = int(math.Min(float64(hariKe)*100/float64(jr.TotalHariPanen), 100))

				// Get tasks for today
				var details []models.PenjadwalanDetail
				config.DB.Where("penjadwalan_id = ? AND hari_ke = ?", j.ID, hariKe).Find(&details)

				var daftarTugas []TugasJadwal

				if len(details) > 0 {
					for idx, d := range details {
						// Use stored time from AI or default
						wMulai := d.WaktuMulai
						wSelesai := d.WaktuSelesai
						if wMulai == "" {
							wMulai = "07:00"
						}
						if wSelesai == "" {
							wSelesai = "09:00"
						}
						t := fmt.Sprintf("%s - %s WIB", wMulai, wSelesai)

						// Parse start/end as numeric for comparison
						startNum := parseTimeToNum(wMulai)
						endNum := parseTimeToNum(wSelesai)

						fase := ""
						if d.Fase != nil {
							fase = *d.Fase
						}
						alatBahan := ""
						if d.AlatBahan != nil {
							alatBahan = *d.AlatBahan
						}

						daftarTugas = append(daftarTugas, TugasJadwal{
							Step:        idx + 1,
							Name:        d.Kegiatan,
							Description: d.Deskripsi,
							Fase:        fase,
							AlatBahan:   alatBahan,
							Category:    d.Kategori,
							Time:        t,
							StartNum:    startNum,
							EndNum:      endNum,
						})
					}
				} else {
					// Fallback tasks
					daftarTugas = []TugasJadwal{
						{Step: 1, Name: "Siram Pagi & Nutrisi", Time: "07:00 - 09:00 WIB", StartNum: 700, EndNum: 900, Category: "Penyiraman"},
						{Step: 2, Name: "Cek Kelembaban Media", Time: "13:00 - 15:00 WIB", StartNum: 1300, EndNum: 1500, Category: "Lainnya"},
						{Step: 3, Name: "Siram Sore & Cek Hama", Time: "17:00 - 19:00 WIB", StartNum: 1700, EndNum: 1900, Category: "Penyiraman"},
					}
				}

				// Get completed logs today
				var logSelesai []int
				today := time.Now().Format("2006-01-02")
				config.DB.Model(&models.LogPerawatan{}).
					Where("penjadwalan_id = ? AND DATE(tanggal_selesai) = ?", j.ID, today).
					Pluck("step", &logSelesai)

				logSelesaiMap := make(map[int]bool)
				for _, s := range logSelesai {
					logSelesaiMap[s] = true
				}

				// Process status
				for k, tugas := range daftarTugas {
					isDone := logSelesaiMap[tugas.Step]
					isOverdue := currentTime > tugas.EndNum && !isDone && tugas.EndNum > 0
					isFuture := currentTime < tugas.StartNum

					daftarTugas[k].IsDone = isDone
					daftarTugas[k].IsOverdue = isOverdue
					daftarTugas[k].IsFuture = isFuture
				}

				jr.DaftarTugasHariIni = daftarTugas

				// Calculate missed tasks
				totalTasksShouldBeDone := 0
				var detailCount int64
				config.DB.Model(&models.PenjadwalanDetail{}).Where("penjadwalan_id = ?", j.ID).Count(&detailCount)
				if detailCount > 0 {
					var pastCount int64
					config.DB.Model(&models.PenjadwalanDetail{}).
						Where("penjadwalan_id = ? AND hari_ke < ?", j.ID, hariKe).
						Count(&pastCount)
					totalTasksShouldBeDone = int(pastCount)
				} else {
					totalTasksShouldBeDone = (hariKe - 1) * 3
				}

				for _, tugas := range daftarTugas {
					if currentTime > tugas.EndNum && tugas.EndNum > 0 {
						totalTasksShouldBeDone++
					}
				}

				var totalCompletedTasks int64
				config.DB.Model(&models.LogPerawatan{}).Where("penjadwalan_id = ?", j.ID).Count(&totalCompletedTasks)
				jr.MissedTasksCount = max(0, totalTasksShouldBeDone-int(totalCompletedTasks))

			}
		} else {
			jr.HariKe = 1
			jr.TotalHariPanen = 90
			jr.ProgresPersen = 0
			jr.DaftarTugasHariIni = []TugasJadwal{}
		}

		responses = append(responses, jr)
	}

	c.JSON(http.StatusOK, gin.H{"data": responses})
}

// CompleteTask - POST /api/complete-task/:id
func CompleteTask(c *gin.Context) {
	userID, _ := c.Get("user_id")
	uid := userID.(uint)
	id := c.Param("id")

	var input struct {
		Step int `json:"step" binding:"required"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var jadwal models.Penjadwalan
	if err := config.DB.Where("id = ? AND user_id = ?", id, uid).First(&jadwal).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"message": "Not Found"})
		return
	}

	logPerawatan := models.LogPerawatan{
		PenjadwalanID:  jadwal.ID,
		Step:           input.Step,
		TanggalSelesai: time.Now(),
	}
	config.DB.Create(&logPerawatan)
	config.DB.Model(&jadwal).Update("current_step", jadwal.CurrentStep+1)

	c.JSON(http.StatusOK, gin.H{"success": true})
}

// DestroyJadwal - DELETE /api/semua-jadwal/:id
func DestroyJadwal(c *gin.Context) {
	userID, _ := c.Get("user_id")
	uid := userID.(uint)
	id := c.Param("id")

	var jadwal models.Penjadwalan
	if err := config.DB.Where("id = ? AND user_id = ?", id, uid).First(&jadwal).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Jadwal tidak ditemukan"})
		return
	}

	config.DB.Where("penjadwalan_id = ?", jadwal.ID).Delete(&models.PenjadwalanDetail{})
	config.DB.Where("penjadwalan_id = ?", jadwal.ID).Delete(&models.LogPerawatan{})
	config.DB.Delete(&jadwal)

	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Dihapus"})
}

// GetAttentionAnalysis - GET /api/semua-jadwal/:id/attention
func GetAttentionAnalysis(c *gin.Context) {
	userID, _ := c.Get("user_id")
	uid := userID.(uint)
	id := c.Param("id")

	var jadwal models.Penjadwalan
	if err := config.DB.Where("id = ? AND user_id = ?", id, uid).First(&jadwal).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"message": "Not Found"})
		return
	}

	hariKe := c.DefaultQuery("hari_ke", "1")
	missedCount := c.DefaultQuery("missed_count", "1")
	tanaman := jadwal.NamaTanaman

	missedCountInt := 0
	fmt.Sscanf(missedCount, "%d", &missedCountInt)

	var prompt string
	if missedCountInt > 5 {
		prompt = fmt.Sprintf("Dalam 2 kalimat singkat dan tegas, nyatakan bahwa tanaman %s (Hari ke-%s) kemungkinan besar sudah mati atau sekarat akibat %s tugas perawatan yang terlewat. Sebutkan gejala fisik yang paling parah seperti daun layu total, batang membusuk, dll. Jangan gunakan pembukaan seperti 'Sebagai AI' atau 'Berdasarkan'.", tanaman, hariKe, missedCount)
	} else {
		prompt = fmt.Sprintf("Dalam 2-3 kalimat singkat dan langsung, jelaskan dampak fisik yang sedang terjadi pada tanaman %s (Hari ke-%s) akibat %s tugas perawatan yang terlewat. Sebutkan gejala spesifik seperti daun menguning, pertumbuhan terhambat, atau rentan hama sesuai jenis kelalaiannya. Jangan gunakan pembukaan seperti 'Sebagai AI' atau 'Berdasarkan'.", tanaman, hariKe, missedCount)
	}

	groqKey := config.GetEnv("GROQ_API_KEY", "")
	if groqKey == "" {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "API Key tidak dikonfigurasi."})
		return
	}

	aiResponse := callGroqAPI(groqKey, prompt, "llama-3.1-8b-instant", 0.5)
	if aiResponse == "" {
		c.JSON(http.StatusOK, gin.H{"analysis": "AI sedang tidak dapat menganalisis tanaman saat ini."})
		return
	}

	c.JSON(http.StatusOK, gin.H{"analysis": aiResponse})
}

// TandaiSelesai - POST /api/jadwal/selesai
func TandaiSelesai(c *gin.Context) {
	userID, _ := c.Get("user_id")
	uid := userID.(uint)

	var input struct {
		PenjadwalanID uint `json:"penjadwalan_id" binding:"required"`
		Step          int  `json:"step" binding:"required"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var jadwal models.Penjadwalan
	if err := config.DB.Where("id = ? AND user_id = ?", input.PenjadwalanID, uid).First(&jadwal).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Jadwal tidak ditemukan"})
		return
	}

	logPerawatan := models.LogPerawatan{
		PenjadwalanID:  input.PenjadwalanID,
		Step:           input.Step,
		TanggalSelesai: time.Now(),
	}
	config.DB.Create(&logPerawatan)

	c.JSON(http.StatusOK, gin.H{"success": true})
}

// parseTimeToNum converts "HH:MM" to numeric HHMM for comparison
func parseTimeToNum(t string) int {
	parts := strings.Split(t, ":")
	if len(parts) != 2 {
		return 0
	}
	h := 0
	m := 0
	fmt.Sscanf(parts[0], "%d", &h)
	fmt.Sscanf(parts[1], "%d", &m)
	return h*100 + m
}

// TestNotification - GET /api/test-notification
func TestNotification(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}
	uid := userID.(uint)

	title := "Notifikasi Uji Coba"
	message := "Ini adalah notifikasi jadwal buatan untuk mengecek fitur realtime WebSocket Anda!"
	actionURL := "/jadwal"

	notif := models.Notification{
		UserID:    uid,
		Title:     title,
		Message:   message,
		ActionURL: &actionURL,
		IsRead:    false,
	}
	config.DB.Create(&notif)

	// Call the broadcast function
	ws.BroadcastTaskNotification(uid, title, message, actionURL)

	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Test notification sent!"})
}
