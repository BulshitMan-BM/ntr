// ===== AUTHENTICATION SYSTEM =====
// Configuration
const API_URL = "https://test.bulshitman1.workers.dev";
const OTP_EXPIRY_TIME = 60; // seconds
const RESEND_COOLDOWNS = [60, 600, 1800, 3600]; // Progressive cooldown in seconds

// Global variables
let currentUser = null;
let resendTimer = null;
let otpExpiryTimer = null;
let resendAttempts = 0;
let otpExpiryTime = OTP_EXPIRY_TIME;
let isCollapsed = false; // ✅ cukup sekali di sini
let currentCaptcha = '';
let captchaVerified = false;
let isSubmittingOTP = false;
function createDistortedTextPattern() { /* ... gunakan fungsi canvas seperti sebelumnya ... */ }
function getRandomBackgroundImage() { return createDistortedTextPattern(); }
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
function generateCaptcha() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
    currentCaptcha = Array.from({length: 6}, () => chars[Math.floor(Math.random() * chars.length)]).join('');

    const captchaContainer = document.getElementById('captchaContainer');
    const captchaDisplay = document.getElementById('captchaDisplay');
    captchaContainer.style.backgroundImage = `url('${getRandomBackgroundImage()}')`;
    captchaDisplay.style.backgroundImage = `url('${getRandomBackgroundImage()}')`;

    const captchaText = document.getElementById('captchaText');
    captchaText.innerHTML = '';
    currentCaptcha.split('').forEach(c => {
        const span = document.createElement('span');
        span.textContent = c;
        span.style.transform = `rotate(${Math.random() * 15 - 7.5}deg)`;
        span.style.display = 'inline-block';
        span.style.margin = '0 4px';
        span.style.fontSize = '18px';
        span.style.fontWeight = 'bold';
        span.style.color = `hsl(${Math.random() * 360}, 80%, 40%)`;
        span.style.textShadow = '2px 2px 4px rgba(0,0,0,0.9)';
        captchaText.appendChild(span);
    });

    captchaVerified = false;
    document.getElementById('captchaInput').value = '';
    document.getElementById('captchaErrorIcon').classList.add('hidden', 'opacity-0');
    document.getElementById('captchaSuccessIcon').classList.add('hidden', 'opacity-0');
    document.getElementById('captchaInput').classList.remove('border-green-500', 'border-red-500');
    document.getElementById('loginButton').disabled = true;
}

function verifyCaptcha() {
    const input = document.getElementById('captchaInput').value;
    const errorIcon = document.getElementById('captchaErrorIcon');
    const successIcon = document.getElementById('captchaSuccessIcon');
    const inputField = document.getElementById('captchaInput');
    const loginButton = document.getElementById('loginButton');

    if (input.toLowerCase() === currentCaptcha.toLowerCase()) {
        captchaVerified = true;
        errorIcon.classList.add('hidden','opacity-0');
        successIcon.classList.remove('hidden','opacity-0');
        inputField.classList.remove('border-red-500');
        inputField.classList.add('border-green-500');
        loginButton.disabled = false;
        return true;
    } else {
        captchaVerified = false;
        errorIcon.classList.remove('hidden','opacity-0');
        successIcon.classList.add('hidden','opacity-0');
        inputField.classList.remove('border-green-500');
        inputField.classList.add('border-red-500');
        loginButton.disabled = true;
        inputField.style.animation = 'shake 0.5s ease-in-out';
        setTimeout(() => inputField.style.animation = '', 500);
        return false;
    }
}
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


