const db = require('../config/database');

async function listUsers() {
    const users = await db.query(`SELECT UserID, FullName, Email, CustomerKey, Role FROM Users ORDER BY UserID DESC LIMIT 10`);
    console.log('Recent Users:', users);
    process.exit(0);
}

listUsers().catch(err => {
    console.error(err);
    process.exit(1);
});
