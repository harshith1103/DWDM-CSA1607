const db = require('../config/database');

async function testMyOrders() {
    const user = await db.get(`SELECT * FROM Users WHERE Role = 'customer' LIMIT 1`);

    const jwt = require('jsonwebtoken');
    const token = jwt.sign(
        { userId: user.UserID, email: user.Email, role: user.Role, fullName: user.FullName, customerKey: user.CustomerKey },
        'shoplytics_super_secret_jwt_key_2026',
        { expiresIn: '1h' }
    );

    const http = require('http');
    req = http.get({
        hostname: 'localhost',
        port: 3000,
        path: '/api/orders/my-orders',
        headers: {
            'Authorization': `Bearer ${token}`
        }
    }, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
            console.log('Status Code:', res.statusCode);
            const orders = JSON.parse(data);
            console.log(`Retrieved ${orders.length} orders for customer.`);
            if (orders.length > 0) {
                console.log('Latest Order:', orders[0].OrderNumber, 'Items:', orders[0].items.length);
            }
            process.exit(0);
        });
    });
}

testMyOrders().catch(err => {
    console.error(err);
    process.exit(1);
});
