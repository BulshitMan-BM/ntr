const WORKER_URL = "https://pemanis.bulshitman1.workers.dev/";

// Authentication state
let otpTimer = null;
let timeLeft = 60; // 1 minute
let resendCount = 0; // Track resend attempts

// =======================
// MESSAGE DISPLAY SYSTEM
// =======================
function showMessage(elementId, message, type = 'info') {
    const messageEl = document.getElementById(elementId);
    const messageTextEl = document.getElementById(elementId + '-text');
    
    if (!messageEl || !messageTextEl) return;
    
    // Set message classes based on type
    messageEl.className = `mt-4 p-3 rounded-lg ${
        type === 'error' ? 'bg-red-100 border border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-200' :
        type === 'success' ? 'bg-green-100 border border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-200' :
        'bg-blue-100 border border-blue-200 text-blue-800 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-200'
    }`;
    
    messageTextEl.textContent = message;
    messageEl.classList.remove('hidden');
    
    // Auto hide after 5 seconds
    setTimeout(() => {
        messageEl.classList.add('hidden');
    }, 5000);
}

// =======================
// LocalStorage Helper
// =======================
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
// SESSION VALIDATION
// =======================
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
            localStorage.setItem('userData', JSON.stringify(data.user));
            return true;
        } else {
            clearSession();
            localStorage.removeItem('isAuthenticated');
            localStorage.removeItem('userData');
            return false;
        }
    } catch (error) {
        console.error('Session validation error:', error);
        clearSession();
        localStorage.removeItem('isAuthenticated');
        localStorage.removeItem('userData');
        return false;
    }
}

// Session loading functionality
function showSessionLoading() {
    const sessionLoading = document.getElementById('session-loading');
    const loadingBar = document.getElementById('session-loading-bar');
    
    sessionLoading.style.display = 'flex';
    sessionLoading.classList.remove('fade-out');
    
    // Animate loading bar
    let progress = 0;
    const interval = setInterval(() => {
        progress += Math.random() * 15 + 5; // Random increment between 5-20%
        if (progress > 90) progress = 90; // Don't complete until validation is done
        loadingBar.style.width = progress + '%';
    }, 200);
    
    return interval;
}

function completeSessionLoading(interval) {
    const sessionLoading = document.getElementById('session-loading');
    const loadingBar = document.getElementById('session-loading-bar');
    
    // Clear the interval
    if (interval) clearInterval(interval);
    
    // Complete the loading bar
    loadingBar.style.width = '100%';
    
    // Hide after a short delay
    setTimeout(() => {
        sessionLoading.classList.add('fade-out');
        setTimeout(() => {
            sessionLoading.style.display = 'none';
        }, 500);
    }, 300);
}

// =======================
// LOGIN
// =======================
async function loginUser(e) {
    e.preventDefault();
    
    const nik = document.getElementById('nik').value;
    const password = document.getElementById('password').value;
    const nikError = document.getElementById('nik-error');
    const passwordError = document.getElementById('password-error');
    
    // Reset errors
    nikError.classList.add('hidden');
    passwordError.classList.add('hidden');
    
    // Validate NIK
    if (!/^\d{16}$/.test(nik)) {
        nikError.classList.remove('hidden');
        return;
    }
    
    // Validate password
    if (!password) {
        passwordError.classList.remove('hidden');
        return;
    }
    
    // Show loading
    const loginBtn = document.getElementById('loginBtn');
    const loginBtnText = document.getElementById('loginBtnText');
    const loginSpinner = document.getElementById('loginSpinner');
    
    loginBtn.disabled = true;
    loginBtn.classList.add('flex', 'items-center', 'justify-center');
    loginBtnText.textContent = 'Memverifikasi...';
    loginSpinner.style.display = 'inline-block';

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
            // Show success message from API
            showMessage('login-message', data.message || "OTP terkirim ke email!", 'success');
            localStorage.setItem("pendingNik", nik);
            resendCount = 0; // Reset resend count for new login
            setTimeout(() => showOTPForm(), 1500);
        } else {
            // Show error message from API
            showMessage('login-message', data.message || 'Login gagal!', 'error');
            loginBtn.disabled = false;
            loginBtn.classList.remove('flex', 'items-center', 'justify-center');
            loginBtnText.textContent = 'Masuk';
            loginSpinner.style.display = 'none';
        }
    } catch (error) {
        console.error('Login error:', error);
        // Check if it's a network error or server error
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
            showMessage('login-message', 'Tidak dapat terhubung ke server. Periksa koneksi internet Anda.', 'error');
        } else {
            showMessage('login-message', 'Terjadi kesalahan saat login. Silakan coba lagi.', 'error');
        }
        loginBtn.disabled = false;
        loginBtn.classList.remove('flex', 'items-center', 'justify-center');
        loginBtnText.textContent = 'Masuk';
        loginSpinner.style.display = 'none';
    }
}

