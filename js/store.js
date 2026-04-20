/**
 * Store.js
 * Handles all data persistence using localStorage.
 */

const Store = {
    keys: {
        USERS: 'skybar_users',
        PRODUCTS: 'skybar_products', // POS Menu items
        INVENTORY: 'skybar_inventory', // Stock items
        HISTORY: 'skybar_history', // Completed orders
        SETTINGS: 'skybar_settings',
        ACTIVE: 'skybar_active_orders'
    },

    // Initialize store with default data if empty
    init() {
        if (!localStorage.getItem(this.keys.USERS)) {
            this.seedData();
        }
    },

    seedData() {
        // Default users
        const users = [
            { username: 'admin', password: '123', role: 'admin', name: 'Administrador' },
            { username: 'cajero', password: '123', role: 'cajero', name: 'Caja Principal' }
        ];
        this.save(this.keys.USERS, users);

        // Default Menu Products
        const products = [
            { id: 1, name: 'Mojito Tradicional', price: 800, category: 'drinks' },
            { id: 2, name: 'Gin Tonic', price: 950, category: 'drinks' },
            { id: 3, name: 'Cerveza Artesanal IPA', price: 600, category: 'beverages' },
            { id: 4, name: 'Agua Sin Gas', price: 300, category: 'beverages' },
            { id: 5, name: 'Hamburguesa Sky', price: 1500, category: 'food' },
            { id: 6, name: 'Papas Cheddar', price: 900, category: 'food' }
        ];
        this.save(this.keys.PRODUCTS, products);

        // Default Inventory
        const inventory = [
            { id: 1, name: 'Sillas Exterior', category: 'inv-sala', current: 40, min: 38, status: 'ok' },
            { id: 2, name: 'Mesas Altas', category: 'inv-sala', current: 15, min: 14, status: 'ok' },
            { id: 3, name: 'Platos Principales', category: 'inv-cocina', current: 50, min: 45, status: 'ok' },
            { id: 4, name: 'Vasos Trago Largo', category: 'inv-barra', current: 80, min: 100, status: 'low' },
            { id: 5, name: 'Gin Bombay', category: 'inv-barra', current: 5, min: 10, status: 'low' },
            { id: 6, name: 'Limones (Kg)', category: 'inv-general', current: 2, min: 5, status: 'low' },
            { id: 7, name: 'Carne Hamburguesa (Unidades)', category: 'inv-general', current: 30, min: 20, status: 'ok' }
        ];
        this.save(this.keys.INVENTORY, inventory);

        // Empty history
        this.save(this.keys.HISTORY, []);
    },

    get(key) {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : null;
    },

    save(key, data) {
        localStorage.setItem(key, JSON.stringify(data));
    },

    resetAll() {
        localStorage.clear();
        this.seedData();
    },

    // --- Specific Helpers ---

    getInventory() { return this.get(this.keys.INVENTORY) || []; },
    saveInventory(data) { this.save(this.keys.INVENTORY, data); },

    getProducts() { return this.get(this.keys.PRODUCTS) || []; },
    saveProducts(data) { this.save(this.keys.PRODUCTS, data); },
    deleteProduct(id) {
        let products = this.getProducts();
        products = products.filter(p => p.id !== id);
        this.saveProducts(products);
    },

    getHistory() { return this.get(this.keys.HISTORY) || []; },
    deleteOrder(id) {
        let history = this.getHistory();
        history = history.filter(o => o.id !== id);
        this.save(this.keys.HISTORY, history);
    },
    addOrderToHistory(order) {
        const history = this.getHistory();
        history.push({
            ...order,
            id: Date.now(),
            date: new Date().toISOString()
        });
        this.save(this.keys.HISTORY, history);
    },

    // --- Active Orders (Tables) ---
    getActiveOrders() {
        return this.get(this.keys.ACTIVE) || {};
    },

    saveActiveOrder(tableNum, orderData) {
        const active = this.getActiveOrders();
        active[tableNum] = orderData;
        this.save(this.keys.ACTIVE, active);
    },

    removeActiveOrder(tableNum) {
        const active = this.getActiveOrders();
        delete active[tableNum];
        this.save(this.keys.ACTIVE, active);
    }
};

// Initialize on script load
Store.init();
