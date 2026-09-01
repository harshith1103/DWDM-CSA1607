const http = require('http');

function postJson(path, body) {
    return new Promise((resolve, reject) => {
        const dataStr = JSON.stringify(body);
        const req = http.request({
            hostname: 'localhost',
            port: 3000,
            path: path,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(dataStr)
            }
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve({ status: res.statusCode, data }));
        });
        req.on('error', reject);
        req.write(dataStr);
        req.end();
    });
}

function getJson(path) {
    return new Promise((resolve, reject) => {
        http.get({ hostname: 'localhost', port: 3000, path }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve({ status: res.statusCode, data }));
        }).on('error', reject);
    });
}

async function testFixes() {
    console.log('Testing GET /api/products...');
    const prodRes = await getJson('/api/products');
    console.log('Products API Status:', prodRes.status);
    if (prodRes.status === 200) {
        const prods = JSON.parse(prodRes.data);
        console.log(`Successfully fetched ${prods.length} products!`);
    } else {
        console.log('Products Error:', prodRes.data);
    }

    console.log('\nTesting POST /api/recommendations/cart...');
    const recRes = await postJson('/api/recommendations/cart', { cartProductIds: ['PROD-720', 'PROD-713'] });
    console.log('Apriori Rec API Status:', recRes.status);
    if (recRes.status === 200) {
        const recData = JSON.parse(recRes.data);
        console.log(`Apriori recommendations count: ${recData.recommendations ? recData.recommendations.length : 0}`);
    } else {
        console.log('Rec Error:', recRes.data);
    }
}

testFixes().catch(err => {
    console.error(err);
    process.exit(1);
});
