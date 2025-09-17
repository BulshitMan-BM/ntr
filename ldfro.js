// Authentication System
const WORKER_URL = "https://pemanis.bulshitman1.workers.dev/";

// LocalStorage Helper
function setSession(sessionId) {
    localStorage.setItem("sessionId", sessionId);
}

function getSession() {
    return localStorage.getItem("sessionId");
}

function clearSession() {
    localStorage.removeItem("sessionId");
}

// Check for existing session on page load
window.addEventListener('load', async function() {
    const sessionId = getSession();
    if (sessionId) {
        // Hide login form and show loading
        document.getElementById('login-step').classList.add('hidden');
        showSessionLoadingEffect();
        
        const userData = await validateSession();
        hideSessionLoadingEffect();
        
        if (userData) {
            // User has valid session, go directly to dashboard
            loginSuccess(userData);
        } else {
            // Session invalid, show login form again
            document.getElementById('login-step').classList.remove('hidden');
        }
    }
});

// Password visibility toggle
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

// Show message function
function showMessage(text, type = 'info') {
    const messageDiv = document.getElementById('message');
    const messageText = document.getElementById('message-text');
    
    messageDiv.className = `mt-4 p-3 rounded-lg ${
        type === 'error' ? 'bg-red-100 dark:bg-red-900/20 border border-red-200 dark:border-red-800' :
        type === 'success' ? 'bg-green-100 dark:bg-green-900/20 border border-green-200 dark:border-green-800' :
        'bg-blue-100 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800'
    }`;
    
    messageText.className = `text-sm ${
        type === 'error' ? 'text-red-700 dark:text-red-300' :
        type === 'success' ? 'text-green-700 dark:text-green-300' :
        'text-blue-700 dark:text-blue-300'
    }`;
    
    messageText.textContent = text;
    messageDiv.classList.remove('hidden');
    
    // Auto hide after 5 seconds
    setTimeout(() => {
        messageDiv.classList.add('hidden');
    }, 5000);
}

// Show OTP message function
function showOtpMessage(text, type = 'info') {
    const messageDiv = document.getElementById('otp-message');
    const messageText = document.getElementById('otp-message-text');
    
    messageDiv.className = `mt-4 p-3 rounded-lg ${
        type === 'error' ? 'bg-red-100 dark:bg-red-900/20 border border-red-200 dark:border-red-800' :
        type === 'success' ? 'bg-green-100 dark:bg-green-900/20 border border-green-200 dark:border-green-800' :
        'bg-blue-100 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800'
    }`;
    
    messageText.className = `text-sm ${
        type === 'error' ? 'text-red-700 dark:text-red-300' :
        type === 'success' ? 'text-green-700 dark:text-green-300' :
        'text-blue-700 dark:text-blue-300'
    }`;
    
    messageText.textContent = text;
    messageDiv.classList.remove('hidden');
    
    // Auto hide after 5 seconds
    setTimeout(() => {
        messageDiv.classList.add('hidden');
    }, 5000);
}

// OTP input handling
document.addEventListener('DOMContentLoaded', function() {
    const otpInputs = document.querySelectorAll('.otp-input');
    
    otpInputs.forEach((input, index) => {
        input.addEventListener('input', function(e) {
            const value = e.target.value;
            
            // Only allow numbers
            if (!/^\d*$/.test(value)) {
                e.target.value = value.replace(/\D/g, '');
                return;
            }
            
            // Move to next input if current is filled
            if (value && index < otpInputs.length - 1) {
                otpInputs[index + 1].focus();
            }
            
            // Update hidden input
            updateOtpValue();
        });
        
        input.addEventListener('keydown', function(e) {
            // Move to previous input on backspace if current is empty
            if (e.key === 'Backspace' && !e.target.value && index > 0) {
                otpInputs[index - 1].focus();
            }
        });
        
        input.addEventListener('paste', function(e) {
            e.preventDefault();
            const pastedData = e.clipboardData.getData('text').replace(/\D/g, '');
            
            for (let i = 0; i < Math.min(pastedData.length, otpInputs.length - index); i++) {
                if (otpInputs[index + i]) {
                    otpInputs[index + i].value = pastedData[i];
                }
            }
            
            updateOtpValue();
            
            // Focus on next empty input or last input
            const nextEmptyIndex = Array.from(otpInputs).findIndex((input, i) => i > index && !input.value);
            if (nextEmptyIndex !== -1) {
                otpInputs[nextEmptyIndex].focus();
            } else {
                otpInputs[Math.min(index + pastedData.length, otpInputs.length - 1)].focus();
            }
        });
    });
    
    function updateOtpValue() {
        const otpValue = Array.from(otpInputs).map(input => input.value).join('');
        document.getElementById('otp').value = otpValue;
    }
});

