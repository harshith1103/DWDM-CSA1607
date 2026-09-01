const db = require('../config/database');

/**
 * Custom Apriori Algorithm Implementation for Association Rule Mining & Recommendation
 */
class AprioriEngine {
    constructor(minSupport = 0.03, minConfidence = 0.25) {
        this.minSupport = minSupport;
        this.minConfidence = minConfidence;
    }

    /**
     * Run Apriori Mining process on FactSales Data Warehouse transactions
     */
    async runMining(minSupport = this.minSupport, minConfidence = this.minConfidence) {
        this.minSupport = minSupport;
        this.minConfidence = minConfidence;

        // 1. Fetch transactions grouped by TransactionID
        const salesRows = await db.query(`
            SELECT f.TransactionID, p.ProductID, p.ProductName, p.Category
            FROM FactSales f
            JOIN DimProduct p ON f.ProductKey = p.ProductKey
            UNION ALL
            SELECT 'ORD-' || oi.OrderID as TransactionID, p.ProductID, p.ProductName, p.Category
            FROM OrderItems oi
            JOIN DimProduct p ON oi.ProductKey = p.ProductKey
        `);

        if (!salesRows || salesRows.length === 0) {
            return { message: "No transaction data available for Apriori mining.", rulesCount: 0 };
        }

        // Group into baskets by TransactionID
        const basketsMap = {};
        salesRows.forEach(row => {
            if (!basketsMap[row.TransactionID]) {
                basketsMap[row.TransactionID] = new Set();
            }
            basketsMap[row.TransactionID].add(row.ProductID);
        });

        const transactions = Object.values(basketsMap).map(set => Array.from(set));
        const totalTransactions = transactions.length;

        if (totalTransactions === 0) return { message: "No baskets found.", rulesCount: 0 };

        // 2. Count 1-itemset frequencies
        const itemSupportCount = {};
        transactions.forEach(basket => {
            basket.forEach(item => {
                itemSupportCount[item] = (itemSupportCount[item] || 0) + 1;
            });
        });

        // Filter Frequent 1-itemsets
        const freq1Itemsets = {};
        Object.keys(itemSupportCount).forEach(item => {
            const support = itemSupportCount[item] / totalTransactions;
            if (support >= this.minSupport) {
                freq1Itemsets[item] = support;
            }
        });

        // 3. Generate 2-itemset candidate frequencies
        const pairSupportCount = {};
        transactions.forEach(basket => {
            // Sort basket items to avoid duplicate permutations
            const validItems = basket.filter(item => freq1Itemsets[item]).sort();
            for (let i = 0; i < validItems.length; i++) {
                for (let j = i + 1; j < validItems.length; j++) {
                    const pairKey = `${validItems[i]}|||${validItems[j]}`;
                    pairSupportCount[pairKey] = (pairSupportCount[pairKey] || 0) + 1;
                }
            }
        });

        // Filter Frequent 2-itemsets & Generate Rules
        const rules = [];
        Object.keys(pairSupportCount).forEach(pairKey => {
            const count = pairSupportCount[pairKey];
            const pairSupport = count / totalTransactions;
            if (pairSupport >= this.minSupport) {
                const [itemA, itemB] = pairKey.split('|||');

                // Rule 1: A -> B
                const supportA = freq1Itemsets[itemA];
                const supportB = freq1Itemsets[itemB];
                if (supportA) {
                    const confidenceA = pairSupport / supportA;
                    const liftA = confidenceA / (supportB || 0.01);
                    if (confidenceA >= this.minConfidence) {
                        rules.push({
                            antecedents: [itemA],
                            consequents: [itemB],
                            support: Number(pairSupport.toFixed(4)),
                            confidence: Number(confidenceA.toFixed(4)),
                            lift: Number(liftA.toFixed(4)),
                            strength: liftA >= 2.0 ? 'Strong' : liftA >= 1.2 ? 'Moderate' : 'Weak'
                        });
                    }
                }

                // Rule 2: B -> A
                if (supportB) {
                    const confidenceB = pairSupport / supportB;
                    const liftB = confidenceB / (supportA || 0.01);
                    if (confidenceB >= this.minConfidence) {
                        rules.push({
                            antecedents: [itemB],
                            consequents: [itemA],
                            support: Number(pairSupport.toFixed(4)),
                            confidence: Number(confidenceB.toFixed(4)),
                            lift: Number(liftB.toFixed(4)),
                            strength: liftB >= 2.0 ? 'Strong' : liftB >= 1.2 ? 'Moderate' : 'Weak'
                        });
                    }
                }
            }
        });

        // Sort rules by Lift desc then Confidence desc
        rules.sort((a, b) => b.lift - a.lift || b.confidence - a.confidence);

        // 4. Save generated rules to Data Warehouse table AssociationRules
        await db.run(`DELETE FROM AssociationRules`);
        for (const rule of rules) {
            await db.run(
                `INSERT INTO AssociationRules (Antecedents, Consequents, Support, Confidence, Lift, RuleStrength)
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [
                    JSON.stringify(rule.antecedents),
                    JSON.stringify(rule.consequents),
                    rule.support,
                    rule.confidence,
                    rule.lift,
                    rule.strength
                ]
            );
        }

        return {
            totalTransactions,
            frequentItemsetsCount: Object.keys(freq1Itemsets).length + Object.keys(pairSupportCount).length,
            rulesCount: rules.length,
            minSupport: this.minSupport,
            minConfidence: this.minConfidence,
            rules: rules.slice(0, 50) // Top 50 rules for preview
        };
    }

    /**
     * Get real-time product recommendations based on items in cart
     */
    async getRecommendationsForCart(cartProductIds = []) {
        if (!cartProductIds || cartProductIds.length === 0) {
            // Default top overall products if cart is empty
            const topProducts = await db.query(`
                SELECT ProductID, ProductName, Category, Price, PopularityRating, ImageURL
                FROM DimProduct
                ORDER BY PopularityRating DESC, StockQuantity DESC
                LIMIT 4
            `);
            return { recommendations: topProducts, source: 'popularity' };
        }

        // Retrieve rules from DB
        const ruleRows = await db.query(`
            SELECT * FROM AssociationRules
            ORDER BY Lift DESC, Confidence DESC
        `);

        const recommendedItemIDs = new Set();
        const ruleDetails = [];

        ruleRows.forEach(row => {
            const antecedents = JSON.parse(row.Antecedents);
            const consequents = JSON.parse(row.Consequents);

            // Check if cart contains antecedents
            const matchesAntecedent = antecedents.some(ant => cartProductIds.includes(ant));
            if (matchesAntecedent) {
                consequents.forEach(cons => {
                    if (!cartProductIds.includes(cons)) {
                        recommendedItemIDs.add(cons);
                        ruleDetails.push({
                            triggeredBy: antecedents,
                            recommended: cons,
                            confidence: row.Confidence,
                            lift: row.Lift,
                            support: row.Support
                        });
                    }
                });
            }
        });

        let recommendedList = Array.from(recommendedItemIDs);

        // Fetch full product details for recommended item IDs
        let products = [];
        if (recommendedList.length > 0) {
            const placeholders = recommendedList.map(() => '?').join(',');
            products = await db.query(
                `SELECT ProductID, ProductName, Category, Price, PopularityRating, ImageURL 
                 FROM DimProduct WHERE ProductID IN (${placeholders})`,
                recommendedList
            );
        }

        // Fillers if fewer than 4 recommendations found
        if (products.length < 4) {
            const existingIds = [...cartProductIds, ...products.map(p => p.ProductID)];
            const placeholders = existingIds.map(() => '?').join(',');
            const fillProducts = await db.query(
                `SELECT ProductID, ProductName, Category, Price, PopularityRating, ImageURL 
                 FROM DimProduct WHERE ProductID NOT IN (${placeholders})
                 ORDER BY PopularityRating DESC LIMIT ${4 - products.length}`,
                existingIds
            );
            products = [...products, ...fillProducts];
        }

        return {
            recommendations: products,
            ruleTriggers: ruleDetails.slice(0, 5),
            source: 'apriori'
        };
    }

    /**
     * Fetch current mined association rules from Data Warehouse
     */
    async getRules() {
        const rows = await db.query(`SELECT * FROM AssociationRules ORDER BY Lift DESC, Confidence DESC`);
        return rows.map(r => ({
            ...r,
            Antecedents: typeof r.Antecedents === 'string' ? JSON.parse(r.Antecedents) : (r.Antecedents || []),
            Consequents: typeof r.Consequents === 'string' ? JSON.parse(r.Consequents) : (r.Consequents || []),
            Support: r.Support || 0,
            Confidence: r.Confidence || 0,
            Lift: r.Lift || 1.0,
            RuleStrength: r.RuleStrength || 'Moderate'
        }));
    }
}

module.exports = new AprioriEngine();
