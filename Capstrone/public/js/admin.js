/**
 * Admin Panel & Real-time Live Tracker Feed
 */
let liveFeedInterval = null;
let allVolunteersList = [];

async function loadAdminData() {
    await fetchAdminProducts();
    await fetchLiveActivityFeed();
    await loadAdminOrders();
    await loadWarehouseOlapView();
    await loadAdminAprioriView();

    if (!liveFeedInterval) {
        liveFeedInterval = setInterval(() => {
            fetchLiveActivityFeed();
            loadAdminOrders(true); // silent refresh
        }, 4000);
    }
}

let currentAdminOrders = [];

async function loadAdminOrders(silent = false) {
    const token = localStorage.getItem('shoplytics_token');
    const tbody = document.querySelector('#table-admin-orders tbody');
    if (!tbody) return;

    if (!silent) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-muted); padding: 20px;">Loading customer order dispatch list...</td></tr>`;
    }

    try {
        const headers = token ? { 'Authorization': `Bearer ${token}` } : {};

        let volRes = await fetch('/api/admin/volunteers-list', { headers });
        if (!volRes.ok) volRes = await fetch('/api/admin/volunteers-list');
        if (volRes && volRes.ok) {
            allVolunteersList = await volRes.json();
        }

        let res = await fetch('/api/admin/orders', { headers });
        if (!res.ok) {
            res = await fetch('/api/admin/orders');
        }

        if (!res.ok) throw new Error('Failed to load admin orders');
        const orders = await res.json();
        currentAdminOrders = orders;

        if (orders.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-muted); padding: 20px;">No customer orders currently placed in the warehouse database.</td></tr>`;
            return;
        }

        tbody.innerHTML = orders.map(o => {
            const volOptions = allVolunteersList.map(v => `
                <option value="${v.UserID}" ${o.VolunteerUserID == v.UserID ? 'selected' : ''}>
                    👤 ${escapeHtml(v.FullName)} (${escapeHtml(v.Phone || 'Vol')})
                </option>
            `).join('');

            const statusColors = {
                'ORDER PLACED': '#06b6d4',
                'CONFIRMED': '#3b82f6',
                'PACKED': '#8b5cf6',
                'SHIPPED': '#f59e0b',
                'COLLECTED': '#f59e0b',
                'OUT FOR DELIVERY': '#3b82f6',
                'DELIVERED': '#10b981'
            };

            const color = statusColors[o.Status] || '#06b6d4';

            let totalQtySum = 0;
            const itemsMarkup = (o.items || []).map(it => {
                const stock = it.StockQuantity !== undefined ? it.StockQuantity : 0;
                totalQtySum += (it.Quantity || 0);

                let stockBadge = '';
                if (stock > 20) {
                    stockBadge = `<span style="color: var(--accent-emerald); font-weight: 700; font-size: 10px;">🟢 ${stock} Left</span>`;
                } else if (stock > 0) {
                    stockBadge = `<span style="color: #f59e0b; font-weight: 700; font-size: 10px;">🟠 ${stock} Left (Low)</span>`;
                } else {
                    stockBadge = `<span style="color: var(--accent-rose); font-weight: 800; font-size: 10px;">🔴 OUT OF STOCK</span>`;
                }

                const unitPriceStr = it.UnitPrice ? `$${Number(it.UnitPrice).toFixed(2)}` : '';
                const itemTotalStr = (it.UnitPrice && it.Quantity) ? `$${(it.UnitPrice * it.Quantity).toFixed(2)}` : '';
                const brandCategory = [it.Brand, it.Category].filter(Boolean).join(' • ');

                return `
                    <div style="font-size: 11px; margin-bottom: 6px; background: rgba(15, 23, 42, 0.6); padding: 6px 8px; border-radius: 6px; border: 1px solid rgba(255, 255, 255, 0.08);">
                        <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 6px;">
                            <div style="font-weight: 700; color: var(--text-bright); font-size: 12px; line-height: 1.2;">
                                📦 ${escapeHtml(it.ProductName)}
                            </div>
                            <span style="background: rgba(6, 182, 212, 0.2); color: var(--primary-cyan); font-weight: 800; font-size: 11px; padding: 2px 6px; border-radius: 4px; white-space: nowrap; border: 1px solid rgba(6, 182, 212, 0.4);">
                                Qty: ${it.Quantity}
                            </span>
                        </div>
                        ${brandCategory ? `<div style="font-size: 10px; color: var(--text-dim); margin-top: 2px;">🏷️ ${escapeHtml(brandCategory)}</div>` : ''}
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 4px; font-size: 10px; border-top: 1px dashed rgba(255,255,255,0.06); padding-top: 4px;">
                            <span style="color: var(--text-muted);">${unitPriceStr ? `${unitPriceStr}/ea` : ''} ${itemTotalStr ? `<strong style="color: var(--accent-emerald);">(${itemTotalStr})</strong>` : ''}</span>
                            <span>🏬 Stock: ${stockBadge}</span>
                        </div>
                    </div>
                `;
            }).join('');

            const formattedDate = new Date(o.CreatedAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' });

            return `
                <tr>
                    <td>
                        <strong style="color: var(--text-bright); font-size: 13px;">#${o.OrderNumber}</strong>
                        <div style="font-size: 10px; color: var(--text-muted); margin-top: 2px;">📅 ${formattedDate}</div>
                        <button class="btn btn-outline" style="padding: 2px 6px; font-size: 9px; margin-top: 6px; color: var(--primary-cyan); border-color: rgba(6, 182, 212, 0.4); width: 100%; display: flex; align-items: center; justify-content: center; gap: 4px;" onclick="openAdminOrderRecordModal(${o.OrderID})">
                            📋 View Record
                        </button>
                    </td>
                    <td>
                        <div style="font-weight: 700; color: var(--text-bright); font-size: 13px;">👤 ${escapeHtml(o.CustomerName || 'Customer')}</div>
                        ${o.CustomerEmail ? `<div style="font-size: 11px; color: var(--primary-cyan); margin-top: 2px;">📧 ${escapeHtml(o.CustomerEmail)}</div>` : ''}
                        <div style="font-size: 11px; color: #f59e0b; margin-top: 2px;">📞 ${escapeHtml(o.CustomerPhone || 'N/A')}</div>
                        <div style="font-size: 10px; color: var(--text-muted); margin-top: 3px;">
                            <span style="background: rgba(255,255,255,0.05); padding: 1px 6px; border-radius: 4px; border: 1px solid var(--border-color);">
                                ID: ${escapeHtml(o.CustomerID || ('CUST-' + o.CustomerKey))} ${o.CustomerSegment ? `• ${escapeHtml(o.CustomerSegment)}` : ''}
                            </span>
                        </div>
                    </td>
                    <td>
                        <div style="max-width: 300px;">
                            <div style="font-size: 10px; font-weight: 700; text-transform: uppercase; color: var(--primary-cyan); margin-bottom: 6px; display: flex; justify-content: space-between; align-items: center;">
                                <span>🛒 Ordered Items (${o.items ? o.items.length : 0})</span>
                                <span style="background: rgba(6, 182, 212, 0.15); color: var(--primary-cyan); padding: 1px 6px; border-radius: 10px; font-size: 9px;">Total Qty: ${totalQtySum}</span>
                            </div>
                            ${itemsMarkup || '<span style="color: var(--text-dim); font-size: 11px;">No product items</span>'}
                        </div>
                    </td>
                    <td>
                        <div style="font-size: 12px; color: var(--text-bright); font-weight: 600; max-width: 220px; white-space: normal;">
                            ${escapeHtml(o.ShippingAddress || 'Central Hub')}
                        </div>
                        <button class="btn btn-outline" style="padding: 2px 6px; font-size: 9px; margin-top: 4px; color: var(--primary-cyan);" onclick="openGoogleMapModal('${escapeHtml(o.ShippingAddress)}', '${escapeHtml(o.CustomerName)}', '${o.OrderNumber}', '${o.Status}')">
                            📍 Customer Map
                        </button>
                    </td>
                    <td>
                        <strong style="color: var(--accent-emerald); font-size: 14px;">$${(o.TotalAmount || 0).toFixed(2)}</strong>
                        <div style="font-size: 10px; color: var(--text-muted); margin-top: 2px;">💳 ${o.PaymentMethod || 'COD'}</div>
                    </td>
                    <td>
                        ${(() => {
                            if (o.Status === 'ORDER PLACED' || o.Status === 'CONFIRMED') {
                                return `
                                    <div style="display: flex; flex-direction: column; gap: 4px; align-items: flex-start;">
                                        <span class="badge badge-cyan" style="font-weight: 700;">🛒 ORDER PLACED</span>
                                        <button class="btn btn-primary" style="padding: 3px 8px; font-size: 10px; background: linear-gradient(135deg, #8b5cf6, #6d28d9); border: none;" onclick="updateAdminOrderStatus(${o.OrderID}, 'PACKED')">
                                            📦 Mark Packed
                                        </button>
                                    </div>
                                `;
                            } else if (o.Status === 'PACKED') {
                                return `<span class="badge" style="background: rgba(139, 92, 246, 0.2); color: #8b5cf6; border: 1px solid rgba(139, 92, 246, 0.4); font-weight: 700;">📦 PACKED & READY</span>`;
                            } else if (o.Status === 'SHIPPED' || o.Status === 'COLLECTED') {
                                return `<span class="badge" style="background: rgba(245, 158, 11, 0.2); color: #f59e0b; border: 1px solid rgba(245, 158, 11, 0.4); font-weight: 700;">🚚 PICKED BY VOLUNTEER</span>`;
                            } else if (o.Status === 'OUT FOR DELIVERY') {
                                return `<span class="badge badge-indigo" style="font-weight: 700;">🏍️ OUT FOR DELIVERY</span>`;
                            } else if (o.Status === 'DELIVERED') {
                                return `<span class="badge badge-emerald" style="font-weight: 800;">✅ DELIVERED</span>`;
                            } else {
                                return `<span class="badge badge-cyan">${o.Status}</span>`;
                            }
                        })()}
                    </td>
                    <td>
                        ${(() => {
                            const hasVolunteer = o.VolunteerUserID && o.VolunteerUserID != 0;
                            if (!hasVolunteer) {
                                return `
                                    <div style="font-size: 11px; font-weight: 700; color: #f43f5e; display: flex; align-items: center; gap: 4px; padding: 4px;">
                                        <i class="ri-error-warning-line"></i> ⚠️ Needs Volunteer Acceptance
                                    </div>
                                `;
                            }

                            const isAccepted = ['COLLECTED', 'SHIPPED', 'OUT FOR DELIVERY', 'DELIVERED'].includes(o.Status);
                            const volName = escapeHtml(o.VolunteerName || 'Volunteer');
                            const volPhone = o.VolunteerPhone ? ` (${escapeHtml(o.VolunteerPhone)})` : '';

                            if (isAccepted) {
                                return `
                                    <div style="background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 6px; padding: 6px 10px;">
                                        <div style="font-size: 12px; font-weight: 700; color: #10b981;">
                                            👤 ${volName}${volPhone}
                                        </div>
                                        <div style="font-size: 10px; color: #10b981; font-weight: 700; margin-top: 2px;">
                                            ✓ Accepted & Picked Up
                                        </div>
                                    </div>
                                `;
                            } else {
                                return `
                                    <div style="background: rgba(245, 158, 11, 0.1); border: 1px solid rgba(245, 158, 11, 0.3); border-radius: 6px; padding: 6px 10px;">
                                        <div style="font-size: 11px; font-weight: 700; color: #f59e0b;">
                                            ⏳ Waiting for volunteer confirmation
                                        </div>
                                        <div style="font-size: 10px; color: var(--text-muted); margin-top: 2px;">
                                            Assigned: 👤 <strong>${volName}</strong>
                                        </div>
                                    </div>
                                `;
                            }
                        })()}
                    </td>
                </tr>
            `;
        }).join('');
    } catch (err) {
        console.error('Error loading admin orders:', err);
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--accent-rose); padding: 20px;">Failed to load order dispatch list: ${err.message}</td></tr>`;
        }
    }
}