// Show OTP modal
function showOtpModal() {
    document.getElementById('otp-step').classList.remove('hidden');
    
    // Clear previous OTP inputs
    document.querySelectorAll('.otp-input').forEach(input => {
        input.value = '';
    });
    document.getElementById('otp').value = '';
    
    // Focus on first input
    setTimeout(() => {
        document.querySelector('.otp-input').focus();
    }, 100);
    
    // Start expiration timer
    startOtpTimer();
}

// Close OTP modal
function closeOtpModal() {
    document.getElementById('otp-step').classList.add('hidden');
    clearOtpTimer();
}

// OTP Timer and Resend Logic
let otpTimer;
let otpTimeLeft = 180; // 3 minutes
let resendTimer;
let resendTimeLeft = 0;
let resendCount = 0; // Track how many times resend has been clicked

function startOtpTimer() {
    const expirationInfo = document.getElementById('otp-expiration-info');
    const expirationTime = document.getElementById('otp-expiration-time');
    const resendBtn = document.getElementById('resend-otp');
    
    otpTimeLeft = 180;
    expirationInfo.classList.remove('hidden');
    
    // Start resend countdown on first OTP send (1 minute)
    if (resendCount === 0) {
        startResendCountdown(60); // 1 minute for first time
    }
    
    otpTimer = setInterval(() => {
        otpTimeLeft--;
        
        const minutes = Math.floor(otpTimeLeft / 60);
        const seconds = otpTimeLeft % 60;
        expirationTime.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        
        if (otpTimeLeft <= 0) {
            clearInterval(otpTimer);
            expirationInfo.classList.add('hidden');
            showOtpMessage('Kode OTP telah kedaluarsa. Silakan kirim ulang.', 'error');
        }
    }, 1000);
}

function startResendCountdown(seconds) {
    const resendBtn = document.getElementById('resend-otp');
    resendTimeLeft = seconds;
    resendBtn.disabled = true;
    
    // Update button text with countdown
    updateResendButtonText();
    
    resendTimer = setInterval(() => {
        resendTimeLeft--;
        updateResendButtonText();
        
        if (resendTimeLeft <= 0) {
            clearInterval(resendTimer);
            resendTimer = null;
            resendBtn.disabled = false;
            resendBtn.textContent = 'Kirim ulang OTP';
        }
    }, 1000);
}

function updateResendButtonText() {
    const resendBtn = document.getElementById('resend-otp');
    const minutes = Math.floor(resendTimeLeft / 60);
    const seconds = resendTimeLeft % 60;
    
    if (minutes > 0) {
        resendBtn.textContent = `Kirim ulang dalam ${minutes}:${seconds.toString().padStart(2, '0')}`;
    } else {
        resendBtn.textContent = `Kirim ulang dalam ${seconds} detik`;
    }
}

function clearOtpTimer() {
    if (otpTimer) {
        clearInterval(otpTimer);
        otpTimer = null;
    }
    if (resendTimer) {
        clearInterval(resendTimer);
        resendTimer = null;
    }
    document.getElementById('otp-expiration-info').classList.add('hidden');
    const resendBtn = document.getElementById('resend-otp');
    resendBtn.disabled = false;
    resendBtn.textContent = 'Kirim ulang OTP';
}

