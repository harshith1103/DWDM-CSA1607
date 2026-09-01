const fs = require('fs');
const html = fs.readFileSync('public/index.html', 'utf8');

const divOpenCount = (html.match(/<div/g) || []).length;
const divCloseCount = (html.match(/<\/div>/g) || []).length;

console.log(`DIV Open: ${divOpenCount}, DIV Close: ${divCloseCount}`);
if (divOpenCount !== divCloseCount) {
    console.warn('WARNING: Div tags mismatched!');
} else {
    console.log('SUCCESS: Div tags perfectly balanced!');
}
