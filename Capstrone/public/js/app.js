/**
 * Main Application Orchestrator, E-Commerce Store & Cart Apriori Recommendation Integration
 */
let cart = [];
let allStoreProducts = [];

window.addEventListener('DOMContentLoaded', () => {
    initAuth();
    setupNavigation();
    loadDashboardData();
    loadStoreProducts();
});

function setupNavigation() {
    const menuItems = document.querySelectorAll('.sidebar-menu .menu-item');
    menuItems.forEach(item => {
        item.addEventListener('click', () => {
            menuItems.forEach(m => m.classList.remove('active'));
            item.classList.add('active');

            const tab = item.getAttribute('data-tab');
            switchTab(tab);
        });
    });
}

function switchTab(tab) {
    document.querySelectorAll('.tab-view').forEach(view => view.style.display = 'none');

    const heading = document.getElementById('tab-heading');
    const subheading = document.getElementById('tab-subheading');

    if (tab === 'dashboard') {
        document.getElementById('view-dashboard').style.display = 'block';
        heading.innerText = 'BI Analytics Overview';
        subheading.innerText = 'Star Schema Data Warehouse Performance & Customer Intelligence';
        loadDashboardData();
    } else if (tab === 'apriori') {
        document.getElementById('view-apriori').style.display = 'block';
        heading.innerText = 'Apriori Association Rules Mining';
        subheading.innerText = 'Frequent Itemsets & Market Basket Analysis Engine';
        loadAprioriRules();
    } else if (tab === 'rfm') {
        document.getElementById('view-rfm').style.display = 'block';
        heading.innerText = 'Customer Segmentation & Predictive Analytics';
        subheading.innerText = 'RFM Score Clustering (Recency, Frequency, Monetary) & Predictive Churn Alerts';
        loadRFMAnalytics();
    } else if (tab === 'store') {
        document.getElementById('view-store').style.display = 'block';
        heading.innerText = 'Customer E-Commerce Store';
        subheading.innerText = 'Live Shopping Catalog & Apriori Powered "Frequently Bought Together" Engine';
        loadStoreProducts();
    } else if (tab === 'my-orders') {
        document.getElementById('view-my-orders').style.display = 'block';
        const role = window.currentUser ? (window.currentUser.role || '').toLowerCase() : 'customer';
        if (role === 'admin') {
            heading.innerText = 'Orders';
            subheading.innerText = 'System-wide Customer Purchase Tracking, Product Details & Volunteer Movement Monitoring';
        } else {
            heading.innerText = 'My Customer Orders';
            subheading.innerText = 'Track Live Order Status & Assigned Delivery Volunteer Logistics';
        }
        loadCustomerOrders();
    } else if (tab === 'stock-management') {
        document.getElementById('view-stock-management').style.display = 'block';
        heading.innerText = 'Warehouse Stock & Inventory Management';
        subheading.innerText = 'Real-Time Product Stock Levels, Maintenance Restocking & Customer Order Deduction Tracking';
        if (window.loadStockManagementView) window.loadStockManagementView();
    } else if (tab === 'profile') {
        openCustomerProfileModal();
    } else if (tab === 'admin') {
        document.getElementById('view-admin').style.display = 'block';
        heading.innerText = 'Admin Management & Order Dispatcher';
        subheading.innerText = 'Data Warehouse ETL Control, Order Volunteer Dispatcher & Real-Time Tracking Log';
        loadAdminData();
        if (window.loadAdminOrders) loadAdminOrders();
    } else if (tab === 'volunteer-portal') {
        document.getElementById('view-volunteer-portal').style.display = 'block';
        heading.innerText = 'Volunteer Delivery Logistics Portal';
        subheading.innerText = 'Pickup from Warehouse Collection Address & Deliver to Receiver Customer Address';
        if (window.loadVolunteerDeliveries) loadVolunteerDeliveries();
    }

    trackEvent('tab_navigation', { tab });
}

/* Store & Cart Functions */
let selectedCategory = 'ALL';

async function loadStoreProducts() {
    try {
        const res = await fetch('/api/products');
        if (res.ok) {
            allStoreProducts = await res.json();
        } else {
            allStoreProducts = getFallbackProducts();
        }
    } catch (err) {
        console.error('Store load fetch error, using fallback:', err);
        allStoreProducts = getFallbackProducts();
    }

    renderStoreCatalog();
    updateCartUI();
    fetchAprioriRecommendations();
}

function selectStoreCategory(category, btnElement) {
    selectedCategory = category;

    document.querySelectorAll('.category-pill').forEach(btn => btn.classList.remove('active'));
    if (btnElement) {
        btnElement.classList.add('active');
    }

    renderStoreCatalog();
}

function filterStoreProducts() {
    renderStoreCatalog();
}

window.renderProductImageHTML = function renderProductImageHTML(imgUrl, fallbackEmoji = '📦', width = '100%', height = '100%') {
    if (!imgUrl) return fallbackEmoji;
    if (typeof imgUrl === 'string' && (
        imgUrl.startsWith('http://') || 
        imgUrl.startsWith('https://') || 
        imgUrl.startsWith('/') || 
        imgUrl.startsWith('./') || 
        imgUrl.startsWith('data:') || 
        imgUrl.includes('/') || 
        imgUrl.match(/\.(jpg|jpeg|png|gif|svg|webp)/i)
    )) {
        return `<img src="${imgUrl}" alt="Product" style="width: ${width}; height: ${height}; object-fit: cover; border-radius: 6px;" loading="lazy" onerror="this.onerror=null; this.parentNode.innerHTML='${fallbackEmoji}';">`;
    }
    return imgUrl;
};

