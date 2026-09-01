const db = require('../config/database');

/**
 * RFM Customer Segmentation & Predictive Analytics Engine
 */
class RFMService {

    /**
     * Compute RFM Analysis and update DimCustomer segments
     */
    async calculateRFM() {
        // Use live current date as reference date
        const refDate = new Date();

        // Query Aggregated Customer Transaction Metrics with live Orders fallback
        const customerMetrics = await db.query(`
            SELECT 
                c.CustomerKey,
                c.CustomerID,
                c.FullName,
                c.Email,
                c.Age,
                c.Gender,
                c.Region,
                COALESCE(MAX(d.FullDate), (SELECT MAX(DATE(CreatedAt)) FROM Orders WHERE CustomerKey = c.CustomerKey)) as LastPurchaseDate,
                MAX(COALESCE((SELECT COUNT(*) FROM Orders WHERE CustomerKey = c.CustomerKey), 0), COUNT(DISTINCT f.TransactionID)) as Frequency,
                MAX(COALESCE((SELECT SUM(TotalAmount) FROM Orders WHERE CustomerKey = c.CustomerKey), 0), SUM(f.TotalAmount)) as Monetary
            FROM DimCustomer c
            LEFT JOIN FactSales f ON c.CustomerKey = f.CustomerKey
            LEFT JOIN DimDate d ON f.DateKey = d.DateKey
            GROUP BY c.CustomerKey
        `);

        if (!customerMetrics || customerMetrics.length === 0) {
            return { message: "No customer metrics available." };
        }

        // Calculate Recency in days
        const processed = customerMetrics.map(c => {
            const lastDateStr = c.LastPurchaseDate || new Date().toISOString().split('T')[0];
            const lastDate = new Date(lastDateStr);
            const diffMs = refDate.getTime() - lastDate.getTime();
            const recencyDays = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
            return {
                ...c,
                RecencyDays: recencyDays,
                Frequency: c.Frequency || 1,
                Monetary: Number((c.Monetary || 0).toFixed(2))
            };
        });

        // Compute scores (1 to 5) using relative distribution thresholds
        // Sort arrays to derive 20th, 40th, 60th, 80th percentiles
        const recencies = processed.map(p => p.RecencyDays).sort((a, b) => a - b);
        const frequencies = processed.map(p => p.Frequency).sort((a, b) => a - b);
        const monetaries = processed.map(p => p.Monetary).sort((a, b) => a - b);

        const getScore = (val, arr, isRecency = false) => {
            if (arr.length === 0) return 3;
            const p20 = arr[Math.floor(arr.length * 0.2)];
            const p40 = arr[Math.floor(arr.length * 0.4)];
            const p60 = arr[Math.floor(arr.length * 0.6)];
            const p80 = arr[Math.floor(arr.length * 0.8)];

            if (isRecency) {
                // Lower recency days = Higher score
                if (val <= p20) return 5;
                if (val <= p40) return 4;
                if (val <= p60) return 3;
                if (val <= p80) return 2;
                return 1;
            } else {
                // Higher frequency/monetary = Higher score
                if (val >= p80) return 5;
                if (val >= p60) return 4;
                if (val >= p40) return 3;
                if (val >= p20) return 2;
                return 1;
            }
        };

        const results = [];

        for (const cust of processed) {
            const rScore = getScore(cust.RecencyDays, recencies, true);
            const fScore = getScore(cust.Frequency, frequencies, false);
            const mScore = getScore(cust.Monetary, monetaries, false);
            const rfmCombined = `${rScore}${fScore}${mScore}`;

            // Determine Segment Label
            let segment = 'Standard';
            if (rScore >= 4 && fScore >= 4 && mScore >= 4) {
                segment = 'Champions';
            } else if (rScore >= 3 && fScore >= 3 && mScore >= 3) {
                segment = 'Loyal Customers';
            } else if (rScore >= 3 && fScore <= 2 && mScore >= 3) {
                segment = 'Potential Loyalists';
            } else if (rScore >= 4 && fScore <= 2) {
                segment = 'Recent Customers';
            } else if (rScore <= 2 && fScore >= 3 && mScore >= 3) {
                segment = 'At Risk';
            } else if (rScore <= 2 && fScore <= 2 && mScore >= 3) {
                segment = 'Cannot Lose Them';
            } else if (rScore <= 2 && fScore <= 2 && mScore <= 2) {
                segment = 'Hibernating / Lost';
            }

            // Update database
            await db.run(
                `UPDATE DimCustomer SET CustomerSegment = ? WHERE CustomerKey = ?`,
                [segment, cust.CustomerKey]
            );

            results.push({
                CustomerKey: cust.CustomerKey,
                CustomerID: cust.CustomerID,
                FullName: cust.FullName,
                Email: cust.Email,
                Age: cust.Age,
                Gender: cust.Gender,
                Region: cust.Region,
                RecencyDays: cust.RecencyDays,
                Frequency: cust.Frequency,
                Monetary: cust.Monetary,
                R_Score: rScore,
                F_Score: fScore,
                M_Score: mScore,
                RFM_Score: rfmCombined,
                Segment: segment
            });
        }

        return results;
    }

