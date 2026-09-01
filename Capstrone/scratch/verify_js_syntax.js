const fs = require('fs');
const path = require('path');
const vm = require('vm');

const jsFiles = [
    'public/js/app.js',
    'public/js/orders.js',
    'public/js/auth.js',
    'public/js/reviews.js',
    'public/js/recommendations.js',
    'public/js/admin.js'
];

let hasError = false;

jsFiles.forEach(file => {
    const fullPath = path.join(__dirname, '..', file);
    try {
        const code = fs.readFileSync(fullPath, 'utf8');
        new vm.Script(code);
        console.log(`✅ ${file} syntax OK`);
    } catch (e) {
        console.error(`❌ Syntax error in ${file}:`, e.message);
        hasError = true;
    }
});

if (hasError) {
    process.exit(1);
} else {
    console.log('All JS files passed syntax validation cleanly!');
    process.exit(0);
}
