const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, '..');

function fixUseClient(subDir) {
  const targetDir = path.join(rootDir, subDir, 'src');
  if (!fs.existsSync(targetDir)) return;

  function walk(d) {
    const files = fs.readdirSync(d);
    for (const f of files) {
      const full = path.join(d, f);
      if (fs.statSync(full).isDirectory()) {
        walk(full);
      } else if (full.endsWith('.tsx') || full.endsWith('.ts') || full.endsWith('.jsx') || full.endsWith('.js')) {
        let content = fs.readFileSync(full, 'utf8');
        if (content.includes('"use client"') || content.includes("'use client'")) {
          content = content.replace(/["']use client["'];?\r?\n?/g, '');
          content = '"use client";\n\n' + content.trimStart();
          fs.writeFileSync(full, content, 'utf8');
        }
      }
    }
  }
  walk(targetDir);
}

fixUseClient('restaurant');
fixUseClient('customer');
fixUseClient('super-admin');
fixUseClient('landing');
console.log('✔ "use client" is now the first line in all client component files!');
