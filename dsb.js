// Global variables
let sidebarCollapsed = false;
let currentUser = null;

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    initializeDashboard();
});

// Initialize dashboard functionality
function initializeDashboard() {
    // Set up event listeners
    setupEventListeners();
    
    // Initialize dark mode
    initializeDarkMode();
    
    // Load user data if available
    loadUserData();
    
    // Initialize sidebar state
    initializeSidebar();
}

// Setup all event listeners
function setupEventListeners() {
    // Sidebar toggle buttons
    const sidebarToggleDesktop = document.getElementById('sidebarToggleDesktop');
    const sidebarToggleHeader = document.getElementById('sidebarToggleHeader');
    const sidebarToggleMobile = document.getElementById('sidebarToggleMobile');
    const closeMobileMenu = document.getElementById('closeMobileMenu');
    
    if (sidebarToggleDesktop) {
        sidebarToggleDesktop.addEventListener('click', toggleSidebar);
    }
    
    if (sidebarToggleHeader) {
        sidebarToggleHeader.addEventListener('click', toggleSidebar);
    }
    
    if (sidebarToggleMobile) {
        sidebarToggleMobile.addEventListener('click', toggleMobileMenu);
    }
    
    if (closeMobileMenu) {
        closeMobileMenu.addEventListener('click', closeMobileMenuHandler);
    }
    
    // Dark mode toggle
    const dashboardDarkModeToggle = document.getElementById('dashboardDarkModeToggle');
    if (dashboardDarkModeToggle) {
        dashboardDarkModeToggle.addEventListener('click', toggleDarkMode);
    }
    
    // Close mobile menu when clicking outside
    const mobileOverlay = document.getElementById('mobileOverlay');
    if (mobileOverlay) {
        mobileOverlay.addEventListener('click', function(e) {
            if (e.target === mobileOverlay) {
                closeMobileMenuHandler();
            }
        });
    }
    
    // Handle window resize
    window.addEventListener('resize', handleWindowResize);
}

// Initialize dark mode
function initializeDarkMode() {
    const isDarkMode = localStorage.getItem('darkMode') === 'true';
    const html = document.documentElement;
    const dashboardMoonIcon = document.getElementById('dashboardMoonIcon');
    const dashboardSunIcon = document.getElementById('dashboardSunIcon');
    
    if (isDarkMode) {
        html.classList.add('dark');
        if (dashboardMoonIcon) dashboardMoonIcon.style.display = 'none';
        if (dashboardSunIcon) dashboardSunIcon.style.display = 'inline';
    } else {
        html.classList.remove('dark');
        if (dashboardMoonIcon) dashboardMoonIcon.style.display = 'inline';
        if (dashboardSunIcon) dashboardSunIcon.style.display = 'none';
    }
}

// Toggle dark mode
function toggleDarkMode() {
    const html = document.documentElement;
    const isDarkMode = html.classList.contains('dark');
    const dashboardMoonIcon = document.getElementById('dashboardMoonIcon');
    const dashboardSunIcon = document.getElementById('dashboardSunIcon');
    
    if (isDarkMode) {
        html.classList.remove('dark');
        localStorage.setItem('darkMode', 'false');
        if (dashboardMoonIcon) dashboardMoonIcon.style.display = 'inline';
        if (dashboardSunIcon) dashboardSunIcon.style.display = 'none';
    } else {
        html.classList.add('dark');
        localStorage.setItem('darkMode', 'true');
        if (dashboardMoonIcon) dashboardMoonIcon.style.display = 'none';
        if (dashboardSunIcon) dashboardSunIcon.style.display = 'inline';
    }
}

// Load user data
function loadUserData() {
    // Get user data from localStorage or session
    const userData = JSON.parse(localStorage.getItem('userData') || '{}');
    currentUser = userData;
    
    // Update user display elements
    updateUserDisplay(userData);
}

// Update user display elements
function updateUserDisplay(userData) {
    const userName = userData.name || 'User';
    const userRole = userData.role || 'Member';
    
    // Update all user name elements
    const userNameElements = [
        'userNameSidebar',
        'userNameMobile', 
        'userNameWelcome'
    ];
    
    userNameElements.forEach(elementId => {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = userName;
        }
    });
    
    // Update user role elements
    const userRoleElements = [
        'userRoleSidebar',
        'userRoleMobile'
    ];
    
    userRoleElements.forEach(elementId => {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = userRole;
        }
    });
    
    // Update profile images if user has avatar
    if (userData.avatar) {
        updateProfileImages(userData.avatar);
    }
}

