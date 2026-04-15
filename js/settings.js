/**
 * Settings.js
 * Handles the configuration panels including the POS Menu manager
 */

window.Settings = {
    init() {
        this.cacheDOM();
        this.bindEvents();
        this.renderProductsTable();
    },

    cacheDOM() {
        this.prodName = document.getElementById('set-prod-name');
        this.prodPrice = document.getElementById('set-prod-price');
        this.prodCat = document.getElementById('set-prod-cat');
        this.btnAddProduct = document.getElementById('btn-add-product');
        this.tbody = document.querySelector('#settings-products-table tbody');
    },

    bindEvents() {
        if (this.btnAddProduct) {
            this.btnAddProduct.addEventListener('click', () => {
                this.addProduct();
            });
        }
    },

    getCatName(cat) {
        const cats = {
            'drinks': 'Tragos',
            'beverages': 'Bebidas',
            'food': 'Comida'
        };
        return cats[cat] || cat;
    },

    renderProductsTable() {
        if (!this.tbody) return;
        this.tbody.innerHTML = '';
        
        const products = Store.getProducts();

        if (products.length === 0) {
            this.tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">No hay productos cargados en el menú.</td></tr>';
            return;
        }

        products.forEach(p => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${p.name}</td>
                <td>${this.getCatName(p.category)}</td>
                <td>$${p.price.toFixed(2)}</td>
                <td>
                    <button class="btn-icon" onclick="window.Settings.deleteProduct(${p.id})"><i class="fa-solid fa-trash" style="color:var(--danger-red);"></i></button>
                </td>
            `;
            this.tbody.appendChild(tr);
        });
        
        // Also force POS menu refesh if view is loaded
        if (window.POS && typeof POS.renderMenu === 'function') {
            POS.renderMenu();
        }
    },

    addProduct() {
        const name = this.prodName.value.trim();
        const price = parseFloat(this.prodPrice.value);
        const category = this.prodCat.value;

        if (!name) {
            App.showToast('Debe ingresar un nombre.', 'error');
            return;
        }
        if (isNaN(price) || price < 0) {
            App.showToast('Debe ingresar un precio válido.', 'error');
            return;
        }

        const products = Store.getProducts();
        products.push({
            id: Date.now(),
            name,
            price,
            category
        });
        Store.saveProducts(products);

        App.showToast('Producto añadido al menú', 'success');
        
        this.prodName.value = '';
        this.prodPrice.value = '';
        
        this.renderProductsTable();
    },

    deleteProduct(id) {
        if (confirm('¿Eliminar este producto del menú de ventas?')) {
            Store.deleteProduct(id);
            App.showToast('Producto eliminado', 'success');
            this.renderProductsTable();
        }
    }
};

// Auto initialize on DOM loads / nav
document.addEventListener('DOMContentLoaded', () => {
    // Adding a hook to navigation to re-render in case it was updated
    document.querySelectorAll('.nav-links a').forEach(link => {
        link.addEventListener('click', (e) => {
            const view = e.target.closest('a').getAttribute('data-view');
            if (view === 'settings') {
                window.Settings.init();
            }
        });
    });
});
