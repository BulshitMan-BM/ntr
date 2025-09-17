// =======================
// AUTHENTICATION SYSTEM
// =======================
const WORKER_URL = "https://pemanis.bulshitman1.workers.dev/";

// LocalStorage Helper Functions
function setSession(sessionId) {
    localStorage.setItem("sessionId", sessionId);
}

function getSession() {
    return localStorage.getItem("sessionId");
}

function clearSession() {
    localStorage.removeItem("sessionId");
}
// =======================
// CAPTCHA GENERATOR
// =======================
let generatedCaptcha = "";

function generateCaptcha() {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let captcha = "";
    for (let i = 0; i < 5; i++) {
        captcha += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    generatedCaptcha = captcha;

    const captchaEl = document.getElementById("captcha-text");
    if (captchaEl) {
        captchaEl.innerHTML = "";
        for (let char of captcha) {
            const span = document.createElement("span");
            span.textContent = char;
            span.style.display = "inline-block";
            span.style.transform = `rotate(${(Math.random() - 0.5) * 30}deg)`;
            span.style.color = `hsl(${Math.floor(Math.random() * 360)}, 70%, 40%)`;
            span.style.margin = "0 2px";
            captchaEl.appendChild(span);
        }
    }
}

// Generate saat halaman pertama kali load
document.addEventListener("DOMContentLoaded", generateCaptcha);

// =======================
// LOGIN HANDLER
// =======================
async function handleLogin(nik, password) {
    const loginBtn = document.getElementById('login-btn');
    const loginBtnText = document.getElementById('login-btn-text');
    const loginBtnIcon = document.getElementById('login-btn-icon');
    
    // Show loading state
    loginBtn.disabled = true;
    loginBtnText.textContent = 'Memproses...';
    loginBtnIcon.className = 'fas fa-spinner fa-spin';
    
    try {
        const res = await fetch(WORKER_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                action: "login",
                nik,
                password,
                deviceInfo: navigator.userAgent
            })
        });

        const data = await res.json();
        
        if (data.success && data.step === "otp") {
            showMessage("OTP telah dikirim ke email Anda!", "success");
            localStorage.setItem("pendingNik", nik);
            
            // Show OTP modal
            setTimeout(() => {
                showOtpStep();
            }, 1000);
        } else {
            showMessage(data.message || "Login gagal. Silakan coba lagi.");
        }
    } catch (error) {
        console.error('Login error:', error);
        showMessage("Terjadi kesalahan koneksi. Silakan coba lagi.");
} finally {
    loginBtn.disabled = false;
    loginBtnText.textContent = 'Masuk';
    loginBtnIcon.className = 'fas fa-arrow-right';
    generateCaptcha(); // refresh setelah percobaan
}
}

// =======================
// OTP VERIFICATION
// =======================
async function handleOtp(otpValue) {
    const otpBtn = document.getElementById('otp-btn');
    const otpBtnText = document.getElementById('otp-btn-text');
    const otpBtnIcon = document.getElementById('otp-btn-icon');
    const nik = localStorage.getItem("pendingNik");
    
    if (!nik) {
        showOtpMessage("Sesi login telah berakhir. Silakan login ulang.");
        closeOtpModal();
        return;
    }
    
    // Show loading state
    otpBtn.disabled = true;
    otpBtnText.textContent = 'Memverifikasi...';
    otpBtnIcon.className = 'fas fa-spinner fa-spin';
    
    try {
        const res = await fetch(WORKER_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                action: "verify-otp",
                nik,
                otp: otpValue,
                deviceInfo: navigator.userAgent
            })
        });

        const data = await res.json();
        
        if (data.success && data.user && data.user.sessionId) {
            setSession(data.user.sessionId);
            localStorage.removeItem("pendingNik");
            
            showOtpMessage("Login berhasil! Mengalihkan ke dashboard...", "success");
            
            // Close OTP modal and show dashboard
            setTimeout(() => {
                closeOtpModal();
                loginSuccess(data.user);
            }, 1500);
        } else {
            showOtpMessage(data.message || "Kode OTP tidak valid.");
        }
    } catch (error) {
        console.error('OTP verification error:', error);
        showOtpMessage("Terjadi kesalahan koneksi. Silakan coba lagi.");
    } finally {
        // Reset button state
        otpBtn.disabled = false;
        otpBtnText.textContent = 'Verifikasi';
        otpBtnIcon.className = 'fas fa-check';
    }
}

