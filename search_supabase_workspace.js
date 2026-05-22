const fs = require('fs');
const path = require('path');

const rootDir = __dirname;

function walk(dir) {
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
            if (file !== 'node_modules' && file !== '.next') {
                walk(fullPath);
            }
        } else {
            if (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js') || file.endsWith('.jsx') || file.endsWith('.json')) {
                try {
                    const content = fs.readFileSync(fullPath, 'utf8');
                    if (content.toLowerCase().includes('supabase')) {
                        console.log(`Found 'supabase' in ${path.relative(rootDir, fullPath)}`);
                    }
                } catch (e) {}
            }
        }
    });
}

walk(rootDir);
