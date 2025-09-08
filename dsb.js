

// ===== DASHBOARD SYSTEM =====
let isCollapsed = false;

// ===== DASHBOARD FUNCTIONS =====
function loadDashboard(user) {
    const loginContainer = document.getElementById('loginContainer');
    const dashboardContainer = document.getElementById('dashboardContainer');
    
    // Clear all OTP-related timers when entering dashboard
    if (typeof resendTimer !== 'undefined' && resendTimer) {
        clearInterval(resendTimer);
        resendTimer = null;
    }
    if (typeof otpExpiryTimer !== 'undefined' && otpExpiryTimer) {
        clearInterval(otpExpiryTimer);
        otpExpiryTimer = null;
    }
    
    if (loginContainer) loginContainer.classList.add('hidden');
    if (dashboardContainer) dashboardContainer.classList.remove('hidden');
    
    localStorage.setItem('isLoggedIn', 'true');
    if (typeof currentUser !== 'undefined') {
        currentUser = user;
    }
    
    // Update user info in dashboard
    updateUserInfo(user);
    
    // Initialize sidebar components
    initializeSidebarComponents();
    
    // Initialize dashboard dark mode
    initializeDashboardDarkMode();
}

function updateUserInfo(user) {
    const userName = user?.Username || user?.name || user?.nama || 'User';
    const userRole = user?.Role || user?.role || user?.jabatan || 'Member';
    const avatarUrl = user?.ProfilAvatar || null;
    
    // Update all user name elements
    const userNameElements = [
        'userNameSidebar',
        'userNameMobile', 
        'userNameWelcome'
    ];
    
    userNameElements.forEach(id => {
        const element = document.getElementById(id);
        if (element) element.textContent = userName;
    });
    
    // Update role elements
    const userRoleElements = [
        'userRoleSidebar',
        'userRoleMobile'
    ];
    
    userRoleElements.forEach(id => {
        const element = document.getElementById(id);
        if (element) element.textContent = userRole;
    });
    
    // Update profile images
    const profileImageElements = [
        'sidebarProfileImage',
        'mobileProfileImage'
    ];
    
    profileImageElements.forEach(id => {
        const element = document.getElementById(id);
        if (element && avatarUrl) {
            // Use the proxy service for avatar images
            const proxyAvatarUrl = `https://test.bulshitman1.workers.dev/avatar?url=${encodeURIComponent(avatarUrl)}`;
            element.innerHTML = `<img src="${proxyAvatarUrl}" alt="Profile" class="w-full h-full rounded-full object-cover" onerror="this.style.display='none'; this.parentElement.innerHTML='<i class=\\"fas fa-user text-white text-sm\\"></i>';">`;
        } else if (element) {
            // Keep default icon if no avatar URL
            element.innerHTML = '<i class="fas fa-user text-white text-sm"></i>';
        }
    });
}