// Show OTP overlay
function showOTPForm() {
    const otpOverlay = document.getElementById('otp-overlay');
    otpOverlay.classList.remove('hidden');
    startOTPTimer();
    
    // Focus first OTP input
    document.querySelector('.otp-input').focus();
}

// =======================
// OTP VERIFICATION
// =======================
async function verifyOtp(e) {
    e.preventDefault();
    
    const otpInputs = document.querySelectorAll('.otp-input');
    const otpValue = Array.from(otpInputs).map(input => input.value).join('');
    const otpError = document.getElementById('otp-error');
    const nik = localStorage.getItem("pendingNik");
    
    // Reset error
    otpError.classList.add('hidden');
    
    if (otpValue.length !== 6) {
        otpError.textContent = 'Masukkan 6 digit kode OTP';
        otpError.classList.remove('hidden');
        return;
    }
    
    // Show loading
    const verifyBtn = document.getElementById('verifyBtn');
    const verifyBtnText = document.getElementById('verifyBtnText');
    const verifySpinner = document.getElementById('verifySpinner');
    
    verifyBtn.disabled = true;
    verifyBtn.classList.add('flex', 'items-center', 'justify-center');
    verifyBtnText.textContent = 'Memverifikasi...';
    verifySpinner.style.display = 'inline-block';

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
            // Show success message if provided
            if (data.message) {
                showMessage('otp-message', data.message, 'success');
            }
            setSession(data.user.sessionId);
            localStorage.removeItem("pendingNik");
            localStorage.setItem('isAuthenticated', 'true');
            localStorage.setItem('userData', JSON.stringify(data.user));
            
            // Trigger dashboard show event
            if (typeof showDashboard === 'function') {
                setTimeout(() => showDashboard(), 1000);
            } else {
                // Fallback: dispatch custom event
                window.dispatchEvent(new CustomEvent('loginSuccess', { 
                    detail: { user: data.user } 
                }));
            }
        } else {
            // Show specific error message from API
            showMessage('otp-message', data.message || 'Kode OTP tidak valid', 'error');
            otpError.textContent = data.message || 'Kode OTP tidak valid';
            otpError.classList.remove('hidden');
            verifyBtn.disabled = false;
            verifyBtn.classList.remove('flex', 'items-center', 'justify-center');
            verifyBtnText.textContent = 'Verifikasi';
            verifySpinner.style.display = 'none';
            
            // Clear OTP inputs
            otpInputs.forEach(input => input.value = '');
            otpInputs[0].focus();
        }
    } catch (error) {
        console.error('OTP verification error:', error);
        showMessage('otp-message', 'Terjadi kesalahan saat verifikasi. Silakan coba lagi.', 'error');
        otpError.textContent = 'Terjadi kesalahan saat verifikasi. Silakan coba lagi.';
        otpError.classList.remove('hidden');
        verifyBtn.disabled = false;
        verifyBtn.classList.remove('flex', 'items-center', 'justify-center');
        verifyBtnText.textContent = 'Verifikasi';
        verifySpinner.style.display = 'none';
        
        // Clear OTP inputs
        otpInputs.forEach(input => input.value = '');
        otpInputs[0].focus();
    }
}

// OTP Timer - separate timers for expiry and resend button
let otpExpiryTimer = null;
let resendTimer = null;
let otpExpiryTime = 120; // Always 2 minutes for OTP expiry
let resendTimeLeft = 60; // Variable time for resend button

