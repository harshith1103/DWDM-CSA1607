const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/database');
const { JWT_SECRET, authenticateToken } = require('../middleware/authMiddleware');

/**
 * @route POST /api/auth/register
 * Public registration for CUSTOMER or VOLUNTEER. Admin registration is prohibited.
 */
router.post('/register', async (req, res) => {
    try {
        let { email, password, fullName, phone, role = 'customer', location, latitude, longitude, preferredArea, vehicleType } = req.body;

        // 1. Name Validation (min 2 characters)
        if (!fullName || fullName.trim().length < 2) {
            return res.status(400).json({ error: 'Full name must contain at least 2 characters.' });
        }

        // 2. Email Validation (Gmail only)
        if (!email || !email.toLowerCase().trim().endsWith('@gmail.com')) {
            return res.status(400).json({ error: 'Email address must be a valid Gmail address ending with @gmail.com (e.g. user@gmail.com).' });
        }
        email = email.toLowerCase().trim();

        // 3. Password Validation (min 6 characters)
        if (!password || password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 digits/characters.' });
        }

        // 4. Phone Validation (7 to 15 numeric digits for international format)
        const cleanPhone = (phone || '').replace(/\D/g, '');
        if (!cleanPhone || cleanPhone.length < 7 || cleanPhone.length > 15) {
            return res.status(400).json({ error: 'Phone number must contain between 7 and 15 numeric digits.' });
        }

        // 5. Role Protection (Admin prohibited from public registration)
        const selectedRole = (role || 'customer').toLowerCase().trim();
        if (selectedRole === 'admin') {
            return res.status(403).json({ error: 'Admin accounts cannot be created via public registration.' });
        }

        if (!['customer', 'volunteer'].includes(selectedRole)) {
            return res.status(400).json({ error: 'Invalid role selection. Must be Customer or Volunteer.' });
        }

        // 6. Check existing user
        const existingUser = await db.get(`SELECT * FROM Users WHERE Email = ?`, [email]);
        if (existingUser) {
            return res.status(400).json({ error: 'An account with this email already exists.' });
        }

        // Hash password securely with bcrypt
        const passwordHash = await bcrypt.hash(password, 10);
        let customerKey = null;
        // Auto-approve all registered customer and volunteer accounts for immediate access
        const isApproved = 1;

        if (selectedRole === 'customer') {
            const custID = `CUST-${Date.now().toString().slice(-6)}`;
            const custResult = await db.run(
                `INSERT INTO DimCustomer (CustomerID, FullName, Email, SignupDate)
                 VALUES (?, ?, ?, ?)`,
                [custID, fullName.trim(), email, new Date().toISOString().split('T')[0]]
            );
            customerKey = custResult.lastID;

            if (location) {
                await db.run(
                    `INSERT INTO CustomerAddresses (CustomerKey, Label, FullName, Phone, HouseFlat, Street, Area, City, State, PostalCode, Latitude, Longitude, IsDefault)
                     VALUES (?, 'HOME', ?, ?, 'Address', ?, ?, 'City', 'State', '500001', ?, ?, 1)`,
                    [customerKey, fullName, cleanPhone, location, location, latitude || 17.3850, longitude || 78.4867]
                );
            }
        }

        const userResult = await db.run(
            `INSERT INTO Users (Email, PasswordHash, Role, CustomerKey, FullName, Phone, Location, Latitude, Longitude, IsApproved)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [email, passwordHash, selectedRole, customerKey, fullName.trim(), cleanPhone, location || 'Hyderabad', latitude || 17.3850, longitude || 78.4867, isApproved]
        );

        if (selectedRole === 'volunteer') {
            await db.run(
                `INSERT INTO Volunteers (UserID, PreferredArea, VehicleType, AvailabilityStatus, IsApproved)
                 VALUES (?, ?, ?, 'OFFLINE', 1)`,
                [userResult.lastID, preferredArea || 'Central Zone', vehicleType || 'Motorcycle']
            );
        }

        const token = jwt.sign(
            { userId: userResult.lastID, email, role: selectedRole, fullName, customerKey },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.status(201).json({
            message: 'Account registered successfully! You are now logged in.',
            token,
            user: { userId: userResult.lastID, email, role: selectedRole, fullName, customerKey, isApproved: 1 }
        });
    } catch (err) {
        console.error('Registration error:', err);
        res.status(500).json({ error: 'Server error during registration: ' + err.message });
    }
});

/**
 * @route POST /api/auth/login
 * Role-authenticated login verified on the backend database
 */
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required.' });
        }

        const normalizedEmail = email.toLowerCase().trim();
        let user = await db.get(`SELECT * FROM Users WHERE Email = ?`, [normalizedEmail]);
        if (!user) {
            return res.status(401).json({ error: 'Invalid email or password.' });
        }

        const isMatch = await bcrypt.compare(password, user.PasswordHash);
        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid email or password.' });
        }

        // Auto-approve any volunteer account attempting login so all volunteers can log in immediately
        if (user.Role === 'volunteer' && user.IsApproved !== 1) {
            await db.run(`UPDATE Users SET IsApproved = 1 WHERE UserID = ?`, [user.UserID]);
            await db.run(`UPDATE Volunteers SET IsApproved = 1 WHERE UserID = ?`, [user.UserID]);
            user.IsApproved = 1;
        }

        const token = jwt.sign(
            { userId: user.UserID, email: user.Email, role: user.Role, fullName: user.FullName, customerKey: user.CustomerKey },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            message: 'Login successful',
            token,
            user: {
                userId: user.UserID,
                email: user.Email,
                role: user.Role,
                fullName: user.FullName,
                customerKey: user.CustomerKey,
                phone: user.Phone,
                location: user.Location,
                latitude: user.Latitude,
                longitude: user.Longitude,
                isApproved: 1
            }
        });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'Server error during login: ' + err.message });
    }
});

/**
 * @route POST /api/auth/admin-login
 * Protected Admin Portal Entry check
 */
router.post('/admin-login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Admin email and password are required.' });
        }

        const normalizedEmail = email.toLowerCase().trim();
        const user = await db.get(`SELECT * FROM Users WHERE Email = ? AND Role = 'admin'`, [normalizedEmail]);
        if (!user) {
            return res.status(403).json({ error: 'Access Denied. Admin account not found or insufficient privileges.' });
        }

        const isMatch = await bcrypt.compare(password, user.PasswordHash);
        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid admin credentials.' });
        }

        const token = jwt.sign(
            { userId: user.UserID, email: user.Email, role: 'admin', fullName: user.FullName },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            message: 'Admin authentication successful',
            token,
            user: {
                userId: user.UserID,
                email: user.Email,
                role: 'admin',
                fullName: user.FullName
            }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * @route GET /api/auth/me
 */
router.get('/me', authenticateToken, async (req, res) => {
    try {
        const user = await db.get(`SELECT UserID, Email, Role, FullName, CustomerKey, Phone, Location, Latitude, Longitude, IsApproved FROM Users WHERE UserID = ?`, [req.user.userId]);
        res.json({ user });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * @route GET /api/auth/volunteers
 */
router.get('/volunteers', async (req, res) => {
    try {
        const volunteers = await db.query(
            `SELECT u.UserID, u.FullName, u.Email, u.Phone, u.Location, u.IsApproved, v.PreferredArea, v.VehicleType, v.AvailabilityStatus
             FROM Users u
             LEFT JOIN Volunteers v ON u.UserID = v.UserID
             WHERE u.Role = 'volunteer'`
        );
        res.json(volunteers);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
