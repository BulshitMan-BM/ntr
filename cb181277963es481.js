// Authentication state
let currentUser = null;
let otpTimer = null;
let resendTimer = null;
let resendAttempts = 0; // Track resend attempts for progressive cooldown

// Session Management
let sessionTimer = null;
let lastActivityTime = Date.now();
let isUserActive = true;
let visibilityChangeTimer = null;

// Configuration
const INACTIVITY_TIMEOUT = 10 * 60 * 1000; // 10 minutes of inactivity
const OFFLINE_TIMEOUT = 2 * 60 * 1000; // 2 minutes offline/tab closed
const ACTIVITY_CHECK_INTERVAL = 30 * 1000; // Check every 30 seconds

// API Configuration
const API_URL = "https://test.bulshitman1.workers.dev";
let currentCaptcha = '';
let captchaVerified = false;
// === FUNGSI GENERATE CAPTCHA ===
function generateCaptcha() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
    currentCaptcha = Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    const captchaText = document.getElementById('captcha-text');
    if(captchaText) captchaText.textContent = currentCaptcha;
}

// === FUNGSI VALIDASI CAPTCHA ===
function validateCaptcha(input) {
    return input === currentCaptcha;
}

// === FUNGSI RESET CAPTCHA ===
function resetCaptcha() {
    generateCaptcha();
    const captchaInput = document.getElementById('captcha');
    if(captchaInput) captchaInput.value = '';
    captchaVerified = false;
}
// === SESSION MANAGEMENT ===
function startSessionManagement() {
    // Save login time
    localStorage.setItem('loginTime', Date.now().toString());
    localStorage.setItem('lastActivity', Date.now().toString());
    
    // Start activity monitoring
    startActivityMonitoring();
    
    // Start session timer
    startSessionTimer();
    
    // Monitor page visibility
    startVisibilityMonitoring();
    
    // Check for existing session on page load
    checkExistingSession();
}

function startActivityMonitoring() {
    const activities = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    
    activities.forEach(activity => {
        document.addEventListener(activity, updateLastActivity, true);
    });
}

function updateLastActivity() {
    lastActivityTime = Date.now();
    localStorage.setItem('lastActivity', lastActivityTime.toString());
    isUserActive = true;
}

function startSessionTimer() {
    if (sessionTimer) clearInterval(sessionTimer);
    
    sessionTimer = setInterval(() => {
        const now = Date.now();
        const timeSinceActivity = now - lastActivityTime;
        
        // Check for inactivity timeout with grace period
        if (timeSinceActivity >= INACTIVITY_TIMEOUT) {
            // Give 30 seconds grace period to resume activity
            if (timeSinceActivity >= INACTIVITY_TIMEOUT + 30000) {
                autoLogout();
                return;
            }
        }
        
        // Check if user was offline too long with grace period
        const lastActivity = parseInt(localStorage.getItem('lastActivity') || '0');
        const offlineTime = now - lastActivity;
        
        if (offlineTime >= OFFLINE_TIMEOUT && !document.hidden) {
            // Give 30 seconds grace period after coming back online
            if (offlineTime >= OFFLINE_TIMEOUT + 30000) {
                autoLogout();
                return;
            }
        }
        
    }, ACTIVITY_CHECK_INTERVAL);
}

function startVisibilityMonitoring() {
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            // Page became hidden (tab switched, minimized, etc.)
            localStorage.setItem('pageHiddenTime', Date.now().toString());
        } else {
            // Page became visible again
            const hiddenTime = parseInt(localStorage.getItem('pageHiddenTime') || '0');
            const now = Date.now();
            const offlineDuration = now - hiddenTime;
            
            if (hiddenTime && offlineDuration >= OFFLINE_TIMEOUT) {
                autoLogout();
                return;
            }
            
            // Update activity when page becomes visible
            updateLastActivity();
        }
    });
    
    // Handle page unload
    window.addEventListener('beforeunload', () => {
        localStorage.setItem('pageHiddenTime', Date.now().toString());
    });
}