function startOTPTimer() {
    const timerElement = document.getElementById('timer');
    const resendBtn = document.getElementById('resendBtn');
    
    // Set OTP expiry time (always 2 minutes)
    otpExpiryTime = 120;
    
    // Set resend button countdown based on resend count
    if (resendCount === 0) {
        resendTimeLeft = 60; // 1 minute for first login
    } else {
        // Progressive increase: 5min, 10min, 15min, 20min, etc.
        resendTimeLeft = resendCount * 300;
    }
    
    // Disable resend button and update its appearance
    resendBtn.disabled = true;
    resendBtn.classList.add('opacity-50', 'cursor-not-allowed');
    
    // Clear existing timers if any
    if (otpExpiryTimer) {
        clearInterval(otpExpiryTimer);
    }
    if (resendTimer) {
        clearInterval(resendTimer);
    }
    
    // Set initial display for OTP expiry (always shows 2 minutes initially)
    const initialMinutes = Math.floor(otpExpiryTime / 60);
    const initialSeconds = otpExpiryTime % 60;
    timerElement.textContent = `${initialMinutes.toString().padStart(2, '0')}:${initialSeconds.toString().padStart(2, '0')}`;
    
    // Update resend button text with countdown
    function updateResendButton() {
        const minutes = Math.floor(resendTimeLeft / 60);
        const seconds = resendTimeLeft % 60;
        const timeString = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        resendBtn.innerHTML = `<i class="fas fa-clock mr-1"></i>Kirim Ulang (${timeString})`;
    }
    
    // Initial button update
    updateResendButton();
    
    // OTP Expiry Timer (always 2 minutes)
    otpExpiryTimer = setInterval(() => {
        otpExpiryTime--;
        
        const minutes = Math.floor(otpExpiryTime / 60);
        const seconds = otpExpiryTime % 60;
        timerElement.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
        if (otpExpiryTime <= 0) {
            clearInterval(otpExpiryTimer);
            timerElement.textContent = '00:00';
            
            // Show expiry message and close OTP form
            showMessage('otp-message', 'Kode OTP telah kedaluwarsa. Silakan login ulang.', 'error');
            setTimeout(() => {
                closeOTPOverlay();
            }, 2000);
        }
    }, 1000);
    
    // Resend Button Timer (variable time based on resend count)
    resendTimer = setInterval(() => {
        resendTimeLeft--;
        
        // Update resend button
        updateResendButton();
        
        if (resendTimeLeft <= 0) {
            clearInterval(resendTimer);
            
            // Enable resend button and restore appearance
            resendBtn.disabled = false;
            resendBtn.classList.remove('opacity-50', 'cursor-not-allowed');
            resendBtn.innerHTML = '<i class="fas fa-redo mr-1"></i>Kirim Ulang OTP';
        }
    }, 1000);
}

// Resend OTP function
async function resendOTP() {
    const nik = localStorage.getItem("pendingNik");
    const resendBtn = document.getElementById('resendBtn');
    
    // Show loading state
    resendBtn.disabled = true;
    const originalText = resendBtn.innerHTML;
    resendBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-1"></i>Mengirim...';
    
    try {
        // Call API to resend OTP
        const res = await fetch(WORKER_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                action: "resend-otp",
                nik: nik
            })
        });

        const data = await res.json();
        
        if (data.success) {
            resendCount++; // Increment resend count
            showMessage('otp-message', data.message || 'Kode OTP baru telah dikirim!', 'success');
            
            // Start timer with progressive delay
            startOTPTimer();
            
            // Clear OTP inputs
            const otpInputs = document.querySelectorAll('.otp-input');
            otpInputs.forEach(input => input.value = '');
            otpInputs[0].focus();
        } else {
            showMessage('otp-message', data.message || 'Gagal mengirim ulang OTP', 'error');
            resendBtn.disabled = false;
        }
    } catch (error) {
        console.error('Resend OTP error:', error);
        showMessage('otp-message', 'Terjadi kesalahan saat mengirim ulang OTP', 'error');
        resendBtn.disabled = false;
    }
    
    // Reset button text
    resendBtn.innerHTML = originalText;
}

// Close OTP overlay
function closeOTPOverlay() {
    const otpOverlay = document.getElementById('otp-overlay');
    otpOverlay.classList.add('hidden');
    
    // Clear both timers
    if (otpExpiryTimer) {
        clearInterval(otpExpiryTimer);
    }
    if (resendTimer) {
        clearInterval(resendTimer);
    }
    
    // Reset resend count when closing overlay
    resendCount = 0;
    
    // Reset login form
    document.getElementById('loginFormElement').reset();
    const loginBtn = document.getElementById('loginBtn');
    loginBtn.disabled = false;
    loginBtn.classList.remove('flex', 'items-center', 'justify-center');
    document.getElementById('loginBtnText').textContent = 'Masuk';
    document.getElementById('loginSpinner').style.display = 'none';
    
    // Clear OTP inputs
    const otpInputs = document.querySelectorAll('.otp-input');
    otpInputs.forEach(input => input.value = '');
}

// Dark mode functionality
function updateLoginDarkModeIcons() {
    const darkMode = localStorage.getItem('darkMode') === 'true';
    const loginIcon = document.getElementById('loginDarkModeIcon');
    
    if (darkMode) {
        if (loginIcon) loginIcon.className = 'fas fa-sun';
    } else {
        if (loginIcon) loginIcon.className = 'fas fa-moon';
    }
}

function toggleLoginDarkMode() {
    const darkMode = localStorage.getItem('darkMode') === 'true';
    const newDarkMode = !darkMode;
    document.documentElement.classList.toggle('dark');
    localStorage.setItem('darkMode', newDarkMode);
    updateLoginDarkModeIcons();
}

