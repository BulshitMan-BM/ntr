// ===== AUTHENTICATION SYSTEM =====
// Configuration - PERBAIKAN: Gunakan nama yang lebih profesional untuk API
const API_URL = "https://api.auth-system.example.com"; // Ganti dengan URL API yang valid
const OTP_EXPIRY_TIME = 60; // seconds
const RESEND_COOLDOWNS = [60, 600, 1800, 3600]; // Progressive cooldown in seconds

// Global variables
let currentUser = null;
let resendTimer = null;
let otpExpiryTimer = null;
let resendAttempts = 0;
let otpExpiryTime = OTP_EXPIRY_TIME;
let isCollapsed = false;
let currentCaptcha = '';
let captchaVerified = false;
let isSubmittingOTP = false;

// PERBAIKAN: Tambahkan flag untuk mencegah multiple submission
let isSubmittingLogin = false;

// PERBAIKAN: Fungsi untuk mendapatkan headers yang konsisten
function getApiHeaders() {
    return {
        "Content-Type": "application/json",
        // Tambahkan header lain jika diperlukan (seperti auth tokens)
    };
}

// PERBAIKAN: Fungsi untuk handle fetch errors dengan lebih baik
async function handleApiResponse(response) {
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }
    return response.json();
}

// PERBAIKAN: Fungsi API call yang terpusat
async function callApi(endpoint, data) {
    try {
        const response = await fetch(`${API_URL}${endpoint}`, {
            method: "POST",
            headers: getApiHeaders(),
            body: JSON.stringify(data)
        });
        return await handleApiResponse(response);
    } catch (error) {
        console.error('API call error:', error);
        throw error;
    }
}

// Fungsi captcha dan utility functions lainnya tetap sama, tapi dengan penambahan komentar
// untuk menjelaskan fungsinya dengan lebih baik...

// ===== UTILITY FUNCTIONS =====
function maskEmail(email) {
    // PERBAIKAN: Tambahkan validasi yang lebih robust
    if (!email || typeof email !== 'string' || !email.includes('@')) {
        return 'email@domain.com';
    }
    
    const [localPart, domain] = email.split('@');
    if (!localPart || !domain) {
        return 'email@domain.com';
    }
    
    let maskedLocal;
    if (localPart.length <= 2) {
        maskedLocal = '*'.repeat(localPart.length);
    } else if (localPart.length <= 4) {
        maskedLocal = localPart[0] + '*'.repeat(localPart.length - 2) + localPart[localPart.length - 1];
    } else {
        maskedLocal = localPart.substring(0, 2) + '*'.repeat(Math.max(3, localPart.length - 4)) + localPart.substring(localPart.length - 2);
    }
    
    return `${maskedLocal}@${domain}`;
}