function openAdminOrderRecordModal(orderId) {
    const order = currentAdminOrders.find(o => o.OrderID === orderId);
    if (!order) return;

    const content = document.getElementById('admin-order-record-content');
    if (!content) return;

    const itemsRows = (order.items || []).map(it => {
        const itemTotal = (it.UnitPrice && it.Quantity) ? (it.UnitPrice * it.Quantity) : 0;
        const stock = it.StockQuantity !== undefined ? it.StockQuantity : 0;
        let stockBadge = stock > 0 ? `<span style="color: var(--accent-emerald);">🟢 ${stock} in Stock</span>` : `<span style="color: var(--accent-rose);">🔴 Out of Stock</span>`;

        return `
            <tr style="border-bottom: 1px solid rgba(255,255,255,0.06);">
                <td style="padding: 8px; font-weight: 700; color: var(--text-bright);">
                    ${escapeHtml(it.ProductName)}
                    <div style="font-size: 10px; color: var(--text-muted);">${escapeHtml([it.Brand, it.Category].filter(Boolean).join(' • '))}</div>
                </td>
                <td style="padding: 8px; text-align: center; font-weight: 800; color: var(--primary-cyan); font-size: 13px;">
                    ${it.Quantity}
                </td>
                <td style="padding: 8px; text-align: right; color: var(--text-bright);">
                    $${Number(it.UnitPrice || 0).toFixed(2)}
                </td>
                <td style="padding: 8px; text-align: right; font-weight: 700; color: var(--accent-emerald);">
                    $${itemTotal.toFixed(2)}
                </td>
                <td style="padding: 8px; text-align: center; font-size: 11px;">
                    ${stockBadge}
                </td>
            </tr>
        `;
    }).join('');

    content.innerHTML = `
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px; background: rgba(15,23,42,0.8); padding: 14px; border-radius: 8px; border: 1px solid var(--border-color);">
            <div>
                <h4 style="color: var(--primary-cyan); font-size: 12px; text-transform: uppercase; margin-bottom: 8px;">👤 Customer Record Profile</h4>
                <div style="font-size: 14px; font-weight: 700; color: var(--text-bright);">${escapeHtml(order.CustomerName)}</div>
                ${order.CustomerEmail ? `<div style="font-size: 12px; color: var(--primary-cyan); margin-top: 2px;">📧 ${escapeHtml(order.CustomerEmail)}</div>` : ''}
                <div style="font-size: 12px; color: #f59e0b; margin-top: 2px;">📞 ${escapeHtml(order.CustomerPhone || 'N/A')}</div>
                <div style="font-size: 11px; color: var(--text-muted); margin-top: 4px;">Customer ID: <strong style="color: var(--text-bright);">${escapeHtml(order.CustomerID || ('CUST-' + order.CustomerKey))}</strong> (${order.CustomerSegment || 'Standard'})</div>
            </div>
            <div>
                <h4 style="color: var(--primary-cyan); font-size: 12px; text-transform: uppercase; margin-bottom: 8px;">📦 Order Logistics Details</h4>
                <div style="font-size: 13px; font-weight: 700; color: var(--text-bright);">Order #: #${order.OrderNumber}</div>
                <div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">Date: ${new Date(order.CreatedAt).toLocaleString()}</div>
                <div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">Payment Method: <strong style="color: var(--text-bright);">${order.PaymentMethod || 'COD'}</strong></div>
                <div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">Delivery Address: <span style="color: var(--text-bright);">${escapeHtml(order.ShippingAddress)}</span></div>
            </div>
        </div>

        <h4 style="color: var(--text-bright); font-size: 13px; margin-bottom: 8px;">🛒 Ordered Products Manifest</h4>
        <table class="custom-table" style="width: 100%; margin-bottom: 16px; font-size: 12px;">
            <thead>
                <tr style="background: rgba(255,255,255,0.03);">
                    <th style="text-align: left; padding: 8px;">Product Name</th>
                    <th style="text-align: center; padding: 8px;">Qty Ordered</th>
                    <th style="text-align: right; padding: 8px;">Unit Price</th>
                    <th style="text-align: right; padding: 8px;">Item Subtotal</th>
                    <th style="text-align: center; padding: 8px;">Warehouse Stock</th>
                </tr>
            </thead>
            <tbody>
                ${itemsRows || '<tr><td colspan="5" style="text-align: center; padding: 12px;">No item records found.</td></tr>'}
            </tbody>
        </table>

        <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(6, 182, 212, 0.05); padding: 12px 16px; border-radius: 8px; border: 1px solid rgba(6, 182, 212, 0.2);">
            <div>
                <span style="font-size: 12px; color: var(--text-muted);">Current Order Status:</span>
                <span class="badge badge-cyan" style="margin-left: 6px; font-weight: 700;">${order.Status}</span>
            </div>
            <div style="text-align: right;">
                <span style="font-size: 12px; color: var(--text-muted);">Grand Total Amount:</span>
                <strong style="font-size: 18px; color: var(--accent-emerald); margin-left: 8px;">$${(order.TotalAmount || 0).toFixed(2)}</strong>
            </div>
        </div>

        <div style="margin-top: 16px; display: flex; justify-content: flex-end; gap: 10px;">
            <button class="btn btn-secondary" onclick="closeAdminOrderRecordModal()">Close Record</button>
            <button class="btn btn-primary" onclick="openGoogleMapModal('${escapeHtml(order.ShippingAddress)}', '${escapeHtml(order.CustomerName)}', '${order.OrderNumber}', '${order.Status}'); closeAdminOrderRecordModal();">
                📍 Track Customer Location
            </button>
        </div>
    `;

    document.getElementById('modal-admin-order-record').classList.add('active');
}

