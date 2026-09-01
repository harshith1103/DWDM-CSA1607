const express = require('express');
const router = express.Router();
const db = require('../config/database');
const warehouseService = require('../services/warehouse');

/**
 * @route GET /api/warehouse/schema
 * Return Star Schema & Snowflake Schema Visual Architecture metadata
 */
router.get('/schema', async (req, res) => {
    try {
        res.json({
            architecture: 'Shoplytics Data Warehouse Star & Snowflake Schema',
            factTables: [
                { name: 'FactSales', measures: ['Quantity', 'UnitPrice', 'Discount', 'TotalAmount'] }
            ],
            dimensionTables: [
                { name: 'DimCustomer', attributes: ['CustomerID', 'FullName', 'Email', 'Age', 'Gender', 'Region', 'CustomerSegment'] },
                { name: 'DimProduct', attributes: ['ProductID', 'ProductName', 'Category', 'Price', 'StockQuantity', 'PopularityRating'] },
                { name: 'DimDate', attributes: ['DateKey', 'FullDate', 'DayOfWeek', 'Month', 'Quarter', 'Year', 'IsWeekend'] },
                { name: 'DimBehavior', attributes: ['SessionID', 'SessionDurationSec', 'PageViews', 'CartAdditions', 'DeviceType'] }
            ],
            snowflakeHierarchy: {
                productHierarchy: 'DimProduct ➔ DimCategory ➔ DimSubcategory ➔ DimBrand',
                customerHierarchy: 'DimCustomer ➔ DimLocation ➔ DimCity ➔ DimState ➔ DimCountry'
            }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * @route GET /api/warehouse/marts/customer
 * Customer Analytics Data Mart
 */
router.get('/marts/customer', async (req, res) => {
    try {
        const customers = await db.query(`
            SELECT c.CustomerID, c.FullName, c.Region, c.CustomerSegment,
                   COUNT(DISTINCT f.TransactionID) as TotalOrders,
                   COALESCE(SUM(f.TotalAmount), 0) as TotalSpending,
                   COALESCE(AVG(f.TotalAmount), 0) as AvgOrderValue,
                   COALESCE(SUM(f.Quantity), 0) as TotalProductsPurchased
            FROM DimCustomer c
            LEFT JOIN FactSales f ON c.CustomerKey = f.CustomerKey
            GROUP BY c.CustomerKey
            ORDER BY TotalSpending DESC
            LIMIT 20
        `);
        res.json(customers);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * @route GET /api/warehouse/marts/product
 * Product Analytics Data Mart
 */
router.get('/marts/product', async (req, res) => {
    try {
        const products = await db.query(`
            SELECT p.ProductID, p.ProductName, p.Category, p.Price, p.StockQuantity, p.PopularityRating,
                   COALESCE(SUM(f.Quantity), 0) as UnitsSold,
                   COALESCE(SUM(f.TotalAmount), 0) as Revenue
            FROM DimProduct p
            LEFT JOIN FactSales f ON p.ProductKey = f.ProductKey
            GROUP BY p.ProductKey
            ORDER BY Revenue DESC
        `);
        res.json(products);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * @route POST /api/warehouse/etl
 * Trigger ETL pipeline simulation with status stages
 */
router.post('/etl', async (req, res) => {
    try {
        res.json({
            status: 'Completed',
            stages: [
                { stage: 'Extract', status: 'Extracted 350 transactions, 40 customers, 24 products' },
                { stage: 'Transform', status: 'Cleaned null values, normalized categories, calculated DateKeys' },
                { stage: 'Load', status: 'Updated FactSales and Dimension tables successfully' }
            ],
            timestamp: new Date().toISOString()
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
