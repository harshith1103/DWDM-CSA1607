const db = require('../config/database');

async function testAdminOrders() {
    const adminUser = await db.get(`SELECT * FROM Users WHERE Role = 'admin' LIMIT 1`);
    console.log('Admin User:', adminUser ? adminUser.FullName : 'None');

    const jwt = require('jsonwebtoken');
    const token = jwt.sign(
        { userId: adminUser.UserID, email: adminUser.Email, role: adminUser.Role, fullName: adminUser.FullName },
        'shoplytics_secret_jwt_key_2026',
        { expiresIn: '1h' }
    );

    const http = require('http');
    http.get({
        hostname: 'localhost',
        port: 3000,
        path: '/api/admin/orders',
        headers: {
            'Authorization': `Bearer ${token}`
        }
    }, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
            console.log('Admin API Status Code:', res.statusCode);
            if (res.statusCode === 200) {
                const orders = JSON.parse(data);
                console.log(`Admin Portal retrieved ${orders.length} orders!`);
                orders.forEach(o => {
                    console.log(`Order #${o.OrderNumber} | Status: ${o.Status} | Volunteer: ${o.VolunteerName || 'Unassigned'} (ID: ${o.VolunteerUserID})`);
                });
            } else {
                console.log('Response body:', data);
            }
            process.exit(0);
        });
    });
}

testAdminOrders().catch(err => {
    console.error(err);
    process.exit(1);
});
