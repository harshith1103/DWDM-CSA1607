const db = require('../config/database');

async function testProductKeyFK() {
    const prodByString = await db.get(`SELECT ProductKey, ProductID, ProductName FROM DimProduct WHERE ProductID = 'PROD-710'`);
    console.log('Product PROD-710 by ProductID:', prodByString);

    const prodByKey = await db.get(`SELECT ProductKey, ProductID, ProductName FROM DimProduct WHERE ProductKey = ?`, [prodByString.ProductKey]);
    console.log('Product by ProductKey:', prodByKey);

    process.exit(0);
}

testProductKeyFK().catch(err => {
    console.error(err);
    process.exit(1);
});