function renderStoreCatalog() {
    const grid = document.getElementById('store-product-grid');
    const countBadge = document.getElementById('store-product-count');
    const titleEl = document.getElementById('store-catalog-title');

    if (!grid) return;
    grid.innerHTML = '';

    const searchTerm = (document.getElementById('store-search-input')?.value || '').toLowerCase().trim();

    const filtered = allStoreProducts.filter(p => {
        const matchesCategory = selectedCategory === 'ALL' || (p.Category && p.Category.toLowerCase() === selectedCategory.toLowerCase());
        const matchesSearch = !searchTerm || 
            (p.ProductName && p.ProductName.toLowerCase().includes(searchTerm)) ||
            (p.Category && p.Category.toLowerCase().includes(searchTerm)) ||
            (p.Brand && p.Brand.toLowerCase().includes(searchTerm)) ||
            (p.Description && p.Description.toLowerCase().includes(searchTerm));

        return matchesCategory && matchesSearch;
    });

    if (countBadge) {
        countBadge.innerText = `${filtered.length} Product${filtered.length === 1 ? '' : 's'}`;
    }

    if (titleEl) {
        titleEl.innerText = selectedCategory === 'ALL' ? 'Product Catalog (All Departments)' : `Product Catalog: ${selectedCategory}`;
    }

    if (filtered.length === 0) {
        grid.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: var(--text-dim);" class="glass-card">
                <i class="ri-search-line" style="font-size: 36px; display: block; margin-bottom: 8px; color: var(--primary-cyan);"></i>
                No Amazon products match your search or selected category. Try selecting another category!
            </div>
        `;
        return;
    }

    filtered.forEach(p => {
        const card = document.createElement('div');
        card.className = 'glass-card product-card';
        const imgMarkup = renderProductImageHTML(p.ImageURL, '📦');
        const stock = p.StockQuantity !== undefined ? p.StockQuantity : 100;
        const isOutOfStock = stock <= 0;
        const stockBadgeMarkup = isOutOfStock
            ? `<span style="font-size: 11px; color: var(--accent-rose); font-weight: 800; background: rgba(244,63,94,0.15); padding: 2px 6px; border-radius: 4px; border: 1px solid rgba(244,63,94,0.3);">🔴 OUT OF STOCK</span>`
            : (stock <= 20
                ? `<span style="font-size: 11px; color: #f59e0b; font-weight: 700; background: rgba(245,158,11,0.15); padding: 2px 6px; border-radius: 4px; border: 1px solid rgba(245,158,11,0.3);">🟠 ${stock} Left (Low Stock)</span>`
                : `<span style="font-size: 11px; color: var(--accent-emerald); font-weight: 700; background: rgba(16,185,129,0.15); padding: 2px 6px; border-radius: 4px; border: 1px solid rgba(16,185,129,0.3);">🟢 ${stock} In Stock</span>`);

        card.innerHTML = `
            <div>
                <div class="product-img" style="cursor: pointer;" onclick="openProductDetailsModal('${p.ProductID}')" title="Click to view specifications & variants">${imgMarkup}</div>
                <div class="product-title" style="cursor: pointer;" onclick="openProductDetailsModal('${p.ProductID}')" title="Click to view specifications & variants">${escapeHtml(p.ProductName)}</div>
                <div class="product-cat" style="margin-bottom: 6px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 4px;">
                    <span>${p.Category || 'General'}</span>
                    ${stockBadgeMarkup}
                </div>
                <div style="font-size: 12px; color: #f59e0b; font-weight: 700; margin-bottom: 12px;">
                    ⭐ ${parseFloat(p.PopularityRating || 4.8).toFixed(1)} / 5.0
                </div>
            </div>
            <div>
                <div style="display: flex; gap: 6px; margin-bottom: 10px;">
                    <button class="btn btn-outline" style="flex: 1; padding: 5px 6px; font-size: 11px; color: var(--primary-cyan); border-color: rgba(6, 182, 212, 0.4);" onclick="openProductDetailsModal('${p.ProductID}')">
                        <i class="ri-information-line"></i> View Specs
                    </button>
                    <button class="btn btn-outline" style="padding: 5px 6px; font-size: 11px;" onclick="openProductReviewsModal(${p.ProductKey}, '${(p.ProductName || '').replace(/'/g, "\\'")}', '${(p.ImageURL || '📦').replace(/'/g, "\\'")}', '${p.Category}', ${p.Price}, ${p.PopularityRating || 4.8})">
                        <i class="ri-star-line" style="color: #f59e0b;"></i> Reviews
                    </button>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div class="product-price">$${parseFloat(p.Price || 99).toFixed(2)}</div>
                    <button class="btn btn-primary" style="padding: 6px 12px; font-size: 12px; ${isOutOfStock ? 'opacity: 0.5; cursor: not-allowed; background: var(--text-dim); border: none;' : ''}" ${isOutOfStock ? 'disabled' : ''} onclick="addToCart('${p.ProductID}')">
                        <i class="${isOutOfStock ? 'ri-close-circle-line' : 'ri-add-line'}"></i> ${isOutOfStock ? 'Out of Stock' : 'Add to Cart'}
                    </button>
                </div>
            </div>
        `;
        grid.appendChild(card);
    });
}

function getFallbackProducts() {
    return [
        { ProductKey: 1, ProductID: 'PROD-101', ProductName: 'Echo Dot (5th Gen) Smart Speaker with Alexa', Category: 'Echo & Alexa / Devices', Price: 49.99, PopularityRating: 4.8, ImageURL: '🔊' },
        { ProductKey: 2, ProductID: 'PROD-201', ProductName: 'Apple iPhone 15 Pro (256GB, Titanium)', Category: 'Mobiles & Computers', Price: 999.99, PopularityRating: 4.9, ImageURL: '📱' },
        { ProductKey: 3, ProductID: 'PROD-301', ProductName: 'Sony BRAVIA 65-inch 4K OLED Smart TV', Category: 'TV & Electronics', Price: 1799.99, PopularityRating: 4.9, ImageURL: '📺' },
        { ProductKey: 4, ProductID: 'PROD-401', ProductName: 'Kindle Paperwhite (16GB) 6.8" Display', Category: 'Kindle & Books', Price: 149.99, PopularityRating: 4.9, ImageURL: '📖' },
        { ProductKey: 5, ProductID: 'PROD-501', ProductName: 'Nike Air Max 270 Cushioned Running Shoes', Category: 'Fashion & Apparel', Price: 159.99, PopularityRating: 4.8, ImageURL: '👟' },
        { ProductKey: 6, ProductID: 'PROD-601', ProductName: 'Italian Espresso Coffee Machine', Category: 'Home & Kitchen', Price: 249.99, PopularityRating: 4.8, ImageURL: '☕' }
    ];
}

function addToCart(productID) {
    const product = allStoreProducts.find(p => p.ProductID === productID);
    if (!product) return;

    const existing = cart.find(item => item.productKey === product.ProductKey);
    if (existing) {
        existing.quantity += 1;
    } else {
        cart.push({
            productKey: product.ProductKey,
            productID: product.ProductID,
            productName: product.ProductName,
            price: product.Price,
            imageURL: product.ImageURL || '📦',
            quantity: 1
        });
    }

    updateCartUI();
    fetchAprioriRecommendations();
    trackEvent('add_to_cart', { productID, name: product.ProductName });
}

function removeFromCart(index) {
    cart.splice(index, 1);
    updateCartUI();
    fetchAprioriRecommendations();
    trackEvent('remove_from_cart', { index });
}

function clearCart() {
    cart = [];
    updateCartUI();
    fetchAprioriRecommendations();
}

let savedForLater = [];
try {
    const savedStr = localStorage.getItem('shoplytics_saved_for_later');
    if (savedStr) savedForLater = JSON.parse(savedStr);
} catch (e) {
    savedForLater = [];
}

function saveForLater(index) {
    if (index < 0 || index >= cart.length) return;
    const item = cart.splice(index, 1)[0];
    const existing = savedForLater.find(s => s.productKey === item.productKey);
    if (existing) {
        existing.quantity += item.quantity;
    } else {
        savedForLater.push(item);
    }
    localStorage.setItem('shoplytics_saved_for_later', JSON.stringify(savedForLater));
    updateCartUI();
    fetchAprioriRecommendations();
}

function moveToCartFromSaved(index) {
    if (index < 0 || index >= savedForLater.length) return;
    const item = savedForLater.splice(index, 1)[0];
    const existing = cart.find(c => c.productKey === item.productKey);
    if (existing) {
        existing.quantity += item.quantity;
    } else {
        cart.push(item);
    }
    localStorage.setItem('shoplytics_saved_for_later', JSON.stringify(savedForLater));
    updateCartUI();
    fetchAprioriRecommendations();
}

function removeFromSavedForLater(index) {
    if (index < 0 || index >= savedForLater.length) return;
    savedForLater.splice(index, 1);
    localStorage.setItem('shoplytics_saved_for_later', JSON.stringify(savedForLater));
    updateSavedForLaterUI();
}

function updateSavedForLaterUI() {
    const container = document.getElementById('saved-for-later-container');
    const countEl = document.getElementById('saved-for-later-count');
    if (!container || !countEl) return;

    countEl.innerText = savedForLater.length;

    if (savedForLater.length === 0) {
        container.innerHTML = `<div style="color: var(--text-dim); font-size: 12px; text-align: center; padding: 6px;">No saved items</div>`;
        return;
    }

    container.innerHTML = savedForLater.map((item, idx) => `
        <div style="background: rgba(15, 23, 42, 0.6); padding: 8px 10px; border-radius: 8px; border: 1px solid rgba(245, 158, 11, 0.2); font-size: 12px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                <strong style="color: var(--text-bright); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 170px;">${escapeHtml(item.productName)}</strong>
                <span style="color: var(--primary-cyan); font-weight: 700;">$${(item.price * item.quantity).toFixed(2)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 4px;">
                <button class="btn btn-outline" style="padding: 2px 6px; font-size: 10px; color: var(--accent-emerald); border-color: rgba(16, 185, 129, 0.3);" onclick="moveToCartFromSaved(${idx})">
                    🛒 Move to Cart
                </button>
                <button style="background: none; border: none; color: var(--accent-rose); cursor: pointer; font-size: 11px;" onclick="removeFromSavedForLater(${idx})">
                    🗑️ Remove
                </button>
            </div>
        </div>
    `).join('');
}

function updateCartUI() {
    const container = document.getElementById('cart-items-container');
    const totalEl = document.getElementById('cart-total-price');

    updateSavedForLaterUI();

    if (!container || !totalEl) return;

    if (cart.length === 0) {
        container.innerHTML = `<div style="color: var(--text-dim); font-size: 13px; text-align: center; margin-top: 30px;">Your cart is empty</div>`;
        totalEl.innerText = '$0.00';
        return;
    }

    let total = 0;
    container.innerHTML = cart.map((item, idx) => {
        const itemTotal = item.price * item.quantity;
        total += itemTotal;
        return `
            <div style="display: flex; justify-content: space-between; align-items: center; font-size: 12px; background: rgba(15, 23, 42, 0.6); padding: 8px 10px; border-radius: 8px; margin-bottom: 6px;">
                <div>
                    <strong>${escapeHtml(item.productName)}</strong> (x${item.quantity})
                    <div style="font-size: 11px; color: var(--primary-cyan); margin-top: 2px;">$${itemTotal.toFixed(2)}</div>
                </div>
                <div style="display: flex; align-items: center; gap: 6px;">
                    <button class="btn btn-outline" style="padding: 2px 6px; font-size: 10px; color: #f59e0b; border-color: rgba(245, 158, 11, 0.4);" onclick="saveForLater(${idx})">
                        🔖 Save
                    </button>
                    <button style="background: none; border: none; color: var(--accent-rose); cursor: pointer; font-size: 14px;" onclick="removeFromCart(${idx})">✕</button>
                </div>
            </div>
        `;
    }).join('');

    totalEl.innerText = `$${total.toFixed(2)}`;
}

async function fetchAprioriRecommendations() {
    const cartProductIds = cart.map(item => item.productID);
    const container = document.getElementById('apriori-recommendations-container');
    if (!container) return;

    try {
        const res = await fetch('/api/recommendations/cart', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cartProductIds })
        });

        const data = await res.json();
        const recs = data.recommendations || [];

        if (recs.length === 0) {
            container.innerHTML = `<div style="color: var(--text-dim); font-size: 12px; text-align: center;">No recommendation rules active</div>`;
            return;
        }

        container.innerHTML = recs.map(r => {
            const recThumb = window.renderProductImageHTML ? window.renderProductImageHTML(r.ImageURL, '📦', '36px', '36px') : (r.ImageURL || '📦');
            return `
                <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(6, 182, 212, 0.08); border: 1px solid rgba(6, 182, 212, 0.2); padding: 10px; border-radius: 10px; margin-bottom: 8px;">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <div style="width: 36px; height: 36px; border-radius: 6px; overflow: hidden; flex-shrink: 0; background: rgba(15,23,42,0.8); display: flex; align-items: center; justify-content: center;">
                            ${recThumb}
                        </div>
                        <div>
                            <div style="font-size: 12px; font-weight: 700; color: var(--text-bright);">${r.ProductName}</div>
                            <div style="font-size: 11px; color: var(--primary-cyan); font-weight: 700;">$${parseFloat(r.Price || 0).toFixed(2)}</div>
                        </div>
                    </div>
                    <button class="btn btn-outline" style="padding: 4px 8px; font-size: 11px; border-color: rgba(6,182,212,0.4); color: var(--primary-cyan);" onclick="addToCart('${r.ProductID}')">+ Add</button>
                </div>
            `;
        }).join('');

    } catch (err) {
        console.error('Apriori cart rec error:', err);
    }
}

function simulateCheckout() {
    openCheckoutModal();
}

function exportReport(type) {
    window.location.href = `/api/reports/${type}`;
}

async function loadCustomerProfileView() {
    const guestCard = document.getElementById('profile-guest-card');
    const contentContainer = document.getElementById('profile-content-container');
    const token = localStorage.getItem('shoplytics_token');

    let user = window.currentUser;
    if (!user) {
        const userStr = localStorage.getItem('shoplytics_user');
        if (userStr) {
            try {
                user = JSON.parse(userStr);
                window.currentUser = user;
            } catch (e) {}
        }
    }

    if (!token || !user) {
        if (guestCard) guestCard.style.display = 'block';
        if (contentContainer) contentContainer.style.display = 'none';
        return;
    }

    if (guestCard) guestCard.style.display = 'none';
    if (contentContainer) contentContainer.style.display = 'block';

    const roleStr = (user.role || '').toLowerCase();
    const isAdmin = roleStr === 'admin';
    const isVolunteer = roleStr === 'volunteer';

    const modalTitleEl = document.getElementById('profile-modal-title');
    const nameEl = document.getElementById('profile-full-name');
    const emailEl = document.getElementById('profile-email');
    const segmentBadgeEl = document.getElementById('profile-segment-badge');
    const phoneEl = document.getElementById('profile-phone');
    const regionEl = document.getElementById('profile-region');
    const demographicsEl = document.getElementById('profile-demographics');
    const custIdEl = document.getElementById('profile-customer-id');
    const avatarCircle = document.getElementById('profile-avatar-circle');
    const addAddressBtn = document.getElementById('profile-btn-add-address');

    const kpi1Label = document.getElementById('profile-kpi-1-label');
    const kpi2Label = document.getElementById('profile-kpi-2-label');
    const kpi3Label = document.getElementById('profile-kpi-3-label');
    const addressTitle = document.getElementById('profile-address-title');
    const historyTitle = document.getElementById('profile-section-history-title');
    const historyDesc = document.getElementById('profile-section-history-desc');

    if (modalTitleEl) {
        if (isAdmin) {
            modalTitleEl.innerHTML = `<i class="ri-shield-user-line" style="color: var(--primary-cyan);"></i> System Executive Administrator Profile`;
        } else if (isVolunteer) {
            modalTitleEl.innerHTML = `<i class="ri-truck-line" style="color: var(--primary-cyan);"></i> Certified Volunteer Delivery Agent Profile`;
        } else {
            modalTitleEl.innerHTML = `<i class="ri-user-3-line" style="color: var(--primary-cyan);"></i> Customer Account Profile & History`;
        }
    }

    if (nameEl) nameEl.innerText = user.fullName || user.email || (isAdmin ? 'System Administrator' : (isVolunteer ? 'Volunteer Agent' : 'Customer Profile'));
    if (emailEl) emailEl.innerText = user.email || '';
    if (segmentBadgeEl) {
        if (isAdmin) {
            segmentBadgeEl.innerText = '👑 Executive System Administrator';
            segmentBadgeEl.style.background = 'rgba(245, 158, 11, 0.15)';
            segmentBadgeEl.style.color = '#f59e0b';
        } else if (isVolunteer) {
            segmentBadgeEl.innerText = '🏍️ Certified Delivery Agent';
            segmentBadgeEl.style.background = 'rgba(16, 185, 129, 0.15)';
            segmentBadgeEl.style.color = '#10b981';
        } else {
            segmentBadgeEl.innerText = 'Standard Tier Customer';
            segmentBadgeEl.style.background = 'rgba(6, 182, 212, 0.15)';
            segmentBadgeEl.style.color = 'var(--primary-cyan)';
        }
    }

    if (phoneEl) phoneEl.innerText = user.phone || '+91 9876543210';
    if (regionEl) regionEl.innerText = user.location || (isAdmin ? 'Central Headquarters' : (isVolunteer ? 'Hyderabad Metro Hub' : 'Asia-Pacific'));
    if (demographicsEl) demographicsEl.innerText = isAdmin ? 'SYSTEM ADMINISTRATOR' : (isVolunteer ? 'VOLUNTEER DELIVERY AGENT' : 'CUSTOMER ACCOUNT');
    if (custIdEl) custIdEl.innerText = isAdmin ? `ADMIN-001` : (isVolunteer ? `VOL-${1000 + Number(user.userId)}` : (user.customerKey ? `CUST-${1000 + Number(user.customerKey)}` : `USER-${user.userId}`));
    if (avatarCircle) {
        const initials = (user.fullName || user.email || (isAdmin ? 'SA' : (isVolunteer ? 'VA' : 'CU'))).split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
        avatarCircle.innerText = initials;
    }

    if (addAddressBtn) addAddressBtn.style.display = (isAdmin || isVolunteer) ? 'none' : 'inline-block';

    // Customize KPI Labels for Role
    if (kpi1Label) kpi1Label.innerText = isAdmin ? 'System Total Customer Orders' : (isVolunteer ? 'Tasks Claimed / Accepted' : 'Total Orders Placed');
    if (kpi2Label) kpi2Label.innerText = isAdmin ? 'Gross System Warehouse Revenue' : (isVolunteer ? 'Orders In Progress' : 'Lifetime Purchase Spend');
    if (kpi3Label) kpi3Label.innerText = isAdmin ? 'Active Shipments In Transit' : (isVolunteer ? 'Completed Orders Delivered' : 'Active Delivery Shipments');

    if (addressTitle) {
        addressTitle.innerHTML = isVolunteer 
            ? `<i class="ri-building-line" style="color: var(--primary-cyan);"></i> Volunteer Depot Hub Base Address`
            : `<i class="ri-map-pin-line" style="color: var(--primary-cyan);"></i> Saved Delivery Address`;
    }

    if (historyTitle) {
        historyTitle.innerHTML = isVolunteer 
            ? `<i class="ri-truck-line" style="color: var(--primary-cyan);"></i> Assigned Delivery Tasks Log`
            : `<i class="ri-history-line" style="color: var(--primary-cyan);"></i> Past Order History`;
    }

    if (historyDesc) {
        historyDesc.innerText = isVolunteer 
            ? `Real-time log of orders claimed, collected from depot, on the way, and completed deliveries.`
            : `Comprehensive record of all your past orders & delivery status.`;
    }

    // Load saved address or depot address
    const addressBox = document.getElementById('profile-address-box');
    if (isVolunteer) {
        if (addressBox) {
            addressBox.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <strong style="color: var(--primary-cyan); font-size: 14px;">🏢 Shoplytics Central Hub, Depot 4</strong>
                        <div style="color: var(--text-muted); margin-top: 2px;">Road No 12, Banjara Hills, Hyderabad, Telangana - 500034</div>
                        <div style="font-size: 11px; color: var(--accent-emerald); margin-top: 4px;">📍 Primary Pickup & Dispatch Station</div>
                    </div>
                    <button class="btn btn-outline" style="padding: 4px 8px; font-size: 10px; color: var(--primary-cyan);" onclick="openGoogleMapModal('Shoplytics Central Hub, Depot 4, Hyderabad', 'Warehouse Central Depot', 'DEPOT-4', 'OPERATIONAL')">
                        📍 View Depot Map
                    </button>
                </div>
            `;
        }
    } else {
        try {
            const addrRes = await fetch('/api/addresses', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (addrRes.ok) {
                const addrs = await addrRes.json();
                if (addrs && addrs.length > 0) {
                    const def = addrs.find(a => a.IsDefault) || addrs[0];
                    if (addressBox) {
                        addressBox.innerHTML = `
                            <div style="display: flex; justify-content: space-between; align-items: start;">
                                <div>
                                    <strong style="color: var(--primary-cyan); font-size: 14px;">🏡 ${def.Label || 'DEFAULT HOME'}</strong>
                                    <div style="margin-top: 4px; font-weight: 600;">${def.FullName || user.fullName} (${def.Phone || user.phone})</div>
                                    <div style="color: var(--text-muted); margin-top: 2px;">${def.HouseFlat}, ${def.Street}, ${def.Area || ''}, ${def.City}, ${def.State} - ${def.PostalCode} (${def.Country || 'India'})</div>
                                </div>
                                <span style="background: rgba(16, 185, 129, 0.15); color: #10b981; font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 10px;">Primary Address</span>
                            </div>
                        `;
                    }
                } else if (addressBox) {
                    addressBox.innerText = 'No saved address recorded. Click "+ Add New Saved Address" to add one.';
                }
            }
        } catch (e) {
            console.error('Error loading profile address:', e);
        }
    }

    // Fetch and display Volunteer Agent Customer Reviews & Rating Score if user is a volunteer
    const kpi4Card = document.getElementById('profile-kpi-4-card');
    const kpi4Rating = document.getElementById('profile-kpi-rating');
    const volunteerReviewsSec = document.getElementById('profile-volunteer-reviews-section');
    const volunteerReviewsList = document.getElementById('profile-volunteer-reviews-list');

    if (isVolunteer) {
        if (kpi4Card) kpi4Card.style.display = 'flex';
        if (volunteerReviewsSec) volunteerReviewsSec.style.display = 'block';

        try {
            const vRevRes = await fetch(`/api/reviews/volunteer/${user.userId}`);
            if (vRevRes.ok) {
                const vRevData = await vRevRes.json();
                const avg = vRevData.avgRating ? vRevData.avgRating.toFixed(1) : '5.0';
                const count = vRevData.reviewCount || 0;
                if (kpi4Rating) kpi4Rating.innerText = `⭐ ${avg} (${count})`;

                if (volunteerReviewsList) {
                    const revs = vRevData.reviews || [];
                    if (revs.length === 0) {
                        volunteerReviewsList.innerHTML = `<div style="text-align: center; color: var(--text-dim); font-size: 12px; padding: 12px;">No customer ratings or reviews submitted yet for your deliveries.</div>`;
                    } else {
                        volunteerReviewsList.innerHTML = revs.map(r => `
                            <div style="background: rgba(15, 23, 42, 0.6); padding: 10px 12px; border-radius: 8px; margin-bottom: 8px; border: 1px solid rgba(245, 158, 11, 0.2);">
                                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                                    <span style="color: #f59e0b; font-weight: 700; font-size: 13px;">${'⭐'.repeat(r.Rating)} (${r.Rating}/5)</span>
                                    <span style="font-size: 11px; color: var(--text-dim);">Order #${r.OrderNumber} • ${new Date(r.CreatedAt).toLocaleDateString()}</span>
                                </div>
                                <div style="font-size: 12px; color: var(--text-bright); font-style: italic;">"${escapeHtml(r.Comment || 'Great delivery service!')}"</div>
                                <div style="font-size: 10px; color: var(--primary-cyan); margin-top: 4px;">👤 Verified Customer: ${escapeHtml(r.CustomerName || 'Customer')}</div>
                            </div>
                        `).join('');
                    }
                }
            }
        } catch (e) {
            console.error('Error loading volunteer reviews:', e);
        }
    } else {
        if (kpi4Card) kpi4Card.style.display = 'none';
        if (volunteerReviewsSec) volunteerReviewsSec.style.display = 'none';
    }

    // Load past order history or volunteer tasks
    const ordersContainer = document.getElementById('profile-orders-list');
    const kpiOrders = document.getElementById('profile-kpi-orders');
    const kpiSpend = document.getElementById('profile-kpi-spend');
    const kpiActive = document.getElementById('profile-kpi-active');

    try {
        const endpoint = isVolunteer ? '/api/orders/volunteer' : '/api/orders/my-orders';
        const res = await fetch(endpoint, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!res.ok) throw new Error('Failed to load order records');
        const orders = await res.json();

        if (isVolunteer) {
            let totalClaimed = 0;
            let inProgress = 0;
            let completedDelivered = 0;

            orders.forEach(o => {
                if (o.VolunteerUserID == user.userId || o.VolunteerName === user.fullName) {
                    totalClaimed++;
                }
                if (['SHIPPED', 'COLLECTED', 'OUT FOR DELIVERY'].includes(o.Status)) {
                    inProgress++;
                }
                if (o.Status === 'DELIVERED') {
                    completedDelivered++;
                }
            });

            if (kpiOrders) kpiOrders.innerText = totalClaimed;
            if (kpiSpend) kpiSpend.innerText = inProgress;
            if (kpiActive) kpiActive.innerText = completedDelivered;
        } else {
            if (kpiOrders) kpiOrders.innerText = orders.length;

            let totalSpend = 0;
            let activeCount = 0;

            orders.forEach(o => {
                totalSpend += (o.TotalAmount || 0);
                if (['ORDER PLACED', 'CONFIRMED', 'PACKED', 'SHIPPED', 'COLLECTED', 'OUT FOR DELIVERY'].includes(o.Status)) {
                    activeCount++;
                }
            });

            if (kpiSpend) kpiSpend.innerText = `$${totalSpend.toFixed(2)}`;
            if (kpiActive) kpiActive.innerText = activeCount;
        }

        if (ordersContainer) {
            if (orders.length === 0) {
                ordersContainer.innerHTML = `<div style="text-align: center; color: var(--text-dim); padding: 30px; font-size: 13px;">No order records found.</div>`;
                return;
            }

            ordersContainer.innerHTML = orders.map(o => {
                const dateStr = new Date(o.CreatedAt || Date.now()).toLocaleDateString('en-US', {
                    month: 'short', day: 'numeric', year: 'numeric'
                });

                const badgeBg = o.Status === 'DELIVERED' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(6, 182, 212, 0.15)';
                const badgeColor = o.Status === 'DELIVERED' ? '#10b981' : '#06b6d4';

                const items = o.items || [];
                const itemsMarkup = items.map(i => {
                    const thumb = window.renderProductImageHTML ? window.renderProductImageHTML(i.ImageURL, '📦', '28px', '28px') : (i.ImageURL || '📦');
                    return `
                        <div style="display: flex; align-items: center; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid rgba(255,255,255,0.04);">
                            <div style="display: flex; align-items: center; gap: 8px;">
                                <div style="width: 28px; height: 28px; border-radius: 4px; overflow: hidden; background: rgba(15,23,42,0.8); display: flex; align-items: center; justify-content: center; flex-shrink: 0;">${thumb}</div>
                                <div>
                                    <div style="font-weight: 700; color: var(--text-bright);">${escapeHtml(i.ProductName)}</div>
                                    <div style="font-size: 11px; color: var(--text-muted);">${i.Brand || 'Brand'} • Qty: ${i.Quantity}</div>
                                </div>
                            </div>
                            <div style="font-weight: 700; color: var(--primary-cyan);">$${(i.UnitPrice * i.Quantity).toFixed(2)}</div>
                        </div>
                    `;
                }).join('');

                if (isVolunteer) {
                    const isMine = (o.VolunteerUserID == user.userId);
                    return `
                        <div style="background: rgba(15, 23, 42, 0.6); border: 1px solid var(--border-color); border-left: 4px solid ${isMine ? '#10b981' : '#06b6d4'}; border-radius: 12px; padding: 18px; margin-bottom: 16px;">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; flex-wrap: wrap; gap: 8px; border-bottom: 1px solid rgba(255,255,255,0.08); padding-bottom: 10px;">
                                <div>
                                    <span style="font-weight: 800; font-size: 15px; color: var(--text-bright); margin-right: 8px;">Order #${o.OrderNumber}</span>
                                    <span class="badge ${o.Status === 'DELIVERED' ? 'badge-emerald' : 'badge-cyan'}">${o.Status}</span>
                                </div>
                                <div style="font-size: 14px; font-weight: 800; color: var(--accent-emerald);">
                                    Total Payable: $${(o.TotalAmount || 0).toFixed(2)} (${o.PaymentMethod || 'COD'})
                                </div>
                            </div>

                            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 10px; margin-bottom: 12px; font-size: 12px;">
                                <div style="background: rgba(6, 182, 212, 0.05); padding: 8px 10px; border-radius: 6px; border: 1px solid rgba(6, 182, 212, 0.2);">
                                    <div style="font-size: 10px; font-weight: 700; color: var(--primary-cyan); text-transform: uppercase;">🏢 Step 1: Depot Pickup</div>
                                    <div style="color: var(--text-bright); font-weight: 600; margin-top: 2px;">${escapeHtml(o.CollectionAddress || 'Shoplytics Central Hub, Depot 4')}</div>
                                </div>
                                <div style="background: rgba(16, 185, 129, 0.05); padding: 8px 10px; border-radius: 6px; border: 1px solid rgba(16, 185, 129, 0.2);">
                                    <div style="font-size: 10px; font-weight: 700; color: var(--accent-emerald); text-transform: uppercase;">🏠 Step 2: Customer Destination</div>
                                    <div style="color: var(--text-bright); font-weight: 700;">👤 Customer: ${escapeHtml(o.CustomerName || o.CustomerFullName || 'Customer')}</div>
                                    <div style="color: #f59e0b; font-weight: 700; margin-top: 2px;">📞 Phone: <a href="tel:${escapeHtml(o.CustomerPhone)}" style="color: #f59e0b; text-decoration: underline;">${escapeHtml(o.CustomerPhone || 'N/A')}</a></div>
                                    <div style="color: var(--text-muted); margin-top: 2px;">📍 Address: ${escapeHtml(o.ShippingAddress)}</div>
                                </div>
                            </div>

                            <!-- Itemized Products List -->
                            <div style="margin-bottom: 12px;">
                                ${itemsMarkup}
                            </div>

                            <!-- Volunteer Controls -->
                            <div style="display: flex; gap: 8px; justify-content: flex-end; border-top: 1px solid rgba(255,255,255,0.08); padding-top: 10px;">
                                ${!o.VolunteerUserID ? `
                                    <button class="btn btn-primary" style="padding: 5px 12px; font-size: 11px;" onclick="acceptVolunteerOrder(${o.OrderID})">✋ Claim Task</button>
                                ` : ''}
                                ${isMine && (o.Status === 'SHIPPED' || o.Status === 'CONFIRMED') ? `
                                    <button class="btn btn-primary" style="padding: 5px 12px; font-size: 11px;" onclick="updateVolunteerOrderStatus(${o.OrderID}, 'COLLECTED')">🏢 Mark Collected</button>
                                ` : ''}
                                ${isMine && o.Status === 'COLLECTED' ? `
                                    <button class="btn btn-primary" style="padding: 5px 12px; font-size: 11px; background: var(--primary-cyan);" onclick="updateVolunteerOrderStatus(${o.OrderID}, 'OUT FOR DELIVERY')">🏍️ Mark Out for Delivery</button>
                                ` : ''}
                                ${isMine && o.Status === 'OUT FOR DELIVERY' ? `
                                    <button class="btn btn-primary" style="padding: 5px 12px; font-size: 11px; background: #10b981;" onclick="updateVolunteerOrderStatus(${o.OrderID}, 'DELIVERED')">✅ Mark Delivered</button>
                                ` : ''}
                                ${o.Status === 'DELIVERED' ? `
                                    <span style="font-size: 11px; color: var(--accent-emerald); font-weight: 700;">✓ Completed & Delivered</span>
                                ` : ''}
                            </div>
                        </div>
                    `;
                }

                return `
                    <div style="background: rgba(15, 23, 42, 0.6); border: 1px solid var(--border-color); border-radius: 12px; padding: 18px; margin-bottom: 16px;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; flex-wrap: wrap; gap: 8px; border-bottom: 1px solid rgba(255,255,255,0.08); padding-bottom: 10px;">
                            <div>
                                <span style="font-weight: 800; font-size: 15px; color: var(--text-bright); margin-right: 8px;">Order #${o.OrderNumber}</span>
                                <span style="font-size: 12px; color: var(--text-muted);">${dateStr}</span>
                            </div>
                            <div style="display: flex; align-items: center; gap: 10px;">
                                <span style="background: ${badgeBg}; color: ${badgeColor}; border: 1px solid ${badgeColor}; font-size: 11px; font-weight: 800; padding: 3px 10px; border-radius: 12px;">
                                    ${o.Status}
                                </span>
                                <span style="font-size: 16px; font-weight: 800; color: var(--text-bright);">$${(o.TotalAmount || 0).toFixed(2)}</span>
                            </div>
                        </div>

                        <!-- Itemized Products List -->
                        <div style="margin-bottom: 12px;">
                            ${itemsMarkup}
                        </div>

                        <!-- Assigned Volunteer Agent Info Banner -->
                        <div style="margin-bottom: 12px; padding: 8px 12px; background: rgba(6, 182, 212, 0.05); border-radius: 8px; border: 1px solid rgba(6, 182, 212, 0.2); font-size: 12px;">
                            🏍️ <strong>Assigned Delivery Volunteer:</strong> 
                            <span style="color: var(--primary-cyan); font-weight: 700;">${escapeHtml(o.VolunteerName || 'Assigning volunteer agent...')}</span>
                            ${o.VolunteerPhone ? `📞 <a href="tel:${escapeHtml(o.VolunteerPhone)}" style="color: #f59e0b; font-weight: 700; text-decoration: underline;">(${escapeHtml(o.VolunteerPhone)})</a>` : ''}
                        </div>

                        <!-- Delivery Address & Payment Summary -->
                        <div style="display: flex; justify-content: space-between; align-items: center; font-size: 12px; color: var(--text-muted); flex-wrap: wrap; gap: 8px; background: rgba(0,0,0,0.2); padding: 10px 12px; border-radius: 8px;">
                            <div>
                                <i class="ri-map-pin-line" style="color: var(--primary-cyan);"></i> Delivery to: <strong style="color: var(--text-bright);">${escapeHtml(o.ShippingAddress || 'Default Address')}</strong>
                            </div>
                            <div>
                                💳 Payment: <strong style="color: var(--text-bright);">${o.PaymentMethod || 'COD'}</strong> (${o.PaymentStatus || 'PENDING'})
                            </div>
                        </div>
                    </div>
                `;
            }).join('');
        }
    } catch (err) {
        console.error('Error loading customer past orders:', err);
        if (ordersContainer) {
            ordersContainer.innerHTML = `<div style="color: var(--accent-rose); text-align: center; padding: 20px;">Failed to load past order history: ${err.message}</div>`;
        }
    }
}