    /**
     * Compute Churn Risk & Purchase Likelihood Predictive Model
     */
    async getPredictiveAnalytics() {
        const rfmData = await this.calculateRFM();

        // Fetch session behavior details
        const behaviorRows = await db.query(`
            SELECT CustomerKey, 
                   AVG(SessionDurationSec) as AvgDuration, 
                   AVG(PageViews) as AvgViews, 
                   AVG(CartAdditions) as AvgCartAdds,
                   SUM(AbandonedCart) as TotalAbandoned
            FROM DimBehavior
            WHERE CustomerKey IS NOT NULL
            GROUP BY CustomerKey
        `);

        const behaviorMap = {};
        behaviorRows.forEach(b => {
            behaviorMap[b.CustomerKey] = b;
        });

        const predictions = rfmData.map(cust => {
            const beh = behaviorMap[cust.CustomerKey] || { AvgDuration: 120, AvgViews: 3, AvgCartAdds: 1, TotalAbandoned: 0 };

            // 1. Churn Risk Score Calculation (0 - 100%)
            // Factors: Inactivity (Recency), low F_Score, abandoned carts
            let churnScore = 0;
            if (cust.RecencyDays > 90) churnScore += 45;
            else if (cust.RecencyDays > 45) churnScore += 30;
            else if (cust.RecencyDays > 20) churnScore += 15;

            if (cust.F_Score <= 2) churnScore += 25;
            if (cust.R_Score <= 2) churnScore += 15;
            if (beh.TotalAbandoned > 2) churnScore += 15;

            churnScore = Math.min(98, Math.max(5, churnScore));
            
            let churnRisk = 'Low Risk';
            if (churnScore >= 70) churnRisk = 'High Risk';
            else if (churnScore >= 40) churnRisk = 'Medium Risk';

            // 2. Purchase Likelihood Score Calculation (0 - 100%)
            // Factors: High R_Score, high session duration & page views, recent cart adds
            let purchaseScore = 0;
            purchaseScore += cust.R_Score * 12;
            purchaseScore += cust.F_Score * 6;
            if (beh.AvgViews > 5) purchaseScore += 15;
            if (beh.AvgDuration > 300) purchaseScore += 15;
            if (beh.AvgCartAdds > 2) purchaseScore += 14;

            purchaseScore = Math.min(95, Math.max(10, purchaseScore));

            let purchasePropensity = 'Low';
            if (purchaseScore >= 75) purchasePropensity = 'Very High';
            else if (purchaseScore >= 50) purchasePropensity = 'High';
            else if (purchaseScore >= 30) purchasePropensity = 'Moderate';

            return {
                ...cust,
                ChurnScorePercent: churnScore,
                ChurnRiskLevel: churnRisk,
                PurchaseLikelihoodPercent: purchaseScore,
                PurchasePropensityLevel: purchasePropensity,
                Behavior: {
                    AvgDurationSec: Math.round(beh.AvgDuration),
                    AvgPageViews: Math.round(beh.AvgViews),
                    AbandonedCarts: beh.TotalAbandoned
                }
            };
        });

        // Summary metrics
        const highChurnCount = predictions.filter(p => p.ChurnRiskLevel === 'High Risk').length;
        const avgChurnRisk = Math.round(predictions.reduce((acc, p) => acc + p.ChurnScorePercent, 0) / predictions.length);
        const avgPurchaseProb = Math.round(predictions.reduce((acc, p) => acc + p.PurchaseLikelihoodPercent, 0) / predictions.length);

        return {
            summary: {
                totalCustomers: predictions.length,
                highChurnCustomersCount: highChurnCount,
                averageChurnRiskPercent: avgChurnRisk,
                averagePurchaseLikelihoodPercent: avgPurchaseProb
            },
            predictions
        };
    }
}

module.exports = new RFMService();
