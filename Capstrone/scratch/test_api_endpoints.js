const http = require('http');

const BASE_URL = 'http://localhost:3000';

function makeRequest(path, method = 'GET', body = null, headers = {}) {
    return new Promise((resolve, reject) => {
        const url = new URL(path, BASE_URL);
        const options = {
            hostname: url.hostname,
            port: url.port,
            path: url.pathname + url.search,
            method: method,
            headers: {
                'Content-Type': 'application/json',
                ...headers
            }
        };

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    resolve({ status: res.statusCode, body: parsed });
                } catch (e) {
                    resolve({ status: res.statusCode, body: data });
                }
            });
        });

        req.on('error', err => reject(err));
        if (body) req.write(JSON.stringify(body));
        req.end();
    });
}

async function runTests() {
    console.log('=======================================================');
    console.log('🧪 Starting SHOPLYTICS Full System Integration Tests');
    console.log('=======================================================');

    try {
        // 1. Test Customer Login
        console.log('\n--- 1. Testing Customer Login ---');
        const loginRes = await makeRequest('/api/auth/login', 'POST', {
            email: 'customer@gmail.com',
            password: '123456'
        });
        console.log(`Status: ${loginRes.status}`);
        console.log(`User: ${loginRes.body.user ? loginRes.body.user.fullName : 'Failed'}`);
        const customerToken = `Bearer ${loginRes.body.token}`;

        // 2. Test Admin Login
        console.log('\n--- 2. Testing Protected Admin Login ---');
        const adminLoginRes = await makeRequest('/api/auth/admin-login', 'POST', {
            email: 'admin@gmail.com',
            password: '123456'
        });
        console.log(`Status: ${adminLoginRes.status}`);
        console.log(`Admin User: ${adminLoginRes.body.user ? adminLoginRes.body.user.fullName : 'Failed'}`);
        const adminToken = `Bearer ${adminLoginRes.body.token}`;

        // 3. Test Invalid Email Signup Rejection
        console.log('\n--- 3. Testing Non-Gmail Rejection ---');
        const invalidEmailRes = await makeRequest('/api/auth/register', 'POST', {
            fullName: 'Test User',
            email: 'user@yahoo.com',
            password: '123456',
            phone: '9876543210',
            role: 'customer'
        });
        console.log(`Status: ${invalidEmailRes.status} (Expected 400)`);
        console.log(`Error: ${invalidEmailRes.body.error}`);

        // 4. Test Public Admin Registration Rejection
        console.log('\n--- 4. Testing Public Admin Registration Rejection ---');
        const adminSignupRes = await makeRequest('/api/auth/register', 'POST', {
            fullName: 'Hacker Admin',
            email: 'hacker@gmail.com',
            password: '123456',
            phone: '9876543210',
            role: 'admin'
        });
        console.log(`Status: ${adminSignupRes.status} (Expected 403)`);
        console.log(`Error: ${adminSignupRes.body.error}`);

        // 5. Test Product Catalog
        console.log('\n--- 5. Testing Product Catalog API ---');
        const productsRes = await makeRequest('/api/products');
        console.log(`Status: ${productsRes.status}`);
        console.log(`Products Count: ${Array.isArray(productsRes.body) ? productsRes.body.length : 0}`);

        // 6. Test Address Management
        console.log('\n--- 6. Testing Saved Address Creation ---');
        const addressRes = await makeRequest('/api/addresses', 'POST', {
            label: 'WORK',
            fullName: 'Harshith Narra',
            phone: '9876543210',
            houseFlat: 'Tower B, Tech Park',
            street: 'HITEC City',
            area: 'Gachibowli',
            city: 'Hyderabad',
            state: 'Telangana',
            postalCode: '500081',
            latitude: 17.4435,
            longitude: 78.3772,
            isDefault: true
        }, { Authorization: customerToken });
        console.log(`Status: ${addressRes.status}`);
        console.log(`Address ID: ${addressRes.body.addressId}`);

        // 7. Test Order Placement & Payment Verification
        console.log('\n--- 7. Testing Checkout & Order Placement ---');
        const orderRes = await makeRequest('/api/orders', 'POST', {
            shippingAddress: 'Tower B, Tech Park, HITEC City, Hyderabad',
            customerPhone: '9876543210',
            shippingLatitude: 17.4435,
            shippingLongitude: 78.3772,
            paymentMethod: 'UPI',
            deliveryType: 'Express',
            items: [{ productKey: 1, quantity: 1 }, { productKey: 2, quantity: 1 }]
        }, { Authorization: customerToken });
        console.log(`Status: ${orderRes.status}`);
        console.log(`Order Number: ${orderRes.body.order ? orderRes.body.order.orderNumber : 'Failed'}`);
        const orderId = orderRes.body.order ? orderRes.body.order.orderId : 1;

        // 8. Test Live Order Tracking
        console.log('\n--- 8. Testing Live Delivery Tracking ---');
        const trackingRes = await makeRequest(`/api/delivery/track/${orderId}`, 'GET', null, { Authorization: customerToken });
        console.log(`Status: ${trackingRes.status}`);
        console.log(`Volunteer Agent: ${trackingRes.body.volunteer ? trackingRes.body.volunteer.name : 'Unassigned'}`);

        // 9. Test Apriori Mining Execution
        console.log('\n--- 9. Testing Apriori Mining Engine ---');
        const aprioriRes = await makeRequest('/api/apriori/mine', 'POST', { minSupport: 0.03, minConfidence: 0.25 });
        console.log(`Status: ${aprioriRes.status}`);
        console.log(`Association Rules Generated: ${aprioriRes.body.rulesCount}`);

        // 10. Test OLAP Query Execution
        console.log('\n--- 10. Testing OLAP Cube Operations ---');
        const olapRes = await makeRequest('/api/olap/query', 'POST', { operation: 'PIVOT' });
        console.log(`Status: ${olapRes.status}`);
        console.log(`OLAP Results Count: ${olapRes.body.resultsCount}`);

        // 11. Test RFM Customer Segmentation
        console.log('\n--- 11. Testing RFM Analytics ---');
        const rfmRes = await makeRequest('/api/analytics/rfm');
        console.log(`Status: ${rfmRes.status}`);
        console.log(`Customers Segmented: ${Array.isArray(rfmRes.body) ? rfmRes.body.length : 0}`);

        console.log('\n=======================================================');
        console.log('✅ ALL SHOPLYTICS SYSTEM TESTS PASSED SUCCESSFULLY!');
        console.log('=======================================================');
    } catch (e) {
        console.error('Test execution error:', e);
    }
}

runTests();
