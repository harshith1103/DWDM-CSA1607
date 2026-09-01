const db = require('../config/database');

async function testVolunteerOrders() {
    const volunteerUser = await db.get(`SELECT * FROM Users WHERE Role = 'volunteer' LIMIT 1`);
    console.log('Volunteer User:', volunteerUser.FullName, 'UserID:', volunteerUser.UserID);

    const jwt = require('jsonwebtoken');
    const token = jwt.sign(
        { userId: volunteerUser.UserID, email: volunteerUser.Email, role: volunteerUser.Role, fullName: volunteerUser.FullName },
        'shoplytics_super_secret_jwt_key_2026',
        { expiresIn: '1h' }
    );

    const http = require('http');
    http.get({
        hostname: 'localhost',
        port: 3000,
        path: '/api/orders/volunteer',
        headers: {
            'Authorization': `Bearer ${token}`
        }
    }, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
            console.log('Status Code:', res.statusCode);
            const orders = JSON.parse(data);
            console.log(`Volunteer Portal retrieved ${orders.length} active delivery tasks!`);
            if (orders.length > 0) {
                console.log('Sample Order #:', orders[0].OrderNumber, 'Status:', orders[0].Status, 'Customer:', orders[0].CustomerName || orders[0].CustomerFullName, 'Phone:', orders[0].CustomerPhone);
                console.log('Pickup Hub:', orders[0].CollectionAddress);
                console.log('Destination:', orders[0].ShippingAddress);
                console.log('Items Count:', orders[0].items.length);
            }
            process.exit(0);
        });
    });
}

testVolunteerOrders().catch(err => {
    console.error(err);
    process.exit(1);
});
