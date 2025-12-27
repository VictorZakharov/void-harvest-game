const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.join(__dirname, '..', 'js');

function countLoc(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const rawLoc = content.split('\n').length;

    // Remove block comments
    const noBlockComments = content.replace(/\/\*[\s\S]*?\*\//g, '');

    const lines = noBlockComments.split('\n');
    let logicLoc = 0;

    for (const line of lines) {
        const trimmed = line.trim();

        // Skip empty lines
        if (!trimmed) continue;

        // Skip single line comments
        if (trimmed.startsWith('//')) continue;

        // Skip imports and commonjs requires
        if (trimmed.startsWith('import ') || trimmed.startsWith('export ') && trimmed.includes('from ')) continue;
        if (trimmed.startsWith('require(') || trimmed.includes(' = require(')) continue;

        logicLoc++;
    }
    return { rawLoc, logicLoc };
}

function getFiles(dir, fileList = []) {
    const files = fs.readdirSync(dir);
    files.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat.isDirectory()) {
            getFiles(filePath, fileList);
        } else {
            if (file.endsWith('.js')) {
                const locData = countLoc(filePath);
                fileList.push({
                    path: filePath,
                    relativePath: path.relative(ROOT_DIR, filePath),
                    size: stat.size,
                    loc: locData.logicLoc,
                    rawLoc: locData.rawLoc
                });
            }
        }
    });
    return fileList;
}

function formatSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    else return (bytes / 1048576).toFixed(1) + ' MB';
}

const allFiles = getFiles(ROOT_DIR);

// Calculate totals
const totalSize = allFiles.reduce((sum, f) => sum + f.size, 0);
const totalLoc = allFiles.reduce((sum, f) => sum + f.loc, 0);
const totalRawLoc = allFiles.reduce((sum, f) => sum + f.rawLoc, 0);

// Sort by LOC descending
allFiles.sort((a, b) => b.loc - a.loc);

console.log('## Project Size Analysis');
console.log(`- **Generated At**: ${new Date().toISOString().split('T')[0]}`);
console.log(`- **Total JS Files**: ${allFiles.length}`);
console.log(`- **Total Project Size**: ${formatSize(totalSize)}`);
console.log(`- **Total Raw LOC**: ${totalRawLoc}`);
console.log(`- **Total Logical LOC**: ${totalLoc}`);

console.log('\n### Full File List (Sorted by Logic LOC)');
console.log('| File | Size | Raw LOC | Logic LOC ▼ |');
console.log('|---|---|---|---|');
allFiles.forEach(f => {
    console.log(`| \`js/${f.relativePath.replace(/\\/g, '/')}\` | ${formatSize(f.size)} | ${f.rawLoc} | ${f.loc} |`);
});
