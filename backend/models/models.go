package models

import (
	"time"
)

// User - Tabel users
type User struct {
	IDUser       uint       `gorm:"primaryKey;column:id_user;autoIncrement" json:"id_user"`
	Nama         string     `gorm:"column:nama;size:255;not null" json:"nama"`
	Email        string     `gorm:"column:email;size:255;uniqueIndex;not null" json:"email"`
	Password     string     `gorm:"column:password;size:255;not null" json:"-"`
	Role         string     `gorm:"column:role;size:50;default:petani" json:"role"`
	LogoPath     *string    `gorm:"column:logo_path;size:255" json:"logo_path"`
	ChatClearedAt *time.Time `gorm:"column:chat_cleared_at" json:"chat_cleared_at"`
	RememberToken *string   `gorm:"column:remember_token;size:100" json:"-"`
	CreatedAt    time.Time  `gorm:"column:created_at" json:"created_at"`
	UpdatedAt    time.Time  `gorm:"column:updated_at" json:"updated_at"`
}

func (User) TableName() string {
	return "users"
}

// Space - Tabel spaces (Lahan)
type Space struct {
	IDLahan     uint      `gorm:"primaryKey;column:id_lahan;autoIncrement" json:"id_lahan"`
	NamaLahan   string    `gorm:"column:nama_lahan;size:255;not null" json:"nama_lahan"`
	LokasiLahan *string   `gorm:"column:lokasi_lahan;size:255" json:"lokasi_lahan"`
	LuasLahan   float64   `gorm:"column:luas_lahan;not null" json:"luas_lahan"`
	SuhuLahan   float64   `gorm:"column:suhu_lahan;not null" json:"suhu_lahan"`
	CahayaLahan float64   `gorm:"column:cahaya_lahan;not null" json:"cahaya_lahan"`
	IDUser      uint      `gorm:"column:id_user;not null;index" json:"id_user"`
	TanggalTanam *time.Time `gorm:"column:tanggal_tanam" json:"tanggal_tanam"`
	CreatedAt   time.Time `gorm:"column:created_at" json:"created_at"`
	UpdatedAt   time.Time `gorm:"column:updated_at" json:"updated_at"`
}

func (Space) TableName() string {
	return "spaces"
}

// KatalogTanaman - Tabel katalog_tanamans
type KatalogTanaman struct {
	IDTanaman        uint    `gorm:"primaryKey;column:id_tanaman;autoIncrement" json:"id_tanaman"`
	NamaTanaman      string  `gorm:"column:nama_tanaman;size:255;not null" json:"nama_tanaman"`
	EstimasiHariPanen *int   `gorm:"column:estimasi_hari_panen" json:"estimasi_hari_panen"`
	SuhuMin          float64 `gorm:"column:suhu_min" json:"suhu_min"`
	SuhuMax          float64 `gorm:"column:suhu_max" json:"suhu_max"`
	CahayaJam        float64 `gorm:"column:cahaya_jam" json:"cahaya_jam"`
	HumidityAvg      float64 `gorm:"column:humidity_avg" json:"humidity_avg"`
	RainfallAvg      float64 `gorm:"column:rainfall_avg" json:"rainfall_avg"`
	CahayaMin        float64 `gorm:"column:cahaya_min" json:"cahaya_min"`
	RentangSuhu      *string `gorm:"column:rentang_suhu;size:255" json:"rentang_suhu"`
	JarakTanamIdeal  *string `gorm:"column:jarak_tanam_ideal;size:255" json:"jarak_tanam_ideal"`
	DeskripsiEdukasi *string `gorm:"column:deskripsi_edukasi;type:text" json:"deskripsi_edukasi"`
	FotoTanaman      *string `gorm:"column:foto_tanaman;size:255" json:"foto_tanaman"`
	VideoID          *string `gorm:"column:video_id;size:255" json:"video_id"`
	CreatedAt        time.Time `gorm:"column:created_at" json:"created_at"`
	UpdatedAt        time.Time `gorm:"column:updated_at" json:"updated_at"`
}

func (KatalogTanaman) TableName() string {
	return "katalog_tanamans"
}

// Penjadwalan - Tabel penjadwalans
type Penjadwalan struct {
	ID           uint      `gorm:"primaryKey;column:id;autoIncrement" json:"id"`
	UserID       uint      `gorm:"column:user_id;not null" json:"user_id"`
	NamaLahan    string    `gorm:"column:nama_lahan;size:255" json:"nama_lahan"`
	NamaTanaman  string    `gorm:"column:nama_tanaman;size:255" json:"nama_tanaman"`
	TanggalTanam *string   `gorm:"column:tanggal_tanam" json:"tanggal_tanam"`
	CurrentStep  int       `gorm:"column:current_step;default:0" json:"current_step"`
	DurasiPanen  *int      `gorm:"column:durasi_panen" json:"durasi_panen"`
	CreatedAt    time.Time `gorm:"column:created_at" json:"created_at"`
	UpdatedAt    time.Time `gorm:"column:updated_at" json:"updated_at"`
	Details      []PenjadwalanDetail `gorm:"foreignKey:PenjadwalanID" json:"details,omitempty"`
	User         User      `gorm:"foreignKey:UserID;references:IDUser;constraint:false" json:"user,omitempty"`
}

