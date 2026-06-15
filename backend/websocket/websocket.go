package websocket

import (
	"encoding/json"
	"log"
	"net/http"
	"sync"

	"urbangrow-backend/models"

	"github.com/gin-gonic/gin"
	melody "gopkg.in/olahol/melody.v1"
)

var (
	Melody       *melody.Melody
	userSessions = make(map[*melody.Session]uint)
	mu           sync.RWMutex
)

type WSMessage struct {
	Type    string      `json:"type"`
	Payload interface{} `json:"payload"`
}

// InitWebSocket initializes the Melody WebSocket instance
func InitWebSocket() *melody.Melody {
	Melody = melody.New()
	Melody.Config.MaxMessageSize = 1024 * 10
	Melody.Upgrader.CheckOrigin = func(r *http.Request) bool {
		return true
	}

	Melody.HandleConnect(func(s *melody.Session) {
		log.Println("🔌 WebSocket client connected")
	})

	Melody.HandleDisconnect(func(s *melody.Session) {
		mu.Lock()
		delete(userSessions, s)
		mu.Unlock()
		log.Println("🔌 WebSocket client disconnected")
	})

	Melody.HandleMessage(func(s *melody.Session, msg []byte) {
		var data map[string]interface{}
		if err := json.Unmarshal(msg, &data); err != nil {
			return
		}

		// Handle auth message to associate session with user
		if msgType, ok := data["type"].(string); ok && msgType == "auth" {
			if userIDFloat, ok := data["user_id"].(float64); ok {
				userID := uint(userIDFloat)
				mu.Lock()
				userSessions[s] = userID
				mu.Unlock()
				log.Printf("🔑 WebSocket authenticated for user %d", userID)

				reply, _ := json.Marshal(WSMessage{
					Type:    "auth_success",
					Payload: map[string]interface{}{"user_id": userID},
				})
				s.Write(reply)
			}
		}
	})

	return Melody
}

// HandleWS is the Gin handler for WebSocket upgrades
func HandleWS(c *gin.Context) {
	Melody.HandleRequest(c.Writer, c.Request)
}

// BroadcastToAll sends a message to all connected clients
func BroadcastToAll(msgType string, payload interface{}) {
	msg, err := json.Marshal(WSMessage{
		Type:    msgType,
		Payload: payload,
	})
	if err != nil {
		log.Println("WebSocket broadcast marshal error:", err)
		return
	}
	Melody.Broadcast(msg)
}

// BroadcastToUser sends a message to a specific user via filter
func BroadcastToUser(userID uint, msgType string, payload interface{}) {
	msg, err := json.Marshal(WSMessage{
		Type:    msgType,
		Payload: payload,
	})
	if err != nil {
		return
	}

	mu.RLock()
	defer mu.RUnlock()

	Melody.BroadcastFilter(msg, func(s *melody.Session) bool {
		if uid, ok := userSessions[s]; ok && uid == userID {
			return true
		}
		return false
	})
}

// BroadcastChatMessage broadcasts a community chat message to all clients
func BroadcastChatMessage(chatMsg models.ChatMessage) {
	payload := map[string]interface{}{
		"id":         chatMsg.ID,
		"user_id":    chatMsg.UserID,
		"message":    chatMsg.Message,
		"created_at": chatMsg.CreatedAt,
		"user": map[string]interface{}{
			"id_user":   chatMsg.User.IDUser,
			"nama":      chatMsg.User.Nama,
			"logo_path": chatMsg.User.LogoPath,
		},
	}
	BroadcastToAll("new_message", payload)
}

// BroadcastTaskNotification sends a task notification to a specific user
func BroadcastTaskNotification(userID uint, title, message, actionURL string) {
	payload := map[string]interface{}{
		"title":      title,
		"message":    message,
		"action_url": actionURL,
	}
	BroadcastToUser(userID, "task_notification", payload)
}

// HealthCheck endpoint for WS
func HealthCheck(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"status":  "ok",
		"message": "WebSocket server is running",
	})
}
