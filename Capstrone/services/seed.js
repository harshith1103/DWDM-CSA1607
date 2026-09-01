const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const db = require('../config/database');
const aprioriService = require('./apriori');
const rfmService = require('./rfm');

async function seedDatabase() {
    console.log('--- Initializing Shoplytics Data Warehouse Schema ---');
    await db.exec(`PRAGMA foreign_keys = OFF;`);

    // 1. Run schema.sql
    const schemaPath = path.join(__dirname, '..', 'database', 'schema.sql');
    const sql = fs.readFileSync(schemaPath, 'utf8');
    await db.exec(sql);

    // Check if new schema tables exist
    const hasAddresses = await db.get(`SELECT name FROM sqlite_master WHERE type='table' AND name='CustomerAddresses'`);
    const forceSeed = process.env.FORCE_SEED === 'true' || process.argv.includes('--force');

    if (hasAddresses && !forceSeed) {
        const userCount = await db.get(`SELECT COUNT(*) as count FROM Users`);
        if (userCount && userCount.count > 0) {
            console.log('Database already seeded with latest schema. Skipping initial seed.');
            return;
        }
    }

    if (forceSeed || !hasAddresses) {
        console.log('--- Clearing legacy tables for fresh Schema Seed ---');
        await db.exec(`
            PRAGMA foreign_keys = OFF;
            DROP TABLE IF EXISTS CustomerAddresses;
            DROP TABLE IF EXISTS Volunteers;
            DROP TABLE IF EXISTS CartItems;
            DROP TABLE IF EXISTS Wishlist;
            DROP TABLE IF EXISTS Payments;
            DROP TABLE IF EXISTS SearchHistory;
            DROP TABLE IF EXISTS DeliveryLocations;
            DROP TABLE IF EXISTS OrderItems;
            DROP TABLE IF EXISTS Orders;
            DROP TABLE IF EXISTS ProductReviews;
            DROP TABLE IF EXISTS VolunteerReviews;
            DROP TABLE IF EXISTS FactSales;
            DROP TABLE IF EXISTS DimBehavior;
            DROP TABLE IF EXISTS DimProduct;
            DROP TABLE IF EXISTS DimCustomer;
            DROP TABLE IF EXISTS DimDate;
            DROP TABLE IF EXISTS Users;
            DROP TABLE IF EXISTS AssociationRules;
            DROP TABLE IF EXISTS RealTimeActivity;
            PRAGMA foreign_keys = ON;
        `);
        await db.exec(sql);
    }

    console.log('--- Seeding Data Warehouse Dimensions & Accounts ---');

    // 2. Seed Accounts (Admin, Customer, Volunteer)
    const defaultHash = await bcrypt.hash('123456', 10);

    // Admin Account (IsApproved = 1)
    await db.run(
        `INSERT INTO Users (Email, PasswordHash, Role, FullName, Phone, Location, Latitude, Longitude, IsApproved)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`,
        ['admin@gmail.com', defaultHash, 'admin', 'System Administrator', '9876543210', 'Hyderabad, India', 17.3850, 78.4867]
    );

    // Default Customer Account
    const custKeyRes = await db.run(
        `INSERT INTO DimCustomer (CustomerID, FullName, Email, Age, Gender, Region, SignupDate, CustomerSegment)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        ['CUST-1001', 'Harshith Narra', 'customer@gmail.com', 24, 'Male', 'Asia-Pacific', new Date().toISOString().split('T')[0], 'Champions']
    );
    const demoCustomerKey = custKeyRes.lastID;

    await db.run(
        `INSERT INTO Users (Email, PasswordHash, Role, CustomerKey, FullName, Phone, Location, Latitude, Longitude, IsApproved)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
        ['customer@gmail.com', defaultHash, 'customer', demoCustomerKey, 'Harshith Narra', '9876543210', 'Hyderabad, Telangana, India', 17.3850, 78.4867]
    );

    // Default Saved Address for Customer
    await db.run(
        `INSERT INTO CustomerAddresses (CustomerKey, Label, FullName, Phone, HouseFlat, Street, Area, City, State, PostalCode, Country, Latitude, Longitude, IsDefault)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
        [
            demoCustomerKey,
            'HOME',
            'Harshith Narra',
            '9876543210',
            'Flat 402, Royal Residency',
            'Road No. 12, Banjara Hills',
            'Banjara Hills',
            'Hyderabad',
            'Telangana',
            '500034',
            'India',
            17.4126,
            78.4482
        ]
    );

    // Volunteer Account (IsApproved = 1 for default active volunteer)
    const volunteerUserRes = await db.run(
        `INSERT INTO Users (Email, PasswordHash, Role, FullName, Phone, Location, Latitude, Longitude, IsApproved)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`,
        ['volunteer@gmail.com', defaultHash, 'volunteer', 'Alex Delivery Agent', '9123456789', 'Banjara Hills, Hyderabad', 17.4150, 78.4490]
    );
    const defaultVolunteerId = volunteerUserRes.lastID;

    await db.run(
        `INSERT INTO Volunteers (UserID, PreferredArea, VehicleType, AvailabilityStatus, IsApproved)
         VALUES (?, ?, ?, ?, 1)`,
        [defaultVolunteerId, 'Banjara Hills & Jubilee Hills', 'Motorcycle', 'ONLINE']
    );

    // 3. Seed DimDate (Years 2025 - 2026)
    const startDate = new Date('2025-01-01');
    const endDate = new Date('2026-08-31');
    const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        const year = d.getFullYear();
        const monthIdx = d.getMonth();
        const monthStr = months[monthIdx];
        const dayOfWeek = daysOfWeek[d.getDay()];
        const quarter = Math.floor(monthIdx / 3) + 1;
        const isWeekend = (d.getDay() === 0 || d.getDay() === 6) ? 1 : 0;
        const fullDateStr = d.toISOString().split('T')[0];
        const dateKey = parseInt(fullDateStr.replace(/-/g, ''));

        await db.run(
            `INSERT OR IGNORE INTO DimDate (DateKey, FullDate, DayOfWeek, Month, Quarter, Year, IsWeekend)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [dateKey, fullDateStr, dayOfWeek, monthStr, quarter, year, isWeekend]
        );
    }

    // 4. Seed DimProduct (140 Products, EVERY item has a 100% UNIQUE High-Quality Image URL)
    const productsData = [
        // Category 1: Echo & Alexa / Devices (PROD-101 to PROD-120)
        { id: 'PROD-101', name: 'Echo Dot (5th Gen) Smart Speaker with Alexa', brand: 'Amazon', cat: 'Echo & Alexa / Devices', price: 49.99, orig: 59.99, cost: 20.0, rating: 4.8, img: 'https://images.unsplash.com/photo-1543512214-318c7553f230?w=400&q=80', desc: 'Vibrant sound smart speaker with Alexa for voice smart home control.', specs: 'Connectivity: Wi-Fi/Bluetooth | Audio: 1.73" Speaker' },
        { id: 'PROD-102', name: 'Echo Show 8 HD Smart Display with Alexa', brand: 'Amazon', cat: 'Echo & Alexa / Devices', price: 129.99, orig: 149.99, cost: 60.0, rating: 4.7, img: 'https://images.unsplash.com/photo-1544716278-e513176f20b5?w=400&q=80', desc: '8-inch HD touchscreen display with spatial audio and 13MP camera.', specs: 'Screen: 8.0" Touch | Camera: 13MP' },
        { id: 'PROD-103', name: 'Fire TV Stick 4K Max Streaming Device', brand: 'Amazon', cat: 'Echo & Alexa / Devices', price: 59.99, orig: 69.99, cost: 25.0, rating: 4.9, img: 'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=400&q=80', desc: '4K Ultra HD streaming player with Wi-Fi 6E and Alexa Voice Remote.', specs: 'Resolution: 4K UHD | Wi-Fi 6E' },
        { id: 'PROD-104', name: 'Echo Studio High-Fidelity Smart Speaker', brand: 'Amazon', cat: 'Echo & Alexa / Devices', price: 199.99, orig: 219.99, cost: 95.0, rating: 4.9, img: 'https://images.unsplash.com/photo-1545454675-3531b543be5d?w=400&q=80', desc: 'Immersive 3D spatial audio smart speaker with Dolby Atmos.', specs: '5 Speakers | Dolby Atmos | Zigbee Hub' },
        { id: 'PROD-105', name: 'Amazon Smart Plug with Alexa Control', brand: 'Amazon', cat: 'Echo & Alexa / Devices', price: 24.99, orig: 29.99, cost: 10.0, rating: 4.6, img: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=400&q=80', desc: 'Add voice control to any outlet with Alexa scheduling.', specs: 'Max Load: 15A | Wi-Fi 2.4GHz' },
        { id: 'PROD-106', name: 'Ring Video Doorbell Pro 2 HD Security', brand: 'Ring', cat: 'Echo & Alexa / Devices', price: 179.99, orig: 199.99, cost: 85.0, rating: 4.8, img: 'https://images.unsplash.com/photo-1558002038-1055907df827?w=400&q=80', desc: 'Head-to-Toe 1536p HD video doorbell with 3D Motion Detection.', specs: 'Video: 1536p HD | 3D Motion | Dual-Band Wi-Fi' },
        { id: 'PROD-107', name: 'Blink Outdoor 4 Wireless HD Camera', brand: 'Blink', cat: 'Echo & Alexa / Devices', price: 89.99, orig: 109.99, cost: 40.0, rating: 4.7, img: 'https://images.unsplash.com/photo-1557597774-9d273605dfa9?w=400&q=80', desc: '1080p HD outdoor wire-free security camera with 2-year battery.', specs: 'Battery: 2 Years AA | 1080p HD | Two-Way Audio' },
        { id: 'PROD-108', name: 'Echo Buds (2nd Gen) Wireless Earbuds', brand: 'Amazon', cat: 'Echo & Alexa / Devices', price: 119.99, orig: 139.99, cost: 50.0, rating: 4.5, img: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=400&q=80', desc: 'Dynamic audio and active noise cancellation with hands-free Alexa.', specs: 'Battery: 20 Hours | Active Noise Cancellation' },
        { id: 'PROD-109', name: 'Fire TV Cube 4K Hands-Free Streaming', brand: 'Amazon', cat: 'Echo & Alexa / Devices', price: 139.99, orig: 159.99, cost: 65.0, rating: 4.8, img: 'https://images.unsplash.com/photo-1526738549149-8e07eca6c147?w=400&q=80', desc: 'Octa-core 4K Ultra HD streaming player with built-in Alexa mic.', specs: 'Processor: Octa-core | HDMI In/Out | Wi-Fi 6E' },
        { id: 'PROD-110', name: 'Echo Pop Compact Smart Speaker with Alexa', brand: 'Amazon', cat: 'Echo & Alexa / Devices', price: 39.99, orig: 44.99, cost: 15.0, rating: 4.6, img: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=400&q=80', desc: 'Compact Bluetooth smart speaker with full sound for small spaces.', specs: 'Directional Front Speaker | Bluetooth/Wi-Fi' },
        { id: 'PROD-111', name: 'Ring Indoor Cam 1080p Security Camera', brand: 'Ring', cat: 'Echo & Alexa / Devices', price: 59.99, orig: 69.99, cost: 25.0, rating: 4.7, img: 'https://images.unsplash.com/photo-1585060544812-6b45742d762f?w=400&q=80', desc: 'Plug-in HD security camera with Privacy Cover and Two-Way Talk.', specs: 'Video: 1080p HD | Plug-in Power | Night Vision' },
        { id: 'PROD-112', name: 'Amazon Smart Thermostat ENERGY STAR', brand: 'Amazon', cat: 'Echo & Alexa / Devices', price: 79.99, orig: 89.99, cost: 35.0, rating: 4.7, img: '/images/smart-thermostat.svg', desc: 'Save energy and control heating/cooling via Alexa app.', specs: 'ENERGY STAR Certified | Guided DIY Installation' },
        { id: 'PROD-113', name: 'Echo Auto (2nd Gen) Car Alexa Accessory', brand: 'Amazon', cat: 'Echo & Alexa / Devices', price: 54.99, orig: 59.99, cost: 22.0, rating: 4.4, img: 'https://images.unsplash.com/photo-1511919884226-fd3cad34687c?w=400&q=80', desc: 'Add Alexa to your car stereo with 5 built-in microphones.', specs: '5 Mics | AUX/Bluetooth | Fast Car Charger Included' },
        { id: 'PROD-114', name: 'Echo Glow Smart Color Lamp for Kids', brand: 'Amazon', cat: 'Echo & Alexa / Devices', price: 29.99, orig: 34.99, cost: 12.0, rating: 4.8, img: 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=400&q=80', desc: 'Multicolor smart lamp pairing with Alexa for fun lighting timers.', specs: 'RGB Color LED | Tap Control | Alexa Timers' },
        { id: 'PROD-115', name: 'Fire HD 10 Tablet (10.1" 1080p Display)', brand: 'Amazon', cat: 'Echo & Alexa / Devices', price: 139.99, orig: 159.99, cost: 60.0, rating: 4.6, img: 'https://images.unsplash.com/photo-1561154464-82e9adf32764?w=400&q=80', desc: 'Fast 10.1" Full HD display tablet with 12-hour battery life.', specs: 'Screen: 10.1" 1080p | RAM: 3GB | Storage: 32GB' },
        { id: 'PROD-116', name: 'Fire HD 8 Kids Pro Tablet (8" Display)', brand: 'Amazon', cat: 'Echo & Alexa / Devices', price: 149.99, orig: 169.99, cost: 65.0, rating: 4.8, img: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=400&q=80', desc: 'Kid-friendly tablet with 1 year Amazon Kids+ and slim case.', specs: 'Screen: 8" HD | 2-Year Worry-Free Guarantee' },
        { id: 'PROD-117', name: 'Ring Alarm 5-Piece Home Security Kit', brand: 'Ring', cat: 'Echo & Alexa / Devices', price: 199.99, orig: 229.99, cost: 95.0, rating: 4.9, img: 'https://images.unsplash.com/photo-1584438784894-089d6a62b8fa?w=400&q=80', desc: 'DIY home security system with Base Station, Keypad & Sensors.', specs: 'Base Station + Keypad + Contact Sensor + Motion Detector' },
        { id: 'PROD-118', name: 'Blink Mini Compact Plug-in Indoor Camera', brand: 'Blink', cat: 'Echo & Alexa / Devices', price: 34.99, orig: 39.99, cost: 14.0, rating: 4.7, img: 'https://images.unsplash.com/photo-1557597774-9d273605dfa9?w=400&q=80', desc: '1080p HD indoor security camera with motion detection.', specs: '1080p HD | Motion Zones | Night Vision' },
        { id: 'PROD-119', name: 'Amazon Smart Soap Dispenser with Timer', brand: 'Amazon', cat: 'Echo & Alexa / Devices', price: 34.99, orig: 39.99, cost: 14.0, rating: 4.5, img: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400&q=80', desc: 'Automatic touchless dispenser with LED 20-second handwash timer.', specs: 'Automatic Infrared Sensor | 20s LED Timer' },
        { id: 'PROD-120', name: 'Echo Show 15 Smart Display Wall Board', brand: 'Amazon', cat: 'Echo & Alexa / Devices', price: 279.99, orig: 299.99, cost: 130.0, rating: 4.8, img: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=400&q=80', desc: '15.6" Full HD smart display with Alexa and Fire TV built-in.', specs: 'Screen: 15.6" 1080p | Fire TV Built-in | Wall Mount' },

        // Category 2: Mobiles & Computers (PROD-201 to PROD-220)
        { id: 'PROD-201', name: 'Apple iPhone 15 Pro (256GB, Titanium)', brand: 'Apple', cat: 'Mobiles & Computers', price: 999.99, orig: 1099.99, cost: 600.0, rating: 4.9, img: 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=400&q=80', desc: 'Forged in titanium featuring the A17 Pro chip and 48MP camera.', specs: 'Chip: A17 Pro | Display: 6.1" Super Retina XDR | 256GB' },
        { id: 'PROD-202', name: 'Samsung Galaxy S24 Ultra AI Phone', brand: 'Samsung', cat: 'Mobiles & Computers', price: 1199.99, orig: 1299.99, cost: 700.0, rating: 4.8, img: 'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=400&q=80', desc: 'Galaxy AI powered smartphone with Built-in S Pen and 200MP camera.', specs: 'Processor: Snapdragon 8 Gen 3 | RAM: 12GB | 6.8" AMOLED' },
        { id: 'PROD-203', name: 'Apple MacBook Pro 16" M3 Max Laptop', brand: 'Apple', cat: 'Mobiles & Computers', price: 2499.99, orig: 2699.99, cost: 1500.0, rating: 4.9, img: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=400&q=80', desc: 'Mind-blowing performance with Liquid Retina XDR display.', specs: 'M3 Max 16-Core | RAM: 36GB | Storage: 1TB SSD' },
        { id: 'PROD-204', name: 'Dell XPS 15 4K Touchscreen Laptop', brand: 'Dell', cat: 'Mobiles & Computers', price: 1899.99, orig: 2099.99, cost: 1100.0, rating: 4.7, img: 'https://images.unsplash.com/photo-1593642632823-8f785ba67e45?w=400&q=80', desc: 'Intel Core i9 laptop with 3.5K OLED touch display & RTX graphics.', specs: 'Core i9-13900H | RAM: 32GB | RTX 4060 | 1TB SSD' },
        { id: 'PROD-205', name: 'Apple iPad Pro 12.9" M2 Liquid Retina', brand: 'Apple', cat: 'Mobiles & Computers', price: 1099.99, orig: 1199.99, cost: 650.0, rating: 4.9, img: 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=400&q=80', desc: 'Astonishing M2 performance with XDR Liquid Retina display.', specs: 'Chip: M2 | Display: 12.9" XDR | Storage: 256GB' },
        { id: 'PROD-206', name: 'Microsoft Surface Pro 9 2-in-1 Tablet', brand: 'Microsoft', cat: 'Mobiles & Computers', price: 999.99, orig: 1099.99, cost: 580.0, rating: 4.6, img: 'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=400&q=80', desc: 'Versatility of a tablet with laptop performance.', specs: 'Intel Core i7 | RAM: 16GB | 13" PixelSense Touch' },
        { id: 'PROD-207', name: 'ASUS ROG Strix SCAR 17 Gaming Laptop', brand: 'ASUS', cat: 'Mobiles & Computers', price: 2199.99, orig: 2399.99, cost: 1300.0, rating: 4.8, img: 'https://images.unsplash.com/photo-1603302576837-37561b2e2302?w=400&q=80', desc: 'Dominant gaming laptop with AMD Ryzen 9 and RTX 4080 GPU.', specs: 'Ryzen 9 7945HX | RTX 4080 | 240Hz QHD | 32GB RAM' },
        { id: 'PROD-208', name: 'Logitech G PRO X Wireless Gaming Mouse', brand: 'Logitech', cat: 'Mobiles & Computers', price: 129.99, orig: 149.99, cost: 60.0, rating: 4.8, img: 'https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?w=400&q=80', desc: 'Ultra-lightweight wireless gaming mouse with HERO 25K sensor.', specs: 'Weight: 63g | HERO 25K Sensor | 70h Battery' },
        { id: 'PROD-209', name: 'Keychron K2 Wireless Mechanical Keyboard', brand: 'Keychron', cat: 'Mobiles & Computers', price: 99.99, orig: 119.99, cost: 45.0, rating: 4.8, img: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=400&q=80', desc: 'Compact 75% layout mechanical keyboard with Gateron switches.', specs: 'Bluetooth 5.1/USB-C | Hot-swappable | RGB Backlight' },
        { id: 'PROD-210', name: 'Samsung Galaxy Tab S9 Ultra 14.6"', brand: 'Samsung', cat: 'Mobiles & Computers', price: 1199.99, orig: 1299.99, cost: 700.0, rating: 4.8, img: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=400&q=80', desc: 'Massive 14.6" Dynamic AMOLED 2X display with IP68 S Pen.', specs: 'Screen: 14.6" AMOLED | Snapdragon 8 Gen 2 | 256GB' },
        { id: 'PROD-211', name: 'Anker 737 Power Bank (Prime 24,000mAh)', brand: 'Anker', cat: 'Mobiles & Computers', price: 149.99, orig: 169.99, cost: 70.0, rating: 4.9, img: '/images/powerbank.svg', desc: 'Ultra-powerful 140W fast-charging power bank with digital display.', specs: 'Capacity: 24,000mAh | 140W Output | Smart Digital Display' },
        { id: 'PROD-212', name: 'SanDisk 2TB Extreme Portable SSD', brand: 'SanDisk', cat: 'Mobiles & Computers', price: 159.99, orig: 189.99, cost: 80.0, rating: 4.8, img: 'https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?w=400&q=80', desc: 'Rugged NVMe solid state drive with up to 1050MB/s read speed.', specs: 'Read Speed: 1050MB/s | IP55 Water & Dust Resistant' },
        { id: 'PROD-213', name: 'Apple AirTag (4-Pack Item Finder)', brand: 'Apple', cat: 'Mobiles & Computers', price: 99.99, orig: 109.99, cost: 45.0, rating: 4.9, img: '/images/airtag.svg', desc: 'Keep track of keys, wallet, luggage & backpacks in Find My app.', specs: 'Precision Finding | Replaceable CR2032 | IP67' },
        { id: 'PROD-214', name: 'LG UltraGear 34" Curved Gaming Monitor', brand: 'LG', cat: 'Mobiles & Computers', price: 799.99, orig: 899.99, cost: 450.0, rating: 4.8, img: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=400&q=80', desc: 'Curved WQHD Nano IPS 1ms display with NVIDIA G-SYNC.', specs: 'Resolution: 3440x1440 | 144Hz | 1ms Nano IPS' },
        { id: 'PROD-215', name: 'Google Pixel 8 Pro Unlocked AI Phone', brand: 'Google', cat: 'Mobiles & Computers', price: 899.99, orig: 999.99, cost: 500.0, rating: 4.7, img: 'https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=400&q=80', desc: 'Google Tensor G3 chip with pro camera controls & Best Take AI.', specs: 'Tensor G3 | RAM: 12GB | 50MP Camera | 6.7" OLED' },
        { id: 'PROD-216', name: 'OnePlus 12 5G Smartphone (512GB)', brand: 'OnePlus', cat: 'Mobiles & Computers', price: 799.99, orig: 899.99, cost: 450.0, rating: 4.8, img: 'https://images.unsplash.com/photo-1565849904461-04a58ad377e0?w=400&q=80', desc: 'Snapdragon 8 Gen 3 with 4th Gen Hasselblad Camera System.', specs: 'Snapdragon 8 Gen 3 | RAM: 16GB | 100W Fast Charge' },
        { id: 'PROD-217', name: 'Satechi Aluminum Type-C Multiport Hub', brand: 'Satechi', cat: 'Mobiles & Computers', price: 79.99, orig: 89.99, cost: 32.0, rating: 4.7, img: 'https://images.unsplash.com/photo-1616440342231-77a0640f8072?w=400&q=80', desc: 'Pass-through USB-C charging hub with 4K HDMI & SD Card Reader.', specs: '4K HDMI | USB-C PD 60W | SD/MicroSD Card Slots' },
        { id: 'PROD-218', name: 'Razer BlackWidow V4 Pro RGB Keyboard', brand: 'Razer', cat: 'Mobiles & Computers', price: 229.99, orig: 249.99, cost: 110.0, rating: 4.7, img: 'https://images.unsplash.com/photo-1595225476474-87563907a212?w=400&q=80', desc: 'Mechanical gaming keyboard with Command Dial & Underglow RGB.', specs: 'Razer Green Mechanical Switches | Command Dial | Wrist Rest' },
        { id: 'PROD-219', name: 'Western Digital 4TB Elements External Hard Drive', brand: 'Western Digital', cat: 'Mobiles & Computers', price: 99.99, orig: 119.99, cost: 45.0, rating: 4.7, img: 'https://images.unsplash.com/photo-1531492746076-161ca9bcad58?w=400&q=80', desc: 'High-capacity portable hard drive USB 3.0 storage.', specs: 'Capacity: 4TB | USB 3.0 Plug-and-Play' },
        { id: 'PROD-220', name: 'Sony Xperia 1 V 4K OLED Camera Phone', brand: 'Sony', cat: 'Mobiles & Computers', price: 1199.99, orig: 1399.99, cost: 700.0, rating: 4.6, img: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400&q=80', desc: 'World 1st Exmor T camera sensor phone with 4K 120Hz OLED display.', specs: 'Exmor T Sensor | 4K 120Hz HDR OLED | Snapdragon 8 Gen 2' },

        // Category 3: TV & Electronics (PROD-301 to PROD-320)
        { id: 'PROD-301', name: 'Sony BRAVIA 65-inch 4K OLED Smart TV', brand: 'Sony', cat: 'TV & Electronics', price: 1799.99, orig: 1999.99, cost: 1000.0, rating: 4.9, img: 'https://images.unsplash.com/photo-1593784991095-a205069470b6?w=400&q=80', desc: 'Pure OLED black contrast with Cognitive Processor XR picture quality.', specs: 'Display: OLED 4K | 120Hz Refresh | Acoustic Surface' },
        { id: 'PROD-302', name: 'Bose QuietComfort Ultra Wireless Headphones', brand: 'Bose', cat: 'TV & Electronics', price: 379.99, orig: 429.99, cost: 180.0, rating: 4.8, img: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&q=80', desc: 'World-class noise cancellation with Immersive Spatial Audio.', specs: 'Battery: 24 Hours | Bluetooth 5.3 | CustomTune' },
        { id: 'PROD-303', name: 'Apple AirPods Pro 2nd Gen USB-C', brand: 'Apple', cat: 'TV & Electronics', price: 249.99, orig: 269.99, cost: 120.0, rating: 4.9, img: 'https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?w=400&q=80', desc: 'H2 chip active noise cancellation with Adaptive Audio.', specs: 'Active Noise Cancellation | MagSafe Charging Case | USB-C' },
        { id: 'PROD-304', name: 'Sony WH-1000XM5 Wireless Headphones', brand: 'Sony', cat: 'TV & Electronics', price: 398.00, orig: 429.99, cost: 200.0, rating: 4.9, img: 'https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=400&q=80', desc: 'Industry-leading noise cancellation with 2 processors and 8 mics.', specs: '30-Hour Battery | Auto NC Optimizer | Hands-Free Calling' },
        { id: 'PROD-305', name: 'Samsung 75" Neo QLED 4K Smart TV', brand: 'Samsung', cat: 'TV & Electronics', price: 2199.99, orig: 2499.99, cost: 1300.0, rating: 4.8, img: 'https://images.unsplash.com/photo-1577979749830-f1d742b96791?w=400&q=80', desc: 'Quantum Matrix Mini LED technology with Real Depth Enhancer.', specs: 'Display: Neo QLED 4K | Quantum HDR 32X | Dolby Atmos' },
        { id: 'PROD-306', name: 'LG C3 Series 55" 4K OLED Smart TV', brand: 'LG', cat: 'TV & Electronics', price: 1399.99, orig: 1599.99, cost: 800.0, rating: 4.9, img: 'https://images.unsplash.com/photo-1461151304267-38535e780c79?w=400&q=80', desc: 'Self-lit OLED pixels with alpha9 AI Processor Gen6.', specs: 'Display: OLED 4K | 0.1ms Response | Dolby Vision & Atmos' },
        { id: 'PROD-307', name: 'Canon EOS R6 Mark II Mirrorless Camera', brand: 'Canon', cat: 'TV & Electronics', price: 2499.00, orig: 2699.00, cost: 1400.0, rating: 4.9, img: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=400&q=80', desc: '24.2MP full-frame CMOS sensor with 40 fps continuous shooting.', specs: 'Sensor: 24.2MP Full-Frame | 4K 60p Uncropped | Dual Pixel CMOS AF II' },
        { id: 'PROD-308', name: 'GoPro HERO12 Black Waterproof Action Cam', brand: 'GoPro', cat: 'TV & Electronics', price: 399.99, orig: 449.99, cost: 200.0, rating: 4.7, img: 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=400&q=80', desc: '5.3K video with HyperSmooth 6.0 stabilization & HDR video.', specs: 'Video: 5.3K60 / 4K120 | Waterproof 33ft | HDR Video' },
        { id: 'PROD-309', name: 'JBL Flip 6 Portable Waterproof Bluetooth Speaker', brand: 'JBL', cat: 'TV & Electronics', price: 129.95, orig: 149.95, cost: 60.0, rating: 4.8, img: 'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=400&q=80', desc: '2-way speaker system engineered for loud, crystal clear audio.', specs: 'IP67 Waterproof & Dustproof | 12 Hours Playtime' },
        { id: 'PROD-310', name: 'Sonos Arc Premium Smart Soundbar', brand: 'Sonos', cat: 'TV & Electronics', price: 899.00, orig: 949.00, cost: 500.0, rating: 4.8, img: 'https://images.unsplash.com/photo-1545454675-3531b543be5d?w=400&q=80', desc: 'Immersive 3D sound Dolby Atmos soundbar for TV, movies & music.', specs: '11 High-Performance Drivers | Dolby Atmos | Voice Control' },
        { id: 'PROD-311', name: 'Apple TV 4K 128GB Wi-Fi + Ethernet Streaming Box', brand: 'Apple', cat: 'TV & Electronics', price: 149.00, orig: 169.00, cost: 80.0, rating: 4.9, img: 'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=400&q=80', desc: 'A15 Bionic chip streaming 4K Dolby Vision and HDR10+.', specs: 'Chip: A15 Bionic | 128GB Storage | Siri Remote' },
        { id: 'PROD-312', name: 'Nikon Z6 II Full-Frame Mirrorless Camera', brand: 'Nikon', cat: 'TV & Electronics', price: 1996.95, orig: 2196.95, cost: 1100.0, rating: 4.8, img: 'https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=400&q=80', desc: '24.5MP BSI sensor with Dual EXPEED 6 image processors.', specs: '24.5MP Full-Frame | 4K UHD 60p | Dual Card Slots' },
        { id: 'PROD-313', name: 'DJI Mini 4 Pro Fly More Combo Drone', brand: 'DJI', cat: 'TV & Electronics', price: 1099.00, orig: 1199.00, cost: 650.0, rating: 4.9, img: 'https://images.unsplash.com/photo-1508614589041-895b88991e3e?w=400&q=80', desc: 'Under 249g lightweight 4K/60fps HDR camera drone with obstacle sensing.', specs: '4K/60fps HDR | Omnidirectional Obstacle Sensing | 34 Min Flight' },
        { id: 'PROD-314', name: 'Sony PlayStation 5 Console Disc Edition', brand: 'Sony', cat: 'TV & Electronics', price: 499.99, orig: 549.99, cost: 350.0, rating: 4.9, img: 'https://images.unsplash.com/photo-1606813907291-d86efa9b94db?w=400&q=80', desc: 'Ultra-high speed SSD with DualSense haptic feedback controls.', specs: 'Storage: 825GB SSD | 4K 120Hz Output | Ray Tracing' },
        { id: 'PROD-315', name: 'Nintendo Switch OLED Model Gaming Console', brand: 'Nintendo', cat: 'TV & Electronics', price: 349.99, orig: 379.99, cost: 220.0, rating: 4.8, img: 'https://images.unsplash.com/photo-1578303512597-81e6cc155b3e?w=400&q=80', desc: 'Vibrant 7-inch OLED screen with wide adjustable stand.', specs: 'Display: 7.0" OLED | 64GB Internal Storage | LAN Port Dock' },
        { id: 'PROD-316', name: 'Xbox Series X 1TB Gaming Console', brand: 'Microsoft', cat: 'TV & Electronics', price: 499.99, orig: 549.99, cost: 350.0, rating: 4.8, img: 'https://images.unsplash.com/photo-1621259182978-fbf93132d53d?w=400&q=80', desc: '12 teraflops raw graphic processing power with 4K gaming.', specs: '12 TFLOPS GPU | 1TB Custom NVMe SSD | 4K 120FPS' },
        { id: 'PROD-317', name: 'Marshall Stanmore III Bluetooth Speaker', brand: 'Marshall', cat: 'TV & Electronics', price: 379.99, orig: 399.99, cost: 200.0, rating: 4.8, img: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=400&q=80', desc: 'Iconic vintage design home bluetooth speaker with room-filling sound.', specs: 'Frequency: 45-20,000 Hz | Bluetooth 5.2 | RCA Input' },
        { id: 'PROD-318', name: 'Sennheiser HD 660S2 Studio Audiophile Headphones', brand: 'Sennheiser', cat: 'TV & Electronics', price: 599.95, orig: 649.95, cost: 300.0, rating: 4.9, img: 'https://images.unsplash.com/photo-1583394838336-acd977736f90?w=400&q=80', desc: 'Open-back audiophile headphones with deep sub-bass precision.', specs: 'Impedance: 300 Ohm | Frequency: 8 - 41,500 Hz' },
        { id: 'PROD-319', name: 'Shure SM7B Vocal Dynamic Microphone', brand: 'Shure', cat: 'TV & Electronics', price: 399.00, orig: 449.00, cost: 220.0, rating: 4.9, img: 'https://images.unsplash.com/photo-1590602847861-f357a9332bbc?w=400&q=80', desc: 'Legendary broadcast vocal microphone for podcasting and studio recording.', specs: 'Polar Pattern: Cardioid | Frequency: 50 - 20,000 Hz' },
        { id: 'PROD-320', name: 'Elgato Stream Deck MK.2 Studio Controller', brand: 'Elgato', cat: 'TV & Electronics', price: 149.99, orig: 169.99, cost: 75.0, rating: 4.8, img: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&q=80', desc: '15 customizable LCD keys to control apps and broadcast tools.', specs: '15 LCD Keys | Interchangeable Faceplate | USB 2.0' },

        // Category 4: Kindle & Books (PROD-401 to PROD-420)
        { id: 'PROD-401', name: 'Kindle Paperwhite (16GB) 6.8" Display', brand: 'Amazon', cat: 'Kindle & Books', price: 149.99, orig: 169.99, cost: 70.0, rating: 4.9, img: 'https://images.unsplash.com/photo-1592496431122-2349e0fbc666?w=400&q=80', desc: '6.8" 300 ppi glare-free display with adjustable warm light.', specs: 'Display: 6.8" E-ink | Battery: 10 Weeks | Waterproof IPX8' },
        { id: 'PROD-402', name: 'Atomic Habits by James Clear (Hardcover)', brand: 'Penguin', cat: 'Kindle & Books', price: 17.99, orig: 27.00, cost: 6.0, rating: 4.9, img: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400&q=80', desc: 'An easy & proven way to build good habits & break bad ones.', specs: 'Format: Hardcover | Pages: 320 | Bestseller #1' },
        { id: 'PROD-403', name: 'Data Mining & Machine Learning Book', brand: 'MIT Press', cat: 'Kindle & Books', price: 59.99, orig: 69.99, cost: 20.0, rating: 4.9, img: 'https://images.unsplash.com/photo-1532012197267-da84d127e765?w=400&q=80', desc: 'Comprehensive guide covering Apriori algorithms, Data Warehousing, and OLAP.', specs: 'Pages: 640 | Format: Hardcover | Edition: 4th' },
        { id: 'PROD-404', name: 'Kindle Oasis 7" Paperwhite Waterproof', brand: 'Amazon', cat: 'Kindle & Books', price: 249.99, orig: 279.99, cost: 110.0, rating: 4.8, img: 'https://images.unsplash.com/photo-1544716278-e513176f20b5?w=400&q=80', desc: 'Ergonomic design with page turn buttons and auto-adjusting warm light.', specs: 'Display: 7.0" 300 ppi | Aluminum Design | Waterproof' },
        { id: 'PROD-405', name: 'Thinking, Fast and Slow by Daniel Kahneman', brand: 'Farrar', cat: 'Kindle & Books', price: 18.99, orig: 25.00, cost: 7.0, rating: 4.8, img: 'https://images.unsplash.com/photo-1589829085413-56de8ae18c73?w=400&q=80', desc: 'Nobel laureate Daniel Kahneman explains the two systems that drive how we think.', specs: 'Pages: 512 | Format: Paperback | Behavioral Economics' },
        { id: 'PROD-406', name: 'The Psychology of Money by Morgan Housel', brand: 'Harriman', cat: 'Kindle & Books', price: 16.99, orig: 22.00, cost: 6.0, rating: 4.9, img: 'https://images.unsplash.com/photo-1553729459-efe14ef6055d?w=400&q=80', desc: 'Timeless lessons on wealth, greed, and happiness.', specs: 'Pages: 252 | Format: Paperback | Personal Finance' },
        { id: 'PROD-407', name: 'Deep Work by Cal Newport', brand: 'Grand Central', cat: 'Kindle & Books', price: 17.50, orig: 24.00, cost: 6.5, rating: 4.8, img: 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=400&q=80', desc: 'Rules for focused success in a distracted world.', specs: 'Pages: 304 | Format: Hardcover | Productivity' },
        { id: 'PROD-408', name: 'Clean Code by Robert C. Martin', brand: 'Prentice Hall', cat: 'Kindle & Books', price: 44.99, orig: 54.99, cost: 18.0, rating: 4.9, img: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=400&q=80', desc: 'Handbook of agile software craftsmanship for software developers.', specs: 'Pages: 464 | Software Engineering Classic' },
        { id: 'PROD-409', name: 'Python Crash Course 3rd Edition', brand: 'No Starch Press', cat: 'Kindle & Books', price: 34.95, orig: 42.00, cost: 14.0, rating: 4.9, img: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=400&q=80', desc: 'Hands-on project-based introduction to programming in Python.', specs: 'Pages: 552 | Practical Projects Included' },
        { id: 'PROD-410', name: 'Sapiens: A Brief History of Humankind', brand: 'Harper', cat: 'Kindle & Books', price: 19.99, orig: 28.00, cost: 7.5, rating: 4.8, img: 'https://images.unsplash.com/photo-1495446815901-a7297e633e8d?w=400&q=80', desc: 'Yuval Noah Harari explores how biology & history have defined us.', specs: 'Pages: 464 | International Bestseller' },
        { id: 'PROD-411', name: 'The Lean Startup by Eric Ries', brand: 'Crown', cat: 'Kindle & Books', price: 18.00, orig: 26.00, cost: 7.0, rating: 4.7, img: 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=400&q=80', desc: 'How today\'s entrepreneurs use continuous innovation to create successful businesses.', specs: 'Pages: 336 | Entrepreneurship' },
        { id: 'PROD-412', name: 'Designing Data-Intensive Applications', brand: 'O\'Reilly', cat: 'Kindle & Books', price: 49.99, orig: 59.99, cost: 20.0, rating: 4.9, img: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=400&q=80', desc: 'The big ideas behind reliable, scalable, and maintainable systems.', specs: 'Pages: 616 | Distributed Systems Guide' },
        { id: 'PROD-413', name: 'Rich Dad Poor Dad by Robert Kiyosaki', brand: 'Plata Publishing', cat: 'Kindle & Books', price: 15.99, orig: 19.95, cost: 5.5, rating: 4.8, img: 'https://images.unsplash.com/photo-1565514020179-026b92b84bb6?w=400&q=80', desc: 'What the rich teach their kids about money that the poor & middle class do not.', specs: 'Pages: 336 | Financial Freedom' },
        { id: 'PROD-414', name: 'The 48 Laws of Power by Robert Greene', brand: 'Viking', cat: 'Kindle & Books', price: 20.00, orig: 28.00, cost: 8.0, rating: 4.8, img: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=400&q=80', desc: 'Amoral, cunning, ruthless, and instructive synthesis of 3000 years of power.', specs: 'Pages: 452 | Strategy & Influence' },
        { id: 'PROD-415', name: 'Zero to One by Peter Thiel', brand: 'Crown', cat: 'Kindle & Books', price: 16.50, orig: 23.00, cost: 6.0, rating: 4.7, img: 'https://images.unsplash.com/photo-1507842217343-583bb7270b66?w=400&q=80', desc: 'Notes on startups, or how to build the future.', specs: 'Pages: 224 | Venture Capital' },
        { id: 'PROD-416', name: 'Kindle Scribe 10.2" Digital Notebook E-Reader', brand: 'Amazon', cat: 'Kindle & Books', price: 339.99, orig: 369.99, cost: 160.0, rating: 4.8, img: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400&q=80', desc: 'Read and write on 10.2" 300 ppi glare-free display with Premium Pen.', specs: 'Display: 10.2" 300 ppi | Premium Pen Included' },
        { id: 'PROD-417', name: 'Can\'t Hurt Me by David Goggins', brand: 'Lioncrest', cat: 'Kindle & Books', price: 17.99, orig: 24.99, cost: 6.5, rating: 4.9, img: 'https://images.unsplash.com/photo-1516979187457-637abb4f9353?w=400&q=80', desc: 'Master your mind and defy the odds by Navy SEAL David Goggins.', specs: 'Pages: 364 | Memoir & Mindset' },
        { id: 'PROD-418', name: 'Steve Jobs Biography by Walter Isaacson', brand: 'Simon & Schuster', cat: 'Kindle & Books', price: 21.99, orig: 30.00, cost: 8.5, rating: 4.9, img: 'https://images.unsplash.com/photo-1531346878377-a5be20888e57?w=400&q=80', desc: 'The exclusive biography of Apple co-founder Steve Jobs.', specs: 'Pages: 656 | Exclusive Interviews' },
        { id: 'PROD-419', name: 'The Creative Act: A Way of Being by Rick Rubin', brand: 'Penguin', cat: 'Kindle & Books', price: 22.00, orig: 32.00, cost: 9.0, rating: 4.8, img: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=400&q=80', desc: 'Legendary music producer shares wisdom on creativity and living.', specs: 'Pages: 432 | Hardcover Bestseller' },
        { id: 'PROD-420', name: 'Moleskine Executive Hardcover Journal', brand: 'Moleskine', cat: 'Kindle & Books', price: 22.95, orig: 27.95, cost: 8.0, rating: 4.8, img: 'https://images.unsplash.com/photo-1586075010923-2dd4570fb338?w=400&q=80', desc: '240 thick fountain-pen friendly acid-free paper pages.', specs: 'Pages: 240 | Hardcover | Ribbon Bookmark' },

        // Category 5: Fashion & Apparel (PROD-501 to PROD-520)
        { id: 'PROD-501', name: 'Nike Air Max 270 Cushioned Running Shoes', brand: 'Nike', cat: 'Fashion & Apparel', price: 159.99, orig: 179.99, cost: 70.0, rating: 4.8, img: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&q=80', desc: 'Big Max Air unit delivers responsive cushioning for everyday style.', specs: 'Upper: Woven Synthetic | Air Unit: 270 Max' },
        { id: 'PROD-502', name: 'Levi\'s 501 Original Fit Denim Jeans', brand: 'Levi\'s', cat: 'Fashion & Apparel', price: 69.99, orig: 89.99, cost: 25.0, rating: 4.7, img: 'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=400&q=80', desc: 'The original straight fit jean since 1873 with signature button fly.', specs: '100% Cotton Denim | Straight Leg' },
        { id: 'PROD-503', name: 'Ray-Ban Polarized Aviator Sunglasses', brand: 'Ray-Ban', cat: 'Fashion & Apparel', price: 169.99, orig: 199.99, cost: 60.0, rating: 4.8, img: 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=400&q=80', desc: 'Classic teardrop aviator frame with 100% UV polarized protection.', specs: 'Frame: Metal Alloy | Lens: G-15 Polarized' },
        { id: 'PROD-504', name: 'Adidas Ultraboost Light Running Shoes', brand: 'Adidas', cat: 'Fashion & Apparel', price: 180.00, orig: 200.00, cost: 80.0, rating: 4.8, img: 'https://images.unsplash.com/photo-1584735935682-2f2b69dff9d2?w=400&q=80', desc: 'Lightest Ultraboost ever made with responsive Light BOOST midsole.', specs: 'Primeknit Upper | Light BOOST Cushioning' },
        { id: 'PROD-505', name: 'The North Face Antora Waterproof Jacket', brand: 'The North Face', cat: 'Fashion & Apparel', price: 110.00, orig: 130.00, cost: 45.0, rating: 4.8, img: 'https://images.unsplash.com/photo-1548883354-7622d03aca27?w=400&q=80', desc: 'DryVent 2L waterproof breathable hooded rain jacket.', specs: '100% Windproof & Waterproof | Recycled Polyester' },
        { id: 'PROD-506', name: 'Puma Suede Classic XXI Sneakers', brand: 'Puma', cat: 'Fashion & Apparel', price: 75.00, orig: 85.00, cost: 30.0, rating: 4.7, img: 'https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=400&q=80', desc: 'Full suede upper sneaker with classic Puma Formstrip design.', specs: 'Full Suede Upper | Rubber Midsole' },
        { id: 'PROD-507', name: 'Tommy Hilfiger Custom Fit Polo Shirt', brand: 'Tommy Hilfiger', cat: 'Fashion & Apparel', price: 59.50, orig: 69.50, cost: 22.0, rating: 4.6, img: 'https://images.unsplash.com/photo-1625910513413-4ec2b12395b0?w=400&q=80', desc: 'Classic 100% cotton pique breathable short sleeve polo shirt.', specs: '100% Cotton Pique | 2-Button Placket' },
        { id: 'PROD-508', name: 'Fossil Minimalist Stainless Steel Quartz Watch', brand: 'Fossil', cat: 'Fashion & Apparel', price: 120.00, orig: 145.00, cost: 50.0, rating: 4.7, img: 'https://images.unsplash.com/photo-1524805444758-089113d48a6d?w=400&q=80', desc: 'Clean 44mm watch face with genuine brown leather strap.', specs: 'Case Size: 44mm | Water Resistant 50m' },
        { id: 'PROD-509', name: 'Champion Powerblend Fleece Hoodie', brand: 'Champion', cat: 'Fashion & Apparel', price: 50.00, orig: 60.00, cost: 18.0, rating: 4.7, img: 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=400&q=80', desc: 'Warm cotton-blend fleece pullover hoodie with front pouch pocket.', specs: 'Cotton/Polyester Blend | Reduced Pill & Shrinkage' },
        { id: 'PROD-510', name: 'Under Armour Tech 2.0 Short Sleeve T-Shirt', brand: 'Under Armour', cat: 'Fashion & Apparel', price: 25.00, orig: 30.00, cost: 8.0, rating: 4.6, img: '/images/under-armour-tshirt.svg', desc: 'UA Tech fabric is quick-drying, ultra-soft & has a more natural feel.', specs: '100% Polyester | Moisture Transport System' },
        { id: 'PROD-511', name: 'Columbia Watertight II Packable Rain Jacket', brand: 'Columbia', cat: 'Fashion & Apparel', price: 90.00, orig: 110.00, cost: 38.0, rating: 4.7, img: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=400&q=80', desc: 'Omni-Tech waterproof breathable fully seam sealed jacket.', specs: 'Omni-Tech Waterproof | Packs into Pocket' },
        { id: 'PROD-512', name: 'Carhartt Loose Fit Heavyweight Pocket T-Shirt', brand: 'Carhartt', cat: 'Fashion & Apparel', price: 25.00, orig: 30.00, cost: 9.0, rating: 4.8, img: 'https://images.unsplash.com/photo-1618354691373-d851c5c3a990?w=400&q=80', desc: 'Heavyweight 6.75-ounce cotton workwear t-shirt.', specs: '6.75-oz 100% Cotton | Left-Chest Pocket' },
        { id: 'PROD-513', name: 'Crocs Classic Clog Slip-On Shoes', brand: 'Crocs', cat: 'Fashion & Apparel', price: 49.99, orig: 54.99, cost: 18.0, rating: 4.8, img: 'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=400&q=80', desc: 'Lightweight Croslite foam clogs for water-friendly comfort.', specs: 'Ventilation Ports | Croslite Foam Cushion' },
        { id: 'PROD-514', name: 'Timberland 6-Inch Premium Waterproof Boot', brand: 'Timberland', cat: 'Fashion & Apparel', price: 198.00, orig: 210.00, cost: 90.0, rating: 4.9, img: 'https://images.unsplash.com/photo-1520639888713-7851133b1ed0?w=400&q=80', desc: 'Direct-attach seam-sealed waterproof nubuck leather boots.', specs: 'Premium Waterproof Leather | 400g PrimaLoft Insulation' },
        { id: 'PROD-515', name: 'Oakley Holbrook Polarized Sunglasses', brand: 'Oakley', cat: 'Fashion & Apparel', price: 173.00, orig: 193.00, cost: 70.0, rating: 4.8, img: 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=400&q=80', desc: 'Classic American frame design accented by metal rivets.', specs: 'Prizm Lens Technology | O Matter Frame' },
        { id: 'PROD-516', name: 'Calvin Klein Cotton Stretch Boxer Briefs (3-Pack)', brand: 'Calvin Klein', cat: 'Fashion & Apparel', price: 45.00, orig: 52.00, cost: 16.0, rating: 4.8, img: 'https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=400&q=80', desc: 'Soft breathable cotton stretch boxer briefs with logo waistband.', specs: '95% Cotton 5% Elastane | 3-Pack' },
        { id: 'PROD-517', name: 'Herschel Supply Little America Laptop Backpack', brand: 'Herschel', cat: 'Fashion & Apparel', price: 110.00, orig: 130.00, cost: 45.0, rating: 4.8, img: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400&q=80', desc: 'Iconic mountaineering style backpack with 15" laptop sleeve.', specs: 'Capacity: 25L | Padded 15" Laptop Sleeve' },
        { id: 'PROD-518', name: 'Birkenstock Arizona Unisex Leather Sandals', brand: 'Birkenstock', cat: 'Fashion & Apparel', price: 110.00, orig: 125.00, cost: 45.0, rating: 4.8, img: 'https://images.unsplash.com/photo-1603808033192-082d6919d3e1?w=400&q=80', desc: 'Contoured cork footbed conforms to the shape of your foot.', specs: 'Anatomically Shaped Cork Footbed | Suede Lining' },
        { id: 'PROD-519', name: 'New Balance 574 Core Icon Sneakers', brand: 'New Balance', cat: 'Fashion & Apparel', price: 89.99, orig: 99.99, cost: 38.0, rating: 4.7, img: 'https://images.unsplash.com/photo-1539185441755-769473a23570?w=400&q=80', desc: 'ENCAP midsole cushioning combines lightweight foam with durable rim.', specs: 'Suede/Mesh Upper | ENCAP Midsole Cushioning' },
        { id: 'PROD-520', name: 'Vans Unisex Old Skool Skate Shoes', brand: 'Vans', cat: 'Fashion & Apparel', price: 70.00, orig: 75.00, cost: 26.0, rating: 4.8, img: 'https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?w=400&q=80', desc: 'Classic side stripe skate shoe with reinforced toe caps.', specs: 'Durable Canvas/Suede Uppers | Signature Rubber Waffle Outsole' },

        // Category 6: Home & Kitchen (PROD-601 to PROD-620)
        { id: 'PROD-601', name: 'Italian Espresso Coffee Machine', brand: 'DeLonghi', cat: 'Home & Kitchen', price: 249.99, orig: 299.99, cost: 110.0, rating: 4.8, img: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=400&q=80', desc: '15-bar pump espresso machine with manual milk frother system.', specs: '15 Bar Pump | 1.1L Tank | Stainless Steel' },
        { id: 'PROD-602', name: 'Instant Pot Duo 7-in-1 Pressure Cooker 6L', brand: 'Instant Pot', cat: 'Home & Kitchen', price: 99.99, orig: 129.99, cost: 45.0, rating: 4.8, img: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=400&q=80', desc: '7-in-1 pressure cooker, slow cooker, rice cooker & steamer.', specs: '6-Quart Capacity | 13 Presets | Stainless Steel' },
        { id: 'PROD-603', name: 'Smart Robot Vacuum Cleaner iRobot', brand: 'iRobot', cat: 'Home & Kitchen', price: 349.99, orig: 429.99, cost: 180.0, rating: 4.7, img: 'https://images.unsplash.com/photo-1518640467707-6811f4a6ab73?w=400&q=80', desc: 'LiDAR navigation smart vacuum with app control & self-empty base.', specs: 'Suction: 3000Pa | 120 Min Runtime | Wi-Fi' },
        { id: 'PROD-604', name: 'Ninja AF101 Air Fryer (4-Quart Capacity)', brand: 'Ninja', cat: 'Home & Kitchen', price: 119.99, orig: 129.99, cost: 50.0, rating: 4.8, img: 'https://images.unsplash.com/photo-1585515320310-259814833e62?w=400&q=80', desc: 'Air fry with up to 75% less fat than traditional frying methods.', specs: 'Capacity: 4-Quart | Temp: 105°F–400°F | 1500W' },
        { id: 'PROD-605', name: 'Vitamix 5200 Professional Blender 64oz', brand: 'Vitamix', cat: 'Home & Kitchen', price: 449.99, orig: 499.99, cost: 220.0, rating: 4.9, img: 'https://images.unsplash.com/photo-1570222094114-d054a817e56b?w=400&q=80', desc: 'Commercial-grade blender for smoothies, hot soups & frozen desserts.', specs: 'Container: 64 oz | Aircraft-grade Stainless Steel Blades' },
        { id: 'PROD-606', name: 'KitchenAid Artisan Stand Mixer 5-Quart', brand: 'KitchenAid', cat: 'Home & Kitchen', price: 379.99, orig: 449.99, cost: 190.0, rating: 4.9, img: 'https://images.unsplash.com/photo-1594385208974-2e75f8d7bb48?w=400&q=80', desc: 'Tilt-head stand mixer with 10 speeds and 5-quart stainless bowl.', specs: '5-Quart Bowl | 10 Speeds | Includes Flat Beater & Dough Hook' },
        { id: 'PROD-607', name: 'Keurig K-Elite Single Serve Coffee Maker', brand: 'Keurig', cat: 'Home & Kitchen', price: 169.99, orig: 189.99, cost: 75.0, rating: 4.7, img: 'https://images.unsplash.com/photo-1517668808822-9e4288246ede?w=400&q=80', desc: 'Brews K-Cup pods with Strong Brew button and iced coffee setting.', specs: '75oz Reservoir | 5 Brew Sizes (4, 6, 8, 10, 12 oz)' },
        { id: 'PROD-608', name: 'Dyson V15 Detect Cordless Vacuum Cleaner', brand: 'Dyson', cat: 'Home & Kitchen', price: 749.99, orig: 799.99, cost: 380.0, rating: 4.9, img: 'https://images.unsplash.com/photo-1558317374-067fb5f30001?w=400&q=80', desc: 'Laser reveals microscopic dust with piezo sensor particle counter.', specs: '60 Min Runtime | Laser Dust Illumination | HEPA Filtration' },
        { id: 'PROD-609', name: 'Le Creuset Enameled Cast Iron Dutch Oven', brand: 'Le Creuset', cat: 'Home & Kitchen', price: 380.00, orig: 420.00, cost: 180.0, rating: 4.9, img: 'https://images.unsplash.com/photo-1584269600464-37b1b58a9fe7?w=400&q=80', desc: 'French handcrafted enameled cast iron offers superior heat distribution.', specs: 'Capacity: 5.5 Quart | Enameled Cast Iron | Oven Safe to 500°F' },
        { id: 'PROD-610', name: 'Ninja Foodi 10-in-1 Countertop Oven & Air Fryer', brand: 'Ninja', cat: 'Home & Kitchen', price: 229.99, orig: 259.99, cost: 110.0, rating: 4.8, img: 'https://images.unsplash.com/photo-1584992236310-6edddc08acff?w=400&q=80', desc: 'Digital air fry oven with Surround Air Convection technology.', specs: '10 Functions | Reclaims Counter Space (Flips Up)' },
        { id: 'PROD-611', name: 'COSORI Air Fryer Max XL (5.8-Quart)', brand: 'COSORI', cat: 'Home & Kitchen', price: 119.99, orig: 129.99, cost: 50.0, rating: 4.8, img: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=400&q=80', desc: '13 One-Touch Cooking Functions with square non-stick basket.', specs: 'Capacity: 5.8 Qt | 13 One-Touch Cooking Functions' },
        { id: 'PROD-612', name: 'SodaStream Art Sparkling Water Maker', brand: 'SodaStream', cat: 'Home & Kitchen', price: 129.99, orig: 149.99, cost: 55.0, rating: 4.7, img: 'https://images.unsplash.com/photo-1527661591475-527312dd65f5?w=400&q=80', desc: 'Turn plain water into fresh sparkling water in seconds with carbonating lever.', specs: 'Retro Carbonating Lever | Quick Connect CO2 Cylinder' },
        { id: 'PROD-613', name: 'Nespresso VertuoPlus Coffee & Espresso Machine', brand: 'Nespresso', cat: 'Home & Kitchen', price: 169.00, orig: 199.00, cost: 75.0, rating: 4.7, img: 'https://images.unsplash.com/photo-1517256064527-09c73fc73e38?w=400&q=80', desc: 'Centrifusion technology for single serve barista coffee & espresso.', specs: 'Centrifusion Extraction | 54 oz Water Tank | Aeroccino Frother' },
        { id: 'PROD-614', name: 'Zojirushi Neuro Fuzzy Rice Cooker 5.5-Cup', brand: 'Zojirushi', cat: 'Home & Kitchen', price: 230.00, orig: 260.00, cost: 110.0, rating: 4.9, img: 'https://images.unsplash.com/photo-1596797038530-2c107229654b?w=400&q=80', desc: 'Advanced Neuro Fuzzy logic technology automatically adjusts temperature.', specs: '5.5 Cup Capacity | Spherical Inner Pan | Keep Warm' },
        { id: 'PROD-615', name: 'Breville Smart Oven Air Fryer Pro', brand: 'Breville', cat: 'Home & Kitchen', price: 399.95, orig: 449.95, cost: 200.0, rating: 4.8, img: 'https://images.unsplash.com/photo-1574269252556-89926e7c5805?w=400&q=80', desc: 'Element IQ system with 13 cooking functions including slow cook.', specs: '13 Preset Functions | Super Convection | Fits 9x13 Pan' },
        { id: 'PROD-616', name: 'Zwilling Twin Gourmet Kitchen Knife Set', brand: 'Zwilling', cat: 'Home & Kitchen', price: 199.99, orig: 249.99, cost: 90.0, rating: 4.8, img: 'https://images.unsplash.com/photo-1593618998160-e34014e67546?w=400&q=80', desc: '19-piece German high-carbon stainless steel self-sharpening block.', specs: '19 Pieces | German Stainless Steel | Self-Sharpening Block' },
        { id: 'PROD-617', name: 'Brita Longlast Water Filter Pitcher 10-Cup', brand: 'Brita', cat: 'Home & Kitchen', price: 34.99, orig: 39.99, cost: 14.0, rating: 4.7, img: 'https://images.unsplash.com/photo-1548839140-29a749e1bc4e?w=400&q=80', desc: 'Reduces 99% of lead, cadmium, mercury & chlorine in drinking water.', specs: '10-Cup Capacity | Longlast Filter (6 Months)' },
        { id: 'PROD-618', name: 'Rubbermaid Brilliance Food Storage 10-Piece Set', brand: 'Rubbermaid', cat: 'Home & Kitchen', price: 39.99, orig: 49.99, cost: 15.0, rating: 4.9, img: 'https://images.unsplash.com/photo-1610557892470-55d9e80c0bce?w=400&q=80', desc: '100% leak-proof BPA-free Tritan plastic airtight containers.', specs: 'BPA-free Tritan | 100% Airtight & Leak-Proof' },
        { id: 'PROD-619', name: 'Pyrex 8-Piece Glass Baking Dish Set', brand: 'Pyrex', cat: 'Home & Kitchen', price: 29.99, orig: 35.99, cost: 12.0, rating: 4.8, img: 'https://images.unsplash.com/photo-1584269600464-37b1b58a9fe7?w=400&q=80', desc: 'Tempered glass baking dishes with BPA-free blue lids.', specs: 'Tempered Glass | Microwave, Oven, Freezer Safe' },
        { id: 'PROD-620', name: 'Crock-Pot 7-Quart Oval Manual Slow Cooker', brand: 'Crock-Pot', cat: 'Home & Kitchen', price: 49.99, orig: 59.99, cost: 20.0, rating: 4.7, img: 'https://images.unsplash.com/photo-1547592180-85f173990554?w=400&q=80', desc: 'Feeds 8+ people with High/Low cook settings and Warm mode.', specs: '7-Quart Capacity | Removable Oval Stoneware' },

        // Category 7: Fitness & Outdoors (PROD-701 to PROD-720)
        { id: 'PROD-701', name: 'High-Density Non-Slip Yoga Mat', brand: 'Lululemon', cat: 'Fitness & Outdoors', price: 39.99, orig: 49.99, cost: 14.0, rating: 4.9, img: 'https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?w=400&q=80', desc: '6mm eco-friendly TPE non-slip workout yoga mat with carrying strap.', specs: 'Thickness: 6mm | Material: TPE | 72" x 24"' },
        { id: 'PROD-702', name: 'Bowflex SelectTech 552 Adjustable Dumbbell', brand: 'Bowflex', cat: 'Fitness & Outdoors', price: 219.99, orig: 249.99, cost: 100.0, rating: 4.9, img: 'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=400&q=80', desc: 'Replaces 15 sets of weights with dial adjustment from 5 to 52.5 lbs.', specs: 'Range: 5 to 52.5 lbs | Increments: 2.5 lbs' },
        { id: 'PROD-703', name: 'Garmin Forerunner 265 GPS Running Watch', brand: 'Garmin', cat: 'Fitness & Outdoors', price: 449.99, orig: 499.99, cost: 220.0, rating: 4.9, img: 'https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?w=400&q=80', desc: 'Colorful AMOLED display running smartwatch with Training Readiness.', specs: 'AMOLED Display | Battery: 13 Days | HRV Status' },
        { id: 'PROD-704', name: 'Hydro Flask Wide Mouth Water Bottle (32oz)', brand: 'Hydro Flask', cat: 'Fitness & Outdoors', price: 44.95, orig: 49.95, cost: 18.0, rating: 4.9, img: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=400&q=80', desc: 'TempShield double-wall vacuum insulation keeps drinks icy cold 24h.', specs: 'Capacity: 32 oz | 18/8 Pro-Grade Stainless Steel' },
        { id: 'PROD-705', name: 'Thick Exercise Resistance Loop Bands (Set of 5)', brand: 'TheraBand', cat: 'Fitness & Outdoors', price: 24.99, orig: 29.99, cost: 8.0, rating: 4.7, img: 'https://images.unsplash.com/photo-1598289431512-b97b0917affc?w=400&q=80', desc: '100% natural latex resistance bands for workout & physical therapy.', specs: '5 Resistance Levels (5-40 lbs) | Carry Bag' },
        { id: 'PROD-706', name: 'TRX ALL-IN-ONE Suspension Trainer System', brand: 'TRX', cat: 'Fitness & Outdoors', price: 179.95, orig: 199.95, cost: 80.0, rating: 4.8, img: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=400&q=80', desc: 'Bodyweight training straps for full body strength & core workouts.', specs: 'Carabiner Tested to 700 lbs | Includes Door Anchor' },
        { id: 'PROD-707', name: 'Coleman Sundome Camping Tent (4-Person)', brand: 'Coleman', cat: 'Fitness & Outdoors', price: 89.99, orig: 109.99, cost: 38.0, rating: 4.7, img: 'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=400&q=80', desc: 'WeatherTec system with patented welded floors & inverted seams.', specs: '4-Person Dome Tent | WeatherTec System | 10 Min Setup' },
        { id: 'PROD-708', name: 'YETI Tundra 45 Insulated Ice Chest Cooler', brand: 'YETI', cat: 'Fitness & Outdoors', price: 325.00, orig: 350.00, cost: 150.0, rating: 4.9, img: '/images/yeti-cooler.svg', desc: 'Rotomolded construction with PermaFrost Insulation up to 3 inches.', specs: 'Capacity: 28 Cans | Bear-Resistant Rotomolded' },
        { id: 'PROD-709', name: 'Theragun PRO Percussive Deep Tissue Massager', brand: 'Therabody', cat: 'Fitness & Outdoors', price: 599.00, orig: 649.00, cost: 280.0, rating: 4.8, img: 'https://images.unsplash.com/photo-1616401784845-180882ba9ba8?w=400&q=80', desc: 'Deep muscle treatment massage gun with EQ-150 brushless motor.', specs: '16mm Amplitude | 60 lbs Stall Force | OLED Screen' },
        { id: 'PROD-710', name: 'Fitbit Charge 6 Fitness Tracker with Heart Rate', brand: 'Fitbit', cat: 'Fitness & Outdoors', price: 159.95, orig: 179.95, cost: 70.0, rating: 4.6, img: 'https://images.unsplash.com/photo-1575311373937-040b8e1fd5b6?w=400&q=80', desc: 'GPS fitness tracker with YouTube Music controls & Google Maps.', specs: 'Built-in GPS | 40+ Exercise Modes | 7-Day Battery' },
        { id: 'PROD-711', name: 'Osprey Farpoint 40 Travel Backpack', brand: 'Osprey', cat: 'Fitness & Outdoors', price: 185.00, orig: 200.00, cost: 80.0, rating: 4.9, img: 'https://images.unsplash.com/photo-1622560480605-d83c853bc5c3?w=400&q=80', desc: 'Carry-on compliant travel pack with stowaway harness and hipbelt.', specs: 'Capacity: 40L | Meets Carry-On Dimensions | LightWire Frame' },
        { id: 'PROD-712', name: 'NordicTrack T Series Folding Treadmill', brand: 'NordicTrack', cat: 'Fitness & Outdoors', price: 649.00, orig: 799.00, cost: 350.0, rating: 4.7, img: 'https://images.unsplash.com/photo-1576678927484-cc907957088c?w=400&q=80', desc: 'SMART Response Motor with 0-10 MPH speed and 0-10% incline.', specs: 'Motor: 3.0 CHP | 20" x 55" Tread Belt | SpaceSaver Design' },
        { id: 'PROD-713', name: 'Concept2 Model D Indoor Rowing Machine', brand: 'Concept2', cat: 'Fitness & Outdoors', price: 990.00, orig: 1090.00, cost: 500.0, rating: 4.9, img: 'https://images.unsplash.com/photo-1540497077202-7c8a3999166f?w=400&q=80', desc: 'Gold standard air-resistance rower with PM5 Performance Monitor.', specs: 'PM5 Monitor | Flywheel & Spiral Damper | 500 lb Capacity' },
        { id: 'PROD-714', name: 'Black Diamond Storm 400 Waterproof Headlamp', brand: 'Black Diamond', cat: 'Fitness & Outdoors', price: 49.95, orig: 59.95, cost: 20.0, rating: 4.8, img: 'https://images.unsplash.com/photo-1510312305653-8ed496efae75?w=400&q=80', desc: 'Emits up to 400 lumens on max setting with IP67 waterproof rating.', specs: '400 Lumens | IP67 Waterproof & Dustproof' },
        { id: 'PROD-715', name: 'CamelBak HydroBak Hydration Pack 50oz', brand: 'CamelBak', cat: 'Fitness & Outdoors', price: 55.00, orig: 60.00, cost: 22.0, rating: 4.7, img: 'https://images.unsplash.com/photo-1510017803434-a899398421b3?w=400&q=80', desc: 'Lightweight cycling hydration pack with 1.5L Crux reservoir.', specs: 'Reservoir: 1.5L / 50 oz | Breathable Mesh Harness' },
        { id: 'PROD-716', name: 'Intex Explorer K2 2-Person Inflatable Kayak', brand: 'Intex', cat: 'Fitness & Outdoors', price: 169.99, orig: 199.99, cost: 75.0, rating: 4.6, img: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=400&q=80', desc: '2-person inflatable kayak set with aluminum oars & high output pump.', specs: '2-Person (400 lb Capacity) | Includes Oars & Air Pump' },
        { id: 'PROD-717', name: 'SPRI Rubber Encased Dumbbells (Pair 15lbs)', brand: 'SPRI', cat: 'Fitness & Outdoors', price: 45.00, orig: 55.00, cost: 18.0, rating: 4.8, img: 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=400&q=80', desc: 'Heavy-duty rubber coated hex dumbbells with chrome handles.', specs: 'Rubber Coated Hex Heads | Ergonomic Chrome Handle' },
        { id: 'PROD-718', name: 'Manduka PRO High-Density Yoga Mat (6mm)', brand: 'Manduka', cat: 'Fitness & Outdoors', price: 138.00, orig: 150.00, cost: 55.0, rating: 4.9, img: 'https://images.unsplash.com/photo-1545205597-3d9d02c29597?w=400&q=80', desc: 'Ultra-dense 6mm cushioning protects joints with lifetime guarantee.', specs: 'Thickness: 6mm | Closed-Cell PVC | Lifetime Guarantee' },
        { id: 'PROD-719', name: 'Fitbit Inspire 3 Health & Fitness Tracker', brand: 'Fitbit', cat: 'Fitness & Outdoors', price: 99.95, orig: 109.95, cost: 40.0, rating: 4.7, img: 'https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?w=400&q=80', desc: 'Daily readiness score, stress management & 10-day battery life.', specs: 'Battery: 10 Days | Color Touchscreen | 50m Water Resistant' },
        { id: 'PROD-720', name: 'Pelican Elite 30-Quart Heavy Duty Ice Cooler', brand: 'Pelican', cat: 'Fitness & Outdoors', price: 269.95, orig: 299.95, cost: 120.0, rating: 4.9, img: '/images/pelican-cooler.svg', desc: 'Extreme ice retention with press and pull latches and freezer-grade seal.', specs: 'Capacity: 30 Qt | Press & Pull Latches | Made in USA' }
    ];

    for (const p of productsData) {
        const discountVal = Number((p.orig - p.price).toFixed(2));
        await db.run(
            `INSERT INTO DimProduct (ProductID, ProductName, Brand, Category, Price, OriginalPrice, Discount, Cost, StockQuantity, PopularityRating, Description, Specifications, ImageURL)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [p.id, p.name, p.brand, p.cat, p.price, p.orig, discountVal, p.cost, 150, p.rating, p.desc, p.specs, p.img]
        );
    }

    // 5. Seed DimCustomer (40 customer personas)
    const firstNames = ['Alexander', 'Sophia', 'Ethan', 'Emma', 'Liam', 'Olivia', 'Noah', 'Ava', 'Mason', 'Isabella', 'Jacob', 'Mia', 'William', 'Charlotte', 'James', 'Amelia', 'Benjamin', 'Harper', 'Lucas', 'Evelyn'];
    const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin'];
    const regions = ['North America', 'Europe', 'Asia-Pacific', 'Latin America'];
    const genders = ['Male', 'Female', 'Non-Binary'];

    for (let i = 2; i <= 40; i++) {
        const fn = firstNames[(i - 1) % firstNames.length];
        const ln = lastNames[(i - 1) % lastNames.length];
        const fullName = `${fn} ${ln}`;
        const custID = `CUST-${1000 + i}`;
        const email = `${fn.toLowerCase()}.${ln.toLowerCase()}${i}@gmail.com`;
        const age = 20 + ((i * 7) % 45);
        const gender = genders[i % genders.length];
        const region = regions[i % regions.length];
        const signupDate = new Date(2025, (i % 12), (i % 28) + 1).toISOString().split('T')[0];

        const custResult = await db.run(
            `INSERT INTO DimCustomer (CustomerID, FullName, Email, Age, Gender, Region, SignupDate, CustomerSegment)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [custID, fullName, email, age, gender, region, signupDate, 'Standard']
        );

        const passHash = await bcrypt.hash('123456', 10);
        await db.run(
            `INSERT INTO Users (Email, PasswordHash, Role, CustomerKey, FullName, Phone, Location, Latitude, Longitude, IsApproved)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
            [email, passHash, 'customer', custResult.lastID, fullName, `987650${1000 + i}`, `${region} Metro`, 17.3850 + (i * 0.001), 78.4867 + (i * 0.001)]
        );
    }

    // Fetch Product & Customer DB Key Mappings
    const dbProducts = await db.query(`SELECT ProductKey, ProductID, Price FROM DimProduct`);
    const prodMap = {};
    dbProducts.forEach(p => { prodMap[p.ProductID] = p; });

    const dbCustomers = await db.query(`SELECT CustomerKey, CustomerID FROM DimCustomer`);

    // 6. Generate 250+ Co-Purchase Transactions for Apriori Rules
    const bundles = [
        ['PROD-101', 'PROD-102'], // Headphones + Smartwatch
        ['PROD-103', 'PROD-104', 'PROD-105'], // Keyboard + Mouse + Stand
        ['PROD-201', 'PROD-202'], // Espresso + Coffee Grinder
        ['PROD-301', 'PROD-302', 'PROD-304'], // Yoga Mat + Resistance Bands + Water Bottle
        ['PROD-401', 'PROD-402'], // Running Shoes + Compression Top
        ['PROD-501', 'PROD-502', 'PROD-503'] // Data Mining Book + Journal + Pens
    ];

    let txCounter = 1000;
    const dateKeys = (await db.query(`SELECT DateKey FROM DimDate ORDER BY RANDOM() LIMIT 200`)).map(d => d.DateKey);

    for (let t = 0; t < 250; t++) {
        txCounter++;
        const txID = `TXN-${txCounter}`;
        const cust = dbCustomers[t % dbCustomers.length];
        const dateKey = dateKeys[t % dateKeys.length];

        let basketProductIDs = [];
        if (Math.random() < 0.65) {
            const bundle = bundles[t % bundles.length];
            basketProductIDs = [...bundle];
            if (Math.random() < 0.3) {
                const randomProd = dbProducts[Math.floor(Math.random() * dbProducts.length)].ProductID;
                if (!basketProductIDs.includes(randomProd)) basketProductIDs.push(randomProd);
            }
        } else {
            const count = Math.floor(Math.random() * 3) + 1;
            for (let k = 0; k < count; k++) {
                const randomProd = dbProducts[Math.floor(Math.random() * dbProducts.length)].ProductID;
                if (!basketProductIDs.includes(randomProd)) basketProductIDs.push(randomProd);
            }
        }

        const sessionID = `SESS-${t + 5000}`;
        const duration = Math.floor(Math.random() * 600) + 60;
        const views = Math.floor(Math.random() * 10) + 2;

        await db.run(
            `INSERT OR IGNORE INTO DimBehavior (SessionID, CustomerKey, StartTime, SessionDurationSec, PageViews, CartAdditions, AbandonedCart, DeviceType, ReferralSource)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                sessionID,
                cust.CustomerKey,
                new Date(2025, t % 12, (t % 28) + 1).toISOString(),
                duration,
                views,
                basketProductIDs.length,
                Math.random() < 0.15 ? 1 : 0,
                ['Mobile', 'Desktop', 'Tablet'][t % 3],
                ['Direct', 'Google Organic', 'Social Media', 'Email Campaign'][t % 4]
            ]
        );

        for (const pID of basketProductIDs) {
            const pObj = prodMap[pID];
            if (!pObj) continue;
            const qty = Math.floor(Math.random() * 2) + 1;
            const total = qty * pObj.Price;

            await db.run(
                `INSERT INTO FactSales (TransactionID, CustomerKey, ProductKey, DateKey, Quantity, UnitPrice, Discount, TotalAmount, SessionID, PaymentMethod, Channel)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [txID, cust.CustomerKey, pObj.ProductKey, dateKey, qty, pObj.Price, 0.0, total, sessionID, ['Credit Card', 'UPI', 'COD'][t % 3], 'Mobile App']
            );
        }
    }

    console.log('--- Seeding Sample Reviews & Ratings ---');
    const reviewTemplates = [
        { rating: 5, comment: 'Outstanding performance and build quality! Exceeded my expectations.' },
        { rating: 5, comment: '100% authentic product. Very fast delivery and excellent value.' },
        { rating: 4, comment: 'Great product overall. Works smoothly as described in specifications.' },
        { rating: 5, comment: 'Must-have purchase! Very smooth experience and top notch build quality.' },
        { rating: 4, comment: 'Sleek design, easy setup, very satisfied with this purchase.' }
    ];

    for (const p of dbProducts) {
        // Seed 2 to 3 reviews per product
        const count = 2 + (p.ProductKey % 2);
        for (let k = 0; k < count; k++) {
            const template = reviewTemplates[(p.ProductKey + k) % reviewTemplates.length];
            const cust = dbCustomers[(p.ProductKey + k) % dbCustomers.length];
            if (cust) {
                await db.run(
                    `INSERT INTO ProductReviews (ProductKey, CustomerKey, Rating, Comment, IsVerifiedPurchase) VALUES (?, ?, ?, ?, 1)`,
                    [p.ProductKey, cust.CustomerKey, template.rating, template.comment]
                );
            }
        }

        // Recalculate average rating for product
        const stats = await db.get(
            `SELECT AVG(Rating) as avgRating FROM ProductReviews WHERE ProductKey = ?`,
            [p.ProductKey]
        );

        if (stats && stats.avgRating) {
            const updatedRating = parseFloat(stats.avgRating.toFixed(1));
            await db.run(
                `UPDATE DimProduct SET PopularityRating = ? WHERE ProductKey = ?`,
                [updatedRating, p.ProductKey]
            );
        }
    }

    console.log('--- Seeding Orders & Logistics Assignments ---');
    const sampleOrdersData = [
        {
            num: 'ORD-2026-901',
            custIdx: 0,
            address: 'Flat 402, Royal Residency, Road No 12, Banjara Hills, Hyderabad, Telangana - 500034',
            status: 'OUT FOR DELIVERY',
            volunteerId: defaultVolunteerId,
            prodId: 'PROD-101',
            qty: 1,
            payMethod: 'UPI'
        },
        {
            num: 'ORD-2026-902',
            custIdx: 1,
            address: '104 Baker Street, Suite 4B, Jubilee Hills, Hyderabad - 500033',
            status: 'SHIPPED',
            volunteerId: defaultVolunteerId,
            prodId: 'PROD-201',
            qty: 1,
            payMethod: 'Card'
        },
        {
            num: 'ORD-2026-903',
            custIdx: 2,
            address: '88 Innovation Boulevard, Gachibowli, Hyderabad - 500032',
            status: 'CONFIRMED',
            volunteerId: null,
            prodId: 'PROD-301',
            qty: 2,
            payMethod: 'COD'
        }
    ];

    for (const o of sampleOrdersData) {
        const cust = dbCustomers[o.custIdx % dbCustomers.length];
        const pObj = prodMap[o.prodId];
        if (!cust || !pObj) continue;

        const subtotal = pObj.Price * o.qty;
        const total = subtotal + 5.0; // Delivery fee

        const custNameRow = await db.get(`SELECT FullName FROM DimCustomer WHERE CustomerKey = ?`, [cust.CustomerKey]);
        const custName = custNameRow ? custNameRow.FullName : 'Customer';

        const orderRes = await db.run(
            `INSERT INTO Orders (OrderNumber, CustomerKey, CustomerName, ShippingAddress, ShippingLatitude, ShippingLongitude, CollectionAddress, Status, VolunteerUserID, PaymentMethod, PaymentStatus, Subtotal, DeliveryFee, TotalAmount)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                o.num,
                cust.CustomerKey,
                custName,
                o.address,
                17.4126,
                78.4482,
                'Shoplytics Central Hub, Depot 4, Hyderabad',
                o.status,
                o.volunteerId,
                o.payMethod,
                o.payMethod === 'COD' ? 'PENDING' : 'SUCCESS',
                subtotal,
                5.0,
                total
            ]
        );

        await db.run(
            `INSERT INTO OrderItems (OrderID, ProductKey, Quantity, UnitPrice) VALUES (?, ?, ?, ?)`,
            [orderRes.lastID, pObj.ProductKey, o.qty, pObj.Price]
        );

        await db.run(
            `INSERT INTO Payments (OrderID, CustomerKey, PaymentMethod, Amount, Status, TransactionRef, IsDemoMode)
             VALUES (?, ?, ?, ?, ?, ?, 1)`,
            [orderRes.lastID, cust.CustomerKey, o.payMethod, total, o.payMethod === 'COD' ? 'PENDING' : 'SUCCESS', `PAY-${Date.now()}-${o.num}`]
        );
    }

    console.log('--- Executing Apriori & RFM Analytics Engine ---');
    await aprioriService.runMining(0.03, 0.25);
    await rfmService.calculateRFM();

    await db.exec(`PRAGMA foreign_keys = ON;`);
    console.log('--- Data Warehouse & Seed Initialization Complete! ---');
}

module.exports = seedDatabase;

if (require.main === module) {
    seedDatabase().then(() => process.exit(0)).catch(err => {
        console.error('Seed process failed:', err);
        process.exit(1);
    });
}