// PERBAIKAN: Tambahkan debounce function untuk prevent multiple rapid calls
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// ===== LOGIN HANDLER =====
async function handleLogin(event) {
    event.preventDefault();

    // PERBAIKAN: Cegah multiple submission
    if (isSubmittingLogin) return false;
    isSubmittingLogin = true;

    if (!captchaVerified) {
        showInlineMessage('loginForm', 'Harap verifikasi captcha terlebih dahulu', 'error');
        isSubmittingLogin = false;
        return false;
    }

    const nik = document.getElementById('nik')?.value?.trim();
    const password = document.getElementById('password')?.value?.trim();

    clearFieldErrors();

    // PERBAIKAN: Validasi yang lebih spesifik
    if (!nik || !password) {
        showInlineMessage('loginForm', 'Harap isi semua field', 'error');
        if (!nik) highlightField('nik', true);
        if (!password) highlightField('password', true);
        isSubmittingLogin = false;
        return false;
    }

    if (nik.length !== 16 || !/^\d+$/.test(nik)) {
        showInlineMessage('loginForm', 'NIK harus 16 digit angka', 'error');
        highlightField('nik', true);
        isSubmittingLogin = false;
        return false;
    }

    if (password.length < 6) {
        showInlineMessage('loginForm', 'Password minimal 6 karakter', 'error');
        highlightField('password', true);
        isSubmittingLogin = false;
        return false;
    }

    // Start loading state
    setButtonLoading('loginButton', 'loginIcon', 'loginText', true, 'Memverifikasi...');

    try {
        // PERBAIKAN: Gunakan fungsi API terpusat
        const data = await callApi('/auth/login', { 
            action: "login", 
            nik, 
            password 
        });
        
        if (data.success && data.step === "otp") {
            localStorage.setItem("nik", nik);
            
            // Store email from login response for masking display
            const userEmail = data.email || data.user?.email || data.user?.Email;
            if (userEmail) {
                localStorage.setItem("userEmail", userEmail);
            }
            
            showInlineMessage('loginForm', data.message || 'Login berhasil! Mengirim OTP...', 'success');
    
            setTimeout(() => {
                showOTPForm(userEmail);
                startResendCooldown(getNextResendCooldown());
            }, 1500);
        } else {
            showInlineMessage('loginForm', data.message || 'Login gagal. Periksa NIK dan password Anda.', 'error');
            
            // Shake animation for error
            const loginForm = document.getElementById('loginForm');
            if (loginForm) {
                loginForm.style.animation = 'shake 0.5s ease-in-out';
                setTimeout(() => {
                    loginForm.style.animation = '';
                }, 500);
            }
        }
    } catch (error) {
        console.error('Login error:', error);
        showInlineMessage('loginForm', 'Terjadi kesalahan koneksi. Silakan coba lagi.', 'error');
    } finally {
        // Always reset loading state
        setTimeout(() => {
            setButtonLoading('loginButton', 'loginIcon', 'loginText', false);
            isSubmittingLogin = false;
        }, 1000);
    }
    
    return false;
}

// PERBAIKAN: Tambahkan fungsi untuk membersihkan state secara lengkap
function clearAuthState() {
    currentUser = null;
    resendAttempts = 0;
    otpExpiryTime = OTP_EXPIRY_TIME;
    captchaVerified = false;
    isSubmittingOTP = false;
    isSubmittingLogin = false;
    
    // Clear timers
    if (resendTimer) clearInterval(resendTimer);
    if (otpExpiryTimer) clearInterval(otpExpiryTimer);
    resendTimer = null;
    otpExpiryTimer = null;
    
    // Clear inputs
    clearOTPInputs();
    clearFieldErrors();
    
    // Clear messages
    clearInlineMessages('loginForm');
    clearInlineMessages('otpForm');
    
    // Generate new captcha
    generateCaptcha();
}

// PERBAIKAN: Di fungsi logout, panggil clearAuthState
function logout() {
    try {
        // Tampilkan login, sembunyikan dashboard
        document.getElementById('loginContainer')?.classList.remove('hidden');
        document.getElementById('dashboardContainer')?.classList.add('hidden');

        // Reset login & OTP form
        backToLogin(); 
        clearAuthState(); // Gunakan fungsi clear state yang baru

        // Reset localStorage / sessionStorage
        ['nik','userEmail','user','isLoggedIn', 'otpValue','theme'].forEach(k => localStorage.removeItem(k));
        sessionStorage.clear();

        // Reset dark mode: hapus listener lama dengan cloneNode
        const dashboardDarkModeToggle = document.getElementById('dashboardDarkModeToggle');
        if (dashboardDarkModeToggle) {
            const newToggle = dashboardDarkModeToggle.cloneNode(true);
            dashboardDarkModeToggle.replaceWith(newToggle);
        }
        document.documentElement.classList.remove('dark');
        updateDashboardDarkModeIcons(false);

        // Reset sidebar/menu
        const sidebar = document.getElementById('sidebar');
        sidebar?.classList.replace('w-16', 'w-64');
        document.getElementById('logoText')?.classList.remove('opacity-0','hidden');
        document.querySelectorAll('.sidebar-text').forEach(t => t.classList.remove('hidden'));
        closeAllSubmenus();
        document.querySelectorAll("[id^='mobile-'][id$='-submenu']").forEach(el => el.classList.add("hidden"));
        document.querySelectorAll("[id^='mobile-'][id$='-arrow']").forEach(el => el.classList.remove("rotate-180"));

        // Reset mobile overlay
        const mobileOverlay = document.getElementById('mobileOverlay');
        if (mobileOverlay) {
            mobileOverlay.classList.add('hidden');
            document.body.style.overflow = 'auto';
        }

    } catch (err) {
        console.error('Logout error:', err);
    }
}