function showInlineMessage(containerId, message, type = 'success') {
    const container = document.getElementById(containerId);
    if (!container) return;

    // Remove existing message
    const existingMessage = container.querySelector('.inline-message');
    if (existingMessage) {
        existingMessage.remove();
    }

    const messageDiv = document.createElement('div');
    messageDiv.className = `inline-message mb-4 p-3 rounded-lg border ${
        type === 'success' 
            ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-800 dark:text-green-200' 
            : type === 'error' 
            ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200'
            : 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200'
    }`;
    
    messageDiv.innerHTML = `
        <div class="flex items-center">
            <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'} mr-2"></i>
            <span class="text-sm font-medium">${message}</span>
        </div>
    `;

    // Insert at the beginning of the form
    const form = container.querySelector('form');
    if (form) {
        form.insertBefore(messageDiv, form.firstChild);
    } else {
        container.insertBefore(messageDiv, container.firstChild);
    }

    // Auto-remove success messages after 5 seconds
    if (type === 'success') {
        setTimeout(() => {
            if (messageDiv.parentNode) {
                messageDiv.remove();
            }
        }, 5000);
    }
}

function clearInlineMessages(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const messages = container.querySelectorAll('.inline-message');
    messages.forEach(message => message.remove());
}

function setButtonLoading(buttonId, iconId, textId, isLoading, loadingText = 'Memproses...') {
    const button = document.getElementById(buttonId);
    const icon = document.getElementById(iconId);
    const text = document.getElementById(textId);
    
    if (!button || !icon || !text) return;

    if (isLoading) {
        button.disabled = true;
        button.classList.add('button-loading', 'opacity-75', 'cursor-not-allowed');
        icon.className = 'fas fa-spinner loading-spinner mr-2';
        text.textContent = loadingText;
    } else {
        button.disabled = false;
        button.classList.remove('button-loading', 'opacity-75', 'cursor-not-allowed');
        icon.className = buttonId === 'loginButton' ? 'fas fa-sign-in-alt mr-2 text-blue-200 group-hover:text-blue-100' : 'fas fa-shield-alt mr-2';
        text.textContent = buttonId === 'loginButton' ? 'Masuk' : 'Verifikasi OTP';
    }
}

function highlightField(fieldId, hasError) {
    const field = document.getElementById(fieldId);
    if (!field) return;
    
    if (hasError) {
        field.classList.add('border-red-500', 'ring-red-500', 'ring-1');
        field.classList.remove('border-gray-300', 'dark:border-gray-600');
        
        // Add shake animation
        field.style.animation = 'shake 0.5s ease-in-out';
        setTimeout(() => {
            field.style.animation = '';
        }, 500);
    } else {
        field.classList.remove('border-red-500', 'ring-red-500', 'ring-1');
        field.classList.add('border-gray-300', 'dark:border-gray-600');
    }
}

function clearFieldErrors() {
    const fields = ['nik', 'password'];
    fields.forEach(fieldId => {
        highlightField(fieldId, false);
        const errorElement = document.getElementById(`${fieldId}Error`);
        if (errorElement) {
            errorElement.classList.add('hidden');
        }
    });
}

// ===== OTP FUNCTIONS =====
function getOTPValue() {
    let otpValue = '';
    for (let i = 1; i <= 6; i++) {
        const input = document.getElementById(`otp${i}`);
        if (input) {
            otpValue += input.value || '';
        }
    }
    return otpValue;
}

function clearOTPInputs() {
    for (let i = 1; i <= 6; i++) {
        const input = document.getElementById(`otp${i}`);
        if (input) {
            input.value = '';
            input.disabled = false;
            input.classList.remove('opacity-50', 'cursor-not-allowed', 'border-red-500', 'ring-red-500', 'ring-1');
            input.classList.add('border-gray-300', 'dark:border-gray-600');
        }
    }
}

function highlightOTPError() {
    for (let i = 1; i <= 6; i++) {
        const input = document.getElementById(`otp${i}`);
        if (input) {
            input.classList.add('border-red-500', 'ring-red-500', 'ring-1');
            input.classList.remove('border-gray-300', 'dark:border-gray-600');
        }
    }
}

function disableOTPInputs(disabled) {
    for (let i = 1; i <= 6; i++) {
        const input = document.getElementById(`otp${i}`);
        if (input) {
            if (disabled) {
                input.disabled = true;
                input.classList.add('opacity-50', 'cursor-not-allowed');
            } else {
                input.disabled = false;
                input.classList.remove('opacity-50', 'cursor-not-allowed');
            }
        }
    }
}

