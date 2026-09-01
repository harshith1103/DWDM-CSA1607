const db = require('../config/database');

async function testFK() {
    const fullDateStr = new Date().toISOString().split('T')[0];
    const dateKey = parseInt(fullDateStr.replace(/-/g, ''));
    console.log('Today DateKey:', dateKey);

    const dateRow = await db.get(`SELECT * FROM DimDate WHERE DateKey = ?`, [dateKey]);
    console.log('DimDate Row:', dateRow);

    const custRow = await db.get(`SELECT * FROM DimCustomer LIMIT 5`);
    console.log('Sample DimCustomer Rows:', custRow);

    process.exit(0);
}

testFK().catch(err => {
    console.error(err);
    process.exit(1);
});
