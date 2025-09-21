const fs = require('fs');
const path = require('path');

// Function to fix specific object structure issues
function fixObjectStructure(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;
  
  // Fix incomplete objects missing closing braces before return statements
  content = content.replace(
    /(\w+):\s*([^,\}]+)\s*\n\s*\}\);/gm,
    '$1: $2\n          }\n        });'
  );
  
  // Fix standalone closing parentheses
  content = content.replace(
    /^\s*\)\s*$/gm,
    ''
  );
  
  // Fix missing closing braces in objects
  content = content.replace(
    /timestamp:\s*new Date\(\)\.toISOString\(\)\s*\n\s*\}\);/gm,
    'timestamp: new Date().toISOString()\n          }\n        });'
  );
  
  // Fix version object structure
  content = content.replace(
    /version:\s*'2\.1'\s*\n\s*\n\s*\n\s*\}\);/gm,
    "version: '2.1'\n      }\n    });"
  );
  
  // Fix specific broken objects
  const specificFiles = [
    { 
      file: 'admin/jobs/dashboard/route.ts',
      fixes: [
        [
          /timestamp:\s*new Date\(\)\.toISOString\(\)\s*\n\s*\}\);/gm,
          'timestamp: new Date().toISOString()\n          }\n        });'
        ]
      ]
    },
    {
      file: 'admin/jobs/route.ts', 
      fixes: [
        [
          /timestamp:\s*new Date\(\)\.toISOString\(\)\s*\n\s*\}\);/gm,
          'timestamp: new Date().toISOString()\n          }\n        });'
        ]
      ]
    },
    {
      file: 'admin/performance/route.ts',
      fixes: [
        [
          /success:\s*true\s*\n\s*\}\);/gm,
          'success: true\n  });\n'
        ]
      ]
    },
    {
      file: 'ai/lineup-optimize/route.ts',
      fixes: [
        [
          /version:\s*'2\.1'\s*\n\s*\n\s*\n\s*\}\);/gm,
          "version: '2.1'\n      }\n    });"
        ]
      ]
    },
    {
      file: 'ai/review/route.ts',
      fixes: [
        [
          /\{ status: 501 \}\);\s*\n\s*\)\s*\}/gm,
          '{ status: 501 });\n    }'
        ]
      ]
    }
  ];
  
  for (const { file, fixes } of specificFiles) {
    if (filePath.includes(file)) {
      for (const [pattern, replacement] of fixes) {
        if (pattern.test(content)) {
          content = content.replace(pattern, replacement);
          changed = true;
        }
      }
    }
  }
  
  if (changed) {
    fs.writeFileSync(filePath, content);
    console.log(`Fixed object structure in: ${filePath}`);
  }
}

// Get files from the error list
const errorFiles = [
  'src/app/api/admin/jobs/dashboard/route.ts',
  'src/app/api/admin/jobs/route.ts', 
  'src/app/api/admin/performance/route.ts',
  'src/app/api/ai/lineup-optimize/route.ts',
  'src/app/api/ai/review/route.ts'
];

console.log('Fixing object structure issues...');

for (const file of errorFiles) {
  const fullPath = path.join(__dirname, file);
  try {
    if (fs.existsSync(fullPath)) {
      fixObjectStructure(fullPath);
    }
  } catch (error) {
    console.error(`Error fixing ${file}:`, error.message);
  }
}

console.log('Object structure fixing complete!');