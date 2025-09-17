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

// Function to fix final syntax errors
function fixFinalSyntaxErrors(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;
  
  // Fix missing closing parentheses in validation calls
  content = content.replace(
    /await validateSecureRequest\(\s*request,\s*[^,]+,\s*\{[^}]*\}\s*$/gm,
    (match) => match + ');\n'
  );
  
  // Fix incomplete function calls with missing parentheses
  content = content.replace(
    /\{\s*maxSize:\s*[^,]+,\s*allowedMethods:\s*\[[^\]]*\]\s*\}\s*$/gm,
    (match) => match + ');\n'
  );
  
  // Fix incomplete NextResponse.json calls
  content = content.replace(
    /return NextResponse\.json\(\s*\{\s*error:\s*[^}]+\s*\},\s*\{\s*status:\s*[^}]+\s*\}\s*$/gm,
    (match) => match + ');\n'
  );
  
  // Fix missing closing parentheses and semicolons in object returns
  content = content.replace(
    /\{\s*[^}]+\s*\}\s*\}\);$/gm,
    (match) => {
      // Count opening and closing braces to balance them
      const openBraces = (match.match(/\{/g) || []).length;
      const closeBraces = (match.match(/\}/g) || []).length;
      if (openBraces > closeBraces) {
        return match.replace(/\}\);$/, '});\n');
      }
      return match;
    }
  );
  
  // Fix specific patterns found in the error logs
  const specificFixes = [
    // Fix validateSecureRequest calls
    [
      /await validateSecureRequest\(\s*request,\s*([^,]+),\s*\{\s*maxSize:\s*([^,]+),\s*allowedMethods:\s*(\[[^\]]*\])\s*\}\s*$/gm,
      'await validateSecureRequest(\n      request,\n      $1,\n      {\n        maxSize: $2,\n        allowedMethods: $3\n      }\n    );'
    ],
    
    // Fix incomplete if statements after validation
    [
      /\}\s*if \(!validation\.success\)/gm,
      ');\n\n    if (!validation.success)'
    ],
    
    // Fix incomplete return statements
    [
      /return NextResponse\.json\(\s*\{\s*error:\s*validation\.error\s*\},\s*\{\s*status:\s*validation\.status \|\| 400\s*\}\s*$/gm,
      'return NextResponse.json(\n        { error: validation.error },\n        { status: validation.status || 400 }\n      );'
    ],
    
    // Fix object trailing commas and closing braces
    [
      /(\w+):\s*([^,\}]+)\s*\}\)\s*\}\);/gm,
      '$1: $2\n      }\n    });'
    ],
    
    // Fix return statements with objects missing proper closing
    [
      /return NextResponse\.json\(\s*\{([^}]+)\}\s*\}\);/gm,
      'return NextResponse.json({\n      $1\n    });'
    ]
  ];
  
  for (const [pattern, replacement] of specificFixes) {
    if (pattern.test(content)) {
      content = content.replace(pattern, replacement);
      changed = true;
    }
  }
  
  // Manual specific file fixes based on error messages
  if (filePath.includes('admin/cache/route.ts')) {
    content = content.replace(
      /allowedMethods:\s*\['POST'\]\s*\}\s*if\s*\(!validation\.success\)/gm,
      "allowedMethods: ['POST']\n      }\n    );\n\n    if (!validation.success)"
    );
  }
  
  if (filePath.includes('admin/jobs/dashboard/route.ts')) {
    content = content.replace(
      /timeRange\s*\}\)\s*\}\);/gm,
      'timeRange\n          }\n        });'
    );
  }
  
  if (filePath.includes('admin/jobs/route.ts')) {
    content = content.replace(
      /enabled:\s*scheduledJobs\.filter\([^)]+\)\.length\s*\}\)\s*\}\);/gm,
      'enabled: scheduledJobs.filter(job => job.enabled).length\n          }\n        });'
    );
  }
  
  if (filePath.includes('admin/performance/route.ts')) {
    content = content.replace(
      /success:\s*true\s*\}\);/gm,
      'success: true\n  });\n'
    );
  }
  
  if (filePath.includes('ai/lineup-optimize/route.ts')) {
    content = content.replace(
      /version:\s*'2\.1'\s*\}\)\s*\}\);/gm,
      "version: '2.1'\n      }\n    });"
    );
  }
  
  if (changed) {
    fs.writeFileSync(filePath, content);
    console.log(`Fixed final syntax in: ${filePath}`);
  }
}

// Main execution
const srcDir = path.join(__dirname, 'src');
const files = findTsFiles(srcDir);

console.log(`Checking ${files.length} TypeScript files for final syntax errors`);

for (const file of files) {
  try {
    fixFinalSyntaxErrors(file);
  } catch (error) {
    console.error(`Error fixing ${file}:`, error.message);
  }
}

console.log('Final syntax error fixing complete!');