// Authentication state
let currentUser = null;
let otpTimer = null;
let resendTimer = null;
let resendAttempts = 0;
let sessionTimer = null;
let lastActivityTime = Date.now();
let isUserActive = true;
let visibilityChangeTimer = null;

// Configuration
const INACTIVITY_TIMEOUT = 10 * 60 * 1000;
const OFFLINE_TIMEOUT = 2 * 60 * 1000;
const ACTIVITY_CHECK_INTERVAL = 30 * 1000;
const API_URL = "https://test.bulshitman1.workers.dev";

// === SESSION MANAGEMENT ===
function startSessionManagement() {
    localStorage.setItem('loginTime', Date.now().toString());
    localStorage.setItem('lastActivity', Date.now().toString());
    startActivityMonitoring();
    startSessionTimer();
    startVisibilityMonitoring();
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
        
        if (timeSinceActivity >= INACTIVITY_TIMEOUT) {
            if (timeSinceActivity >= INACTIVITY_TIMEOUT + 30000) {
                autoLogout();
                return;
            }
        }
        
        const lastActivity = parseInt(localStorage.getItem('lastActivity') || '0');
        const offlineTime = now - lastActivity;
        
        if (offlineTime >= OFFLINE_TIMEOUT && !document.hidden) {
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
            localStorage.setItem('pageHiddenTime', Date.now().toString());
        } else {
            const hiddenTime = parseInt(localStorage.getItem('pageHiddenTime') || '0');
            const now = Date.now();
            const offlineDuration = now - hiddenTime;
            
            if (hiddenTime && offlineDuration >= OFFLINE_TIMEOUT) {
                autoLogout();
                return;
            }
            updateLastActivity();
        }
    });
    
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
    
    if (lastActivity && (now - lastActivity) >= INACTIVITY_TIMEOUT + 30000) {
        autoLogout();
        return;
    }
    
    if (pageHiddenTime && (now - pageHiddenTime) >= OFFLINE_TIMEOUT + 30000) {
        autoLogout();
        return;
    }
    
    updateLastActivity();
}

function autoLogout(reason) {
    if (sessionTimer) clearInterval(sessionTimer);
    if (otpTimer) clearInterval(otpTimer);
    if (resendTimer) clearInterval(resendTimer);
    if (visibilityChangeTimer) clearInterval(visibilityChangeTimer);
    
    localStorage.removeItem('loginTime');
    localStorage.removeItem('lastActivity');
    localStorage.removeItem('pageHiddenTime');
    localStorage.removeItem('userData');
    localStorage.removeItem('nik');
    localStorage.removeItem('isOtpVerified');
    
    currentUser = null;
    resendAttempts = 0;
    
    showScreen('login-screen');
    document.getElementById('login-form').reset();
    document.getElementById('login-error').classList.add('hidden');
    
    hideOtpOverlay();
    hideLogoutModal();
}

function stopSessionManagement() {
    if (sessionTimer) clearInterval(sessionTimer);
    
    const activities = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    activities.forEach(activity => {
        document.removeEventListener(activity, updateLastActivity, true);
    });
    
    localStorage.removeItem('loginTime');
    localStorage.removeItem('lastActivity');
    localStorage.removeItem('pageHiddenTime');
    localStorage.removeItem('userData');
    localStorage.removeItem('isOtpVerified');
}

// === API LOGIN FUNCTION ===
async function login() {
    const nik = document.getElementById("nik").value;
    const password = document.getElementById("password").value;

    const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "login", nik, password })
    });

    const data = await res.json();
    console.log("Login Response:", data);

    if (data.success && data.user) {
        // Simpan user langsung dengan avatar dari login
        const loginUser = {
            nik: data.user.NIK || data.user.nik || nik,
            username: data.user.Username || data.user.username || "User",
            email: data.user.Email || data.user.email || null,
            role: data.user.Role || data.user.role || "Member",
            avatar: data.user.ProfilAvatar || data.user.avatar || null
        };

        localStorage.setItem("userData", JSON.stringify(loginUser));
        localStorage.setItem("nik", nik);
        localStorage.setItem("isOtpVerified", "false");

        currentUser = loginUser;

        resendAttempts = 0;
        showOtpOverlay();
        startOtpTimer();
        startResendCooldown(60);
    } else {
        showLoginError(data.message || "Login gagal");
    }
}


function startResendCooldown(seconds) {
    const resendBtn = document.getElementById('resend-otp');
    const resendTimerElement = document.getElementById('resend-timer');
    clearInterval(resendTimer);

    let remaining = seconds;
    resendBtn.disabled = true;
    
    const formatTime = (totalSeconds) => {
        if (totalSeconds >= 60) {
            const minutes = Math.floor(totalSeconds / 60);
            const secs = totalSeconds % 60;
            return secs > 0 ? `${minutes}m ${secs}s` : `${minutes}m`;
        }
        return `${totalSeconds}s`;
    };
    
    resendBtn.innerHTML = `Kirim Ulang (<span id="resend-timer">${formatTime(remaining)}</span>)`;

    resendTimer = setInterval(() => {
        remaining--;
        if (remaining > 0) {
            resendTimerElement.textContent = formatTime(remaining);
        } else {
            clearInterval(resendTimer);
            resendBtn.disabled = false;
            resendBtn.innerHTML = 'Kirim Ulang';
        }
    }, 1000);
}

