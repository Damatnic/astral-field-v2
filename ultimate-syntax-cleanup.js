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

// Function to fix all remaining syntax issues
function ultimateSyntaxCleanup(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;
  const originalContent = content;
  
  // 1. Fix duplicate closing parentheses
  content = content.replace(/\)\s*\)\s*;/g, ');');
  content = content.replace(/\)\s*\);/g, ')');
  
  // 2. Fix incomplete object structures - missing closing braces
  content = content.replace(/(\w+):\s*([^,\}]+)\s*\n\s*\}\);/gm, '$1: $2\n          }\n        });');
  
  // 3. Fix missing semicolons in array map functions
  content = content.replace(/\}\);$/gm, '}));');
  content = content.replace(/\}\)\);/g, '}));');
  
  // 4. Fix standalone closing parentheses on their own lines
  content = content.replace(/^\s*\)\s*$/gm, '');
  
  // 5. Clean up malformed return statements
  content = content.replace(/return NextResponse\.json\(\s*\{[^}]+\},\s*\{[^}]+\}\s*\)\s*\)\s*;/gm, 
    (match) => match.replace(/\)\s*\)\s*;/, ');'));
  
  // 6. Fix specific object closing issues
  content = content.replace(/timestamp:\s*new Date\(\)\.toISOString\(\)\s*\n\s*\}\);/gm,
    'timestamp: new Date().toISOString()\n          }\n        });');
  
  // 7. Fix count/level object issues
  content = content.replace(/count:\s*1\s*\}\);/gm, 'count: 1\n    }));');
  
  // 8. Fix validation return statements
  content = content.replace(/\{\s*status:\s*validation\.status \|\| 400\s*\}\s*\)\s*\)\s*;/gm,
    '{ status: validation.status || 400 }\n      );');
  
  // 9. Remove extra closing parentheses after semicolons
  content = content.replace(/;\s*\)\s*$/gm, ';');
  
  // 10. Fix missing closing braces in data objects
  content = content.replace(/(\w+):\s*([^,\}]+)\s*$/gm, (match, prop, value) => {
    if (!value.includes('}')) {
      return `${prop}: ${value}\n          }`;
    }
    return match;
  });
  
  // Manual specific fixes based on the error messages
  const specificFixes = [
    // Fix the alerts issue in dashboard
    [/alerts,\s*timestamp:\s*new Date\(\)\.toISOString\(\)\s*\n\s*\}\);/gm,
     'alerts,\n            timestamp: new Date().toISOString()\n          }\n        });'],
    
    // Fix the scheduledJobs filter issue
    [/enabled:\s*scheduledJobs\.filter\([^)]+\)\.length\s*\n\s*\n\s*\}\);/gm,
     'enabled: scheduledJobs.filter(job => job.enabled).length\n          }\n        });'],
    
    // Fix the error count issue
    [/count:\s*1\s*\}\);/gm,
     'count: 1\n    }));'],
    
    // Fix the validation return pattern
    [/\{\s*status:\s*validation\.status \|\| 400\s*\}\s*\)\s*\)\s*;/gm,
     '{ status: validation.status || 400 }\n      );'],
  ];
  
  for (const [pattern, replacement] of specificFixes) {
    if (pattern.test(content)) {
      content = content.replace(pattern, replacement);
      changed = true;
    }
  }
  
  // Check if content actually changed
  if (content !== originalContent) {
    changed = true;
  }
  
  if (changed) {
    fs.writeFileSync(filePath, content);
    console.log(`Ultimate syntax cleanup applied to: ${filePath}`);
  }
}

// Main execution
const srcDir = path.join(__dirname, 'src');
const files = findTsFiles(srcDir);

console.log(`Applying ultimate syntax cleanup to ${files.length} TypeScript files`);

for (const file of files) {
  try {
    ultimateSyntaxCleanup(file);
  } catch (error) {
    console.error(`Error cleaning ${file}:`, error.message);
  }
}

console.log('Ultimate syntax cleanup complete!');