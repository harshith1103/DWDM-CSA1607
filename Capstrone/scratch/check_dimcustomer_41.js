const db = require('../config/database');

async function checkCust41() {
    const cust41 = await db.get(`SELECT * FROM DimCustomer WHERE CustomerKey = 41`);
    console.log('DimCustomer Row 41:', cust41);

    const allCustCount = await db.get(`SELECT COUNT(*) as count FROM DimCustomer`);
    console.log('Total DimCustomer rows:', allCustCount.count);

    const maxCustKey = await db.get(`SELECT MAX(CustomerKey) as maxKey FROM DimCustomer`);
    console.log('Max CustomerKey in DimCustomer:', maxCustKey.maxKey);

    process.exit(0);
}

checkCust41().catch(err => {
    console.error(err);
    process.exit(1);
});