// ... (fungsi-fungsi lainnya tetap sama dengan perbaikan minor)

// ================== INITIALIZATION ==================
document.addEventListener('DOMContentLoaded', function() {
    initializeDarkMode();
    initializeInputEnhancements();
    generateCaptcha();

    // PERBAIKAN: Gunakan debounce untuk captcha verification
    const verifyCaptchaDebounced = debounce(verifyCaptcha, 300);
    
    document.getElementById('captchaInput')?.addEventListener('input', () => {
        if(document.getElementById('captchaInput').value.length >= 6) {
            verifyCaptchaDebounced();
        } else {
            captchaVerified = false;
            document.getElementById('captchaErrorIcon').classList.add('hidden','opacity-0');
            document.getElementById('captchaSuccessIcon').classList.add('hidden','opacity-0');
            document.getElementById('captchaInput').classList.remove('border-green-500','border-red-500');
            document.getElementById('loginButton').disabled = true;
        }
    });

    document.getElementById('loginForm')?.addEventListener('submit', handleLogin);
    document.getElementById('otpForm')?.addEventListener('submit', handleOTPVerification);

    // ✅ Cek login state saat reload
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    const user = JSON.parse(localStorage.getItem('user') || 'null');

    if (isLoggedIn && user) {
        loadDashboard(user); // langsung tampilkan dashboard
    } else {
        // PERBAIKAN: Pastikan state bersih jika tidak logged in
        clearAuthState();
    }
});



// ====== LOAD DASHBOARD ======
function loadDashboard(user) {
    const loginContainer = document.getElementById('loginContainer');
    const dashboardContainer = document.getElementById('dashboardContainer');

    if (resendTimer) clearInterval(resendTimer);
    if (otpExpiryTimer) clearInterval(otpExpiryTimer);

    loginContainer?.classList.add('hidden');
    dashboardContainer?.classList.remove('hidden');

    localStorage.setItem('isLoggedIn', 'true');
    currentUser = user;

    updateUserInfo(user);
    initializeSidebarComponents();

    // Pasang dark mode listener yang baru
    initializeDashboardDarkMode();
}

function updateUserInfo(user) {
    const userName = user?.Username || user?.name || user?.nama || 'User';
    const userRole = user?.Role || user?.role || user?.jabatan || 'Member';
    const avatarUrl = user?.ProfilAvatar || null;

    ['userNameSidebar','userNameMobile','userNameWelcome'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = userName;
    });

    ['userRoleSidebar','userRoleMobile'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = userRole;
    });

    ['sidebarProfileImage','mobileProfileImage'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            if (avatarUrl) {
                const proxyUrl = `https://test.bulshitman1.workers.dev/avatar?url=${encodeURIComponent(avatarUrl)}`;
                el.innerHTML = `<img src="${proxyUrl}" alt="Profile" class="w-full h-full rounded-full object-cover" 
                    onerror="this.parentElement.innerHTML='<i class=\\'fas fa-user text-white text-sm\\'></i>'">`;
            } else {
                el.innerHTML = '<i class="fas fa-user text-white text-sm"></i>';
            }
        }
    });
}

