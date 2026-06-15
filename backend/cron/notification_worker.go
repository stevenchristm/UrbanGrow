package cron

import (
	"fmt"
	"log"
	"time"

	"urbangrow-backend/config"
	"urbangrow-backend/models"
	ws "urbangrow-backend/websocket"
)

func StartNotificationWorker() {
	log.Println("⏰ Notification worker started")
	// Check every minute
	ticker := time.NewTicker(1 * time.Minute)
	go func() {
		for {
			<-ticker.C
			checkSchedulesAndNotify()
		}
	}()
}

func checkSchedulesAndNotify() {
	now := time.Now()
	// Waktu sekarang dengan format HH:MM
	currentTimeStr := now.Format("15:04")

	var schedules []models.Penjadwalan
	config.DB.Where("tanggal_tanam IS NOT NULL AND tanggal_tanam != ''").Find(&schedules)

	for _, j := range schedules {
		// Hitung hari ke-berapa
		dtTanam, err := time.Parse("2006-01-02", *j.TanggalTanam)
		if err != nil {
			dtTanam, err = time.Parse("2006-01-02 15:04:05", *j.TanggalTanam)
			if err != nil {
				continue
			}
		}

		today := time.Now().Truncate(24 * time.Hour)
		dtTanam = dtTanam.Truncate(24 * time.Hour)
		hariKe := int(today.Sub(dtTanam).Hours()/24) + 1

		if hariKe <= 0 {
			continue
		}

		// Cari detail jadwal pada hari ini dengan waktu_mulai yang sama dengan waktu sekarang
		var details []models.PenjadwalanDetail
		config.DB.Where("penjadwalan_id = ? AND hari_ke = ? AND waktu_mulai = ?", j.ID, hariKe, currentTimeStr).Find(&details)

		for _, d := range details {
			// Cek apakah notifikasi untuk step ini hari ini sudah ada agar tidak ganda
			// Karena dicek per menit, idealnya tidak ganda.
			title := fmt.Sprintf("Waktunya %s!", d.Kegiatan)
			message := fmt.Sprintf("Pengingat: Lakukan '%s' untuk tanaman %s di lahan %s sekarang.", d.Kegiatan, j.NamaTanaman, j.NamaLahan)
			actionURL := "/jadwal"

			notif := models.Notification{
				UserID:    j.UserID,
				Title:     title,
				Message:   message,
				ActionURL: &actionURL,
				IsRead:    false,
			}
			config.DB.Create(&notif)

			ws.BroadcastTaskNotification(j.UserID, title, message, actionURL)
			log.Printf("🔔 Sent schedule notification to user %d: %s", j.UserID, message)
		}
	}
}
