#!/usr/bin/env node
import { promises as fs } from 'fs';
import path from 'path';
import { glob } from 'glob';
import * as parser from '@babel/parser';
import traverse from '@babel/traverse';
import generate from '@babel/generator';
import * as t from '@babel/types';

class CommonJSToES6Converter {
  private stats = {
    filesScanned: 0,
    filesConverted: 0,
    requiresConverted: 0,
    exportsConverted: 0,
    errors: 0
  };

  private backupDir = '.commonjs-backup';
  private dryRun = true;

  constructor(options = { dryRun: true }) {
    this.dryRun = options.dryRun;
  }

  async convertProject(directory: string): Promise<void> {
    console.log('\n🔄 COMMONJS TO ES6 MODULE CONVERSION\n');
    console.log('─'.repeat(60));

    // Find all JavaScript/TypeScript files
    const patterns = [
      path.join(directory, '**/*.js'),
      path.join(directory, '**/*.jsx'),
      path.join(directory, '**/*.ts'),
      path.join(directory, '**/*.tsx')
    ];

    const ignorePatterns = [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/.next/**',
      '**/coverage/**',
      '**/*.min.js',
      '**/*.config.js',
      '**/next.config.js',
      '**/jest.config.js',
      '**/postcss.config.js',
      '**/tailwind.config.js'
    ];

    const files: string[] = [];
    for (const pattern of patterns) {
      const matches = await glob(pattern, { ignore: ignorePatterns });
      files.push(...matches);
    }

    console.log(`Found ${files.length} files to scan\n`);

    // Process each file
    for (const file of files) {
      await this.processFile(file);
    }

    // Display results
    this.displayResults();
  }

  private async processFile(filePath: string): Promise<void> {
    this.stats.filesScanned++;

    try {
      const content = await fs.readFile(filePath, 'utf-8');
      
      // Quick check for CommonJS patterns
      if (!this.hasCommonJSPatterns(content)) {
        return;
      }

      // Parse the file
      const ast = parser.parse(content, {
        sourceType: 'unambiguous',
        plugins: [
          'typescript',
          'jsx',
          'decorators-legacy',
          'classProperties',
          'dynamicImport'
        ],
        errorRecovery: true
      });

      let modified = false;
      const imports: t.ImportDeclaration[] = [];
      const exports: t.ExportDeclaration[] = [];

      // Transform the AST
      traverse(ast, {
        // Convert require() to import
        CallExpression(path) {
          if (t.isIdentifier(path.node.callee, { name: 'require' })) {
            const arg = path.node.arguments[0];
            if (t.isStringLiteral(arg)) {
              const parent = path.parent;
              
              // const x = require('module')
              if (t.isVariableDeclarator(parent) && t.isIdentifier(parent.id)) {
                const importDecl = t.importDeclaration(
                  [t.importDefaultSpecifier(parent.id)],
                  t.stringLiteral(arg.value)
                );
                imports.push(importDecl);
                path.parentPath.parentPath?.remove();
                modified = true;
                this.stats.requiresConverted++;
              }
              // const { x, y } = require('module')
              else if (t.isVariableDeclarator(parent) && t.isObjectPattern(parent.id)) {
                const specifiers = parent.id.properties
                  .filter(t.isObjectProperty)
                  .map(prop => {
                    if (t.isIdentifier(prop.key) && t.isIdentifier(prop.value)) {
                      return t.importSpecifier(prop.value, prop.key);
                    }
                    return null;
                  })
                  .filter(Boolean) as t.ImportSpecifier[];
                
                if (specifiers.length > 0) {
                  const importDecl = t.importDeclaration(specifiers, t.stringLiteral(arg.value));
                  imports.push(importDecl);
                  path.parentPath.parentPath?.remove();
                  modified = true;
                  this.stats.requiresConverted++;
                }
              }
            }
          }
        },

        // Convert module.exports
        MemberExpression(path) {
          if (t.isIdentifier(path.node.object, { name: 'module' }) &&
              t.isIdentifier(path.node.property, { name: 'exports' })) {
            const parent = path.parent;
            
            // module.exports = something
            if (t.isAssignmentExpression(parent) && parent.left === path.node) {
              const exportDefault = t.exportDefaultDeclaration(parent.right);
              exports.push(exportDefault);
              path.parentPath.parentPath?.remove();
              modified = true;
              this.stats.exportsConverted++;
            }
          }
          // exports.something = value
          else if (t.isIdentifier(path.node.object, { name: 'exports' })) {
            const parent = path.parent;
            
            if (t.isAssignmentExpression(parent) && parent.left === path.node) {
              if (t.isIdentifier(path.node.property)) {
                const exportNamed = t.exportNamedDeclaration(
                  t.variableDeclaration('const', [
                    t.variableDeclarator(
                      t.identifier(path.node.property.name),
                      parent.right
                    )
                  ])
                );
                exports.push(exportNamed);
                path.parentPath.parentPath?.remove();
                modified = true;
                this.stats.exportsConverted++;
              }
            }
          }
        }
      });

      if (modified) {
        // Add imports at the top
        if (imports.length > 0) {
          ast.program.body.unshift(...imports);
        }

        // Add exports
        if (exports.length > 0) {
          ast.program.body.push(...exports);
        }

        // Generate new code
        const { code } = generate(ast, {
          retainLines: true,
          retainFunctionParens: true,
          comments: true
        });

        if (!this.dryRun) {
          // Create backup
          await this.backupFile(filePath);
          // Write converted file
          await fs.writeFile(filePath, code, 'utf-8');
        }

        this.stats.filesConverted++;
        const relPath = path.relative(process.cwd(), filePath);
        console.log(`${this.dryRun ? '[DRY-RUN] ' : '✅ '}${relPath}`);
      }
    } catch (error) {
      this.stats.errors++;
      console.error(`❌ Error processing ${filePath}: ${error}`);
    }
  }