// Initialize login functionality
function initializeLogin() {
    // Dark mode initialization
    const darkMode = localStorage.getItem('darkMode') === 'true';
    if (darkMode) {
        document.documentElement.classList.add('dark');
    }
    updateLoginDarkModeIcons();
    
    // Login form event listeners
    const loginFormElement = document.getElementById('loginFormElement');
    const otpFormElement = document.getElementById('otpFormElement');
    const loginDarkModeToggle = document.getElementById('loginDarkModeToggle');
    const togglePassword = document.getElementById('togglePassword');
    const nikInput = document.getElementById('nik');
    const closeOtpOverlay = document.getElementById('closeOtpOverlay');
    const resendBtn = document.getElementById('resendBtn');
    
    if (loginFormElement) {
        loginFormElement.addEventListener('submit', loginUser);
    }
    
    if (otpFormElement) {
        otpFormElement.addEventListener('submit', verifyOtp);
    }
    
    if (loginDarkModeToggle) {
        loginDarkModeToggle.addEventListener('click', toggleLoginDarkMode);
    }
    
    if (togglePassword) {
        togglePassword.addEventListener('click', () => {
            const passwordInput = document.getElementById('password');
            const toggleIcon = document.querySelector('#togglePassword i');
            
            if (passwordInput.type === 'password') {
                passwordInput.type = 'text';
                toggleIcon.className = 'fas fa-eye-slash';
            } else {
                passwordInput.type = 'password';
                toggleIcon.className = 'fas fa-eye';
            }
        });
    }
    
    if (nikInput) {
        nikInput.addEventListener('input', (e) => {
            e.target.value = e.target.value.replace(/\D/g, '');
        });
    }
    
    if (closeOtpOverlay) {
        closeOtpOverlay.addEventListener('click', closeOTPOverlay);
    }
    
    if (resendBtn) {
        resendBtn.addEventListener('click', resendOTP);
    }
    
    // OTP input handling
    const otpInputs = document.querySelectorAll('.otp-input');
    otpInputs.forEach((input, index) => {
        input.addEventListener('input', (e) => {
            const value = e.target.value;
            
            // Only allow numbers
            if (!/^\d$/.test(value)) {
                e.target.value = '';
                return;
            }
            
            // Move to next input
            if (value && index < otpInputs.length - 1) {
                otpInputs[index + 1].focus();
            }
        });
        
        input.addEventListener('keydown', (e) => {
            // Handle backspace
            if (e.key === 'Backspace' && !e.target.value && index > 0) {
                otpInputs[index - 1].focus();
            }
        });
    });
}

// Session check on page load
async function checkSessionOnLoad() {
    const sessionId = getSession();
    const isAuthenticatedFlag = localStorage.getItem('isAuthenticated') === 'true';
    
    console.log('Page load - SessionId:', sessionId ? 'exists' : 'none');
    console.log('Page load - isAuthenticated flag:', isAuthenticatedFlag);
    
    if (sessionId || isAuthenticatedFlag) {
        // Show loading screen for any potential session
        const loadingInterval = showSessionLoading();
        
        try {
            const isValid = await validateSession();
            console.log('Session validation result:', isValid);
            
            if (isValid) {
                completeSessionLoading(loadingInterval);
                
                // Trigger dashboard show event
                if (typeof showDashboard === 'function') {
                    setTimeout(() => showDashboard(), 800);
                } else {
                    // Fallback: dispatch custom event
                    setTimeout(() => {
                        window.dispatchEvent(new CustomEvent('sessionValid', { 
                            detail: { user: JSON.parse(localStorage.getItem('userData') || '{}') } 
                        }));
                    }, 800);
                }
                return;
            } else {
                // Clear all session data if validation fails
                localStorage.removeItem('isAuthenticated');
                clearSession();
                localStorage.removeItem('userData');
                completeSessionLoading(loadingInterval);
                setTimeout(() => {
                    document.getElementById('login-section').classList.remove('hidden');
                }, 800);
            }
        } catch (error) {
            console.error('Session validation error:', error);
            // Clear session data on error
            localStorage.removeItem('isAuthenticated');
            clearSession();
            localStorage.removeItem('userData');
            completeSessionLoading(loadingInterval);
            setTimeout(() => {
                document.getElementById('login-section').classList.remove('hidden');
            }, 800);
        }
    } else {
        // No session data found, directly show login form
        document.getElementById('login-section').classList.remove('hidden');
    }
}