function checkExistingSession() {
    const loginTime = parseInt(localStorage.getItem('loginTime') || '0');
    const lastActivity = parseInt(localStorage.getItem('lastActivity') || '0');
    const pageHiddenTime = parseInt(localStorage.getItem('pageHiddenTime') || '0');
    const now = Date.now();
    
    if (!loginTime || !currentUser) return;
    
    // Check if last activity was too long ago with grace period
    if (lastActivity && (now - lastActivity) >= INACTIVITY_TIMEOUT + 30000) {
        autoLogout();
        return;
    }
    
    // Check if page was hidden too long with grace period
    if (pageHiddenTime && (now - pageHiddenTime) >= OFFLINE_TIMEOUT + 30000) {
        autoLogout();
        return;
    }
    
    // Update activity time
    updateLastActivity();
}

// === PERBAIKAN PADA FUNGSI autoLogout ===
function autoLogout(reason) {
    // Hapus status verifikasi OTP
    setOtpVerifiedStatus(false);
    
    // Clear semua timer
    if (sessionTimer) clearInterval(sessionTimer);
    if (otpTimer) clearInterval(otpTimer);
    if (resendTimer) clearInterval(resendTimer);
    if (visibilityChangeTimer) clearInterval(visibilityChangeTimer);
    
    // Clear session data
    localStorage.removeItem('loginTime');
    localStorage.removeItem('lastActivity');
    localStorage.removeItem('pageHiddenTime');
    localStorage.removeItem('userData');
    localStorage.removeItem('nik');
    
    // Reset user state
    currentUser = null;
    resendAttempts = 0;
    otpVerified = false;
    
    // Reset captcha
    resetCaptcha();
    
    // Redirect ke login
    showScreen('login-screen');
    document.getElementById('login-form').reset();
    document.getElementById('login-error').classList.add('hidden');
    
    // Reset sidebar state
    sidebarExpanded = true;
    if (sidebar) {
        sidebar.style.width = '256px';
        header.style.left = '256px';
        mainContent.style.marginLeft = '256px';
    }
    
    // Hide semua modal yang terbuka
    hideOtpOverlay();
    hideLogoutModal();
}


function stopSessionManagement() {
    if (sessionTimer) clearInterval(sessionTimer);
    
    // Remove activity listeners
    const activities = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    activities.forEach(activity => {
        document.removeEventListener(activity, updateLastActivity, true);
    });
    
    // Clear session data
    localStorage.removeItem('loginTime');
    localStorage.removeItem('lastActivity');
    localStorage.removeItem('pageHiddenTime');
    localStorage.removeItem('userData');
}

// === API LOGIN FUNCTION ===
async function login() {
    const nik = document.getElementById("nik").value;
    const password = document.getElementById("password").value;

    const res = await fetch(API_URL, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({ action: "login", nik, password })
    });

    const data = await res.json();

if (data.success && data.step === "otp") {
    localStorage.setItem("nik", nik);
    
    // Store comprehensive user data from API response
    currentUser = { 
        nik,
        email: data.user?.email || '' 
    };
    
    localStorage.setItem("userData", JSON.stringify(currentUser));
        
        // Reset resend attempts on new login
        resendAttempts = 0;
        
        showOtpOverlay();
        startOtpTimer();
        
        // Initial resend cooldown: 1 minute
        startResendCooldown(60);
    } else {
        showLoginError(data.message || 'Login gagal');
    }
}

