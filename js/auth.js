/**
 * Auth.js
 * Handles login & user session management
 */

const Auth = {
    currentUser: null,

    init() {
        // Check if there is a session active in memory (for SPA we might not persist login, 
        // to force login on reload, but let's check sessionStorage)
        const savedSession = sessionStorage.getItem('skybar_session');
        if (savedSession) {
            this.currentUser = JSON.parse(savedSession);
        }
    },

    login(username, password) {
        const users = Store.get(Store.keys.USERS) || [];
        const user = users.find(u => u.username === username && u.password === password);
        
        if (user) {
            this.currentUser = { ...user };
            delete this.currentUser.password; // Don't keep password in active session
            sessionStorage.setItem('skybar_session', JSON.stringify(this.currentUser));
            return true;
        }
        return false;
    },

    logout() {
        this.currentUser = null;
        sessionStorage.removeItem('skybar_session');
    },

    isLoggedIn() {
        return this.currentUser !== null;
    },

    isAdmin() {
        return this.currentUser && this.currentUser.role === 'admin';
    },
    
    getUserName() {
        return this.currentUser ? this.currentUser.name : '';
    },
    
    getRole() {
        return this.currentUser ? this.currentUser.role : '';
    }
};

Auth.init();