// ================== SIDEBAR ==================
function initializeSidebarComponents() {
    const sidebar = document.getElementById('sidebar');
    const header = document.getElementById('header');
    const sidebarToggleDesktop = document.getElementById('sidebarToggleDesktop');
    const sidebarToggleMobile = document.getElementById('sidebarToggleMobile');
    const mobileOverlay = document.getElementById('mobileOverlay');
    const closeMobileMenuBtn = document.getElementById('closeMobileMenu');
    const logoText = document.getElementById('logoText');
    const sidebarTexts = document.querySelectorAll('.sidebar-text');
    const sidebarToggleHeader = document.getElementById('sidebarToggleHeader');

    if (sidebarToggleHeader) sidebarToggleHeader.style.display = 'none';

function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const header = document.getElementById('header');
    const logoText = document.getElementById('logoText');
    const sidebarTexts = document.querySelectorAll('.sidebar-text');
    const sidebarToggleDesktop = document.getElementById('sidebarToggleDesktop');
    const sidebarToggleHeader = document.getElementById('sidebarToggleHeader');

    if (!sidebar) return;

    isCollapsed = !isCollapsed;

    if (isCollapsed) {
        // === Collapsed ===
        sidebar.classList.replace('w-64', 'w-16');
        logoText?.classList.add('opacity-0','hidden');
        sidebarTexts.forEach(t => t.classList.add('hidden'));
        if (sidebarToggleDesktop) sidebarToggleDesktop.innerHTML = '<i class="fas fa-chevron-right text-sm"></i>';
        if (sidebarToggleHeader) sidebarToggleHeader.style.display = 'block';
        if (header) {
            header.style.marginLeft = '-4rem';
            header.style.zIndex = '30';
        }

        // Tutup semua submenu saat collapse
        closeAllSubmenus();

        // Sembunyikan semua panah
        document.querySelectorAll('#dtks-arrow,#usulan-arrow,#unduh-arrow,#dusun-arrow')
            .forEach(a => a.style.display = 'none');

    } else {
        // === Expanded ===
        sidebar.classList.replace('w-16','w-64');
        setTimeout(() => {
            logoText?.classList.remove('opacity-0','hidden');
            sidebarTexts.forEach(t => t.classList.remove('hidden'));

            // Tampilkan panah kembali
            document.querySelectorAll('#dtks-arrow,#usulan-arrow,#unduh-arrow,#dusun-arrow')
                .forEach(a => a.style.display = 'block');
        }, 150);

        if (sidebarToggleDesktop) sidebarToggleDesktop.innerHTML = '<i class="fas fa-chevron-left text-sm"></i>';
        if (sidebarToggleHeader) sidebarToggleHeader.style.display = 'none';
        if (header) {
            header.style.marginLeft = '0';
            header.style.zIndex = '20';
        }
    }
}

    if (sidebarToggleDesktop && !sidebarToggleDesktop.dataset.listener) {
        sidebarToggleDesktop.addEventListener('click', toggleSidebar);
        sidebarToggleDesktop.dataset.listener = "true";
    }
    if (sidebarToggleHeader && !sidebarToggleHeader.dataset.listener) {
        sidebarToggleHeader.addEventListener('click', toggleSidebar);
        sidebarToggleHeader.dataset.listener = "true";
    }
    if (sidebarToggleMobile && !sidebarToggleMobile.dataset.listener) {
        sidebarToggleMobile.addEventListener('click', () => {
            sidebar?.classList.remove('hidden');
            mobileOverlay?.classList.remove('hidden');
            document.body.style.overflow = 'hidden';
        });
        sidebarToggleMobile.dataset.listener = "true";
    }
    if (closeMobileMenuBtn && !closeMobileMenuBtn.dataset.listener) {
        closeMobileMenuBtn.addEventListener('click', () => {
            sidebar?.classList.add('hidden');
            mobileOverlay?.classList.add('hidden');
            document.body.style.overflow = 'auto';
        });
        closeMobileMenuBtn.dataset.listener = "true";
    }
    if (mobileOverlay && !mobileOverlay.dataset.listener) {
        mobileOverlay.addEventListener('click', e => {
            if (e.target === mobileOverlay) {
                sidebar?.classList.add('hidden');
                mobileOverlay.classList.add('hidden');
                document.body.style.overflow = 'auto';
            }
        });
        mobileOverlay.dataset.listener = "true";
    }

    function handleResize() {
        if (window.innerWidth < 768) {
            sidebar?.classList.add('hidden');
        } else {
            sidebar?.classList.remove('hidden');
        }
        if (window.innerWidth >= 768 && mobileOverlay) {
            mobileOverlay.classList.add('hidden');
            document.body.style.overflow = 'auto';
        }
    }
    window.addEventListener('resize', handleResize);
}
// ================== SUBMENU ==================
function toggleSubmenu(menuId) {
    const submenu = document.getElementById(menuId + '-submenu');
    const arrow = document.getElementById(menuId + '-arrow');

    if (!submenu || !arrow) return;

    // Kalau sidebar collapsed → otomatis expand dulu
    if (isCollapsed) {
        const sidebarToggleDesktop = document.getElementById('sidebarToggleDesktop');
        if (sidebarToggleDesktop) {
            sidebarToggleDesktop.click(); // expand sidebar
            setTimeout(() => {
                closeAllSubmenus(); // tutup semua submenu lain
                submenu.classList.remove('hidden'); // buka submenu yg dipilih
                arrow.classList.add('rotate-180');
            }, 300);
        }
        return;
    }

    // Kalau sidebar sudah expanded → close semua submenu lain dulu
    const isCurrentOpen = !submenu.classList.contains('hidden');
    closeAllSubmenus();

    // Toggle submenu yg diklik
    if (!isCurrentOpen) {
        submenu.classList.remove('hidden');
        arrow.classList.add('rotate-180');
    }
}