// Update the startResendCooldown function to ensure it works properly
function startResendCooldown(seconds) {
    const resendBtn = document.getElementById('resend-otp');
    clearInterval(resendTimer);

    let remaining = seconds;
    resendBtn.disabled = true;
    
    // Format time display
    const formatTime = (totalSeconds) => {
        if (totalSeconds >= 60) {
            const minutes = Math.floor(totalSeconds / 60);
            const secs = totalSeconds % 60;
            return secs > 0 ? `${minutes}m ${secs}s` : `${minutes}m`;
        }
        return `${totalSeconds}s`;
    };
    
    // Update button text immediately
    resendBtn.innerHTML = `Kirim Ulang (<span id="resend-timer">${formatTime(remaining)}</span>)`;
    
    // Ensure the timer element is visible
    const timerElement = document.getElementById('resend-timer');
    if (timerElement) {
        timerElement.style.display = 'inline';
    }

    resendTimer = setInterval(() => {
        remaining--;
        if (remaining > 0) {
            const timerElement = document.getElementById('resend-timer');
            if (timerElement) {
                timerElement.textContent = formatTime(remaining);
            }
        } else {
            clearInterval(resendTimer);
            resendBtn.disabled = false;
            resendBtn.innerHTML = 'Kirim Ulang';
        }
    }, 1000);
}
function showScreen(screenId) {
    const screens = ['login-screen', 'dashboard-screen'];

    // 🚨 Cek validasi sebelum boleh buka dashboard
    if (screenId === 'dashboard-screen' && (!currentUser || !currentUser.name)) {
        // User belum OTP → jangan kasih buka dashboard
        screenId = 'login-screen';
    }

    screens.forEach(id => {
        document.getElementById(id).classList.add('hidden');
    });
    document.getElementById(screenId).classList.remove('hidden');
}

// Screen management
function showScreen(screenId) {
    const screens = ['login-screen', 'dashboard-screen'];
    
    // Proteksi khusus untuk dashboard
    if (screenId === 'dashboard-screen') {
        // Periksa apakah OTP sudah diverifikasi
        if (!checkOtpVerification()) {
            // Jika tidak terverifikasi, tampilkan pesan error dan tetap di login screen
            showScreen('login-screen');
            showLoginError('Sesi telah berakhir. Silakan login kembali.');
            
            // Clear semua data yang tersimpan
            autoLogout();
            return;
        }
    }
    
    // Lanjutkan dengan menampilkan screen seperti biasa
    screens.forEach(id => {
        document.getElementById(id).classList.add('hidden');
    });
    
    // Pastikan dashboard hanya ditampilkan jika OTP terverifikasi
    if (screenId === 'dashboard-screen' && checkOtpVerification()) {
        document.getElementById(screenId).classList.remove('hidden');
    } else if (screenId !== 'dashboard-screen') {
        document.getElementById(screenId).classList.remove('hidden');
    }
}

// OTP Overlay management
function showOtpOverlay() {
    document.getElementById('otp-overlay').classList.add('active');
    document.body.style.overflow = 'hidden';
    // Focus first OTP input
    setTimeout(() => {
        document.querySelector('.otp-input').focus();
    }, 300);
}

// === PERBAIKAN PADA FUNGSI hideOtpOverlay ===
function hideOtpOverlay() {
    document.getElementById('otp-overlay').classList.remove('active');
    document.body.style.overflow = '';
    clearInterval(otpTimer);
    clearInterval(resendTimer);
    resendAttempts = 0; // Reset resend attempts when closing OTP
    
    // Clear OTP inputs
    document.querySelectorAll('.otp-input').forEach(input => {
        input.value = '';
        input.classList.remove('filled');
    });
    
    // Reset captcha saat kembali ke login
    if (!captchaVerified) {
        resetCaptcha();
    }
}

// Logout Modal Management
function showLogoutModal() {
    document.getElementById('logout-modal').classList.add('active');
    document.body.style.overflow = 'hidden';
}

function hideLogoutModal() {
    document.getElementById('logout-modal').classList.remove('active');
    document.body.style.overflow = '';
}

// Logout functionality
function handleLogout() {
    showLogoutModal();
}

