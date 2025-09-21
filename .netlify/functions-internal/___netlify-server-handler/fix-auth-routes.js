const fs = require('fs');
const path = require('path');

// Function to recursively find all TypeScript files
function findTsFiles(dir, files = []) {
  const items = fs.readdirSync(dir);
  
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      findTsFiles(fullPath, files);
    } else if (item.endsWith('.ts') || item.endsWith('.tsx')) {
      files.push(fullPath);
    }
  }
  
  return files;
}

// Function to fix a file
function fixFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;
  
  // Fix withApiAuthRequired exports
  const withApiRegex = /export const (GET|POST|PUT|DELETE|PATCH) = withApiAuthRequired\(async function \w+\(request: NextRequest\)/g;
  if (withApiRegex.test(content)) {
    content = content.replace(withApiRegex, (match, method) => {
      changed = true;
      return `export async function ${method}(request: NextRequest)`;
    });
  }
  
  // Remove trailing parentheses from withApiAuthRequired
  const trailingParenRegex = /(\s+}\s*)\)\s*$/gm;
  if (trailingParenRegex.test(content)) {
    content = content.replace(trailingParenRegex, '$1');
    changed = true;
  }
  
  // Remove unused withApiAuthRequired imports
  if (content.includes('withApiAuthRequired') && !content.includes('withApiAuthRequired(')) {
    content = content.replace(/,\s*withApiAuthRequired/g, '');
    content = content.replace(/withApiAuthRequired,\s*/g, '');
    content = content.replace(/{\s*withApiAuthRequired\s*}/g, '{}');
    changed = true;
  }
  
  if (changed) {
    fs.writeFileSync(filePath, content);
    console.log(`Fixed: ${filePath}`);
  }
}

// Main execution
const srcDir = path.join(__dirname, 'src');
const files = findTsFiles(srcDir);

console.log(`Found ${files.length} TypeScript files`);

for (const file of files) {
  try {
    fixFile(file);
  } catch (error) {
    console.error(`Error fixing ${file}:`, error.message);
  }
}

console.log('Auth route fixing complete!');