const db = require('../config/database');

/**
 * Star Schema OLAP & BI Analytics Service
 */
class WarehouseService {

    /**
     * Get Executive Overview KPIs
     */
    async getKPIs() {
        const kpiRow = await db.get(`
            SELECT 
                SUM(TotalAmount) as TotalRevenue,
                COUNT(DISTINCT TransactionID) as TotalOrders,
                COUNT(DISTINCT CustomerKey) as TotalCustomers,
                AVG(TotalAmount) as AvgOrderValue,
                SUM(Quantity) as TotalUnitsSold
            FROM FactSales
        `);

        const topCat = await db.get(`
            SELECT p.Category, SUM(f.TotalAmount) as CategoryRevenue
            FROM FactSales f
            JOIN DimProduct p ON f.ProductKey = p.ProductKey
            GROUP BY p.Category
            ORDER BY CategoryRevenue DESC
            LIMIT 1
        `);

        return {
            totalRevenue: Number((kpiRow.TotalRevenue || 0).toFixed(2)),
            totalOrders: kpiRow.TotalOrders || 0,
            totalCustomers: kpiRow.TotalCustomers || 0,
            avgOrderValue: Number((kpiRow.AvgOrderValue || 0).toFixed(2)),
            totalUnitsSold: kpiRow.TotalUnitsSold || 0,
            topCategory: topCat ? topCat.Category : 'N/A'
        };
    }

    /**
     * Get Monthly Sales Trends for Line Charts
     */
    async getSalesTrends() {
        const trends = await db.query(`
            SELECT 
                d.Year,
                d.Month,
                d.Quarter,
                COUNT(DISTINCT f.TransactionID) as TotalOrders,
                SUM(f.TotalAmount) as Revenue,
                SUM(f.Quantity) as UnitsSold
            FROM FactSales f
            JOIN DimDate d ON f.DateKey = d.DateKey
            GROUP BY d.Year, d.Month
            ORDER BY d.Year ASC, 
                CASE d.Month
                    WHEN 'January' THEN 1
                    WHEN 'February' THEN 2
                    WHEN 'March' THEN 3
                    WHEN 'April' THEN 4
                    WHEN 'May' THEN 5
                    WHEN 'June' THEN 6
                    WHEN 'July' THEN 7
                    WHEN 'August' THEN 8
                    WHEN 'September' THEN 9
                    WHEN 'October' THEN 10
                    WHEN 'November' THEN 11
                    WHEN 'December' THEN 12
                END ASC
        `);

        return trends.map(t => ({
            ...t,
            Revenue: Number((t.Revenue || 0).toFixed(2))
        }));
    }

    /**
     * Category Performance Breakdown for Pie / Bar Charts
     */
    async getCategoryPerformance() {
        const categories = await db.query(`
            SELECT 
                p.Category,
                COUNT(DISTINCT f.TransactionID) as TotalOrders,
                SUM(f.Quantity) as UnitsSold,
                SUM(f.TotalAmount) as TotalRevenue,
                AVG(p.PopularityRating) as AvgRating
            FROM FactSales f
            JOIN DimProduct p ON f.ProductKey = p.ProductKey
            GROUP BY p.Category
            ORDER BY TotalRevenue DESC
        `);

        return categories.map(c => ({
            ...c,
            TotalRevenue: Number((c.TotalRevenue || 0).toFixed(2)),
            AvgRating: Number((c.AvgRating || 0).toFixed(1))
        }));
    }

    /**
     * Top Popular Products
     */
    async getTopProducts(limit = 10) {
        return await db.query(`
            SELECT 
                p.ProductID,
                p.ProductName,
                p.Category,
                p.Price,
                p.PopularityRating,
                SUM(f.Quantity) as TotalUnitsSold,
                SUM(f.TotalAmount) as TotalRevenue
            FROM FactSales f
            JOIN DimProduct p ON f.ProductKey = p.ProductKey
            GROUP BY p.ProductKey
            ORDER BY TotalRevenue DESC
            LIMIT ?
        `, [limit]);
    }