// === PERBAIKAN PADA FUNGSI confirmLogout ===
function confirmLogout() {
    // Hentikan session management
    stopSessionManagement();
    
    // Hapus status verifikasi OTP
    setOtpVerifiedStatus(false);
    
    currentUser = null;
    resendAttempts = 0;
    hideLogoutModal();
    showScreen('login-screen');
    document.getElementById('login-form').reset();
    document.getElementById('login-error').classList.add('hidden');
    
    // Reset captcha
    resetCaptcha();
    
    // Reset sidebar state
    sidebarExpanded = true;
    if (sidebar) {
        sidebar.style.width = '256px';
        header.style.left = '256px';
        mainContent.style.marginLeft = '256px';
    }
    
    // Clear semua timer
    if (otpTimer) clearInterval(otpTimer);
    if (resendTimer) clearInterval(resendTimer);
    
    // Hide OTP overlay jika terbuka
    hideOtpOverlay();
}

// Dashboard initialization
function initializeDashboard() {
    // Update user info
    if (currentUser) {
        document.getElementById('userNameSidebar').textContent = currentUser.name;
        document.getElementById('userRoleSidebar').textContent = currentUser.role;
        document.getElementById('mobile-user-name').textContent = currentUser.name;
        document.getElementById('dashboard-title').textContent = `Dashboard - ${currentUser.name}`;
        
        // Update profile images
        updateProfileImages();
    }

    // Initialize dashboard functionality
    handleResize();
    updateNavToggleVisibility();
    initializeLogout();
    
    setTimeout(() => {
        setNavigationHeight();
    }, 100);
}

// Update profile images with avatar from API
function updateProfileImages() {
    const sidebarProfileImage = document.getElementById('sidebarProfileImage');
    const headerProfileImage = document.querySelector('header .w-8.h-8.bg-blue-600');
    const mobileProfileContainer = document.querySelector('#mobile-nav-overlay .w-12.h-12.bg-gradient-to-r');
    
    if (currentUser && currentUser.avatar) {
        // Construct avatar URL using your API endpoint
        const avatarUrl = `https://test.bulshitman1.workers.dev/avatar?url=${encodeURIComponent(currentUser.avatar)}`;
        
        // Create image element for sidebar
        if (sidebarProfileImage) {
            sidebarProfileImage.innerHTML = `<img src="${avatarUrl}" alt="Profile" class="w-full h-full object-cover rounded-full" onerror="this.style.display='none'; this.parentElement.innerHTML='<i class="fas fa-user text-white text-sm\\"></i>`;
        }
        
        // Create image element for header
        if (headerProfileImage) {
            headerProfileImage.innerHTML = `<img src="${avatarUrl}" alt="Profile" class="w-full h-full object-cover rounded-full" onerror="this.style.display='none'; this.parentElement.innerHTML='<i class=\\"fas fa-user text-white text-sm\\"></i>`;
        }
        
        // Create image element for mobile nav
        if (mobileProfileContainer) {
            mobileProfileContainer.innerHTML = `<img src="${avatarUrl}" alt="Profile" class="w-full h-full object-cover rounded-full" onerror="this.style.display='none'; this.parentElement.innerHTML='<i class=\\"fas fa-user text-white\\"></i>`;
        }
    }
}

// Add logout event listeners after dashboard initialization
function initializeLogout() {
    const logoutBtn = document.getElementById('logout-btn');
    const logoutCancel = document.getElementById('logout-cancel');
    const logoutConfirm = document.getElementById('logout-confirm');
    
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
    if (logoutCancel) {
        logoutCancel.addEventListener('click', hideLogoutModal);
    }
    if (logoutConfirm) {
        logoutConfirm.addEventListener('click', confirmLogout);
    }
}

function showLoginError(message) {
    const loginError = document.getElementById('login-error');
    const loginErrorText = document.getElementById('login-error-text');
    loginErrorText.textContent = message;
    loginError.classList.remove('hidden');
}

