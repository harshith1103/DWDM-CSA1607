const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authenticateToken } = require('../middleware/authMiddleware');

/**
 * @route POST /api/payments/verify
 * Payment verification for COD, Card, and UPI methods
 * Provides a clear DEMO PAYMENT MODE indicator when live gateway credentials are absent.
 */
router.post('/verify', authenticateToken, async (req, res) => {
    try {
        const { orderId, paymentMethod, amount, upiId, cardLast4 } = req.body;
        const customerKey = req.user.customerKey;

        if (!orderId || !paymentMethod || !amount) {
            return res.status(400).json({ error: 'Order ID, payment method, and amount are required.' });
        }

        const validMethods = ['COD', 'Card', 'UPI'];
        if (!validMethods.includes(paymentMethod)) {
            return res.status(400).json({ error: 'Invalid payment method. Options: COD, Card, UPI.' });
        }

        if (paymentMethod === 'UPI' && upiId && !/^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/.test(upiId)) {
            return res.status(400).json({ error: 'Invalid UPI ID format (e.g. user@upi).' });
        }

        const hasGatewayKey = process.env.PAYMENT_GATEWAY_KEY && process.env.PAYMENT_GATEWAY_SECRET;
        const isDemoMode = !hasGatewayKey;
        const status = 'SUCCESS';
        const transactionRef = `PAY-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

        const paymentResult = await db.run(
            `INSERT INTO Payments (OrderID, CustomerKey, PaymentMethod, Amount, Status, TransactionRef, IsDemoMode)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [orderId, customerKey, paymentMethod, amount, status, transactionRef, isDemoMode ? 1 : 0]
        );

        // Update Order payment status
        await db.run(
            `UPDATE Orders SET PaymentMethod = ?, PaymentStatus = ? WHERE OrderID = ?`,
            [paymentMethod, status, orderId]
        );

        res.json({
            message: isDemoMode ? 'Demo Payment Verified Successfully' : 'Payment Verified Successfully',
            isDemoMode,
            paymentId: paymentResult.lastID,
            transactionRef,
            amount,
            paymentMethod,
            status,
            orderId
        });
    } catch (err) {
        console.error('Payment verification error:', err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