function closeAdminOrderRecordModal() {
    document.getElementById('modal-admin-order-record').classList.remove('active');
}

async function assignVolunteerToOrder(orderId) {
    const token = localStorage.getItem('shoplytics_token');
    const select = document.getElementById(`assign-vol-${orderId}`);
    if (!select || !select.value) {
        alert('Please select a Volunteer Delivery Agent from the dropdown.');
        return;
    }

    try {
        const res = await fetch(`/api/admin/orders/${orderId}/assign-volunteer`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ volunteerUserId: parseInt(select.value) })
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to assign volunteer');

        alert(`✅ ${data.message}`);
        loadAdminOrders(true);
    } catch (err) {
        alert(`❌ Assignment Error: ${err.message}`);
    }
}

async function updateAdminOrderStatus(orderId, newStatus) {
    const token = localStorage.getItem('shoplytics_token');
    try {
        const res = await fetch(`/api/admin/orders/${orderId}/status`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status: newStatus })
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to update order status');

        loadAdminOrders(true);
    } catch (err) {
        alert(`❌ Status Update Error: ${err.message}`);
    }
}

async function fetchAdminProducts() {
    try {
        const token = localStorage.getItem('shoplytics_token');
        const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
        let res = await fetch('/api/admin/products', { headers });
        if (!res.ok) {
            res = await fetch('/api/products');
        }
        const products = await res.json();
        if (!Array.isArray(products)) {
            console.error('Products response is not an array:', products);
            return;
        }

        // Calculate KPI Metrics
        let totalProducts = products.length;
        let totalStockUnits = 0;
        let healthyCount = 0;
        let lowStockCount = 0;
        let outOfStockCount = 0;

        products.forEach(p => {
            const stock = p.StockQuantity || 0;
            totalStockUnits += stock;
            if (stock > 20) healthyCount++;
            else if (stock > 0) lowStockCount++;
            else outOfStockCount++;
        });

        const kpiProducts = document.getElementById('kpi-total-products');
        const kpiUnits = document.getElementById('kpi-total-stock-units');
        const kpiHealthy = document.getElementById('kpi-healthy-stock-items');
        const kpiLow = document.getElementById('kpi-low-stock-items');
        const kpiOut = document.getElementById('kpi-out-of-stock-items');

        if (kpiProducts) kpiProducts.innerText = `${totalProducts} Products`;
        if (kpiUnits) kpiUnits.innerText = `${totalStockUnits.toLocaleString()} Units`;
        if (kpiHealthy) kpiHealthy.innerText = `${healthyCount} Items`;
        if (kpiLow) kpiLow.innerText = `${lowStockCount} Items`;
        if (kpiOut) kpiOut.innerText = `${outOfStockCount} Items`;

        const tbody = document.querySelector('#table-admin-products tbody');
        if (!tbody) return;
        tbody.innerHTML = '';

        products.forEach(p => {
            const stock = p.StockQuantity || 0;
            let stockBadge = '';
            if (stock > 20) {
                stockBadge = `<span class="badge badge-emerald" style="font-weight: 700;">🟢 ${stock} Units (In Stock)</span>`;
            } else if (stock > 0) {
                stockBadge = `<span class="badge" style="background: rgba(245, 158, 11, 0.15); color: #f59e0b; border: 1px solid rgba(245, 158, 11, 0.3); font-weight: 700;">🟠 ${stock} Units (Low Stock Warning!)</span>`;
            } else {
                stockBadge = `<span class="badge badge-rose" style="font-weight: 800;">🔴 0 Units (OUT OF STOCK - RESTOCK NEEDED!)</span>`;
            }

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><code>${p.ProductID}</code></td>
                <td><strong>${escapeHtml(p.ProductName)}</strong></td>
                <td><span class="badge badge-indigo">${p.Category}</span></td>
                <td>$${parseFloat(p.Price).toFixed(2)}</td>
                <td>
                    <div style="display: flex; align-items: center; gap: 8px;">
                        ${stockBadge}
                        <button class="btn btn-outline" style="padding: 2px 6px; font-size: 10px; color: var(--accent-emerald); border-color: rgba(16, 185, 129, 0.4);" onclick="quickRestockProduct(${p.ProductKey}, ${stock})" title="Add stock units">
                            + Restock
                        </button>
                    </div>
                </td>
                <td>⭐ ${p.PopularityRating}</td>
                <td>
                    <button class="btn btn-outline" style="padding: 4px 8px; font-size: 11px; color: var(--accent-rose); border-color: rgba(244, 63, 94, 0.3);" onclick="deleteProduct(${p.ProductKey})">Delete</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    } catch (err) {
        console.error('Admin products load error:', err);
    }
}

async function quickRestockProduct(productKey, currentStock) {
    const addQty = parseInt(prompt(`Current Stock: ${currentStock} units.\nEnter quantity to add to stock:`, '50'));
    if (isNaN(addQty) || addQty <= 0) return;

    try {
        const token = localStorage.getItem('shoplytics_token');
        const newStock = currentStock + addQty;
        const res = await fetch(`/api/admin/products/${productKey}/restock`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ stockQuantity: newStock })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Restock failed');
        alert(`✅ Stock updated successfully to ${newStock} units!`);
        fetchAdminProducts();
        if (window.loadStoreProducts) window.loadStoreProducts();
    } catch (err) {
        alert('Restock failed: ' + err.message);
    }
}

async function fetchLiveActivityFeed() {
    try {
        const res = await fetch('/api/admin/live-activity');
        const events = await res.json();

        const container = document.getElementById('live-activity-feed');
        if (!container) return;

        if (events.length === 0) {
            container.innerHTML = `<div style="font-size: 12px; color: var(--text-dim); padding: 10px;">No recent sessions logged</div>`;
            return;
        }

        container.innerHTML = events.map(e => `
            <div style="padding: 8px 12px; border-bottom: 1px solid var(--border-color); font-size: 12px; display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <strong style="color: var(--primary-cyan);">${escapeHtml(e.FullName || 'Guest User')}</strong> 
                    <span style="color: var(--text-muted);">action: <code>${e.EventType}</code></span>
                </div>
                <div style="font-size: 10px; color: var(--text-dim);">${new Date(e.Timestamp).toLocaleTimeString()}</div>
            </div>
        `).join('');
    } catch (err) {
        console.error('Live feed error:', err);
    }
}

async function triggerReseed() {
    if (!confirm('Are you sure you want to re-seed the Star Schema Data Warehouse? This will reset sales transactions and re-run Apriori mining.')) return;

    try {
        const token = localStorage.getItem('shoplytics_token');
        const res = await fetch('/api/admin/reseed', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || data.message || 'Reseed operation failed.');
        alert('🎉 ' + (data.message || 'Data Warehouse ETL Re-seed and Apriori Mining completed successfully!'));
        loadAdminData();
        if (window.loadStoreProducts) window.loadStoreProducts();
    } catch (err) {
        alert('ETL Reseed Error: ' + err.message);
    }
}

async function deleteProduct(productKey) {
    if (!confirm('Delete this product from warehouse catalog?')) return;
    try {
        const token = localStorage.getItem('shoplytics_token');
        const res = await fetch(`/api/admin/products/${productKey}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Delete failed');
        alert('Product deleted successfully!');
        fetchAdminProducts();
    } catch (err) {
        alert('Delete failed: ' + err.message);
    }
}

function openAddProductModal() {
    const name = prompt('Product Name:');
    if (!name) return;
    const category = prompt('Category (Electronics / Home & Kitchen / Fitness / Fashion / Books):', 'Electronics');
    const price = parseFloat(prompt('Price ($):', '99.99'));

    if (name && price) {
        const token = localStorage.getItem('shoplytics_token');
        fetch('/api/admin/products', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ productName: name, category, price, stockQuantity: 100 })
        }).then(res => res.json()).then(data => {
            alert('Product added successfully!');
            fetchAdminProducts();
        }).catch(err => alert('Failed to add product: ' + err.message));
    }
}

/* Real-Time Stock Management View Logic */
let allStockProductsList = [];

async function loadStockManagementView() {
    try {
        const token = localStorage.getItem('shoplytics_token');
        let res = await fetch('/api/admin/products', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) {
            res = await fetch('/api/products');
        }
        allStockProductsList = await res.json();

        // Calculate KPI Metrics
        let totalProducts = allStockProductsList.length;
        let totalStockUnits = 0;
        let healthyCount = 0;
        let lowStockCount = 0;
        let outOfStockCount = 0;

        allStockProductsList.forEach(p => {
            const stock = p.StockQuantity || 0;
            totalStockUnits += stock;
            if (stock > 20) healthyCount++;
            else if (stock > 0) lowStockCount++;
            else outOfStockCount++;
        });

        const smTotalProd = document.getElementById('sm-kpi-total-products');
        const smTotalUnits = document.getElementById('sm-kpi-total-stock-units');
        const smHealthy = document.getElementById('sm-kpi-healthy-stock-items');
        const smLow = document.getElementById('sm-kpi-low-stock-items');
        const smOut = document.getElementById('sm-kpi-out-of-stock-items');

        if (smTotalProd) smTotalProd.innerText = `${totalProducts} Products`;
        if (smTotalUnits) smTotalUnits.innerText = `${totalStockUnits.toLocaleString()} Units`;
        if (smHealthy) smHealthy.innerText = `${healthyCount} Items`;
        if (smLow) smLow.innerText = `${lowStockCount} Items`;
        if (smOut) smOut.innerText = `${outOfStockCount} Items`;

        filterStockManagementTable();
    } catch (err) {
        console.error('Error loading stock management view:', err);
    }
}

function filterStockManagementTable() {
    const tbody = document.querySelector('#table-stock-management tbody');
    if (!tbody) return;

    const searchTerm = (document.getElementById('stock-search-input')?.value || '').toLowerCase().trim();
    const filterStatus = (document.getElementById('stock-filter-status')?.value || 'ALL');

    const filtered = allStockProductsList.filter(p => {
        const stock = p.StockQuantity || 0;
        const matchesSearch = !searchTerm ||
            (p.ProductID && p.ProductID.toLowerCase().includes(searchTerm)) ||
            (p.ProductName && p.ProductName.toLowerCase().includes(searchTerm)) ||
            (p.Brand && p.Brand.toLowerCase().includes(searchTerm)) ||
            (p.Category && p.Category.toLowerCase().includes(searchTerm));

        let matchesStatus = true;
        if (filterStatus === 'HEALTHY') matchesStatus = stock > 20;
        else if (filterStatus === 'LOW') matchesStatus = stock > 0 && stock <= 20;
        else if (filterStatus === 'OUT') matchesStatus = stock <= 0;

        return matchesSearch && matchesStatus;
    });

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 20px;">No warehouse products match your filter criteria.</td></tr>`;
        return;
    }

    tbody.innerHTML = filtered.map(p => {
        const stock = p.StockQuantity || 0;
        let stockBadge = '';
        if (stock > 20) {
            stockBadge = `<span class="badge badge-emerald" style="font-weight: 700;">🟢 ${stock} Units (In Stock)</span>`;
        } else if (stock > 0) {
            stockBadge = `<span class="badge" style="background: rgba(245, 158, 11, 0.15); color: #f59e0b; border: 1px solid rgba(245, 158, 11, 0.3); font-weight: 700;">🟠 ${stock} Units (Low Stock Warning!)</span>`;
        } else {
            stockBadge = `<span class="badge badge-rose" style="font-weight: 800;">🔴 0 Units (OUT OF STOCK - RESTOCK NEEDED!)</span>`;
        }

        const imgThumb = window.renderProductImageHTML ? window.renderProductImageHTML(p.ImageURL, '📦', '28px', '28px') : '📦';

        return `
            <tr>
                <td><code>${p.ProductID}</code></td>
                <td>
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <div style="width: 28px; height: 28px; border-radius: 4px; overflow: hidden; background: rgba(15,23,42,0.8); display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0;">${imgThumb}</div>
                        <strong style="color: var(--text-bright);">${escapeHtml(p.ProductName)}</strong>
                    </div>
                </td>
                <td>
                    <span class="badge badge-indigo">${escapeHtml(p.Category)}</span>
                    <div style="font-size: 10px; color: var(--text-muted); margin-top: 2px;">Brand: <strong>${escapeHtml(p.Brand || 'Shoplytics')}</strong></div>
                </td>
                <td><strong style="color: var(--primary-cyan); font-size: 13px;">$${parseFloat(p.Price).toFixed(2)}</strong></td>
                <td>${stockBadge}</td>
                <td>
                    <div style="display: flex; align-items: center; gap: 6px;">
                        <input type="number" class="form-input" id="stock-input-${p.ProductKey}" value="${stock}" min="0" style="width: 80px; padding: 3px 6px; font-size: 11px; text-align: center;">
                        <button class="btn btn-primary" style="padding: 4px 10px; font-size: 11px;" onclick="updateStockDirect(${p.ProductKey})">
                            Save
                        </button>
                        <button class="btn btn-outline" style="padding: 4px 8px; font-size: 11px; color: var(--accent-emerald); border-color: rgba(16, 185, 129, 0.4);" onclick="quickRestockProduct(${p.ProductKey}, ${stock})">
                            + Add 50
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

async function updateStockDirect(productKey) {
    const input = document.getElementById(`stock-input-${productKey}`);
    if (!input) return;
    const newStock = parseInt(input.value);
    if (isNaN(newStock) || newStock < 0) {
        alert('Please enter a valid non-negative stock quantity number.');
        return;
    }

    try {
        const token = localStorage.getItem('shoplytics_token');
        const res = await fetch(`/api/admin/products/${productKey}/restock`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ stockQuantity: newStock })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Stock update failed');
        alert(`✅ Warehouse stock updated successfully to ${newStock} units!`);
        loadStockManagementView();
        fetchAdminProducts();
        if (window.loadStoreProducts) window.loadStoreProducts();
    } catch (err) {
        alert('Stock update failed: ' + err.message);
    }
}

/* Admin Sub-Tab Switching Logic */
function switchAdminSubTab(subtab, btnElement = null) {
    document.querySelectorAll('.admin-subtab-view').forEach(view => view.style.display = 'none');
    document.querySelectorAll('.admin-subtab').forEach(btn => btn.classList.remove('active'));

    const targetView = document.getElementById(`admin-subtab-${subtab}`);
    if (targetView) targetView.style.display = 'block';

    if (btnElement) {
        btnElement.classList.add('active');
    } else {
        const activeBtn = document.querySelector(`.admin-subtab[data-subtab="${subtab}"]`);
        if (activeBtn) activeBtn.classList.add('active');
    }

    if (subtab === 'olap') {
        loadWarehouseOlapView();
    } else if (subtab === 'apriori') {
        loadAdminAprioriView();
    } else if (subtab === 'stock') {
        fetchAdminProducts();
    } else if (subtab === 'orders') {
        loadAdminOrders();
    }
}

/* Data Warehouse OLAP Engine Logic */
let adminOlapChartInstance = null;
let currentOlapOp = 'ROLLUP';

async function loadWarehouseOlapView() {
    await runOlapQuery(currentOlapOp);
}

async function runOlapQuery(operation = 'ROLLUP', btnElement = null) {
    currentOlapOp = operation;

    if (btnElement) {
        document.querySelectorAll('#olap-op-buttons .olap-op-btn').forEach(b => b.classList.remove('active'));
        btnElement.classList.add('active');
    }

    const statusEl = document.getElementById('olap-query-status');
    if (statusEl) statusEl.innerText = `Active Operation: ${operation}`;

    const sliceCat = document.getElementById('olap-slice-cat')?.value || 'Electronics';
    const diceReg = document.getElementById('olap-dice-region')?.value || 'North America';

    try {
        const res = await fetch('/api/olap/query', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                operation,
                sliceCategory: sliceCat,
                diceCategory: sliceCat,
                diceRegion: diceReg
            })
        });

        if (!res.ok) throw new Error('OLAP query execution failed');
        const data = await res.json();
        const results = data.data || [];

        // Update Row Count
        const countBadge = document.getElementById('olap-rows-count');
        if (countBadge) countBadge.innerText = `${results.length} Rows`;

        // Render Table
        const tbody = document.getElementById('tbody-admin-olap');
        const thead = document.getElementById('thead-admin-olap');

        if (operation === 'PIVOT') {
            if (thead) {
                thead.innerHTML = `
                    <tr>
                        <th>Category</th>
                        <th>Q1 Revenue</th>
                        <th>Q2 Revenue</th>
                        <th>Q3 Revenue</th>
                        <th>Q4 Revenue</th>
                        <th>Total Revenue</th>
                    </tr>
                `;
            }
            if (tbody) {
                tbody.innerHTML = results.map(r => `
                    <tr>
                        <td><strong>${escapeHtml(r.Dimension || r.Category)}</strong></td>
                        <td>$${(r.Q1_Revenue || 0).toFixed(2)}</td>
                        <td>$${(r.Q2_Revenue || 0).toFixed(2)}</td>
                        <td>$${(r.Q3_Revenue || 0).toFixed(2)}</td>
                        <td>$${(r.Q4_Revenue || 0).toFixed(2)}</td>
                        <td><strong style="color: var(--primary-cyan);">$${(r.TotalRevenue || 0).toFixed(2)}</strong></td>
                    </tr>
                `).join('');
            }
        } else {
            if (thead) {
                thead.innerHTML = `
                    <tr>
                        <th>Dimension</th>
                        <th>Total Orders</th>
                        <th>Total Revenue ($)</th>
                        <th>Total Units Sold</th>
                    </tr>
                `;
            }
            if (tbody) {
                tbody.innerHTML = results.map(r => `
                    <tr>
                        <td><strong>${escapeHtml(r.Dimension || 'N/A')}</strong></td>
                        <td>${r.TotalOrders || 0}</td>
                        <td><strong style="color: var(--accent-emerald);">$${(r.TotalRevenue || 0).toFixed(2)}</strong></td>
                        <td>${r.TotalUnits || 0}</td>
                    </tr>
                `).join('');
            }
        }

        // Render Chart
        renderAdminOlapChart(results, operation);
    } catch (err) {
        console.error('OLAP query error:', err);
    }
}

function renderAdminOlapChart(data, operation) {
    const ctx = document.getElementById('chart-admin-olap');
    if (!ctx) return;

    if (adminOlapChartInstance) {
        adminOlapChartInstance.destroy();
    }

    const labels = data.map(d => d.Dimension || d.Category || 'Unknown');
    let datasets = [];

    if (operation === 'PIVOT') {
        datasets = [
            { label: 'Q1 Revenue', data: data.map(d => d.Q1_Revenue || 0), backgroundColor: '#06b6d4' },
            { label: 'Q2 Revenue', data: data.map(d => d.Q2_Revenue || 0), backgroundColor: '#3b82f6' },
            { label: 'Q3 Revenue', data: data.map(d => d.Q3_Revenue || 0), backgroundColor: '#8b5cf6' },
            { label: 'Q4 Revenue', data: data.map(d => d.Q4_Revenue || 0), backgroundColor: '#10b981' }
        ];
    } else {
        datasets = [
            {
                label: 'Total Revenue ($)',
                data: data.map(d => d.TotalRevenue || 0),
                backgroundColor: 'rgba(6, 182, 212, 0.6)',
                borderColor: '#06b6d4',
                borderWidth: 2,
                borderRadius: 4
            }
        ];
    }

    adminOlapChartInstance = new Chart(ctx, {
        type: operation === 'DRILLDOWN' ? 'line' : 'bar',
        data: { labels, datasets },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { labels: { color: '#94a3b8' } }
            },
            scales: {
                x: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.05)' } },
                y: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.05)' } }
            }
        }
    });
}

/* Apriori Mining Suite & Simulator Logic */
let adminAprioriChartInstance = null;
let currentAprioriRules = [];

async function loadAdminAprioriView() {
    await fetchAdminAprioriRules();
    await populateSimulatorDropdowns();
}

async function fetchAdminAprioriRules() {
    try {
        const res = await fetch('/api/apriori/rules');
        if (!res.ok) throw new Error('Failed to load Apriori rules');
        currentAprioriRules = await res.json();

        const badge = document.getElementById('admin-rules-count-badge');
        if (badge) badge.innerText = `${currentAprioriRules.length} Rules Mined`;

        const tbody = document.querySelector('#table-admin-apriori-rules tbody');
        if (!tbody) return;

        if (currentAprioriRules.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 20px;">No association rules mined. Lower thresholds and run mining.</td></tr>`;
            return;
        }

        tbody.innerHTML = currentAprioriRules.map(r => {
            const antecedents = Array.isArray(r.Antecedents) ? r.Antecedents.join(', ') : r.Antecedents;
            const consequents = Array.isArray(r.Consequents) ? r.Consequents.join(', ') : r.Consequents;
            const lift = r.Lift ? r.Lift.toFixed(2) : '1.00';
            const confidence = r.Confidence ? (r.Confidence * 100).toFixed(1) : '0';
            const support = r.Support ? (r.Support * 100).toFixed(1) : '0';

            let strengthBadge = '';
            if (r.RuleStrength === 'Strong' || r.Lift >= 2.0) {
                strengthBadge = `<span class="badge badge-emerald">🔥 Strong</span>`;
            } else if (r.RuleStrength === 'Moderate' || r.Lift >= 1.2) {
                strengthBadge = `<span class="badge badge-amber">⚡ Moderate</span>`;
            } else {
                strengthBadge = `<span class="badge badge-indigo">💡 Emerging</span>`;
            }

            return `
                <tr>
                    <td><strong style="color: var(--text-bright);">${escapeHtml(antecedents)}</strong></td>
                    <td><strong style="color: var(--primary-cyan);">${escapeHtml(consequents)}</strong></td>
                    <td>${support}%</td>
                    <td>${confidence}%</td>
                    <td><strong style="color: #f59e0b;">${lift}x</strong></td>
                    <td>${strengthBadge}</td>
                </tr>
            `;
        }).join('');

        renderAdminAprioriChart(currentAprioriRules);
    } catch (err) {
        console.error('Apriori rules load error:', err);
    }
}

async function runAdminAprioriMining() {
    const minSupport = parseFloat(document.getElementById('input-admin-support')?.value || '0.03');
    const minConfidence = parseFloat(document.getElementById('input-admin-confidence')?.value || '0.25');

    try {
        const res = await fetch('/api/apriori/mine', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ minSupport, minConfidence })
        });

        if (!res.ok) throw new Error('Apriori mining execution failed');
        const data = await res.json();

        alert(`🎉 Apriori Mining Execution Complete!\nMined ${data.rulesCount || 0} association rules across ${data.totalTransactions || 0} baskets.`);
        loadAdminAprioriView();
    } catch (err) {
        alert('Mining Error: ' + err.message);
    }
}

