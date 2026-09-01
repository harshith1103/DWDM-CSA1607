const fs = require('fs');

try {
    const ordersContent = fs.readFileSync('public/js/orders.js', 'utf8');
    const adminContent = fs.readFileSync('public/js/admin.js', 'utf8');
    const appContent = fs.readFileSync('public/js/app.js', 'utf8');

    console.log('Read all JS files successfully!');
} catch (e) {
    console.error('JS Error:', e.message);
}
