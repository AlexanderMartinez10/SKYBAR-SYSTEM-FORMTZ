/**
 * App.js
 * Main UI Controller: Routing, Navigation, Global Events, Toasts
 */

const App = {
    init() {
        this.cacheDOM();
        this.bindEvents();
        this.startClock();
        
        // Check Auth State
        if (Auth.isLoggedIn()) {
            this.showMainApp();
        } else {
            this.showLogin();
        }
    },

    cacheDOM() {
        this.loginScreen = document.getElementById('login-screen');
        this.appScreen = document.getElementById('app-screen');
        this.loginForm = document.getElementById('login-form');
        this.usernameInput = document.getElementById('username');
        this.passwordInput = document.getElementById('password');
        
        this.navLinks = document.querySelectorAll('.nav-links a');
        this.views = document.querySelectorAll('.view');
        
        this.btnLogout = document.getElementById('btn-logout');
        this.btnReset = document.getElementById('btn-reset-data');
        
        this.adminOnlyElements = document.querySelectorAll('.admin-only');
        
        this.userNameEl = document.getElementById('current-user-name');
        this.userRoleEl = document.getElementById('current-role');
        this.clockEl = document.getElementById('clock');
    },

    bindEvents() {
        this.loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleLogin();
        });

        this.btnLogout.addEventListener('click', () => {
            Auth.logout();
            this.showLogin();
            this.showToast('Sesión cerrada', 'success');
        });

        // Navigation
        this.navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const targetView = link.getAttribute('data-view');
                this.navigate(targetView);
            });
        });

        // Reset Data (Admin only)
        if (this.btnReset) {
            this.btnReset.addEventListener('click', () => {
                if (confirm('¡ATENCIÓN! ¿Estás seguro de borrar todos los datos del sistema? Esta acción es irreversible.')) {
                    Store.resetAll();
                    Auth.logout();
                    window.location.reload();
                }
            });
        }
        
        // Bell Icon Navigation
        const btnAlerts = document.getElementById('btn-alerts');
        if (btnAlerts) {
            btnAlerts.addEventListener('click', () => {
                this.navigate('inventory');
            });
        }
    },

    handleLogin() {
        const user = this.usernameInput.value.trim();
        const pass = this.passwordInput.value;
        
        if (Auth.login(user, pass)) {
            this.usernameInput.value = '';
            this.passwordInput.value = '';
            this.showMainApp();
            this.showToast(`Bienvenido, ${Auth.getUserName()}`, 'success');
        } else {
            this.showToast('Usuario o contraseña incorrectos', 'error');
        }
    },

    showLogin() {
        this.appScreen.classList.remove('active');
        this.loginScreen.classList.add('active');
    },

    showMainApp() {
        this.loginScreen.classList.remove('active');
        this.appScreen.classList.add('active');
        
        // Set User Info
        this.userNameEl.textContent = Auth.getUserName();
        this.userRoleEl.textContent = Auth.getRole().toUpperCase();
        
        // Handle Admin Elements
        if (Auth.isAdmin()) {
            this.adminOnlyElements.forEach(el => el.style.display = 'block');
        } else {
            this.adminOnlyElements.forEach(el => el.style.display = 'none');
            // If cajero is trying to access reports, redirect to Dashboard
            const activeView = document.querySelector('.view.active').id;
            if (activeView === 'view-reports' || activeView === 'view-settings') {
                this.navigate('dashboard');
            }
        }

        // Init specific modules if they have an init function
        if (window.POS) POS.init();
        if (window.Inventory) Inventory.init();
        if (window.Reports) Reports.init();
        
        // Update Dashboard Stats immediately
        this.updateDashboard();
    },

    navigate(viewName) {
        // Update Nav Links
        this.navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('data-view') === viewName) {
                link.classList.add('active');
            }
        });

        // Show View
        this.views.forEach(view => {
            view.classList.remove('active');
        });
        document.getElementById(`view-${viewName}`).classList.add('active');

        // Trigger view-specific updates
        if (viewName === 'dashboard') this.updateDashboard();
        if (viewName === 'reports' && window.Reports) Reports.loadData();
    },

    updateDashboard() {
        // Simple dashboard logic referencing data from Store
        const history = Store.getHistory();
        const today = new Date().toISOString().split('T')[0];
        
        const todaysOrders = history.filter(o => o.date.startsWith(today));
        const totalSales = todaysOrders.reduce((sum, o) => sum + o.total, 0);
        
        document.getElementById('dash-orders').textContent = todaysOrders.length;
        document.getElementById('dash-sales').textContent = `$${totalSales.toFixed(2)}`;
        
        // Update alerts count
        const inventory = Store.getInventory();
        const lowStock = inventory.filter(i => i.current <= i.min);
        document.getElementById('dash-alerts').textContent = lowStock.length;
        
        const alertBadge = document.getElementById('alert-badge');
        if (lowStock.length > 0) {
            alertBadge.textContent = lowStock.length;
            alertBadge.classList.remove('hidden');
        } else {
            alertBadge.classList.add('hidden');
        }
    },

    startClock() {
        setInterval(() => {
            if (this.clockEl) {
                const now = new Date();
                this.clockEl.textContent = now.toLocaleTimeString('es-ES', { hour12: false });
            }
        }, 1000);
    },

    // Global Toast functionality
    showToast(message, type = 'success') {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `<i class="fa-solid ${type === 'success' ? 'fa-circle-check' : 'fa-circle-exclamation'}"></i> ${message}`;
        
        container.appendChild(toast);
        
        setTimeout(() => {
            toast.style.animation = 'slideIn 0.3s ease reverse forwards';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
};

// Start App when DOM is fully loaded (Wait for other scripts to parse)
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});