    /**
     * Demographic Analysis: Age, Gender, Region
     */
    async getDemographicBreakdown() {
        const genderBreakdown = await db.query(`
            SELECT 
                c.Gender,
                COUNT(DISTINCT c.CustomerKey) as CustomerCount,
                SUM(f.TotalAmount) as Revenue
            FROM DimCustomer c
            LEFT JOIN FactSales f ON c.CustomerKey = f.CustomerKey
            GROUP BY c.Gender
        `);

        const regionBreakdown = await db.query(`
            SELECT 
                c.Region,
                COUNT(DISTINCT c.CustomerKey) as CustomerCount,
                SUM(f.TotalAmount) as Revenue
            FROM DimCustomer c
            LEFT JOIN FactSales f ON c.CustomerKey = f.CustomerKey
            GROUP BY c.Region
            ORDER BY Revenue DESC
        `);

        const ageBreakdown = await db.query(`
            SELECT 
                CASE 
                    WHEN c.Age < 25 THEN 'Under 25'
                    WHEN c.Age BETWEEN 25 AND 35 THEN '25 - 35'
                    WHEN c.Age BETWEEN 36 AND 50 THEN '36 - 50'
                    ELSE 'Over 50'
                END as AgeGroup,
                COUNT(DISTINCT c.CustomerKey) as CustomerCount,
                SUM(f.TotalAmount) as Revenue
            FROM DimCustomer c
            LEFT JOIN FactSales f ON c.CustomerKey = f.CustomerKey
            GROUP BY AgeGroup
            ORDER BY Revenue DESC
        `);

        return {
            gender: genderBreakdown.map(g => ({ ...g, Revenue: Number((g.Revenue || 0).toFixed(2)) })),
            region: regionBreakdown.map(r => ({ ...r, Revenue: Number((r.Revenue || 0).toFixed(2)) })),
            ageGroup: ageBreakdown.map(a => ({ ...a, Revenue: Number((a.Revenue || 0).toFixed(2)) }))
        };
    }

    /**
     * Filtered Custom OLAP Query
     */
    async getFilteredAnalytics(filters = {}) {
        let whereClauses = [];
        let params = [];

        if (filters.category) {
            whereClauses.push("p.Category = ?");
            params.push(filters.category);
        }
        if (filters.gender) {
            whereClauses.push("c.Gender = ?");
            params.push(filters.gender);
        }
        if (filters.region) {
            whereClauses.push("c.Region = ?");
            params.push(filters.region);
        }
        if (filters.year) {
            whereClauses.push("d.Year = ?");
            params.push(Number(filters.year));
        }

        const whereSql = whereClauses.length > 0 ? "WHERE " + whereClauses.join(" AND ") : "";

        const summary = await db.get(`
            SELECT 
                SUM(f.TotalAmount) as TotalRevenue,
                COUNT(DISTINCT f.TransactionID) as TotalOrders,
                SUM(f.Quantity) as TotalUnits
            FROM FactSales f
            JOIN DimCustomer c ON f.CustomerKey = c.CustomerKey
            JOIN DimProduct p ON f.ProductKey = p.ProductKey
            JOIN DimDate d ON f.DateKey = d.DateKey
            ${whereSql}
        `, params);

        const categorySummary = await db.query(`
            SELECT p.Category, SUM(f.TotalAmount) as Revenue, SUM(f.Quantity) as Units
            FROM FactSales f
            JOIN DimCustomer c ON f.CustomerKey = c.CustomerKey
            JOIN DimProduct p ON f.ProductKey = p.ProductKey
            JOIN DimDate d ON f.DateKey = d.DateKey
            ${whereSql}
            GROUP BY p.Category
            ORDER BY Revenue DESC
        `, params);

        return {
            summary: {
                totalRevenue: Number((summary.TotalRevenue || 0).toFixed(2)),
                totalOrders: summary.TotalOrders || 0,
                totalUnits: summary.TotalUnits || 0
            },
            categorySummary: categorySummary.map(cs => ({ ...cs, Revenue: Number((cs.Revenue || 0).toFixed(2)) }))
        };
    }
}

module.exports = new WarehouseService();
