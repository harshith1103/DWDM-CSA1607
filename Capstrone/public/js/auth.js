/**
 * Authentication & Role Management Module
 */
let currentUser = null;
let currentAuthMode = 'login'; // 'login', 'signup', or 'admin'

function initAuth() {
    const token = localStorage.getItem('shoplytics_token');
    const userStr = localStorage.getItem('shoplytics_user');

    if (token && userStr) {
        try {
            currentUser = JSON.parse(userStr);
            updateUserUI();
        } catch (e) {
            currentUser = null;
            updateUserUI();
            openAuthModal('login');
        }
    } else {
        currentUser = null;
        updateUserUI();
        // Require login or sign up on initial app launch
        openAuthModal('login');
    }
}

function updateUserUI() {
    const avatar = document.getElementById('user-avatar-initials');
    const name = document.getElementById('user-display-name');
    const role = document.getElementById('user-display-role');
    const btn = document.getElementById('btn-auth-trigger');

    if (currentUser) {
        avatar.innerText = currentUser.fullName ? currentUser.fullName.charAt(0).toUpperCase() : 'U';
        name.innerText = currentUser.fullName;
        role.innerText = currentUser.role.toUpperCase();
        btn.innerHTML = `<i class="ri-logout-box-line"></i> Logout`;
        btn.onclick = logout;
    } else {
        avatar.innerText = '🔐';
        name.innerText = 'Account';
        role.innerText = 'Not Signed In';
        btn.innerHTML = `<i class="ri-login-box-line"></i> Login / Sign Up`;
        btn.onclick = openAuthModal;
    }

    applyRoleNavigation();
}

function applyRoleNavigation() {
    const navItems = document.querySelectorAll('.sidebar-menu .menu-item');
    const role = currentUser ? (currentUser.role || '').toLowerCase() : 'guest';

    navItems.forEach(item => {
        const tab = item.getAttribute('data-tab');
        if (role === 'admin') {
            // Admin sees ALL active tabs including Stock Management, Apriori Rules & Orders
            item.style.display = 'flex';
        } else if (tab === 'apriori') {
            item.style.display = 'none';
        } else if (role === 'volunteer') {
            // Volunteer sees Volunteer Portal and BI Analytics
            if (['volunteer-portal', 'dashboard'].includes(tab)) {
                item.style.display = 'flex';
            } else {
                item.style.display = 'none';
            }
        } else if (role === 'customer') {
            // Customer sees Store, My Orders, BI Analytics, RFM. Hides Admin Dispatch & Stock Management.
            if (['admin', 'volunteer-portal', 'stock-management'].includes(tab)) {
                item.style.display = 'none';
            } else {
                item.style.display = 'flex';
            }
        } else { // guest
            if (['admin', 'volunteer-portal', 'stock-management'].includes(tab)) {
                item.style.display = 'none';
            } else {
                item.style.display = 'flex';
            }
        }
    });

    const myOrdersNavText = document.querySelector('.sidebar-menu .menu-item[data-tab="my-orders"] span');
    if (myOrdersNavText) {
        myOrdersNavText.innerText = role === 'admin' ? 'Orders' : 'My Orders';
    }

    const activeTab = document.querySelector('.sidebar-menu .menu-item.active');
    if (activeTab && activeTab.style.display === 'none') {
        if (role === 'volunteer') {
            switchTab('volunteer-portal');
        } else {
            switchTab('dashboard');
        }
    }
}

function openAuthModal() {
    document.getElementById('modal-auth').classList.add('active');
    setAuthMode('login');
}

function closeAuthModal() {
    document.getElementById('modal-auth').classList.remove('active');
}

function setAuthMode(mode) {
    currentAuthMode = mode;

    document.querySelectorAll('.auth-mode-tab').forEach(btn => btn.classList.remove('active'));
    const activeTabBtn = document.getElementById(`tab-auth-${mode}`);
    if (activeTabBtn) activeTabBtn.classList.add('active');

    const title = document.getElementById('modal-auth-title');
    const extra = document.getElementById('signup-extra-fields');
    const adminNotice = document.getElementById('admin-notice-box');
    const submitBtn = document.getElementById('btn-auth-submit');
    const emailInput = document.getElementById('auth-email');
    const passwordInput = document.getElementById('auth-password');

    if (mode === 'signup') {
        title.innerHTML = `<i class="ri-user-add-line" style="color: var(--primary-cyan);"></i> Create Shoplytics Account`;
        extra.style.display = 'block';
        if (adminNotice) adminNotice.style.display = 'none';
        submitBtn.innerText = 'Register Account (Customer / Volunteer)';
        emailInput.value = '';
        passwordInput.value = '';
        if (window.handleCountryCodeChange) {
            window.handleCountryCodeChange('auth-country-code', 'auth-phone', 'auth-phone-helper');
        }
    } else if (mode === 'admin') {
        title.innerHTML = `<i class="ri-shield-user-line" style="color: #f59e0b;"></i> Protected Admin Portal Sign In`;
        extra.style.display = 'none';
        if (adminNotice) adminNotice.style.display = 'block';
        submitBtn.innerText = 'Sign In to Protected Admin Portal';
        emailInput.value = 'admin@gmail.com';
        passwordInput.value = '123456';
    } else { // 'login'
        title.innerHTML = `<i class="ri-shield-keyhole-line" style="color: var(--primary-cyan);"></i> Shoplytics User Sign In`;
        extra.style.display = 'none';
        if (adminNotice) adminNotice.style.display = 'none';
        submitBtn.innerText = 'Sign In';
        if (emailInput.value === 'admin@gmail.com') emailInput.value = 'customer@gmail.com';
        if (!passwordInput.value) passwordInput.value = '123456';
    }
}