  private hasCommonJSPatterns(content: string): boolean {
    const patterns = [
      /require\s*\(/,
      /module\.exports/,
      /exports\./,
      /exports\[/
    ];
    
    return patterns.some(pattern => pattern.test(content));
  }

  private async backupFile(filePath: string): Promise<void> {
    const backupPath = path.join(
      this.backupDir,
      path.relative(process.cwd(), filePath)
    );
    
    await fs.mkdir(path.dirname(backupPath), { recursive: true });
    await fs.copyFile(filePath, backupPath);
  }

  private displayResults(): void {
    console.log('\n' + '═'.repeat(60));
    console.log('📊 CONVERSION RESULTS');
    console.log('─'.repeat(60));
    console.log(`Files scanned:       ${this.stats.filesScanned}`);
    console.log(`Files converted:     ${this.stats.filesConverted}`);
    console.log(`Requires converted:  ${this.stats.requiresConverted}`);
    console.log(`Exports converted:   ${this.stats.exportsConverted}`);
    console.log(`Errors:              ${this.stats.errors}`);
    
    if (this.dryRun) {
      console.log('\n⚠️  DRY RUN - No files were modified');
      console.log('Remove --dry-run flag to apply changes');
    } else if (this.stats.filesConverted > 0) {
      console.log('\n✅ Conversion complete!');
      console.log(`Backups saved in: ${this.backupDir}`);
    }
    console.log('═'.repeat(60) + '\n');
  }
}

// Simplified converter for safer operation
class SimpleES6Converter {
  async convertFile(filePath: string, dryRun = true): Promise<string> {
    let content = await fs.readFile(filePath, 'utf-8');
    let changes = 0;

    // Simple replacements
    const replacements = [
      // const x = require('module') -> import x from 'module'
      {
        pattern: /const\s+(\w+)\s*=\s*require\(['"]([^'"]+)['"]\);?/g,
        replacement: "import $1 from '$2';"
      },
      // const { x, y } = require('module') -> import { x, y } from 'module'
      {
        pattern: /const\s+\{([^}]+)\}\s*=\s*require\(['"]([^'"]+)['"]\);?/g,
        replacement: "import { $1 } from '$2';"
      },
      // let/var to const for requires
      {
        pattern: /(?:let|var)\s+(\w+)\s*=\s*require\(['"]([^'"]+)['"]\);?/g,
        replacement: "import $1 from '$2';"
      },
      // module.exports = x -> export default x
      {
        pattern: /module\.exports\s*=\s*([^;]+);?/g,
        replacement: 'export default $1;'
      },
      // exports.x = y -> export const x = y
      {
        pattern: /exports\.(\w+)\s*=\s*([^;]+);?/g,
        replacement: 'export const $1 = $2;'
      },
      // require('module') without assignment -> import 'module'
      {
        pattern: /require\(['"]([^'"]+)['"]\);?/g,
        replacement: "import '$1';"
      }
    ];

    for (const { pattern, replacement } of replacements) {
      const matches = content.match(pattern);
      if (matches) {
        changes += matches.length;
        content = content.replace(pattern, replacement);
      }
    }

    if (changes > 0 && !dryRun) {
      // Backup original
      await fs.writeFile(filePath + '.bak', await fs.readFile(filePath, 'utf-8'), 'utf-8');
      // Write converted
      await fs.writeFile(filePath, content, 'utf-8');
    }

    return content;
  }

  async scanAndConvert(directory: string, dryRun = true): Promise<void> {
    console.log('\n🔄 SIMPLE ES6 MODULE CONVERSION\n');
    console.log('─'.repeat(60));

    const files = await glob(path.join(directory, '**/*.{js,jsx}'), {
      ignore: [
        '**/node_modules/**',
        '**/dist/**',
        '**/build/**',
        '**/.next/**',
        '**/*.config.js'
      ]
    });

    let converted = 0;
    
    for (const file of files) {
      const content = await fs.readFile(file, 'utf-8');
      if (content.includes('require(') || content.includes('module.exports')) {
        const relPath = path.relative(directory, file);
        console.log(`${dryRun ? '[DRY-RUN] ' : '✅ '}Converting: ${relPath}`);
        await this.convertFile(file, dryRun);
        converted++;
      }
    }

    console.log('\n' + '─'.repeat(60));
    console.log(`Total files converted: ${converted}`);
    if (dryRun) {
      console.log('\n💡 This was a dry run. Use --convert to apply changes.');
    }
  }
}

// CLI
async function main() {
  const args = process.argv.slice(2);
  const useSimple = args.includes('--simple');
  const dryRun = !args.includes('--convert');

  if (useSimple) {
    const converter = new SimpleES6Converter();
    await converter.scanAndConvert(process.cwd(), dryRun);
  } else {
    const converter = new CommonJSToES6Converter({ dryRun });
    await converter.convertProject(process.cwd());
  }
}

if (require.main === module) {
  main().catch(console.error);
}

export { CommonJSToES6Converter, SimpleES6Converter };