const fs = require('fs');
const path = require('path');

function fixSyntaxInFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let originalContent = content;
    
    // Fix common patterns introduced by broken scripts
    
    // Fix missing closing braces in object literals (pattern: "property: value ,\n,")
    content = content.replace(/,\s*\n\s*,/g, ',');
    
    // Fix missing closing braces at end of interfaces/objects  (pattern: "}\n\n" should be "}\n")
    content = content.replace(/}\s*\n\s*$/g, '}');
    
    // Fix missing closing parentheses in function calls
    content = content.replace(/\{\s*error:\s*['"][^'"]*['"]\s*,\s*$/gm, (match) => {
      return match.replace(/,\s*$/, ' }');
    });
    
    // Fix incomplete object literals with trailing commas (pattern: "{ property: value ,")
    content = content.replace(/\{\s*([^}]*),\s*$/gm, '{ $1 }');
    
    // Fix incomplete returns and function calls
    content = content.replace(/return\s+NextResponse\.json\(\s*\{\s*success:\s*true\s*,\s*$/gm, 'return NextResponse.json({ success: true });');
    
    // Fix incomplete function definitions
    content = content.replace(/,\s*catch\s*\(/g, '  } catch (');
    content = content.replace(/,\s*;/g, '  }');
    
    // Fix missing closing braces for if statements
    content = content.replace(/if\s*\([^)]+\)\s*\{[^}]*$/gm, (match) => {
      if (!match.includes('}')) {
        return match + '\n  }';
      }
      return match;
    });
    
    // Fix missing closing parentheses
    content = content.replace(/\(\s*\{\s*error:\s*['"][^'"]*['"]\s*,\s*$/gm, '({ error: "Error message" })');
    
    // Fix malformed array/object endings
    content = content.replace(/,\s*\]\s*$/gm, ' ]');
    content = content.replace(/,\s*\}\s*$/gm, ' }');
    
    if (content !== originalContent) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ Fixed syntax in: ${filePath}`);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error(`❌ Error fixing ${filePath}:`, error.message);
    return false;
  }
}

function walkDirectory(dir, callback) {
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      walkDirectory(filePath, callback);
    } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
      callback(filePath);
    }
  }
}

console.log('🔄 Starting manual syntax fix...');

let fixedCount = 0;
const srcDir = path.join(__dirname, 'src');

walkDirectory(srcDir, (filePath) => {
  if (fixSyntaxInFile(filePath)) {
    fixedCount++;
  }
});

console.log(`✅ Manual syntax fix completed. Fixed ${fixedCount} files.`);