function checkOTPComplete() {
    const otpForm = document.getElementById('otpForm');
    if (!otpForm || otpForm.classList.contains('hidden')) return; // hanya jalankan jika form aktif

    const otpValues = [];
    for (let i = 1; i <= 6; i++) {
        const input = document.getElementById(`otp${i}`);
        if (input && input.value) {
            otpValues.push(input.value);
        }
    }

    // Auto-submit hanya jika semua 6 input terisi
    if (otpValues.length === 6) {
        setTimeout(() => {
            const form = otpForm.querySelector('form');
            if (form) form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
        }, 300);
    }
}


// ===== TIMER FUNCTIONS =====
function startResendCooldown(seconds) {
    const btn = document.getElementById("resendBtn");
    if (!btn) return;
    
    clearInterval(resendTimer);

    let remaining = seconds;
    btn.disabled = true;
    
    function updateButtonText() {
        const minutes = Math.floor(remaining / 60);
        const secs = remaining % 60;
        const timeText = minutes > 0 ? `${minutes}:${secs.toString().padStart(2, '0')}` : `${remaining} detik`;
        btn.textContent = `Tunggu ${timeText}...`;
    }
    
    updateButtonText();

    resendTimer = setInterval(() => {
        remaining--;
        if (remaining > 0) {
            updateButtonText();
        } else {
            clearInterval(resendTimer);
            btn.disabled = false;
            btn.textContent = "Kirim Ulang OTP";
        }
    }, 1000);
}

function startOtpExpiryCountdown() {
    const countdownElement = document.getElementById("otpExpiryCountdown");
    if (!countdownElement) return;
    
    clearInterval(otpExpiryTimer);

    let remaining = otpExpiryTime;
    
    function updateCountdown() {
        const minutes = Math.floor(remaining / 60);
        const seconds = remaining % 60;
        countdownElement.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        
        if (remaining <= 10) {
            countdownElement.parentElement.className = "mt-2 text-xs text-red-600 dark:text-red-400 font-medium animate-pulse";
        } else if (remaining <= 30) {
            countdownElement.parentElement.className = "mt-2 text-xs text-orange-600 dark:text-orange-400 font-medium";
        }
    }
    
    updateCountdown();

    otpExpiryTimer = setInterval(() => {
        remaining--;
        if (remaining > 0) {
            updateCountdown();
        } else {
            clearInterval(otpExpiryTimer);
            handleOtpExpiry();
        }
    }, 1000);
}

function handleOtpExpiry() {
    showInlineMessage('otpForm', 'Kode OTP telah kedaluarsa. Silakan minta kode baru.', 'error');
    
    // Disable OTP inputs and submit button
    disableOTPInputs(true);
    clearOTPInputs();
    
    const otpButton = document.getElementById('otpButton');
    if (otpButton) {
        otpButton.disabled = true;
        otpButton.classList.add('opacity-50', 'cursor-not-allowed');
    }
    
    // Update expiry text
    const countdownElement = document.getElementById("otpExpiryCountdown");
    if (countdownElement) {
        countdownElement.textContent = "Kedaluarsa";
        countdownElement.parentElement.className = "mt-2 text-xs text-red-600 dark:text-red-400 font-bold";
    }
}

function resetOtpExpiry() {
    // Reset OTP expiry time
    otpExpiryTime = OTP_EXPIRY_TIME;
    
    // Re-enable OTP inputs and submit button
    disableOTPInputs(false);
    
    const otpButton = document.getElementById('otpButton');
    if (otpButton) {
        otpButton.disabled = false;
        otpButton.classList.remove('opacity-50', 'cursor-not-allowed');
    }
    
    // Focus first OTP input
    const firstOtpInput = document.getElementById('otp1');
    if (firstOtpInput) {
        firstOtpInput.focus();
    }
    
    // Reset expiry text style
    const countdownElement = document.getElementById("otpExpiryCountdown");
    if (countdownElement) {
        countdownElement.parentElement.className = "mt-2 text-xs text-orange-600 dark:text-orange-400 font-medium";
    }
    
    // Start new countdown
    startOtpExpiryCountdown();
}

