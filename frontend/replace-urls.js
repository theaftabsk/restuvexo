const fs = require('fs');
const path = require('path');
function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) { 
            results = results.concat(walk(file));
        } else if (file.endsWith('.js') || file.endsWith('.jsx')) { 
            results.push(file);
        }
    });
    return results;
}
const files = walk('c:/Users/AFTAB/Downloads/returant mangmnat softower/frontend/src');
let changed = 0;
files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let newContent = content.replace(/"http:\/\/localhost:5000\/([^"\n]+)"/g, '`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"}/$1`');
    newContent = newContent.replace(/"http:\/\/localhost:5000"/g, '(process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000")');
    if (content !== newContent) {
        fs.writeFileSync(file, newContent, 'utf8');
        changed++;
    }
});
console.log('Files updated:', changed);
