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

// ===== UTILITY FUNCTIONS =====
function maskEmail(email) {
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
    const otpValues = [];
    for (let i = 1; i <= 6; i++) {
        const input = document.getElementById(`otp${i}`);
        if (input && input.value) {
            otpValues.push(input.value);
        }
    }
    
    // Auto-submit when all 6 digits are entered
    if (otpValues.length === 6) {
        setTimeout(() => {
            const otpForm = document.querySelector('#otpForm form');
            if (otpForm) {
                const submitEvent = new Event('submit');
                otpForm.dispatchEvent(submitEvent);
            }
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

// ===== MAIN HANDLERS =====
async function handleLogin(event) {
    event.preventDefault();
    
    const nik = document.getElementById('nik')?.value?.trim();
    const password = document.getElementById('password')?.value?.trim();
    
    // Clear previous error states
    clearFieldErrors();
    
    // Validation
    if (!nik || !password) {
        showInlineMessage('loginForm', 'Harap isi semua field', 'error');
        if (!nik) highlightField('nik', true);
        if (!password) highlightField('password', true);
        return false;
    }

    if (nik.length !== 16 || !/^\d+$/.test(nik)) {
        showInlineMessage('loginForm', 'NIK harus 16 digit angka', 'error');
        highlightField('nik', true);
        return false;
    }

    if (password.length < 6) {
        showInlineMessage('loginForm', 'Password minimal 6 karakter', 'error');
        highlightField('password', true);
        return false;
    }

    // Start loading state
    setButtonLoading('loginButton', 'loginIcon', 'loginText', true, 'Memverifikasi...');

    try {
        const response = await fetch(API_URL, {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({ action: "login", nik, password })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        
        if (data.success && data.step === "otp") {
            localStorage.setItem("nik", nik);
            
            // Store email from login response for masking display
            const userEmail = data.email || data.user?.email || data.user?.Email;
            if (userEmail) {
                localStorage.setItem("userEmail", userEmail);
            }
            
            showInlineMessage('loginForm', data.message || 'Login berhasil! Mengirim OTP...', 'success');
            
            // Smooth transition to OTP form
            setTimeout(() => {
                showOTPForm(userEmail);
                // Start with initial cooldown
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
        }, 1000);
    }
    
    return false;
}

async function handleOTPVerification(event) {
    event.preventDefault();
    
    const nik = localStorage.getItem("nik");
    const otp = getOTPValue();
    
    if (!nik) {
        showInlineMessage('otpForm', 'Session expired. Silakan login ulang.', 'error');
        setTimeout(() => backToLogin(), 2000);
        return false;
    }
    
    if (!otp) {
        showInlineMessage('otpForm', 'Harap masukkan kode OTP', 'error');
        highlightOTPError();
        document.getElementById('otp1')?.focus();
        return false;
    }
    
    if (otp.length !== 6 || !/^\d+$/.test(otp)) {
        showInlineMessage('otpForm', 'Kode OTP harus 6 digit angka', 'error');
        highlightOTPError();
        document.getElementById('otp1')?.focus();
        return false;
    }

    // Start loading state
    setButtonLoading('otpButton', 'otpIcon', 'otpText', true, 'Memverifikasi...');
    disableOTPInputs(true);

    try {
        const response = await fetch(API_URL, {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({ action: "verify-otp", nik, otp })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        
        if (data.success) {
            // Clear OTP expiry timer immediately on success
            clearInterval(otpExpiryTimer);
            
            localStorage.setItem("user", JSON.stringify(data.user));
            showInlineMessage('otpForm', data.message || 'Verifikasi berhasil! Mengarahkan ke dashboard...', 'success');
            
            // Wait a moment to show success message, then load dashboard
            setTimeout(() => {
                loadDashboard(data.user);
            }, 1500);
        } else {
            showInlineMessage('otpForm', data.message || 'Kode OTP salah. Silakan coba lagi.', 'error');
            
            // Clear OTP inputs and highlight error
            clearOTPInputs();
            highlightOTPError();
            document.getElementById('otp1')?.focus();
            
            // Shake animation for error
            const otpForm = document.getElementById('otpForm');
            if (otpForm) {
                otpForm.style.animation = 'shake 0.5s ease-in-out';
                setTimeout(() => {
                    otpForm.style.animation = '';
                }, 500);
            }
            
            // Re-enable inputs after error
            setTimeout(() => {
                setButtonLoading('otpButton', 'otpIcon', 'otpText', false);
                disableOTPInputs(false);
            }, 1000);
        }
    } catch (error) {
        console.error('OTP verification error:', error);
        showInlineMessage('otpForm', 'Terjadi kesalahan koneksi. Silakan coba lagi.', 'error');
        
        // Re-enable inputs after error
        setTimeout(() => {
            setButtonLoading('otpButton', 'otpIcon', 'otpText', false);
            disableOTPInputs(false);
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

    if (!resendBtn || resendBtn.disabled) {
        return; // Prevent multiple clicks
    }

    // Show loading state for resend button
    const originalText = resendBtn.textContent;
    resendBtn.disabled = true;
    resendBtn.innerHTML = '<i class="fas fa-spinner loading-spinner mr-2"></i>Mengirim...';

    try {
        const response = await fetch(API_URL, {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({ action: "resend-otp", nik })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        
        if (data.success !== false) {
            // Increment resend attempts
            resendAttempts++;
            
            // Update email if provided in resend response
            if (data.email) {
                localStorage.setItem("userEmail", data.email);
                // Update displayed email
                const maskedEmailElement = document.getElementById('maskedEmail');
                if (maskedEmailElement) {
                    const maskedEmail = maskEmail(data.email);
                    maskedEmailElement.textContent = maskedEmail;
                }
            }
            
            // Reset OTP expiry and start new countdown
            resetOtpExpiry();
            
            showInlineMessage('otpForm', data.message || 'OTP baru telah dikirim ke email terdaftar', 'success');
            
            // Get progressive cooldown time
            const cooldownTime = getNextResendCooldown();
            startResendCooldown(cooldownTime);
        } else {
            showInlineMessage('otpForm', data.message || 'Gagal mengirim ulang OTP', 'error');
            
            // Reset button on API error
            setTimeout(() => {
                resendBtn.disabled = false;
                resendBtn.textContent = originalText;
            }, 2000);
        }
    } catch (error) {
        console.error('Resend OTP error:', error);
        showInlineMessage('otpForm', 'Terjadi kesalahan saat mengirim ulang OTP', 'error');
        
        // Reset button on network error
        setTimeout(() => {
            resendBtn.disabled = false;
            resendBtn.textContent = originalText;
        }, 2000);
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
    
    // Clear data
    localStorage.removeItem('nik');
    localStorage.removeItem('userEmail');
    
    // Clear all timers
    clearInterval(resendTimer);
    clearInterval(otpExpiryTimer);
    
    // Reset counters
    resendAttempts = 0;
    otpExpiryTime = OTP_EXPIRY_TIME;
    
    // Clear OTP inputs and re-enable form elements
    clearOTPInputs();
    
    const otpButton = document.getElementById('otpButton');
    if (otpButton) {
        otpButton.disabled = false;
        otpButton.classList.remove('opacity-50', 'cursor-not-allowed');
    }
    
    // Reset resend button
    const resendBtn = document.getElementById('resendBtn');
    if (resendBtn) {
        resendBtn.disabled = false;
        resendBtn.textContent = 'Kirim Ulang OTP';
    }
    
    // Reset expiry display
    const countdownElement = document.getElementById("otpExpiryCountdown");
    if (countdownElement) {
        countdownElement.textContent = "1:00";
        countdownElement.parentElement.className = "mt-2 text-xs text-orange-600 dark:text-orange-400 font-medium";
    }
}

function logout() {
    const loginContainer = document.getElementById('loginContainer');
    const dashboardContainer = document.getElementById('dashboardContainer');
    
    if (loginContainer) loginContainer.classList.remove('hidden');
    if (dashboardContainer) dashboardContainer.classList.add('hidden');
    
    // Clear all data
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('user');
    localStorage.removeItem('nik');
    localStorage.removeItem('userEmail');
    
    // Clear all timers immediately
    clearInterval(resendTimer);
    clearInterval(otpExpiryTimer);
    resendTimer = null;
    otpExpiryTimer = null;
    
    // Reset counters
    resendAttempts = 0;
    otpExpiryTime = OTP_EXPIRY_TIME;
    
    // Reset forms
    const loginForm = document.getElementById('loginForm');
    const otpForm = document.getElementById('otpForm');
    if (loginForm) loginForm.classList.remove('hidden');
    if (otpForm) otpForm.classList.add('hidden');
    
    // Clear form inputs
    const nikInput = document.getElementById('nik');
    const passwordInput = document.getElementById('password');
    
    if (nikInput) nikInput.value = '';
    if (passwordInput) passwordInput.value = '';
    clearOTPInputs();
    
    currentUser = null;
}

// ===== DARK MODE FUNCTIONS =====
function initializeDarkMode() {
    const darkModeToggle = document.getElementById('darkModeToggle');
    
    // Check saved theme preference or default to light mode
    const savedTheme = localStorage.getItem('theme') || 'light';
    
    if (savedTheme === 'dark') {
        document.documentElement.classList.add('dark');
        updateDarkModeIcons(true);
    }

    function toggleDarkMode() {
        const isDark = document.documentElement.classList.toggle('dark');
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
        updateDarkModeIcons(isDark);
    }

    if (darkModeToggle) {
        darkModeToggle.addEventListener('click', toggleDarkMode);
    }
}

function updateDarkModeIcons(isDark) {
    // Login page icons
    const moonIcon = document.getElementById('moonIcon');
    const sunIcon = document.getElementById('sunIcon');
    
    if (moonIcon && sunIcon) {
        moonIcon.style.display = isDark ? 'none' : 'block';
        sunIcon.style.display = isDark ? 'block' : 'none';
    }
}

// ===== INPUT ENHANCEMENTS =====
function initializeInputEnhancements() {
    // Clear error states when user starts typing
    const nikInput = document.getElementById('nik');
    const passwordInput = document.getElementById('password');

    if (nikInput) {
        nikInput.addEventListener('input', function() {
            clearFieldErrors();
            clearInlineMessages('loginForm');
        });
        
        nikInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                const passwordField = document.getElementById('password');
                if (passwordField) passwordField.focus();
            }
        });
    }

    if (passwordInput) {
        passwordInput.addEventListener('input', function() {
            clearFieldErrors();
            clearInlineMessages('loginForm');
        });
        
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

// ===== INITIALIZATION =====
document.addEventListener('DOMContentLoaded', function() {
    // Initialize dark mode
    initializeDarkMode();
    
    // Initialize input enhancements
    initializeInputEnhancements();

    // Check if user is already logged in
    const isLoggedIn = localStorage.getItem('isLoggedIn');
    const userData = localStorage.getItem('user');
    
    if (isLoggedIn === 'true' && userData) {
        try {
            const user = JSON.parse(userData);
            loadDashboard(user);
        } catch (error) {
            console.error('Error parsing user data:', error);
            localStorage.removeItem('isLoggedIn');
            localStorage.removeItem('user');
        }
    }

    console.log('Authentication System Initialized');
});
