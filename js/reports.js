/**
 * Reports.js
 * Handles Dashboard stats, closures, history and CSV exports.
 */

window.Reports = {
    init() {
        this.cacheDOM();
        this.bindEvents();
    },

    cacheDOM() {
        this.repDaily = document.getElementById('rep-daily');
        this.repMonthly = document.getElementById('rep-monthly');
        this.repYearly = document.getElementById('rep-yearly');
        
        this.historyTbody = document.querySelector('#history-table tbody');
        
        this.btnExportCSV = document.getElementById('btn-export-csv');
        this.btnCloseDay = document.getElementById('btn-close-day');
    },

    bindEvents() {
        if (this.btnExportCSV) {
            this.btnExportCSV.addEventListener('click', () => this.exportCSV());
        }
        
        if (this.btnCloseDay) {
            this.btnCloseDay.addEventListener('click', () => {
                const total = this.repDaily.textContent;
                App.showToast(`Cierre de caja generado por ${total}.`, 'success');
                // Could save a 'Z-close' object in store here if needed
                // For now just simulate the print/download
                this.printClosureReport(total);
            });
        }
    },

    loadData() {
        const history = Store.getHistory();
        
        const now = new Date();
        const todayStr = now.toISOString().split('T')[0];
        const monthStr = todayStr.substring(0, 7); // YYYY-MM
        const yearStr = todayStr.substring(0, 4);  // YYYY
        
        let dailyTotal = 0;
        let monthlyTotal = 0;
        let yearlyTotal = 0;

        history.forEach(order => {
            const orderDate = order.date.split('T')[0];
            
            if (orderDate === todayStr) dailyTotal += order.total;
            if (orderDate.startsWith(monthStr)) monthlyTotal += order.total;
            if (orderDate.startsWith(yearStr)) yearlyTotal += order.total;
        });

        if (this.repDaily) this.repDaily.textContent = `$${dailyTotal.toFixed(2)}`;
        if (this.repMonthly) this.repMonthly.textContent = `$${monthlyTotal.toFixed(2)}`;
        if (this.repYearly) this.repYearly.textContent = `$${yearlyTotal.toFixed(2)}`;

        this.renderHistoryTable(history);
    },

    renderHistoryTable(history) {
        if (!this.historyTbody) return;
        this.historyTbody.innerHTML = '';
        
        if (history.length === 0) {
            this.historyTbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">No hay ventas registradas.</td></tr>';
            return;
        }

        // Sort by date descending
        const sorted = [...history].sort((a,b) => new Date(b.date) - new Date(a.date));

        sorted.forEach(order => {
            const dateObj = new Date(order.date);
            const friendlyDate = dateObj.toLocaleString('es-ES');
            
            const itemsStr = order.items.map(i => `${i.qty}x ${i.name}`).join(', ');

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${friendlyDate}</td>
                <td>Mesa ${order.table}</td>
                <td>${order.waiter}</td>
                <td>$${order.total.toFixed(2)}</td>
                <td style="font-size:0.8rem; color:var(--text-muted); max-width:200px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${itemsStr}">
                    ${itemsStr}
                </td>
                <td>
                    ${Auth.isAdmin() ? `<button class="btn-icon" onclick="window.Reports.deleteOrder(${order.id})" title="Anular Comanda"><i class="fa-solid fa-trash" style="color:var(--danger-red);"></i></button>` : '-'}
                </td>
            `;
            this.historyTbody.appendChild(tr);
        });
    },

    deleteOrder(id) {
        if (confirm('¿Estás seguro de anular y borrar esta comanda? Esta acción no se puede deshacer y el monto será deducido de los totales.')) {
            Store.deleteOrder(id);
            App.showToast('Comanda anulada.', 'success');
            this.loadData();
            App.updateDashboard();
        }
    },

    exportCSV() {
        const history = Store.getHistory();
        if (history.length === 0) {
            App.showToast('No hay datos para exportar', 'error');
            return;
        }

        let csvContent = "data:text/csv;charset=utf-8,";
        csvContent += "Fecha,Mesa,Mozo,Cajero,Total,Detalle\n";

        history.forEach(order => {
            const dateStr = new Date(order.date).toLocaleString('es-ES').replace(',', '');
            const itemsStr = order.items.map(i => `${i.qty}x ${i.name}`).join(' | ');
            const row = `"${dateStr}","${order.table}","${order.waiter}","${order.cashier}","${order.total}","${itemsStr}"`;
            csvContent += row + "\n";
        });

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `skybar_reporte_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    },
    
    printClosureReport(totalStr) {
         // Generates a mock Z-close ticket for printing
        const reportDate = new Date().toLocaleString('es-ES');
        const history = Store.getHistory();
        const todayStr = new Date().toISOString().split('T')[0];
        const todaysOrders = history.filter(o => o.date.startsWith(todayStr));
        
        const printWindow = window.open('', '_blank');
        printWindow.document.write('<html><head><title>Cierre Diario</title>');
        printWindow.document.write('<style>body{font-family:monospace; padding:20px;} hr{border-top:1px dashed #000;}</style>');
        printWindow.document.write('</head><body>');
        printWindow.document.write('<h2 style="text-align:center;">SKY BAR - CIERRE DIARIO (Z)</h2>');
        printWindow.document.write(`<p>Fecha de cierre: ${reportDate}</p>`);
        printWindow.document.write(`<p>Cajero: ${Auth.getUserName()}</p>`);
        printWindow.document.write('<hr>');
        printWindow.document.write(`<h3>Total Ventas (Hoy): ${totalStr}</h3>`);
        printWindow.document.write(`<h3>Cantidad Órdenes: ${todaysOrders.length}</h3>`);
        printWindow.document.write('<hr>');
        printWindow.document.write('<p style="text-align:center;">*** FIN DE REPORTE ***</p>');
        printWindow.document.write('</body></html>');
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => { printWindow.print(); printWindow.close(); }, 250);
    }
};