// =======================
// SESSION LOADING FUNCTIONS
// =======================
function showSessionLoading() {
    document.getElementById('session-loading').classList.remove('hidden');
    document.getElementById('login-step').classList.add('hidden');
    
    // Start loading bar animation
    startLoadingBar();
}

function hideSessionLoading() {
    document.getElementById('session-loading').classList.add('hidden');
    document.getElementById('login-step').classList.remove('hidden');
    
    // Stop loading bar animation
    stopLoadingBar();
}

// Loading bar animation functions
let loadingInterval = null;

function startLoadingBar() {
    const loadingBar = document.getElementById('loading-bar');
    const loadingPercentage = document.getElementById('loading-percentage');
    let progress = 0;
    
    // Clear any existing interval
    if (loadingInterval) {
        clearInterval(loadingInterval);
    }
    
    // Reset progress
    loadingBar.style.width = '0%';
    loadingPercentage.textContent = '0';
    
    loadingInterval = setInterval(() => {
        // Simulate realistic loading progress
        if (progress < 30) {
            progress += Math.random() * 8 + 2; // Fast initial progress (2-10%)
        } else if (progress < 70) {
            progress += Math.random() * 4 + 1; // Medium progress (1-5%)
        } else if (progress < 90) {
            progress += Math.random() * 2 + 0.5; // Slow progress (0.5-2.5%)
        } else if (progress < 95) {
            progress += Math.random() * 1; // Very slow near end (0-1%)
        } else {
            progress += 0.1; // Crawl to 100%
        }
        
        // Cap at 100%
        if (progress > 100) progress = 100;
        
        // Update UI
        loadingBar.style.width = progress + '%';
        loadingPercentage.textContent = Math.floor(progress);
        
        // Don't auto-complete, let the actual session validation finish
        if (progress >= 100) {
            clearInterval(loadingInterval);
            loadingInterval = null;
        }
    }, 100); // Update every 100ms for smooth animation
}

function stopLoadingBar() {
    if (loadingInterval) {
        clearInterval(loadingInterval);
        loadingInterval = null;
    }
    
    // Complete the loading bar instantly when stopping
    const loadingBar = document.getElementById('loading-bar');
    const loadingPercentage = document.getElementById('loading-percentage');
    
    if (loadingBar && loadingPercentage) {
        loadingBar.style.width = '100%';
        loadingPercentage.textContent = '100';
    }
}

// =======================
// SESSION VALIDATION
// =======================
async function validateSession(showLoading = true) {
    const sessionId = getSession();
    if (!sessionId) {
        if (showLoading) {
            hideSessionLoading();
        }
        return false;
    }

    if (showLoading) {
        showSessionLoading();
    }

    try {
        const res = await fetch(WORKER_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-session-id": sessionId
            },
            body: JSON.stringify({ action: "validate-session" })
        });

        const data = await res.json();
        if (data.success && data.user) {
            // Hide loading screen before showing dashboard
            if (showLoading) {
                hideSessionLoading();
            }
            // Auto login to dashboard if session is valid
            loginSuccess(data.user);
            return true;
        } else {
            clearSession();
            if (showLoading) {
                hideSessionLoading();
            }
            return false;
        }
    } catch (error) {
        console.error('Session validation error:', error);
        clearSession();
        if (showLoading) {
            hideSessionLoading();
        }
        return false;
    }
}