function getNextResendCooldown() {
    const index = Math.min(resendAttempts, RESEND_COOLDOWNS.length - 1);
    return RESEND_COOLDOWNS[index];
}

// ===== VALIDATION FUNCTIONS =====
function validateNIK(input) {
    const value = input.value.replace(/\D/g, '');
    input.value = value;
    
    if (value.length > 16) {
        input.value = value.substring(0, 16);
    }
}

function validateNIKOnBlur(input) {
    if (input.value && input.value.length !== 16) {
        input.classList.add('border-red-500');
        showInlineMessage('loginForm', 'NIK harus 16 digit angka', 'error');
    } else {
        input.classList.remove('border-red-500');
        clearInlineMessages('loginForm');
    }
}

// TAMBAHKAN FUNGSI VALIDASI REAL-TIME DI SINI
function validateNIKLive(input) {
    const value = input.value;
    const errorElement = document.getElementById('nikError');
    
    if (!errorElement) return;
    
    if (value.length > 0 && value.length !== 16) {
        errorElement.textContent = 'NIK harus 16 digit';
        errorElement.classList.remove('hidden');
        input.classList.add('border-red-500');
        input.classList.remove('border-green-500');
    } else if (value.length === 16) {
        errorElement.classList.add('hidden');
        input.classList.remove('border-red-500');
        input.classList.add('border-green-500');
    } else {
        errorElement.classList.add('hidden');
        input.classList.remove('border-red-500', 'border-green-500');
    }
}

function validatePasswordLive(input) {
    const value = input.value;
    const errorElement = document.getElementById('passwordError');
    
    if (!errorElement) return;
    
    if (value.length > 0 && value.length < 6) {
        errorElement.textContent = 'Password minimal 6 karakter';
        errorElement.classList.remove('hidden');
        input.classList.add('border-red-500');
        input.classList.remove('border-green-500');
    } else if (value.length >= 6) {
        errorElement.classList.add('hidden');
        input.classList.remove('border-red-500');
        input.classList.add('border-green-500');
    } else {
        errorElement.classList.add('hidden');
        input.classList.remove('border-red-500', 'border-green-500');
    }
}

function validatePasswordOnBlur(input) {
    const value = input.value;
    const errorElement = document.getElementById('passwordError');
    
    if (!errorElement) return;
    
    if (value && value.length < 6) {
        errorElement.textContent = 'Password minimal 6 karakter';
        errorElement.classList.remove('hidden');
        input.classList.add('border-red-500');
        input.classList.remove('border-green-500');
    } else if (value.length >= 6) {
        errorElement.classList.add('hidden');
        input.classList.remove('border-red-500');
        input.classList.add('border-green-500');
    }
}


function togglePassword() {
    const passwordInput = document.getElementById('password');
    const toggleIcon = document.getElementById('passwordToggleIcon');
    
    if (!passwordInput || !toggleIcon) return;

    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        toggleIcon.className = 'fas fa-eye-slash';
    } else {
        passwordInput.type = 'password';
        toggleIcon.className = 'fas fa-eye';
    }
}

// ===== OTP INPUT HANDLERS =====
function handleOTPInput(input, position) {
    // Only allow numbers
    const value = input.value.replace(/\D/g, '');
    input.value = value;
    
    // Move to next input if current is filled
    if (value && position < 6) {
        const nextInput = document.getElementById(`otp${position + 1}`);
        if (nextInput) {
            nextInput.focus();
        }
    }
    
    // Check if all inputs are filled for auto-submit
    checkOTPComplete();
}

