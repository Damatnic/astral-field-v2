const fs = require('fs');
const path = require('path');

function targetedFix(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let originalContent = content;
    
    // Fix specific patterns I can see in the agent files
    
    // Fix missing closing braces in interfaces
    content = content.replace(/export interface UserProfile \{[\s\S]*?avatar\?\: string\s*\n\s*\n/g, (match) => {
      if (!match.includes('}')) {
        return match.trim() + '\n}\n\n';
      }
      return match;
    });
    
    // Fix missing commas in array elements and missing closing braces
    content = content.replace(/avatar: '([^']+)'\s+\}\s*$/gm, "avatar: '$1' },");
    
    // Fix function declarations with missing opening braces
    content = content.replace(/export async function (\w+)\([^)]*\)\s*\{\s*try\s*\{/g, 'export async function $1($2) {\n  try {');
    
    // Fix class constructors with missing opening braces
    content = content.replace(/export class (\w+) extends BaseAgent \{\s*constructor\(\)\s*\{/g, 'export class $1 extends BaseAgent {\n  constructor() {');
    
    // Fix missing closing braces in try-catch blocks
    content = content.replace(/\}\s*catch\s*\(/g, '  } catch (');
    
    // Fix incomplete object literals in return statements
    content = content.replace(/return this\.createResult\(([^,]+),\s*([^,]+),\s*\{([^}]*)\s*$/gm, 'return this.createResult($1, $2, { $3 });');
    
    // Fix missing closing braces for functions
    content = content.replace(/\s+\}\s*catch\s*\(/g, '\n    } catch (');
    
    // Fix incomplete where clauses
    content = content.replace(/where:\s*\{\s*id:\s*leagueId\s*\n/g, 'where: { id: leagueId },\n');
    content = content.replace(/where:\s*\{\s*leagueId\s*\n/g, 'where: { leagueId },\n');
    
    // Fix missing closing parentheses and braces in function calls
    content = content.replace(/\.findUnique\(\{\s*where:\s*\{\s*([^}]+)\s*\n/g, '.findUnique({\n          where: { $1 },');
    content = content.replace(/\.findMany\(\{\s*where:\s*\{\s*([^}]+)\s*\n/g, '.findMany({\n          where: { $1 },');
    
    // Fix incomplete object property definitions
    content = content.replace(/([a-zA-Z_]\w*:\s*[^,}\n]+)\s*\}\s*$/gm, '$1\n          }');
    
    if (content !== originalContent) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ Applied targeted fix to: ${filePath}`);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error(`❌ Error in targeted fix for ${filePath}:`, error.message);
    return false;
  }
}

// Focus on the most problematic files first
const problemFiles = [
  'src/lib/auth.ts',
  'src/agents/verifier.ts',
  'src/agents/seeding.ts',
  'src/agents/notifier.ts',
  'src/agents/league.ts',
  'src/agents/fallback.ts'
];

let fixedCount = 0;

for (const file of problemFiles) {
  const fullPath = path.join(__dirname, file);
  if (fs.existsSync(fullPath)) {
    if (targetedFix(fullPath)) {
      fixedCount++;
    }
  }
}

console.log(`✅ Targeted fix completed. Fixed ${fixedCount} high-priority files.`);