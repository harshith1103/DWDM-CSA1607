const db = require('../config/database');

async function updateDbImages() {
    const updates = [
        { id: 'PROD-720', img: '/images/pelican-cooler.svg' },
        { id: 'PROD-708', img: '/images/yeti-cooler.svg' },
        { id: 'PROD-510', img: '/images/under-armour-tshirt.svg' },
        { id: 'PROD-112', img: '/images/smart-thermostat.svg' },
        { id: 'PROD-211', img: '/images/powerbank.svg' },
        { id: 'PROD-213', img: '/images/airtag.svg' }
    ];

    for (const item of updates) {
        await db.run(`UPDATE DimProduct SET ImageURL = ? WHERE ProductID = ?`, [item.img, item.id]);
        console.log(`Updated ${item.id} -> ${item.img}`);
    }

    console.log('Database image URLs updated successfully!');
    process.exit(0);
}

updateDbImages().catch(err => {
    console.error(err);
    process.exit(1);
});