// Resend OTP handler with progressive countdown
function resendOtpHandler() {
    // Increment resend count
    resendCount++;
    
    showOtpMessage('Kode OTP baru telah dikirim.', 'success');
    
    // Clear OTP inputs
    document.querySelectorAll('.otp-input').forEach(input => {
        input.value = '';
    });
    document.getElementById('otp').value = '';
    
    // Focus on first input
    document.querySelector('.otp-input').focus();
    
    // Calculate progressive countdown time
    // 1st resend: 5 minutes (300 seconds)
    // 2nd resend: 10 minutes (600 seconds)  
    // 3rd resend and beyond: 15 minutes (900 seconds)
    let countdownTime;
    if (resendCount === 1) {
        countdownTime = 300; // 5 minutes
    } else if (resendCount === 2) {
        countdownTime = 600; // 10 minutes
    } else {
        countdownTime = 900; // 15 minutes
    }
    
    // Start the progressive countdown
    startResendCountdown(countdownTime);
    
    // Show info about next wait time
    const nextWaitTime = resendCount === 1 ? '10 menit' : '15 menit';
    setTimeout(() => {
        if (resendCount < 3) {
            showOtpMessage(`Pengiriman ulang berikutnya akan menunggu ${nextWaitTime}.`, 'info');
        } else {
            showOtpMessage('Pengiriman ulang berikutnya akan menunggu 15 menit.', 'info');
        }
    }, 2000);
}

// Login form handler
document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    const otpForm = document.getElementById('otpForm');
    const darkModeToggleLogin = document.getElementById('darkModeToggleLogin');
    
    // Check for saved dark mode preference
    if (localStorage.getItem('darkMode') === 'true') {
        document.documentElement.classList.add('dark');
        const darkModeIcon = document.getElementById('darkModeIconLogin');
        if (darkModeIcon) darkModeIcon.className = 'fas fa-sun';
    }
    
    // Dark mode toggle for login
    if (darkModeToggleLogin) {
        darkModeToggleLogin.addEventListener('click', toggleDarkModeLogin);
    }
    
    // Login form submission
    if (loginForm) {
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const nik = document.getElementById('nik').value.trim();
            const password = document.getElementById('password').value;
            const loginBtn = document.getElementById('login-btn');
            const loginBtnText = document.getElementById('login-btn-text');
            const loginBtnIcon = document.getElementById('login-btn-icon');
            
            // Validation
            if (!nik || !password) {
                showMessage('Mohon lengkapi semua field', 'error');
                return;
            }
            
            if (nik.length !== 16 || !/^\d+$/.test(nik)) {
                showMessage('NIK harus berupa 16 digit angka', 'error');
                return;
            }
            
            // Show loading state
            loginBtn.disabled = true;
            loginBtnText.textContent = 'Memproses...';
            loginBtnIcon.className = 'fas fa-spinner fa-spin';
            
            try {
                // Real API call to authentication server
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
                    showMessage('Login berhasil! Kode OTP telah dikirim ke email Anda.', 'success');
                    localStorage.setItem("pendingNik", nik);
                    
                    setTimeout(() => {
                        showOtpModal();
                    }, 1000);
                } else {
                    throw new Error(data.message || 'Login gagal');
                }
            } catch (error) {
                showMessage(error.message || 'Terjadi kesalahan saat login', 'error');
            } finally {
                // Reset button state
                loginBtn.disabled = false;
                loginBtnText.textContent = 'Masuk';
                loginBtnIcon.className = 'fas fa-arrow-right';
            }
        });
    }
    
    // OTP form submission
    if (otpForm) {
        otpForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const otp = document.getElementById('otp').value;
            const nik = localStorage.getItem("pendingNik");
            const otpBtn = document.getElementById('otp-btn');
            const otpBtnText = document.getElementById('otp-btn-text');
            const otpBtnIcon = document.getElementById('otp-btn-icon');
            
            if (otp.length !== 6) {
                showOtpMessage('Mohon masukkan kode OTP 6 digit', 'error');
                return;
            }
            
            // Show loading state
            otpBtn.disabled = true;
            otpBtnText.textContent = 'Memverifikasi...';
            otpBtnIcon.className = 'fas fa-spinner fa-spin';
            
            try {
                // Real API call to verify OTP
                const res = await fetch(WORKER_URL, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        action: "verify-otp",
                        nik,
                        otp,
                        deviceInfo: navigator.userAgent
                    })
                });

                const data = await res.json();
                
                if (data.success && data.user && data.user.sessionId) {
                    setSession(data.user.sessionId);
                    localStorage.removeItem("pendingNik");
                    showOtpMessage('Verifikasi berhasil! Mengalihkan ke dashboard...', 'success');
                    
                    setTimeout(() => {
                        loginSuccess(data.user);
                    }, 1000);
                } else {
                    throw new Error(data.message || 'Verifikasi OTP gagal');
                }
            } catch (error) {
                showOtpMessage(error.message || 'Terjadi kesalahan saat verifikasi OTP', 'error');
            } finally {
                // Reset button state
                otpBtn.disabled = false;
                otpBtnText.textContent = 'Verifikasi';
                otpBtnIcon.className = 'fas fa-check';
            }
        });
    }
});

