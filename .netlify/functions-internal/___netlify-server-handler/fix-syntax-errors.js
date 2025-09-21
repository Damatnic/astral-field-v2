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

// Function to fix syntax errors
function fixSyntaxErrors(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;
  
  // Fix missing closing parentheses for function calls
  const patterns = [
    // Missing closing parentheses in return statements
    {
      pattern: /return NextResponse\.json\(\s*\{\s*[^}]+\s*\},?\s*\{\s*status:\s*\d+\s*\}\s*$/gm,
      replacement: (match) => match + ')'
    },
    // Missing closing parentheses in response.cookies.set
    {
      pattern: /response\.cookies\.set\([^)]+\)\s*$/gm,
      replacement: (match) => match + ')'
    },
    // Missing closing parentheses in JSON responses
    {
      pattern: /NextResponse\.json\(\s*\{\s*[^}]+\s*\}\s*$/gm,
      replacement: (match) => match + ')'
    },
    // Missing closing parentheses in function calls with JSON
    {
      pattern: /await\s+request\.json\(\s*$/gm,
      replacement: (match) => match + ')'
    }
  ];
  
  // Apply each pattern
  for (const { pattern, replacement } of patterns) {
    if (pattern.test(content)) {
      content = content.replace(pattern, replacement);
      changed = true;
    }
  }
  
  // Fix specific missing parentheses issues
  const fixes = [
    // Fix missing ) in NextResponse.json calls
    [/NextResponse\.json\(\s*\{\s*[^}]+\s*\}\s*$(?!\))/gm, (match) => match + ')'],
    // Fix missing ) in response.cookies.set calls  
    [/response\.cookies\.set\([^)]+$(?!\))/gm, (match) => match + ')'],
    // Fix missing ) in await request.json calls
    [/await\s+request\.json\(\s*$(?!\))/gm, (match) => match + ')'],
    // Fix missing ) in function parameter lists
    [/\{\s*profileId\s*\}\s*=\s*await\s+request\.json\(\s*$/gm, (match) => match + ')'],
  ];
  
  for (const [pattern, replacer] of fixes) {
    if (pattern.test(content)) {
      content = content.replace(pattern, replacer);
      changed = true;
    }
  }
  
  // Manual fixes for specific patterns
  content = content.replace(/return NextResponse\.json\(\s*\{\s*success:\s*true\s*\}\s*$/gm, 'return NextResponse.json({ success: true })');
  content = content.replace(/return NextResponse\.json\(\s*\{\s*profiles\s*\}\s*$/gm, 'return NextResponse.json({ profiles })');
  content = content.replace(/return NextResponse\.json\(\s*\{\s*user:\s*session\.user\s*\}\s*$/gm, 'return NextResponse.json({ user: session.user })');
  content = content.replace(/body: JSON\.stringify\(\s*\{\s*profileId\s*\}\s*$/gm, 'body: JSON.stringify({ profileId })');
  
  if (changed) {
    fs.writeFileSync(filePath, content);
    console.log(`Fixed syntax in: ${filePath}`);
  }
}

// Main execution
const srcDir = path.join(__dirname, 'src');
const files = findTsFiles(srcDir);

console.log(`Checking ${files.length} TypeScript files for syntax errors`);

for (const file of files) {
  try {
    fixSyntaxErrors(file);
  } catch (error) {
    console.error(`Error fixing ${file}:`, error.message);
  }
}

console.log('Syntax error fixing complete!');