// =======================
// LOGOUT HANDLER
// =======================
async function handleLogout() {
    const sessionId = getSession();
    
    try {
        if (sessionId) {
            await fetch(WORKER_URL, {
                method: "POST",
                headers: { 
                    "Content-Type": "application/json", 
                    "x-session-id": sessionId 
                },
                body: JSON.stringify({ action: "logout" })
            });
        }
    } catch (error) {
        console.error('Logout error:', error);
    } finally {
        clearSession();
        localStorage.removeItem("pendingNik");
        
        // Remove dashboard from DOM
        const dashboard = document.getElementById('dashboard');
        if (dashboard) {
            dashboard.remove();
        }
        
        // Show login step
        document.getElementById('login-step').classList.remove('hidden');
        
        // Reset forms
        document.getElementById('loginForm').reset();
        document.querySelectorAll('.otp-input').forEach(input => input.value = '');
        
        // Close any open modals and clear timers
        closeOtpModal();
        
        // Clear all timers
        clearInterval(otpExpiryTimer);
        clearInterval(resendTimer);
    }
}

// =======================
// RESEND OTP
// =======================
async function resendOtpHandler() {
    const nik = localStorage.getItem("pendingNik");
    const resendBtn = document.getElementById('resend-otp');
    const resendText = document.getElementById('resend-otp-text');
    
    if (!nik) {
        showOtpMessage("Sesi login telah berakhir. Silakan login ulang.");
        closeOtpModal();
        return;
    }
    
    // Check if maximum attempts reached
    if (resendAttempts >= 5) {
        showOtpMessage('Batas maksimal kirim ulang OTP telah tercapai. Silakan login ulang.', 'error');
        setTimeout(() => {
            closeOtpModal();
        }, 2000);
        return;
    }
    
    // Show loading state
    resendBtn.disabled = true;
    if (resendText) resendText.textContent = 'Mengirim...';
    
    try {
        const res = await fetch(WORKER_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                action: "resend-otp",
                nik,
                deviceInfo: navigator.userAgent
            })
        });

        const data = await res.json();
        
        if (data.success) {
            showOtpMessage('OTP baru telah dikirim ke email Anda!', 'success');
            
            // Increment resend attempts and calculate progressive cooldown
            resendAttempts++;
            
            // Progressive cooldown: 1min, 2min, 3min, 4min, 5min
            resendCooldown = resendAttempts * 60;
            
            // Reset OTP modal with new timers
            resetOtpModal();
            
        } else {
            showOtpMessage(data.message || 'Gagal mengirim OTP. Silakan coba lagi.');
            // Re-enable button if failed
            resendBtn.disabled = false;
            if (resendText) resendText.textContent = 'Kirim ulang OTP';
        }
    } catch (error) {
        console.error('Resend OTP error:', error);
        showOtpMessage('Terjadi kesalahan koneksi. Silakan coba lagi.');
        // Re-enable button if error
        resendBtn.disabled = false;
        if (resendText) resendText.textContent = 'Kirim ulang OTP';
    }
}

// =======================
// OTP TIMER FUNCTIONS
// =======================
// Global timer variables
let otpExpiryTimer = null;
let resendTimer = null;
let otpExpiryTime = 120; // 2 minutes in seconds
let resendCooldown = 60; // Initial 1 minute cooldown
let resendAttempts = 0;

function startOtpExpiryTimer() {
    clearInterval(otpExpiryTimer);
    otpExpiryTime = 120; // Reset to 2 minutes
    
    const countdownElement = document.getElementById('otp-expiry-countdown');
    const timerElement = document.getElementById('otp-expiry-timer');
    
    otpExpiryTimer = setInterval(() => {
        const minutes = Math.floor(otpExpiryTime / 60);
        const seconds = otpExpiryTime % 60;
        const timeString = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
        if (countdownElement) {
            countdownElement.textContent = timeString;
        }
        
        // Change color when less than 30 seconds
        if (timerElement) {
            if (otpExpiryTime <= 30) {
                timerElement.className = 'text-sm text-red-600 dark:text-red-400 font-medium mb-2 animate-pulse';
            } else {
                timerElement.className = 'text-sm text-red-600 dark:text-red-400 font-medium mb-2';
            }
        }
        
        if (otpExpiryTime <= 0) {
            clearInterval(otpExpiryTimer);
            handleOtpExpiry();
            return;
        }
        
        otpExpiryTime--;
    }, 1000);
}

