const fs = require('fs');
const path = require('path');

console.log('🔧 Fixing getServerSession imports...\n');

const filesToFix = [
  'src/app/api/dashboard/route.ts',
  'src/app/api/leagues/[id]/route.ts', 
  'src/app/api/my-team/route.ts',
  'src/app/api/roster/route.ts',
  'src/app/api/trades/route.ts'
];

filesToFix.forEach(file => {
  try {
    const filePath = path.join(process.cwd(), file);
    if (fs.existsSync(filePath)) {
      let content = fs.readFileSync(filePath, 'utf8');
      
      // Replace the import
      content = content.replace(
        "import { getServerSession } from 'next-auth/next';",
        "import { getServerSession } from 'next-auth';"
      );
      
      fs.writeFileSync(filePath, content);
      console.log(`✅ Fixed import in ${file}`);
    }
  } catch (error) {
    console.log(`⚠️ Could not fix ${file}: ${error.message}`);
  }
});

console.log('\n✅ All auth imports fixed!');