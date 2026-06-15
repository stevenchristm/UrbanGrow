package main

import (
	"log"
	"urbangrow-backend/config"
	"urbangrow-backend/models"

	"golang.org/x/crypto/bcrypt"
)

func main() {
	config.ConnectDatabase()

	email := "admin@urban.com"
	var existingAdmin models.User
	if err := config.DB.Where("email = ?", email).First(&existingAdmin).Error; err == nil {
		log.Println("Admin user already exists.")
		return
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte("admin123"), bcrypt.DefaultCost)
	if err != nil {
		log.Fatal("Failed to hash password:", err)
	}

	adminUser := models.User{
		Nama:     "Administrator",
		Email:    email,
		Password: string(hashedPassword),
		Role:     "admin",
	}

	if err := config.DB.Create(&adminUser).Error; err != nil {
		log.Fatal("Failed to create admin user:", err)
	}

	log.Println("Admin user successfully created!")
}