function closeAllSubmenus() {
    ['dtks','usulan','unduh','dusun'].forEach(menuId => {
        const submenu = document.getElementById(menuId + '-submenu');
        const arrow = document.getElementById(menuId + '-arrow');
        if (submenu) submenu.classList.add('hidden');
        if (arrow) arrow.classList.remove('rotate-180');
    });
}

function toggleMobileSubmenu(menuId) {
    const submenu = document.getElementById(`mobile-${menuId}-submenu`);
    const arrow = document.getElementById(`mobile-${menuId}-arrow`);
    if (!submenu || !arrow) return;

    const isCurrentlyOpen = !submenu.classList.contains("hidden");

    // Tutup semua submenu lain
    document.querySelectorAll("[id^='mobile-'][id$='-submenu']").forEach(el => {
        el.classList.add("hidden");
    });
    document.querySelectorAll("[id^='mobile-'][id$='-arrow']").forEach(el => {
        el.classList.remove("rotate-180");
    });

    // Kalau submenu ini tertutup → buka
    if (!isCurrentlyOpen) {
        submenu.classList.remove("hidden");
        arrow.classList.add("rotate-180");
    }
}

// ====== DASHBOARD DARK MODE ======
function initializeDashboardDarkMode() {
    const dashboardDarkModeToggle = document.getElementById('dashboardDarkModeToggle');
    if (!dashboardDarkModeToggle) return;

    const savedTheme = localStorage.getItem('theme') || 'light';
    if (savedTheme === 'dark') {
        document.documentElement.classList.add('dark');
        updateDashboardDarkModeIcons(true);
    } else {
        document.documentElement.classList.remove('dark');
        updateDashboardDarkModeIcons(false);
    }

    function toggleDarkMode() {
        const isDark = document.documentElement.classList.toggle('dark');
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
        updateDashboardDarkModeIcons(isDark);
    }

    // Pasang listener baru
    dashboardDarkModeToggle.addEventListener('click', toggleDarkMode);
}

function updateDashboardDarkModeIcons(isDark) {
    const dashboardMoonIcon = document.getElementById('dashboardMoonIcon');
    const dashboardSunIcon = document.getElementById('dashboardSunIcon');
    if (dashboardMoonIcon && dashboardSunIcon) {
        dashboardMoonIcon.style.display = isDark ? 'none' : 'block';
        dashboardSunIcon.style.display = isDark ? 'block' : 'none';
    }
}



