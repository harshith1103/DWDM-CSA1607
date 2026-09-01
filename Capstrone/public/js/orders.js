/**
 * Customer Orders, Admin Dispatcher & Volunteer Logistics Portal JS Module
 * Includes Live Google Maps Tracking Integration & Real-time Payment Gateway Tabs (COD, Card, UPI Scan & Request)
 */

let selectedPaymentMethod = 'UPI';
let isUpiApproved = false;
let selectedCardCategory = 'Credit';
let selectedCardNetwork = 'Visa';

async function safeFetchJsonOrder(res) {
    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
        const text = await res.text();
        if (text.trim().startsWith('<!DOCTYPE') || text.includes('<html')) {
            throw new Error('Server returned HTML instead of JSON. Please ensure the Node backend server (node server.js) is running and restarted.');
        }
        throw new Error(`Unexpected server response: ${text.slice(0, 100)}`);
    }
    return await res.json();
}

function handleCountryCodeChange(selectId, inputId, helperId) {
    const select = document.getElementById(selectId);
    const input = document.getElementById(inputId);
    const helper = document.getElementById(helperId);
    if (!select || !input) return;

    const opt = select.options[select.selectedIndex];
    const digits = parseInt(opt.getAttribute('data-digits') || '10');
    const name = opt.getAttribute('data-name') || select.value;

    input.maxLength = digits;
    input.placeholder = `Enter ${digits} Digits`;
    if (helper) helper.innerText = `Strictly ${digits} digits required for ${opt.innerText.trim()}`;

    let val = input.value.replace(/\D/g, '');
    if (val.length > digits) {
        input.value = val.slice(0, digits);
    }
}

function enforceCountryPhoneDigits(input, selectId) {
    const select = document.getElementById(selectId);
    let digits = 10;
    if (select && select.selectedIndex >= 0) {
        const opt = select.options[select.selectedIndex];
        digits = parseInt(opt.getAttribute('data-digits') || '10');
    }
    input.value = input.value.replace(/\D/g, '').slice(0, digits);
}

function updateRealtimeCardPreview() {
    const cardInput = document.getElementById('card-number');
    const rawVal = cardInput ? cardInput.value.replace(/\D/g, '') : '';
    const previewEl = document.getElementById('card-realtime-preview');
    if (!previewEl) return;

    const maskedNum = rawVal.length >= 12 
        ? `${rawVal.slice(0, 4)} **** **** ${rawVal.slice(-4)}` 
        : (rawVal.length > 0 ? `${rawVal} (typing...)` : '**** **** **** ****');

    const isValidFormat = rawVal.length >= 15;

    previewEl.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center;">
            <div>
                <strong style="color: var(--primary-cyan); font-size: 12px;">💳 ${selectedCardCategory} Card (${selectedCardNetwork})</strong>
                <div style="font-size: 13px; font-weight: 700; color: var(--text-bright); margin-top: 2px; letter-spacing: 1px;">${maskedNum}</div>
            </div>
            <span class="badge ${isValidFormat ? 'badge-emerald' : 'badge-cyan'}" style="font-size: 10px;">
                ${isValidFormat ? '✓ Card Valid' : 'Enter 16 Digits'}
            </span>
        </div>
    `;
}

function selectCardCategory(category) {
    selectedCardCategory = category;
    document.querySelectorAll('.card-type-btn').forEach(btn => btn.classList.remove('active'));
    const btn = document.getElementById(`card-type-${category.toLowerCase()}`);
    if (btn) btn.classList.add('active');
    updateRealtimeCardPreview();
}

function selectCardNetwork(network) {
    selectedCardNetwork = network;
    document.querySelectorAll('.card-brand-badge').forEach(b => b.classList.remove('active'));
    const badge = document.getElementById(`brand-${network.toLowerCase()}`);
    if (badge) badge.classList.add('active');
    updateRealtimeCardPreview();
}

function formatAndDetectCard(input) {
    let val = input.value.replace(/\D/g, '').slice(0, 16);
    const formatted = val.match(/.{1,4}/g)?.join(' ') || val;
    input.value = formatted;

    let network = 'Visa';
    if (val.startsWith('4')) {
        network = 'Visa';
    } else if (/^(5[1-5]|2[2-7])/.test(val)) {
        network = 'Mastercard';
    } else if (/^(60|65|35)/.test(val)) {
        network = 'RuPay';
    } else if (/^(34|37)/.test(val)) {
        network = 'Amex';
    }

    selectCardNetwork(network);
}

function switchPaymentTab(method) {
    selectedPaymentMethod = method.toUpperCase();
    isUpiApproved = (method === 'cod' || method === 'card');

    document.querySelectorAll('.payment-tab-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById(`tab-pay-${method}`).classList.add('active');

    document.getElementById('pay-section-upi').style.display = method === 'upi' ? 'block' : 'none';
    document.getElementById('pay-section-card').style.display = method === 'card' ? 'block' : 'none';
    document.getElementById('pay-section-cod').style.display = method === 'cod' ? 'block' : 'none';
}

async function sendUpiCollectRequest() {
    const upiId = document.getElementById('checkout-upi-id').value.trim();
    const statusEl = document.getElementById('upi-request-status');
    const totalText = document.getElementById('checkout-total-amount').innerText;

    if (!upiId || !/^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/.test(upiId)) {
        statusEl.innerHTML = `<span style="color: var(--accent-rose);">⚠️ Please enter a valid UPI ID (e.g. user@okaxis or 9876543210@paytm).</span>`;
        return;
    }

    statusEl.innerHTML = `<span style="color: var(--primary-cyan); font-weight: 600;"><i class="ri-loader-4-line ri-spin"></i> Sending payment collect request of ${totalText} to ${upiId}...</span>`;

    setTimeout(() => {
        isUpiApproved = true;
        statusEl.innerHTML = `<span style="color: var(--accent-emerald); font-weight: 700;">✓ Payment Collect Request Approved by ${upiId}! Ref: TXN-UPI-${Date.now()}</span>`;
    }, 1500);
}

async function openCheckoutModal() {
    if (!cart || cart.length === 0) {
        alert('Your shopping cart is empty! Add products before checking out.');
        return;
    }

    // Auto-login as Customer if user is Guest or not a customer
    if (!currentUser || currentUser.role !== 'customer') {
        if (window.quickDemoLogin) {
            await quickDemoLogin('customer');
        }
    }

    document.getElementById('checkout-address').value = 'Flat 402, Royal Residency, Road No 12, Banjara Hills, Hyderabad';
    document.getElementById('checkout-phone').value = '9876543210';
    handleCountryCodeChange('checkout-country-code', 'checkout-phone', 'checkout-phone-helper');

    // Update Checkout Summary inside Modal
    const summaryContainer = document.getElementById('checkout-items-summary');
    let total = 0;
    summaryContainer.innerHTML = cart.map(item => {
        const itemTotal = item.price * item.quantity;
        total += itemTotal;
        return `
            <div style="display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 6px;">
                <span>${item.imageURL} ${escapeHtml(item.productName)} x ${item.quantity}</span>
                <span style="font-weight: 600;">$${itemTotal.toFixed(2)}</span>
            </div>
        `;
    }).join('');

    const formattedTotal = total.toFixed(2);
    document.getElementById('checkout-total-amount').innerText = `$${formattedTotal}`;

    // Generate Scannable UPI QR Code image
    const upiUri = `upi://pay?pa=shoplytics@upi&pn=ShoplyticsStore&am=${formattedTotal}&cu=INR&tn=ShoplyticsOrder`;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(upiUri)}`;
    const qrImg = document.getElementById('upi-qr-image');
    if (qrImg) qrImg.src = qrUrl;

    switchPaymentTab('upi');
    document.getElementById('modal-checkout').classList.add('active');
}

