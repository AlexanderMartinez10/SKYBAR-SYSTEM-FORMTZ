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
        this.renderTableMap();
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
        this.btnSaveTable = document.getElementById('btn-save-table');
        this.posTableMap = document.getElementById('pos-table-map');
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

        // Manual selection of table number should highlight map
        this.tableInput.addEventListener('input', () => {
            this.handleTableChange();
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

        // Save Table button
        this.btnSaveTable.addEventListener('click', () => {
            this.saveOrderToTable();
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

    renderTableMap() {
        const activeOrders = Store.getActiveOrders();
        this.posTableMap.innerHTML = '';
        
        for (let i = 1; i <= 20; i++) {
            const tableData = activeOrders[i];
            const div = document.createElement('div');
            div.className = `table-item ${tableData ? 'table-occupied' : 'table-free'}`;
            if (this.tableInput.value == i) div.classList.add('active');
            
            div.innerHTML = `
                <span>${i}</span>
                ${tableData ? `<span class="table-total">$${tableData.total.toFixed(0)}</span>` : ''}
            `;
            
            div.onclick = () => {
                this.tableInput.value = i;
                this.handleTableChange();
            };
            this.posTableMap.appendChild(div);
        }
    },

    handleTableChange() {
        const tableNum = this.tableInput.value;
        const activeOrders = Store.getActiveOrders();
        const existingOrder = activeOrders[tableNum];

        if (existingOrder) {
            this.cart = existingOrder.items.map(item => ({ ...item, status: 'saved' }));
            this.waiterInput.value = existingOrder.waiter || '';
        } else {
            // If it's a new table and we were on an active one, clear cart? 
            // Better to only clear if we are moving to a free table
            this.cart = [];
        }
        
        this.renderTableMap();
        this.renderCart();
    },

    saveOrderToTable() {
        const tableNum = this.tableInput.value;
        if (!tableNum) {
            App.showToast('Ingrese número de mesa', 'error');
            return;
        }

        const total = this.cart.reduce((s, i) => s + (i.price * i.qty), 0);
        const orderData = {
            table: tableNum,
            waiter: this.waiterInput.value,
            items: this.cart.map(i => ({ ...i, status: 'saved' })),
            total: total
        };

        Store.saveActiveOrder(tableNum, orderData);
        App.showToast(`Mesa ${tableNum} guardada`, 'success');
        
        // Reset POS
        this.cart = [];
        this.tableInput.value = '';
        this.waiterInput.value = '';
        this.renderTableMap();
        this.renderCart();
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
        const existing = this.cart.find(i => i.id === product.id && i.status !== 'saved');
        if (existing) {
            existing.qty++;
        } else {
            this.cart.push({ ...product, qty: 1, status: 'new' });
        }
        this.renderCart();
    },

    updateQty(id, delta, status) {
        // Use == for ID comparison because the ID might be a number in the store but a string from the HTML attribute
        const item = this.cart.find(i => i.id == id && i.status === status);
        if (item) {
            item.qty += delta;
            if (item.qty <= 0) {
                this.cart = this.cart.filter(i => !(i.id == id && i.status === status));
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
            this.btnSaveTable.disabled = true;
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
                    <h4>${item.name} ${item.status === 'saved' ? '<small>Enviado</small>' : ''}</h4>
                    <span class="cart-item-price">$${itemTotal.toFixed(2)}</span>
                </div>
                <div class="cart-item-qty">
                    <button onclick="window.POS.updateQty('${item.id}', -1, '${item.status}')"><i class="fa-solid fa-minus"></i></button>
                    <span>${item.qty}</span>
                    <button onclick="window.POS.updateQty('${item.id}', 1, '${item.status}')"><i class="fa-solid fa-plus"></i></button>
                </div>
            `;
            this.cartItemsContainer.appendChild(div);
        });

        this.cartTotalEl.textContent = `$${total.toFixed(2)}`;
        this.btnCheckout.disabled = false;
        this.btnSaveTable.disabled = false;
    },

    showCheckoutModal() {
        let total = this.cart.reduce((s, i) => s + (i.price * i.qty), 0);
        const orderDate = new Date().toLocaleString('es-ES');
        
        let html = `
            <h3>SKY BAR - TICKET</h3>
            <p>Fecha: ${orderDate}</p>
            <p>Mesa: ${this.tableInput.value}</p>
            <p>Mozo: ${this.waiterInput.value}</p>
            <hr>
            <table class="receipt-table" style="width:100%; text-align:left;">
                <tr>
                    <th><input type="checkbox" id="select-all-split" checked onchange="window.POS.toggleAllSplit(this.checked)"></th>
                    <th>Cant</th><th>Descripción</th><th style="text-align:right;">Sub</th>
                </tr>
        `;
        
        this.cart.forEach((item, index) => {
            html += `<tr>
                <td><input type="checkbox" class="split-checkbox" data-index="${index}" checked onchange="window.POS.updateSplitTotal()"></td>
                <td>${item.qty}x</td>
                <td>${item.name}</td>
                <td style="text-align:right;">$${(item.price * item.qty).toFixed(2)}</td>
            </tr>`;
        });
        
        html += `
            </table>
            <hr>
            <h3 style="text-align:right;" id="split-total-display">TOTAL A COBRAR: $${total.toFixed(2)}</h3>
        `;
        
        this.receiptContent.innerHTML = html;
        this.modalCheckout.classList.add('active');
    },

    toggleAllSplit(checked) {
        document.querySelectorAll('.split-checkbox').forEach(cb => cb.checked = checked);
        this.updateSplitTotal();
    },

    updateSplitTotal() {
        let total = 0;
        const checkboxes = document.querySelectorAll('.split-checkbox');
        checkboxes.forEach(cb => {
            if (cb.checked) {
                const idx = cb.getAttribute('data-index');
                const item = this.cart[idx];
                total += item.price * item.qty;
            }
        });
        document.getElementById('split-total-display').textContent = `TOTAL A COBRAR: $${total.toFixed(2)}`;
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
        const checkboxes = document.querySelectorAll('.split-checkbox');
        const selectedItems = [];
        const remainingItems = [];
        let totalPaid = 0;

        checkboxes.forEach(cb => {
            const idx = cb.getAttribute('data-index');
            const item = this.cart[idx];
            if (cb.checked) {
                selectedItems.push(item);
                totalPaid += item.price * item.qty;
            } else {
                remainingItems.push(item);
            }
        });

        if (selectedItems.length === 0) {
            App.showToast('Seleccione al menos un producto', 'error');
            return;
        }

        const tableNum = this.tableInput.value;
        const order = {
            table: tableNum,
            waiter: this.waiterInput.value,
            items: selectedItems,
            total: totalPaid,
            cashier: Auth.getUserName()
        };
        
        Store.addOrderToHistory(order);
        
        // Update active table
        if (remainingItems.length > 0) {
            const newTotal = remainingItems.reduce((s, i) => s + (i.price * i.qty), 0);
            Store.saveActiveOrder(tableNum, {
                table: tableNum,
                waiter: this.waiterInput.value,
                items: remainingItems.map(i => ({ ...i, status: 'saved' })),
                total: newTotal
            });
            App.showToast('Cobro parcial realizado', 'success');
        } else {
            Store.removeActiveOrder(tableNum);
            App.showToast('Venta finalizada y mesa cerrada', 'success');
        }
        
        // Reset Cart and Inputs
        this.cart = [];
        this.renderCart();
        this.tableInput.value = '';
        this.waiterInput.value = '';
        this.renderTableMap();
        
        this.modalCheckout.classList.remove('active');
        App.updateDashboard();
    }
};
