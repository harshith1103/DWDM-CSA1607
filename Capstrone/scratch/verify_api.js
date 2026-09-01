const http = require('http');

http.get('http://localhost:3000/api/products', (res) => {
    let rawData = '';
    res.on('data', (chunk) => { rawData += chunk; });
    res.on('end', () => {
        try {
            const products = JSON.parse(rawData);
            const pelican = products.find(p => p.ProductID === 'PROD-720');
            const ua = products.find(p => p.ProductID === 'PROD-510');
            console.log('API Response Verification:');
            console.log('PROD-720 (Pelican Cooler):', pelican ? pelican.ImageURL : 'Not found');
            console.log('PROD-510 (Under Armour T-Shirt):', ua ? ua.ImageURL : 'Not found');
        } catch (e) {
            console.error('Error parsing response:', e);
        }
    });
}).on('error', (e) => {
    console.error(`Fetch error: ${e.message}`);
});
