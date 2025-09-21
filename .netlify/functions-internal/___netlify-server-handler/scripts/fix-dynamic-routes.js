const fs = require('fs');
const path = require('path');

// List of files that need the dynamic export
const filesToFix = [
  'src/app/api/draft/[id]/pick/route.ts',
  'src/app/api/notifications/preferences/route.ts',
  'src/app/api/trades/league/[leagueId]/route.ts',
  'src/app/api/trades/[id]/analyze/route.ts',
  'src/app/api/trades/[id]/respond/route.ts',
  'src/app/api/trades/create/route.ts',
  'src/app/api/teams/[id]/lineup/route.ts',
  'src/app/api/waivers/claims/route.ts',
  'src/app/api/leagues/route.ts',
  'src/app/api/players/route.ts',
  'src/app/api/teams/[id]/route.ts',
  'src/app/api/leagues/[id]/route.ts',
  'src/app/api/waivers/process/route.ts',
  'src/app/api/commissioner/route.ts',
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

console.log('\n🎉 All dynamic route exports have been added!');
console.log('Your app should now build successfully on Vercel.');