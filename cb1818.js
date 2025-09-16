// Configuration
const WORKER_URL = 'https://natural.bulshitman1.workers.dev/';

// Session management
function setSession(data) {
    localStorage.setItem('userSession', JSON.stringify(data));
}

function getSession() {
    const session = localStorage.getItem('userSession');
    return session ? JSON.parse(session) : null;
}

function clearSession() {
    localStorage.removeItem('userSession');
}

// Timer management
let otpTimer = null;
let otpExpirationTimer = null;

// Login functions
async function loginUser(nik, password) {
    const loginBtn = document.getElementById('login-btn');
    const loginBtnText = document.getElementById('login-btn-text');
    const loginBtnIcon = document.getElementById('login-btn-icon');
    
    // Show loading state
    loginBtn.disabled = true;
    loginBtnText.textContent = 'Memproses...';
    loginBtnIcon.className = 'fas fa-spinner fa-spin';
    
    try {
        const response = await fetch(WORKER_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                action: 'login',
                nik: nik,
                password: password
            })
        });

        const result = await response.json();
        
        if (result.success) {
            // Store temporary session data
            setSession({
                nik: nik,
                tempToken: result.tempToken,
                requiresOtp: true,
                loginTime: Date.now()
            });
            
            // Show OTP step
            showOtpStep();
            showMessage('OTP telah dikirim. Silakan periksa pesan Anda.', 'success');
        } else {
            showMessage(result.message || 'Login gagal. Periksa NIK dan password Anda.', 'error');
        }
    } catch (error) {
        console.error('Login error:', error);
        showMessage('Terjadi kesalahan. Silakan coba lagi.', 'error');
    } finally {
        // Reset button state
        loginBtn.disabled = false;
        loginBtnText.textContent = 'Masuk';
        loginBtnIcon.className = 'fas fa-arrow-right';
    }
}

async function verifyOtp(otp) {
    const session = getSession();
    if (!session || !session.tempToken) {
        showOtpMessage('Sesi tidak valid. Silakan login ulang.', 'error');
        return;
    }

    const otpBtn = document.getElementById('otp-btn');
    const otpBtnText = document.getElementById('otp-btn-text');
    const otpBtnIcon = document.getElementById('otp-btn-icon');
    
    // Show loading state
    otpBtn.disabled = true;
    otpBtnText.textContent = 'Memverifikasi...';
    otpBtnIcon.className = 'fas fa-spinner fa-spin';
    
    try {
        const response = await fetch(WORKER_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                action: 'verify-otp',
                nik: session.nik,
                otp: otp,
                tempToken: session.tempToken
            })
        });

        const result = await response.json();
        
        if (result.success) {
            // Update session with full authentication
            setSession({
                nik: session.nik,
                token: result.token,
                user: result.user,
                requiresOtp: false,
                loginTime: Date.now()
            });
            
            // Clear timers
            if (otpTimer) clearInterval(otpTimer);
            if (otpExpirationTimer) clearTimeout(otpExpirationTimer);
            
            // Show success and redirect to dashboard
            showOtpMessage('Verifikasi berhasil! Mengarahkan ke dashboard...', 'success');
            
            setTimeout(() => {
                showDashboard();
            }, 1500);
        } else {
            showOtpMessage(result.message || 'Kode OTP tidak valid.', 'error');
            // Clear OTP inputs
            document.querySelectorAll('.otp-input').forEach(input => input.value = '');
            document.querySelectorAll('.otp-input')[0].focus();
        }
    } catch (error) {
        console.error('OTP verification error:', error);
        showOtpMessage('Terjadi kesalahan. Silakan coba lagi.', 'error');
    } finally {
        // Reset button state
        otpBtn.disabled = false;
        otpBtnText.textContent = 'Verifikasi';
        otpBtnIcon.className = 'fas fa-check';
    }
}

