#!/usr/bin/env node
import { promises as fs } from 'fs';
import path from 'path';
import { glob } from 'glob';

// jQuery to Vanilla JavaScript converter
class JQueryRemover {
  private replacements = new Map<string, string>();
  private fileBackups = new Map<string, string>();
  private safeMode = true;
  private dryRun = true;
  
  constructor(options = { safeMode: true, dryRun: true }) {
    this.safeMode = options.safeMode;
    this.dryRun = options.dryRun;
    this.initializeReplacements();
  }

  private initializeReplacements(): void {
    // DOM Selection replacements
    this.replacements.set(
      /\$\(['"]#([^'"]+)['"]\)/g,
      "document.getElementById('$1')"
    );
    
    this.replacements.set(
      /\$\(['"]\.([^'"]+)['"]\)/g,
      "document.querySelectorAll('.$1')"
    );
    
    this.replacements.set(
      /\$\(document\)/g,
      "document"
    );
    
    this.replacements.set(
      /\$\(window\)/g,
      "window"
    );
    
    this.replacements.set(
      /\$\(this\)/g,
      "this"
    );

    // Event handlers
    this.replacements.set(
      /\.click\(function/g,
      ".addEventListener('click', function"
    );
    
    this.replacements.set(
      /\.on\(['"]click['"],\s*function/g,
      ".addEventListener('click', function"
    );
    
    this.replacements.set(
      /\.ready\(function/g,
      ".addEventListener('DOMContentLoaded', function"
    );

    // DOM Manipulation
    this.replacements.set(
      /\.html\(['"]([^'"]*)['"]\)/g,
      ".innerHTML = '$1'"
    );
    
    this.replacements.set(
      /\.text\(['"]([^'"]*)['"]\)/g,
      ".textContent = '$1'"
    );
    
    this.replacements.set(
      /\.val\(\)/g,
      ".value"
    );
    
    this.replacements.set(
      /\.val\(['"]([^'"]*)['"]\)/g,
      ".value = '$1'"
    );

    // Display methods
    this.replacements.set(
      /\.hide\(\)/g,
      ".style.display = 'none'"
    );
    
    this.replacements.set(
      /\.show\(\)/g,
      ".style.display = 'block'"
    );
    
    this.replacements.set(
      /\.toggle\(\)/g,
      ".style.display = this.style.display === 'none' ? 'block' : 'none'"
    );

    // Class manipulation
    this.replacements.set(
      /\.addClass\(['"]([^'"]+)['"]\)/g,
      ".classList.add('$1')"
    );
    
    this.replacements.set(
      /\.removeClass\(['"]([^'"]+)['"]\)/g,
      ".classList.remove('$1')"
    );
    
    this.replacements.set(
      /\.toggleClass\(['"]([^'"]+)['"]\)/g,
      ".classList.toggle('$1')"
    );
    
    this.replacements.set(
      /\.hasClass\(['"]([^'"]+)['"]\)/g,
      ".classList.contains('$1')"
    );

    // AJAX replacements
    this.replacements.set(
      /\$\.ajax\({/g,
      "fetch('', {"
    );
    
    this.replacements.set(
      /\$\.get\(['"]([^'"]+)['"],/g,
      "fetch('$1').then(response => response.text()).then("
    );
    
    this.replacements.set(
      /\$\.post\(['"]([^'"]+)['"],/g,
      "fetch('$1', { method: 'POST', body: JSON.stringify("
    );

    // Attribute manipulation
    this.replacements.set(
      /\.attr\(['"]([^'"]+)['"]\)/g,
      ".getAttribute('$1')"
    );
    
    this.replacements.set(
      /\.attr\(['"]([^'"]+)['"],\s*['"]([^'"]+)['"]\)/g,
      ".setAttribute('$1', '$2')"
    );
    
    this.replacements.set(
      /\.prop\(['"]([^'"]+)['"]\)/g,
      ".$1"
    );

    // Effects (simplified)
    this.replacements.set(
      /\.fadeIn\(\)/g,
      ".style.opacity = '1'"
    );
    
    this.replacements.set(
      /\.fadeOut\(\)/g,
      ".style.opacity = '0'"
    );
    
    this.replacements.set(
      /\.slideUp\(\)/g,
      ".style.height = '0'"
    );
    
    this.replacements.set(
      /\.slideDown\(\)/g,
      ".style.height = 'auto'"
    );

    // Utility functions
    this.replacements.set(
      /\$\.each\(/g,
      "Array.prototype.forEach.call("
    );
    
    this.replacements.set(
      /\$\.map\(/g,
      "Array.prototype.map.call("
    );
    
    this.replacements.set(
      /\$\.extend\(/g,
      "Object.assign("
    );
    
    this.replacements.set(
      /\$\.isArray\(/g,
      "Array.isArray("
    );
  }

  public async analyzeFile(filePath: string): Promise<{hasJQuery: boolean; matches: string[]}> {
    const content = await fs.readFile(filePath, 'utf-8');
    const matches: string[] = [];
    
    // Check for jQuery patterns
    const jQueryPatterns = [
      /\$\(/g,
      /jQuery\(/g,
      /\$\./g,
      /jQuery\./g
    ];
    
    for (const pattern of jQueryPatterns) {
      const found = content.match(pattern);
      if (found) {
        matches.push(...found);
      }
    }
    
    return {
      hasJQuery: matches.length > 0,
      matches: [...new Set(matches)]
    };
  }

  public async convertFile(filePath: string): Promise<{success: boolean; changes: number}> {
    if (this.safeMode && !this.dryRun) {
      // Create backup
      const backupPath = filePath + '.jquery-backup';
      const content = await fs.readFile(filePath, 'utf-8');
      await fs.writeFile(backupPath, content, 'utf-8');
      this.fileBackups.set(filePath, backupPath);
    }
    
    let content = await fs.readFile(filePath, 'utf-8');
    let changes = 0;
    
    // Apply replacements
    for (const [pattern, replacement] of this.replacements) {
      const regex = pattern instanceof RegExp ? pattern : new RegExp(pattern, 'g');
      const matches = content.match(regex);
      if (matches) {
        changes += matches.length;
        if (!this.dryRun) {
          content = content.replace(regex, replacement as string);
        }
      }
    }
    
    // Remove jQuery imports/includes
    content = content.replace(/import.*jquery.*/gi, '');
    content = content.replace(/const.*\$.*=.*require.*jquery.*/gi, '');
    content = content.replace(/<script.*jquery.*<\/script>/gi, '');
    
    if (!this.dryRun && changes > 0) {
      await fs.writeFile(filePath, content, 'utf-8');
    }
    
    return { success: true, changes };
  }

  public async scanProject(directory: string): Promise<void> {
    console.log('\n🔍 JQUERY REMOVAL ANALYSIS\n');
    console.log('─'.repeat(60));
    
    const files = await glob(path.join(directory, '**/*.{js,jsx,ts,tsx,html}'), {
      ignore: ['**/node_modules/**', '**/dist/**', '**/build/**', '**/*.min.js']
    });
    
    const results = {
      totalFiles: files.length,
      filesWithJQuery: 0,
      totalMatches: 0,
      filesList: [] as string[]
    };
    
    for (const file of files) {
      const analysis = await this.analyzeFile(file);
      if (analysis.hasJQuery) {
        results.filesWithJQuery++;
        results.totalMatches += analysis.matches.length;
        results.filesList.push(path.relative(directory, file));
      }
    }
    
    console.log(`Total files scanned:   ${results.totalFiles}`);
    console.log(`Files with jQuery:     ${results.filesWithJQuery}`);
    console.log(`Total jQuery calls:    ${results.totalMatches}`);
    
    if (results.filesWithJQuery > 0) {
      console.log('\n📁 Files containing jQuery:');
      console.log('─'.repeat(60));
      results.filesList.slice(0, 10).forEach(file => {
        console.log(`  • ${file}`);
      });
      if (results.filesList.length > 10) {
        console.log(`  ... and ${results.filesList.length - 10} more files`);
      }
    }
    
    console.log('\n💡 Conversion Preview:');
    console.log('─'.repeat(60));
    
    // Show example conversions
    const examples = [
      { from: "$('#myId')", to: "document.getElementById('myId')" },
      { from: "$('.myClass')", to: "document.querySelectorAll('.myClass')" },
      { from: ".click(function() {...})", to: ".addEventListener('click', function() {...})" },
      { from: ".hide()", to: ".style.display = 'none'" },
      { from: ".addClass('active')", to: ".classList.add('active')" },
      { from: "$.ajax({...})", to: "fetch('', {...})" }
    ];
    
    examples.forEach(ex => {
      console.log(`  ${ex.from}`);
      console.log(`  → ${ex.to}\n`);
    });
    
    if (results.filesWithJQuery > 0) {
      console.log('\n⚠️  SAFETY NOTICE:');
      console.log('─'.repeat(60));
      console.log('• All files will be backed up before conversion');
      console.log('• Complex jQuery plugins may need manual conversion');
      console.log('• Animation effects are simplified (may need enhancement)');
      console.log('• Test thoroughly after conversion');
      
      console.log('\n🎯 To convert jQuery to vanilla JavaScript:');
      console.log(`   npx tsx scripts/remove-jquery-safely.ts --convert`);
      console.log('\n🔍 For dry-run (preview only):');
      console.log(`   npx tsx scripts/remove-jquery-safely.ts --dry-run`);
    } else {
      console.log('\n✅ No jQuery dependencies found!');
    }
  }

  public async convertProject(directory: string): Promise<void> {
    console.log('\n🔧 JQUERY CONVERSION ' + (this.dryRun ? '(DRY RUN)' : '(LIVE)') + '\n');
    console.log('─'.repeat(60));
    
    const files = await glob(path.join(directory, '**/*.{js,jsx,ts,tsx,html}'), {
      ignore: ['**/node_modules/**', '**/dist/**', '**/build/**', '**/*.min.js', '**/*.jquery-backup']
    });
    
    let totalChanges = 0;
    let filesConverted = 0;
    const errors: string[] = [];
    
    for (const file of files) {
      const analysis = await this.analyzeFile(file);
      if (analysis.hasJQuery) {
        try {
          const result = await this.convertFile(file);
          if (result.changes > 0) {
            filesConverted++;
            totalChanges += result.changes;
            const relPath = path.relative(directory, file);
            console.log(`${this.dryRun ? '[DRY-RUN] ' : '✅ '}${relPath} (${result.changes} changes)`);
          }
        } catch (error) {
          errors.push(file);
          console.log(`❌ Error converting ${file}: ${error}`);
        }
      }
    }
    
    console.log('\n📊 CONVERSION SUMMARY:');
    console.log('─'.repeat(60));
    console.log(`Files converted:       ${filesConverted}`);
    console.log(`Total changes made:    ${totalChanges}`);
    console.log(`Errors encountered:    ${errors.length}`);
    
    if (!this.dryRun) {
      console.log(`\n✅ Conversion complete! Backups created with .jquery-backup extension`);
      console.log('\n🔄 To restore original files:');
      console.log('   find . -name "*.jquery-backup" -exec sh -c \'mv "$1" "${1%.jquery-backup}"\' _ {} \\;');
    } else {
      console.log('\n💡 This was a DRY RUN. No files were modified.');
      console.log('   Remove --dry-run flag to apply changes.');
    }
    
    if (errors.length > 0) {
      console.log('\n⚠️  Files with errors (may need manual conversion):');
      errors.forEach(file => console.log(`  • ${path.relative(directory, file)}`));
    }
  }
}

// CLI
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  const remover = new JQueryRemover({
    safeMode: true,
    dryRun: command !== '--convert'
  });
  
  if (command === '--convert') {
    await remover.convertProject(process.cwd());
  } else if (command === '--dry-run') {
    await remover.convertProject(process.cwd());
  } else {
    await remover.scanProject(process.cwd());
  }
}

if (require.main === module) {
  main().catch(console.error);
}

export { JQueryRemover };