function toggleAuthMode(e) {
    if (e) e.preventDefault();
    if (currentAuthMode === 'login') {
        setAuthMode('signup');
    } else {
        setAuthMode('login');
    }
}

async function quickDemoLogin(role) {
    let email = 'customer@gmail.com';
    let password = '123456';

    if (role === 'admin') {
        email = 'admin@gmail.com';
        password = '123456';
        setAuthMode('admin');
    } else if (role === 'volunteer') {
        email = 'volunteer@gmail.com';
        password = '123456';
        setAuthMode('login');
    } else {
        setAuthMode('login');
    }

    document.getElementById('auth-email').value = email;
    document.getElementById('auth-password').value = password;

    const endpoint = role === 'admin' ? '/api/auth/admin-login' : '/api/auth/login';
    await executeAuth(email, password, endpoint, { email, password });
}

async function handleAuthSubmit(e) {
    e.preventDefault();

    const email = document.getElementById('auth-email').value.trim();
    const password = document.getElementById('auth-password').value.trim();
    const fullName = document.getElementById('auth-fullname') ? document.getElementById('auth-fullname').value.trim() : '';
    const role = document.getElementById('auth-role') ? document.getElementById('auth-role').value : 'customer';

    const countryCodeSelect = document.getElementById('auth-country-code');
    const countryCode = countryCodeSelect ? countryCodeSelect.value : '+91';
    const opt = countryCodeSelect ? countryCodeSelect.options[countryCodeSelect.selectedIndex] : null;
    const requiredDigits = opt ? parseInt(opt.getAttribute('data-digits') || '10') : 10;

    let rawPhone = document.getElementById('auth-phone') ? document.getElementById('auth-phone').value.trim().replace(/\D/g, '') : '9876543210';

    if (!email.toLowerCase().endsWith('@gmail.com')) {
        alert('❌ Invalid Email: Email address must end with @gmail.com (e.g. user@gmail.com)');
        return;
    }

    if (password.length < 6) {
        alert('❌ Invalid Password: Password must be at least 6 digits/characters.');
        return;
    }

    if (currentAuthMode === 'signup') {
        if (!fullName) {
            alert('❌ Full Name is required.');
            return;
        }
        if (rawPhone.length !== requiredDigits) {
            alert(`❌ Invalid Phone: Exactly ${requiredDigits} numeric digits required for ${opt ? opt.innerText.trim() : 'selected country'}.`);
            return;
        }
    }

    const fullPhone = `${countryCode} ${rawPhone}`;
    let endpoint = '/api/auth/login';
    let payload = { email, password };

    if (currentAuthMode === 'signup') {
        endpoint = '/api/auth/register';
        payload = {
            email,
            password,
            fullName,
            phone: fullPhone,
            role
        };
    } else if (currentAuthMode === 'admin' || email.toLowerCase() === 'admin@gmail.com') {
        endpoint = '/api/auth/admin-login';
        payload = { email, password };
    }

    await executeAuth(email, password, endpoint, payload);
}

async function executeAuth(email, password, endpoint, payload) {
    try {
        const res = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Authentication failed');

        localStorage.setItem('shoplytics_token', data.token);
        localStorage.setItem('shoplytics_user', JSON.stringify(data.user));
        currentUser = data.user;
        
        updateUserUI();
        closeAuthModal();

        if (currentUser.role === 'volunteer') {
            switchTab('volunteer-portal');
        } else if (currentUser.role === 'customer') {
            switchTab('store');
        } else if (currentUser.role === 'admin') {
            switchTab('dashboard');
        }

        if (window.loadCustomerOrders) loadCustomerOrders();
        if (window.loadCustomerProfileView) window.loadCustomerProfileView();
        if (window.loadAdminOrders) loadAdminOrders();
        if (window.loadVolunteerDeliveries) loadVolunteerDeliveries();

    } catch (err) {
        alert(err.message);
    }
}

function logout() {
    localStorage.removeItem('shoplytics_token');
    localStorage.removeItem('shoplytics_user');
    currentUser = null;
    updateUserUI();
    if (window.loadCustomerProfileView) window.loadCustomerProfileView();
    switchTab('dashboard');
    alert('Logged out successfully.');
}