function renderAdminAprioriChart(rules) {
    const ctx = document.getElementById('chart-admin-apriori');
    if (!ctx) return;

    if (adminAprioriChartInstance) {
        adminAprioriChartInstance.destroy();
    }

    const topRules = rules.slice(0, 8);
    const labels = topRules.map(r => `${r.Antecedents?.[0] || 'A'} ➔ ${r.Consequents?.[0] || 'B'}`);
    const lifts = topRules.map(r => r.Lift || 1.0);

    adminAprioriChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                label: 'Lift Score (x)',
                data: lifts,
                backgroundColor: 'rgba(245, 158, 11, 0.7)',
                borderColor: '#f59e0b',
                borderWidth: 1.5,
                borderRadius: 4
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { labels: { color: '#94a3b8' } }
            },
            scales: {
                x: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.05)' } },
                y: { ticks: { color: '#94a3b8', font: { size: 10 } }, grid: { color: 'rgba(255,255,255,0.05)' } }
            }
        }
    });
}

async function populateSimulatorDropdowns() {
    try {
        const res = await fetch('/api/products');
        if (!res.ok) return;
        const products = await res.json();

        const select1 = document.getElementById('sim-basket-product-1');
        const select2 = document.getElementById('sim-basket-product-2');
        if (!select1 || !select2) return;

        const optionsHtml = `<option value="">-- Select Product --</option>` + products.map(p => `
            <option value="${p.ProductID}">${escapeHtml(p.ProductName)} (${p.ProductID})</option>
        `).join('');

        select1.innerHTML = optionsHtml;
        select2.innerHTML = optionsHtml;
    } catch (e) {
        console.error('Simulator products load error:', e);
    }
}