function showScreen(screenId) {
    const screens = ['login-screen', 'dashboard-screen'];
    screens.forEach(id => {
        document.getElementById(id).classList.add('hidden');
    });
    document.getElementById(screenId).classList.remove('hidden');
}

function showOtpOverlay() {
    document.getElementById('otp-overlay').classList.add('active');
    document.body.style.overflow = 'hidden';
    setTimeout(() => {
        document.querySelector('.otp-input').focus();
    }, 300);
}

function hideOtpOverlay() {
    document.getElementById('otp-overlay').classList.remove('active');
    document.body.style.overflow = '';
    clearInterval(otpTimer);
    clearInterval(resendTimer);
    resendAttempts = 0;
    document.querySelectorAll('.otp-input').forEach(input => {
        input.value = '';
        input.classList.remove('filled');
    });
}

function showLogoutModal() {
    document.getElementById('logout-modal').classList.add('active');
    document.body.style.overflow = 'hidden';
}

function hideLogoutModal() {
    document.getElementById('logout-modal').classList.remove('active');
    document.body.style.overflow = '';
}

function handleLogout() {
    showLogoutModal();
}

function confirmLogout() {
    stopSessionManagement();
    currentUser = null;
    resendAttempts = 0;
    hideLogoutModal();
    showScreen('login-screen');
    document.getElementById('login-form').reset();
    document.getElementById('login-error').classList.add('hidden');
    if (otpTimer) clearInterval(otpTimer);
    if (resendTimer) clearInterval(resendTimer);
    hideOtpOverlay();
}

function initializeDashboard() {
    const userData = JSON.parse(localStorage.getItem("userData"));
    if (!userData) return;

    document.getElementById("userNameSidebar").textContent = userData.username || "User";
    document.getElementById("userRoleSidebar").textContent = userData.role || "Member";
    document.getElementById("mobile-user-name").textContent = userData.username || "User";
    document.getElementById("dashboard-title").textContent = `Selamat datang, ${userData.username || "User"}`;

    if (userData.avatar) {
        document.getElementById("user-avatar").src = userData.avatar;
    }

    currentUser = userData; // supaya session management tahu
    initializeLogout();
}

function updateProfileImages() {
    const sidebarProfileImage = document.getElementById('sidebarProfileImage');
    const headerProfileImage = document.querySelector('header .w-8.h-8.bg-blue-600');
    const mobileProfileContainer = document.querySelector('#mobile-nav-overlay .w-12.h-12.bg-gradient-to-r');
    
    if (currentUser && currentUser.avatar) {
        const avatarUrl = `https://test.bulshitman1.workers.dev/avatar?url=${encodeURIComponent(currentUser.avatar)}`;
        
        if (sidebarProfileImage) {
            sidebarProfileImage.innerHTML = `<img src="${avatarUrl}" alt="Profile" class="w-full h-full object-cover rounded-full" onerror="this.style.display='none'; this.parentElement.innerHTML='<i class="fas fa-user text-white text-sm\\"></i>'">`;
        }
        
        if (headerProfileImage) {
            headerProfileImage.innerHTML = `<img src="${avatarUrl}" alt="Profile" class="w-full h-full object-cover rounded-full" onerror="this.style.display='none'; this.parentElement.innerHTML='<i class=\\"fas fa-user text-white text-sm\\"></i>'">`;
        }
        
        if (mobileProfileContainer) {
            mobileProfileContainer.innerHTML = `<img src="${avatarUrl}" alt="Profile" class="w-full h-full object-cover rounded-full" onerror="this.style.display='none'; this.parentElement.innerHTML='<i class=\\"fas fa-user text-white\\"></i>'">`;
        }
    }
}

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

function showOtpError(message) {
    const otpError = document.getElementById('otp-error');
    const otpErrorText = document.getElementById('otp-error-text');
    otpErrorText.textContent = message;
    otpError.classList.remove('hidden');
}

function startOtpTimer() {
    let timeLeft = 120;
    const timerElement = document.getElementById('otp-timer');
    
    otpTimer = setInterval(() => {
        const minutes = Math.floor(timeLeft / 60);
        const seconds = timeLeft % 60;
        timerElement.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
        if (timeLeft <= 0) {
            clearInterval(otpTimer);
            showOtpError('Kode OTP telah kedaluwarsa');
        }
        timeLeft--;
    }, 1000);
}

