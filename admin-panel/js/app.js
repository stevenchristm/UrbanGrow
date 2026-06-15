const API_URL = 'http://127.0.0.1:8080/api';

// --- Authentication & Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    const isLoginPage = window.location.pathname.endsWith('index.html') || window.location.pathname.endsWith('/');
    const token = localStorage.getItem('admin_token');

    if (isLoginPage) {
        if (token) {
            window.location.href = 'dashboard.html';
        } else {
            initLogin();
        }
    } else {
        if (!token) {
            window.location.href = 'index.html';
        } else {
            initDashboard();
        }
    }
});

// --- Toast Notification ---
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    if (!toast) return;
    
    toast.className = `toast ${type} show`;
    toast.innerHTML = type === 'success' 
        ? `<i class="lucide-check-circle" style="color: var(--primary-color)"></i> ${message}`
        : `<i class="lucide-alert-circle" style="color: var(--danger-color)"></i> ${message}`;

    lucide.createIcons();
    
    setTimeout(() => {
        toast.className = 'toast';
    }, 3000);
}

// --- Login Page Logic ---
function initLogin() {
    const loginForm = document.getElementById('login-form');
    const errorMsg = document.getElementById('error-msg');
    const loginBtn = document.getElementById('login-btn');

    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;

            errorMsg.style.display = 'none';
            loginBtn.textContent = 'Memuat...';
            loginBtn.disabled = true;

            try {
                const response = await fetch(`${API_URL}/admin/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });

                const data = await response.json();

                if (response.ok) {
                    localStorage.setItem('admin_token', data.token);
                    localStorage.setItem('admin_user', JSON.stringify(data.user));
                    window.location.href = 'dashboard.html';
                } else {
                    errorMsg.textContent = data.error || 'Login gagal';
                    errorMsg.style.display = 'block';
                }
            } catch (err) {
                errorMsg.textContent = 'Terjadi kesalahan jaringan.';
                errorMsg.style.display = 'block';
            } finally {
                loginBtn.textContent = 'Masuk ke Panel Admin';
                loginBtn.disabled = false;
            }
        });
    }
}

// --- Dashboard Page Logic ---
async function initDashboard() {
    lucide.createIcons();

    // Setup Logout
    document.getElementById('logout-btn').addEventListener('click', (e) => {
        e.preventDefault();
        localStorage.removeItem('admin_token');
        localStorage.removeItem('admin_user');
        window.location.href = 'index.html';
    });

    // Display Admin Name
    const user = JSON.parse(localStorage.getItem('admin_user') || '{}');
    if (user.nama) {
        document.getElementById('admin-name').textContent = user.nama;
        document.getElementById('admin-initial').textContent = user.nama.charAt(0).toUpperCase();
    }

    // Setup Accordions
    const accordions = document.querySelectorAll('.accordion-header');
    accordions.forEach(acc => {
        acc.addEventListener('click', () => {
            const item = acc.parentElement;
            // Close others
            document.querySelectorAll('.accordion-item').forEach(other => {
                if (other !== item) other.classList.remove('active');
            });
            item.classList.toggle('active');
        });
    });

    // Fetch Settings
    await loadSettings();

    // Setup Save Buttons
    const saveForms = document.querySelectorAll('.setting-form');
    saveForms.forEach(form => {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const input = form.querySelector('.setting-input');
            const key = input.dataset.key;
            const value = input.value;
            const btn = form.querySelector('.btn-save');
            
            const originalText = btn.innerHTML;
            btn.innerHTML = '<i class="lucide-loader" style="animation: spin 1s linear infinite;"></i> Menyimpan...';
            btn.disabled = true;

            try {
                const response = await fetch(`${API_URL}/admin/settings`, {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
                    },
                    body: JSON.stringify({ [key]: value })
                });

                const data = await response.json();
                if (response.ok) {
                    showToast('Pengaturan berhasil disimpan!');
                } else {
                    showToast(data.error || 'Gagal menyimpan', 'error');
                }
            } catch (err) {
                showToast('Kesalahan jaringan', 'error');
            } finally {
                btn.innerHTML = originalText;
                btn.disabled = false;
                lucide.createIcons();
            }
        });
    });
}

async function loadSettings() {
    try {
        const response = await fetch(`${API_URL}/admin/dashboard`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('admin_token')}` }
        });
        const data = await response.json();
        
        if (response.ok && data.settings) {
            // Default texts if not set in DB
            const defaults = {
                subtitle_dashboard: 'Pusat kendali ekosistem urban Anda aktif.',
                subtitle_lahan: 'Halaman manajemen lahan',
                subtitle_jadwal: 'Pantau jadwal perawatan tanaman Anda',
                subtitle_katalog: 'Pilih bibit terbaik untuk lahan Anda',
                subtitle_komunitas: 'Terhubung, belajar, dan berkolaborasi dengan komunitas',
                subtitle_ai: 'Tanya masalah tanaman Anda'
            };

            const settings = data.settings;
            
            // Populate inputs
            document.querySelectorAll('.setting-input').forEach(input => {
                const key = input.dataset.key;
                input.value = settings[key] || defaults[key] || '';
            });
        }
    } catch (err) {
        console.error('Failed to load settings:', err);
    }
}

// Add CSS for loader
const style = document.createElement('style');
style.textContent = `
@keyframes spin { 100% { transform: rotate(360deg); } }
`;
document.head.appendChild(style);
