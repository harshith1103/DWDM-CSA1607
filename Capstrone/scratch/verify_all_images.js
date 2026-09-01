const db = require('../config/database');

async function verifyAllImages() {
    const products = await db.query(`SELECT ProductKey, ProductID, Category, ProductName, ImageURL FROM DimProduct ORDER BY ProductKey`);
    console.log(`Total Products in DB: ${products.length}`);

    let invalidCount = 0;
    products.forEach(p => {
        if (!p.ImageURL || p.ImageURL.trim() === '') {
            console.log(`❌ Empty ImageURL: [${p.ProductID}] ${p.ProductName}`);
            invalidCount++;
        }
    });

    console.log(`Verification completed. Invalid/Empty Image Count: ${invalidCount}`);
    process.exit(0);
}

verifyAllImages().catch(err => {
    console.error(err);
    process.exit(1);
});