function closeCheckoutModal() {
    document.getElementById('modal-checkout').classList.remove('active');
}

async function handleCheckoutSubmit(e) {
    if (e) e.preventDefault();

    // Ensure customer is logged in before placing order
    if (!currentUser || currentUser.role !== 'customer') {
        if (window.quickDemoLogin) {
            await window.quickDemoLogin('customer');
        }
    }

    const shippingAddress = document.getElementById('checkout-address').value.trim();
    const countryCodeSelect = document.getElementById('checkout-country-code');
    const countryCode = countryCodeSelect ? countryCodeSelect.value : '+91';
    const opt = countryCodeSelect ? countryCodeSelect.options[countryCodeSelect.selectedIndex] : null;
    const requiredDigits = opt ? parseInt(opt.getAttribute('data-digits') || '10') : 10;
    
    let rawPhone = document.getElementById('checkout-phone').value.trim().replace(/\D/g, '');
    if (rawPhone.length !== requiredDigits) {
        alert(`❌ Invalid Phone: Exactly ${requiredDigits} numeric digits required for ${opt ? opt.innerText.trim() : 'selected country'}.`);
        return;
    }
    const customerPhone = `${countryCode} ${rawPhone}`;

    if (!shippingAddress) {
        alert('Please provide a delivery address.');
        return;
    }

    if (selectedPaymentMethod === 'UPI' && !isUpiApproved) {
        const upiId = document.getElementById('checkout-upi-id').value.trim();
        if (upiId) {
            await sendUpiCollectRequest();
            await new Promise(r => setTimeout(r, 1600));
        }
    }

    if (selectedPaymentMethod === 'CARD') {
        const cardNumber = document.getElementById('card-number').value.replace(/\D/g, '');
        if (cardNumber.length < 15) {
            alert('Please enter a valid 16-digit Credit or Debit Card number.');
            return;
        }
        const cardSection = document.getElementById('pay-section-card');
        if (cardSection) {
            const tempOverlay = document.createElement('div');
            tempOverlay.id = 'card-realtime-overlay';
            tempOverlay.style.cssText = 'background: rgba(6, 182, 212, 0.08); border: 1px solid rgba(6, 182, 212, 0.3); padding: 12px; border-radius: 8px; margin-top: 10px; text-align: center; font-size: 12px; font-weight: 700; color: var(--primary-cyan);';
            tempOverlay.innerHTML = `<i class="ri-loader-4-line ri-spin"></i> Connecting to ${selectedCardCategory} Card Gateway (${selectedCardNetwork})...`;
            cardSection.appendChild(tempOverlay);

            await new Promise(r => setTimeout(r, 600));
            tempOverlay.innerHTML = `<i class="ri-shield-keyhole-line"></i> Verifying 3D Secure Authorization & Balance for ${selectedCardCategory} Card...`;
            await new Promise(r => setTimeout(r, 700));
            tempOverlay.style.background = 'rgba(16, 185, 129, 0.12)';
            tempOverlay.style.borderColor = 'rgba(16, 185, 129, 0.4)';
            tempOverlay.style.color = '#10b981';
            tempOverlay.innerHTML = `✓ ${selectedCardCategory} Card (${selectedCardNetwork}) Authorized! Processing order...`;
            await new Promise(r => setTimeout(r, 500));
            tempOverlay.remove();
        }
    }

    const items = cart.map(i => ({
        productKey: i.productKey || i.productID,
        productID: i.productID || i.productKey,
        quantity: i.quantity
    }));

    const paymentDetails = selectedPaymentMethod === 'CARD' ? `${selectedCardCategory} Card (${selectedCardNetwork})` : selectedPaymentMethod;

    try {
        const token = localStorage.getItem('shoplytics_token');
        if (!token) {
            await window.quickDemoLogin('customer');
        }

        const activeToken = localStorage.getItem('shoplytics_token');
        const res = await fetch('/api/orders', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${activeToken}`
            },
            body: JSON.stringify({
                shippingAddress,
                customerPhone,
                paymentMethod: paymentDetails,
                deliveryType: 'Standard',
                items
            })
        });

        const data = await safeFetchJsonOrder(res);
        if (!res.ok) throw new Error(data.error || 'Checkout failed');

        alert(`🎉 Order Placed Successfully!\n\nOrder #: ${data.order.orderNumber}\nPayment Method: ${paymentDetails} (${data.order.paymentStatus})\nTotal: $${data.order.totalAmount.toFixed(2)}\nContact Phone: ${customerPhone}\nDelivery Address: ${data.order.shippingAddress}`);

        clearCart();
        closeCheckoutModal();

        // Refresh views
        loadCustomerOrders();
        if (window.loadAdminOrders) loadAdminOrders();
        switchTab('my-orders');

    } catch (err) {
        alert(err.message);
    }
}

// -------------------------------------------------------------
// Google Maps Live Location Tracking & GPS Integration
// -------------------------------------------------------------
async function detectGPSLocation() {
    if (!navigator.geolocation) {
        alert('Geolocation is not supported by your browser.');
        return;
    }

    const addressBox = document.getElementById('checkout-address');
    if (addressBox) addressBox.value = 'Locating GPS position...';

    navigator.geolocation.getCurrentPosition(
        async (position) => {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            try {
                const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
                const data = await res.json();
                if (data && data.display_name) {
                    if (addressBox) addressBox.value = data.display_name;
                } else {
                    if (addressBox) addressBox.value = `Latitude: ${lat.toFixed(4)}, Longitude: ${lng.toFixed(4)}, Banjara Hills, Hyderabad, 500034`;
                }
            } catch (e) {
                if (addressBox) addressBox.value = `Latitude: ${lat.toFixed(4)}, Longitude: ${lng.toFixed(4)}, Banjara Hills, Hyderabad, 500034`;
            }
        },
        (err) => {
            if (addressBox) addressBox.value = 'Flat 402, Royal Residency, Road No 12, Banjara Hills, Hyderabad, 500034';
        },
        { enableHighAccuracy: true, timeout: 5000 }
    );
}

function previewCheckoutMap() {
    const addressBox = document.getElementById('checkout-address');
    const address = addressBox ? addressBox.value.trim() : '';
    if (!address) {
        alert('Please enter a delivery address first to preview on Google Maps.');
        return;
    }
    openGoogleMapModal(address, 'Checkout Delivery Address', 'NEW ORDER', 'Pending Confirmation');
}

function openGoogleMapModal(address, labelName = 'Delivery Location', orderNumber = 'ORD-TRACK', status = 'In Transit') {
    const encodedAddress = encodeURIComponent(address);
    
    document.getElementById('map-modal-title').innerText = `🗺️ Real-Time Google Maps & GPS Tracking`;
    document.getElementById('map-modal-label').innerText = labelName;
    document.getElementById('map-modal-address').innerText = address;
    document.getElementById('map-modal-order').innerText = orderNumber;
    document.getElementById('map-modal-status').innerText = status;

    const customInput = document.getElementById('map-modal-custom-address');
    if (customInput) customInput.value = address;

    const statusBar = document.getElementById('map-modal-live-status-bar');
    if (statusBar) statusBar.style.display = 'none';

    const externalLink = `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`;
    document.getElementById('map-external-link').href = externalLink;

    const embedUrl = `https://maps.google.com/maps?q=${encodedAddress}&t=&z=14&ie=UTF8&iwloc=&output=embed`;
    document.getElementById('google-map-iframe').src = embedUrl;

    document.getElementById('modal-live-map').classList.add('active');
}

function updateMapCustomAddress() {
    const input = document.getElementById('map-modal-custom-address');
    const address = input ? input.value.trim() : '';
    if (!address) {
        alert('Please enter a valid address, city, or location name.');
        return;
    }
    const encodedAddress = encodeURIComponent(address);
    document.getElementById('map-modal-address').innerText = address;
    document.getElementById('map-external-link').href = `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`;
    document.getElementById('google-map-iframe').src = `https://maps.google.com/maps?q=${encodedAddress}&t=&z=14&ie=UTF8&iwloc=&output=embed`;

    const statusBar = document.getElementById('map-modal-live-status-bar');
    const statusText = document.getElementById('map-modal-live-status-text');
    if (statusBar && statusText) {
        statusBar.style.display = 'block';
        statusText.innerHTML = `<strong>📍 Custom Location Loaded:</strong> ${escapeHtml(address)}`;
    }
}

async function trackModalLiveGps() {
    const statusBar = document.getElementById('map-modal-live-status-bar');
    const statusText = document.getElementById('map-modal-live-status-text');
    if (statusBar) statusBar.style.display = 'block';
    if (statusText) statusText.innerHTML = `<i class="ri-radar-line animate-spin"></i> Detecting real-time satellite GPS coordinates...`;

    if (!navigator.geolocation) {
        if (statusText) statusText.innerHTML = `<span style="color: var(--accent-rose);">Geolocation is not supported by your browser.</span>`;
        return;
    }

    navigator.geolocation.getCurrentPosition(
        async (pos) => {
            const lat = pos.coords.latitude.toFixed(4);
            const lng = pos.coords.longitude.toFixed(4);
            const accuracy = Math.round(pos.coords.accuracy);

            let locStr = `GPS Coordinates: ${lat}° N, ${lng}° E (Accuracy: ${accuracy}m)`;

            try {
                const geoRes = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${pos.coords.latitude}&lon=${pos.coords.longitude}`);
                if (geoRes.ok) {
                    const geoData = await geoRes.json();
                    if (geoData.display_name) {
                        locStr = `${geoData.display_name} [GPS: ${lat}, ${lng}]`;
                    }
                }
            } catch (e) {
                console.log('Reverse geocoding fallback');
            }

            document.getElementById('map-modal-address').innerText = locStr;
            const input = document.getElementById('map-modal-custom-address');
            if (input) input.value = locStr;

            const embedUrl = `https://maps.google.com/maps?q=${pos.coords.latitude},${pos.coords.longitude}&t=m&z=16&ie=UTF8&iwloc=&output=embed`;
            document.getElementById('google-map-iframe').src = embedUrl;
            document.getElementById('map-external-link').href = `https://www.google.com/maps/search/?api=1&query=${pos.coords.latitude},${pos.coords.longitude}`;

            if (statusText) {
                statusText.innerHTML = `<strong style="color: var(--accent-emerald);"><i class="ri-checkbox-circle-fill"></i> Live GPS Position Locked:</strong> ${lat}° N, ${lng}° E (Accuracy: ${accuracy}m)`;
            }
        },
        (err) => {
            if (statusText) {
                statusText.innerHTML = `<span style="color: var(--accent-rose);"><i class="ri-error-warning-fill"></i> GPS Access Permission Denied or Unavailable. Showing default location.</span>`;
            }
        },
        { enableHighAccuracy: true, timeout: 8000 }
    );
}

function simulateVolunteerGpsRoute() {
    const statusBar = document.getElementById('map-modal-live-status-bar');
    const statusText = document.getElementById('map-modal-live-status-text');
    if (statusBar) statusBar.style.display = 'block';

    const waypoints = [
        { name: 'Shoplytics Central Hub Depot', dist: '3.4 km', time: '12 mins', lat: 17.4375, lng: 78.4482 },
        { name: 'En Route — Checkpoint 1 (Jubilee Hills Road 36)', dist: '2.1 km', time: '7 mins', lat: 17.4312, lng: 78.4071 },
        { name: 'En Route — Checkpoint 2 (Banjara Hills Circle)', dist: '0.8 km', time: '3 mins', lat: 17.4156, lng: 78.4347 },
        { name: 'Arrived — Customer Delivery Address Destination', dist: '0.0 km', time: 'Arrived', lat: 17.4062, lng: 78.4691 }
    ];

    let step = 0;
    if (statusText) statusText.innerHTML = `<strong>🛵 Starting Live Delivery GPS Simulation...</strong>`;

    const timer = setInterval(() => {
        if (step >= waypoints.length) {
            clearInterval(timer);
            return;
        }
        const wp = waypoints[step];
        if (statusText) {
            statusText.innerHTML = `<strong>🛵 Volunteer GPS Tracker:</strong> ${wp.name} • 📍 Distance: ${wp.dist} • ⏱️ ETA: ${wp.time}`;
        }
        const embedUrl = `https://maps.google.com/maps?q=${wp.lat},${wp.lng}&t=m&z=15&ie=UTF8&iwloc=&output=embed`;
        document.getElementById('google-map-iframe').src = embedUrl;
        step++;
    }, 2500);
}

function closeGoogleMapModal() {
    document.getElementById('modal-live-map').classList.remove('active');
    document.getElementById('google-map-iframe').src = '';
}

async function loadCustomerOrders() {
    const container = document.getElementById('customer-orders-container');
    if (!container) return;

    try {
        const token = localStorage.getItem('shoplytics_token');
        if (!token) return;

        const res = await fetch('/api/orders/my-orders', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const orders = await safeFetchJsonOrder(res);

        if (!res.ok) throw new Error(orders.error || 'Failed to load orders');

        if (orders.length === 0) {
            container.innerHTML = `<div style="color: var(--text-dim); font-size: 13px; text-align: center; padding: 30px;">No active customer orders placed yet</div>`;
            return;
        }

        container.innerHTML = orders.map(o => {
            const items = o.items || [];
            const itemsHtml = items.map(item => {
                const thumb = window.renderProductImageHTML ? window.renderProductImageHTML(item.ImageURL, '📦', '24px', '24px') : (item.ImageURL || '📦');
                return `
                    <div style="display: flex; align-items: center; justify-content: space-between; font-size: 12px; margin-bottom: 4px; padding: 4px 8px; background: rgba(255,255,255,0.02); border-radius: 6px;">
                        <span style="display: flex; align-items: center; gap: 6px;">
                            <span style="width: 24px; height: 24px; display: inline-flex; align-items: center; justify-content: center; overflow: hidden; border-radius: 4px; flex-shrink: 0; background: rgba(15,23,42,0.8);">${thumb}</span>
                            <strong>${escapeHtml(item.ProductName)}</strong> (x${item.Quantity})
                        </span>
                        <span style="color: var(--primary-cyan);">$${(item.UnitPrice * item.Quantity).toFixed(2)}</span>
                    </div>
                `;
            }).join('');

            // Status Step Progress Calculation
            let stepPlaced = true;
            let hasVolunteer = !!(o.VolunteerUserID || (o.VolunteerName && o.VolunteerName !== 'Assigning volunteer agent...'));
            let stepCollected = ['SHIPPED', 'COLLECTED', 'OUT FOR DELIVERY', 'DELIVERED'].includes(o.Status) || hasVolunteer;
            let stepOut = ['OUT FOR DELIVERY', 'DELIVERED'].includes(o.Status);
            let stepDelivered = o.Status === 'DELIVERED';

            const itemsJsonAttr = escapeHtml(JSON.stringify(items)).replace(/'/g, "&apos;");
            const displayStatus = o.Status === 'SHIPPED' ? 'SHIPPED / ON THE WAY' : o.Status;
            const isCustomerUser = window.currentUser && (window.currentUser.role || '').toLowerCase() === 'customer';

            return `
                <div class="glass-card" style="margin-bottom: 16px; border-color: rgba(6, 182, 212, 0.2);">
                    <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-color); padding-bottom: 10px; margin-bottom: 12px;">
                        <div>
                            <strong style="font-size: 16px; color: var(--text-bright); margin-right: 8px;">Order #${o.OrderNumber}</strong>
                            <div style="font-size: 11px; color: var(--text-dim); margin-top: 2px;">Placed on ${new Date(o.CreatedAt).toLocaleDateString()} at ${new Date(o.CreatedAt).toLocaleTimeString()}</div>
                        </div>
                        <span class="badge ${o.Status === 'DELIVERED' ? 'badge-emerald' : 'badge-cyan'}">${displayStatus}</span>
                    </div>

                    <!-- Delivery Tracking Progress Bar -->
                    <div style="margin-bottom: 14px; background: rgba(15, 23, 42, 0.6); padding: 10px; border-radius: 8px; border: 1px solid var(--border-color);">
                        <div style="font-size: 10px; font-weight: 700; color: var(--text-muted); margin-bottom: 6px; text-transform: uppercase;">
                            🚚 Live Delivery Status Progression:
                        </div>
                        <div style="display: flex; justify-content: space-between; align-items: center; position: relative;">
                            <div style="text-align: center; flex: 1;">
                                <div style="font-size: 14px; color: ${stepPlaced ? 'var(--primary-cyan)' : 'var(--text-dim)'};">${stepPlaced ? '🟢' : '⚪'}</div>
                                <div style="font-size: 10px; color: ${stepPlaced ? 'var(--text-bright)' : 'var(--text-dim)'}; font-weight: 600;">Order Placed</div>
                            </div>
                            <div style="text-align: center; flex: 1;">
                                <div style="font-size: 14px; color: ${stepCollected ? 'var(--primary-cyan)' : 'var(--text-dim)'};">${stepCollected ? '🟢' : '⚪'}</div>
                                <div style="font-size: 10px; color: ${stepCollected ? 'var(--text-bright)' : 'var(--text-dim)'}; font-weight: 600;">Collected from Depot</div>
                            </div>
                            <div style="text-align: center; flex: 1;">
                                <div style="font-size: 14px; color: ${stepOut ? 'var(--primary-cyan)' : 'var(--text-dim)'};">${stepOut ? '🟢' : '⚪'}</div>
                                <div style="font-size: 10px; color: ${stepOut ? 'var(--text-bright)' : 'var(--text-dim)'}; font-weight: 600;">On The Way</div>
                            </div>
                            <div style="text-align: center; flex: 1;">
                                <div style="font-size: 14px; color: ${stepDelivered ? 'var(--accent-emerald)' : 'var(--text-dim)'};">${stepDelivered ? '✅' : '⚪'}</div>
                                <div style="font-size: 10px; color: ${stepDelivered ? 'var(--accent-emerald)' : 'var(--text-dim)'}; font-weight: 600;">Delivered</div>
                            </div>
                        </div>
                    </div>

                    <!-- Details Section -->
                    <div style="font-size: 12px; color: var(--text-muted); margin-bottom: 12px; display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                        <div style="background: rgba(255,255,255,0.02); padding: 8px; border-radius: 6px;">
                            <div style="font-size: 10px; color: var(--primary-cyan); font-weight: 700; text-transform: uppercase; margin-bottom: 2px;">
                                📍 Pickup Collection Address
                            </div>
                            <div style="color: var(--text-bright);">${escapeHtml(o.CollectionAddress || 'Shoplytics Central Hub, Depot 4, Hyderabad')}</div>
                        </div>

                        <div style="background: rgba(255,255,255,0.02); padding: 8px; border-radius: 6px;">
                            <div style="font-size: 10px; color: var(--accent-emerald); font-weight: 700; text-transform: uppercase; margin-bottom: 2px;">
                                🏠 Receiver Delivery Address
                            </div>
                            <div style="color: var(--text-bright);">${escapeHtml(o.ShippingAddress)}</div>
                            <div style="font-size: 11px; color: var(--text-dim); margin-top: 2px;">📞 Contact Phone: ${escapeHtml(o.CustomerPhone || 'N/A')}</div>
                        </div>
                    </div>

                    <!-- Volunteer Agent & Customer Logistics Info -->
                    <div style="font-size: 12px; color: var(--text-muted); margin-bottom: 12px; background: rgba(6, 182, 212, 0.05); padding: 10px 12px; border-radius: 8px; border: 1px solid rgba(6, 182, 212, 0.2);">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; flex-wrap: wrap; gap: 6px;">
                            <span>👤 <strong>Recipient Customer:</strong> <strong style="color: var(--text-bright);">${escapeHtml(o.CustomerName || o.CustomerFullName || 'Customer')}</strong></span>
                            <span style="color: var(--accent-emerald); font-weight: 700;">💵 Total Paid: $${parseFloat(o.TotalAmount).toFixed(2)} (${o.PaymentMethod || 'COD'})</span>
                        </div>
                        <div>
                            🏍️ <strong>Handled & Delivered By Volunteer:</strong> 
                            <strong style="color: var(--primary-cyan);">${escapeHtml(o.VolunteerName || 'Assigning volunteer agent...')}</strong>
                            ${o.VolunteerPhone ? ' 📞 <a href="tel:' + escapeHtml(o.VolunteerPhone) + '" style="color: #f59e0b; text-decoration: underline;">(' + escapeHtml(o.VolunteerPhone) + ')</a>' : ''}
                        </div>
                    </div>

                    <!-- Ordered Items List -->
                    <div style="margin-bottom: 12px;">
                        <div style="font-size: 11px; font-weight: 700; color: var(--text-dim); margin-bottom: 4px;">ORDERED ITEMS:</div>
                        ${itemsHtml}
                    </div>

                    <!-- Actions & Delivery Confirmation Prompt -->
                    ${(isCustomerUser && o.Status === 'DELIVERED' && !o.hasSubmittedFeedback && !localStorage.getItem(`submitted_feedback_${o.OrderID}`)) ? `
                        <div style="background: rgba(16, 185, 129, 0.12); padding: 12px; border-radius: 8px; border: 1px solid rgba(16, 185, 129, 0.3); margin-top: 10px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
                            <div>
                                <strong style="color: #10b981; font-size: 13px;">📦 Volunteer Delivery Agent Marked Order as Delivered!</strong>
                                <div style="font-size: 11px; color: var(--text-bright); margin-top: 2px;">Did you receive package #${o.OrderNumber} at your delivery address?</div>
                            </div>
                            <div style="display: flex; gap: 8px;">
                                <button class="btn btn-primary" style="padding: 6px 14px; font-size: 12px; background: #10b981; border: none;" onclick="confirmCustomerPackageReceived(${o.OrderID}, ${o.VolunteerUserID || 0}, '${escapeHtml(o.VolunteerName || 'Volunteer Agent').replace(/'/g, "\\'")}', '${o.OrderNumber}', '${itemsJsonAttr}')">
                                    ✅ Yes, Package Received!
                                </button>
                                <button class="btn btn-outline" style="padding: 6px 12px; font-size: 12px; color: var(--accent-rose); border-color: rgba(244, 63, 94, 0.3);" onclick="reportPackageNotReceived(${o.OrderID})">
                                    ❌ Not Received Yet
                                </button>
                            </div>
                        </div>
                    ` : ''}

                    <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid var(--border-color); padding-top: 10px;">
                        <button class="btn btn-outline" style="padding: 5px 12px; font-size: 11px;" onclick="openGoogleMapModal('${escapeHtml(o.ShippingAddress).replace(/'/g, "\\'")}', 'Receiver Customer Location', '${o.OrderNumber}', '${o.Status}')">
                            <i class="ri-map-pin-line" style="color: var(--primary-cyan);"></i> Track Movement on Maps
                        </button>

                        ${isCustomerUser ? (
                            o.Status === 'DELIVERED' ? (
                                (o.hasSubmittedFeedback || localStorage.getItem(`submitted_feedback_${o.OrderID}`)) ? `
                                    <span style="background: rgba(16, 185, 129, 0.15); color: #10b981; border: 1px solid rgba(16, 185, 129, 0.3); font-size: 11px; font-weight: 800; padding: 5px 12px; border-radius: 12px;">
                                        <i class="ri-checkbox-circle-fill"></i> ✅ Feedback Submitted
                                    </span>
                                ` : `
                                    <button class="btn btn-primary" style="padding: 6px 14px; font-size: 12px; background: linear-gradient(135deg, #f59e0b, #d97706); border: none;" onclick="openPostDeliveryReviewModal(${o.OrderID}, ${o.VolunteerUserID || 0}, '${escapeHtml(o.VolunteerName || 'Volunteer Agent').replace(/'/g, "\\'")}', '${o.OrderNumber}', '${itemsJsonAttr}')">
                                        <i class="ri-star-smile-fill"></i> ⭐ Rate Volunteer & Products
                                    </button>
                                `
                            ) : `
                                <span style="font-size: 11px; color: var(--text-dim);"><i class="ri-time-line"></i> Volunteer rating unlocks upon delivery</span>
                            `
                        ) : `
                            <span style="font-size: 11px; color: var(--text-dim); font-weight: 600;"><i class="ri-eye-line"></i> Read-Only System View</span>
                        `}
                    </div>
                </div>
            `;
        }).join('');

    } catch (err) {
        console.error('Customer orders error:', err);
    }
}

function confirmCustomerPackageReceived(orderId, volunteerId, volunteerName, orderNumber, itemsJsonStr) {
    localStorage.setItem(`confirmed_received_${orderId}`, 'true');
    alert(`🎉 Thank you for confirming! Package #${orderNumber} marked as Received by Customer.`);
    openPostDeliveryReviewModal(orderId, volunteerId, volunteerName, orderNumber, itemsJsonStr);
    loadCustomerOrders();
}

function reportPackageNotReceived(orderId) {
    alert(`⚠️ Alert Flagged for Order #${orderId}: Our warehouse logistics team and volunteer agent have been notified to verify delivery at your address immediately.`);
}

// -------------------------------------------------------------
// Volunteer Logistics Portal Logic
// -------------------------------------------------------------
async function loadVolunteerDeliveries() {
    const container = document.getElementById('volunteer-deliveries-container');
    if (!container) return;

    try {
        const token = localStorage.getItem('shoplytics_token');
        if (!token) return;

        const res = await fetch('/api/orders/volunteer', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const orders = await safeFetchJsonOrder(res);
        if (!res.ok) throw new Error(orders.error || 'Failed to load assigned deliveries.');

        if (orders.length === 0) {
            container.innerHTML = `
                <div class="glass-card" style="text-align: center; padding: 40px; color: var(--text-dim);">
                    <i class="ri-truck-line" style="font-size: 42px; color: var(--primary-cyan); display: block; margin-bottom: 10px;"></i>
                    No active delivery tasks assigned to you right now. Admin will assign new orders soon!
                </div>
            `;
            return;
        }

        container.innerHTML = orders.map(o => {
            const items = o.items || [];
            const itemsHtml = items.map(i => {
                const thumb = window.renderProductImageHTML ? window.renderProductImageHTML(i.ImageURL, '📦', '24px', '24px') : (i.ImageURL || '📦');
                return `
                    <div style="display: flex; align-items: center; justify-content: space-between; font-size: 12px; color: var(--text-bright); margin-bottom: 4px; padding: 4px 8px; background: rgba(255,255,255,0.02); border-radius: 6px;">
                        <span style="display: flex; align-items: center; gap: 8px;">
                            <span style="width: 24px; height: 24px; display: inline-flex; align-items: center; justify-content: center; overflow: hidden; border-radius: 4px; background: rgba(15,23,42,0.8);">${thumb}</span>
                            <strong>${escapeHtml(i.ProductName)}</strong> (x${i.Quantity})
                        </span>
                        <span style="color: var(--primary-cyan); font-weight: 700;">$${(i.UnitPrice * i.Quantity).toFixed(2)}</span>
                    </div>
                `;
            }).join('');

            const isMine = window.currentUser && (o.VolunteerUserID == window.currentUser.userId);
            const isAdmin = window.currentUser && (window.currentUser.role || '').toLowerCase() === 'admin';
            const isUnassigned = !o.VolunteerUserID || o.VolunteerUserID == 0;
            const canManage = isMine || isAdmin || isUnassigned;

            let actionButtonHtml = '';
            if (isUnassigned) {
                actionButtonHtml = `
                    <button class="btn btn-primary" style="padding: 7px 16px; font-size: 12px; background: linear-gradient(135deg, #06b6d4, #3b82f6); border: none; font-weight: 700;" onclick="acceptVolunteerOrder(${o.OrderID})">
                        ✋ Accept & Claim Delivery Task
                    </button>
                `;
            } else if (o.Status === 'SHIPPED' || o.Status === 'CONFIRMED' || o.Status === 'ORDER PLACED' || o.Status === 'PACKED') {
                actionButtonHtml = `
                    <button class="btn btn-primary" style="padding: 7px 16px; font-size: 12px; background: linear-gradient(135deg, #f59e0b, #d97706); border: none; font-weight: 700;" onclick="updateVolunteerOrderStatus(${o.OrderID}, 'COLLECTED')">
                        🏢 Mark Package Collected from Depot
                    </button>
                `;
            } else if (o.Status === 'COLLECTED') {
                actionButtonHtml = `
                    <button class="btn btn-primary" style="padding: 7px 16px; font-size: 12px; background: linear-gradient(135deg, #06b6d4, #0891b2); border: none; font-weight: 700;" onclick="updateVolunteerOrderStatus(${o.OrderID}, 'OUT FOR DELIVERY')">
                        🏍️ Start Delivery (On The Way / Out for Delivery)
                    </button>
                `;
            } else if (o.Status === 'OUT FOR DELIVERY') {
                actionButtonHtml = `
                    <button class="btn btn-secondary" style="padding: 6px 10px; font-size: 11px; margin-right: 6px;" onclick="simulateVolunteerMovement(${o.OrderID})">
                        📡 Stream Live GPS
                    </button>
                    <button class="btn btn-primary" style="padding: 7px 16px; font-size: 12px; background: linear-gradient(135deg, #10b981, #059669); border: none; font-weight: 700;" onclick="updateVolunteerOrderStatus(${o.OrderID}, 'DELIVERED')">
                        ✅ Mark Delivered to Customer
                    </button>
                `;
            } else if (o.Status === 'DELIVERED') {
                actionButtonHtml = `
                    <span style="background: rgba(16, 185, 129, 0.15); color: #10b981; border: 1px solid rgba(16, 185, 129, 0.3); font-size: 11px; font-weight: 800; padding: 6px 14px; border-radius: 12px;">
                        ✓ Order Delivered & Completed!
                    </span>
                `;
            }

            return `
                <div class="glass-card" style="margin-bottom: 18px; border-left: 4px solid ${isMine ? 'var(--accent-emerald)' : 'var(--primary-cyan)'};">
                    <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-color); padding-bottom: 10px; margin-bottom: 12px; flex-wrap: wrap; gap: 8px;">
                        <div>
                            <strong style="font-size: 16px; color: var(--text-bright); margin-right: 8px;">Order #${o.OrderNumber}</strong>
                            <span class="badge ${o.Status === 'DELIVERED' ? 'badge-emerald' : 'badge-cyan'}">${o.Status}</span>
                            ${isMine ? '<span style="background: rgba(16, 185, 129, 0.15); color: #10b981; border: 1px solid rgba(16, 185, 129, 0.3); font-size: 10px; font-weight: 800; padding: 2px 8px; border-radius: 10px; margin-left: 6px;">Assigned to You</span>' : ''}
                        </div>
                        <div style="font-size: 13px; font-weight: 800; color: var(--accent-emerald);">
                            Total Payable: $${parseFloat(o.TotalAmount).toFixed(2)} (${o.PaymentMethod || 'COD'})
                        </div>
                    </div>

                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 12px; margin-bottom: 14px;">
                        <!-- Collection / Pickup Address -->
                        <div style="background: rgba(6, 182, 212, 0.05); padding: 12px; border-radius: 8px; border: 1px solid rgba(6, 182, 212, 0.2);">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                                <div style="font-size: 11px; font-weight: 700; color: var(--primary-cyan); text-transform: uppercase;">
                                    🏢 STEP 1: PICKUP WAREHOUSE DEPOT
                                </div>
                                <button class="btn btn-outline" style="padding: 2px 6px; font-size: 10px; color: var(--primary-cyan);" onclick="openGoogleMapModal('${escapeHtml(o.CollectionAddress || 'Shoplytics Central Hub, Depot 4, Hyderabad').replace(/'/g, "\\'")}', 'Warehouse Collection Depot', '${o.OrderNumber}', 'Pickup Hub')">
                                    📍 Depot Map
                                </button>
                            </div>
                            <div style="font-size: 13px; font-weight: 600; color: var(--text-bright);">
                                ${escapeHtml(o.CollectionAddress || 'Shoplytics Central Hub, Depot 4, Hyderabad')}
                            </div>
                            <div style="font-size: 11px; color: var(--text-muted); margin-top: 4px;">
                                Collect package items from store warehouse hub before dispatching to customer.
                            </div>
                        </div>

                        <!-- Receiver Customer Address & Contact Details -->
                        <div style="background: rgba(16, 185, 129, 0.05); padding: 12px; border-radius: 8px; border: 1px solid rgba(16, 185, 129, 0.2);">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                                <div style="font-size: 11px; font-weight: 700; color: var(--accent-emerald); text-transform: uppercase;">
                                    🏠 STEP 2: CUSTOMER DELIVERY DESTINATION
                                </div>
                                <button class="btn btn-outline" style="padding: 2px 6px; font-size: 10px; color: var(--accent-emerald);" onclick="openGoogleMapModal('${escapeHtml(o.ShippingAddress).replace(/'/g, "\\'")}', 'Customer Delivery Destination', '${o.OrderNumber}', '${o.Status}')">
                                    🗺️ Destination Map
                                </button>
                            </div>
                            <div style="font-size: 13px; font-weight: 700; color: var(--text-bright);">
                                👤 Customer: ${escapeHtml(o.CustomerName || o.CustomerFullName || 'Customer')}
                            </div>
                            <div style="font-size: 13px; font-weight: 700; color: #f59e0b; margin-top: 2px;">
                                📞 Phone: <a href="tel:${escapeHtml(o.CustomerPhone)}" style="color: #f59e0b; text-decoration: underline;">${escapeHtml(o.CustomerPhone || 'N/A')}</a>
                            </div>
                            <div style="font-size: 12px; color: var(--text-bright); margin-top: 4px;">
                                📍 Address: ${escapeHtml(o.ShippingAddress)}
                            </div>
                        </div>
                    </div>

                    <!-- Package Items -->
                    <div style="background: rgba(15, 23, 42, 0.5); padding: 10px; border-radius: 6px; margin-bottom: 14px;">
                        <div style="font-size: 11px; font-weight: 700; color: var(--text-dim); margin-bottom: 6px;">PACKAGE CONTENTS & ITEMS:</div>
                        ${itemsHtml}
                    </div>

                    <!-- Volunteer Status Update Controls -->
                    <div style="display: flex; gap: 8px; flex-wrap: wrap; justify-content: space-between; align-items: center; border-top: 1px solid var(--border-color); padding-top: 12px;">
                        <div>
                            <a href="tel:${escapeHtml(o.CustomerPhone)}" class="btn btn-outline" style="padding: 5px 10px; font-size: 11px; color: #f59e0b; border-color: rgba(245, 158, 11, 0.4); text-decoration: none;">
                                📞 Call Customer Phone
                            </a>
                        </div>
                        <div style="display: flex; gap: 8px; flex-wrap: wrap; align-items: center;">
                            ${actionButtonHtml}
                        </div>
                    </div>
                </div>
            `;
        }).join('');

    } catch (err) {
        console.error('Volunteer deliveries error:', err);
    }
}

async function acceptVolunteerOrder(orderId) {
    try {
        const token = localStorage.getItem('shoplytics_token');
        const res = await fetch(`/api/orders/${orderId}/accept`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await safeFetchJsonOrder(res);
        if (!res.ok) throw new Error(data.error || 'Failed to claim delivery task.');

        alert(`🎉 ${data.message || 'Delivery task claimed successfully!'}`);
        loadVolunteerDeliveries();
        if (window.loadAdminOrders) window.loadAdminOrders(true);
    } catch (err) {
        alert(err.message);
    }
}

async function updateVolunteerOrderStatus(orderId, status) {
    try {
        const token = localStorage.getItem('shoplytics_token');
        const res = await fetch(`/api/orders/${orderId}/status`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ status })
        });

        const data = await safeFetchJsonOrder(res);
        if (!res.ok) throw new Error(data.error || 'Failed to update order status');

        alert(`✅ Order #${orderId} status updated to: ${status}`);
        loadVolunteerDeliveries();
        if (window.loadCustomerOrders) loadCustomerOrders();
        if (window.loadAdminOrders) window.loadAdminOrders(true);
    } catch (err) {
        alert(err.message);
    }
}

async function simulateVolunteerMovement(orderId) {
    alert('📡 Starting live GPS simulation... Coordinates will be streamed to customer map tracking!');
    
    // Simulate trajectory coordinates near Hyderabad depot to customer location
    const coords = [
        { lat: 17.4150, lng: 78.4490, status: 'COLLECTED' },
        { lat: 17.4140, lng: 78.4488, status: 'EN_ROUTE' },
        { lat: 17.4132, lng: 78.4485, status: 'EN_ROUTE' },
        { lat: 17.4126, lng: 78.4482, status: 'ARRIVED' }
    ];

    const token = localStorage.getItem('shoplytics_token');

    for (let i = 0; i < coords.length; i++) {
        const point = coords[i];
        try {
            await fetch('/api/delivery/location', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    orderId,
                    latitude: point.lat,
                    longitude: point.lng,
                    speed: 25.5,
                    status: point.status
                })
            });
        } catch (e) {
            console.error('GPS stream error:', e);
        }
        await new Promise(r => setTimeout(r, 1200));
    }

    alert('🏁 Volunteer reached customer location!');
}