// === VERIFY OTP ===
async function verifyOtp(otp) {
    const nik = JSON.parse(localStorage.getItem("userData"))?.nik;

    try {
        const res = await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "verify-otp", nik, otp })
        });

        const data = await res.json();
        console.log("OTP Response:", data);

        if (data.success) {
            // Jangan overwrite avatar dari login, cukup update status verified
            let updatedUser = JSON.parse(localStorage.getItem("userData"));

            // update field lain kalau ada
            updatedUser.username = data.user.Username || data.user.username || updatedUser.username;
            updatedUser.email = data.user.Email || data.user.email || updatedUser.email;
            updatedUser.role = data.user.Role || data.user.role || updatedUser.role;

            currentUser = updatedUser;
            localStorage.setItem("userData", JSON.stringify(updatedUser));
            localStorage.setItem("isOtpVerified", "true");

            return true;
        }
        return false;
    } catch (error) {
        console.error("OTP verify error:", error);
        return false;
    }
}


async function resendOtp() {
    const nik = localStorage.getItem("nik");
    
    try {
        const res = await fetch(API_URL, {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({ action: "resend-otp", nik })
        });

        const data = await res.json();
        alert(data.message);

        resendAttempts++;
        const cooldownSeconds = resendAttempts * 5 * 60;
        startResendCooldown(cooldownSeconds);
        
    } catch (error) {
        alert('Gagal mengirim ulang OTP. Silakan coba lagi.');
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Login form handler
    document.getElementById('login-form').addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const nik = document.getElementById('nik').value;
        const password = document.getElementById('password').value;
        const loginBtn = document.getElementById('login-btn');
        const loginBtnText = document.getElementById('login-btn-text');
        const loginSpinner = document.getElementById('login-spinner');
        const loginError = document.getElementById('login-error');

        if (nik.length !== 16 || !/^\d+$/.test(nik)) {
            showLoginError('NIK harus berupa 16 digit angka');
            return;
        }

        loginBtn.disabled = true;
        loginBtnText.textContent = 'Memverifikasi...';
        loginSpinner.style.display = 'inline-block';
        loginError.classList.add('hidden');

        try {
            await login();
        } catch (error) {
            showLoginError('Koneksi bermasalah. Silakan coba lagi.');
        }

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
            
            if (!/^\d*$/.test(value)) {
                e.target.value = '';
                return;
            }

            if (value) {
                e.target.classList.add('filled');
            } else {
                e.target.classList.remove('filled');
            }

            if (value && index < otpInputs.length - 1) {
                otpInputs[index + 1].focus();
            }

            const allFilled = Array.from(otpInputs).every(input => input.value);
            if (allFilled) {
                setTimeout(() => {
                    document.getElementById('otp-form').dispatchEvent(new Event('submit'));
                }, 100);
            }
        });

        input.addEventListener('keydown', function(e) {
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

    // OTP form submission
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

        otpBtn.disabled = true;
        otpBtnText.textContent = 'Memverifikasi...';
        otpSpinner.style.display = 'inline-block';
        otpError.classList.add('hidden');

        verifyOtp(otpValue).then(success => {
            if (success) {
                hideOtpOverlay();
                showScreen('dashboard-screen');
                initializeDashboard();
                startSessionManagement();
            } else {
                showOtpError('Kode OTP tidak valid');
                otpInputs.forEach(input => {
                    input.value = '';
                    input.classList.remove('filled');
                });
                otpInputs[0].focus();
            }

            otpBtn.disabled = false;
            otpBtnText.textContent = 'Verifikasi';
            otpSpinner.style.display = 'none';
        });
    });

    // Resend OTP
    document.getElementById('resend-otp').addEventListener('click', resendOtp);

    // Cancel OTP
    document.getElementById('otp-cancel').addEventListener('click', function() {
        hideOtpOverlay();
    });

    // Dark mode for login
    document.getElementById('login-dark-mode-toggle').addEventListener('click', function() {
        const icon = document.getElementById('login-dark-mode-icon');
        document.documentElement.classList.toggle('dark');
        
        if (document.documentElement.classList.contains('dark')) {
            icon.className = 'fas fa-sun';
        } else {
            icon.className = 'fas fa-moon';
        }
    });

    // Session check on page load
    const loginTime = parseInt(localStorage.getItem('loginTime') || '0');
    const lastActivity = parseInt(localStorage.getItem('lastActivity') || '0');
    const pageHiddenTime = parseInt(localStorage.getItem('pageHiddenTime') || '0');
    const storedNik = localStorage.getItem('nik');
    const storedUserData = localStorage.getItem('userData');
    const isOtpVerified = localStorage.getItem('isOtpVerified') === 'true';
    const now = Date.now();
    
    if (loginTime && lastActivity && storedNik && storedUserData && isOtpVerified) {
        try {
            currentUser = JSON.parse(storedUserData);
        } catch (e) {
            currentUser = { nik: storedNik, name: 'User', role: 'Member', avatar: null };
        }

        const timeSinceActivity = now - lastActivity;
        const timeSinceHidden = pageHiddenTime ? now - pageHiddenTime : 0;
        
        if (timeSinceActivity < INACTIVITY_TIMEOUT + 30000 && 
            (!pageHiddenTime || timeSinceHidden < OFFLINE_TIMEOUT + 30000)) {
            showScreen('dashboard-screen');
            initializeDashboard();
            startSessionManagement();
            return;
        }
    }

    showScreen('login-screen');
});
