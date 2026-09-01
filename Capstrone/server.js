const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');
const http = require('http');

dotenv.config();

const seedDatabase = require('./services/seed');

const authRoutes = require('./routes/auth');
const analyticsRoutes = require('./routes/analytics');
const recommendationRoutes = require('./routes/recommendations');
const adminRoutes = require('./routes/admin');
const reportRoutes = require('./routes/reports');
const reviewsRoutes = require('./routes/reviews');
const ordersRoutes = require('./routes/orders');
const productsApi = require('./routes/products.api');
const eventsApi = require('./routes/events.api');
const aprioriApi = require('./routes/apriori.api');
const warehouseApi = require('./routes/warehouse.api');
const olapApi = require('./routes/olap.api');
const notificationsApi = require('./routes/notifications.api');
const addressesRoutes = require('./routes/addresses');
const cartRoutes = require('./routes/cart');
const wishlistRoutes = require('./routes/wishlist');
const paymentsRoutes = require('./routes/payments');
const deliveryRoutes = require('./routes/delivery');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3000;

// Socket.IO Setup for Real-Time Location & Order Dispatch Streaming
let io = null;
try {
    const { Server } = require('socket.io');
    io = new Server(server, {
        cors: { origin: '*', methods: ['GET', 'POST'] }
    });

    io.on('connection', (socket) => {
        console.log(`⚡ Real-Time Socket Client Connected: ${socket.id}`);
        socket.on('disconnect', () => {
            console.log(`❌ Socket Client Disconnected: ${socket.id}`);
        });
    });

    app.set('io', io);
} catch (e) {
    console.log('Socket.IO optional module notice:', e.message);
}

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static frontend files from public folder
app.use(express.static(path.join(__dirname, 'public')));

// Register REST API Routes
app.use('/api/auth', authRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/recommendations', recommendationRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/reviews', reviewsRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/products', productsApi);
app.use('/api/events', eventsApi);
app.use('/api/apriori', aprioriApi);
app.use('/api/warehouse', warehouseApi);
app.use('/api/olap', olapApi);
app.use('/api/notifications', notificationsApi);
app.use('/api/addresses', addressesRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/wishlist', wishlistRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/delivery', deliveryRoutes);

// Fallback to index.html for Single Page Application
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server with automatic port fallback if in use
function startServer(initialPort) {
    const appServer = server.listen(initialPort, () => {
        console.log(`=======================================================`);
        console.log(`🚀 Shoplytics E-Commerce Server Running at: http://localhost:${initialPort}`);
        console.log(`=======================================================`);
    });

    appServer.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
            console.log(`⚠️ Port ${initialPort} is already in use. Trying port ${initialPort + 1}...`);
            startServer(initialPort + 1);
        } else {
            console.error('Fatal server startup error:', err);
        }
    });
}

// Initialize database & start server
seedDatabase().then(() => {
    startServer(PORT);
}).catch(err => {
    console.error('Fatal initialization error:', err);
});
