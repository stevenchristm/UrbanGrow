package routes

import (
	"urbangrow-backend/controllers"
	"urbangrow-backend/middleware"
	ws "urbangrow-backend/websocket"

	"github.com/gin-gonic/gin"
)

func SetupRoutes(r *gin.Engine) {
	// --- CORS Middleware ---
	r.Use(func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS, PATCH")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}
		c.Next()
	})

	// --- Static Files ---
	r.Static("/uploads", "./uploads")

	// --- WebSocket ---
	r.GET("/ws", ws.HandleWS)
	r.GET("/ws/health", ws.HealthCheck)

	api := r.Group("/api")
	{
		// --- 1. PUBLIC ROUTES ---
		api.POST("/register", controllers.Register)
		api.POST("/login", controllers.Login)
		api.POST("/admin/login", controllers.AdminLogin)
		api.GET("/settings", controllers.GetSettingsPublic)

		// --- 2. PRIVATE ROUTES (Auth Required) ---
		auth := api.Group("")
		auth.Use(middleware.AuthMiddleware())
		{
			// Profile
			auth.GET("/profile", controllers.GetProfile)

			// Dashboard
			auth.GET("/dashboard", controllers.GetDashboard)

			// Lahan (Space)
			auth.GET("/lahan", controllers.GetSpaces)
			auth.POST("/lahan", controllers.CreateSpace)
			auth.GET("/lahan/:id", controllers.GetSpace)
			auth.PUT("/lahan/:id", controllers.UpdateSpace)
			auth.DELETE("/lahan/:id", controllers.DeleteSpace)
			auth.GET("/lahan/rekomendasi/:id", controllers.GetSpaceRekomendasi)

			// Katalog
			auth.GET("/katalog", controllers.GetKatalog)
			auth.POST("/katalog", controllers.CreateKatalog)
			auth.PUT("/katalog/:id", controllers.UpdateKatalog)
			auth.GET("/katalog/:id/ai-lifecycle", controllers.GetAiLifecycle)

			// Jadwal
			auth.GET("/semua-jadwal", controllers.GetJadwal)
			auth.DELETE("/semua-jadwal/:id", controllers.DestroyJadwal)
			auth.GET("/semua-jadwal/:id/attention", controllers.GetAttentionAnalysis)
			auth.POST("/complete-task/:id", controllers.CompleteTask)
			auth.POST("/jadwal/selesai", controllers.TandaiSelesai)
			auth.GET("/test-notification", controllers.TestNotification)

			// Simpan Tanam & Sync
			auth.POST("/simpan-tanam", controllers.SimpanTanam)
			auth.POST("/sync-katalog-ai", controllers.SyncKatalogAi)

			// User (Community)
			auth.GET("/user", controllers.GetUsers)
			auth.GET("/user/:id", controllers.GetUser)
			auth.PUT("/user/:id", controllers.UpdateUser)

			// AI Assistant
			auth.GET("/ai-assistant", controllers.GetAiChat)
			auth.POST("/ai-ask", controllers.AiChat)
			auth.POST("/ai-clear", controllers.AiClear)

			// Community Chat
			auth.GET("/chat/messages", controllers.GetChatMessages)
			auth.POST("/chat/send", controllers.SendChatMessage)
			auth.DELETE("/chat/clear", controllers.ClearChat)

			// --- 3. ADMIN ROUTES ---
			admin := auth.Group("/admin")
			admin.Use(middleware.AdminMiddleware())
			{
				admin.GET("/dashboard", controllers.AdminDashboard)
				admin.POST("/settings", controllers.UpdateSettings)
			}
		}
	}
}
