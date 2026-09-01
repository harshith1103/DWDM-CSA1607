const express = require('express');
const router = express.Router();
const reportGenerator = require('../services/reportGenerator');

/**
 * @route GET /api/reports/excel
 */
router.get('/excel', async (req, res) => {
    try {
        await reportGenerator.generateExcelReport(res);
    } catch (err) {
        console.error('Excel report error:', err);
        if (!res.headersSent) {
            res.status(500).json({ error: 'Failed to generate Excel report: ' + err.message });
        }
    }
});

/**
 * @route GET /api/reports/pdf
 */
router.get('/pdf', async (req, res) => {
    try {
        await reportGenerator.generatePDFReport(res);
    } catch (err) {
        console.error('PDF report error:', err);
        if (!res.headersSent) {
            res.status(500).json({ error: 'Failed to generate PDF report: ' + err.message });
        }
    }
});

module.exports = router;