async function simulateAprioriBasket() {
    const p1 = document.getElementById('sim-basket-product-1')?.value;
    const p2 = document.getElementById('sim-basket-product-2')?.value;
    const container = document.getElementById('sim-results-container');
    if (!container) return;

    const basket = [p1, p2].filter(Boolean);
    if (basket.length === 0) {
        container.innerHTML = `<div style="font-size: 12px; color: #f59e0b; text-align: center;">Please select at least 1 product to test recommendations.</div>`;
        return;
    }

    try {
        const res = await fetch('/api/recommendations/cart', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cartProductIds: basket })
        });

        const data = await res.json();
        const recs = Array.isArray(data) ? data : (data.recommendations || []);
        const triggers = data.ruleTriggers || [];

        if (recs.length === 0) {
            container.innerHTML = `<div style="font-size: 12px; color: var(--text-muted); text-align: center;">No specific Apriori rules triggered for this basket combination.</div>`;
            return;
        }

        const triggersMarkup = triggers.length > 0 ? `
            <div style="font-size: 11px; color: var(--primary-cyan); margin-bottom: 8px;">
                <strong>⚡ Triggered Rules:</strong> ${triggers.map(t => `${t.triggeredBy.join('+')} ➔ ${t.recommended} (Lift: ${t.lift}x)`).join(' | ')}
            </div>
        ` : '';

        const recsMarkup = recs.map(p => `
            <div style="display: flex; align-items: center; justify-content: space-between; background: rgba(255,255,255,0.03); padding: 8px 12px; border-radius: 6px; margin-top: 6px; border: 1px solid var(--border-color);">
                <div>
                    <strong style="font-size: 12px; color: var(--text-bright);">${escapeHtml(p.ProductName)}</strong>
                    <div style="font-size: 10px; color: var(--text-muted);">${p.Category} • ⭐ ${p.PopularityRating}</div>
                </div>
                <span style="font-weight: 700; color: var(--accent-emerald); font-size: 12px;">$${parseFloat(p.Price).toFixed(2)}</span>
            </div>
        `).join('');

        container.innerHTML = `
            ${triggersMarkup}
            <div style="font-size: 11px; font-weight: 700; color: var(--text-bright); margin-bottom: 4px;">Recommended Products Output:</div>
            ${recsMarkup}
        `;
    } catch (err) {
        container.innerHTML = `<div style="color: var(--accent-rose); font-size: 12px;">Simulation Error: ${err.message}</div>`;
    }
}

