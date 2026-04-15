/**
 * Inventory.js
 * Handles stock management, categories, and alerts.
 */

window.Inventory = {
    currentTab: 'inv-sala',

    init() {
        this.cacheDOM();
        this.bindEvents();
        this.renderTable();
    },

    cacheDOM() {
        this.tabBtns = document.querySelectorAll('#view-inventory .tab-btn');
        this.tbody = document.querySelector('#inventory-table tbody');
        this.btnNewItem = document.getElementById('btn-new-item');
    },

    bindEvents() {
        this.tabBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.tabBtns.forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.currentTab = e.target.getAttribute('data-target');
                this.renderTable();
            });
        });

        this.btnNewItem.addEventListener('click', () => {
            const name = prompt('Nombre del artículo:');
            if (!name) return;
            const currentStr = prompt('Cantidad actual:', '0');
            const minStr = prompt('Nivel mínimo de alerta:', '5');
            
            const current = parseInt(currentStr) || 0;
            const min = parseInt(minStr) || 0;
            
            const inv = Store.getInventory();
            inv.push({
                id: Date.now(),
                name,
                category: this.currentTab,
                current,
                min,
                status: current <= min ? 'low' : 'ok'
            });
            Store.saveInventory(inv);
            this.renderTable();
            App.updateDashboard();
            App.showToast('Artículo agregado', 'success');
        });
    },

    getCatName(cat) {
        const cats = {
            'inv-sala': 'Stock Sala',
            'inv-cocina': 'Stock Cocina',
            'inv-barra': 'Stock Barra',
            'inv-general': 'General Cocina'
        };
        return cats[cat] || cat;
    },

    renderTable() {
        const inv = Store.getInventory();
        const filtered = inv.filter(item => item.category === this.currentTab);
        
        this.tbody.innerHTML = '';
        
        if (filtered.length === 0) {
            this.tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:var(--text-muted);">No hay artículos en esta categoría.</td></tr>';
            return;
        }

        filtered.forEach(item => {
            // Update status dynamically on render
            item.status = item.current <= item.min ? 'low' : 'ok';
            
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${item.name}</strong></td>
                <td>${this.getCatName(item.category)}</td>
                <td>
                    <div style="display:flex; align-items:center; gap:10px;">
                        <button class="btn btn-secondary btn-icon" style="padding:2px 8px;" onclick="window.Inventory.updateItem(${item.id}, -1)">-</button>
                        <span>${item.current}</span>
                        <button class="btn btn-secondary btn-icon" style="padding:2px 8px;" onclick="window.Inventory.updateItem(${item.id}, 1)">+</button>
                    </div>
                </td>
                <td>${item.min}</td>
                <td><span class="status-badge ${item.status === 'low' ? 'status-low' : 'status-ok'}">
                    ${item.status === 'low' ? 'Mínimo' : 'OK'}</span>
                </td>
                <td>
                    <button class="btn-icon" onclick="window.Inventory.deleteItem(${item.id})"><i class="fa-solid fa-trash" style="color:var(--danger-red);"></i></button>
                </td>
            `;
            this.tbody.appendChild(tr);
        });
        
        // Save back any dynamic status updates to store
        Store.saveInventory(inv);
    },

    updateItem(id, delta) {
        const inv = Store.getInventory();
        const item = inv.find(i => i.id === id);
        if (item) {
            item.current += delta;
            if (item.current < 0) item.current = 0;
            Store.saveInventory(inv);
            this.renderTable();
            App.updateDashboard(); // Update dashboard alerts if changed
        }
    },

    deleteItem(id) {
        if (confirm('¿Eliminar este artículo del inventario?')) {
            let inv = Store.getInventory();
            inv = inv.filter(i => i.id !== id);
            Store.saveInventory(inv);
            this.renderTable();
            App.updateDashboard();
            App.showToast('Artículo eliminado', 'success');
        }
    }
};