// Update profile images
function updateProfileImages(avatarUrl) {
    const profileElements = [
        'sidebarProfileImage',
        'mobileProfileImage'
    ];
    
    profileElements.forEach(elementId => {
        const element = document.getElementById(elementId);
        if (element) {
            element.innerHTML = `<img src="${avatarUrl}" alt="Profile" class="w-full h-full object-cover rounded-full">`;
        }
    });
}

// Initialize sidebar
function initializeSidebar() {
    const savedState = localStorage.getItem('sidebarCollapsed');
    if (savedState === 'true') {
        collapseSidebar();
    }
}

// Toggle sidebar
function toggleSidebar() {
    if (sidebarCollapsed) {
        expandSidebar();
    } else {
        collapseSidebar();
    }
}

// Collapse sidebar
function collapseSidebar() {
    const sidebar = document.getElementById('sidebar');
    const logoText = document.getElementById('logoText');
    const sidebarTexts = document.querySelectorAll('.sidebar-text');
    const toggleIcon = document.querySelector('#sidebarToggleDesktop i');
    
    if (sidebar) {
        sidebar.classList.remove('w-64');
        sidebar.classList.add('w-16');
    }
    
    if (logoText) {
        logoText.style.opacity = '0';
        setTimeout(() => {
            logoText.style.display = 'none';
        }, 150);
    }
    
    sidebarTexts.forEach(text => {
        text.style.opacity = '0';
        setTimeout(() => {
            text.style.display = 'none';
        }, 150);
    });
    
    if (toggleIcon) {
        toggleIcon.classList.remove('fa-chevron-left');
        toggleIcon.classList.add('fa-chevron-right');
    }
    
    sidebarCollapsed = true;
    localStorage.setItem('sidebarCollapsed', 'true');
}

// Expand sidebar
function expandSidebar() {
    const sidebar = document.getElementById('sidebar');
    const logoText = document.getElementById('logoText');
    const sidebarTexts = document.querySelectorAll('.sidebar-text');
    const toggleIcon = document.querySelector('#sidebarToggleDesktop i');
    
    if (sidebar) {
        sidebar.classList.remove('w-16');
        sidebar.classList.add('w-64');
    }
    
    setTimeout(() => {
        if (logoText) {
            logoText.style.display = 'block';
            setTimeout(() => {
                logoText.style.opacity = '1';
            }, 50);
        }
        
        sidebarTexts.forEach(text => {
            text.style.display = 'block';
            setTimeout(() => {
                text.style.opacity = '1';
            }, 50);
        });
    }, 150);
    
    if (toggleIcon) {
        toggleIcon.classList.remove('fa-chevron-right');
        toggleIcon.classList.add('fa-chevron-left');
    }
    
    sidebarCollapsed = false;
    localStorage.setItem('sidebarCollapsed', 'false');
}

// Toggle mobile menu
function toggleMobileMenu() {
    const mobileOverlay = document.getElementById('mobileOverlay');
    if (mobileOverlay) {
        mobileOverlay.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    }
}

// Close mobile menu
function closeMobileMenuHandler() {
    const mobileOverlay = document.getElementById('mobileOverlay');
    if (mobileOverlay) {
        mobileOverlay.classList.add('hidden');
        document.body.style.overflow = 'auto';
    }
}

// Handle window resize
function handleWindowResize() {
    const mobileOverlay = document.getElementById('mobileOverlay');
    
    // Close mobile menu on desktop
    if (window.innerWidth >= 768 && mobileOverlay && !mobileOverlay.classList.contains('hidden')) {
        closeMobileMenuHandler();
    }
}