/* Data Architecture & 3D OLAP Cube Visualizer Logic */
function switchDataArchTab(archTab, btnElement = null) {
    document.querySelectorAll('.arch-view-container').forEach(view => view.style.display = 'none');
    document.querySelectorAll('.data-arch-tab').forEach(btn => {
        btn.style.background = 'rgba(255, 255, 255, 0.05)';
        btn.style.borderColor = 'rgba(255, 255, 255, 0.15)';
        btn.style.color = 'var(--text-bright)';
        btn.style.fontWeight = '500';
    });

    const targetView = document.getElementById(`arch-view-${archTab}`);
    if (targetView) targetView.style.display = 'block';

    const activeBtn = btnElement || document.querySelector(`.data-arch-tab[data-archtab="${archTab}"]`);
    if (activeBtn) {
        activeBtn.style.background = 'linear-gradient(135deg, #d97706, #f59e0b)';
        activeBtn.style.borderColor = '#f59e0b';
        activeBtn.style.color = '#0f172a';
        activeBtn.style.fontWeight = '800';
    }
}

const olapCubeFaceDetails = {
    'Customer': {
        title: 'Customer Axis',
        icon: '👤',
        color: '#8b5cf6',
        description: 'A category-specific hierarchy: <strong>Region (North/South/East/West)</strong> ➔ <strong>Customer Segment (VIP/Regular/New)</strong> ➔ <strong>Customer Profile (Age, Gender, Email)</strong>. This allows slicing customer revenue by demographic tier or region instead of querying single transactions.'
    },
    'Product': {
        title: 'Product Axis',
        icon: '📦',
        color: '#06b6d4',
        description: 'A catalog hierarchy: <strong>Category (Electronics / Home / Fashion)</strong> ➔ <strong>Brand (Shoplytics/Partner)</strong> ➔ <strong>Individual SKU Product</strong>. Slicing on this axis allows product category profitability analysis across warehouse hubs.'
    },
    'Time': {
        title: 'Time Axis',
        icon: '📅',
        color: '#10b981',
        description: 'A temporal hierarchy: <strong>Year (2026)</strong> ➔ <strong>Quarter (Q1-Q4)</strong> ➔ <strong>Month</strong> ➔ <strong>Day of Week</strong> ➔ <strong>IsWeekend</strong>. Enables roll-up aggregation from daily sales trends to annual financial reports.'
    },
    'Measures': {
        title: 'Sales & Revenue Measures Axis',
        icon: '💵',
        color: '#f59e0b',
        description: 'Quantitative analytical facts: <strong>Total Revenue ($)</strong>, <strong>Subtotal</strong>, <strong>Quantity Units Sold</strong>, <strong>Tax & Delivery Fees</strong>, and <strong>Discount Amounts</strong> aggregated across any slice of dimensions.'
    },
    'Channel': {
        title: 'Channel & Location Axis',
        icon: '🏬',
        color: '#3b82f6',
        description: 'Fulfillment & Touchpoint hierarchy: <strong>Sales Channel (Web App / Mobile / Store)</strong> ➔ <strong>Warehouse Hub Depot</strong> ➔ <strong>Shipping Address Destination</strong>. Slicing isolates mobile app sales from desktop.'
    },
    'Behavior': {
        title: 'User Behavior & Session Axis',
        icon: '⚡',
        color: '#f43f5e',
        description: 'Customer digital engagement metrics: <strong>Session Duration (Sec)</strong> ➔ <strong>Page Views Count</strong> ➔ <strong>Cart Additions</strong> ➔ <strong>Device Type</strong>. Used to correlate online browsing duration with order conversion rate.'
    }
};

