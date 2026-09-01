const fs = require('fs');
const path = require('path');
const db = require('../config/database');

async function dumpAllProducts() {
    const products = await db.query(`SELECT ProductID, Category, Brand, ProductName, ImageURL FROM DimProduct ORDER BY ProductID`);
    console.log(`Total Products: ${products.length}`);
    const byCat = {};
    products.forEach(p => {
        if (!byCat[p.Category]) byCat[p.Category] = [];
        byCat[p.Category].push(p);
    });

    for (const [cat, prods] of Object.entries(byCat)) {
        console.log(`\n=== CATEGORY: ${cat} (${prods.length} items) ===`);
        prods.forEach(p => {
            console.log(`[${p.ProductID}] ${p.ProductName}`);
            console.log(`  IMG: ${p.ImageURL}`);
        });
    }
    process.exit(0);
}

dumpAllProducts().catch(err => {
    console.error(err);
    process.exit(1);
});
