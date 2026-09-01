/**
 * Apriori Association Rules Mining & Recommendations Handler
 */

let allProductsMap = {};

async function loadAprioriRules() {
    await cacheProductMap();
    try {
        const res = await fetch('/api/recommendations/rules');
        const rules = await res.json();

        const badge = document.getElementById('rules-count-badge');
        badge.innerText = `${rules.length} Association Rules Mined`;

        const tbody = document.querySelector('#table-apriori-rules tbody');
        tbody.innerHTML = '';

        if (rules.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted);">No rules mined matching current thresholds. Try lowering Min Support.</td></tr>`;
            return;
        }

        rules.forEach(rule => {
            const antecedentsStr = rule.Antecedents.map(id => getProductName(id)).join(' + ');
            const consequentsStr = rule.Consequents.map(id => getProductName(id)).join(' + ');
            
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong style="color: var(--text-main);">${antecedentsStr}</strong></td>
                <td><span style="color: var(--primary-cyan); font-weight: 600;">${consequentsStr}</span></td>
                <td>${(rule.Support * 100).toFixed(1)}%</td>
                <td>${(rule.Confidence * 100).toFixed(1)}%</td>
                <td><strong style="color: var(--accent-emerald);">${rule.Lift.toFixed(2)}x</strong></td>
                <td>
                    <span class="badge ${rule.Lift >= 2.0 ? 'badge-emerald' : rule.Lift >= 1.2 ? 'badge-cyan' : 'badge-amber'}">
                        ${rule.RuleStrength || 'Strong'}
                    </span>
                </td>
            `;
            tbody.appendChild(tr);
        });
    } catch (err) {
        console.error('Apriori rules load error:', err);
    }
}

async function cacheProductMap() {
    try {
        const res = await fetch('/api/admin/products');
        const products = await res.json();
        products.forEach(p => {
            allProductsMap[p.ProductID] = p.ProductName;
        });
    } catch (e) {
        console.error('Product cache error:', e);
    }
}

function getProductName(id) {
    return allProductsMap[id] || id;
}

async function reMineApriori() {
    const minSupport = parseFloat(document.getElementById('input-support').value);
    const minConfidence = parseFloat(document.getElementById('input-confidence').value);

    try {
        const res = await fetch('/api/recommendations/mine', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ minSupport, minConfidence })
        });

        const data = await res.json();
        alert(`Mining complete! Generated ${data.rulesCount} rules across ${data.totalTransactions} transaction baskets.`);
        loadAprioriRules();
    } catch (err) {
        alert('Mining failed: ' + err.message);
    }
}