async function resendOtpHandler() {
    const session = getSession();
    if (!session || !session.nik) {
        showOtpMessage('Sesi tidak valid. Silakan login ulang.', 'error');
        return;
    }

    const resendBtn = document.getElementById('resend-otp');
    const originalText = resendBtn.textContent;
    
    resendBtn.disabled = true;
    resendBtn.textContent = 'Mengirim...';
    
    try {
        const response = await fetch(WORKER_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                action: 'resend-otp',
                nik: session.nik
            })
        });

        const result = await response.json();
        
        if (result.success) {
            // Update temp token if provided
            if (result.tempToken) {
                const updatedSession = { ...session, tempToken: result.tempToken };
                setSession(updatedSession);
            }
            
            showOtpMessage('OTP baru telah dikirim.', 'success');
            
            // Start countdown again
            startResendCountdown();
            startOtpExpiration();
        } else {
            showOtpMessage(result.message || 'Gagal mengirim ulang OTP.', 'error');
        }
    } catch (error) {
        console.error('Resend OTP error:', error);
        showOtpMessage('Terjadi kesalahan. Silakan coba lagi.', 'error');
    } finally {
        setTimeout(() => {
            resendBtn.textContent = originalText;
        }, 2000);
    }
}

// Session validation
function validateSession() {
    const session = getSession();
    if (session && session.token && !session.requiresOtp) {
        // Check if session is not expired (24 hours)
        const sessionAge = Date.now() - session.loginTime;
        const maxAge = 24 * 60 * 60 * 1000; // 24 hours
        
        if (sessionAge < maxAge) {
            showDashboard();
            return true;
        } else {
            clearSession();
        }
    }
    return false;
}

// Logout functions
function logoutUser() {
    const logoutModal = document.getElementById('logoutModal');
    if (logoutModal) {
        logoutModal.classList.remove('hidden');
    }
}

function closeLogoutModal() {
    const logoutModal = document.getElementById('logoutModal');
    if (logoutModal) {
        logoutModal.classList.add('hidden');
    }
}

function confirmLogout() {
    clearSession();
    
    // Clear any timers
    if (otpTimer) clearInterval(otpTimer);
    if (otpExpirationTimer) clearTimeout(otpExpirationTimer);
    
    // Hide dashboard and show login
    const dashboard = document.getElementById('dashboard');
    const loginStep = document.getElementById('login-step');
    const otpStep = document.getElementById('otp-step');
    
    if (dashboard) dashboard.classList.add('hidden');
    if (loginStep) loginStep.classList.remove('hidden');
    if (otpStep) otpStep.classList.add('hidden');
    
    // Reset forms
    const loginForm = document.getElementById('loginForm');
    if (loginForm) loginForm.reset();
    
    // Clear any messages
    hideMessage();
    hideOtpMessage();
    
    closeLogoutModal();
}

// Message display functions
function showMessage(message, type = 'info') {
    const messageDiv = document.getElementById('message');
    const messageText = document.getElementById('message-text');
    
    if (!messageDiv || !messageText) return;
    
    messageText.textContent = message;
    messageDiv.className = `mt-4 p-3 rounded-lg ${getMessageClasses(type)}`;
    messageDiv.classList.remove('hidden');
    
    // Auto hide after 5 seconds for success messages
    if (type === 'success') {
        setTimeout(() => hideMessage(), 5000);
    }
}

function hideMessage() {
    const messageDiv = document.getElementById('message');
    if (messageDiv) {
        messageDiv.classList.add('hidden');
    }
}

function showOtpMessage(message, type = 'info') {
    const messageDiv = document.getElementById('otp-message');
    const messageText = document.getElementById('otp-message-text');
    
    if (!messageDiv || !messageText) return;
    
    messageText.textContent = message;
    messageDiv.className = `mt-4 p-3 rounded-lg ${getMessageClasses(type)}`;
    messageDiv.classList.remove('hidden');
    
    // Auto hide after 5 seconds for success messages
    if (type === 'success') {
        setTimeout(() => hideOtpMessage(), 5000);
    }
}

function hideOtpMessage() {
    const messageDiv = document.getElementById('otp-message');
    if (messageDiv) {
        messageDiv.classList.add('hidden');
    }
}

function getMessageClasses(type) {
    switch (type) {
        case 'success':
            return 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-800 dark:text-green-200';
        case 'error':
            return 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200';
        case 'warning':
            return 'bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 text-yellow-800 dark:text-yellow-200';
        default:
            return 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200';
    }
}

