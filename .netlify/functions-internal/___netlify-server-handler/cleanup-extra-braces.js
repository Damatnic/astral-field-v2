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

// Function to clean up extra braces and syntax issues
function cleanupExtraBraces(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;
  const originalContent = content;
  
  // Remove standalone closing braces after comments or before imports
  content = content.replace(/\/\*\*?.*?\*\/\s*\n\s*\}\s*\n/gs, (match) => {
    return match.replace(/\s*\}\s*\n$/, '\n');
  });
  
  // Remove standalone closing braces before import statements
  content = content.replace(/\s*\}\s*\nimport\s/g, '\nimport ');
  
  // Remove standalone closing braces between lines
  content = content.replace(/^\s*\}\s*$/gm, '');
  
  // Fix broken object structures - remove extra closing braces in the middle of objects
  content = content.replace(/(\w+):\s*([^,\}]+),?\s*\}\s*([^}]*)\}/gm, (match, prop, value, rest) => {
    if (rest.trim()) {
      return `${prop}: ${value},\n${rest}}`;
    }
    return `${prop}: ${value}\n  }`;
  });
  
  // Remove extra closing braces after semicolons
  content = content.replace(/;\s*\}\s*$/gm, ';');
  
  // Remove multiple consecutive closing braces
  content = content.replace(/\}\s*\}\s*\}/g, '}');
  content = content.replace(/\}\s*\}/g, '}');
  
  // Fix logger calls with extra closing parentheses
  content = content.replace(/logger\.(info|error|warn|debug)\([^)]+\)\)/g, (match) => {
    return match.replace(/\)\)$/, ')');
  });
  
  // Fix catch blocks that are broken
  content = content.replace(/\}\s*catch\s*\(error\)\s*\{/g, '  } catch (error) {');
  
  // Fix broken return statements
  content = content.replace(/return\s+([^;]+);\s*\}/g, 'return $1;');
  
  // Fix missing semicolons before closing braces
  content = content.replace(/([^;])\s*\}\s*catch/g, '$1;\n  } catch');
  
  // Fix broken function parameters and calls
  content = content.replace(/await\s+([^(]+)\([^)]*\)\s*\}\s*$/gm, 'await $1()');
  
  // Fix setTimeout calls
  content = content.replace(/setTimeout\([^,]+,\s*\d+\s*\}\s*$/gm, (match) => {
    return match.replace(/\s*\}\s*$/, ')');
  });
  
  // Remove empty lines with just braces
  content = content.replace(/^\s*\{\s*$/gm, '');
  content = content.replace(/^\s*\}\s*$/gm, '');
  
  if (content !== originalContent) {
    changed = true;
    fs.writeFileSync(filePath, content);
    console.log(`Cleaned up extra braces in: ${filePath}`);
  }
}

// Main execution
const srcDir = path.join(__dirname, 'src');
const files = findTsFiles(srcDir);

console.log(`Cleaning up extra braces in ${files.length} TypeScript files`);

for (const file of files) {
  try {
    cleanupExtraBraces(file);
  } catch (error) {
    console.error(`Error cleaning ${file}:`, error.message);
  }
}

console.log('Extra braces cleanup complete!');