// Update showOtpError to ensure it's visible
function showOtpError(message, type = 'error') {
    const otpError = document.getElementById('otp-error');
    const otpErrorText = document.getElementById('otp-error-text');
    
    if (otpError && otpErrorText) {
        otpErrorText.textContent = message;
        otpError.classList.remove('hidden');
        
        // Hapus kelas sebelumnya
        otpError.classList.remove('error-message', 'success-message');
        
        // Tambahkan kelas sesuai jenis pesan
        otpError.classList.add(type + '-message');
        
        // Scroll to error message
        otpError.scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        // Tambahkan animasi untuk menarik perhatian
        otpError.style.animation = 'shake 0.5s ease-in-out';
        setTimeout(() => {
            otpError.style.animation = '';
        }, 500);
        
        // Sembunyikan otomatis untuk pesan sukses setelah 3 detik
        if (type === 'success') {
            setTimeout(() => {
                otpError.classList.add('hidden');
            }, 3000);
        }
    } else {
        // Fallback ke alert jika elemen error tidak ditemukan
        alert(message);
    }
}

// OTP Timer - 2 minutes
function startOtpTimer() {
    // Hentikan timer sebelumnya jika ada
    if (otpTimer) clearInterval(otpTimer);
    
    let timeLeft = 120; // 2 minutes
    const timerElement = document.getElementById('otp-timer');
    
    // Update timer immediately
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    timerElement.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    
    otpTimer = setInterval(() => {
        timeLeft--;
        const minutes = Math.floor(timeLeft / 60);
        const seconds = timeLeft % 60;
        timerElement.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
        if (timeLeft <= 0) {
            clearInterval(otpTimer);
            showOtpError('Kode OTP telah kedaluwarsa');
        }
    }, 1000);
}
// Fungsi untuk menyimpan status verifikasi OTP
function setOtpVerifiedStatus(verified) {
    otpVerified = verified;
    if (verified) {
        const timestamp = Date.now();
        localStorage.setItem(OTP_VERIFICATION_KEY, 'true');
        localStorage.setItem(OTP_TIMESTAMP_KEY, timestamp.toString());
        
        // Tambahkan checksum untuk keamanan
        const checksum = btoa(`verified_${timestamp}_${currentUser.nik}`).slice(0, 20);
        localStorage.setItem('otp_checksum', checksum);
    } else {
        localStorage.removeItem(OTP_VERIFICATION_KEY);
        localStorage.removeItem(OTP_TIMESTAMP_KEY);
        localStorage.removeItem('otp_checksum');
    }
}

// Fungsi untuk memeriksa status verifikasi OTP
function checkOtpVerification() {
    const verified = localStorage.getItem(OTP_VERIFICATION_KEY) === 'true';
    const timestamp = parseInt(localStorage.getItem(OTP_TIMESTAMP_KEY) || '0');
    const checksum = localStorage.getItem('otp_checksum');
    const expectedChecksum = btoa(`verified_${timestamp}_${currentUser?.nik}`).slice(0, 20);
    
    // Periksa apakah OTP masih valid (dalam periode waktu yang ditentukan)
    const isExpired = Date.now() - timestamp > OTP_VALIDITY_PERIOD;
    
    // Periksa checksum untuk memastikan data tidak dimanipulasi
    const checksumValid = checksum === expectedChecksum;
    
    return verified && !isExpired && checksumValid && currentUser;
}
// Update the OTP verification to handle blocked accounts
async function verifyOtp(otp) {
    const nik = localStorage.getItem("nik");
    
    try {
        const res = await fetch(API_URL, {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({ action: "verify-otp", nik, otp })
        });

        const data = await res.json();
        
        // Check if account is blocked
        if (!data.success && data.message && data.message.toLowerCase().includes('blokir')) {
            showOtpError(data.message);
            // Clear OTP inputs
            document.querySelectorAll('.otp-input').forEach(input => {
                input.value = '';
                input.classList.remove('filled');
            });
            return false;
        }
        
        // Jika OTP verification successful
        if (data.success && data.user) {
            // Update currentUser dengan data lengkap
            currentUser = {
                ...currentUser,
                name: data.user?.Username || data.user?.name || data.user?.username || data.user?.Nama || currentUser.name,
                role: data.user?.Role || data.user?.role || currentUser.role,
                avatar: data.user?.ProfilAvatar || data.user?.profileAvatar || data.user?.avatar || currentUser.avatar
            };
            
            // Simpan status verifikasi OTP
            setOtpVerifiedStatus(true);
            
            // Update localStorage dengan data user lengkap
            localStorage.setItem("userData", JSON.stringify(currentUser));
        } else if (!data.success) {
            showOtpError(data.message || 'Kode OTP salah');
            return false;
        }
        
        return data.success;
    } catch (error) {
        showOtpError('Terjadi kesalahan jaringan');
        return false;
    }
}