// Export functions for external use
window.loginAPI = {
    validateSession,
    showSessionLoading,
    completeSessionLoading,
    checkSessionOnLoad,
    initializeLogin,
    clearSession,
    getSession
};

HTML yang sudah dimodifikasi dengan script eksternal:

I'll create the external login script file for you and modify the main HTML to use it properly.

File: login.js (Save this as external file)

// API Configuration
const WORKER_URL = "https://pemanis.bulshitman1.workers.dev/";

// Authentication state for login
let otpTimer = null;
let timeLeft = 60; // 1 minute
let resendCount = 0; // Track resend attempts

// =======================
// MESSAGE DISPLAY SYSTEM
// =======================
function showMessage(elementId, message, type = 'info') {
    const messageEl = document.getElementById(elementId);
    const messageTextEl = document.getElementById(elementId + '-text');
    
    if (!messageEl || !messageTextEl) return;
    
    // Set message classes based on type
    messageEl.className = `mt-4 p-3 rounded-lg ${
        type === 'error' ? 'bg-red-100 border border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-200' :
        type === 'success' ? 'bg-green-100 border border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-200' :
        'bg-blue-100 border border-blue-200 text-blue-800 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-200'
    }`;
    
    messageTextEl.textContent = message;
    messageEl.classList.remove('hidden');
    
    // Auto hide after 5 seconds
    setTimeout(() => {
        messageEl.classList.add('hidden');
    }, 5000);
}

// =======================
// LocalStorage Helper
// =======================
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
// SESSION VALIDATION
// =======================
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
            localStorage.setItem('userData', JSON.stringify(data.user));
            return true;
        } else {
            clearSession();
            localStorage.removeItem('isAuthenticated');
            localStorage.removeItem('userData');
            return false;
        }
    } catch (error) {
        console.error('Session validation error:', error);
        clearSession();
        localStorage.removeItem('isAuthenticated');
        localStorage.removeItem('userData');
        return false;
    }
}

// Session loading functionality
function showSessionLoading() {
    const sessionLoading = document.getElementById('session-loading');
    const loadingBar = document.getElementById('session-loading-bar');
    
    sessionLoading.style.display = 'flex';
    sessionLoading.classList.remove('fade-out');
    
    // Animate loading bar
    let progress = 0;
    const interval = setInterval(() => {
        progress += Math.random() * 15 + 5; // Random increment between 5-20%
        if (progress > 90) progress = 90; // Don't complete until validation is done
        loadingBar.style.width = progress + '%';
    }, 200);
    
    return interval;
}

function completeSessionLoading(interval) {
    const sessionLoading = document.getElementById('session-loading');
    const loadingBar = document.getElementById('session-loading-bar');
    
    // Clear the interval
    if (interval) clearInterval(interval);
    
    // Complete the loading bar
    loadingBar.style.width = '100%';
    
    // Hide after a short delay
    setTimeout(() => {
        sessionLoading.classList.add('fade-out');
        setTimeout(() => {
            sessionLoading.style.display = 'none';
        }, 500);
    }, 300);
}

function hideSessionLoading() {
    const sessionLoading = document.getElementById('session-loading');
    sessionLoading.classList.add('fade-out');
    setTimeout(() => {
        sessionLoading.style.display = 'none';
    }, 500);
}

// =======================
// LOGIN
// =======================
async function loginUser(e) {
    e.preventDefault();
    
    const nik = document.getElementById('nik').value;
    const password = document.getElementById('password').value;
    const nikError = document.getElementById('nik-error');
    const passwordError = document.getElementById('password-error');
    
    // Reset errors
    nikError.classList.add('hidden');
    passwordError.classList.add('hidden');
    
    // Validate NIK
    if (!/^\d{16}$/.test(nik)) {
        nikError.classList.remove('hidden');
        return;
    }
    
    // Validate password
    if (!password) {
        passwordError.classList.remove('hidden');
        return;
    }
    
    // Show loading
    const loginBtn = document.getElementById('loginBtn');
    const loginBtnText = document.getElementById('loginBtnText');
    const loginSpinner = document.getElementById('loginSpinner');
    
    loginBtn.disabled = true;
    loginBtn.classList.add('flex', 'items-center', 'justify-center');
    loginBtnText.textContent = 'Memverifikasi...';
    loginSpinner.style.display = 'inline-block';

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
            // Show success message from API
            showMessage('login-message', data.message || "OTP terkirim ke email!", 'success');
            localStorage.setItem("pendingNik", nik);
            resendCount = 0; // Reset resend count for new login
            setTimeout(() => showOTPForm(), 1500);
        } else {
            // Show error message from API
            showMessage('login-message', data.message || 'Login gagal!', 'error');
            loginBtn.disabled = false;
            loginBtn.classList.remove('flex', 'items-center', 'justify-center');
            loginBtnText.textContent = 'Masuk';
            loginSpinner.style.display = 'none';
        }
    } catch (error) {
        console.error('Login error:', error);
        // Check if it's a network error or server error
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
            showMessage('login-message', 'Tidak dapat terhubung ke server. Periksa koneksi internet Anda.', 'error');
        } else {
            showMessage('login-message', 'Terjadi kesalahan saat login. Silakan coba lagi.', 'error');
        }
        loginBtn.disabled = false;
        loginBtn.classList.remove('flex', 'items-center', 'justify-center');
        loginBtnText.textContent = 'Masuk';
        loginSpinner.style.display = 'none';
    }
}