// Session loading effect functions
function showSessionLoadingEffect() {
    // Create loading overlay
    const loadingOverlay = document.createElement('div');
    loadingOverlay.id = 'session-loading';
    loadingOverlay.className = 'fixed inset-0 bg-white dark:bg-gray-900 flex items-center justify-center z-50';
    loadingOverlay.innerHTML = `
        <div class="text-center">
            <div class="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 animate-pulse">
                <i class="fas fa-cube text-white text-2xl"></i>
            </div>
            <h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-2">DTKS Dashboard</h2>
            <div class="flex items-center justify-center space-x-2 text-gray-600 dark:text-gray-400">
                <div class="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style="animation-delay: 0ms"></div>
                <div class="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style="animation-delay: 150ms"></div>
                <div class="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style="animation-delay: 300ms"></div>
            </div>
            <p class="text-sm text-gray-500 dark:text-gray-400 mt-2">Sebentar ya boss :)</p>
        </div>
    `;
    document.body.appendChild(loadingOverlay);
}

function hideSessionLoadingEffect() {
    const loadingOverlay = document.getElementById('session-loading');
    if (loadingOverlay) {
        loadingOverlay.style.opacity = '0';
        loadingOverlay.style.transition = 'opacity 0.3s ease-out';
        setTimeout(() => {
            if (loadingOverlay.parentNode) {
                loadingOverlay.parentNode.removeChild(loadingOverlay);
            }
        }, 300);
    }
}

// Session validation
async function validateSession() {
    const sessionId = getSession();
    if (!sessionId) {
        return false;
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
            return data.user;
        } else {
            clearSession();
            return false;
        }
    } catch (error) {
        clearSession();
        return false;
    }
}

// Dark Mode for Login
function toggleDarkModeLogin() {
    const darkModeIcon = document.getElementById('darkModeIconLogin');
    
    document.documentElement.classList.toggle('dark');
    const isDark = document.documentElement.classList.contains('dark');
    
    if (isDark) {
        darkModeIcon.className = 'fas fa-sun';
    } else {
        darkModeIcon.className = 'fas fa-moon';
    }
    
    localStorage.setItem('darkMode', isDark);
}

// Login success handler - This function will be called by the external script
// The dashboard creation and initialization will be handled internally
function loginSuccess(userData = null) {
    // Hide login step
    document.getElementById('login-step').classList.add('hidden');
    document.getElementById('otp-step').classList.add('hidden');
    
    // Trigger dashboard creation (this will be handled by internal script)
    if (typeof window.createDashboardInternal === 'function') {
        window.createDashboardInternal(userData);
    }
}

// Logout functions - These will be called by the internal dashboard script
async function logoutUser() {
    const sessionId = getSession();
    
    // Call logout API if session exists
    if (sessionId) {
        try {
            await fetch(WORKER_URL, {
                method: "POST",
                headers: { 
                    "Content-Type": "application/json", 
                    "x-session-id": sessionId 
                },
                body: JSON.stringify({ action: "logout" })
            });
        } catch (error) {
            console.error('Logout API error:', error);
        }
    }
    
    // Clear session and reset UI
    clearSession();
    
    // Hide dashboard
    document.getElementById('dashboard').classList.add('hidden');
    
    // Show login step
    document.getElementById('login-step').classList.remove('hidden');
    
    // Reset forms
    document.getElementById('loginForm').reset();
    document.querySelectorAll('.otp-input').forEach(input => input.value = '');
    document.getElementById('otp').value = '';
    
    // Hide messages
    document.getElementById('message').classList.add('hidden');
    document.getElementById('otp-message').classList.add('hidden');
    
    // Clear timers
    clearOtpTimer();
    
    // Reset resend count
    resendCount = 0;
    
    // Trigger cleanup of dashboard (this will be handled by internal script)
    if (typeof window.cleanupDashboardInternal === 'function') {
        window.cleanupDashboardInternal();
    }
}

Now I'll update your main HTML file to use the external login script:

