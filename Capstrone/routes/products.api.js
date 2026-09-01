const express = require('express');
const router = express.Router();
const db = require('../config/database');

/**
 * @route GET /api/products
 * Fetch catalog products with search, filter, and sorting
 */
router.get('/', async (req, res) => {
    try {
        const { category, search, minPrice, maxPrice, rating, sortBy, limit } = req.query;

        let query = `SELECT * FROM DimProduct WHERE 1=1`;
        const params = [];

        if (category) {
            query += ` AND Category = ?`;
            params.push(category);
        }

        if (search) {
            query += ` AND (ProductName LIKE ? OR Category LIKE ?)`;
            params.push(`%${search}%`, `%${search}%`);
        }

        if (minPrice) {
            query += ` AND Price >= ?`;
            params.push(parseFloat(minPrice));
        }

        if (maxPrice) {
            query += ` AND Price <= ?`;
            params.push(parseFloat(maxPrice));
        }

        if (rating) {
            query += ` AND PopularityRating >= ?`;
            params.push(parseFloat(rating));
        }

        // Sorting
        if (sortBy === 'price_low') {
            query += ` ORDER BY Price ASC`;
        } else if (sortBy === 'price_high') {
            query += ` ORDER BY Price DESC`;
        } else if (sortBy === 'rating') {
            query += ` ORDER BY PopularityRating DESC`;
        } else {
            query += ` ORDER BY PopularityRating DESC, ProductKey DESC`;
        }

        if (limit) {
            query += ` LIMIT ?`;
            params.push(parseInt(limit));
        }

        const products = await db.query(query, params);
        res.json(products);
    } catch (err) {
        console.error('Error fetching products:', err);
        res.status(500).json({ error: err.message });
    }
});

/**
 * @route GET /api/products/categories
 * Fetch distinct product categories
 */
router.get('/categories', async (req, res) => {
    try {
        const categories = await db.query(`SELECT DISTINCT Category FROM DimProduct ORDER BY Category`);
        res.json(categories.map(c => c.Category));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * @route GET /api/products/trending
 * Calculate weighted trending score (PopularityRating * 0.6 + Price ratio)
 */
router.get('/trending', async (req, res) => {
    try {
        const products = await db.query(`
            SELECT *, (PopularityRating * 0.7 + (StockQuantity / 10.0) * 0.3) as TrendingScore 
            FROM DimProduct 
            ORDER BY TrendingScore DESC 
            LIMIT 8
        `);
        res.json(products);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * @route GET /api/products/:id
 * Fetch single product details
 */
router.get('/:id', async (req, res) => {
    try {
        const product = await db.get(`SELECT * FROM DimProduct WHERE ProductKey = ? OR ProductID = ?`, [req.params.id, req.params.id]);
        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }

        // Fetch similar products in same category
        const similar = await db.query(
            `SELECT * FROM DimProduct WHERE Category = ? AND ProductKey != ? LIMIT 4`,
            [product.Category, product.ProductKey]
        );

        res.json({
            ...product,
            similarProducts: similar
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