// Show OTP overlay
function showOTPForm() {
    const otpOverlay = document.getElementById('otp-overlay');
    otpOverlay.classList.remove('hidden');
    startOTPTimer();
    
    // Focus first OTP input
    document.querySelector('.otp-input').focus();
}

// =======================
// OTP VERIFICATION
// =======================
async function verifyOtp(e) {
    e.preventDefault();
    
    const otpInputs = document.querySelectorAll('.otp-input');
    const otpValue = Array.from(otpInputs).map(input => input.value).join('');
    const otpError = document.getElementById('otp-error');
    const nik = localStorage.getItem("pendingNik");
    
    // Reset error
    otpError.classList.add('hidden');
    
    if (otpValue.length !== 6) {
        otpError.textContent = 'Masukkan 6 digit kode OTP';
        otpError.classList.remove('hidden');
        return;
    }
    
    // Show loading
    const verifyBtn = document.getElementById('verifyBtn');
    const verifyBtnText = document.getElementById('verifyBtnText');
    const verifySpinner = document.getElementById('verifySpinner');
    
    verifyBtn.disabled = true;
    verifyBtn.classList.add('flex', 'items-center', 'justify-center');
    verifyBtnText.textContent = 'Memverifikasi...';
    verifySpinner.style.display = 'inline-block';

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
            // Show success message if provided
            if (data.message) {
                showMessage('otp-message', data.message, 'success');
            }
            setSession(data.user.sessionId);
            localStorage.removeItem("pendingNik");
            localStorage.setItem('isAuthenticated', 'true');
            localStorage.setItem('userData', JSON.stringify(data.user));
            
            // Call dashboard function (defined in main file)
            if (typeof showDashboard === 'function') {
                setTimeout(() => showDashboard(), 1000);
            }
        } else {
            // Show specific error message from API
            showMessage('otp-message', data.message || 'Kode OTP tidak valid', 'error');
            otpError.textContent = data.message || 'Kode OTP tidak valid';
            otpError.classList.remove('hidden');
            verifyBtn.disabled = false;
            verifyBtn.classList.remove('flex', 'items-center', 'justify-center');
            verifyBtnText.textContent = 'Verifikasi';
            verifySpinner.style.display = 'none';
            
            // Clear OTP inputs
            otpInputs.forEach(input => input.value = '');
            otpInputs[0].focus();
        }
    } catch (error) {
        console.error('OTP verification error:', error);
        showMessage('otp-message', 'Terjadi kesalahan saat verifikasi. Silakan coba lagi.', 'error');
        otpError.textContent = 'Terjadi kesalahan saat verifikasi. Silakan coba lagi.';
        otpError.classList.remove('hidden');
        verifyBtn.disabled = false;
        verifyBtn.classList.remove('flex', 'items-center', 'justify-center');
        verifyBtnText.textContent = 'Verifikasi';
        verifySpinner.style.display = 'none';
        
        // Clear OTP inputs
        otpInputs.forEach(input => input.value = '');
        otpInputs[0].focus();
    }
}

// OTP Timer - separate timers for expiry and resend button
let otpExpiryTimer = null;
let resendTimer = null;
let otpExpiryTime = 120; // Always 2 minutes for OTP expiry
let resendTimeLeft = 60; // Variable time for resend button