func (Penjadwalan) TableName() string {
	return "penjadwalans"
}

// PenjadwalanDetail - Tabel penjadwalan_details
type PenjadwalanDetail struct {
	ID             uint    `gorm:"primaryKey;column:id;autoIncrement" json:"id"`
	PenjadwalanID  uint    `gorm:"column:penjadwalan_id;not null" json:"penjadwalan_id"`
	HariKe         int     `gorm:"column:hari_ke;not null" json:"hari_ke"`
	Fase           *string `gorm:"column:fase;size:255" json:"fase"`
	Kegiatan       string  `gorm:"column:kegiatan;size:255;not null" json:"kegiatan"`
	Deskripsi      string  `gorm:"column:deskripsi;type:text" json:"deskripsi"`
	AlatBahan      *string `gorm:"column:alat_bahan;type:text" json:"alat_bahan"`
	Kategori       string  `gorm:"column:kategori;size:100" json:"kategori"`
	WaktuMulai     string  `gorm:"column:waktu_mulai;size:10;default:'07:00'" json:"waktu_mulai"`
	WaktuSelesai   string  `gorm:"column:waktu_selesai;size:10;default:'09:00'" json:"waktu_selesai"`
	CreatedAt      time.Time `gorm:"column:created_at" json:"created_at"`
	UpdatedAt      time.Time `gorm:"column:updated_at" json:"updated_at"`
}

func (PenjadwalanDetail) TableName() string {
	return "penjadwalan_details"
}

// LogPerawatan - Tabel log_perawatans
type LogPerawatan struct {
	ID              uint      `gorm:"primaryKey;column:id;autoIncrement" json:"id"`
	PenjadwalanID   uint      `gorm:"column:penjadwalan_id;not null" json:"penjadwalan_id"`
	Step            int       `gorm:"column:step;not null" json:"step"`
	TanggalSelesai  time.Time `gorm:"column:tanggal_selesai" json:"tanggal_selesai"`
	CreatedAt       time.Time `gorm:"column:created_at" json:"created_at"`
	UpdatedAt       time.Time `gorm:"column:updated_at" json:"updated_at"`
}

func (LogPerawatan) TableName() string {
	return "log_perawatans"
}

// Chat - Tabel chats (AI Chat history)
type Chat struct {
	ID        uint      `gorm:"primaryKey;column:id;autoIncrement" json:"id"`
	UserID    uint      `gorm:"column:user_id;not null" json:"user_id"`
	Message   *string   `gorm:"column:message;type:text" json:"message"`
	Image     *string   `gorm:"column:image;size:255" json:"image"`
	Response  string    `gorm:"column:response;type:longtext" json:"response"`
	CreatedAt time.Time `gorm:"column:created_at" json:"created_at"`
	UpdatedAt time.Time `gorm:"column:updated_at" json:"updated_at"`
	User      User      `gorm:"foreignKey:UserID;references:IDUser;constraint:false" json:"user,omitempty"`
}

func (Chat) TableName() string {
	return "chats"
}

// ChatMessage - Tabel chat_messages (Community Chat)
type ChatMessage struct {
	ID        uint      `gorm:"primaryKey;column:id;autoIncrement" json:"id"`
	UserID    uint      `gorm:"column:user_id;not null" json:"user_id"`
	Message   string    `gorm:"column:message;type:text;not null" json:"message"`
	CreatedAt time.Time `gorm:"column:created_at" json:"created_at"`
	UpdatedAt time.Time `gorm:"column:updated_at" json:"updated_at"`
	User      User      `gorm:"foreignKey:UserID;references:IDUser;constraint:false" json:"user,omitempty"`
}

func (ChatMessage) TableName() string {
	return "chat_messages"
}

// Notification - Tabel notifications
type Notification struct {
	ID        uint      `gorm:"primaryKey;column:id;autoIncrement" json:"id"`
	UserID    uint      `gorm:"column:user_id;not null" json:"user_id"`
	Title     string    `gorm:"column:title;size:255;not null" json:"title"`
	Message   string    `gorm:"column:message;type:text;not null" json:"message"`
	ActionURL *string   `gorm:"column:action_url;size:255" json:"action_url"`
	IsRead    bool      `gorm:"column:is_read;default:false" json:"is_read"`
	CreatedAt time.Time `gorm:"column:created_at" json:"created_at"`
	UpdatedAt time.Time `gorm:"column:updated_at" json:"updated_at"`
}

func (Notification) TableName() string {
	return "notifications"
}

// Setting - Tabel settings
type Setting struct {
	ID    uint   `gorm:"primaryKey;column:id;autoIncrement" json:"id"`
	Key   string `gorm:"column:key;size:255;uniqueIndex;not null" json:"key"`
	Value string `gorm:"column:value;type:text" json:"value"`
	CreatedAt time.Time `gorm:"column:created_at" json:"created_at"`
	UpdatedAt time.Time `gorm:"column:updated_at" json:"updated_at"`
}

func (Setting) TableName() string {
	return "settings"
}
