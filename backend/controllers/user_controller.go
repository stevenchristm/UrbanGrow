package controllers

import (
	"fmt"
	"net/http"
	"strconv"
	"time"

	"urbangrow-backend/config"
	"urbangrow-backend/models"

	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"
)

// GetUsers - GET /api/user
func GetUsers(c *gin.Context) {
	userID, _ := c.Get("user_id")
	uid := userID.(uint)

	var users []models.User
	config.DB.Raw("SELECT * FROM users WHERE role != 'admin' ORDER BY CASE WHEN id_user = ? THEN 1 ELSE 2 END, nama ASC", uid).Scan(&users)

	type UserResponse struct {
		IDUser   uint    `json:"id_user"`
		Nama     string  `json:"nama"`
		Email    string  `json:"email"`
		Role     string  `json:"role"`
		LogoPath *string `json:"logo_path"`
	}

	var response []UserResponse
	for _, u := range users {
		response = append(response, UserResponse{
			IDUser:   u.IDUser,
			Nama:     u.Nama,
			Email:    u.Email,
			Role:     u.Role,
			LogoPath: u.LogoPath,
		})
	}

	c.JSON(http.StatusOK, gin.H{"data": response})
}

// GetUser - GET /api/user/:id
func GetUser(c *gin.Context) {
	id := c.Param("id")
	userID, _ := c.Get("user_id")
	uid := userID.(uint)

	var idUint uint
	if _, err := fmt.Sscanf(id, "%d", &idUint); err == nil && idUint != uid {
		c.JSON(http.StatusForbidden, gin.H{"error": "Anda hanya boleh mengedit profil Anda sendiri!"})
		return
	}

	var user models.User
	if err := config.DB.Where("id_user = ?", id).First(&user).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User tidak ditemukan"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"id_user":   user.IDUser,
		"nama":      user.Nama,
		"email":     user.Email,
		"role":      user.Role,
		"logo_path": user.LogoPath,
	})
}

// UpdateUser - PUT /api/user/:id
func UpdateUser(c *gin.Context) {
	id := c.Param("id")
	userID, _ := c.Get("user_id")
	uid := userID.(uint)

	var idUint uint
	fmt.Sscanf(id, "%d", &idUint)
	if idUint != uid {
		c.JSON(http.StatusForbidden, gin.H{"error": "Anda hanya boleh mengedit profil Anda sendiri!"})
		return
	}

	nama := c.PostForm("nama")
	email := c.PostForm("email")
	passwordKonfirmasi := c.PostForm("password_konfirmasi")

	if nama == "" || email == "" || passwordKonfirmasi == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Nama, email, dan password konfirmasi harus diisi"})
		return
	}

	var user models.User
	if err := config.DB.Where("id_user = ?", id).First(&user).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User tidak ditemukan"})
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(passwordKonfirmasi)); err != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": "Password salah! Perubahan ditolak."})
		return
	}

	user.Nama = nama
	user.Email = email

	file, err := c.FormFile("logo")
	if err == nil {
		filename := strconv.FormatInt(time.Now().Unix(), 10) + "_" + file.Filename
		uploadPath := "uploads/logos/" + filename
		if err := c.SaveUploadedFile(file, uploadPath); err == nil {
			logoPath := "logos/" + filename
			user.LogoPath = &logoPath
		}
	}

	config.DB.Save(&user)

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Profil Anda berhasil diperbarui!",
		"user": gin.H{
			"id_user":   user.IDUser,
			"nama":      user.Nama,
			"email":     user.Email,
			"logo_path": user.LogoPath,
		},
	})
}