function startResendCooldown() {
    clearInterval(resendTimer);
    
    const resendBtn = document.getElementById('resend-otp');
    const resendText = document.getElementById('resend-otp-text');
    const countdownElement = document.getElementById('resend-countdown');
    
    let currentCooldown = resendCooldown;
    
    if (resendBtn) resendBtn.disabled = true;
    
    resendTimer = setInterval(() => {
        const minutes = Math.floor(currentCooldown / 60);
        const seconds = currentCooldown % 60;
        const timeString = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
        if (countdownElement) {
            countdownElement.textContent = timeString;
        }
        
        if (currentCooldown <= 0) {
            clearInterval(resendTimer);
            if (resendBtn) resendBtn.disabled = false;
            if (resendText) resendText.textContent = 'Kirim ulang OTP';
            return;
        }
        
        currentCooldown--;
    }, 1000);
}

function handleOtpExpiry() {
    showOtpMessage('Kode OTP telah kedaluarsa. Silakan minta kode baru.', 'error');
    
    // Disable OTP inputs
    document.querySelectorAll('.otp-input').forEach(input => {
        input.disabled = true;
        input.classList.add('bg-gray-100', 'dark:bg-gray-600');
    });
    
    // Disable verify button
    const otpBtn = document.getElementById('otp-btn');
    if (otpBtn) {
        otpBtn.disabled = true;
        otpBtn.classList.add('bg-gray-400');
        otpBtn.innerHTML = '<span>Kode Kedaluarsa</span>';
    }
    
    // Enable resend button immediately
    const resendBtn = document.getElementById('resend-otp');
    const resendText = document.getElementById('resend-otp-text');
    if (resendBtn) {
        clearInterval(resendTimer);
        resendBtn.disabled = false;
        resendBtn.classList.add('bg-blue-600', 'text-white', 'px-4', 'py-2', 'rounded-lg', 'hover:bg-blue-700');
    }
    if (resendText) {
        resendText.textContent = 'Kirim ulang OTP';
    }
}

function resetOtpModal() {
    // Clear all timers
    clearInterval(otpExpiryTimer);
    clearInterval(resendTimer);
    
    // Reset OTP inputs
    document.querySelectorAll('.otp-input').forEach(input => {
        input.disabled = false;
        input.classList.remove('bg-gray-100', 'dark:bg-gray-600');
        input.value = '';
    });
    
    // Reset verify button
    const otpBtn = document.getElementById('otp-btn');
    if (otpBtn) {
        otpBtn.disabled = false;
        otpBtn.className = 'flex-1 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2';
        otpBtn.innerHTML = '<span id="otp-btn-text">Verifikasi</span><i id="otp-btn-icon" class="fas fa-check text-sm"></i>';
    }
    
    // Reset resend button
    const resendBtn = document.getElementById('resend-otp');
    if (resendBtn) {
        resendBtn.className = 'text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 text-sm font-medium disabled:text-gray-400 disabled:cursor-not-allowed';
        resendBtn.disabled = true;
    }
    
    // Update attempts indicator
    const attemptsIndicator = document.getElementById('resend-attempts');
    const attemptsCount = document.getElementById('attempts-count');
    if (attemptsIndicator && attemptsCount) {
        if (resendAttempts > 0) {
            attemptsIndicator.classList.remove('hidden');
            attemptsCount.textContent = resendAttempts;
            
            // Change color based on attempts
            if (resendAttempts >= 4) {
                attemptsIndicator.className = 'text-xs text-red-500 dark:text-red-400 mt-1';
            } else if (resendAttempts >= 2) {
                attemptsIndicator.className = 'text-xs text-orange-500 dark:text-orange-400 mt-1';
            } else {
                attemptsIndicator.className = 'text-xs text-gray-500 dark:text-gray-400 mt-1';
            }
        } else {
            attemptsIndicator.classList.add('hidden');
        }
    }
    
    // Reset timers display with current cooldown
    const countdownElement = document.getElementById('otp-expiry-countdown');
    const resendCountdown = document.getElementById('resend-countdown');
    const resendText = document.getElementById('resend-otp-text');
    
    if (countdownElement) countdownElement.textContent = '02:00';
    
    // Set countdown display based on current cooldown
    const minutes = Math.floor(resendCooldown / 60);
    const seconds = resendCooldown % 60;
    const timeString = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    
    if (resendCountdown) resendCountdown.textContent = timeString;
    if (resendText) resendText.innerHTML = `Kirim ulang dalam <span id="resend-countdown">${timeString}</span>`;
    
    // Start timers
    startOtpExpiryTimer();
    startResendCooldown();
}