// Handle menu clicks
function handleMenuClick(menuType) {
    const arrow = document.getElementById(`${menuType}-arrow`);
    const submenu = document.getElementById(`${menuType}-submenu`);
    const mobileArrow = document.getElementById(`mobile-${menuType}-arrow`);
    const mobileSubmenu = document.getElementById(`mobile-${menuType}-submenu`);
    
    // Handle desktop menu
    if (arrow && submenu) {
        const isHidden = submenu.classList.contains('hidden');
        
        if (isHidden) {
            submenu.classList.remove('hidden');
            arrow.style.transform = 'rotate(180deg)';
        } else {
            submenu.classList.add('hidden');
            arrow.style.transform = 'rotate(0deg)';
        }
    }
    
    // Handle mobile menu
    if (mobileArrow && mobileSubmenu) {
        const isHidden = mobileSubmenu.classList.contains('hidden');
        
        if (isHidden) {
            mobileSubmenu.classList.remove('hidden');
            mobileArrow.style.transform = 'rotate(180deg)';
        } else {
            mobileSubmenu.classList.add('hidden');
            mobileArrow.style.transform = 'rotate(0deg)';
        }
    }
}

// Logout function
function logout() {
    // Show confirmation dialog
    if (confirm('Apakah Anda yakin ingin keluar?')) {
        // Clear user data
        localStorage.removeItem('userData');
        localStorage.removeItem('authToken');
        sessionStorage.clear();
        
        // Hide dashboard and show login
        const dashboardContainer = document.getElementById('dashboardContainer');
        const loginContainer = document.getElementById('loginContainer');
        
        if (dashboardContainer) {
            dashboardContainer.classList.add('hidden');
        }
        
        if (loginContainer) {
            loginContainer.classList.remove('hidden');
        }
        
        // Reset forms
        const loginForm = document.querySelector('#loginForm form');
        const otpForm = document.querySelector('#otpForm form');
        
        if (loginForm) {
            loginForm.reset();
        }
        
        if (otpForm) {
            otpForm.reset();
        }
        
        // Hide OTP form and show login form
        const loginFormContainer = document.getElementById('loginForm');
        const otpFormContainer = document.getElementById('otpForm');
        
        if (loginFormContainer) {
            loginFormContainer.classList.remove('hidden');
        }
        
        if (otpFormContainer) {
            otpFormContainer.classList.add('hidden');
        }
        
        // Reset sidebar state
        sidebarCollapsed = false;
        expandSidebar();
        
        console.log('User logged out successfully');
    }
}

// Show dashboard (called from login script)
function showDashboard(userData) {
    const loginContainer = document.getElementById('loginContainer');
    const dashboardContainer = document.getElementById('dashboardContainer');
    
    if (loginContainer) {
        loginContainer.classList.add('hidden');
    }
    
    if (dashboardContainer) {
        dashboardContainer.classList.remove('hidden');
    }
    
    // Update user data
    currentUser = userData;
    updateUserDisplay(userData);
    
    // Save user data
    localStorage.setItem('userData', JSON.stringify(userData));
    
    console.log('Dashboard shown for user:', userData.name);
}

// Utility functions
function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg transition-all duration-300 transform translate-x-full`;
    
    // Set notification style based on type
    switch (type) {
        case 'success':
            notification.classList.add('bg-green-500', 'text-white');
            break;
        case 'error':
            notification.classList.add('bg-red-500', 'text-white');
            break;
        case 'warning':
            notification.classList.add('bg-yellow-500', 'text-white');
            break;
        default:
            notification.classList.add('bg-blue-500', 'text-white');
    }
    
    notification.innerHTML = `
        <div class="flex items-center space-x-2">
            <i class="fas fa-${type === 'success' ? 'check' : type === 'error' ? 'times' : type === 'warning' ? 'exclamation' : 'info'}-circle"></i>
            <span>${message}</span>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    // Show notification
    setTimeout(() => {
        notification.classList.remove('translate-x-full');
    }, 100);
    
    // Hide notification after 3 seconds
    setTimeout(() => {
        notification.classList.add('translate-x-full');
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
}

// Export functions for external use
window.dashboardFunctions = {
    showDashboard,
    logout,
    handleMenuClick,
    toggleDarkMode,
    showNotification
};

// Make functions globally available
window.showDashboard = showDashboard;
window.logout = logout;
window.handleMenuClick = handleMenuClick;
window.toggleDarkMode = toggleDarkMode;
window.showNotification = showNotification;
