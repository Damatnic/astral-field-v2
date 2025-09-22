const fs = require('fs');
const path = require('path');

// Files that need fixing based on the grep results
const filesToFix = [
  'src/app/api/test-simple/route.ts',
  'src/app/api/sync/scores/route.ts',
  'src/app/api/sync/players/route.ts',
  'src/app/api/sitemap/route.ts',
  'src/app/api/performance/route.ts',
  'src/app/api/robots/route.ts',
  'src/app/api/metrics/performance/route.ts',
  'src/app/api/metrics/errors/route.ts',
  'src/app/api/league/damato/route.ts',
  'src/app/api/health/db/route.ts',
  'src/app/api/errors/route.ts',
  'src/app/api/draft/[id]/websocket/route.ts',
  'src/app/api/draft/[id]/auto-pick/route.ts',
  'src/app/api/docs/route.ts',
  'src/app/api/auth/demo-info/route.ts'
];

function fixDynamicPlacement(filePath) {
  const fullPath = path.resolve(filePath);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`File not found: ${fullPath}`);
    return false;
  }

  let content = fs.readFileSync(fullPath, 'utf8');
  
  // Pattern to find incorrectly placed export const dynamic inside functions
  const incorrectPattern = /export (async )?function \w+\([^)]*\) \{\s*\n\s*export const dynamic = 'force-dynamic';/g;
  
  if (incorrectPattern.test(content)) {
    // Remove the incorrectly placed export
    content = content.replace(/\n\s*export const dynamic = 'force-dynamic';/g, '');
    
    // Find the last import statement
    const lines = content.split('\n');
    let lastImportIndex = -1;
    
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].startsWith('import ')) {
        lastImportIndex = i;
      }
    }
    
    // Check if dynamic export already exists at module level
    const hasDynamicExport = lines.some(line => 
      line.trim() === "export const dynamic = 'force-dynamic';" &&
      lines.indexOf(line) < 10 // Check only in the first 10 lines
    );
    
    if (!hasDynamicExport && lastImportIndex !== -1) {
      // Add the export after imports
      lines.splice(lastImportIndex + 1, 0, '', "export const dynamic = 'force-dynamic';");
      content = lines.join('\n');
    }
    
    fs.writeFileSync(fullPath, content);
    console.log(`✓ Fixed: ${filePath}`);
    return true;
  } else {
    console.log(`No fix needed: ${filePath}`);
    return false;
  }
}

let fixedCount = 0;
console.log('Fixing dynamic export placement in API routes...\n');

for (const file of filesToFix) {
  if (fixDynamicPlacement(file)) {
    fixedCount++;
  }
}

console.log(`\n✓ Fixed ${fixedCount} files`);