// =======================
// UI HELPER FUNCTIONS
// =======================
function togglePassword(inputId) {
    const input = document.getElementById(inputId);
    const icon = document.getElementById(inputId + '-toggle-icon');
    
    if (input.type === 'password') {
        input.type = 'text';
        icon.className = 'fas fa-eye-slash';
    } else {
        input.type = 'password';
        icon.className = 'fas fa-eye';
    }
}

function showMessage(message, type = 'error') {
    const messageDiv = document.getElementById('message');
    const messageText = document.getElementById('message-text');
    
    messageText.textContent = message;
    messageDiv.className = `mt-4 p-3 rounded-lg ${type === 'error' ? 'bg-red-100 dark:bg-red-900/20 border border-red-200 dark:border-red-800' : 'bg-green-100 dark:bg-green-900/20 border border-green-200 dark:border-green-800'}`;
    messageText.className = `text-sm ${type === 'error' ? 'text-red-700 dark:text-red-400' : 'text-green-700 dark:text-green-400'}`;
    messageDiv.classList.remove('hidden');
    
    setTimeout(() => {
        messageDiv.classList.add('hidden');
    }, 5000);
}

function showOtpMessage(message, type = 'error') {
    const messageDiv = document.getElementById('otp-message');
    const messageText = document.getElementById('otp-message-text');
    
    messageText.textContent = message;
    messageDiv.className = `mt-4 p-3 rounded-lg ${type === 'error' ? 'bg-red-100 dark:bg-red-900/20 border border-red-200 dark:border-red-800' : 'bg-green-100 dark:bg-green-900/20 border border-green-200 dark:border-green-800'}`;
    messageText.className = `text-sm ${type === 'error' ? 'text-red-700 dark:text-red-400' : 'text-green-700 dark:text-green-400'}`;
    messageDiv.classList.remove('hidden');
    
    setTimeout(() => {
        messageDiv.classList.add('hidden');
    }, 5000);
}

function showOtpStep() {
    document.getElementById('otp-step').classList.remove('hidden');
    document.querySelector('.otp-input').focus();
    
    // Reset resend attempts for new OTP session
    resendAttempts = 0;
    resendCooldown = 60; // Reset to 1 minute for first attempt
    
    // Start timers
    resetOtpModal();
}

function closeOtpModal() {
    document.getElementById('otp-step').classList.add('hidden');
    document.querySelectorAll('.otp-input').forEach(input => input.value = '');
    
    // Clear all timers when closing modal
    clearInterval(otpExpiryTimer);
    clearInterval(resendTimer);
    
    // Reset timer variables
    otpExpiryTime = 120;
    resendAttempts = 0;
    resendCooldown = 60;
    
    // Hide attempts indicator
    const attemptsIndicator = document.getElementById('resend-attempts');
    if (attemptsIndicator) {
        attemptsIndicator.classList.add('hidden');
    }
}

// =======================
// DASHBOARD FUNCTIONS
// =======================
// Global variables for dashboard
let sidebar, header, mainContent, sidebarToggle, headerToggle, darkModeToggle, sidebarTexts, sidebarToggleBtn;
let isCollapsed = false;

