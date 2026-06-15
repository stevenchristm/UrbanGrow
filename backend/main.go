package main

import (
	"log"
	"os"

	"urbangrow-backend/config"
	"urbangrow-backend/controllers"
	"urbangrow-backend/cron"
	"urbangrow-backend/models"
	"urbangrow-backend/routes"
	ws "urbangrow-backend/websocket"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
	"golang.org/x/crypto/bcrypt"
)

func main() {
	// Load .env
	godotenv.Load()

	// Connect database
	config.ConnectDatabase()

	// Auto-migrate all models
	config.DB.AutoMigrate(
		&models.User{},
		&models.Space{},
		&models.KatalogTanaman{},
		&models.Penjadwalan{},
		&models.PenjadwalanDetail{},
		&models.LogPerawatan{},
		&models.Chat{},
		&models.ChatMessage{},
		&models.Notification{},
		&models.Setting{},
	)

	// Seed admin if not exists
	seedAdmin()

	// Ensure upload directories exist
	os.MkdirAll("uploads/bibit", 0755)
	os.MkdirAll("uploads/logos", 0755)
	os.MkdirAll("uploads/chats", 0755)

	// Initialize WebSocket
	m := ws.InitWebSocket()
	_ = m

	// Wire up WebSocket broadcast for chat
	controllers.BroadcastChatMessage = ws.BroadcastChatMessage

	// Start Cron Worker for Notifications
	cron.StartNotificationWorker()

	// Setup Gin
	r := gin.Default()

	// Setup routes
	routes.SetupRoutes(r)

	// Start server
	port := os.Getenv("APP_PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("🌱 UrbanGrow Backend running on http://localhost:%s", port)
	log.Printf("📡 WebSocket available at ws://localhost:%s/ws", port)

	if err := r.Run(":" + port); err != nil {
		log.Fatal("Failed to start server:", err)
	}
}

func seedAdmin() {
	var count int64
	config.DB.Model(&models.User{}).Where("role = ?", "admin").Count(&count)
	if count == 0 {
		hashedPassword, _ := bcrypt.GenerateFromPassword([]byte("admin123"), bcrypt.DefaultCost)
		admin := models.User{
			Nama:     "Administrator",
			Email:    "admin@urbangrow.com",
			Password: string(hashedPassword),
			Role:     "admin",
		}
		config.DB.Create(&admin)
		log.Println("✅ Admin seeded: admin@urbangrow.com / admin123")
	}
}
