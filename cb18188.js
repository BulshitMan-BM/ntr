        // Configuration
        const WORKER_URL = "https://pemanis.bulshitman1.workers.dev/";
        let currentNIK = "";

        // =======================
        // LocalStorage Helper Functions
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

        // Message display functions
        function showMessage(elementId, message, type = 'info') {
            const messageEl = document.getElementById(elementId);
            const messageTextEl = document.getElementById(elementId + '-text');
            
            messageEl.className = `mt-4 p-3 rounded-lg ${
                type === 'error' ? 'bg-red-100 dark:bg-red-900/20 border border-red-200 dark:border-red-800' :
                type === 'success' ? 'bg-green-100 dark:bg-green-900/20 border border-green-200 dark:border-green-800' :
                'bg-blue-100 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800'
            }`;
            
            messageTextEl.className = `text-sm ${
                type === 'error' ? 'text-red-700 dark:text-red-300' :
                type === 'success' ? 'text-green-700 dark:text-green-300' :
                'text-blue-700 dark:text-blue-300'
            }`;
            
            messageTextEl.textContent = message;
            messageEl.classList.remove('hidden');
            
            // Auto hide after 5 seconds
            setTimeout(() => {
                messageEl.classList.add('hidden');
            }, 5000);
        }

        function hideMessage(elementId) {
            document.getElementById(elementId).classList.add('hidden');
        }

        // Toggle password visibility
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

        // OTP input handling
        function setupOTPInputs() {
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
                    
                    // Move to next input
                    if (value && index < otpInputs.length - 1) {
                        otpInputs[index + 1].focus();
                    }
                    
                    // Update hidden input
                    updateOTPValue();
                });
                
                input.addEventListener('keydown', (e) => {
                    // Move to previous input on backspace
                    if (e.key === 'Backspace' && !e.target.value && index > 0) {
                        otpInputs[index - 1].focus();
                    }
                });
                
                input.addEventListener('paste', (e) => {
                    e.preventDefault();
                    const pastedData = e.clipboardData.getData('text');
                    const digits = pastedData.replace(/\D/g, '').slice(0, 6);
                    
                    digits.split('').forEach((digit, i) => {
                        if (otpInputs[i]) {
                            otpInputs[i].value = digit;
                        }
                    });
                    
                    updateOTPValue();
                    
                    // Focus on the next empty input or the last one
                    const nextEmptyIndex = digits.length < 6 ? digits.length : 5;
                    otpInputs[nextEmptyIndex].focus();
                });
            });
            
            function updateOTPValue() {
                const otpValue = Array.from(otpInputs).map(input => input.value).join('');
                hiddenOtpInput.value = otpValue;
            }
        }

        // Back to login function
        function backToLogin() {
            document.getElementById('otp-step').classList.add('hidden');
            document.getElementById('login-step').classList.remove('hidden');
            
            // Clear OTP inputs
            document.querySelectorAll('.otp-input').forEach(input => input.value = '');
            document.getElementById('otp').value = '';
            
            // Clear messages
            hideMessage('otp-message');
        }

        // === Step 1: Login (password) ===
        async function loginUser(e) {
            e.preventDefault();
            
            const loginBtn = document.getElementById("login-btn");
            const loginBtnText = document.getElementById("login-btn-text");
            const loginBtnIcon = document.getElementById("login-btn-icon");
            
            // Disable button and show loading
            loginBtn.disabled = true;
            loginBtnText.textContent = "Memproses...";
            loginBtnIcon.className = "fas fa-spinner fa-spin";
            
            hideMessage('message');
            
            currentNIK = document.getElementById("nik").value;
            const password = document.getElementById("password").value;

            try {
                const res = await fetch(WORKER_URL, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        action: "login",
                        nik: currentNIK,
                        password: password,
                        deviceInfo: navigator.userAgent
                    })
                });

                const data = await res.json();

                if (data.success && data.step === "otp") {
                    localStorage.setItem("pendingNik", currentNIK);
                    showMessage('message', 'Login berhasil! Silakan masukkan kode OTP.', 'success');
                    
                    setTimeout(() => {
                        document.getElementById("login-step").classList.add('hidden');
                        document.getElementById("otp-step").classList.remove('hidden');
                        document.querySelector('.otp-input').focus();
                    }, 1000);
                } else if (data.success) {
                    if (data.sessionId) {
                        setSession(data.sessionId);
                    }
                    showMessage('message', 'Login berhasil!', 'success');
                    
                    setTimeout(() => {
                        document.getElementById("login-step").classList.add('hidden');
                        createDashboard();
                        document.getElementById("dashboard").classList.remove('hidden');
                        document.getElementById("username").textContent = data.user?.Username || currentNIK;
                        document.getElementById("userRoleSidebar").textContent = data.user?.Role || "Member";
                        initializeDashboardElements();
                        initializeLayout();
                        window.addEventListener('resize', handleResize);
                    }, 1000);
                } else {
                    showMessage('message', data.message || 'Login gagal. Silakan coba lagi.', 'error');
                }
            } catch (error) {
                console.error('Login error:', error);
                showMessage('message', 'Terjadi kesalahan koneksi. Silakan coba lagi.', 'error');
            } finally {
                loginBtn.disabled = false;
                loginBtnText.textContent = "Masuk";
                loginBtnIcon.className = "fas fa-arrow-right";
            }
        }

        // === Step 2: Verifikasi OTP ===
        async function verifyOtp(e) {
            e.preventDefault();
            
            const otpBtn = document.getElementById("otp-btn");
            const otpBtnText = document.getElementById("otp-btn-text");
            const otpBtnIcon = document.getElementById("otp-btn-icon");
            
            // Disable button and show loading
            otpBtn.disabled = true;
            otpBtnText.textContent = "Memverifikasi...";
            otpBtnIcon.className = "fas fa-spinner fa-spin";
            
            hideMessage('otp-message');
            
            const otpValue = document.getElementById("otp").value;
            const nik = localStorage.getItem("pendingNik");
            
            if (otpValue.length !== 6) {
                showMessage('otp-message', 'Silakan masukkan 6 digit kode OTP.', 'error');
                otpBtn.disabled = false;
                otpBtnText.textContent = "Verifikasi";
                otpBtnIcon.className = "fas fa-check";
                return;
            }

            try {
                const res = await fetch(WORKER_URL, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        action: "verify-otp",
                        nik: nik,
                        otp: otpValue,
                        deviceInfo: navigator.userAgent
                    })
                });

                const data = await res.json();

                if (data.success && data.user && data.user.sessionId) {
                    setSession(data.user.sessionId);
                    localStorage.removeItem("pendingNik");
                    
                    showMessage('otp-message', 'Verifikasi berhasil! Mengalihkan ke dashboard...', 'success');
                    
                    setTimeout(() => {
                        document.getElementById("otp-step").classList.add('hidden');
                        createDashboard();
                        document.getElementById("dashboard").classList.remove('hidden');
                        document.getElementById("username").textContent = data.user?.Username || nik;
                        document.getElementById("userRoleSidebar").textContent = data.user?.Role || "Member";
                        initializeDashboardElements();
                        initializeLayout();
                        window.addEventListener('resize', handleResize);
                    }, 1000);
                } else {
                    showMessage('otp-message', data.message || 'Kode OTP salah. Silakan coba lagi.', 'error');
                    
                    // Clear OTP inputs
                    document.querySelectorAll('.otp-input').forEach(input => input.value = '');
                    document.getElementById('otp').value = '';
                    document.querySelector('.otp-input').focus();
                }
            } catch (error) {
                console.error('OTP verification error:', error);
                showMessage('otp-message', 'Terjadi kesalahan koneksi. Silakan coba lagi.', 'error');
            } finally {
                otpBtn.disabled = false;
                otpBtnText.textContent = "Verifikasi";
                otpBtnIcon.className = "fas fa-check";
            }
        }

        // === Step 3: Logout ===
        async function logoutUser() {
            if (!confirm('Apakah Anda yakin ingin keluar?')) {
                return;
            }
            
            const sessionId = getSession();
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
                    console.error('Logout error:', error);
                }
            }
            
            clearSession();
            
            // Clear dashboard HTML completely
            document.getElementById("dashboard").innerHTML = '';
            document.getElementById("dashboard").classList.add('hidden');
            document.getElementById("login-step").classList.remove('hidden');
            
            // Clear dashboard elements
            sidebar = null;
            header = null;
            mainContent = null;
            sidebarToggle = null;
            headerToggle = null;
            darkModeToggle = null;
            sidebarTexts = null;
            sidebarToggleBtn = null;
            
            // Remove resize listener
            window.removeEventListener('resize', handleResize);
            
            // Clear form data
            document.getElementById("nik").value = '';
            document.getElementById("password").value = '';
            currentNIK = '';
            
            showMessage('message', 'Logout berhasil.', 'success');
        }

        // Function to get IP address (optional)
        async function getIp() {
            try {
                const res = await fetch("https://api64.ipify.org?format=json");
                const data = await res.json();
                return data.ip;
            } catch {
                return "Unknown";
            }
        }

        // === Session Validation ===
        async function validateSession() {
            const sessionId = getSession();
            if (!sessionId) {
                ensureLoginPage();
                return;
            }

            try {
                const res = await fetch(WORKER_URL, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({ 
                        action: "validate-session",
                        sessionId: sessionId,
                        deviceInfo: navigator.userAgent,
                        ip: await getIp() // optional
                    })
                });

                const data = await res.json();
                if (!data.success) {
                    clearSession();
                    alert("Session tidak valid, silakan login ulang.");
                    ensureLoginPage();
                } else {
                    // Hide login and show dashboard
                    document.getElementById("login-step").classList.add('hidden');
                    document.getElementById("otp-step").classList.add('hidden');
                    
                    // Create dashboard first
                    createDashboard();
                    document.getElementById("dashboard").classList.remove('hidden');
                    
                    // Set username and role
                    const username = data.user?.Username || data.user?.NIK || data.user?.nama || "User";
                    const role = data.user?.Role || "Member";
                    document.getElementById("username").textContent = username;
                    document.getElementById("userRoleSidebar").textContent = role;
                    
                    // Initialize dashboard layout
                    setTimeout(() => {
                        initializeDashboardElements();
                        initializeLayout();
                        window.addEventListener('resize', handleResize);
                    }, 100);
                }
            } catch (error) {
                console.error('Session validation error:', error);
                clearSession();
                ensureLoginPage();
            }
        }

        // Helper function to ensure we're on login page
        function ensureLoginPage() {
            document.getElementById("dashboard").classList.add('hidden');
            document.getElementById("otp-step").classList.add('hidden');
            document.getElementById("login-step").classList.remove('hidden');
            
            // Clear any form data
            const nikInput = document.getElementById("nik");
            const passwordInput = document.getElementById("password");
            if (nikInput) nikInput.value = '';
            if (passwordInput) passwordInput.value = '';
            currentNIK = '';
        }

        // Function to create complete dashboard HTML
        function createDashboard() {
            const dashboardContainer = document.getElementById('dashboard');
            dashboardContainer.innerHTML = `
                <!-- Sidebar -->
                <div id="sidebar" class="fixed left-0 top-0 h-full bg-white dark:bg-gray-800 shadow-lg sidebar-transition z-20 w-64">
                    <!-- Sidebar Header -->
                    <div class="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-700">
                        <div id="logo" class="flex items-center space-x-3">
                            <div class="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                                <i class="fas fa-cube text-white text-sm"></i>
                            </div>
                            <span class="font-bold text-xl text-gray-800 dark:text-white sidebar-text">Dashboard</span>
                        </div>
                        <!-- Toggle button in sidebar (visible when expanded) -->
                        <button id="sidebarToggle" class="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 sidebar-toggle-btn">
                            <i class="fas fa-angle-double-left"></i>
                        </button>
                        <!-- Close button for mobile overlay -->
                        <button id="mobileCloseBtn" class="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 hidden md:hidden" onclick="toggleMobileOverlay()">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>

                    <!-- Navigation Menu -->
                    <nav class="p-3 space-y-1 overflow-y-auto overflow-x-hidden" style="height: calc(100vh - 140px); scrollbar-width: thin; scrollbar-color: #cbd5e1 transparent;">
                        <!-- DTKS Menu -->
                        <div class="menu-group">
                            <button class="flex items-center justify-between w-full space-x-3 p-3 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors" onclick="toggleSubmenu('dtks', event)">
                                <div class="flex items-center space-x-3">
                                    <i class="fas fa-database w-5 h-5 flex-shrink-0"></i>
                                    <span class="sidebar-text">DTKS</span>
                                </div>
                                <i class="fas fa-chevron-down w-4 h-4 sidebar-text transition-transform" id="dtks-arrow"></i>
                            </button>
                            <div class="submenu ml-8 mt-1 space-y-1 hidden" id="dtks-submenu">
                                <a href="#" class="flex items-center space-x-3 p-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors" onclick="handleSubmenuClick(event, 'view-data')">
                                    <i class="fas fa-eye w-4 h-4 flex-shrink-0"></i>
                                    <span class="sidebar-text text-sm">View Data</span>
                                </a>
                                <a href="#" class="flex items-center space-x-3 p-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors" onclick="handleSubmenuClick(event, 'rekap-data')">
                                    <i class="fas fa-chart-line w-4 h-4 flex-shrink-0"></i>
                                    <span class="sidebar-text text-sm">Rekap Data</span>
                                </a>
                            </div>
                        </div>

                        <!-- Usulan Menu -->
                        <div class="menu-group">
                            <button class="flex items-center justify-between w-full space-x-3 p-3 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors" onclick="toggleSubmenu('usulan', event)">
                                <div class="flex items-center space-x-3">
                                    <i class="fas fa-file-alt w-5 h-5 flex-shrink-0"></i>
                                    <span class="sidebar-text">Usulan</span>
                                </div>
                                <i class="fas fa-chevron-down w-4 h-4 sidebar-text transition-transform" id="usulan-arrow"></i>
                            </button>
                            <div class="submenu ml-8 mt-1 space-y-1 hidden" id="usulan-submenu">
                                <a href="#" class="flex items-center space-x-3 p-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                                    <i class="fas fa-plus w-4 h-4 flex-shrink-0"></i>
                                    <span class="sidebar-text text-sm">Data Baru</span>
                                </a>
                                <a href="#" class="flex items-center space-x-3 p-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                                    <i class="fas fa-edit w-4 h-4 flex-shrink-0"></i>
                                    <span class="sidebar-text text-sm">Pembaharuan</span>
                                </a>
                            </div>
                        </div>

                        <!-- Unduh Menu -->
                        <div class="menu-group">
                            <button class="flex items-center justify-between w-full space-x-3 p-3 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors" onclick="toggleSubmenu('unduh', event)">
                                <div class="flex items-center space-x-3">
                                    <i class="fas fa-download w-5 h-5 flex-shrink-0"></i>
                                    <span class="sidebar-text">Unduh</span>
                                </div>
                                <i class="fas fa-chevron-down w-4 h-4 sidebar-text transition-transform" id="unduh-arrow"></i>
                            </button>
                            <div class="submenu ml-8 mt-1 space-y-1 hidden" id="unduh-submenu">
                                <a href="#" class="flex items-center space-x-3 p-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                                    <i class="fas fa-bullhorn w-4 h-4 flex-shrink-0"></i>
                                    <span class="sidebar-text text-sm">Edaran & Informasi</span>
                                </a>
                            </div>
                        </div>

                        <!-- DTKS/Dusun Menu -->
                        <div class="menu-group">
                            <button class="flex items-center justify-between w-full space-x-3 p-3 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors" onclick="toggleSubmenu('dusun', event)">
                                <div class="flex items-center space-x-3">
                                    <i class="fas fa-map-marker-alt w-5 h-5 flex-shrink-0"></i>
                                    <span class="sidebar-text">DTKS/Dusun</span>
                                </div>
                                <i class="fas fa-chevron-down w-4 h-4 sidebar-text transition-transform" id="dusun-arrow"></i>
                            </button>
                            <div class="submenu ml-8 mt-1 space-y-1 hidden" id="dusun-submenu">
                                <a href="#" class="flex items-center space-x-3 p-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                                    <i class="fas fa-home w-4 h-4 flex-shrink-0"></i>
                                    <span class="sidebar-text text-sm">Dusun 1</span>
                                </a>
                                <a href="#" class="flex items-center space-x-3 p-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                                    <i class="fas fa-home w-4 h-4 flex-shrink-0"></i>
                                    <span class="sidebar-text text-sm">Dusun 2</span>
                                </a>
                                <a href="#" class="flex items-center space-x-3 p-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                                    <i class="fas fa-home w-4 h-4 flex-shrink-0"></i>
                                    <span class="sidebar-text text-sm">Dusun 3</span>
                                </a>
                                <a href="#" class="flex items-center space-x-3 p-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                                    <i class="fas fa-home w-4 h-4 flex-shrink-0"></i>
                                    <span class="sidebar-text text-sm">Dusun 4</span>
                                </a>
                            </div>
                        </div>

                        <!-- Menu tanpa submenu untuk testing -->
                        <div class="menu-group">
                            <button class="flex items-center w-full space-x-3 p-3 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors" onclick="handleMenuWithoutSubmenu('laporan')">
                                <div class="flex items-center space-x-3">
                                    <i class="fas fa-chart-bar w-5 h-5 flex-shrink-0"></i>
                                    <span class="sidebar-text">Laporan</span>
                                </div>
                            </button>
                        </div>
                    </nav>

                    <!-- Sidebar Footer -->
                    <div class="absolute bottom-0 left-0 right-0">
                        <div class="p-3 border-t border-gray-200 dark:border-gray-700">
                            <div class="flex items-center space-x-3">
                                <div id="sidebarProfileImage" class="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0">
                                    <i class="fas fa-user text-white text-sm"></i>
                                </div>
                                <div class="sidebar-text min-w-0">
                                    <p class="font-medium text-gray-800 dark:text-white truncate" id="username">User</p>
                                    <p class="text-sm text-gray-500 dark:text-gray-400 truncate" id="userRoleSidebar">Member</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Header -->
                <header id="header" class="fixed top-0 bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 header-transition z-30 left-64 right-0 h-16">
                    <div class="flex items-center justify-between h-full px-6">
                        <!-- Toggle button in header (visible when sidebar collapsed) -->
                        <button id="headerToggle" class="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 hidden">
                            <i class="fas fa-bars"></i>
                        </button>

                        <!-- Spacer when toggle is hidden -->
                        <div class="flex-1"></div>

                        <!-- Actions -->
                        <div class="flex items-center space-x-3 ml-auto">
                            <!-- Dark mode toggle -->
                            <button id="darkModeToggle" class="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300">
                                <i id="darkModeIcon" class="fas fa-moon"></i>
                            </button>
                            
                            <!-- Notifications -->
                            <button class="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 relative">
                                <i class="fas fa-bell"></i>
                                <span class="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></span>
                            </button>

                            <!-- Logout -->
                            <button id="logout-btn" class="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300" title="Logout">
                                <i class="fas fa-sign-out-alt"></i>
                            </button>
                        </div>
                    </div>
                </header>

                <!-- Main Content -->
                <main id="mainContent" class="content-transition ml-64 pt-16 min-h-screen">
                    <div class="p-6">
                        <!-- Page Title -->
                        <div class="mb-8">
                            <h1 class="text-3xl font-bold text-gray-900 dark:text-white">Selamat Datang</h1>
                            <p class="text-gray-600 dark:text-gray-400 mt-2">Dashboard modern dan minimalis untuk mengelola aplikasi Anda</p>
                        </div>

                        <!-- Stats Cards -->
                        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                            <div class="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                                <div class="flex items-center justify-between">
                                    <div>
                                        <p class="text-sm text-gray-600 dark:text-gray-400">Total Pengguna</p>
                                        <p class="text-2xl font-bold text-gray-900 dark:text-white">1,234</p>
                                    </div>
                                    <div class="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                                        <i class="fas fa-users text-blue-600 dark:text-blue-400"></i>
                                    </div>
                                </div>
                            </div>

                            <div class="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                                <div class="flex items-center justify-between">
                                    <div>
                                        <p class="text-sm text-gray-600 dark:text-gray-400">Penjualan</p>
                                        <p class="text-2xl font-bold text-gray-900 dark:text-white">Rp 45.2M</p>
                                    </div>
                                    <div class="w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
                                        <i class="fas fa-chart-line text-green-600 dark:text-green-400"></i>
                                    </div>
                                </div>
                            </div>

                            <div class="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                                <div class="flex items-center justify-between">
                                    <div>
                                        <p class="text-sm text-gray-600 dark:text-gray-400">Pesanan</p>
                                        <p class="text-2xl font-bold text-gray-900 dark:text-white">567</p>
                                    </div>
                                    <div class="w-12 h-12 bg-orange-100 dark:bg-orange-900/20 rounded-lg flex items-center justify-center">
                                        <i class="fas fa-shopping-cart text-orange-600 dark:text-orange-400"></i>
                                    </div>
                                </div>
                            </div>

                            <div class="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                                <div class="flex items-center justify-between">
                                    <div>
                                        <p class="text-sm text-gray-600 dark:text-gray-400">Konversi</p>
                                        <p class="text-2xl font-bold text-gray-900 dark:text-white">12.5%</p>
                                    </div>
                                    <div class="w-12 h-12 bg-purple-100 dark:bg-purple-900/20 rounded-lg flex items-center justify-center">
                                        <i class="fas fa-percentage text-purple-600 dark:text-purple-400"></i>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Content Cards -->
                        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div class="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                                <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Aktivitas Terbaru</h3>
                                <div class="space-y-4">
                                    <div class="flex items-center space-x-3">
                                        <div class="w-8 h-8 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center">
                                            <i class="fas fa-user-plus text-blue-600 dark:text-blue-400 text-xs"></i>
                                        </div>
                                        <div>
                                            <p class="text-sm text-gray-900 dark:text-white">Pengguna baru mendaftar</p>
                                            <p class="text-xs text-gray-500 dark:text-gray-400">2 menit yang lalu</p>
                                        </div>
                                    </div>
                                    <div class="flex items-center space-x-3">
                                        <div class="w-8 h-8 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center">
                                            <i class="fas fa-shopping-bag text-green-600 dark:text-green-400 text-xs"></i>
                                        </div>
                                        <div>
                                            <p class="text-sm text-gray-900 dark:text-white">Pesanan baru diterima</p>
                                            <p class="text-xs text-gray-500 dark:text-gray-400">5 menit yang lalu</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div class="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                                <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Tugas Hari Ini</h3>
                                <div class="space-y-3">
                                    <div class="flex items-center space-x-3">
                                        <input type="checkbox" class="w-4 h-4 text-blue-600 rounded">
                                        <span class="text-sm text-gray-900 dark:text-white">Review laporan penjualan</span>
                                    </div>
                                    <div class="flex items-center space-x-3">
                                        <input type="checkbox" class="w-4 h-4 text-blue-600 rounded" checked>
                                        <span class="text-sm text-gray-500 dark:text-gray-400 line-through">Update database pengguna</span>
                                    </div>
                                    <div class="flex items-center space-x-3">
                                        <input type="checkbox" class="w-4 h-4 text-blue-600 rounded">
                                        <span class="text-sm text-gray-900 dark:text-white">Rapat tim marketing</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </main>
            `;
        }

        // Resend OTP functionality
        document.getElementById("resend-otp").addEventListener("click", async () => {
            const resendBtn = document.getElementById("resend-otp");
            const originalText = resendBtn.textContent;
            
            resendBtn.disabled = true;
            resendBtn.textContent = "Mengirim...";
            
            // Here you would typically call your API to resend OTP
            // For now, we'll just simulate it
            setTimeout(() => {
                showMessage('otp-message', 'Kode OTP baru telah dikirim.', 'success');
                resendBtn.disabled = false;
                resendBtn.textContent = originalText;
            }, 2000);
        });

        // Dashboard Functions (only loaded after login)
        let sidebar, header, mainContent, sidebarToggle, headerToggle, darkModeToggle, sidebarTexts, sidebarToggleBtn;
        let isCollapsed = false;

        // Initialize dashboard elements after login
        function initializeDashboardElements() {
            sidebar = document.getElementById('sidebar');
            header = document.getElementById('header');
            mainContent = document.getElementById('mainContent');
            sidebarToggle = document.getElementById('sidebarToggle');
            headerToggle = document.getElementById('headerToggle');
            darkModeToggle = document.getElementById('darkModeToggle');
            sidebarTexts = document.querySelectorAll('.sidebar-text');
            sidebarToggleBtn = document.querySelector('.sidebar-toggle-btn');
            
            // Add event listeners only after login
            if (sidebarToggle) sidebarToggle.addEventListener('click', toggleSidebar);
            if (headerToggle) headerToggle.addEventListener('click', toggleSidebar);
            if (darkModeToggle) darkModeToggle.addEventListener('click', toggleDarkMode);
            
            // Add logout button event listener
            const logoutBtn = document.getElementById('logout-btn');
            if (logoutBtn) logoutBtn.addEventListener('click', logoutUser);
        }

        // Toggle sidebar function (only works after login)
        function toggleSidebar() {
            if (!sidebar || !header || !mainContent) return;
            
            const isMobile = window.innerWidth < 768;
            
            if (isMobile) {
                toggleMobileOverlay();
                return;
            }
            
            isCollapsed = !isCollapsed;
            
            if (isCollapsed) {
                // Collapse sidebar
                sidebar.classList.remove('w-64');
                sidebar.classList.add('w-16');
                
                // Adjust header - expand fully to left
                header.classList.remove('left-64');
                header.classList.add('left-0');
                
                // Adjust main content
                mainContent.classList.remove('ml-64');
                mainContent.classList.add('ml-16');
                
                // Hide sidebar texts with slide effect
                sidebarTexts.forEach(text => {
                    text.style.opacity = '0';
                    text.style.transform = 'translateX(-10px)';
                });
                if (sidebarToggleBtn) {
                    sidebarToggleBtn.style.opacity = '0';
                    sidebarToggleBtn.style.transform = 'translateX(-10px)';
                }
                
                // Hide all submenus when collapsed
                document.querySelectorAll('.submenu').forEach(submenu => {
                    submenu.classList.add('hidden');
                });
                document.querySelectorAll('[id$="-arrow"]').forEach(arrow => {
                    arrow.style.transform = 'rotate(0deg)';
                });
                
                // Hide elements after transition
                setTimeout(() => {
                    sidebarTexts.forEach(text => text.style.display = 'none');
                    if (sidebarToggleBtn) sidebarToggleBtn.style.display = 'none';
                    document.querySelectorAll('.submenu').forEach(submenu => {
                        submenu.style.display = 'none';
                    });
                }, 150);
                
                // Show header toggle, hide sidebar toggle
                if (headerToggle) headerToggle.classList.remove('hidden');
                
                // Change toggle icon
                if (sidebarToggle) sidebarToggle.innerHTML = '<i class="fas fa-angle-double-right"></i>';
            } else {
                // Expand sidebar
                sidebar.classList.remove('w-16');
                sidebar.classList.add('w-64');
                
                // Adjust header
                header.classList.remove('left-0');
                header.classList.add('left-64');
                
                // Adjust main content
                mainContent.classList.remove('ml-16');
                mainContent.classList.add('ml-64');
                
                // Show sidebar texts after sidebar width animation
                setTimeout(() => {
                    sidebarTexts.forEach(text => {
                        text.style.display = '';
                        text.style.transform = 'translateX(-10px)';
                        text.style.opacity = '0';
                        // Trigger reflow
                        text.offsetHeight;
                        text.style.opacity = '1';
                        text.style.transform = 'translateX(0)';
                    });
                    if (sidebarToggleBtn) {
                        sidebarToggleBtn.style.display = '';
                        sidebarToggleBtn.style.transform = 'translateX(-10px)';
                        sidebarToggleBtn.style.opacity = '0';
                        // Trigger reflow
                        sidebarToggleBtn.offsetHeight;
                        sidebarToggleBtn.style.opacity = '1';
                        sidebarToggleBtn.style.transform = 'translateX(0)';
                    }
                    
                    // Show submenus again
                    document.querySelectorAll('.submenu').forEach(submenu => {
                        submenu.style.display = '';
                    });
                }, 150);
                
                // Hide header toggle
                if (headerToggle) headerToggle.classList.add('hidden');
                
                // Change toggle icon
                if (sidebarToggle) sidebarToggle.innerHTML = '<i class="fas fa-angle-double-left"></i>';
            }
        }

        // Dark mode function
        function toggleDarkMode() {
            const darkModeIcon = document.getElementById('darkModeIcon');
            
            document.documentElement.classList.toggle('dark');
            const isDark = document.documentElement.classList.contains('dark');
            
            if (isDark) {
                darkModeIcon.className = 'fas fa-sun';
            } else {
                darkModeIcon.className = 'fas fa-moon';
            }
            
            localStorage.setItem('darkMode', isDark);
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

        // Submenu toggle function (only works after login)
        function toggleSubmenu(menuId, event) {
            if (!sidebar || !header || !mainContent) return;
            
            if (event) {
                event.preventDefault();
                event.stopPropagation();
            }
            
            const submenu = document.getElementById(menuId + '-submenu');
            const arrow = document.getElementById(menuId + '-arrow');
            const isMobile = window.innerWidth < 768;
            
            // If sidebar is collapsed and not on mobile, expand it first
            if (isCollapsed && !isMobile) {
                toggleSidebar();
                // Wait for sidebar animation to complete before showing submenu
                setTimeout(() => {
                    // Close all other submenus
                    closeAllSubmenus();
                    // Open the clicked submenu
                    submenu.classList.remove('hidden');
                    arrow.style.transform = 'rotate(180deg)';
                }, 150);
                return;
            }
            
            // If submenu is hidden, close all others and open this one
            if (submenu.classList.contains('hidden')) {
                // Close all other submenus
                closeAllSubmenus();
                // Open the clicked submenu
                submenu.classList.remove('hidden');
                arrow.style.transform = 'rotate(180deg)';
            } else {
                // Close the clicked submenu
                submenu.classList.add('hidden');
                arrow.style.transform = 'rotate(0deg)';
            }
        }
        
        // Function to close all submenus (only works after login)
        function closeAllSubmenus() {
            if (!sidebar) return;
            
            document.querySelectorAll('.submenu').forEach(submenu => {
                submenu.classList.add('hidden');
            });
            document.querySelectorAll('[id$="-arrow"]').forEach(arrow => {
                arrow.style.transform = 'rotate(0deg)';
            });
        }
        
        // Function to handle menu without submenu (only works after login)
        function handleMenuWithoutSubmenu(menuId) {
            if (!sidebar) return;
            
            // Prevent event bubbling to avoid closing mobile overlay
            event.stopPropagation();
            
            // If sidebar is collapsed, don't expand it for menus without submenus
            // Just handle the menu action (e.g., navigate to page)
            // Add your navigation logic here
            // For example: window.location.href = '/laporan';
            
            // On mobile, close overlay after menu selection
            const isMobile = window.innerWidth < 768;
            if (isMobile && sidebar.classList.contains('mobile-overlay-open')) {
                setTimeout(() => {
                    toggleMobileOverlay();
                }, 200);
            }
        }

        // Function to handle submenu clicks (only works after login)
        function handleSubmenuClick(event, menuId) {
            if (!sidebar) return;
            
            // Prevent event bubbling
            event.preventDefault();
            event.stopPropagation();
            
            // Handle specific menu navigation
            if (menuId === 'view-data') {
                showViewDataPage();
            }
            // Add other navigation logic here
            
            // On mobile, close overlay after submenu selection
            const isMobile = window.innerWidth < 768;
            if (isMobile && sidebar.classList.contains('mobile-overlay-open')) {
                setTimeout(() => {
                    toggleMobileOverlay();
                }, 200);
            }
        }

        // Show View Data page
        function showViewDataPage() {
            const mainContent = document.getElementById('mainContent');
            mainContent.innerHTML = `
                <div class="p-6">
                    <!-- Page Title -->
                    <div class="mb-8">
                        <h1 class="text-3xl font-bold text-gray-900 dark:text-white">View Data DTKS</h1>
                        <p class="text-gray-600 dark:text-gray-400 mt-2">Cari dan lihat data DTKS berdasarkan kriteria tertentu</p>
                    </div>

                    <!-- Search Form -->
                    <div class="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 mb-6">
                        <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Form Pencarian Data</h3>
                        
                        <!-- Search Fields Row -->
                        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                            <!-- NO KK -->
                            <div>
                                <label for="noKK" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">NO KK</label>
                                <input type="text" id="noKK" placeholder="Masukkan NO KK..." class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white">
                            </div>

                            <!-- NIK -->
                            <div>
                                <label for="nik" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">NIK</label>
                                <input type="text" id="nik" placeholder="Masukkan NIK..." class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white">
                            </div>

                            <!-- Nama Lengkap -->
                            <div>
                                <label for="namaLengkap" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Nama Lengkap</label>
                                <input type="text" id="namaLengkap" placeholder="Masukkan nama lengkap..." class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white">
                            </div>
                        </div>

                        <!-- Captcha Label -->
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Captcha</label>
                        
                        <!-- Captcha and Search Button Row -->
                        <div class="flex flex-col lg:flex-row lg:items-start lg:space-x-6 space-y-4 lg:space-y-0 mb-6">
                            <!-- Captcha Container -->
                            <div class="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg border border-gray-200 dark:border-gray-600 relative overflow-hidden max-w-sm">
                                <!-- Background Pattern -->
                                <div class="absolute inset-0 opacity-8 dark:opacity-12 pointer-events-none overflow-hidden">
                                    <div class="absolute inset-0 transform rotate-12 -translate-x-2 -translate-y-2">
                                        <div class="grid grid-cols-4 gap-4 h-full w-full text-gray-400 dark:text-gray-300 font-mono font-semibold text-sm select-none tracking-wider">
                                            <div class="flex flex-col justify-evenly h-full">
                                                <span>SONGGAJAH</span>
                                                <span>SONGGAJAH</span>
                                                <span>SONGGAJAH</span>
                                            </div>
                                            <div class="flex flex-col justify-evenly h-full mt-2">
                                                <span>SONGGAJAH</span>
                                                <span>SONGGAJAH</span>
                                                <span>SONGGAJAH</span>
                                            </div>
                                            <div class="flex flex-col justify-evenly h-full mt-4">
                                                <span>SONGGAJAH</span>
                                                <span>SONGGAJAH</span>
                                                <span>SONGGAJAH</span>
                                            </div>
                                            <div class="flex flex-col justify-evenly h-full mt-6">
                                                <span>SONGGAJAH</span>
                                                <span>SONGGAJAH</span>
                                                <span>SONGGAJAH</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <!-- Captcha -->
                                <div class="flex items-center space-x-2 relative z-10">
                                    <div class="bg-white dark:bg-gray-600 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-500 shadow-sm">
                                        <span id="captchaSoal" class="font-mono text-gray-900 dark:text-white">0 + 0</span>
                                    </div>
                                    <span class="text-gray-500">=</span>
                                    <input type="number" id="captchaInput" placeholder="?" class="w-16 px-2 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none">
                                    <button onclick="generateCaptcha()" class="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors" title="Refresh Captcha">
                                        <i class="fas fa-sync-alt text-sm"></i>
                                    </button>
                                </div>
                            </div>

                            <!-- Search Button -->
                            <div class="flex justify-center lg:justify-start lg:items-center lg:h-full">
                                <button onclick="cariData()" class="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg transition-colors flex items-center space-x-2 font-medium">
                                    <i class="fas fa-search"></i>
                                    <span>Cari Data</span>
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- Results Table -->
                    <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                        <div class="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                            <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Hasil Pencarian</h3>
                            <div id="resultCount" class="text-sm text-gray-500 dark:text-gray-400 hidden">
                                <span id="totalResults">0</span> data ditemukan
                            </div>
                        </div>
                        
                        <div class="overflow-x-auto max-h-96 overflow-y-auto">
                            <table class="w-full">
                                <thead id="tableHead" class="bg-gray-50 dark:bg-gray-700 sticky top-0">
                                    <!-- Headers will be generated dynamically -->
                                </thead>
                                <tbody id="tableBody" class="divide-y divide-gray-200 dark:divide-gray-600">
                                    <tr>
                                        <td colspan="10" class="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                                            <i class="fas fa-search text-4xl mb-2"></i>
                                            <p>Masukkan kata kunci dan klik "Cari Data" untuk melihat hasil</p>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                        
                        <!-- Pagination -->
                        <div id="pagination" class="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center hidden">
                            <div class="text-sm text-gray-500 dark:text-gray-400">
                                Menampilkan <span id="showingStart">1</span>-<span id="showingEnd">10</span> dari <span id="showingTotal">0</span> data
                            </div>
                            <div class="flex space-x-2">
                                <button id="prevBtn" onclick="changePage(-1)" class="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed">
                                    <i class="fas fa-chevron-left"></i> Sebelumnya
                                </button>
                                <button id="nextBtn" onclick="changePage(1)" class="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed">
                                    Selanjutnya <i class="fas fa-chevron-right"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            // Initialize captcha after page is loaded
            setTimeout(() => {
                generateCaptcha();
            }, 100);
        }

        // Global variables for View Data functionality
        const API_URL = "https://natural.bulshitman1.workers.dev/";
        let captchaAnswer = null;
        let allData = [];
        let currentPage = 1;
        const itemsPerPage = 5;

        // View Data Functions (only loaded when needed)
        function generateCaptcha() {
            const a = Math.floor(Math.random() * 10) + 1;
            const b = Math.floor(Math.random() * 10) + 1;
            const isPlus = Math.random() > 0.5;
            const soal = isPlus ? `${a} + ${b}` : `${a} - ${b}`;
            captchaAnswer = isPlus ? a + b : a - b;

            const captchaSoalElement = document.getElementById("captchaSoal");
            const captchaInputElement = document.getElementById("captchaInput");
            
            if (captchaSoalElement) captchaSoalElement.textContent = soal;
            if (captchaInputElement) captchaInputElement.value = "";
        }

        async function cariData() {
            const noKK = document.getElementById("noKK")?.value.trim();
            const nik = document.getElementById("nik")?.value.trim();
            const namaLengkap = document.getElementById("namaLengkap")?.value.trim();
            const captcha = document.getElementById("captchaInput")?.value.trim();

            if (!noKK && !nik && !namaLengkap) {
                alert("Masukkan minimal satu kriteria pencarian!");
                return;
            }

            if (!captcha || parseInt(captcha) !== captchaAnswer) {
                alert("Captcha salah, coba lagi.");
                generateCaptcha();
                return;
            }

            const tableBody = document.getElementById("tableBody");
            if (tableBody) {
                tableBody.innerHTML = `
                    <tr><td colspan="10" class="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                        <i class="fas fa-spinner fa-spin text-2xl mb-2"></i><p>Mencari data...</p>
                    </td></tr>`;
            }

            try {
                const searchData = { action: "cari", noKK, nik, namaLengkap };
                if (noKK) { searchData.tipe = "nokk"; searchData.keyword = noKK; }
                else if (nik) { searchData.tipe = "nik"; searchData.keyword = nik; }
                else if (namaLengkap) { searchData.tipe = "nama"; searchData.keyword = namaLengkap; }

                const res = await fetch(API_URL, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(searchData)
                });

                if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
                
                const result = await res.json();
                let processedResult = result;
                if (result?.data && Array.isArray(result.data)) {
                    processedResult = { ...result, data: result.data.slice(0, 50) };
                } else if (Array.isArray(result)) {
                    processedResult = result.slice(0, 50);
                }
                
                tampilkanData(processedResult);
                generateCaptcha();
            } catch (err) {
                alert("Gagal mengambil data: " + err.message);
                generateCaptcha();
                if (tableBody) {
                    tableBody.innerHTML = `
                        <tr><td colspan="10" class="px-6 py-8 text-center text-red-500 dark:text-red-400">
                            <i class="fas fa-exclamation-triangle text-2xl mb-2"></i>
                            <p>Gagal mengambil data. Silakan coba lagi.</p>
                        </td></tr>`;
                }
            }
        }

        function tampilkanData(result) {
            const tableHead = document.getElementById("tableHead");
            const tableBody = document.getElementById("tableBody");
            const resultCount = document.getElementById("resultCount");
            const totalResults = document.getElementById("totalResults");
            const pagination = document.getElementById("pagination");
            
            if (!tableHead || !tableBody) return;
            
            tableHead.innerHTML = "";
            tableBody.innerHTML = "";

            let data = Array.isArray(result) ? result : result.data;
            allData = data || [];
            currentPage = 1;

            if (!data || data.length === 0) {
                tableBody.innerHTML = `
                    <tr><td colspan="8" class="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                        <i class="fas fa-inbox text-4xl mb-2"></i><p>Data tidak ditemukan</p>
                    </td></tr>`;
                resultCount.classList.add('hidden');
                pagination.classList.add('hidden');
                return;
            }

            totalResults.textContent = data.length;
            resultCount.classList.remove('hidden');

            const importantColumns = [
                'NO_KK', 'nokk', 'no_kk', 'noKK', 'NIK', 'nik', 
                'NAMA_LENGKAP', 'nama_lengkap', 'nama', 'NAMA',
                'TEMPAT_LAHIR', 'tempat_lahir', 'tmpt_lahir', 'TMPT_LAHIR', 'tempatlahir', 'TEMPATLAHIR',
                'TANGGAL_LAHIR', 'tanggal_lahir', 'tgl_lahir', 'TGL_LAHIR', 'tgllahir', 'TGLLAHIR', 'tanggallahir', 'TANGGALLAHIR',
                'ALAMAT', 'alamat', 
                'DESA', 'desa', 'kelurahan', 'KELURAHAN',
                'DUSUN', 'dusun'
            ];
            
            // Kolom khusus untuk STATUS KK dengan berbagai variasi nama
            const statusKKColumns = [
                'STATUS_KK', 'status_kk', 'statusKK', 'SHDK', 'shdk',
                'STATUS_DALAM_KELUARGA', 'status_dalam_keluarga', 
                'HUBUNGAN_KELUARGA', 'hubungan_keluarga',
                'HUBUNGAN', 'hubungan', 'STATUS', 'status',
                'KEDUDUKAN', 'kedudukan', 'POSISI', 'posisi',
                'HUBUNGAN_DLM_KELUARGA', 'hubungan_dlm_keluarga'
            ];
            
            const allHeaders = data.length > 0 ? Object.keys(data[0]) : [];
            
            const displayHeaders = [];
            
            // Cari kolom penting terlebih dahulu
            importantColumns.forEach(col => {
                const foundHeader = allHeaders.find(h => 
                    h.toLowerCase() === col.toLowerCase() || 
                    h.toLowerCase().includes(col.toLowerCase()) ||
                    col.toLowerCase().includes(h.toLowerCase())
                );
                if (foundHeader && !displayHeaders.includes(foundHeader)) {
                    displayHeaders.push(foundHeader);
                }
            });
            
            // Cari kolom tempat lahir dengan pattern yang lebih luas
            if (!displayHeaders.some(h => h.toLowerCase().includes('tempat') && h.toLowerCase().includes('lahir'))) {
                const tempatLahirHeader = allHeaders.find(h => 
                    h.toLowerCase().includes('tempat') || 
                    h.toLowerCase().includes('tmpt') ||
                    h.toLowerCase().includes('lahir') && !h.toLowerCase().includes('tanggal') && !h.toLowerCase().includes('tgl')
                );
                if (tempatLahirHeader && !displayHeaders.includes(tempatLahirHeader)) {
                    displayHeaders.push(tempatLahirHeader);
                }
            }
            
            // Cari kolom tanggal lahir dengan pattern yang lebih luas
            if (!displayHeaders.some(h => h.toLowerCase().includes('tanggal') && h.toLowerCase().includes('lahir'))) {
                const tanggalLahirHeader = allHeaders.find(h => 
                    (h.toLowerCase().includes('tanggal') && h.toLowerCase().includes('lahir')) ||
                    (h.toLowerCase().includes('tgl') && h.toLowerCase().includes('lahir')) ||
                    h.toLowerCase() === 'tgllahir' ||
                    h.toLowerCase() === 'tanggallahir'
                );
                if (tanggalLahirHeader && !displayHeaders.includes(tanggalLahirHeader)) {
                    displayHeaders.push(tanggalLahirHeader);
                }
            }
            
            // Cari kolom STATUS KK dengan prioritas tinggi
            let statusKKFound = null;
            statusKKColumns.forEach(col => {
                if (!statusKKFound) {
                    const foundHeader = allHeaders.find(h => 
                        h.toLowerCase() === col.toLowerCase() || 
                        h.toLowerCase().includes(col.toLowerCase()) ||
                        col.toLowerCase().includes(h.toLowerCase()) ||
                        (h.toLowerCase().includes('status') && h.toLowerCase().includes('kk')) ||
                        (h.toLowerCase().includes('hubungan') && h.toLowerCase().includes('keluarga')) ||
                        h.toLowerCase() === 'shdk'
                    );
                    if (foundHeader && !displayHeaders.includes(foundHeader)) {
                        statusKKFound = foundHeader;
                        displayHeaders.push(foundHeader);
                    }
                }
            });
            
            // Jika belum ada STATUS KK, cari dengan pattern yang lebih luas
            if (!statusKKFound) {
                const possibleStatusKK = allHeaders.find(h => 
                    h.toLowerCase().includes('status') ||
                    h.toLowerCase().includes('hubungan') ||
                    h.toLowerCase().includes('shdk') ||
                    h.toLowerCase().includes('kedudukan') ||
                    h.toLowerCase().includes('posisi')
                );
                if (possibleStatusKK && !displayHeaders.includes(possibleStatusKK)) {
                    displayHeaders.push(possibleStatusKK);
                }
            }
            
            if (displayHeaders.length === 0) {
                displayHeaders.push(...allHeaders.slice(0, 8));
            } else if (displayHeaders.length > 8) {
                displayHeaders.splice(8);
            }
            
            const headerRow = document.createElement("tr");
            displayHeaders.forEach(header => {
                const th = document.createElement("th");
                th.className = "px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider";
                
                let displayName = header;
                if (header.toLowerCase().includes('kk') && !header.toLowerCase().includes('status')) displayName = 'NO KK';
                else if (header.toLowerCase() === 'nik') displayName = 'NIK';
                else if (header.toLowerCase().includes('nama')) displayName = 'NAMA LENGKAP';
                else if (header.toLowerCase().includes('alamat')) displayName = 'ALAMAT';
                else if (header.toLowerCase().includes('tempat') && header.toLowerCase().includes('lahir')) displayName = 'TEMPAT LAHIR';
                else if (header.toLowerCase().includes('tmpt') && header.toLowerCase().includes('lahir')) displayName = 'TEMPAT LAHIR';
                else if (header.toLowerCase().includes('tanggal') && header.toLowerCase().includes('lahir')) displayName = 'TANGGAL LAHIR';
                else if (header.toLowerCase().includes('tgl') && header.toLowerCase().includes('lahir')) displayName = 'TANGGAL LAHIR';
                else if (header.toLowerCase() === 'tgllahir') displayName = 'TANGGAL LAHIR';
                else if (header.toLowerCase().includes('desa') || header.toLowerCase().includes('kelurahan')) displayName = 'DESA/KELURAHAN';
                else if (header.toLowerCase().includes('dusun')) displayName = 'DUSUN';
                else if (header.toLowerCase().includes('status') || header.toLowerCase() === 'shdk' || 
                         header.toLowerCase().includes('hubungan') || header.toLowerCase().includes('dalam_keluarga')) displayName = 'STATUS KK';
                else displayName = header.replace(/_/g, ' ').toUpperCase();
                
                th.textContent = displayName;
                headerRow.appendChild(th);
            });
            tableHead.appendChild(headerRow);

            window.currentDisplayHeaders = displayHeaders;
            displayPage(1);
            
            if (data.length > itemsPerPage) {
                pagination.classList.remove('hidden');
                updatePaginationInfo();
            } else {
                pagination.classList.add('hidden');
            }
        }

        function displayPage(page) {
            const tableBody = document.getElementById("tableBody");
            if (!allData || allData.length === 0) return;
            
            const headers = window.currentDisplayHeaders || Object.keys(allData[0]).slice(0, 8);
            tableBody.innerHTML = "";
            
            const startIndex = (page - 1) * itemsPerPage;
            const endIndex = Math.min(startIndex + itemsPerPage, allData.length);
            const pageData = allData.slice(startIndex, endIndex);

            pageData.forEach((row, index) => {
                const tr = document.createElement("tr");
                tr.className = index % 2 === 0 ? "bg-white dark:bg-gray-800" : "bg-gray-50 dark:bg-gray-700";
                
                headers.forEach(header => {
                    const td = document.createElement("td");
                    td.className = "px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100";
                    
                    let cellValue = row[header] ?? "-";
                    if (typeof cellValue === 'string' && cellValue.length > 30) {
                        td.title = cellValue;
                        cellValue = cellValue.substring(0, 30) + '...';
                    }
                    
                    td.textContent = cellValue;
                    tr.appendChild(td);
                });
                tableBody.appendChild(tr);
            });
        }

        function changePage(direction) {
            const totalPages = Math.ceil(allData.length / itemsPerPage);
            const newPage = currentPage + direction;
            
            if (newPage >= 1 && newPage <= totalPages) {
                currentPage = newPage;
                displayPage(currentPage);
                updatePaginationInfo();
            }
        }

        function updatePaginationInfo() {
            const showingStart = document.getElementById("showingStart");
            const showingEnd = document.getElementById("showingEnd");
            const showingTotal = document.getElementById("showingTotal");
            const prevBtn = document.getElementById("prevBtn");
            const nextBtn = document.getElementById("nextBtn");
            
            const totalPages = Math.ceil(allData.length / itemsPerPage);
            const startIndex = (currentPage - 1) * itemsPerPage + 1;
            const endIndex = Math.min(currentPage * itemsPerPage, allData.length);
            
            showingStart.textContent = startIndex;
            showingEnd.textContent = endIndex;
            showingTotal.textContent = allData.length;
            
            prevBtn.disabled = currentPage === 1;
            nextBtn.disabled = currentPage === totalPages;
            
            prevBtn.classList.toggle('opacity-50', prevBtn.disabled);
            prevBtn.classList.toggle('cursor-not-allowed', prevBtn.disabled);
            nextBtn.classList.toggle('opacity-50', nextBtn.disabled);
            nextBtn.classList.toggle('cursor-not-allowed', nextBtn.disabled);
        }

        // Login page dark mode toggle
        const darkModeToggleLogin = document.getElementById('darkModeToggleLogin');
        if (darkModeToggleLogin) {
            darkModeToggleLogin.addEventListener('click', toggleDarkModeLogin);
        }

        // Initialize dark mode from localStorage
        function initializeDarkMode() {
            const darkModeIcon = document.getElementById('darkModeIcon');
            const darkModeIconLogin = document.getElementById('darkModeIconLogin');
            
            if (localStorage.getItem('darkMode') === 'true') {
                document.documentElement.classList.add('dark');
                if (darkModeIcon) darkModeIcon.className = 'fas fa-sun';
                if (darkModeIconLogin) darkModeIconLogin.className = 'fas fa-sun';
            } else {
                if (darkModeIcon) darkModeIcon.className = 'fas fa-moon';
                if (darkModeIconLogin) darkModeIconLogin.className = 'fas fa-moon';
            }
        }
        
        // Initialize desktop layout properly (only after login)
        function initializeLayout() {
            if (!sidebar || !header || !mainContent) return;
            
            const isMobile = window.innerWidth < 768;
            
            if (!isMobile) {
                // Ensure desktop starts in proper expanded state
                isCollapsed = false;
                
                // Set proper desktop classes
                sidebar.classList.remove('w-16');
                sidebar.classList.add('w-64');
                header.classList.remove('left-0');
                header.classList.add('left-64');
                mainContent.classList.remove('ml-0', 'ml-16');
                mainContent.classList.add('ml-64');
                
                // Ensure sidebar is visible
                sidebar.style.transform = 'translateX(0)';
                
                // Hide mobile toggle, show desktop toggle
                if (headerToggle) headerToggle.classList.add('hidden');
                
                // Ensure all text is visible
                sidebarTexts.forEach(text => {
                    text.style.display = '';
                    text.style.opacity = '1';
                    text.style.transform = 'translateX(0)';
                    text.style.visibility = 'visible';
                });
                
                if (sidebarToggleBtn) {
                    sidebarToggleBtn.style.display = '';
                    sidebarToggleBtn.style.opacity = '1';
                    sidebarToggleBtn.style.transform = 'translateX(0)';
                }
                
                // Reset submenu display
                document.querySelectorAll('.submenu').forEach(submenu => {
                    submenu.style.display = '';
                });
            } else {
                handleMobileLayout();
            }
        }

        // Handle mobile layout (only after login)
        function handleMobileLayout() {
            if (!sidebar || !header || !mainContent) return;
            
            isCollapsed = true;
            
            // Reset sidebar classes for mobile
            sidebar.classList.remove('w-64', 'w-16');
            sidebar.classList.add('w-16');
            
            // Hide sidebar completely on mobile
            sidebar.style.transform = 'translateX(-100%)';
            
            // Set header and content to full width on mobile
            header.classList.remove('left-64');
            header.classList.add('left-0');
            mainContent.classList.remove('ml-16', 'ml-64');
            mainContent.classList.add('ml-0');
            if (headerToggle) headerToggle.classList.remove('hidden');
        }

        // Handle responsive behavior (only after login)
        function handleResize() {
            if (!sidebar || !header || !mainContent) return;
            
            const isMobile = window.innerWidth < 768;
            const isOverlayOpen = sidebar.classList.contains('mobile-overlay-open');
            
            if (isMobile) {
                handleMobileLayout();
            } else {
                // On desktop, close mobile overlay if open and reset everything
                if (isOverlayOpen) {
                    sidebar.classList.remove('mobile-overlay-open');
                    document.body.style.overflow = '';
                }
                
                // Show sidebar normally on desktop
                sidebar.style.transform = 'translateX(0)';
                
                // Force reset to expanded state when switching from mobile to desktop
                isCollapsed = false;
                
                // Reset to expanded desktop state
                sidebar.classList.remove('w-16');
                sidebar.classList.add('w-64');
                header.classList.remove('left-0');
                header.classList.add('left-64');
                mainContent.classList.remove('ml-0', 'ml-16');
                mainContent.classList.add('ml-64');
                if (headerToggle) headerToggle.classList.add('hidden');
                
                // Reset sidebar toggle icon
                if (sidebarToggle) sidebarToggle.innerHTML = '<i class="fas fa-angle-double-left"></i>';
                
                // Reset text visibility for desktop expanded state
                sidebarTexts.forEach(text => {
                    text.style.display = '';
                    text.style.opacity = '1';
                    text.style.transform = 'translateX(0)';
                    text.style.visibility = 'visible';
                });
                
                if (sidebarToggleBtn) {
                    sidebarToggleBtn.style.display = '';
                    sidebarToggleBtn.style.opacity = '1';
                    sidebarToggleBtn.style.transform = 'translateX(0)';
                }
                
                // Reset submenu display
                document.querySelectorAll('.submenu').forEach(submenu => {
                    submenu.style.display = '';
                });
            }
        }

        // Mobile overlay toggle (only after login)
        function toggleMobileOverlay() {
            if (!sidebar) return;
            
            const isMobile = window.innerWidth < 768;
            
            if (isMobile) {
                const isOverlayOpen = sidebar.classList.contains('mobile-overlay-open');
                
                if (isOverlayOpen) {
                    // Close overlay
                    sidebar.classList.remove('mobile-overlay-open');
                    document.body.style.overflow = '';
                } else {
                    // Open overlay - reset any collapsed state first
                    sidebar.classList.remove('w-16');
                    sidebar.classList.add('w-64');
                    
                    // Show all text elements
                    sidebarTexts.forEach(text => {
                        text.style.display = '';
                        text.style.opacity = '1';
                        text.style.transform = 'translateX(0)';
                        text.style.visibility = 'visible';
                    });
                    
                    // Reset submenu display but keep hidden state
                    document.querySelectorAll('.submenu').forEach(submenu => {
                        submenu.style.display = '';
                        // Keep the hidden class if it exists
                    });
                    
                    sidebar.classList.add('mobile-overlay-open');
                    document.body.style.overflow = 'hidden';
                }
            }
        }

        // Initialize dark mode on page load
        document.addEventListener('DOMContentLoaded', initializeDarkMode);

        // =======================
        // INIT LISTENER
        // =======================
        document.addEventListener("DOMContentLoaded", () => {
            const loginForm = document.getElementById("loginForm");
            const otpForm = document.getElementById("otpForm");
            const logoutBtn = document.getElementById("logout-btn");

            if (loginForm) loginForm.addEventListener("submit", loginUser);
            if (otpForm) otpForm.addEventListener("submit", verifyOtp);
            if (logoutBtn) logoutBtn.addEventListener("click", logoutUser);

            // Initialize OTP inputs
            setupOTPInputs();
            
            // Auto-focus on NIK input when login page is shown
            const nikInput = document.getElementById('nik');
            if (nikInput && !document.getElementById('login-step').classList.contains('hidden')) {
                nikInput.focus();
            }
            
            // NIK input formatting (only numbers, max 16 digits)
            if (nikInput) {
                nikInput.addEventListener('input', function(e) {
                    let value = e.target.value.replace(/\D/g, ''); // Remove non-digits
                    if (value.length > 16) {
                        value = value.slice(0, 16); // Limit to 16 digits
                    }
                    e.target.value = value;
                });
            }

            // Validate session on page load
            validateSession();
        });
