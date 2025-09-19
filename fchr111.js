// ================================
// LoginManager + Dashboard Integration
// ================================
(function() {
    'use strict';

    // ================================
    // CONFIG & STATE
    // ================================
    const WORKER_URL = "https://pemanis.bulshitman1.workers.dev/";

    let isAuthenticated = false;
    let currentUser = null;
    let otpCountdown = 120;
    let countdownInterval = null;
    let resendCount = 0;
    let resendCountdownInterval = null;
    let isSidebarCollapsed = false;
    let isMobile = window.innerWidth < 768;

    // ELEMENTS
    const loginContainer = document.getElementById('loginContainer');
    const loginFormElement = document.getElementById('loginFormElement');
    const otpFormElement = document.getElementById('otpFormElement');
    const otpOverlay = document.getElementById('otpOverlay');
    const togglePassword = document.getElementById('togglePassword');
    const passwordInput = document.getElementById('password');
    const nikInput = document.getElementById('nik');
    const otpInputs = document.querySelectorAll('.otp-input');
    const countdownElement = document.getElementById('countdown');
    const resendOtpButton = document.getElementById('resendOtp');
    const backToLoginButton = document.getElementById('backToLogin');
    const loginMessage = document.getElementById('loginMessage');
    const loginMessageIcon = document.getElementById('loginMessageIcon');
    const loginMessageText = document.getElementById('loginMessageText');
    const otpMessage = document.getElementById('otpMessage');
    const otpMessageIcon = document.getElementById('otpMessageIcon');
    const otpMessageText = document.getElementById('otpMessageText');

    // SIDEBAR & DASHBOARD ELEMENTS
    const sidebar = document.getElementById('sidebar');
    const header = document.getElementById('header');
    const mainContent = document.getElementById('mainContent');
    const sidebarToggleDesktop = document.getElementById('sidebarToggleDesktop');
    const sidebarToggleCollapsed = document.getElementById('sidebarToggleCollapsed');
    const mobileMenuToggle = document.getElementById('mobileMenuToggle');
    const dashboardContainer = document.getElementById('dashboardContainer');

    // ================================
    // LOGIN MANAGER
    // ================================
    const LoginManager = {
        init: function() {
            this.initDarkMode();
            this.bindEvents();
            this.checkExistingSession();
        },

        initDarkMode: function() {
            const isDark = localStorage.getItem('darkMode') === 'true';
            if (isDark) document.documentElement.classList.add('dark');
            else document.documentElement.classList.remove('dark');
        },

        bindEvents: function() {
            // Toggle password visibility
            if (togglePassword) togglePassword.addEventListener('click', this.togglePasswordVisibility);

            // NIK input formatting
            if (nikInput) nikInput.addEventListener('input', this.formatNikInput);

            // Login & OTP
            if (loginFormElement) loginFormElement.addEventListener('submit', this.handleLogin.bind(this));
            if (otpFormElement) otpFormElement.addEventListener('submit', this.handleOtpVerification.bind(this));

            this.bindOtpInputs();

            if (resendOtpButton) resendOtpButton.addEventListener('click', this.handleResendOtp.bind(this));
            if (backToLoginButton) backToLoginButton.addEventListener('click', this.showLoginForm.bind(this));

            if (otpOverlay) otpOverlay.addEventListener('click', (e) => {
                if (e.target === otpOverlay) this.showLoginForm();
            });

            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && !otpOverlay.classList.contains('hidden')) {
                    this.showLoginForm();
                }
            });
        },

        togglePasswordVisibility: function() {
            const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordInput.setAttribute('type', type);
            const icon = togglePassword.querySelector('i');
            icon.classList.toggle('fa-eye');
            icon.classList.toggle('fa-eye-slash');
        },

        formatNikInput: function(e) {
            e.target.value = e.target.value.replace(/\D/g, '').slice(0, 16);
        },

        bindOtpInputs: function() {
            otpInputs.forEach((input, index) => {
                input.addEventListener('input', (e) => {
                    const value = e.target.value.replace(/\D/g, '');
                    e.target.value = value;
                    if (value && index < otpInputs.length - 1) otpInputs[index + 1].focus();
                });
                input.addEventListener('keydown', (e) => {
                    if (e.key === 'Backspace' && !e.target.value && index > 0) otpInputs[index - 1].focus();
                });
                input.addEventListener('paste', (e) => {
                    e.preventDefault();
                    const paste = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
                    paste.split('').forEach((char, i) => { if (otpInputs[i]) otpInputs[i].value = char; });
                });
            });
        },

        showLoginMessage: function(message, type='error') {
            if (!loginMessage || !loginMessageIcon || !loginMessageText) return;
            loginMessageText.textContent = message;
            loginMessage.classList.remove('hidden');
            loginMessage.classList.remove(
                'bg-red-50','border-red-200','text-red-800','dark:bg-red-900/20','dark:border-red-800','dark:text-red-200',
                'bg-green-50','border-green-200','text-green-800','dark:bg-green-900/20','dark:border-green-800','dark:text-green-200',
                'bg-blue-50','border-blue-200','text-blue-800','dark:bg-blue-900/20','dark:border-blue-800','dark:text-blue-200'
            );
            loginMessageIcon.className = 'mr-3';

            if (type==='success') {
                loginMessage.classList.add('bg-green-50','border-green-200','text-green-800','dark:bg-green-900/20','dark:border-green-800','dark:text-green-200','border');
                loginMessageIcon.classList.add('fas','fa-check-circle','text-green-600','dark:text-green-400');
            } else if (type==='info') {
                loginMessage.classList.add('bg-blue-50','border-blue-200','text-blue-800','dark:bg-blue-900/20','dark:border-blue-800','dark:text-blue-200','border');
                loginMessageIcon.classList.add('fas','fa-info-circle','text-blue-600','dark:text-blue-400');
            } else {
                loginMessage.classList.add('bg-red-50','border-red-200','text-red-800','dark:bg-red-900/20','dark:border-red-800','dark:text-red-200','border');
                loginMessageIcon.classList.add('fas','fa-exclamation-circle','text-red-600','dark:text-red-400');
            }
        },

        hideLoginMessage: function() { if(loginMessage) loginMessage.classList.add('hidden'); },

        showOtpMessage: function(message, type='error') {
            if (!otpMessage || !otpMessageIcon || !otpMessageText) return;
            otpMessageText.textContent = message;
            otpMessage.classList.remove('hidden');
            otpMessage.classList.remove(
                'bg-red-50','border-red-200','text-red-800','dark:bg-red-900/20','dark:border-red-800','dark:text-red-200',
                'bg-green-50','border-green-200','text-green-800','dark:bg-green-900/20','dark:border-green-800','dark:text-green-200',
                'bg-blue-50','border-blue-200','text-blue-800','dark:bg-blue-900/20','dark:border-blue-800','dark:text-blue-200'
            );
            otpMessageIcon.className = 'mr-2';

            if (type==='success') {
                otpMessage.classList.add('bg-green-50','border-green-200','text-green-800','dark:bg-green-900/20','dark:border-green-800','dark:text-green-200','border');
                otpMessageIcon.classList.add('fas','fa-check-circle','text-green-600','dark:text-green-400');
            } else if (type==='info') {
                otpMessage.classList.add('bg-blue-50','border-blue-200','text-blue-800','dark:bg-blue-900/20','dark:border-blue-800','dark:text-blue-200','border');
                otpMessageIcon.classList.add('fas','fa-info-circle','text-blue-600','dark:text-blue-400');
            } else {
                otpMessage.classList.add('bg-red-50','border-red-200','text-red-800','dark:bg-red-900/20','dark:border-red-800','dark:text-red-200','border');
                otpMessageIcon.classList.add('fas','fa-exclamation-circle','text-red-600','dark:text-red-400');
            }
        },

        hideOtpMessage: function() { if(otpMessage) otpMessage.classList.add('hidden'); },

        setSession: function(sessionId) { localStorage.setItem("sessionId", sessionId); },
        getSession: function() { return localStorage.getItem("sessionId"); },
        clearSession: function() { localStorage.removeItem("sessionId"); },

        // ================================
        // LOGIN
        // ================================
        handleLogin: async function(e) {
            e.preventDefault();
            this.hideLoginMessage();

            const nik = nikInput.value.trim();
            const password = passwordInput.value.trim();

            if(!nik || !password) { this.showLoginMessage('NIK dan Password wajib diisi'); return; }

            try {
                const res = await fetch(WORKER_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action:'login', nik, password })
                });

                const data = await res.json();
                if(data.success) {
                    currentUser = data.user;
                    this.showOtpForm();
                    this.startOtpCountdown();
                } else {
                    this.showLoginMessage(data.message || 'Login gagal');
                }
            } catch(err) {
                this.showLoginMessage('Terjadi kesalahan server');
            }
        },

        handleOtpVerification: async function(e) {
            e.preventDefault();
            this.hideOtpMessage();

            const otp = Array.from(otpInputs).map(i=>i.value).join('');
            if(!otp || otp.length<6) { this.showOtpMessage('OTP harus 6 digit'); return; }

            try {
                const res = await fetch(WORKER_URL, {
                    method: 'POST',
                    headers: { 'Content-Type':'application/json' },
                    body: JSON.stringify({ action:'verifyOtp', otp, nik: nikInput.value.trim() })
                });

                const data = await res.json();
                if(data.success) {
                    isAuthenticated = true;
                    this.setSession(data.sessionId);
                    this.showDashboard();
                } else {
                    this.showOtpMessage(data.message || 'OTP tidak valid');
                }
            } catch(err) {
                this.showOtpMessage('Terjadi kesalahan server');
            }
        },

        handleResendOtp: async function() {
            if(resendCount>=3) { this.showOtpMessage('Maksimal kirim OTP tercapai'); return; }
            resendCount++;
            this.showOtpMessage('OTP terkirim lagi', 'info');
        },

        showLoginForm: function() {
            loginContainer.classList.remove('hidden');
            otpOverlay.classList.add('hidden');
            loginFormElement.reset();
            otpFormElement.reset();
            this.stopOtpCountdown();
            this.stopResendCountdown();
            nikInput.focus();
        },

        showOtpForm: function() {
            loginContainer.classList.add('hidden');
            otpOverlay.classList.remove('hidden');
        },

        startOtpCountdown: function() {
            otpCountdown = 120;
            countdownElement.textContent = otpCountdown;
            countdownInterval = setInterval(()=>{
                otpCountdown--;
                countdownElement.textContent = otpCountdown;
                if(otpCountdown<=0) this.stopOtpCountdown();
            },1000);
        },

        stopOtpCountdown: function() { clearInterval(countdownInterval); },

        stopResendCountdown: function() { clearInterval(resendCountdownInterval); },

        checkExistingSession: async function() {
            const sessionId = this.getSession();
            if(!sessionId) return;

            try {
                const res = await fetch(WORKER_URL, {
                    method:'POST',
                    headers:{'Content-Type':'application/json'},
                    body: JSON.stringify({ action:'validateSession', sessionId })
                });
                const data = await res.json();
                if(data.valid) {
                    currentUser = data.user;
                    isAuthenticated = true;
                    this.showDashboard();
                } else {
                    this.clearSession();
                }
            } catch(err) { this.clearSession(); }
        },

        showDashboard: function() {
            dashboardContainer.classList.remove('hidden');
            otpOverlay.classList.add('hidden');
            loginContainer.classList.add('hidden');
            this.initializeProfileDropdown();
            initializeDashboard();
        },

        // ================================
        // PROFILE DROPDOWN & LOGOUT
        // ================================
        initializeProfileDropdown: function() {
            const profileToggle = document.getElementById('profileDropdownToggle');
            const profileDropdown = document.getElementById('profileDropdown');
            const logoutMenuItem = document.getElementById('logoutMenuItem');

            if (!profileToggle || !profileDropdown || !logoutMenuItem) return;

            profileToggle.addEventListener('click', (e) => {
                e.stopPropagation();
                profileDropdown.classList.toggle('hidden');
            });

            document.addEventListener('click', (e) => {
                if(!profileToggle.contains(e.target) && !profileDropdown.contains(e.target)) {
                    profileDropdown.classList.add('hidden');
                }
            });

            logoutMenuItem.addEventListener('click', (e)=>{
                e.preventDefault();
                profileDropdown.classList.add('hidden');
                this.logout();
            });
        },

        logout: async function() {
            const sessionId = this.getSession();
            if(sessionId) {
                try { await fetch(WORKER_URL, {
                    method:'POST',
                    headers:{'Content-Type':'application/json','x-session-id':sessionId},
                    body: JSON.stringify({ action:'logout' })
                }); } catch(e){}
            }

            this.clearSession();
            currentUser = null;
            isAuthenticated = false;
            this.showLoginForm();

            // Reset dashboard
            if(dashboardContainer) dashboardContainer.classList.add('hidden');
        }
    };

    // ================================
    // DASHBOARD FUNCTIONS (Sidebar, Submenus)
    // ================================
    function initializeDashboard() {
        initializeSubmenus();
        initializeMenuListeners();
        updateSidebarLayout();
        updateNavigationHeight();
    }

    function initializeSubmenus() {
        document.querySelectorAll('.submenu').forEach(s => s.style.display='none');
        document.querySelectorAll('.menu-toggle .fa-chevron-down').forEach(c => c.style.transform='rotate(0deg)');
    }

    function initializeMenuListeners() {
        document.querySelectorAll('.menu-toggle').forEach(toggle=>{
            toggle.addEventListener('click',(e)=>{
                e.preventDefault();
                handleMenuWithSubmenu(toggle);
            });
        });
    }

    function handleMenuWithSubmenu(toggle) {
        const targetId = toggle.getAttribute('data-target');
        const submenu = document.getElementById(targetId);
        if(!submenu) return;

        if(submenu.style.display==='none') submenu.style.display='block';
        else submenu.style.display='none';
    }

    function updateSidebarLayout() {
        const currentSidebarTexts = document.querySelectorAll('.sidebar-text');
        if(isMobile || isSidebarCollapsed) sidebar.style.width='80px';
        else sidebar.style.width='256px';

        currentSidebarTexts.forEach(t=>{
            t.style.display=(isSidebarCollapsed)?'none':'block';
        });
    }

    function updateNavigationHeight() {
        const navigationMenu = document.getElementById('navigationMenu');
        if(!navigationMenu) return;
        const headerHeight = 64;
        const footerHeight = 64;
        navigationMenu.style.maxHeight = `${window.innerHeight - headerHeight - footerHeight}px`;
    }

    // ================================
    // INITIALIZE
    // ================================
    document.addEventListener('DOMContentLoaded', () => {
        LoginManager.init();
    });

})();
