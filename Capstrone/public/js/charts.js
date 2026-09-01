/**
 * BI Dashboard Chart.js Visualizations & OLAP Queries
 */
let chartTrend = null;
let chartCategory = null;
let chartDemo = null;
let chartTopProd = null;

async function loadDashboardData() {
    await fetchKPIs();
    await fetchSalesTrends();
    await fetchCategoryPerf();
    await fetchDemographics();
    await fetchTopProductsChart();
}

async function fetchKPIs() {
    try {
        const res = await fetch('/api/analytics/kpis');
        const kpis = await res.json();

        document.getElementById('kpi-revenue').innerText = `$${kpis.totalRevenue.toLocaleString()}`;
        document.getElementById('kpi-orders').innerText = kpis.totalOrders.toLocaleString();
        document.getElementById('kpi-aov').innerText = `$${kpis.avgOrderValue}`;
        document.getElementById('kpi-customers').innerText = kpis.totalCustomers.toLocaleString();
    } catch (err) {
        console.error('KPI load error:', err);
    }
}

async function fetchSalesTrends() {
    try {
        const res = await fetch('/api/analytics/trends');
        const trends = await res.json();

        const labels = trends.map(t => `${t.Month.substring(0, 3)} ${t.Year}`);
        const revenues = trends.map(t => t.Revenue);
        const orders = trends.map(t => t.TotalOrders);

        const ctx = document.getElementById('chart-sales-trend').getContext('2d');
        if (chartTrend) chartTrend.destroy();

        chartTrend = new Chart(ctx, {
            type: 'line',
            data: {
                labels,
                datasets: [
                    {
                        label: 'Revenue ($)',
                        data: revenues,
                        borderColor: '#06b6d4',
                        backgroundColor: 'rgba(6, 182, 212, 0.15)',
                        fill: true,
                        tension: 0.4,
                        yAxisID: 'y'
                    },
                    {
                        label: 'Orders Count',
                        data: orders,
                        borderColor: '#6366f1',
                        borderDash: [5, 5],
                        fill: false,
                        yAxisID: 'y1'
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { labels: { color: '#94a3b8' } }
                },
                scales: {
                    x: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.05)' } },
                    y: { type: 'linear', display: true, position: 'left', ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.05)' } },
                    y1: { type: 'linear', display: true, position: 'right', grid: { drawOnChartArea: false }, ticks: { color: '#94a3b8' } }
                }
            }
        });
    } catch (err) {
        console.error('Trend chart error:', err);
    }
}

async function fetchCategoryPerf() {
    try {
        const res = await fetch('/api/analytics/categories');
        const data = await res.json();

        const labels = data.map(d => d.Category);
        const revenues = data.map(d => d.TotalRevenue);

        const ctx = document.getElementById('chart-category-perf').getContext('2d');
        if (chartCategory) chartCategory.destroy();

        chartCategory = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels,
                datasets: [{
                    data: revenues,
                    backgroundColor: ['#06b6d4', '#6366f1', '#10b981', '#f59e0b', '#f43f5e', '#8b5cf6'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'bottom', labels: { color: '#94a3b8' } }
                }
            }
        });
    } catch (err) {
        console.error('Category perf chart error:', err);
    }
}

async function fetchDemographics() {
    try {
        const res = await fetch('/api/analytics/demographics');
        const data = await res.json();

        const labels = data.ageGroup.map(a => a.AgeGroup);
        const revenues = data.ageGroup.map(a => a.Revenue);

        const ctx = document.getElementById('chart-demographics').getContext('2d');
        if (chartDemo) chartDemo.destroy();

        chartDemo = new Chart(ctx, {
            type: 'bar',
            data: {
                labels,
                datasets: [{
                    label: 'Revenue by Age Group ($)',
                    data: revenues,
                    backgroundColor: 'rgba(99, 102, 241, 0.8)',
                    borderRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { labels: { color: '#94a3b8' } } },
                scales: {
                    x: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.05)' } },
                    y: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.05)' } }
                }
            }
        });
    } catch (err) {
        console.error('Demographics chart error:', err);
    }
}

async function fetchTopProductsChart() {
    try {
        const res = await fetch('/api/analytics/top-products?limit=5');
        const data = await res.json();

        const labels = data.map(p => p.ProductName.length > 20 ? p.ProductName.substring(0, 18) + '...' : p.ProductName);
        const revenues = data.map(p => p.TotalRevenue);

        const ctx = document.getElementById('chart-top-products').getContext('2d');
        if (chartTopProd) chartTopProd.destroy();

        chartTopProd = new Chart(ctx, {
            type: 'bar',
            data: {
                labels,
                datasets: [{
                    label: 'Revenue ($)',
                    data: revenues,
                    backgroundColor: 'rgba(16, 185, 129, 0.8)',
                    borderRadius: 6
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { labels: { color: '#94a3b8' } } },
                scales: {
                    x: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.05)' } },
                    y: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.05)' } }
                }
            }
        });
    } catch (err) {
        console.error('Top products chart error:', err);
    }
}

async function applyFilters() {
    const category = document.getElementById('filter-category').value;
    const gender = document.getElementById('filter-gender').value;
    const region = document.getElementById('filter-region').value;

    const query = new URLSearchParams({ category, gender, region }).toString();
    try {
        const res = await fetch(`/api/analytics/filter?${query}`);
        const data = await res.json();

        document.getElementById('kpi-revenue').innerText = `$${data.summary.totalRevenue.toLocaleString()}`;
        document.getElementById('kpi-orders').innerText = data.summary.totalOrders.toLocaleString();
    } catch (err) {
        console.error('Filter query error:', err);
    }
}

function resetFilters() {
    document.getElementById('filter-category').value = '';
    document.getElementById('filter-gender').value = '';
    document.getElementById('filter-region').value = '';
    loadDashboardData();
}
