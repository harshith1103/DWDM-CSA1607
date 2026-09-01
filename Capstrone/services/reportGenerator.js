const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');
const warehouseService = require('./warehouse');
const rfmService = require('./rfm');
const aprioriService = require('./apriori');
const db = require('../config/database');

class ReportGenerator {

    /**
     * Generate Comprehensive Excel Report Workbook
     */
    async generateExcelReport(res) {
        const workbook = new ExcelJS.Workbook();
        workbook.creator = 'Shoplytics Analytics Platform';
        workbook.created = new Date();

        // 1. Sheet 1: Executive KPIs
        const kpiSheet = workbook.addWorksheet('Executive Overview');
        const kpis = await warehouseService.getKPIs();
        
        kpiSheet.columns = [
            { header: 'Metric', key: 'metric', width: 30 },
            { header: 'Value', key: 'value', width: 25 }
        ];

        kpiSheet.addRows([
            { metric: 'Total Revenue ($)', value: kpis.totalRevenue },
            { metric: 'Total Transactions', value: kpis.totalOrders },
            { metric: 'Average Order Value ($)', value: kpis.avgOrderValue },
            { metric: 'Total Customers', value: kpis.totalCustomers },
            { metric: 'Total Units Sold', value: kpis.totalUnitsSold },
            { metric: 'Top Performing Category', value: kpis.topCategory }
        ]);

        // Style Headers
        kpiSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFF' } };
        kpiSheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '0F172A' } };

        // 2. Sheet 2: Association Rules (Apriori)
        const ruleSheet = workbook.addWorksheet('Apriori Association Rules');
        ruleSheet.columns = [
            { header: 'Rule ID', key: 'RuleID', width: 10 },
            { header: 'Antecedents (If Bought)', key: 'Antecedents', width: 25 },
            { header: 'Consequents (Then Bought)', key: 'Consequents', width: 25 },
            { header: 'Support Score', key: 'Support', width: 15 },
            { header: 'Confidence Score', key: 'Confidence', width: 18 },
            { header: 'Lift Multiplier', key: 'Lift', width: 15 },
            { header: 'Rule Strength', key: 'RuleStrength', width: 15 }
        ];

        const rules = await db.query(`SELECT * FROM AssociationRules ORDER BY Lift DESC`);
        rules.forEach(r => {
            ruleSheet.addRow({
                RuleID: r.RuleID,
                Antecedents: JSON.parse(r.Antecedents).join(', '),
                Consequents: JSON.parse(r.Consequents).join(', '),
                Support: r.Support,
                Confidence: r.Confidence,
                Lift: r.Lift,
                RuleStrength: r.RuleStrength
            });
        });
        ruleSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFF' } };
        ruleSheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '06B6D4' } };

        // 3. Sheet 3: RFM Customer Segmentation & Churn Risk
        const rfmSheet = workbook.addWorksheet('Customer RFM & Predictive');
        rfmSheet.columns = [
            { header: 'Customer ID', key: 'CustomerID', width: 15 },
            { header: 'Full Name', key: 'FullName', width: 22 },
            { header: 'Email', key: 'Email', width: 25 },
            { header: 'Recency (Days)', key: 'RecencyDays', width: 15 },
            { header: 'Frequency', key: 'Frequency', width: 12 },
            { header: 'Monetary ($)', key: 'Monetary', width: 15 },
            { header: 'RFM Segment', key: 'Segment', width: 20 },
            { header: 'Churn Risk Level', key: 'ChurnRiskLevel', width: 18 },
            { header: 'Churn Score (%)', key: 'ChurnScorePercent', width: 16 }
        ];

        const pred = await rfmService.getPredictiveAnalytics();
        pred.predictions.forEach(p => {
            rfmSheet.addRow({
                CustomerID: p.CustomerID,
                FullName: p.FullName,
                Email: p.Email,
                RecencyDays: p.RecencyDays,
                Frequency: p.Frequency,
                Monetary: p.Monetary,
                Segment: p.Segment,
                ChurnRiskLevel: p.ChurnRiskLevel,
                ChurnScorePercent: p.ChurnScorePercent
            });
        });
        rfmSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFF' } };
        rfmSheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '6366F1' } };

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename="Shoplytics_Analytics_Report.xlsx"');

        await workbook.xlsx.write(res);
        res.end();
    }

    /**
     * Generate PDF Executive Analytics Report
     */
    async generatePDFReport(res) {
        const doc = new PDFDocument({ margin: 40 });

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename="Shoplytics_Executive_Summary.pdf"');
        doc.pipe(res);

        // Header Title Card
        doc.fillColor('#0F172A').rect(0, 0, doc.page.width, 90).fill();
        doc.fillColor('#06B6D4').fontSize(24).font('Helvetica-Bold').text('SHOPLYTICS', 40, 25);
        doc.fillColor('#FFFFFF').fontSize(12).font('Helvetica').text('E-Commerce Recommendation & Customer Behavior Analytics Report', 40, 55);
        doc.fillColor('#94A3B8').fontSize(9).text(`Generated: ${new Date().toLocaleString()}`, doc.page.width - 220, 55);

        doc.moveDown(4);

        // Executive KPIs
        const kpis = await warehouseService.getKPIs();
        doc.fillColor('#0F172A').fontSize(16).font('Helvetica-Bold').text('Executive Summary KPIs', 40, 110);

        doc.fontSize(10).font('Helvetica');
        const kpiY = 135;
        doc.fillColor('#1E293B').text(`Total Revenue: $${kpis.totalRevenue.toLocaleString()}`, 40, kpiY);
        doc.text(`Total Transactions: ${kpis.totalOrders}`, 220, kpiY);
        doc.text(`Avg Order Value: $${kpis.avgOrderValue}`, 400, kpiY);

        doc.text(`Active Customers: ${kpis.totalCustomers}`, 40, kpiY + 20);
        doc.text(`Units Sold: ${kpis.totalUnitsSold}`, 220, kpiY + 20);
        doc.text(`Top Category: ${kpis.topCategory}`, 400, kpiY + 20);

        doc.moveTo(40, 185).lineTo(doc.page.width - 40, 185).strokeColor('#E2E8F0').stroke();

        // Top Apriori Rules Section
        doc.fillColor('#0F172A').fontSize(14).font('Helvetica-Bold').text('Top Apriori Association Rules', 40, 205);

        const rules = await db.query(`SELECT * FROM AssociationRules ORDER BY Lift DESC LIMIT 8`);
        let currentY = 230;

        // Table Header
        doc.fillColor('#06B6D4').rect(40, currentY, doc.page.width - 80, 20).fill();
        doc.fillColor('#FFFFFF').fontSize(9).font('Helvetica-Bold');
        doc.text('Antecedent (If Bought)', 45, currentY + 5);
        doc.text('Consequent (Then Bought)', 200, currentY + 5);
        doc.text('Support', 360, currentY + 5);
        doc.text('Confidence', 430, currentY + 5);
        doc.text('Lift', 510, currentY + 5);

        currentY += 25;
        doc.font('Helvetica').fontSize(9).fillColor('#334155');

        rules.forEach((r, idx) => {
            const ant = JSON.parse(r.Antecedents).join(', ');
            const cons = JSON.parse(r.Consequents).join(', ');

            if (idx % 2 === 1) {
                doc.fillColor('#F8FAFC').rect(40, currentY - 3, doc.page.width - 80, 18).fill();
            }

            doc.fillColor('#334155');
            doc.text(ant.length > 25 ? ant.substring(0, 22) + '...' : ant, 45, currentY);
            doc.text(cons.length > 25 ? cons.substring(0, 22) + '...' : cons, 200, currentY);
            doc.text(`${(r.Support * 100).toFixed(1)}%`, 360, currentY);
            doc.text(`${(r.Confidence * 100).toFixed(1)}%`, 430, currentY);
            doc.text(`${r.Lift.toFixed(2)}x`, 510, currentY);
            currentY += 20;
        });

        doc.moveTo(40, currentY + 10).lineTo(doc.page.width - 40, currentY + 10).strokeColor('#E2E8F0').stroke();

        // RFM & Predictive Summary Section
        currentY += 25;
        doc.fillColor('#0F172A').fontSize(14).font('Helvetica-Bold').text('Customer Segmentation & Churn Risk Alert', 40, currentY);
        currentY += 25;

        const pred = await rfmService.getPredictiveAnalytics();
        const highRisk = pred.predictions.filter(p => p.ChurnRiskLevel === 'High Risk').slice(0, 6);

        doc.fillColor('#6366F1').rect(40, currentY, doc.page.width - 80, 20).fill();
        doc.fillColor('#FFFFFF').fontSize(9).font('Helvetica-Bold');
        doc.text('Customer Name', 45, currentY + 5);
        doc.text('Segment', 180, currentY + 5);
        doc.text('Recency', 300, currentY + 5);
        doc.text('Spend ($)', 370, currentY + 5);
        doc.text('Churn Risk', 450, currentY + 5);

        currentY += 25;
        doc.font('Helvetica').fontSize(9);

        highRisk.forEach((p, idx) => {
            if (idx % 2 === 1) {
                doc.fillColor('#F8FAFC').rect(40, currentY - 3, doc.page.width - 80, 18).fill();
            }
            doc.fillColor('#334155');
            doc.text(p.FullName, 45, currentY);
            doc.text(p.Segment, 180, currentY);
            doc.text(`${p.RecencyDays} days ago`, 300, currentY);
            doc.text(`$${p.Monetary}`, 370, currentY);
            doc.fillColor('#EF4444').text(`${p.ChurnScorePercent}% (${p.ChurnRiskLevel})`, 450, currentY);
            currentY += 20;
        });

        // Footer
        doc.fontSize(8).fillColor('#94A3B8').text('Shoplytics Data Mining & BI Platform • Confidential Report', 40, doc.page.height - 30, { align: 'center' });

        doc.end();
    }
}

module.exports = new ReportGenerator();
