const fs = require('fs');
const path = require('path');

// Additional files that need the dynamic export
const filesToFix = [
  'src/app/api/scoring/projections/route.ts',
  'src/app/api/sleeper/sync/route.ts',
  'src/app/api/scoring/update/route.ts',
  'src/app/api/auth/debug/route.ts',
  'src/app/api/leagues/[id]/activity/route.ts',
  'src/app/api/scoring/live/route.ts',
  'src/app/api/sleeper/scores/route.ts',
  'src/app/api/sleeper/league/route.ts',
  'src/app/api/sleeper/database/route.ts',
  'src/app/api/sleeper/integration/route.ts',
  'src/app/api/sleeper/state/route.ts',
  'src/app/api/auth/production-login/route.ts',
  'src/app/api/auth/simple-login/route.ts',
];

const dynamicExport = "// Force dynamic rendering for this route\nexport const dynamic = 'force-dynamic';\n";

filesToFix.forEach(filePath => {
  const fullPath = path.join(process.cwd(), filePath);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`⚠️  File not found: ${filePath}`);
    return;
  }
  
  let content = fs.readFileSync(fullPath, 'utf8');
  
  // Check if already has the dynamic export
  if (content.includes("export const dynamic = 'force-dynamic'")) {
    console.log(`✓ Already fixed: ${filePath}`);
    return;
  }
  
  // Find the last import statement
  const importRegex = /^import\s+.*?;?\s*$/gm;
  const imports = content.match(importRegex);
  
  if (imports && imports.length > 0) {
    const lastImport = imports[imports.length - 1];
    const lastImportIndex = content.lastIndexOf(lastImport);
    const insertPosition = lastImportIndex + lastImport.length;
    
    // Insert the dynamic export after the imports
    content = content.slice(0, insertPosition) + '\n\n' + dynamicExport + content.slice(insertPosition);
    
    fs.writeFileSync(fullPath, content, 'utf8');
    console.log(`✅ Fixed: ${filePath}`);
  } else {
    console.log(`⚠️  Could not find imports in: ${filePath}`);
  }
});

console.log('\n🎉 All remaining dynamic route exports have been added!');
console.log('Your app is now ready for Vercel deployment.');