/**
 * Script to comment out all non-existent Sleeper table references
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// List of non-existent Sleeper tables
const nonExistentTables = [
  'sleeperDraft',
  'sleeperDraftPick',
  'sleeperTradingBlock',
  'sleeperLeague',
  'sleeperUser',
  'sleeperRoster',
  'sleeperMatchup',
  'sleeperTransaction',
  'sleeperPlayer',
  'sleeperNFLState',
  'sleeperSyncLog',
  'sleeperPlayerStat',
  'sleeperPlayerProjection',
  'sleeperScoringUpdate',
  'sleeperDraftPickTrade',
  'sleeperPendingTrade',
  'sleeperTransactionAnalytics',
  'sleeperDraftStrategy',
  'rosterPlayer',
  'playerStat',
  'settings'
];

// Files to process
const sleeperServiceFiles = [
  'src/lib/sleeper/services/drafts.ts',
  'src/lib/sleeper/services/leagues.ts',
  'src/lib/sleeper/services/players.ts',
  'src/lib/sleeper/services/stats.ts',
  'src/lib/sleeper/services/transactions.ts'
];

function commentOutSleeperReferences(filePath) {
  console.log(`Processing ${filePath}...`);
  
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  
  // For each non-existent table
  nonExistentTables.forEach(table => {
    const regex = new RegExp(`(\\s*)(await\\s+)?prisma\\.${table}\\.(\\w+)\\(`, 'gm');
    
    if (content.match(regex)) {
      console.log(`  Found references to ${table}`);
      
      // Find all function calls that use this table
      const functionRegex = new RegExp(
        `(^.*prisma\\.${table}\\.[\\w]+\\([\\s\\S]*?^\\s*\\}\\);)`,
        'gm'
      );
      
      // Comment out the entire function call
      content = content.replace(functionRegex, (match) => {
        // Check if already commented
        if (match.includes('// TODO:') || match.includes('/*')) {
          return match;
        }
        
        const lines = match.split('\\n');
        const commentedLines = [
          '    // TODO: Implement when Sleeper tables are added to schema',
          `    console.warn('${table} table not yet implemented');`,
          '    return;',
          '    /*',
          ...lines,
          '    */'
        ];
        
        modified = true;
        return commentedLines.join('\\n');
      });
    }
  });
  
  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`  Modified ${filePath}`);
  } else {
    console.log(`  No changes needed for ${filePath}`);
  }
}

// Process all Sleeper service files
console.log('Fixing Sleeper table references...');
sleeperServiceFiles.forEach(file => {
  const fullPath = path.join(process.cwd(), file);
  if (fs.existsSync(fullPath)) {
    commentOutSleeperReferences(fullPath);
  } else {
    console.log(`File not found: ${fullPath}`);
  }
});

console.log('Done!');