function openCustomerProfileModal() {
    const modal = document.getElementById('modal-customer-profile');
    if (modal) {
        modal.classList.add('active');
        if (typeof loadCustomerProfileView === 'function') loadCustomerProfileView();
    }
}

function closeCustomerProfileModal() {
    const modal = document.getElementById('modal-customer-profile');
    if (modal) {
        modal.classList.remove('active');
    }
}

/* Amazon Product Specifications & Color/Size Variant Modal */
let activeDetailProduct = null;
let activeSelectedColor = 'Midnight Green';
let activeSelectedSize = '6GB + 128GB';

function openProductDetailsModal(productID) {
    const product = allStoreProducts.find(p => p.ProductID === productID);
    if (!product) return;

    activeDetailProduct = product;

    const modal = document.getElementById('modal-product-details');
    const imgContainer = document.getElementById('pdetails-img-container');
    const nameEl = document.getElementById('pdetails-name');
    const catEl = document.getElementById('pdetails-category');
    const priceEl = document.getElementById('pdetails-price');
    const ratingEl = document.getElementById('pdetails-rating');
    const reviewsBtn = document.getElementById('pdetails-view-reviews-btn');
    const colorsContainer = document.getElementById('pdetails-colors-container');
    const sizesContainer = document.getElementById('pdetails-sizes-container');
    const specsGrid = document.getElementById('pdetails-specs-grid');
    const selectedColorEl = document.getElementById('pdetails-selected-color');
    const selectedSizeEl = document.getElementById('pdetails-selected-size');
    const addCartBtn = document.getElementById('pdetails-add-cart-btn');
    const saveLaterBtn = document.getElementById('pdetails-save-later-btn');

    if (imgContainer) imgContainer.innerHTML = renderProductImageHTML(product.ImageURL, '📦');
    if (nameEl) nameEl.innerText = product.ProductName;
    if (catEl) catEl.innerText = product.Category || 'General';
    if (priceEl) priceEl.innerText = `$${parseFloat(product.Price || 99.99).toFixed(2)}`;
    if (ratingEl) ratingEl.innerText = `⭐ ${parseFloat(product.PopularityRating || 4.8).toFixed(1)} / 5.0`;

    if (reviewsBtn) {
        reviewsBtn.onclick = () => {
            closeProductDetailsModal();
            openProductReviewsModal(product.ProductKey, product.ProductName, product.ImageURL, product.Category, product.Price, product.PopularityRating);
        };
    }

    // Product-Specific Authentic Specifications, Colors & Variants
    let colors = ['Obsidian Black', 'Space Gray', 'Silver White'];
    let sizes = ['Standard'];
    let specs = [
        ['Brand Name', product.Brand || 'Shoplytics'],
        ['In-Stock Units', `${product.StockQuantity || 100} Units Available`],
        ['Warranty Support', '1 Year Official Manufacturer Warranty']
    ];

    // If database has raw Specifications string (e.g. "Capacity: 30 Qt | Press & Pull Latches | Made in USA")
    if (product.Specifications && typeof product.Specifications === 'string') {
        const rawParts = product.Specifications.split('|').map(s => s.trim()).filter(Boolean);
        specs = [
            ['Brand Name', product.Brand || 'Official Brand'],
            ...rawParts.map(part => {
                if (part.includes(':')) {
                    const [k, v] = part.split(':');
                    return [k.trim(), v.trim()];
                }
                return ['Feature Spec', part];
            }),
            ['In-Stock Units', `${product.StockQuantity || 100} Units Available`],
            ['Warranty Support', 'Official Manufacturer Guarantee']
        ];
    }

    const pName = (product.ProductName || '').toLowerCase();
    const category = (product.Category || '').toLowerCase();

    // Match Specific Product Lines for Colors & Sizes
    if (pName.includes('pelican') || pName.includes('yeti') || pName.includes('cooler')) {
        colors = ['Charcoal Gray', 'Pacific Blue', 'Seafoam Green', 'White & Red'];
        sizes = ['20-Quart Compact', '30-Quart Elite', '50-Quart Wheeled', '70-Quart Heavy Duty'];
        if (!product.Specifications) {
            specs = [
                ['Brand Name', product.Brand || 'Pelican'],
                ['Ice Retention', 'Up to 10 Days Extreme Cold Retention'],
                ['Material & Build', 'Rotomolded Polypropylene & Stainless Steel'],
                ['Latch System', 'Press & Pull Heavy Duty Dual Latches'],
                ['Features', 'Molded Cup Holders & Built-in Stainless Bottle Opener'],
                ['Warranty Support', 'Lifetime Guarantee (You Break It, We Replace It)']
            ];
        }
    } else if (pName.includes('fitbit') || pName.includes('garmin') || pName.includes('watch') || pName.includes('tracker')) {
        colors = ['Obsidian Black', 'Porcelain White', 'Coral Pink', 'Sage Gray'];
        sizes = ['Small (140mm - 180mm)', 'Large (180mm - 220mm)'];
        if (!product.Specifications) {
            specs = [
                ['Brand Name', product.Brand || 'Fitbit / Garmin'],
                ['Display Type', 'Color Touchscreen AMOLED Display'],
                ['Battery Life', 'Up to 7 Days Continuous Battery'],
                ['Water Resistance', '50 Meters (5 ATM Swimproof)'],
                ['Sensors & GPS', 'Built-in GPS, SpO2 Oxygen, Optical Heart Rate'],
                ['Compatibility', 'iOS 15+ and Android 10+ Compatible']
            ];
        }
    } else if (pName.includes('iphone') || pName.includes('galaxy') || pName.includes('pixel') || pName.includes('oneplus') || pName.includes('phone')) {
        colors = ['Natural Titanium', 'Midnight Black', 'Ocean Blue', 'Starlight White'];
        sizes = ['128GB Storage', '256GB Storage', '512GB Storage', '1TB Ultra'];
        if (!product.Specifications) {
            specs = [
                ['Brand Name', product.Brand || 'Apple / Samsung'],
                ['Processor Chip', 'A17 Pro / Snapdragon 8 Gen 3'],
                ['Display Screen', '6.1" - 6.8" 120Hz ProMotion OLED'],
                ['Camera System', '48MP Pro Triple Lens with 5x Optical Zoom'],
                ['Battery & Charge', 'Fast Charging (50% in 30 Mins)'],
                ['Operating System', 'iOS 17 / Android 14']
            ];
        }
    } else if (pName.includes('macbook') || pName.includes('laptop') || pName.includes('dell') || pName.includes('surface') || pName.includes('asus')) {
        colors = ['Space Black', 'Silver Chrome', 'Gunmetal Gray'];
        sizes = ['16GB RAM + 512GB SSD', '36GB RAM + 1TB SSD', '64GB RAM + 2TB SSD'];
        if (!product.Specifications) {
            specs = [
                ['Brand Name', product.Brand || 'Apple / Dell'],
                ['Processor', 'Apple M3 Max / Intel Core i9-13900H'],
                ['Display Screen', 'Liquid Retina XDR / 4K OLED Touch'],
                ['Graphics Processor', 'Hardware Accelerated Ray Tracing GPU'],
                ['Battery Runtime', 'Up to 22 Hours Battery Life'],
                ['Ports & I/O', 'Thunderbolt 4, HDMI, SDXC Card Slot']
            ];
        }
    } else if (category.includes('fashion') || category.includes('apparel') || pName.includes('shoes') || pName.includes('nike') || pName.includes('adidas') || pName.includes('boots') || pName.includes('t-shirt') || pName.includes('jeans')) {
        colors = ['Stealth Black', 'Crimson Red', 'Navy Blue', 'Arctic White'];
        sizes = ['UK 7 / US 8', 'UK 8 / US 9', 'UK 9 / US 10', 'UK 10 / US 11'];
        if (!product.Specifications) {
            specs = [
                ['Brand Name', product.Brand || 'Nike / Adidas / Levi\'s'],
                ['Upper Material', 'Engineered Breathable Mesh & Genuine Leather'],
                ['Outsole Sole', 'Non-Slip Cushioned Rubber Outsole'],
                ['Fit Type', 'Standard Athletic Fit'],
                ['Care Instructions', 'Machine Wash Cold / Air Dry'],
                ['In-Stock Status', `${product.StockQuantity || 85} Pairs Available`]
            ];
        }
    } else if (category.includes('kitchen') || category.includes('home') || pName.includes('blender') || pName.includes('coffee') || pName.includes('vacuum') || pName.includes('cooker') || pName.includes('fryer')) {
        colors = ['Brushed Stainless Steel', 'Matte Black', 'Cream Gold', 'Deep Red'];
        sizes = ['Standard 1.5L', 'Family 4.0L', 'Commercial 6.0L'];
        if (!product.Specifications) {
            specs = [
                ['Brand Name', product.Brand || 'Ninja / Vitamix / iRobot'],
                ['Capacity', 'Family Size Heavy Duty Capacity'],
                ['Power Output', '1500 Watts High Efficiency Motor'],
                ['Voltage Rating', '220-240 V AC / 50-60 Hz'],
                ['Dishwasher Safe', 'Yes (BPA-Free Attachments)'],
                ['Warranty Support', '2 Year Official Manufacturer Warranty']
            ];
        }
    } else if (category.includes('kindle') || category.includes('books') || pName.includes('book') || pName.includes('kindle')) {
        colors = ['Black Leather', 'Charcoal E-Ink', 'Navy Fabric'];
        sizes = ['Digital E-Book', 'Paperback', 'Hardcover Collector Edition'];
        if (!product.Specifications) {
            specs = [
                ['Brand Name', product.Brand || 'Amazon Kindle / Penguin'],
                ['Format Type', 'Glare-Free 300 ppi High Resolution Display'],
                ['Battery Runtime', 'Up to 10 Weeks Battery Life'],
                ['Waterproof Rating', 'IPX8 Waterproof Protection'],
                ['Storage Space', '16GB Holds Thousands of Books'],
                ['Lighting', 'Adjustable Warm Light Display']
            ];
        }
    }

    activeSelectedColor = colors[0];
    activeSelectedSize = sizes[1] || sizes[0];

    // Render Color Swatches
    if (colorsContainer) {
        colorsContainer.innerHTML = colors.map((c, i) => `
            <button class="btn btn-outline" style="padding: 4px 10px; font-size: 11px; ${c === activeSelectedColor ? 'border-color: var(--primary-cyan); color: var(--primary-cyan); font-weight: 700; background: rgba(6,182,212,0.1);' : 'color: var(--text-muted);'}" onclick="selectProductColor('${c}', this)">
                🎨 ${c}
            </button>
        `).join('');
    }

    // Render Size Pills
    if (sizesContainer) {
        sizesContainer.innerHTML = sizes.map((s, i) => `
            <button class="btn btn-outline" style="padding: 4px 10px; font-size: 11px; ${s === activeSelectedSize ? 'border-color: var(--accent-emerald); color: var(--accent-emerald); font-weight: 700; background: rgba(16,185,129,0.1);' : 'color: var(--text-muted);'}" onclick="selectProductSize('${s}', this)">
                📐 ${s}
            </button>
        `).join('');
    }

    // Render Specs Grid
    if (specsGrid) {
        specsGrid.innerHTML = specs.map(([k, v]) => `
            <div style="font-weight: 700; color: var(--text-muted);">${escapeHtml(k)}:</div>
            <div style="color: var(--text-bright); font-weight: 600;">${escapeHtml(v)}</div>
        `).join('');
    }

    if (selectedColorEl) selectedColorEl.innerText = activeSelectedColor;
    if (selectedSizeEl) selectedSizeEl.innerText = activeSelectedSize;

    if (addCartBtn) {
        addCartBtn.onclick = () => {
            addToCart(product.ProductID);
            closeProductDetailsModal();
        };
    }

    if (saveLaterBtn) {
        saveLaterBtn.onclick = () => {
            const item = {
                productKey: product.ProductKey,
                productID: product.ProductID,
                productName: `${product.ProductName} (${activeSelectedColor}, ${activeSelectedSize})`,
                price: product.Price,
                imageURL: product.ImageURL || '📦',
                quantity: 1
            };
            const existing = savedForLater.find(s => s.productKey === item.productKey);
            if (existing) existing.quantity += 1;
            else savedForLater.push(item);
            localStorage.setItem('shoplytics_saved_for_later', JSON.stringify(savedForLater));
            if (window.updateSavedForLaterUI) window.updateSavedForLaterUI();
            alert(`🔖 Saved ${product.ProductName} (${activeSelectedColor}) for later!`);
            closeProductDetailsModal();
        };
    }

    if (modal) modal.classList.add('active');
}