// === RESEND OTP ===
// === RESEND OTP ===
async function resendOtp() {
    const nik = localStorage.getItem("nik");
    const resendBtn = document.getElementById('resend-otp');
    
    // Disable button immediately to prevent multiple clicks
    resendBtn.disabled = true;
    
    try {
        const res = await fetch(API_URL, {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({ action: "resend-otp", nik })
        });

        const data = await res.json();
        
        if (data.success) {
            // Successfully resent OTP - TAMPILKAN PESAN DI FORM OTP, BUKAN ALERT
            showOtpError(data.message || 'OTP berhasil dikirim ulang', 'success');
            
            // RESET DAN MULAI ULANG TIMER OTP
            if (otpTimer) clearInterval(otpTimer);
            startOtpTimer();
            
            // Increment resend attempts
            resendAttempts++;
            
            // Calculate progressive cooldown
            const cooldownSeconds = resendAttempts * 5 * 60; // 5 minutes * attempt number
            
            // Start progressive cooldown
            startResendCooldown(cooldownSeconds);
        } else {
            // Show error message from API (including blocked account)
            showOtpError(data.message || 'Gagal mengirim ulang OTP');
            
            // Jika tombol resend tidak dinonaktifkan, aktifkan kembali
            setTimeout(() => {
                resendBtn.disabled = false;
            }, 3000);
            
            // If account is blocked, hide OTP overlay
            if (data.message && data.message.toLowerCase().includes('blokir')) {
                hideOtpOverlay();
            }
        }
        
    } catch (error) {
        showOtpError('Gagal mengirim ulang OTP. Silakan coba lagi.');
        // Jika tombol resend tidak dinonaktifkan, aktifkan kembali
        setTimeout(() => {
            resendBtn.disabled = false;
        }, 3000);
    }
}

// Initialize login functionality when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
        // Intercept upaya untuk memanipulasi DOM dan mengakses dashboard
    const originalAddClassList = DOMTokenList.prototype.add;
    const originalRemoveClassList = DOMTokenList.prototype.remove;
    
    // Override method add class untuk mencegah penghilangan class hidden pada dashboard
    DOMTokenList.prototype.add = function() {
        if (this.element && this.element.id === 'dashboard-screen' && 
            arguments[0] === 'hidden' && !checkOtpVerification()) {
            console.warn('Akses tidak sah ke dashboard dicegah');
            return; // Jangan izinkan penghilangan class hidden
        }
        return originalAddClassList.apply(this, arguments);
    };
    
    // Override method remove class untuk mencegah penghilangan class hidden pada dashboard
    DOMTokenList.prototype.remove = function() {
        if (this.element && this.element.id === 'dashboard-screen' && 
            arguments[0] === 'hidden' && !checkOtpVerification()) {
            console.warn('Akses tidak sah ke dashboard dicegah');
            return; // Jangan izinkan penghilangan class hidden
        }
        return originalRemoveClassList.apply(this, arguments);
    };
    
    // Simpan referensi ke element
    const elements = document.querySelectorAll('*');
    elements.forEach(el => {
        if (el.classList) {
            Object.defineProperty(el.classList, 'element', {
                value: el,
                writable: false
            });
        }
    });
});
    // Inisialisasi captcha
    generateCaptcha();
    
    // Event listener untuk refresh captcha
    document.getElementById('refresh-captcha')?.addEventListener('click', function() {
        generateCaptcha();
        const captchaInput = document.getElementById('captcha');
        if(captchaInput) captchaInput.value = '';
    });
        // === THEME INITIALIZATION ===
    const savedTheme = localStorage.getItem('theme') || 'light';
    if (savedTheme === 'dark') {
        document.documentElement.classList.add('dark');
        document.getElementById('login-dark-mode-icon').className = 'fas fa-sun';
    } else {
        document.documentElement.classList.remove('dark');
        document.getElementById('login-dark-mode-icon').className = 'fas fa-moon';
    }
