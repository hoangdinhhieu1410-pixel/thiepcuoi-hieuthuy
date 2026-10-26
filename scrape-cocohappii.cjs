const fs = require('fs');

const html = fs.readFileSync('cocohappii-dump.html', 'utf8');

console.log('--- LINK TAGS ---');
const links = html.match(/<link[^>]+>/g) || [];
links.forEach(l => console.log(l));

console.log('\n--- SCRIPTS ---');
const scripts = html.match(/<script[^>]+src=[^>]+>/g) || [];
scripts.forEach(s => console.log(s));

console.log('\n--- IMAGES ---');
const imgs = html.match(/src=["']([^"']+\.(?:png|jpg|jpeg|webp|svg|gif))[^"']*["']/gi) || [];
const uniqueImgs = Array.from(new Set(imgs));
uniqueImgs.forEach(img => console.log(img));

console.log('\n--- INLINE STYLES / BACKGROUNDS ---');
const bgs = html.match(/(?:background|background-image|url)\s*[:(][^;)}]+/gi) || [];
Array.from(new Set(bgs)).forEach(bg => console.log(bg));

console.log('\n--- CLASSES (sample) ---');
const classes = html.match(/class=["']([^"']+)["']/g) || [];
console.log('Total class attributes:', classes.length);
classes.slice(0, 30).forEach(c => console.log(c));