Saya akan memisahkan script login ke file external untuk Anda. Berikut adalah file login.js yang perlu Anda simpan secara terpisah:

File: login.js

// Authentication System
const WORKER_URL = "https://pemanis.bulshitman1.workers.dev/";

// LocalStorage Helper
function setSession(sessionId) {
    localStorage.setItem("sessionId", sessionId);
}
function getSession() {
    return localStorage.getItem("sessionId");
}
function clearSession() {
    localStorage.removeItem("sessionId");
}

// Check for existing session on page load
window.addEventListener('load', async function() {
    const sessionId = getSession();
    if (sessionId) {
        // Hide login form and show loading
        document.getElementById('login-step').classList.add('hidden');
        showSessionLoadingEffect();
        
        const userData = await validateSession();
        hideSessionLoadingEffect();
        
        if (userData) {
            // User has valid session, go directly to dashboard
            loginSuccess(userData);
        } else {
            // Session invalid, show login form again
            document.getElementById('login-step').classList.remove('hidden');
        }
    }
});

// Password visibility toggle
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

// Show message function
function showMessage(text, type = 'info') {
    const messageDiv = document.getElementById('message');
    const messageText = document.getElementById('message-text');
    
    messageDiv.className = `mt-4 p-3 rounded-lg ${
        type === 'error' ? 'bg-red-100 dark:bg-red-900/20 border border-red-200 dark:border-red-800' :
        type === 'success' ? 'bg-green-100 dark:bg-green-900/20 border border-green-200 dark:border-green-800' :
        'bg-blue-100 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800'
    }`;
    
    messageText.className = `text-sm ${
        type === 'error' ? 'text-red-700 dark:text-red-300' :
        type === 'success' ? 'text-green-700 dark:text-green-300' :
        'text-blue-700 dark:text-blue-300'
    }`;
    
    messageText.textContent = text;
    messageDiv.classList.remove('hidden');
    
    // Auto hide after 5 seconds
    setTimeout(() => {
        messageDiv.classList.add('hidden');
    }, 5000);
}

// Show OTP message function
function showOtpMessage(text, type = 'info') {
    const messageDiv = document.getElementById('otp-message');
    const messageText = document.getElementById('otp-message-text');
    
    messageDiv.className = `mt-4 p-3 rounded-lg ${
        type === 'error' ? 'bg-red-100 dark:bg-red-900/20 border border-red-200 dark:border-red-800' :
        type === 'success' ? 'bg-green-100 dark:bg-green-900/20 border border-green-200 dark:border-green-800' :
        'bg-blue-100 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800'
    }`;
    
    messageText.className = `text-sm ${
        type === 'error' ? 'text-red-700 dark:text-red-300' :
        type === 'success' ? 'text-green-700 dark:text-green-300' :
        'text-blue-700 dark:text-blue-300'
    }`;
    
    messageText.textContent = text;
    messageDiv.classList.remove('hidden');
    
    // Auto hide after 5 seconds
    setTimeout(() => {
        messageDiv.classList.add('hidden');
    }, 5000);
}

// OTP input handling
document.addEventListener('DOMContentLoaded', function() {
    const otpInputs = document.querySelectorAll('.otp-input');
    
    otpInputs.forEach((input, index) => {
        input.addEventListener('input', function(e) {
            const value = e.target.value;
            
            // Only allow numbers
            if (!/^\d*$/.test(value)) {
                e.target.value = value.replace(/\D/g, '');
                return;
            }
            
            // Move to next input if current is filled
            if (value && index < otpInputs.length - 1) {
                otpInputs[index + 1].focus();
            }
            
            // Update hidden input
            updateOtpValue();
        });
        
        input.addEventListener('keydown', function(e) {
            // Move to previous input on backspace if current is empty
            if (e.key === 'Backspace' && !e.target.value && index > 0) {
                otpInputs[index - 1].focus();
            }
        });
        
        input.addEventListener('paste', function(e) {
            e.preventDefault();
            const pastedData = e.clipboardData.getData('text').replace(/\D/g, '');
            
            for (let i = 0; i < Math.min(pastedData.length, otpInputs.length - index); i++) {
                if (otpInputs[index + i]) {
                    otpInputs[index + i].value = pastedData[i];
                }
            }
            
            updateOtpValue();
            
            // Focus on next empty input or last input
            const nextEmptyIndex = Array.from(otpInputs).findIndex((input, i) => i > index && !input.value);
            if (nextEmptyIndex !== -1) {
                otpInputs[nextEmptyIndex].focus();
            } else {
                otpInputs[Math.min(index + pastedData.length, otpInputs.length - 1)].focus();
            }
        });
    });
    
    function updateOtpValue() {
        const otpValue = Array.from(otpInputs).map(input => input.value).join('');
        document.getElementById('otp').value = otpValue;
    }
});

