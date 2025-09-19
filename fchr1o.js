// login-script.js - External Login Management Script

(function() {
    'use strict';

    // API Configuration
    const WORKER_URL = "https://pemanis.bulshitman1.workers.dev/";

    // Authentication state
    let isAuthenticated = false;
    let currentUser = null;
    let otpCountdown = 120; // 2 minutes
    let countdownInterval = null;
    let resendCount = 0;
    let resendCountdownInterval = null;

    // Elements
    const loginContainer = document.getElementById('loginContainer');
    const loginForm = document.getElementById('loginForm');
    const otpOverlay = document.getElementById('otpOverlay');
    const loginFormElement = document.getElementById('loginFormElement');
    const otpFormElement = document.getElementById('otpFormElement');
    const togglePassword = document.getElementById('togglePassword');
    const passwordInput = document.getElementById('password');
    const nikInput = document.getElementById('nik');
    const otpInputs = document.querySelectorAll('.otp-input');
    const countdownElement = document.getElementById('countdown');
    const resendOtpButton = document.getElementById('resendOtp');
    const backToLoginButton = document.getElementById('backToLogin');
    
    // Message elements
    const loginMessage = document.getElementById('loginMessage');
    const loginMessageIcon = document.getElementById('loginMessageIcon');
    const loginMessageText = document.getElementById('loginMessageText');
    const otpMessage = document.getElementById('otpMessage');
    const otpMessageIcon = document.getElementById('otpMessageIcon');
    const otpMessageText = document.getElementById('otpMessageText');

    // Login Manager Object
    const LoginManager = {
        // Initialize the login system
        init: function() {
            this.initDarkMode();
            this.bindEvents();
            this.checkExistingSession();
        },

        // Initialize dark mode
        initDarkMode: function() {
            const isDark = localStorage.getItem('darkMode') === 'true';
            if (isDark) {
                document.documentElement.classList.add('dark');
            } else {
                document.documentElement.classList.remove('dark');
            }
        },

        // Bind all event listeners
        bindEvents: function() {
            // Toggle password visibility
            if (togglePassword) {
                togglePassword.addEventListener('click', this.togglePasswordVisibility);
            }

            // Format NIK input
            if (nikInput) {
                nikInput.addEventListener('input', this.formatNikInput);
            }

            // Login form submission
            if (loginFormElement) {
                loginFormElement.addEventListener('submit', this.handleLogin.bind(this));
            }

            // OTP form submission
            if (otpFormElement) {
                otpFormElement.addEventListener('submit', this.handleOtpVerification.bind(this));
            }

            // OTP input handling
            this.bindOtpInputs();

            // Resend OTP
            if (resendOtpButton) {
                resendOtpButton.addEventListener('click', this.handleResendOtp.bind(this));
            }

            // Back to login
            if (backToLoginButton) {
                backToLoginButton.addEventListener('click', this.showLoginForm.bind(this));
            }

            // Close OTP overlay when clicking outside
            if (otpOverlay) {
                otpOverlay.addEventListener('click', (e) => {
                    if (e.target === otpOverlay) {
                        this.showLoginForm();
                    }
                });
            }

            // Close OTP overlay with Escape key
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && !otpOverlay.classList.contains('hidden')) {
                    this.showLoginForm();
                }
            });
        },

        // Toggle password visibility
        togglePasswordVisibility: function() {
            const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordInput.setAttribute('type', type);
            
            const icon = togglePassword.querySelector('i');
            icon.classList.toggle('fa-eye');
            icon.classList.toggle('fa-eye-slash');
        },

        // Format NIK input
        formatNikInput: function(e) {
            e.target.value = e.target.value.replace(/\D/g, '').slice(0, 16);
        },

        // Bind OTP input events
        bindOtpInputs: function() {
            otpInputs.forEach((input, index) => {
                input.addEventListener('input', (e) => {
                    const value = e.target.value.replace(/\D/g, '');
                    e.target.value = value;

                    if (value && index < otpInputs.length - 1) {
                        otpInputs[index + 1].focus();
                    }
                });

                input.addEventListener('keydown', (e) => {
                    if (e.key === 'Backspace' && !e.target.value && index > 0) {
                        otpInputs[index - 1].focus();
                    }
                });

                input.addEventListener('paste', (e) => {
                    e.preventDefault();
                    const paste = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
                    
                    paste.split('').forEach((char, i) => {
                        if (otpInputs[i]) {
                            otpInputs[i].value = char;
                        }
                    });
                });
            });
        },

        // Message display functions
        showLoginMessage: function(message, type = 'error') {
            if (!loginMessage || !loginMessageIcon || !loginMessageText) return;

            loginMessageText.textContent = message;
            loginMessage.classList.remove('hidden');
            
            // Remove existing classes
            loginMessage.classList.remove(
                'bg-red-50', 'border-red-200', 'text-red-800', 'dark:bg-red-900/20', 'dark:border-red-800', 'dark:text-red-200',
                'bg-green-50', 'border-green-200', 'text-green-800', 'dark:bg-green-900/20', 'dark:border-green-800', 'dark:text-green-200',
                'bg-blue-50', 'border-blue-200', 'text-blue-800', 'dark:bg-blue-900/20', 'dark:border-blue-800', 'dark:text-blue-200'
            );
            
            loginMessageIcon.className = 'mr-3';
            
            if (type === 'success') {
                loginMessage.classList.add('bg-green-50', 'border-green-200', 'text-green-800', 'dark:bg-green-900/20', 'dark:border-green-800', 'dark:text-green-200', 'border');
                loginMessageIcon.classList.add('fas', 'fa-check-circle', 'text-green-600', 'dark:text-green-400');
            } else if (type === 'info') {
                loginMessage.classList.add('bg-blue-50', 'border-blue-200', 'text-blue-800', 'dark:bg-blue-900/20', 'dark:border-blue-800', 'dark:text-blue-200', 'border');
                loginMessageIcon.classList.add('fas', 'fa-info-circle', 'text-blue-600', 'dark:text-blue-400');
            } else {
                loginMessage.classList.add('bg-red-50', 'border-red-200', 'text-red-800', 'dark:bg-red-900/20', 'dark:border-red-800', 'dark:text-red-200', 'border');
                loginMessageIcon.classList.add('fas', 'fa-exclamation-circle', 'text-red-600', 'dark:text-red-400');
            }
        },

        hideLoginMessage: function() {
            if (loginMessage) {
                loginMessage.classList.add('hidden');
            }
        },

        showOtpMessage: function(message, type = 'error') {
            if (!otpMessage || !otpMessageIcon || !otpMessageText) return;

            otpMessageText.textContent = message;
            otpMessage.classList.remove('hidden');
            
            // Remove existing classes
            otpMessage.classList.remove(
                'bg-red-50', 'border-red-200', 'text-red-800', 'dark:bg-red-900/20', 'dark:border-red-800', 'dark:text-red-200',
                'bg-green-50', 'border-green-200', 'text-green-800', 'dark:bg-green-900/20', 'dark:border-green-800', 'dark:text-green-200',
                'bg-blue-50', 'border-blue-200', 'text-blue-800', 'dark:bg-blue-900/20', 'dark:border-blue-800', 'dark:text-blue-200'
            );
            
            otpMessageIcon.className = 'mr-2';
            
            if (type === 'success') {
                otpMessage.classList.add('bg-green-50', 'border-green-200', 'text-green-800', 'dark:bg-green-900/20', 'dark:border-green-800', 'dark:text-green-200', 'border');
                otpMessageIcon.classList.add('fas', 'fa-check-circle', 'text-green-600', 'dark:text-green-400');
            } else if (type === 'info') {
                otpMessage.classList.add('bg-blue-50', 'border-blue-200', 'text-blue-800', 'dark:bg-blue-900/20', 'dark:border-blue-800', 'dark:text-blue-200', 'border');
                otpMessageIcon.classList.add('fas', 'fa-info-circle', 'text-blue-600', 'dark:text-blue-400');
            } else {
                otpMessage.classList.add('bg-red-50', 'border-red-200', 'text-red-800', 'dark:bg-red-900/20', 'dark:border-red-800', 'dark:text-red-200', 'border');
                otpMessageIcon.classList.add('fas', 'fa-exclamation-circle', 'text-red-600', 'dark:text-red-400');
            }
        },

        hideOtpMessage: function() {
            if (otpMessage) {
                otpMessage.classList.add('hidden');
            }
        },

        // Session management
        setSession: function(sessionId) {
            localStorage.setItem("sessionId", sessionId);
        },
        
        getSession: function() {
            return localStorage.getItem("sessionId");
        },
        
        clearSession: function() {
            localStorage.removeItem("sessionId");
        },

        // Handle login form submission
        handleLogin: async function(e) {
            e.preventDefault();
            
            this.hideLoginMessage();
            
            const nik = nikInput.value.trim();
            const password = passwordInput.value.trim();
            
            if (!nik || !password) {
                this.showLoginMessage('NIK dan password harus diisi', 'error');
                return;
            }

            if (nik.length !== 16) {
                this.showLoginMessage('NIK harus 16 digit', 'error');
                return;
            }

            this.showLoginLoading(true);

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
                    localStorage.setItem("pendingNik", nik);
                    resendCount = 0;
                    this.showLoginMessage('OTP berhasil dikirim ke email Anda', 'success');
                    setTimeout(() => {
                        this.showOtpForm();
                    }, 1500);
                } else {
                    this.showLoginMessage(data.message || 'Login gagal. Periksa NIK dan password Anda.', 'error');
                }
            } catch (error) {
                this.showLoginMessage('Terjadi kesalahan koneksi. Silakan coba lagi.', 'error');
            } finally {
                this.showLoginLoading(false);
            }
        },

        // Show/hide login loading state
        showLoginLoading: function(loading) {
            const button = document.getElementById('loginButton');
            const buttonText = document.getElementById('loginButtonText');
            const spinner = document.getElementById('loginSpinner');
            
            if (loading) {
                button.disabled = true;
                buttonText.textContent = 'Memproses...';
                spinner.style.display = 'inline-block';
            } else {
                button.disabled = false;
                buttonText.textContent = 'Masuk';
                spinner.style.display = 'none';
            }
        },

        // Show OTP form
        showOtpForm: function() {
            if (otpOverlay) {
                otpOverlay.classList.remove('hidden');
                this.startCountdown();
                this.startResendCountdown();
                
                if (otpInputs[0]) {
                    otpInputs[0].focus();
                }
                this.hideLoginMessage();
            }
        },

        // Show login form
        showLoginForm: function() {
            if (otpOverlay) {
                otpOverlay.classList.add('hidden');
                this.resetOtpForm();
                this.stopCountdown();
                this.stopResendCountdown();
                this.hideOtpMessage();
            }
        },

        // Handle OTP verification
        handleOtpVerification: async function(e) {
            e.preventDefault();
            
            this.hideOtpMessage();
            
            const otp = Array.from(otpInputs).map(input => input.value).join('');
            
            if (otp.length !== 6) {
                this.showOtpMessage('Masukkan 6 digit kode OTP', 'error');
                return;
            }

            this.showVerifyLoading(true);

            try {
                const nik = localStorage.getItem("pendingNik");
                
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
                    this.setSession(data.user.sessionId);
                    localStorage.removeItem("pendingNik");
                    currentUser = data.user;
                    isAuthenticated = true;
                    this.showOtpMessage('Verifikasi berhasil! Mengalihkan ke dashboard...', 'success');
                    
                    setTimeout(() => {
                        otpOverlay.classList.add('hidden');
                        this.stopCountdown();
                        this.stopResendCountdown();
                        this.resetOtpForm();
                        this.hideOtpMessage();
                        
                        // Dispatch login success event
                        window.dispatchEvent(new CustomEvent('loginSuccess', {
                            detail: { user: currentUser }
                        }));
                    }, 1500);
                } else {
                    this.showOtpMessage(data.message || 'Kode OTP salah. Silakan coba lagi.', 'error');
                    otpInputs.forEach(input => input.value = '');
                    if (otpInputs[0]) otpInputs[0].focus();
                }
            } catch (error) {
                this.showOtpMessage('Terjadi kesalahan koneksi. Silakan coba lagi.', 'error');
            } finally {
                this.showVerifyLoading(false);
            }
        },

        // Show/hide verify loading state
        showVerifyLoading: function(loading) {
            const button = document.getElementById('verifyButton');
            const buttonText = document.getElementById('verifyButtonText');
            const spinner = document.getElementById('verifySpinner');
            const backButton = document.getElementById('backToLogin');
            
            if (loading) {
                button.disabled = true;
                backButton.disabled = true;
                buttonText.textContent = 'Memverifikasi...';
                spinner.style.display = 'inline-block';
                
                otpInputs.forEach(input => {
                    input.disabled = true;
                    input.classList.add('bg-gray-100', 'dark:bg-gray-600', 'cursor-not-allowed');
                });
            } else {
                button.disabled = false;
                backButton.disabled = false;
                buttonText.textContent = 'Verifikasi';
                spinner.style.display = 'none';
                
                otpInputs.forEach(input => {
                    input.disabled = false;
                    input.classList.remove('bg-gray-100', 'dark:bg-gray-600', 'cursor-not-allowed');
                });
            }
        },

        // Countdown management
        startCountdown: function() {
            otpCountdown = 120;
            this.updateCountdownDisplay();
            
            countdownInterval = setInterval(() => {
                otpCountdown--;
                this.updateCountdownDisplay();
                
                if (otpCountdown <= 0) {
                    this.stopCountdown();
                    this.showOtpMessage('Kode OTP telah kedaluwarsa. Silakan kirim ulang.', 'error');
                }
            }, 1000);
        },

        stopCountdown: function() {
            if (countdownInterval) {
                clearInterval(countdownInterval);
                countdownInterval = null;
            }
        },

        updateCountdownDisplay: function() {
            if (countdownElement) {
                const minutes = Math.floor(otpCountdown / 60);
                const seconds = otpCountdown % 60;
                countdownElement.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            }
        },

        // Resend countdown management
        startResendCountdown: function() {
            const resendCountdownDurations = [60, 600, 1200, 1800, 3600];
            const maxIndex = resendCountdownDurations.length - 1;
            const currentIndex = Math.min(resendCount, maxIndex);
            let resendCountdown = resendCountdownDurations[currentIndex];
            
            if (resendOtpButton) {
                resendOtpButton.disabled = true;
            }
            
            if (resendCountdownInterval) {
                clearInterval(resendCountdownInterval);
            }
            
            resendCountdownInterval = setInterval(() => {
                resendCountdown--;
                this.updateResendCountdownDisplay(resendCountdown);
                
                if (resendCountdown <= 0) {
                    clearInterval(resendCountdownInterval);
                    resendCountdownInterval = null;
                    if (resendOtpButton) {
                        resendOtpButton.disabled = false;
                    }
                    const resendButtonText = document.getElementById('resendButtonText');
                    if (resendButtonText) {
                        resendButtonText.textContent = 'Kirim ulang';
                    }
                }
            }, 1000);
        },

        stopResendCountdown: function() {
            if (resendCountdownInterval) {
                clearInterval(resendCountdownInterval);
                resendCountdownInterval = null;
            }
            if (resendOtpButton) {
                resendOtpButton.disabled = true;
            }
            const resendButtonText = document.getElementById('resendButtonText');
            if (resendButtonText) {
                resendButtonText.textContent = 'Kirim ulang';
            }
        },

        updateResendCountdownDisplay: function(countdown) {
            const resendButtonText = document.getElementById('resendButtonText');
            if (resendButtonText && countdown > 0) {
                const hours = Math.floor(countdown / 3600);
                const minutes = Math.floor((countdown % 3600) / 60);
                const seconds = countdown % 60;
                
                let timeText = '';
                if (hours > 0) {
                    timeText = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
                } else {
                    timeText = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
                }
                
                resendButtonText.textContent = `Kirim ulang (${timeText})`;
            }
        },

        // Reset OTP form
        resetOtpForm: function() {
            otpInputs.forEach(input => input.value = '');
        },

        // Handle resend OTP
        handleResendOtp: async function() {
            this.hideOtpMessage();
            this.resetOtpForm();
            
            try {
                const nik = localStorage.getItem("pendingNik");
                
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
                    resendCount++;
                    
                    const nextResendDurations = [60, 600, 1200, 1800, 3600];
                    const nextIndex = Math.min(resendCount, nextResendDurations.length - 1);
                    const nextDuration = nextResendDurations[nextIndex];
                    
                    let durationText = '';
                    if (nextDuration >= 3600) {
                        durationText = `${Math.floor(nextDuration / 3600)} jam`;
                    } else if (nextDuration >= 60) {
                        durationText = `${Math.floor(nextDuration / 60)} menit`;
                    } else {
                        durationText = `${nextDuration} detik`;
                    }
                    
                    this.showOtpMessage(`Kode OTP baru telah dikirim. Tunggu ${durationText} untuk kirim ulang berikutnya.`, 'success');
                    
                    this.startCountdown();
                    this.startResendCountdown();
                } else {
                    this.showOtpMessage(data.message || 'Gagal mengirim ulang OTP. Silakan coba lagi.', 'error');
                }
            } catch (error) {
                this.showOtpMessage('Terjadi kesalahan koneksi. Silakan coba lagi.', 'error');
            }
        },

        // Session validation
        validateSession: async function() {
            const sessionId = this.getSession();
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
                    currentUser = data.user;
                    isAuthenticated = true;
                    return true;
                } else {
                    this.clearSession();
                    return false;
                }
            } catch (error) {
                this.clearSession();
                return false;
            }
        },

        // Check existing session
        checkExistingSession: async function() {
            const isValidSession = await this.validateSession();
            if (isValidSession) {
                // Dispatch login success event for existing session
                window.dispatchEvent(new CustomEvent('loginSuccess', {
                    detail: { user: currentUser }
                }));
            } else {
                // Focus on NIK input if no valid session
                if (nikInput) {
                    nikInput.focus();
                }
            }
        },

        // Logout function
        logout: async function() {
            const sessionId = this.getSession();
            
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
                    // Silent error handling
                }
            }
            
            this.clearSession();
            isAuthenticated = false;
            currentUser = null;
            
            // Reset forms
            if (loginFormElement) {
                loginFormElement.reset();
            }
            this.resetOtpForm();
            this.stopCountdown();
            this.stopResendCountdown();
            this.hideLoginMessage();
            this.hideOtpMessage();
            
            resendCount = 0;
            localStorage.removeItem("pendingNik");
            
            // Dispatch logout complete event
            window.dispatchEvent(new CustomEvent('logoutComplete'));
            
            // Focus on NIK input
            setTimeout(() => {
                if (nikInput) {
                    nikInput.focus();
                }
            }, 100);
        }
    };

    // Initialize when DOM is loaded
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            LoginManager.init();
        });
    } else {
        LoginManager.init();
    }

// ================================
// Update profile images function
function updateProfileImages() {
    const sidebarImg = document.getElementById('sidebarAvatar');
    const sidebarFallback = document.getElementById('sidebarProfileFallback');
    const headerFallback = document.getElementById('headerProfileFallback');
    
    if (currentUser && currentUser.ProfilAvatar) {
        // Set image sources with avatar service
        if (sidebarImg) {
            sidebarImg.src = `https://pemanis.bulshitman1.workers.dev/avatar?url=${encodeURIComponent(currentUser.ProfilAvatar)}`;
            sidebarImg.style.display = 'block';
        }
        
        // Hide fallbacks
        if (sidebarFallback) sidebarFallback.style.display = 'none';
        if (headerFallback) headerFallback.style.display = 'none';
    } else {
        // Hide images and show fallbacks
        if (sidebarImg) sidebarImg.style.display = 'none';
        if (sidebarFallback) sidebarFallback.style.display = 'flex';
        if (headerFallback) headerFallback.style.display = 'flex';
    }
}

// Optional: Call it after login success
window.addEventListener('loginSuccess', () => {
    updateProfileImages();
});

})();
