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

// Function to fix comprehensive syntax errors
function fixComprehensiveSyntaxErrors(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;
  
  // Fix missing closing parentheses in fetch calls
  content = content.replace(
    /await fetch\([^}]+\}\s*$/gm,
    (match) => match + ')'
  );
  
  // Fix missing closing parentheses in function calls
  content = content.replace(
    /await fetch\(['"][^'"]+['"],\s*\{\s*method:\s*['"][^'"]+['"]\s*$/gm,
    (match) => match + ' })'
  );
  
  // Fix missing opening brace in socket creation
  content = content.replace(
    /\}\s*\/\/ Enhanced connection monitoring\s*socket\.on/gm,
    '});\n      \n      // Enhanced connection monitoring\n      socket.on'
  );
  
  // Fix missing parenthesis after status in NextResponse.json
  content = content.replace(
    /NextResponse\.json\(\s*\{\s*[^}]+\s*\},\s*\{\s*status:\s*\d+\s*\}\)\s*$/gm,
    (match) => match.replace(/\}\)\s*$/, '})')
  );
  
  // Fix double closing parentheses issues
  content = content.replace(
    /NextResponse\.json\(\s*\{[^}]+\},\s*\{\s*status:\s*\d+\s*\}\)\s*\)\s*;/gm,
    (match) => match.replace(/\)\s*\)\s*;/, ');')
  );
  
  // Fix trailing semicolon issues after closing parentheses
  content = content.replace(
    /\}\)\s*\)\s*;/gm,
    '});'
  );
  
  // Fix specific patterns for return statements
  content = content.replace(
    /return NextResponse\.json\(\s*\{[^}]+\},\s*\{\s*status:\s*\d+\s*\}\)\s*\)\s*;/gm,
    (match) => match.replace(/\)\s*\)\s*;/, ');')
  );
  
  // Manual specific fixes for the errors found
  const fixes = [
    // Fix AuthProvider.tsx logout function
    [
      /await fetch\('\/api\/auth\/logout',\s*\{\s*method:\s*'POST'\s*$/gm,
      "await fetch('/api/auth/logout', { method: 'POST' })"
    ],
    
    // Fix socket client connection monitoring  
    [
      /\}\s*\/\/ Enhanced connection monitoring\s*socket\.on\('connect'/gm,
      '});\n      \n      // Enhanced connection monitoring\n      socket.on(\'connect\''
    ],
    
    // Fix NextResponse.json with status - remove extra closing parenthesis
    [
      /return NextResponse\.json\(\s*\{\s*error:\s*['"][^'"]*['"]\s*\},\s*\{\s*status:\s*403\s*\}\)\s*\)\s*;/gm,
      (match) => {
        const content = match.match(/return NextResponse\.json\(\s*(\{[^}]+\}),\s*(\{[^}]+\})\)/);
        if (content) {
          return `return NextResponse.json(${content[1]}, ${content[2]});`;
        }
        return match.replace(/\)\s*\)\s*;/, ');');
      }
    ],
    
    // Fix jobs dashboard metrics timestamp issue
    [
      /timestamp:\s*new Date\(\)\.toISOString\(\)\s*\}\)\s*\}\);/gm,
      'timestamp: new Date().toISOString()\n          }\n        });'
    ]
  ];
  
  for (const [pattern, replacement] of fixes) {
    if (pattern.test(content)) {
      content = content.replace(pattern, replacement);
      changed = true;
    }
  }
  
  // Additional specific file fixes
  if (filePath.includes('AuthProvider.tsx')) {
    // Fix the specific logout function issue
    content = content.replace(
      /await fetch\('\/api\/auth\/logout',\s*\{\s*method:\s*'POST'\s*setUser\(null\)/gm,
      "await fetch('/api/auth/logout', { method: 'POST' });\n      setUser(null)"
    );
  }
  
  if (filePath.includes('socket/client.ts')) {
    // Fix socket connection monitoring
    content = content.replace(
      /withCredentials:\s*true,\s*\}\s*\/\/ Enhanced connection monitoring\s*socket\.on/gm,
      'withCredentials: true,\n      });\n      \n      // Enhanced connection monitoring\n      socket.on'
    );
  }
  
  if (filePath.includes('admin/jobs/dashboard/route.ts')) {
    // Fix the metrics object structure
    content = content.replace(
      /timestamp:\s*new Date\(\)\.toISOString\(\)\s*\}\)\s*\}\);/gm,
      'timestamp: new Date().toISOString()\n          }\n        });'
    );
  }
  
  if (changed || content !== fs.readFileSync(filePath, 'utf8')) {
    fs.writeFileSync(filePath, content);
    console.log(`Fixed comprehensive syntax in: ${filePath}`);
  }
}

// Main execution
const srcDir = path.join(__dirname, 'src');
const files = findTsFiles(srcDir);

console.log(`Checking ${files.length} TypeScript files for comprehensive syntax errors`);

for (const file of files) {
  try {
    fixComprehensiveSyntaxErrors(file);
  } catch (error) {
    console.error(`Error fixing ${file}:`, error.message);
  }
}

console.log('Comprehensive syntax error fixing complete!');