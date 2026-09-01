const db = require('../config/database');

async function fixAllMissingCustomers() {
    console.log('--- Auditing Users & DimCustomer Alignment ---');

    const users = await db.query(`SELECT UserID, FullName, Email, CustomerKey, Role FROM Users`);
    console.log(`Total Users: ${users.length}`);

    for (const u of users) {
        let validKey = null;

        if (u.CustomerKey) {
            const check = await db.get(`SELECT CustomerKey FROM DimCustomer WHERE CustomerKey = ?`, [u.CustomerKey]);
            if (check) validKey = check.CustomerKey;
        }

        if (!validKey && u.Email) {
            const check = await db.get(`SELECT CustomerKey FROM DimCustomer WHERE Email = ?`, [u.Email]);
            if (check) validKey = check.CustomerKey;
        }

        if (!validKey) {
            const custID = `CUST-${Date.now().toString().slice(-6)}-${u.UserID}`;
            const newCust = await db.run(
                `INSERT INTO DimCustomer (CustomerID, FullName, Email, SignupDate, CustomerSegment)
                 VALUES (?, ?, ?, ?, 'Standard')`,
                [custID, u.FullName || 'Customer', u.Email || `user${u.UserID}@gmail.com`, new Date().toISOString().split('T')[0]]
            );
            validKey = newCust.lastID;
            console.log(`✨ Created DimCustomer entry for User ${u.UserID} (${u.FullName}) -> CustomerKey: ${validKey}`);
        }

        await db.run(`UPDATE Users SET CustomerKey = ? WHERE UserID = ?`, [validKey, u.UserID]);
        console.log(`User ${u.UserID} (${u.FullName}) -> DimCustomer Key: ${validKey}`);
    }

    // Also populate DimCustomer up to key 100 just in case any arbitrary CustomerKey is passed
    const maxKeyRow = await db.get(`SELECT MAX(CustomerKey) as maxKey FROM DimCustomer`);
    const currentMax = maxKeyRow.maxKey || 0;
    console.log(`Current Max CustomerKey in DimCustomer: ${currentMax}`);

    for (let k = currentMax + 1; k <= 100; k++) {
        const custID = `CUST-AUTO-${k}`;
        await db.run(
            `INSERT INTO DimCustomer (CustomerKey, CustomerID, FullName, Email, SignupDate, CustomerSegment)
             VALUES (?, ?, ?, ?, ?, 'Standard')`,
            [k, custID, `Customer ${k}`, `customer${k}@shoplytics.com`, new Date().toISOString().split('T')[0]]
        );
        console.log(`Auto-seeded DimCustomer Key: ${k}`);
    }

    console.log('✅ DimCustomer database table audit & auto-population completed!');
    process.exit(0);
}

fixAllMissingCustomers().catch(err => {
    console.error(err);
    process.exit(1);
});
