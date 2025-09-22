const fs = require('fs');
const path = require('path');

// Routes that should remain static (health checks, etc.)
const staticRoutes = [
  'src/app/api/health/route.ts',
  'src/app/api/test-simple/route.ts',
  'src/app/api/robots/route.ts',
  'src/app/api/sitemap/route.ts',
  'src/app/api/docs/route.ts'
];

function addDynamicExport(filePath) {
  if (staticRoutes.includes(filePath.replace(/\\/g, '/'))) {
    console.log(`Skipping static route: ${filePath}`);
    return;
  }

  try {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Check if dynamic export already exists
    if (content.includes('export const dynamic')) {
      console.log(`Already has dynamic export: ${filePath}`);
      return;
    }
    
    // Fix request.url patterns to use NextRequest
    if (content.includes('request: Request') && content.includes('request.url')) {
      content = content.replace(/import { NextResponse }/g, 'import { NextRequest, NextResponse }');
      content = content.replace(/request: Request/g, 'request: NextRequest');
      content = content.replace(/new URL\(request\.url\)/g, 'request.nextUrl');
      content = content.replace(/const \{ searchParams \} = new URL\(request\.url\)/g, 'const searchParams = request.nextUrl.searchParams');
    }
    
    // Add dynamic export after imports
    const lines = content.split('\n');
    let insertIndex = 0;
    
    // Find the last import statement
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].startsWith('import ') || lines[i].startsWith('export ')) {
        insertIndex = i + 1;
      } else if (lines[i].trim() === '') {
        continue;
      } else {
        break;
      }
    }
    
    // Insert dynamic export
    lines.splice(insertIndex, 0, '', 'export const dynamic = \'force-dynamic\';');
    
    fs.writeFileSync(filePath, lines.join('\n'));
    console.log(`Fixed: ${filePath}`);
    
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error.message);
  }
}

// Find all route.ts files
function findApiRoutes(dir) {
  const files = [];
  
  function traverse(currentDir) {
    const entries = fs.readdirSync(currentDir);
    
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        traverse(fullPath);
      } else if (entry === 'route.ts') {
        files.push(fullPath);
      }
    }
  }
  
  traverse(dir);
  return files;
}

// Main execution
const apiDir = path.join(__dirname, 'src', 'app', 'api');
const routeFiles = findApiRoutes(apiDir);

console.log(`Found ${routeFiles.length} API route files`);

routeFiles.forEach(addDynamicExport);

console.log('Finished processing API routes');