function handleOTPKeydown(input, event, position) {
    // Handle backspace
    if (event.key === 'Backspace' && !input.value && position > 1) {
        const prevInput = document.getElementById(`otp${position - 1}`);
        if (prevInput) {
            prevInput.focus();
            prevInput.value = '';
        }
    }
    
    // Handle Enter key
    if (event.key === 'Enter') {
        event.preventDefault();
        const otpForm = document.querySelector('#otpForm form');
        if (otpForm) {
            const submitEvent = new Event('submit');
            otpForm.dispatchEvent(submitEvent);
        }
    }
}

function handleOTPPaste(event) {
    event.preventDefault();
    const paste = (event.clipboardData || window.clipboardData).getData('text');
    const numbers = paste.replace(/\D/g, '').substring(0, 6);
    
    // Fill each input with the pasted numbers
    for (let i = 0; i < 6; i++) {
        const input = document.getElementById(`otp${i + 1}`);
        if (input) {
            input.value = numbers[i] || '';
        }
    }
    
    // Focus on the last filled input or first empty one
    const lastFilledIndex = Math.min(numbers.length, 6);
    const targetInput = document.getElementById(`otp${lastFilledIndex}`);
    if (targetInput) {
        targetInput.focus();
    }
    
    // Check if complete after paste
    checkOTPComplete();
}