// === PERBAIKAN PADA LOGIN FORM SUBMIT ===
document.getElementById('login-form').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const nik = document.getElementById('nik').value;
    const password = document.getElementById('password').value;
    const loginBtn = document.getElementById('login-btn');
    const loginBtnText = document.getElementById('login-btn-text');
    const loginSpinner = document.getElementById('login-spinner');
    const loginError = document.getElementById('login-error');
    const captchaInput = document.getElementById('captcha').value;

    // Validate NIK format
    if (nik.length !== 16 || !/^\d+$/.test(nik)) {
        showLoginError('NIK harus berupa 16 digit angka');
        return;
    }

    // ===== VALIDASI CAPTCHA =====
    if(!validateCaptcha(captchaInput)) {
        showLoginError('Captcha tidak sesuai');
        // TIDAK generate captcha baru, biarkan user membaca captcha yang sama
        // Hanya reset input captcha
        document.getElementById('captcha').value = '';
        return;
    }

    // Tandai captcha sudah terverifikasi
    captchaVerified = true;
    
    // Show loading
    loginBtn.disabled = true;
    loginBtnText.textContent = 'Memverifikasi...';
    loginSpinner.style.display = 'inline-block';
    loginError.classList.add('hidden');

    try {
        // Call API login
        await login();
    } catch (error) {
        showLoginError('Koneksi bermasalah. Silakan coba lagi.');
    }

    // Reset button
    loginBtn.disabled = false;
    loginBtnText.textContent = 'Masuk';
    loginSpinner.style.display = 'none';
});

    // Password toggle
    document.getElementById('toggle-password').addEventListener('click', function() {
        const passwordInput = document.getElementById('password');
        const icon = this.querySelector('i');
        
        if (passwordInput.type === 'password') {
            passwordInput.type = 'text';
            icon.className = 'fas fa-eye-slash';
        } else {
            passwordInput.type = 'password';
            icon.className = 'fas fa-eye';
        }
    });

    // OTP functionality
    const otpInputs = document.querySelectorAll('.otp-input');
    
    otpInputs.forEach((input, index) => {
        input.addEventListener('input', function(e) {
            const value = e.target.value;
            
            // Only allow numbers
            if (!/^\d*$/.test(value)) {
                e.target.value = '';
                return;
            }

            // Add filled class
            if (value) {
                e.target.classList.add('filled');
            } else {
                e.target.classList.remove('filled');
            }

            // Auto focus next input
            if (value && index < otpInputs.length - 1) {
                otpInputs[index + 1].focus();
            }

            // Auto submit when all filled
            const allFilled = Array.from(otpInputs).every(input => input.value);
            if (allFilled) {
                setTimeout(() => {
                    document.getElementById('otp-form').dispatchEvent(new Event('submit'));
                }, 100);
            }
        });

        input.addEventListener('keydown', function(e) {
            // Handle backspace
            if (e.key === 'Backspace' && !e.target.value && index > 0) {
                otpInputs[index - 1].focus();
                otpInputs[index - 1].value = '';
                otpInputs[index - 1].classList.remove('filled');
            }
        });

        input.addEventListener('paste', function(e) {
            e.preventDefault();
            const pastedData = e.clipboardData.getData('text');
            const digits = pastedData.replace(/\D/g, '').slice(0, 6);
            
            digits.split('').forEach((digit, i) => {
                if (otpInputs[i]) {
                    otpInputs[i].value = digit;
                    otpInputs[i].classList.add('filled');
                }
            });

            if (digits.length === 6) {
                setTimeout(() => {
                    document.getElementById('otp-form').dispatchEvent(new Event('submit'));
                }, 100);
            }
        });
    });

   // Update the OTP form submission to handle API messages
