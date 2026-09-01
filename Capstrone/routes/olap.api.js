const express = require('express');
const router = express.Router();
const db = require('../config/database');

/**
 * @route POST /api/olap/query
 * Execute dynamic OLAP Cube Operations: ROLL-UP, DRILL-DOWN, SLICE, DICE, PIVOT
 */
router.post('/query', async (req, res) => {
    try {
        const { operation = 'ROLLUP', dimension = 'Category', sliceCategory, diceYear, diceCategory } = req.body;

        let query = '';
        let params = [];

        if (operation === 'ROLLUP') {
            // Aggregate to Year level
            query = `
                SELECT d.Year as Dimension, COUNT(DISTINCT f.TransactionID) as TotalOrders, SUM(f.TotalAmount) as TotalRevenue, SUM(f.Quantity) as TotalUnits
                FROM FactSales f
                JOIN DimDate d ON f.DateKey = d.DateKey
                GROUP BY d.Year
                ORDER BY d.Year ASC
            `;
        } else if (operation === 'DRILLDOWN') {
            // Drill down to Year -> Month
            query = `
                SELECT (d.Year || ' - ' || d.Month) as Dimension, COUNT(DISTINCT f.TransactionID) as TotalOrders, SUM(f.TotalAmount) as TotalRevenue, SUM(f.Quantity) as TotalUnits
                FROM FactSales f
                JOIN DimDate d ON f.DateKey = d.DateKey
                GROUP BY d.Year, d.Month
                ORDER BY d.Year ASC, d.Month ASC
                LIMIT 12
            `;
        } else if (operation === 'SLICE') {
            // Slice on a specific category
            const targetCat = sliceCategory || 'Electronics';
            query = `
                SELECT p.ProductName as Dimension, COUNT(DISTINCT f.TransactionID) as TotalOrders, SUM(f.TotalAmount) as TotalRevenue, SUM(f.Quantity) as TotalUnits
                FROM FactSales f
                JOIN DimProduct p ON f.ProductKey = p.ProductKey
                WHERE p.Category = ?
                GROUP BY p.ProductKey
                ORDER BY TotalRevenue DESC
            `;
            params.push(targetCat);
        } else if (operation === 'DICE') {
            // Dice on multiple dimensions (Category + Region)
            query = `
                SELECT (p.Category || ' | ' || c.Region) as Dimension, COUNT(DISTINCT f.TransactionID) as TotalOrders, SUM(f.TotalAmount) as TotalRevenue, SUM(f.Quantity) as TotalUnits
                FROM FactSales f
                JOIN DimProduct p ON f.ProductKey = p.ProductKey
                JOIN DimCustomer c ON f.CustomerKey = c.CustomerKey
                GROUP BY p.Category, c.Region
                ORDER BY TotalRevenue DESC
                LIMIT 10
            `;
        } else if (operation === 'PIVOT') {
            // Pivot Category rows vs Quarter columns
            query = `
                SELECT p.Category as Dimension,
                       SUM(CASE WHEN d.Quarter = 1 THEN f.TotalAmount ELSE 0 END) as Q1_Revenue,
                       SUM(CASE WHEN d.Quarter = 2 THEN f.TotalAmount ELSE 0 END) as Q2_Revenue,
                       SUM(CASE WHEN d.Quarter = 3 THEN f.TotalAmount ELSE 0 END) as Q3_Revenue,
                       SUM(CASE WHEN d.Quarter = 4 THEN f.TotalAmount ELSE 0 END) as Q4_Revenue,
                       SUM(f.TotalAmount) as TotalRevenue
                FROM FactSales f
                JOIN DimProduct p ON f.ProductKey = p.ProductKey
                JOIN DimDate d ON f.DateKey = d.DateKey
                GROUP BY p.Category
                ORDER BY TotalRevenue DESC
            `;
        } else {
            // Default Category Aggregation
            query = `
                SELECT p.Category as Dimension, COUNT(DISTINCT f.TransactionID) as TotalOrders, SUM(f.TotalAmount) as TotalRevenue, SUM(f.Quantity) as TotalUnits
                FROM FactSales f
                JOIN DimProduct p ON f.ProductKey = p.ProductKey
                GROUP BY p.Category
                ORDER BY TotalRevenue DESC
            `;
        }

        const rows = await db.query(query, params);
        res.json({
            operation,
            dimension,
            resultsCount: rows.length,
            data: rows
        });
    } catch (err) {
        console.error('OLAP execution error:', err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