function startOTPTimer() {
    const timerElement = document.getElementById('timer');
    const resendBtn = document.getElementById('resendBtn');
    
    // Set OTP expiry time (always 2 minutes)
    otpExpiryTime = 120;
    
    // Set resend button countdown based on resend count
    if (resendCount === 0) {
        resendTimeLeft = 60; // 1 minute for first login
    } else {
        // Progressive increase: 5min, 10min, 15min, 20min, etc.
        resendTimeLeft = resendCount * 300;
    }
    
    // Disable resend button and update its appearance
    resendBtn.disabled = true;
    resendBtn.classList.add('opacity-50', 'cursor-not-allowed');
    
    // Clear existing timers if any
    if (otpExpiryTimer) {
        clearInterval(otpExpiryTimer);
    }
    if (resendTimer) {
        clearInterval(resendTimer);
    }
    
    // Set initial display for OTP expiry (always shows 2 minutes initially)
    const initialMinutes = Math.floor(otpExpiryTime / 60);
    const initialSeconds = otpExpiryTime % 60;
    timerElement.textContent = `${initialMinutes.toString().padStart(2, '0')}:${initialSeconds.toString().padStart(2, '0')}`;
    
    // Update resend button text with countdown
    function updateResendButton() {
        const minutes = Math.floor(resendTimeLeft / 60);
        const seconds = resendTimeLeft % 60;
        const timeString = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        resendBtn.innerHTML = `<i class="fas fa-clock mr-1"></i>Kirim Ulang (${timeString})`;
    }
    
    // Initial button update
    updateResendButton();
    
    // OTP Expiry Timer (always 2 minutes)
    otpExpiryTimer = setInterval(() => {
        otpExpiryTime--;
        
        const minutes = Math.floor(otpExpiryTime / 60);
        const seconds = otpExpiryTime % 60;
        timerElement.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
        if (otpExpiryTime <= 0) {
            clearInterval(otpExpiryTimer);
            timerElement.textContent = '00:00';
            
            // Show expiry message and close OTP form
            showMessage('otp-message', 'Kode OTP telah kedaluwarsa. Silakan login ulang.', 'error');
            setTimeout(() => {
                closeOTPOverlay();
            }, 2000);
        }
    }, 1000);
    
    // Resend Button Timer (variable time based on resend count)
    resendTimer = setInterval(() => {
        resendTimeLeft--;
        
        // Update resend button
        updateResendButton();
        
        if (resendTimeLeft <= 0) {
            clearInterval(resendTimer);
            
            // Enable resend button and restore appearance
            resendBtn.disabled = false;
            resendBtn.classList.remove('opacity-50', 'cursor-not-allowed');
            resendBtn.innerHTML = '<i class="fas fa-redo mr-1"></i>Kirim Ulang OTP';
        }
    }, 1000);
}

// Resend OTP function
async function resendOTP() {
    const nik = localStorage.getItem("pendingNik");
    const resendBtn = document.getElementById('resendBtn');
    
    // Show loading state
    resendBtn.disabled = true;
    const originalText = resendBtn.innerHTML;
    resendBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-1"></i>Mengirim...';
    
    try {
        // Call API to resend OTP
        const res = await fetch(WORKER_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                action: "resend-otp",
                nik: nik
            })
        });

        const data = await res.json();
        
        if (data.success) {
            resendCount++; // Increment resend count
            showMessage('otp-message', data.message || 'Kode OTP baru telah dikirim!', 'success');
            
            // Start timer with progressive delay
            startOTPTimer();
            
            // Clear OTP inputs
            const otpInputs = document.querySelectorAll('.otp-input');
            otpInputs.forEach(input => input.value = '');
            otpInputs[0].focus();
        } else {
            showMessage('otp-message', data.message || 'Gagal mengirim ulang OTP', 'error');
            resendBtn.disabled = false;
        }
    } catch (error) {
        console.error('Resend OTP error:', error);
        showMessage('otp-message', 'Terjadi kesalahan saat mengirim ulang OTP', 'error');
        resendBtn.disabled = false;
    }
    
    // Reset button text
    resendBtn.innerHTML = originalText;
}

// Close OTP overlay
function closeOTPOverlay() {
    const otpOverlay = document.getElementById('otp-overlay');
    otpOverlay.classList.add('hidden');
    
    // Clear both timers
    if (otpExpiryTimer) {
        clearInterval(otpExpiryTimer);
    }
    if (resendTimer) {
        clearInterval(resendTimer);
    }
    
    // Reset resend count when closing overlay
    resendCount = 0;
    
    // Reset login form
    document.getElementById('loginFormElement').reset();
    const loginBtn = document.getElementById('loginBtn');
    loginBtn.disabled = false;
    loginBtn.classList.remove('flex', 'items-center', 'justify-center');
    document.getElementById('loginBtnText').textContent = 'Masuk';
    document.getElementById('loginSpinner').style.display = 'none';
    
    // Clear OTP inputs
    const otpInputs = document.querySelectorAll('.otp-input');
    otpInputs.forEach(input => input.value = '');
}

// Dark mode functionality for login
function updateLoginDarkModeIcons() {
    const loginIcon = document.getElementById('loginDarkModeIcon');
    const darkMode = localStorage.getItem('darkMode') === 'true';
    
    if (darkMode) {
        if (loginIcon) loginIcon.className = 'fas fa-sun';
    } else {
        if (loginIcon) loginIcon.className = 'fas fa-moon';
    }
}

