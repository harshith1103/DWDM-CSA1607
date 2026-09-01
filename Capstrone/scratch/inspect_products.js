const db = require('../config/database');

async function inspectProducts() {
    const products = await db.query(`SELECT ProductID, ProductName, Category, ImageURL FROM DimProduct ORDER BY ProductID`);
    console.log(`Total Products in DB: ${products.length}`);
    products.forEach(p => {
        console.log(`${p.ProductID} | ${p.Category} | ${p.ProductName}`);
        console.log(`   Img: ${p.ImageURL}`);
    });
    process.exit(0);
}

inspectProducts().catch(err => {
    console.error(err);
    process.exit(1);
});