document.getElementById('otp-form').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const otpValue = Array.from(otpInputs).map(input => input.value).join('');
    const otpBtn = document.getElementById('otp-btn');
    const otpBtnText = document.getElementById('otp-btn-text');
    const otpSpinner = document.getElementById('otp-spinner');
    const otpError = document.getElementById('otp-error');

    if (otpValue.length !== 6) {
        showOtpError('Masukkan kode OTP 6 digit');
        return;
    }

    // Show loading
    otpBtn.disabled = true;
    otpBtnText.textContent = 'Memverifikasi...';
    otpSpinner.style.display = 'inline-block';
    otpError.classList.add('hidden');

    // Call API for OTP verification
    verifyOtp(otpValue).then(success => {
        if (success) {
            hideOtpOverlay();
            showScreen('dashboard-screen');
            initializeDashboard();
            startSessionManagement();
        } else {
            // Error message will be shown by verifyOtp function
            // Clear OTP inputs
            otpInputs.forEach(input => {
                input.value = '';
                input.classList.remove('filled');
            });
            otpInputs[0].focus();
        }

        // Reset button
        otpBtn.disabled = false;
        otpBtnText.textContent = 'Verifikasi';
        otpSpinner.style.display = 'none';
    });
});

    // Resend OTP
    document.getElementById('resend-otp').addEventListener('click', resendOtp);

    // Cancel OTP
    document.getElementById('otp-cancel').addEventListener('click', function() {
                // Reset captcha saat kembali ke halaman login
        resetCaptcha();
        hideOtpOverlay();
    });

    // Dark mode for login
document.getElementById('login-dark-mode-toggle')?.addEventListener('click', function() {
    const icon = document.getElementById('login-dark-mode-icon');
    document.documentElement.classList.toggle('dark');
    
    if (document.documentElement.classList.contains('dark')) {
        icon.className = 'fas fa-sun';
        localStorage.setItem('theme', 'dark');  // ✅ simpan preferensi
    } else {
        icon.className = 'fas fa-moon';
        localStorage.setItem('theme', 'light'); // ✅ simpan preferensi
    }
});


    // Initialize app
    const loginTime = parseInt(localStorage.getItem('loginTime') || '0');
    const lastActivity = parseInt(localStorage.getItem('lastActivity') || '0');
    const pageHiddenTime = parseInt(localStorage.getItem('pageHiddenTime') || '0');
    const storedNik = localStorage.getItem('nik');
    const storedUserData = localStorage.getItem('userData');
    const now = Date.now();
  if (loginTime && lastActivity && storedNik && storedUserData) {
    try {
        const userData = JSON.parse(storedUserData);
        currentUser = userData;
    } catch (e) {
        currentUser = null; // 🚫 jangan isi default user
    }

    const now = Date.now();
    const timeSinceActivity = now - lastActivity;
    const timeSinceHidden = pageHiddenTime ? now - pageHiddenTime : 0;

    const hasVerified = currentUser && currentUser.name; // ✅ OTP sukses baru true

    if (!hasVerified) {
        // User belum OTP → balik ke login
        autoLogout();
        return;
    }

    if (timeSinceActivity >= INACTIVITY_TIMEOUT + 30000) {
        sessionExpired = true;
        showScreen('dashboard-screen');
        initializeDashboard();
        return;
    } else if (pageHiddenTime && timeSinceHidden >= OFFLINE_TIMEOUT + 30000) {
        sessionExpired = true;
        showScreen('dashboard-screen');
        initializeDashboard();
        return;
    } else {
        // Session valid
        showScreen('dashboard-screen');
        initializeDashboard();
        startSessionManagement();
        return;
    }
}

    
    // No valid session, show login
    showScreen('login-screen');
});