// ===== LOGIN HANDLER =====
async function handleLogin(event) {
    event.preventDefault();

    // Cegah multiple submission
    if (isSubmittingLogin) return false;
    isSubmittingLogin = true;

    // Validasi captcha
    if (!captchaVerified) {
        showInlineMessage('loginForm', 'Harap verifikasi captcha terlebih dahulu', 'error');
        isSubmittingLogin = false;
        return false;
    }

    const nik = document.getElementById('nik')?.value?.trim();
    const password = document.getElementById('password')?.value?.trim();

    clearFieldErrors();

    // Validasi field tidak boleh kosong
    let hasError = false;
    
    if (!nik) {
        showInlineMessage('loginForm', 'NIK harus diisi', 'error');
        highlightField('nik', true);
        hasError = true;
    } else if (nik.length !== 16 || !/^\d+$/.test(nik)) {
        showInlineMessage('loginForm', 'NIK harus 16 digit angka', 'error');
        highlightField('nik', true);
        hasError = true;
    }
    
    if (!password) {
        showInlineMessage('loginForm', 'Password harus diisi', 'error');
        highlightField('password', true);
        hasError = true;
    } else if (password.length < 6) {
        showInlineMessage('loginForm', 'Password minimal 6 karakter', 'error');
        highlightField('password', true);
        hasError = true;
    }

    if (hasError) {
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


async function handleOTPVerification(event) {
    event.preventDefault();

    if (isSubmittingOTP) return; // cegah submit ganda
    isSubmittingOTP = true;

    const nik = localStorage.getItem("nik");
    const otp = getOTPValue();

    if (!nik) {
        showInlineMessage('otpForm', 'Session expired. Silakan login ulang.', 'error');
        setTimeout(() => backToLogin(), 2000);
        isSubmittingOTP = false;
        return false;
    }

    if (!otp || otp.length !== 6 || !/^\d+$/.test(otp)) {
        showInlineMessage('otpForm', 'Kode OTP harus 6 digit angka', 'error');
        highlightOTPError();
        document.getElementById('otp1')?.focus();
        isSubmittingOTP = false;
        return false;
    }

    setButtonLoading('otpButton', 'otpIcon', 'otpText', true, 'Memverifikasi...');
    disableOTPInputs(true);

    try {
        const response = await fetch(API_URL, {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({ action: "verify-otp", nik, otp })
        });

        const data = await response.json();

        if (data.success) {
            clearInterval(otpExpiryTimer);
            localStorage.setItem("user", JSON.stringify(data.user));
            localStorage.setItem('isLoggedIn', 'true');

            showInlineMessage('otpForm', data.message || 'Verifikasi berhasil! Mengarahkan ke dashboard...', 'success');

            setTimeout(() => {
                loadDashboard(data.user);
                isSubmittingOTP = false;
            }, 1500);
        } else {
            showInlineMessage('otpForm', data.message || 'Kode OTP salah. Silakan coba lagi.', 'error');
            clearOTPInputs();
            highlightOTPError();
            document.getElementById('otp1')?.focus();

            const otpForm = document.getElementById('otpForm');
            if (otpForm) {
                otpForm.style.animation = 'shake 0.5s ease-in-out';
                setTimeout(() => { otpForm.style.animation = ''; }, 500);
            }

            setTimeout(() => {
                setButtonLoading('otpButton', 'otpIcon', 'otpText', false);
                disableOTPInputs(false);
                isSubmittingOTP = false;
            }, 1000);
        }
    } catch (error) {
        console.error('OTP verification error:', error);
        showInlineMessage('otpForm', 'Terjadi kesalahan koneksi. Silakan coba lagi.', 'error');

        setTimeout(() => {
            setButtonLoading('otpButton', 'otpIcon', 'otpText', false);
            disableOTPInputs(false);
            isSubmittingOTP = false;
        }, 1000);
    }

    return false;
}


async function resendOtp() {
    const nik = localStorage.getItem("nik");
    const resendBtn = document.getElementById("resendBtn");

    if (!nik) {
        showInlineMessage('otpForm', 'Session expired. Silakan login ulang.', 'error');
        setTimeout(() => backToLogin(), 2000);
        return;
    }

    if (!resendBtn || resendBtn.disabled) return;

    clearOTPInputs();        // reset input lama
    resetOtpExpiry();        // reset timer
    disableOTPInputs(true);  // disable sementara
    isSubmittingOTP = false; // pastikan flag reset

    const originalText = resendBtn.textContent;
    resendBtn.disabled = true;
    resendBtn.innerHTML = '<i class="fas fa-spinner loading-spinner mr-2"></i>Mengirim...';

    try {
        const response = await fetch(API_URL, {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({ action: "resend-otp", nik })
        });

        const data = await response.json();

        if (data.success !== false) {
            resendAttempts++;

            if (data.email) {
                localStorage.setItem("userEmail", data.email);
                const maskedEmailElement = document.getElementById('maskedEmail');
                if (maskedEmailElement) {
                    maskedEmailElement.textContent = maskEmail(data.email);
                }
            }

            resetOtpExpiry();
            showInlineMessage('otpForm', data.message || 'OTP baru telah dikirim ke email terdaftar', 'success');

            const cooldownTime = getNextResendCooldown();
            startResendCooldown(cooldownTime);
        } else {
            showInlineMessage('otpForm', data.message || 'Gagal mengirim ulang OTP', 'error');
            setTimeout(() => {
                resendBtn.disabled = false;
                resendBtn.textContent = originalText;
            }, 2000);
        }
    } catch (error) {
        console.error('Resend OTP error:', error);
        showInlineMessage('otpForm', 'Terjadi kesalahan saat mengirim ulang OTP', 'error');
        setTimeout(() => {
            resendBtn.disabled = false;
            resendBtn.textContent = originalText;
        }, 2000);
    } finally {
        disableOTPInputs(false);
    }
}


// ===== UI FUNCTIONS =====
function showOTPForm(email = null) {
    const loginForm = document.getElementById('loginForm');
    const otpForm = document.getElementById('otpForm');
    const maskedEmailElement = document.getElementById('maskedEmail');
    
    if (!loginForm || !otpForm) return;

    // Get email from parameter or localStorage
    const userEmail = email || localStorage.getItem("userEmail");
    
    // Update masked email display
    if (maskedEmailElement && userEmail) {
        const maskedEmail = maskEmail(userEmail);
        maskedEmailElement.textContent = maskedEmail;
        maskedEmailElement.classList.remove('text-gray-500');
        maskedEmailElement.classList.add('text-blue-600', 'dark:text-blue-400');
    } else if (maskedEmailElement) {
        maskedEmailElement.textContent = 'Email tidak ditemukan';
        maskedEmailElement.classList.remove('text-blue-600', 'dark:text-blue-400');
        maskedEmailElement.classList.add('text-gray-500');
    }
    clearOTPInputs();   // reset input setiap kali form muncul
    resetOtpExpiry();   // reset timer setiap kali form muncul
    loginForm.classList.add('hidden');
    otpForm.classList.remove('hidden');
    
    // Start OTP expiry countdown
    startOtpExpiryCountdown();
    
    // Focus first OTP input
    const firstOtpInput = document.getElementById('otp1');
    if (firstOtpInput) {
        firstOtpInput.focus();
    }
}

function backToLogin() {
    const loginForm = document.getElementById('loginForm');
    const otpForm = document.getElementById('otpForm');
    if (!loginForm || !otpForm) return;

    otpForm.classList.add('hidden');
    loginForm.classList.remove('hidden');

    clearInterval(resendTimer);
    clearInterval(otpExpiryTimer);
    resendTimer = otpExpiryTimer = null;

    resendAttempts = 0;
    otpExpiryTime = OTP_EXPIRY_TIME;
    isSubmittingOTP = false;  // reset flag OTP

    clearOTPInputs();
    localStorage.removeItem('otpValue'); // hapus key OTP lama jika ada
}



// ====== LOGOUT ======
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

// ===== DARK MODE FUNCTIONS =====
function initializeDarkMode() {
    const darkModeToggle = document.getElementById('darkModeToggle');
    
    // Check saved theme preference or default to light mode
    const savedTheme = localStorage.getItem('theme') || 'light';
    
    if (savedTheme === 'dark') {
        document.documentElement.classList.add('dark');
        updateDarkModeIcons(true);
    } else {
        document.documentElement.classList.remove('dark');
        updateDarkModeIcons(false);
    }

    function toggleDarkMode() {
        const isDark = document.documentElement.classList.toggle('dark');
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
        updateDarkModeIcons(isDark);
    }

    // ✅ Pastikan tidak pasang listener dobel
    if (darkModeToggle && !darkModeToggle.dataset.listener) {
        darkModeToggle.addEventListener('click', toggleDarkMode);
        darkModeToggle.dataset.listener = "true";
    }
}

function updateDarkModeIcons(isDark) {
    const moonIcon = document.getElementById('moonIcon');
    const sunIcon = document.getElementById('sunIcon');
    
    if (moonIcon && sunIcon) {
        moonIcon.style.display = isDark ? 'none' : 'block';
        sunIcon.style.display = isDark ? 'block' : 'none';
    }
}
// ===== INPUT ENHANCEMENTS =====
function initializeInputEnhancements() {
    const nikInput = document.getElementById('nik');
    const passwordInput = document.getElementById('password');

    if (nikInput) {
        // Validasi real-time untuk NIK
        nikInput.addEventListener('input', function() {
            validateNIK(this);
            validateNIKLive(this);
            clearInlineMessages('loginForm');
        });
        
        // Validasi saat kehilangan fokus
        nikInput.addEventListener('blur', function() {
            validateNIKOnBlur(this);
        });
        
        // Navigasi dengan Enter
        nikInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                const passwordField = document.getElementById('password');
                if (passwordField) passwordField.focus();
            }
        });
    }

    if (passwordInput) {
        // Validasi real-time untuk password
        passwordInput.addEventListener('input', function() {
            validatePasswordLive(this);
            clearInlineMessages('loginForm');
        });
        
        // Validasi saat kehilangan fokus
        passwordInput.addEventListener('blur', function() {
            validatePasswordOnBlur(this);
        });
        
        // Submit dengan Enter
        passwordInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                const loginForm = document.querySelector('#loginForm form');
                if (loginForm) {
                    const submitEvent = new Event('submit');
                    loginForm.dispatchEvent(submitEvent);
                }
            }
        });
    }
}
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