function selectOlapCubeFace(faceName, element = null) {
    const cube = document.getElementById('olap-3d-cube-object');
    if (cube) {
        cube.style.animationPlayState = 'paused';
    }

    const panel = document.getElementById('olap-cube-details-panel');
    const details = olapCubeFaceDetails[faceName] || olapCubeFaceDetails['Customer'];

    if (panel) {
        panel.innerHTML = `
            <div style="border-left: 4px solid ${details.color}; padding-left: 12px; margin-bottom: 12px;">
                <h4 style="color: ${details.color}; font-size: 18px; font-weight: 800; font-family: 'Inter', serif, sans-serif; margin-bottom: 6px;">
                    ${details.icon} ${details.title}
                </h4>
                <p style="font-size: 13px; color: var(--text-bright); line-height: 1.6; margin: 0;">
                    ${details.description}
                </p>
            </div>
            <div style="font-size: 12px; color: var(--text-dim); margin-top: 14px; background: rgba(0,0,0,0.3); padding: 10px; border-radius: 6px; border: 1px dashed rgba(255,255,255,0.1);">
                💡 <em>Click anywhere else on the 3D cube face to view another dimension, or click "Resume rotation" below to unpause.</em>
            </div>
            <div style="margin-top: 16px;">
                <button class="btn btn-outline" style="padding: 8px 18px; font-size: 12px; color: var(--primary-cyan); border-color: rgba(6, 182, 212, 0.4); border-radius: 20px;" onclick="resumeOlapCubeRotation()">
                    ▶ Resume Rotation
                </button>
            </div>
        `;
    }
}