// Login success handler - loads dashboard dynamically
function loginSuccess(userData = null) {
    // Hide login step
    document.getElementById('login-step').classList.add('hidden');
    document.getElementById('otp-step').classList.add('hidden');
    
    // Create and inject dashboard HTML (you'll need to include the dashboard HTML here)
    // For brevity, I'm not including the full dashboard HTML in this external script
    // You can either include it here or load it from another external file
    
    // Initialize dashboard functionality
    setTimeout(() => {
        initializeDashboardElements();
        initializeLayout();
        
        // Add resize listener
        window.addEventListener('resize', handleResize);
        
        // Set user info from real data or fallback
        const username = document.getElementById('username');
        const userRoleSidebar = document.getElementById('userRoleSidebar');
        const sidebarProfileImage = document.getElementById('sidebarProfileImage');
        
        if (userData) {
            if (username) username.textContent = userData.Username || userData.nama || 'User';
            if (userRoleSidebar) userRoleSidebar.textContent = userData.Role || userData.role || 'Member';
            
            // Set profile avatar if available
            if (sidebarProfileImage && userData.ProfilAvatar) {
                sidebarProfileImage.innerHTML = `
                    <img src="https://test.bulshitman1.workers.dev/avatar?url=${encodeURIComponent(userData.ProfilAvatar)}" 
                         alt="Profile Avatar" 
                         class="w-full h-full object-cover rounded-full"
                         onerror="this.style.display='none'; this.parentElement.innerHTML='<i class=&quot;fas fa-user text-white text-sm&quot;></i>';">
                `;
            }
        } else {
            if (username) username.textContent = 'User';
            if (userRoleSidebar) userRoleSidebar.textContent = 'Member';
        }
    }, 100);
}

// Override confirmLogout to use new handler
function confirmLogout() {
    handleLogout();
}

// =======================
// INITIALIZATION
// =======================
// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Check for existing session on page load with loading screen
    validateSession(true);
    
    // Login form handler
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
loginForm.addEventListener('submit', function(e) {
    e.preventDefault();
            
    const nik = document.getElementById('nik').value;
    const password = document.getElementById('password').value;
    const captchaInput = document.getElementById('captcha').value.trim().toUpperCase();

    if (!nik || !password) {
        showMessage('NIK dan password harus diisi!');
        return;
    }

    if (captchaInput !== generatedCaptcha) {
        showMessage('Kode CAPTCHA salah, silakan coba lagi.');
        generateCaptcha(); // refresh otomatis
        return;
    }

    handleLogin(nik, password);
});
    }

    // OTP form handler
    const otpForm = document.getElementById('otpForm');
    if (otpForm) {
        otpForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const otpInputs = document.querySelectorAll('.otp-input');
            const otpValue = Array.from(otpInputs).map(input => input.value).join('');
            
            if (otpValue.length !== 6) {
                showOtpMessage('Masukkan kode OTP 6 digit!');
                return;
            }
            
            handleOtp(otpValue);
        });
    }

    // OTP input navigation
    const otpInputs = document.querySelectorAll('.otp-input');
    otpInputs.forEach((input, index) => {
        input.addEventListener('input', function(e) {
            const value = e.target.value;
            if (value.length === 1 && index < otpInputs.length - 1) {
                otpInputs[index + 1].focus();
            }
            
            // Update hidden input
            const otpValue = Array.from(otpInputs).map(inp => inp.value).join('');
            document.getElementById('otp').value = otpValue;
        });
        
        input.addEventListener('keydown', function(e) {
            if (e.key === 'Backspace' && !e.target.value && index > 0) {
                otpInputs[index - 1].focus();
            }
        });
    });

    // Dark mode toggle for login page
    const darkModeToggleLogin = document.getElementById('darkModeToggleLogin');
    if (darkModeToggleLogin) {
        darkModeToggleLogin.addEventListener('click', function() {
            const darkModeIconLogin = document.getElementById('darkModeIconLogin');
            
            document.documentElement.classList.toggle('dark');
            const isDark = document.documentElement.classList.contains('dark');
            
            if (isDark) {
                darkModeIconLogin.className = 'fas fa-sun';
            } else {
                darkModeIconLogin.className = 'fas fa-moon';
            }
            
            localStorage.setItem('darkMode', isDark);
        });
    }

    // Load saved dark mode preference
    const savedDarkMode = localStorage.getItem('darkMode');
    if (savedDarkMode === 'true') {
        document.documentElement.classList.add('dark');
        const darkModeIconLogin = document.getElementById('darkModeIconLogin');
        if (darkModeIconLogin) darkModeIconLogin.className = 'fas fa-sun';
    }
});

// Note: Dashboard functions (initializeDashboardElements, toggleSidebar, etc.) 
// would need to be included here as well if you want the complete external script.
// For brevity, I've focused on the login functionality in this external file.
