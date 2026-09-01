/**
 * RFM Customer Behavior & Predictive Churn Analytics
 */
let chartRfmDist = null;
let chartChurnPred = null;

async function loadRFMAnalytics() {
    try {
        const res = await fetch('/api/analytics/predictive');
        const data = await res.json();

        renderRFMDistributionChart(data.predictions);
        renderChurnPredChart(data.predictions);
        renderRFMTable(data.predictions);
    } catch (err) {
        console.error('RFM analytics load error:', err);
    }
}

function renderRFMDistributionChart(predictions) {
    const segmentCounts = {};
    predictions.forEach(p => {
        segmentCounts[p.Segment] = (segmentCounts[p.Segment] || 0) + 1;
    });

    const labels = Object.keys(segmentCounts);
    const counts = Object.values(segmentCounts);

    const ctx = document.getElementById('chart-rfm-segments').getContext('2d');
    if (chartRfmDist) chartRfmDist.destroy();

    chartRfmDist = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels,
            datasets: [{
                data: counts,
                backgroundColor: ['#10b981', '#06b6d4', '#6366f1', '#f59e0b', '#f43f5e', '#8b5cf6'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'right', labels: { color: '#94a3b8' } }
            }
        }
    });
}

function renderChurnPredChart(predictions) {
    const highRisk = predictions.filter(p => p.ChurnRiskLevel === 'High Risk').length;
    const medRisk = predictions.filter(p => p.ChurnRiskLevel === 'Medium Risk').length;
    const lowRisk = predictions.filter(p => p.ChurnRiskLevel === 'Low Risk').length;

    const ctx = document.getElementById('chart-churn-risk').getContext('2d');
    if (chartChurnPred) chartChurnPred.destroy();

    chartChurnPred = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Low Risk', 'Medium Risk', 'High Risk'],
            datasets: [{
                label: 'Customer Count',
                data: [lowRisk, medRisk, highRisk],
                backgroundColor: ['#10b981', '#f59e0b', '#f43f5e'],
                borderRadius: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.05)' } },
                y: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.05)' } }
            }
        }
    });
}

function renderRFMTable(predictions) {
    const tbody = document.querySelector('#table-rfm-customers tbody');
    tbody.innerHTML = '';

    predictions.forEach(p => {
        const tr = document.createElement('tr');

        let segmentBadgeClass = 'badge-cyan';
        if (p.Segment === 'Champions') segmentBadgeClass = 'badge-emerald';
        else if (p.Segment === 'At Risk' || p.Segment === 'Hibernating / Lost') segmentBadgeClass = 'badge-rose';
        else if (p.Segment === 'Loyal Customers') segmentBadgeClass = 'badge-indigo';

        let churnBadgeClass = p.ChurnRiskLevel === 'High Risk' ? 'badge-rose' : p.ChurnRiskLevel === 'Medium Risk' ? 'badge-amber' : 'badge-emerald';

        tr.innerHTML = `
            <td>
                <strong>${p.FullName}</strong>
                <div style="font-size: 11px; color: var(--text-muted);">${p.Email}</div>
            </td>
            <td>${p.RecencyDays} days ago</td>
            <td>${p.Frequency} orders</td>
            <td><strong>$${p.Monetary}</strong></td>
            <td><span class="badge ${segmentBadgeClass}">${p.Segment}</span></td>
            <td>
                <span class="badge ${churnBadgeClass}">${p.ChurnScorePercent}% (${p.ChurnRiskLevel})</span>
            </td>
            <td>
                <strong style="color: var(--primary-cyan);">${p.PurchaseLikelihoodPercent}%</strong> (${p.PurchasePropensityLevel})
            </td>
            <td>
                ${p.ChurnRiskLevel === 'High Risk' ? '<button class="btn btn-danger" style="padding: 3px 8px; font-size: 11px;" onclick="sendWinbackOffer(\'' + p.Email + '\')">Send Offer</button>' : '<span style="font-size: 11px; color: var(--text-dim);">Healthy</span>'}
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function sendWinbackOffer(email) {
    alert(`Winback promotional discount email dispatched to ${email}!`);
}