function selectProductColor(color, btn) {
    activeSelectedColor = color;
    document.querySelectorAll('#pdetails-colors-container button').forEach(b => {
        b.style.borderColor = 'var(--border-color)';
        b.style.color = 'var(--text-muted)';
        b.style.background = 'transparent';
    });
    if (btn) {
        btn.style.borderColor = 'var(--primary-cyan)';
        btn.style.color = 'var(--primary-cyan)';
        btn.style.fontWeight = '700';
        btn.style.background = 'rgba(6,182,212,0.1)';
    }
    const colorLabel = document.getElementById('pdetails-selected-color');
    if (colorLabel) colorLabel.innerText = color;
}

function selectProductSize(size, btn) {
    activeSelectedSize = size;
    document.querySelectorAll('#pdetails-sizes-container button').forEach(b => {
        b.style.borderColor = 'var(--border-color)';
        b.style.color = 'var(--text-muted)';
        b.style.background = 'transparent';
    });
    if (btn) {
        btn.style.borderColor = 'var(--accent-emerald)';
        btn.style.color = 'var(--accent-emerald)';
        btn.style.fontWeight = '700';
        btn.style.background = 'rgba(16,185,129,0.1)';
    }
    const sizeLabel = document.getElementById('pdetails-selected-size');
    if (sizeLabel) sizeLabel.innerText = size;
}

function closeProductDetailsModal() {
    const modal = document.getElementById('modal-product-details');
    if (modal) modal.classList.remove('active');
}

window.openProductDetailsModal = openProductDetailsModal;
window.closeProductDetailsModal = closeProductDetailsModal;

