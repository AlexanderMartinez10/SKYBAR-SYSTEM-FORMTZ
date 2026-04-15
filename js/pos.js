/**
 * POS.js
 * Point of Sale logic: Menu, Cart, Checkout.
 */

window.POS = {
    cart: [],
    currentCategory: 'all',
    
    init() {
        this.cacheDOM();
        this.bindEvents();
        this.renderMenu();
        this.updateDate();
    },

    cacheDOM() {
        this.productsGrid = document.getElementById('pos-products');
        this.cartItemsContainer = document.getElementById('cart-items');
        this.cartTotalEl = document.getElementById('cart-total');
        this.searchInput = document.getElementById('pos-search');
        this.catBtns = document.querySelectorAll('.cat-btn');
        
        // Inputs
        this.tableInput = document.getElementById('pos-table');
        this.waiterInput = document.getElementById('pos-waiter');
        this.manualName = document.getElementById('manual-name');
        this.manualPrice = document.getElementById('manual-price');
        
        // Buttons
        this.btnAddManual = document.getElementById('btn-add-manual');
        this.btnCheckout = document.getElementById('btn-checkout');
        
        // Modals
        this.modalCheckout = document.getElementById('modal-checkout');
        this.btnConfirmCheckout = document.getElementById('btn-confirm-checkout');
        this.btnPrintReceipt = document.getElementById('btn-print-receipt');
        this.closeModalBtn = this.modalCheckout.querySelector('.close-modal');
        this.receiptContent = document.getElementById('receipt-content');
    },

    bindEvents() {
        // Search
        this.searchInput.addEventListener('input', () => this.renderMenu());
        
        // Categories
        this.catBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.catBtns.forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.currentCategory = e.target.getAttribute('data-cat');
                this.renderMenu();
            });
        });

        // Add Manual Item
        this.btnAddManual.addEventListener('click', () => {
            const name = this.manualName.value.trim();
            const price = parseFloat(this.manualPrice.value);
            
            if (name && !isNaN(price) && price >= 0) {
                this.addToCart({ id: 'manual_' + Date.now(), name, price, manual: true });
                this.manualName.value = '';
                this.manualPrice.value = '';
            } else {
                App.showToast('Ingrese un nombre y precio válido', 'error');
            }
        });

        // Checkout Button
        this.btnCheckout.addEventListener('click', () => {
            if (this.cart.length === 0) return;
            if (!this.tableInput.value) {
                App.showToast('Debe asignar un número de mesa', 'error');
                this.tableInput.focus();
                return;
            }
            if (!this.waiterInput.value) {
                App.showToast('Debe asignar un mozo', 'error');
                this.waiterInput.focus();
                return;
            }
            this.showCheckoutModal();
        });

        // Modals
        this.closeModalBtn.addEventListener('click', () => {
            this.modalCheckout.classList.remove('active');
        });
        
        this.btnConfirmCheckout.addEventListener('click', () => {
            this.finalizeOrder();
        });
        
        this.btnPrintReceipt.addEventListener('click', () => {
            this.printReceipt();
        });
    },

    updateDate() {
        const dateEl = document.getElementById('pos-date');
        if (dateEl) {
            dateEl.textContent = new Date().toLocaleDateString('es-ES');
        }
    },

    renderMenu() {
        const products = Store.getProducts();
        const searchTerm = this.searchInput.value.toLowerCase();
        
        this.productsGrid.innerHTML = '';
        
        const filtered = products.filter(p => {
            const matchCat = this.currentCategory === 'all' || p.category === this.currentCategory;
            const matchSearch = p.name.toLowerCase().includes(searchTerm);
            return matchCat && matchSearch;
        });

        if (filtered.length === 0) {
            this.productsGrid.innerHTML = '<p class="text-muted">No se encontraron productos.</p>';
            return;
        }

        filtered.forEach(p => {
            const card = document.createElement('div');
            card.className = 'product-card';
            card.innerHTML = `
                <h4>${p.name}</h4>
                <p class="price">$${p.price.toFixed(2)}</p>
            `;
            card.addEventListener('click', () => this.addToCart(p));
            this.productsGrid.appendChild(card);
        });
    },

    addToCart(product) {
        const existing = this.cart.find(i => i.id === product.id);
        if (existing) {
            existing.qty++;
        } else {
            this.cart.push({ ...product, qty: 1 });
        }
        this.renderCart();
    },

    updateQty(id, delta) {
        const item = this.cart.find(i => i.id === id);
        if (item) {
            item.qty += delta;
            if (item.qty <= 0) {
                this.cart = this.cart.filter(i => i.id !== id);
            }
        }
        this.renderCart();
    },

    renderCart() {
        this.cartItemsContainer.innerHTML = '';
        
        if (this.cart.length === 0) {
            this.cartItemsContainer.innerHTML = `
                <div class="empty-cart">
                    <i class="fa-solid fa-cart-arrow-down"></i>
                    <p>El pedido está vacío</p>
                </div>
            `;
            this.cartTotalEl.textContent = '$0.00';
            this.btnCheckout.disabled = true;
            return;
        }

        let total = 0;
        
        this.cart.forEach(item => {
            const itemTotal = item.price * item.qty;
            total += itemTotal;
            
            const div = document.createElement('div');
            div.className = 'cart-item';
            div.innerHTML = `
                <div class="cart-item-info">
                    <h4>${item.name}</h4>
                    <span class="cart-item-price">$${itemTotal.toFixed(2)}</span>
                </div>
                <div class="cart-item-qty">
                    <button onclick="window.POS.updateQty('${item.id}', -1)"><i class="fa-solid fa-minus"></i></button>
                    <span>${item.qty}</span>
                    <button onclick="window.POS.updateQty('${item.id}', 1)"><i class="fa-solid fa-plus"></i></button>
                </div>
            `;
            this.cartItemsContainer.appendChild(div);
        });

        this.cartTotalEl.textContent = `$${total.toFixed(2)}`;
        this.btnCheckout.disabled = false;
    },

    showCheckoutModal() {
        let total = this.cart.reduce((s, i) => s + (i.price * i.qty), 0);
        const orderDate = new Date().toLocaleString('es-ES');
        
        let html = `
            <h3>SKY BAR - TICKET</h3>
            <p>Fecha: ${orderDate}</p>
            <p>Mesa: ${this.tableInput.value}</p>
            <p>Mozo: ${this.waiterInput.value}</p>
            <p>Cajero: ${Auth.getUserName()}</p>
            <hr>
            <table style="width:100%; text-align:left;">
                <tr><th>Cant</th><th>Descripción</th><th style="text-align:right;">Sub</th></tr>
        `;
        
        this.cart.forEach(item => {
            html += `<tr>
                <td>${item.qty}x</td>
                <td>${item.name}</td>
                <td style="text-align:right;">$${(item.price * item.qty).toFixed(2)}</td>
            </tr>`;
        });
        
        html += `
            </table>
            <hr>
            <h3 style="text-align:right;">TOTAL: $${total.toFixed(2)}</h3>
        `;
        
        this.receiptContent.innerHTML = html;
        this.modalCheckout.classList.add('active');
    },

    printReceipt() {
        // En un entorno real se comunicaría con una impresora térmica.
        // Aquí generamos un print del navegador solo del contenido del ticket.
        const printWindow = window.open('', '_blank');
        printWindow.document.write('<html><head><title>Imprimir Ticket</title>');
        printWindow.document.write('<style>body{font-family:monospace; padding:20px; text-align:left;} table{width:100%} th,td{padding:5px;} hr{border-top:1px dashed #000;}</style>');
        printWindow.document.write('</head><body>');
        printWindow.document.write(this.receiptContent.innerHTML);
        printWindow.document.write('</body></html>');
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => { printWindow.print(); printWindow.close(); }, 250);
    },

    finalizeOrder() {
        const total = this.cart.reduce((s, i) => s + (i.price * i.qty), 0);
        
        const order = {
            table: this.tableInput.value,
            waiter: this.waiterInput.value,
            items: [...this.cart],
            total: total,
            cashier: Auth.getUserName()
        };
        
        Store.addOrderToHistory(order);
        
        // Reset Cart and Inputs
        this.cart = [];
        this.renderCart();
        this.tableInput.value = '';
        this.waiterInput.value = '';
        
        this.modalCheckout.classList.remove('active');
        App.showToast('Venta finalizada con éxito', 'success');
        
        // Update dashboard quietly
        App.updateDashboard();
    }
};
