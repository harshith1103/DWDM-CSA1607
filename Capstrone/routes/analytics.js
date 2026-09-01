const express = require('express');
const router = express.Router();
const warehouseService = require('../services/warehouse');
const rfmService = require('../services/rfm');

/**
 * @route GET /api/analytics/kpis
 */
router.get('/kpis', async (req, res) => {
    try {
        const kpis = await warehouseService.getKPIs();
        res.json(kpis);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * @route GET /api/analytics/trends
 */
router.get('/trends', async (req, res) => {
    try {
        const trends = await warehouseService.getSalesTrends();
        res.json(trends);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * @route GET /api/analytics/categories
 */
router.get('/categories', async (req, res) => {
    try {
        const categories = await warehouseService.getCategoryPerformance();
        res.json(categories);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * @route GET /api/analytics/top-products
 */
router.get('/top-products', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 10;
        const products = await warehouseService.getTopProducts(limit);
        res.json(products);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * @route GET /api/analytics/demographics
 */
router.get('/demographics', async (req, res) => {
    try {
        const demographics = await warehouseService.getDemographicBreakdown();
        res.json(demographics);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * @route GET /api/analytics/rfm
 */
router.get('/rfm', async (req, res) => {
    try {
        const rfmData = await rfmService.calculateRFM();
        res.json(rfmData);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * @route GET /api/analytics/predictive
 */
router.get('/predictive', async (req, res) => {
    try {
        const analytics = await rfmService.getPredictiveAnalytics();
        res.json(analytics);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * @route GET /api/analytics/filter
 */
router.get('/filter', async (req, res) => {
    try {
        const { category, gender, region, year } = req.query;
        const result = await warehouseService.getFilteredAnalytics({ category, gender, region, year });
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