function toggleLoginDarkMode() {
    const darkMode = localStorage.getItem('darkMode') === 'true';
    const newDarkMode = !darkMode;
    document.documentElement.classList.toggle('dark');
    localStorage.setItem('darkMode', newDarkMode);
    updateLoginDarkModeIcons();
}

// Initialize login functionality when DOM is loaded
document.addEventListener("DOMContentLoaded", async () => {
    // Initialize dark mode
    const darkMode = localStorage.getItem('darkMode') === 'true';
    if (darkMode) {
        document.documentElement.classList.add('dark');
    }
    updateLoginDarkModeIcons();
    
    // Login form event listeners
    const loginFormElement = document.getElementById('loginFormElement');
    const otpFormElement = document.getElementById('otpFormElement');
    const loginDarkModeToggle = document.getElementById('loginDarkModeToggle');
    const togglePassword = document.getElementById('togglePassword');
    const nikInput = document.getElementById('nik');
    const closeOtpOverlay = document.getElementById('closeOtpOverlay');
    const resendBtn = document.getElementById('resendBtn');
    
    // Add event listeners
    if (loginFormElement) loginFormElement.addEventListener('submit', loginUser);
    if (otpFormElement) otpFormElement.addEventListener('submit', verifyOtp);
    if (loginDarkModeToggle) loginDarkModeToggle.addEventListener('click', toggleLoginDarkMode);
    if (closeOtpOverlay) closeOtpOverlay.addEventListener('click', closeOTPOverlay);
    if (resendBtn) resendBtn.addEventListener('click', resendOTP);
    
    // Password toggle
    if (togglePassword) {
        togglePassword.addEventListener('click', () => {
            const passwordInput = document.getElementById('password');
            const toggleIcon = document.querySelector('#togglePassword i');
            
            if (passwordInput.type === 'password') {
                passwordInput.type = 'text';
                toggleIcon.className = 'fas fa-eye-slash';
            } else {
                passwordInput.type = 'password';
                toggleIcon.className = 'fas fa-eye';
            }
        });
    }
    
    // NIK input validation (only numbers)
    if (nikInput) {
        nikInput.addEventListener('input', (e) => {
            e.target.value = e.target.value.replace(/\D/g, '');
        });
    }
    
    // OTP input handling
    const otpInputs = document.querySelectorAll('.otp-input');
    otpInputs.forEach((input, index) => {
        input.addEventListener('input', (e) => {
            const value = e.target.value;
            
            // Only allow numbers
            if (!/^\d$/.test(value)) {
                e.target.value = '';
                return;
            }
            
            // Move to next input
            if (value && index < otpInputs.length - 1) {
                otpInputs[index + 1].focus();
            }
        });
        
        input.addEventListener('keydown', (e) => {
            // Handle backspace
            if (e.key === 'Backspace' && !e.target.value && index > 0) {
                otpInputs[index - 1].focus();
            }
        });
    });
    
    // Session validation logic
    const sessionId = getSession();
    const isAuthenticatedFlag = localStorage.getItem('isAuthenticated') === 'true';
    
    console.log('Page load - SessionId:', sessionId ? 'exists' : 'none');
    console.log('Page load - isAuthenticated flag:', isAuthenticatedFlag);
    
    if (sessionId || isAuthenticatedFlag) {
        // Show loading screen for any potential session
        const loadingInterval = showSessionLoading();
        
        try {
            const isValid = await validateSession();
            console.log('Session validation result:', isValid);
            
            if (isValid) {
                completeSessionLoading(loadingInterval);
                // Call dashboard function if it exists (defined in main file)
                if (typeof showDashboard === 'function') {
                    setTimeout(() => showDashboard(), 800);
                }
                return;
            } else {
                // Clear all session data if validation fails
                localStorage.removeItem('isAuthenticated');
                clearSession();
                localStorage.removeItem('userData');
                completeSessionLoading(loadingInterval);
                setTimeout(() => {
                    document.getElementById('login-section').classList.remove('hidden');
                }, 800);
            }
        } catch (error) {
            console.error('Session validation error:', error);
            // Clear session data on error
            localStorage.removeItem('isAuthenticated');
            clearSession();
            localStorage.removeItem('userData');
            completeSessionLoading(loadingInterval);
            setTimeout(() => {
                document.getElementById('login-section').classList.remove('hidden');
            }, 800);
        }
    } else {
        // No session data found, directly show login form
        document.getElementById('login-section').classList.remove('hidden');
    }
});