// UI Helper Functions
function togglePassword(inputId) {
    const input = document.getElementById(inputId);
    const icon = document.getElementById(inputId + '-toggle-icon');
    
    if (!input || !icon) return;
    
    if (input.type === 'password') {
        input.type = 'text';
        icon.className = 'fas fa-eye-slash';
    } else {
        input.type = 'password';
        icon.className = 'fas fa-eye';
    }
}

// OTP input handling
function setupOtpInputs() {
    const otpInputs = document.querySelectorAll('.otp-input');
    const hiddenOtpInput = document.getElementById('otp');
    
    otpInputs.forEach((input, index) => {
        input.addEventListener('input', (e) => {
            const value = e.target.value;
            
            // Only allow numbers
            if (!/^\d*$/.test(value)) {
                e.target.value = '';
                return;
            }
            
            // Move to next input if current is filled
            if (value && index < otpInputs.length - 1) {
                otpInputs[index + 1].focus();
            }
            
            // Update hidden input with complete OTP
            const completeOtp = Array.from(otpInputs).map(inp => inp.value).join('');
            if (hiddenOtpInput) {
                hiddenOtpInput.value = completeOtp;
            }
        });
        
        input.addEventListener('keydown', (e) => {
            // Move to previous input on backspace if current is empty
            if (e.key === 'Backspace' && !e.target.value && index > 0) {
                otpInputs[index - 1].focus();
            }
        });
        
        input.addEventListener('paste', (e) => {
            e.preventDefault();
            const pastedData = e.clipboardData.getData('text').replace(/\D/g, '');
            
            // Fill inputs with pasted data
            for (let i = 0; i < Math.min(pastedData.length, otpInputs.length); i++) {
                if (otpInputs[i]) {
                    otpInputs[i].value = pastedData[i];
                }
            }
            
            // Update hidden input
            const completeOtp = Array.from(otpInputs).map(inp => inp.value).join('');
            if (hiddenOtpInput) {
                hiddenOtpInput.value = completeOtp;
            }
            
            // Focus on next empty input or last input
            const nextEmptyIndex = Array.from(otpInputs).findIndex(inp => !inp.value);
            if (nextEmptyIndex !== -1) {
                otpInputs[nextEmptyIndex].focus();
            } else {
                otpInputs[otpInputs.length - 1].focus();
            }
        });
    });
}

function closeOtpModal() {
    const otpStep = document.getElementById('otp-step');
    if (otpStep) {
        otpStep.classList.add('hidden');
    }
    
    // Clear timers
    if (otpTimer) clearInterval(otpTimer);
    if (otpExpirationTimer) clearTimeout(otpExpirationTimer);
    
    // Clear OTP inputs
    document.querySelectorAll('.otp-input').forEach(input => input.value = '');
    const hiddenOtpInput = document.getElementById('otp');
    if (hiddenOtpInput) hiddenOtpInput.value = '';
    
    // Clear messages
    hideOtpMessage();
}

function showOtpStep() {
    const otpStep = document.getElementById('otp-step');
    if (otpStep) {
        otpStep.classList.remove('hidden');
        
        // Focus on first OTP input
        const firstOtpInput = document.querySelector('.otp-input');
        if (firstOtpInput) {
            setTimeout(() => firstOtpInput.focus(), 100);
        }
        
        // Start timers
        startResendCountdown();
        startOtpExpiration();
    }
}

function startResendCountdown() {
    const resendBtn = document.getElementById('resend-otp');
    if (!resendBtn) return;
    
    let countdown = 60;
    resendBtn.disabled = true;
    
    const updateButton = () => {
        resendBtn.textContent = `Kirim ulang OTP (${countdown}s)`;
        countdown--;
        
        if (countdown < 0) {
            clearInterval(otpTimer);
            resendBtn.disabled = false;
            resendBtn.textContent = 'Kirim ulang OTP';
        }
    };
    
    updateButton();
    otpTimer = setInterval(updateButton, 1000);
}