function initializeSidebarComponents() {
    // Sidebar elements
    const sidebar = document.getElementById('sidebar');
    const header = document.getElementById('header');
    const sidebarToggleDesktop = document.getElementById('sidebarToggleDesktop');
    const sidebarToggleMobile = document.getElementById('sidebarToggleMobile');
    const mobileOverlay = document.getElementById('mobileOverlay');
    const closeMobileMenuBtn = document.getElementById('closeMobileMenu');
    const logoText = document.getElementById('logoText');
    const sidebarTexts = document.querySelectorAll('.sidebar-text');
    
    // Get header toggle button reference
    const sidebarToggleHeader = document.getElementById('sidebarToggleHeader');
    
    // Set initial state - hide header toggle when sidebar is expanded
    if (sidebarToggleHeader) {
        sidebarToggleHeader.style.display = 'none';
    }

    // Sidebar toggle function
    function toggleSidebar() {
        isCollapsed = !isCollapsed;
        
        if (isCollapsed) {
            sidebar.classList.remove('w-64');
            sidebar.classList.add('w-16');
            logoText.classList.add('opacity-0', 'hidden');
            sidebarTexts.forEach(text => text.classList.add('hidden'));
            sidebarToggleDesktop.innerHTML = '<i class="fas fa-chevron-right text-sm"></i>';
            if (sidebarToggleHeader) {
                sidebarToggleHeader.style.display = 'block';
            }
            header.style.marginLeft = '-4rem';
            header.style.zIndex = '30';
            closeAllSubmenus();
            
            // Hide dropdown arrows when collapsed
            const dropdownArrows = document.querySelectorAll('#dtks-arrow, #usulan-arrow, #unduh-arrow, #dusun-arrow');
            dropdownArrows.forEach(arrow => {
                if (arrow) arrow.style.display = 'none';
            });
        } else {
            sidebar.classList.remove('w-16');
            sidebar.classList.add('w-64');
            setTimeout(() => {
                logoText.classList.remove('opacity-0', 'hidden');
                sidebarTexts.forEach(text => text.classList.remove('hidden'));
                
                // Show dropdown arrows when expanded
                const dropdownArrows = document.querySelectorAll('#dtks-arrow, #usulan-arrow, #unduh-arrow, #dusun-arrow');
                dropdownArrows.forEach(arrow => {
                    if (arrow) arrow.style.display = 'block';
                });
            }, 150);
            sidebarToggleDesktop.innerHTML = '<i class="fas fa-chevron-left text-sm"></i>';
            if (sidebarToggleHeader) {
                sidebarToggleHeader.style.display = 'none';
            }
            header.style.marginLeft = '0';
            header.style.zIndex = '20';
        }
    }

    // Desktop sidebar toggle (from sidebar)
    if (sidebarToggleDesktop) {
        sidebarToggleDesktop.addEventListener('click', toggleSidebar);
    }

    // Header sidebar toggle (from header)
    if (sidebarToggleHeader) {
        sidebarToggleHeader.addEventListener('click', toggleSidebar);
    }

    // Mobile menu toggle
    if (sidebarToggleMobile) {
        sidebarToggleMobile.addEventListener('click', function() {
            mobileOverlay.classList.remove('hidden');
            document.body.style.overflow = 'hidden';
        });
    }

    // Close mobile menu
    if (closeMobileMenuBtn) {
        closeMobileMenuBtn.addEventListener('click', function() {
            mobileOverlay.classList.add('hidden');
            document.body.style.overflow = 'auto';
        });
    }

    // Close mobile menu when clicking overlay
    if (mobileOverlay) {
        mobileOverlay.addEventListener('click', function(e) {
            if (e.target === mobileOverlay) {
                mobileOverlay.classList.add('hidden');
                document.body.style.overflow = 'auto';
            }
        });
    }

    // Handle responsive behavior
    function handleResize() {
        const isMobile = window.innerWidth < 768;
        
        if (!isMobile && mobileOverlay) {
            mobileOverlay.classList.add('hidden');
            document.body.style.overflow = 'auto';
        }
    }

    window.addEventListener('resize', handleResize);
}

function toggleSubmenu(menuId) {
    const submenu = document.getElementById(menuId + '-submenu');
    const arrow = document.getElementById(menuId + '-arrow');
    
    if (submenu && arrow) {
        if (submenu.classList.contains('hidden')) {
            submenu.classList.remove('hidden');
            arrow.classList.add('rotate-180');
        } else {
            submenu.classList.add('hidden');
            arrow.classList.remove('rotate-180');
        }
    }
}

function closeAllSubmenus() {
    const allSubmenus = ['dtks', 'usulan', 'unduh', 'dusun'];
    allSubmenus.forEach(menuId => {
        const submenu = document.getElementById(menuId + '-submenu');
        const arrow = document.getElementById(menuId + '-arrow');
        if (submenu && arrow) {
            submenu.classList.add('hidden');
            arrow.classList.remove('rotate-180');
        }
    });
}

function handleMenuClick(menuId) {
    if (isCollapsed) {
        // Expand sidebar first, then open submenu
        const sidebarToggleDesktop = document.getElementById('sidebarToggleDesktop');
        if (sidebarToggleDesktop) {
            sidebarToggleDesktop.click();
            setTimeout(() => {
                closeAllSubmenus();
                toggleSubmenu(menuId);
            }, 300);
        }
    } else {
        const currentSubmenu = document.getElementById(menuId + '-submenu');
        const isCurrentOpen = currentSubmenu && !currentSubmenu.classList.contains('hidden');
        
        closeAllSubmenus();
        
        if (!isCurrentOpen) {
            toggleSubmenu(menuId);
        }
    }
}

function initializeDashboardDarkMode() {
    const dashboardDarkModeToggle = document.getElementById('dashboardDarkModeToggle');
    
    // Check saved theme preference
    const savedTheme = localStorage.getItem('theme') || 'light';
    
    if (savedTheme === 'dark') {
        document.documentElement.classList.add('dark');
        updateDashboardDarkModeIcons(true);
    }

    function toggleDarkMode() {
        const isDark = document.documentElement.classList.toggle('dark');
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
        updateDashboardDarkModeIcons(isDark);
    }

    if (dashboardDarkModeToggle) {
        dashboardDarkModeToggle.addEventListener('click', toggleDarkMode);
    }
}

function updateDashboardDarkModeIcons(isDark) {
    // Dashboard icons
    const dashboardMoonIcon = document.getElementById('dashboardMoonIcon');
    const dashboardSunIcon = document.getElementById('dashboardSunIcon');
    
    if (dashboardMoonIcon && dashboardSunIcon) {
        dashboardMoonIcon.style.display = isDark ? 'none' : 'block';
        dashboardSunIcon.style.display = isDark ? 'block' : 'none';
    }
}

console.log('Dashboard System Initialized');