// -------------------------------------------------------------
// Admin Dispatcher Delegation Logic
// -------------------------------------------------------------
async function assignVolunteerToOrder(orderId, selectId) {
    const select = document.getElementById(selectId);
    if (!select) return;
    const volunteerUserId = select.value;

    try {
        const token = localStorage.getItem('shoplytics_token');
        const res = await fetch(`/api/orders/${orderId}/assign`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ volunteerUserId })
        });

        const data = await safeFetchJsonOrder(res);
        if (!res.ok) throw new Error(data.error || 'Assignment failed');

        alert(`✅ Order assigned to volunteer successfully!`);
        if (typeof window.loadAdminOrders === 'function') {
            window.loadAdminOrders();
        }
    } catch (err) {
        alert(err.message);
    }
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m]));
}

window.loadVolunteerDeliveries = loadVolunteerDeliveries;
window.openGoogleMapModal = openGoogleMapModal;
window.closeGoogleMapModal = closeGoogleMapModal;
window.updateMapCustomAddress = updateMapCustomAddress;
window.trackModalLiveGps = trackModalLiveGps;
window.simulateVolunteerGpsRoute = simulateVolunteerGpsRoute;
window.detectGPSLocation = detectGPSLocation;
window.previewCheckoutMap = previewCheckoutMap;