function startOtpExpiration() {
    const expirationInfo = document.getElementById('otp-expiration-info');
    const expirationTime = document.getElementById('otp-expiration-time');
    
    if (!expirationInfo || !expirationTime) return;
    
    let timeLeft = 180; // 3 minutes
    expirationInfo.classList.remove('hidden');
    
    const updateExpiration = () => {
        const minutes = Math.floor(timeLeft / 60);
        const seconds = timeLeft % 60;
        expirationTime.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        
        timeLeft--;
        
        if (timeLeft < 0) {
            clearTimeout(otpExpirationTimer);
            showOtpMessage('Kode OTP telah kedaluarsa. Silakan minta kode baru.', 'warning');
            expirationInfo.classList.add('hidden');
        }
    };
    
    updateExpiration();
    otpExpirationTimer = setInterval(updateExpiration, 1000);
}

function showDashboard() {
    const loginStep = document.getElementById('login-step');
    const otpStep = document.getElementById('otp-step');
    const dashboard = document.getElementById('dashboard');
    
    if (loginStep) loginStep.classList.add('hidden');
    if (otpStep) otpStep.classList.add('hidden');
    if (dashboard) {
        dashboard.classList.remove('hidden');
        
        // Create dashboard if not already created
        if (!dashboard.innerHTML.trim()) {
            createDashboard();
        }
        
        // Initialize dashboard elements and event listeners
        initializeDashboardElements();
        
        // Set user info
        const session = getSession();
        if (session && session.user) {
            const usernameElement = document.getElementById('username');
            const userRoleElement = document.getElementById('userRoleSidebar');
            
            if (usernameElement) usernameElement.textContent = session.user.nama || session.nik;
            if (userRoleElement) userRoleElement.textContent = session.user.role || 'Member';
        }
        
        // Initialize layout
        setTimeout(() => {
            initializeLayout();
        }, 100);
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

// Form initialization and event listeners
function initializeForms() {
    // Login form
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const nik = document.getElementById('nik').value.trim();
            const password = document.getElementById('password').value.trim();
            
            if (!nik || !password) {
                showMessage('Mohon lengkapi NIK dan password.', 'error');
                return;
            }
            
            if (nik.length !== 16) {
                showMessage('NIK harus 16 digit.', 'error');
                return;
            }
            
            await loginUser(nik, password);
        });
    }
    
    // OTP form
    const otpForm = document.getElementById('otpForm');
    if (otpForm) {
        otpForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const otp = document.getElementById('otp').value.trim();
            
            if (!otp || otp.length !== 6) {
                showOtpMessage('Mohon masukkan kode OTP 6 digit.', 'error');
                return;
            }
            
            await verifyOtp(otp);
        });
    }
    
    // NIK input formatting
    const nikInput = document.getElementById('nik');
    if (nikInput) {
        nikInput.addEventListener('input', (e) => {
            // Only allow numbers
            e.target.value = e.target.value.replace(/\D/g, '');
            
            // Limit to 16 digits
            if (e.target.value.length > 16) {
                e.target.value = e.target.value.slice(0, 16);
            }
        });
    }
    
    // Dark mode toggle for login
    const darkModeToggleLogin = document.getElementById('darkModeToggleLogin');
    if (darkModeToggleLogin) {
        darkModeToggleLogin.addEventListener('click', toggleDarkModeLogin);
    }
    
    // Setup OTP inputs
    setupOtpInputs();
}

// Initialize dark mode on page load
function initializeDarkMode() {
    const savedDarkMode = localStorage.getItem('darkMode');
    const darkModeIconLogin = document.getElementById('darkModeIconLogin');
    
    if (savedDarkMode === 'true') {
        document.documentElement.classList.add('dark');
        if (darkModeIconLogin) {
            darkModeIconLogin.className = 'fas fa-sun';
        }
    } else {
        document.documentElement.classList.remove('dark');
        if (darkModeIconLogin) {
            darkModeIconLogin.className = 'fas fa-moon';
        }
    }
}

// Initialize everything when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    initializeDarkMode();
    initializeForms();
    
    // Check for existing session
    if (!validateSession()) {
        // Show login form if no valid session
        const loginStep = document.getElementById('login-step');
        if (loginStep) {
            loginStep.classList.remove('hidden');
        }
    }
});

// Handle window resize for responsive behavior
window.addEventListener('resize', () => {
    // Only handle resize if dashboard is visible (user is logged in)
    const dashboard = document.getElementById('dashboard');
    if (dashboard && !dashboard.classList.contains('hidden')) {
        handleResize();
    }
});
