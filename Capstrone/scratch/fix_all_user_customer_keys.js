const db = require('../config/database');

async function fixUserCustomerKeys() {
    const users = await db.query(`SELECT UserID, Email, FullName, CustomerKey, Role FROM Users`);
    console.log(`Total Users in DB: ${users.length}`);

    for (const u of users) {
        let validKey = null;
        if (u.CustomerKey) {
            const checkKey = await db.get(`SELECT CustomerKey FROM DimCustomer WHERE CustomerKey = ?`, [u.CustomerKey]);
            if (checkKey) {
                validKey = checkKey.CustomerKey;
            }
        }

        if (!validKey && u.Email) {
            const checkEmail = await db.get(`SELECT CustomerKey FROM DimCustomer WHERE Email = ?`, [u.Email]);
            if (checkEmail) {
                validKey = checkEmail.CustomerKey;
            }
        }

        if (!validKey && u.Role === 'customer') {
            const custID = `CUST-${Date.now().toString().slice(-6)}-${u.UserID}`;
            const newCust = await db.run(
                `INSERT INTO DimCustomer (CustomerID, FullName, Email, SignupDate, CustomerSegment)
                 VALUES (?, ?, ?, ?, 'Standard')`,
                [custID, u.FullName || 'Customer', u.Email, new Date().toISOString().split('T')[0]]
            );
            validKey = newCust.lastID;
            console.log(`Created DimCustomer for UserID ${u.UserID} (${u.Email}) -> CustomerKey ${validKey}`);
        }

        if (validKey && validKey !== u.CustomerKey) {
            await db.run(`UPDATE Users SET CustomerKey = ? WHERE UserID = ?`, [validKey, u.UserID]);
            console.log(`Updated UserID ${u.UserID} CustomerKey -> ${validKey}`);
        }
    }

    console.log('All user CustomerKeys validated & fixed successfully!');
    process.exit(0);
}

fixUserCustomerKeys().catch(err => {
    console.error(err);
    process.exit(1);
});