function resumeOlapCubeRotation() {
    const cube = document.getElementById('olap-3d-cube-object');
    if (cube) {
        cube.style.animationPlayState = 'running';
    }

    const panel = document.getElementById('olap-cube-details-panel');
    if (panel) {
        panel.innerHTML = `
            <h4 style="color: #f59e0b; font-size: 17px; font-weight: 800; font-family: 'Inter', serif, sans-serif; margin-bottom: 8px;">
                Click a face to explore
            </h4>
            <p style="font-size: 13px; color: var(--text-muted); line-height: 1.6; margin-bottom: 12px;">
                Each face of this cube represents one analysis dimension. Real OLAP cubes let you <strong>"slice"</strong> (fix one dimension), <strong>"dice"</strong> (select a sub-cube), and <strong>"drill down"</strong> (go from Region ➔ State ➔ Customer, or Year ➔ Quarter ➔ Month) to explore data at any level of detail.
            </p>
            <div style="font-size: 12px; color: var(--text-dim); background: rgba(255,255,255,0.03); padding: 10px; border-radius: 6px;">
                🔄 Cube auto-rotates in 3D space. Click any colored face to pause rotation and read details.
            </div>
        `;
    }
}

window.loadStockManagementView = loadStockManagementView;
window.filterStockManagementTable = filterStockManagementTable;
window.updateStockDirect = updateStockDirect;
window.loadAdminOrders = loadAdminOrders;
window.openAdminOrderRecordModal = openAdminOrderRecordModal;
window.closeAdminOrderRecordModal = closeAdminOrderRecordModal;
window.switchAdminSubTab = switchAdminSubTab;
window.loadWarehouseOlapView = loadWarehouseOlapView;
window.runOlapQuery = runOlapQuery;
window.loadAdminAprioriView = loadAdminAprioriView;
window.runAdminAprioriMining = runAdminAprioriMining;
window.simulateAprioriBasket = simulateAprioriBasket;
window.switchDataArchTab = switchDataArchTab;
window.selectOlapCubeFace = selectOlapCubeFace;
window.resumeOlapCubeRotation = resumeOlapCubeRotation;


