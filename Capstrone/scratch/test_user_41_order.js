const db = require('../config/database');

async function testUser41Order() {
    const user = await db.get(`SELECT * FROM Users WHERE UserID = 41`);
    console.log('User 41:', user);

    const product = await db.get(`SELECT ProductKey, ProductID, Price FROM DimProduct WHERE ProductID = 'PROD-710' LIMIT 1`);

    const jwt = require('jsonwebtoken');
    const token = jwt.sign(
        { userId: user.UserID, email: user.Email, role: user.Role, fullName: user.FullName, customerKey: user.CustomerKey },
        'shoplytics_super_secret_jwt_key_2026',
        { expiresIn: '1h' }
    );

    const http = require('http');
    const postData = JSON.stringify({
        shippingAddress: 'Flat 402, Royal Residency, Road No 12, Banjara Hills, Hyderabad',
        customerPhone: '+91 9876543210',
        paymentMethod: 'COD',
        deliveryType: 'Standard',
        items: [{ productKey: product.ProductID, quantity: 1 }]
    });

    const req = http.request({
        hostname: 'localhost',
        port: 3000,
        path: '/api/orders',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            'Content-Length': Buffer.byteLength(postData)
        }
    }, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
            console.log('Status Code:', res.statusCode);
            console.log('Response:', data);
            process.exit(0);
        });
    });

    req.on('error', (e) => {
        console.error('Request error:', e.message);
        process.exit(1);
    });

    req.write(postData);
    req.end();
}

testUser41Order().catch(err => {
    console.error(err);
    process.exit(1);
});