// Show OTP modal
function showOtpModal() {
    document.getElementById('otp-step').classList.remove('hidden');
    
    // Clear previous OTP inputs
    document.querySelectorAll('.otp-input').forEach(input => {
        input.value = '';
    });
    document.getElementById('otp').value = '';
    
    // Focus on first input
    setTimeout(() => {
        document.querySelector('.otp-input').focus();
    }, 100);
    
    // Start expiration timer
    startOtpTimer();
}

// Close OTP modal
function closeOtpModal() {
    document.getElementById('otp-step').classList.add('hidden');
    clearOtpTimer();
}

// OTP Timer and Resend Logic
let otpTimer;
let otpTimeLeft = 180; // 3 minutes
let resendTimer;
let resendTimeLeft = 0;
let resendCount = 0; // Track how many times resend has been clicked

function startOtpTimer() {
    const expirationInfo = document.getElementById('otp-expiration-info');
    const expirationTime = document.getElementById('otp-expiration-time');
    const resendBtn = document.getElementById('resend-otp');
    
    otpTimeLeft = 180;
    expirationInfo.classList.remove('hidden');
    
    // Start resend countdown on first OTP send (1 minute)
    if (resendCount === 0) {
        startResendCountdown(60); // 1 minute for first time
    }
    
    otpTimer = setInterval(() => {
        otpTimeLeft--;
        
        const minutes = Math.floor(otpTimeLeft / 60);
        const seconds = otpTimeLeft % 60;
        expirationTime.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        
        if (otpTimeLeft <= 0) {
            clearInterval(otpTimer);
            expirationInfo.classList.add('hidden');
            showOtpMessage('Kode OTP telah kedaluarsa. Silakan kirim ulang.', 'error');
        }
    }, 1000);
}

function startResendCountdown(seconds) {
    const resendBtn = document.getElementById('resend-otp');
    resendTimeLeft = seconds;
    resendBtn.disabled = true;
    
    // Update button text with countdown
    updateResendButtonText();
    
    resendTimer = setInterval(() => {
        resendTimeLeft--;
        updateResendButtonText();
        
        if (resendTimeLeft <= 0) {
            clearInterval(resendTimer);
            resendTimer = null;
            resendBtn.disabled = false;
            resendBtn.textContent = 'Kirim ulang OTP';
        }
    }, 1000);
}

function updateResendButtonText() {
    const resendBtn = document.getElementById('resend-otp');
    const minutes = Math.floor(resendTimeLeft / 60);
    const seconds = resendTimeLeft % 60;
    
    if (minutes > 0) {
        resendBtn.textContent = `Kirim ulang dalam ${minutes}:${seconds.toString().padStart(2, '0')}`;
    } else {
        resendBtn.textContent = `Kirim ulang dalam ${seconds} detik`;
    }
}

function clearOtpTimer() {
    if (otpTimer) {
        clearInterval(otpTimer);
        otpTimer = null;
    }
    if (resendTimer) {
        clearInterval(resendTimer);
        resendTimer = null;
    }
    document.getElementById('otp-expiration-info').classList.add('hidden');
    const resendBtn = document.getElementById('resend-otp');
    resendBtn.disabled = false;
    resendBtn.textContent = 'Kirim ulang OTP';
}

// Resend OTP handler with progressive countdown
function resendOtpHandler() {
    // Increment resend count
    resendCount++;
    
    showOtpMessage('Kode OTP baru telah dikirim.', 'success');
    
    // Clear OTP inputs
    document.querySelectorAll('.otp-input').forEach(input => {
        input.value = '';
    });
    document.getElementById('otp').value = '';
    
    // Focus on first input
    document.querySelector('.otp-input').focus();
    
    // Calculate progressive countdown time
    // 1st resend: 5 minutes (300 seconds)
    // 2nd resend: 10 minutes (600 seconds)  
    // 3rd resend and beyond: 15 minutes (900 seconds)
    let countdownTime;
    if (resendCount === 1) {
        countdownTime = 300; // 5 minutes
    } else if (resendCount === 2) {
        countdownTime = 600; // 10 minutes
    } else {
        countdownTime = 900; // 15 minutes
    }
    
    // Start the progressive countdown
    startResendCountdown(countdownTime);
    
    // Show info about next wait time
    const nextWaitTime = resendCount === 1 ? '10 menit' : '15 menit';
    setTimeout(() => {
        if (resendCount < 3) {
            showOtpMessage(`Pengiriman ulang berikutnya akan menunggu ${nextWaitTime}.`, 'info');
        } else {
            showOtpMessage('Pengiriman ulang berikutnya akan menunggu 15 menit.', 'info');
        }
    }, 2000);
}

// Login form handler
document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    const otpForm = document.getElementById('otpForm');
    const darkModeToggleLogin = document.getElementById('darkModeToggleLogin');
    
    // Check for saved dark mode preference
    if (localStorage.getItem('darkMode') === 'true') {
        document.documentElement.classList.add('dark');
        const darkModeIcon = document.getElementById('darkModeIconLogin');
        if (darkModeIcon) darkModeIcon.className = 'fas fa-sun';
    }
    
    // Dark mode toggle for login
    if (darkModeToggleLogin) {
        darkModeToggleLogin.addEventListener('click', toggleDarkModeLogin);
    }
    
    // Login form submission
    if (loginForm) {
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const nik = document.getElementById('nik').value.trim();
            const password = document.getElementById('password').value;
            const loginBtn = document.getElementById('login-btn');
            const loginBtnText = document.getElementById('login-btn-text');
            const loginBtnIcon = document.getElementById('login-btn-icon');
            
            // Validation
            if (!nik || !password) {
                showMessage('Mohon lengkapi semua field', 'error');
                return;
            }
            
            if (nik.length !== 16 || !/^\d+$/.test(nik)) {
                showMessage('NIK harus berupa 16 digit angka', 'error');
                return;
            }
            
            // Show loading state
            loginBtn.disabled = true;
            loginBtnText.textContent = 'Memproses...';
            loginBtnIcon.className = 'fas fa-spinner fa-spin';
            
            try {
                // Real API call to authentication server
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
                    showMessage('Login berhasil! Kode OTP telah dikirim ke email Anda.', 'success');
                    localStorage.setItem("pendingNik", nik);
                    
                    setTimeout(() => {
                        showOtpModal();
                    }, 1000);
                } else {
                    throw new Error(data.message || 'Login gagal');
                }
            } catch (error) {
                showMessage(error.message || 'Terjadi kesalahan saat login', 'error');
            } finally {
                // Reset button state
                loginBtn.disabled = false;
                loginBtnText.textContent = 'Masuk';
                loginBtnIcon.className = 'fas fa-arrow-right';
            }
        });
    }
    
    // OTP form submission
    if (otpForm) {
        otpForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const otp = document.getElementById('otp').value;
            const nik = localStorage.getItem("pendingNik");
            const otpBtn = document.getElementById('otp-btn');
            const otpBtnText = document.getElementById('otp-btn-text');
            const otpBtnIcon = document.getElementById('otp-btn-icon');
            
            if (otp.length !== 6) {
                showOtpMessage('Mohon masukkan kode OTP 6 digit', 'error');
                return;
            }
            
            // Show loading state
            otpBtn.disabled = true;
            otpBtnText.textContent = 'Memverifikasi...';
            otpBtnIcon.className = 'fas fa-spinner fa-spin';
            
            try {
                // Real API call to verify OTP
                const res = await fetch(WORKER_URL, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        action: "verify-otp",
                        nik,
                        otp,
                        deviceInfo: navigator.userAgent
                    })
                });

                const data = await res.json();
                
                if (data.success && data.user && data.user.sessionId) {
                    setSession(data.user.sessionId);
                    localStorage.removeItem("pendingNik");
                    showOtpMessage('Verifikasi berhasil! Mengalihkan ke dashboard...', 'success');
                    
                    setTimeout(() => {
                        loginSuccess(data.user);
                    }, 1000);
                } else {
                    throw new Error(data.message || 'Verifikasi OTP gagal');
                }
            } catch (error) {
                showOtpMessage(error.message || 'Terjadi kesalahan saat verifikasi OTP', 'error');
            } finally {
                // Reset button state
                otpBtn.disabled = false;
                otpBtnText.textContent = 'Verifikasi';
                otpBtnIcon.className = 'fas fa-check';
            }
        });
    }
});

// Session loading effect functions
function showSessionLoadingEffect() {
    // Create loading overlay
    const loadingOverlay = document.createElement('div');
    loadingOverlay.id = 'session-loading';
    loadingOverlay.className = 'fixed inset-0 bg-white dark:bg-gray-900 flex items-center justify-center z-50';
    loadingOverlay.innerHTML = `
        <div class="text-center">
            <div class="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 animate-pulse">
                <i class="fas fa-cube text-white text-2xl"></i>
            </div>
            <h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-2">DTKS Dashboard</h2>
            <div class="flex items-center justify-center space-x-2 text-gray-600 dark:text-gray-400">
                <div class="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style="animation-delay: 0ms"></div>
                <div class="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style="animation-delay: 150ms"></div>
                <div class="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style="animation-delay: 300ms"></div>
            </div>
            <p class="text-sm text-gray-500 dark:text-gray-400 mt-2">Sebentar ya boss :)</p>
        </div>
    `;
    document.body.appendChild(loadingOverlay);
}

function hideSessionLoadingEffect() {
    const loadingOverlay = document.getElementById('session-loading');
    if (loadingOverlay) {
        loadingOverlay.style.opacity = '0';
        loadingOverlay.style.transition = 'opacity 0.3s ease-out';
        setTimeout(() => {
            if (loadingOverlay.parentNode) {
                loadingOverlay.parentNode.removeChild(loadingOverlay);
            }
        }, 300);
    }
}

// Session validation
async function validateSession() {
    const sessionId = getSession();
    if (!sessionId) {
        return false;
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
            return data.user;
        } else {
            clearSession();
            return false;
        }
    } catch (error) {
        clearSession();
        return false;
    }
}

// Dark Mode for Login
function toggleDarkModeLogin() {
    const darkModeIcon = document.getElementById('darkModeIconLogin');
    
    document.documentElement.classList.toggle('dark');
    const isDark = document.documentElement.classList.contains('dark');
    
    if (isDark) {
        darkModeIcon.className = 'fas fa-sun';
    } else {
        darkModeIcon.className = 'fas fa-moon';
    }
    
    localStorage.setItem('darkMode', isDark);
}

// Logout functions
function logoutUser() {
    document.getElementById('logoutModal').classList.remove('hidden');
}

function closeLogoutModal() {
    document.getElementById('logoutModal').classList.add('hidden');
}

async function confirmLogout() {
    const sessionId = getSession();
    
    // Call logout API if session exists
    if (sessionId) {
        try {
            await fetch(WORKER_URL, {
                method: "POST",
                headers: { 
                    "Content-Type": "application/json", 
                    "x-session-id": sessionId 
                },
                body: JSON.stringify({ action: "logout" })
            });
        } catch (error) {
            console.error('Logout API error:', error);
        }
    }
    
    // Clear session and reset UI
    clearSession();
    
    // Hide dashboard
    document.getElementById('dashboard').classList.add('hidden');
    
    // Show login step
    document.getElementById('login-step').classList.remove('hidden');
    
    // Reset forms
    document.getElementById('loginForm').reset();
    document.querySelectorAll('.otp-input').forEach(input => input.value = '');
    document.getElementById('otp').value = '';
    
    // Hide messages
    document.getElementById('message').classList.add('hidden');
    document.getElementById('otp-message').classList.add('hidden');
    
    // Close modals
    closeLogoutModal();
    closeOtpModal();
    
    // Clear timers
    clearOtpTimer();
    
    // Reset resend count
    resendCount = 0;
    
    // Remove resize listener
    window.removeEventListener('resize', handleResize);
    
    // Reset global variables
    sidebar = null;
    header = null;
    mainContent = null;
    sidebarToggle = null;
    headerToggle = null;
    darkModeToggle = null;
    sidebarTexts = null;
    sidebarToggleBtn = null;
    isCollapsed = false;
}
