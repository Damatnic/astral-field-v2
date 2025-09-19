#!/usr/bin/env node
import { promises as fs } from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { gzipSync } from 'zlib';

const execAsync = promisify(exec);

interface BundleAnalysis {
  totalSize: number;
  gzippedSize: number;
  largestFiles: Array<{ name: string; size: number }>;
  recommendations: string[];
  optimizationPotential: number;
}

class BundleOptimizer {
  private targetSize = 200 * 1024; // 200KB target
  
  async analyze(): Promise<BundleAnalysis> {
    console.log('\n📦 BUNDLE SIZE OPTIMIZATION ANALYSIS\n');
    console.log('═'.repeat(60));
    
    const analysis: BundleAnalysis = {
      totalSize: 0,
      gzippedSize: 0,
      largestFiles: [],
      recommendations: [],
      optimizationPotential: 0
    };

    // Check if .next directory exists
    const nextDir = path.join(process.cwd(), '.next');
    try {
      await fs.access(nextDir);
    } catch {
      console.log('⚠️  Build directory not found. Running build...');
      await execAsync('npm run build');
    }

    // Analyze bundle sizes
    await this.analyzeBuildOutput(analysis);
    
    // Check for optimization opportunities
    await this.checkOptimizations(analysis);
    
    // Display results
    this.displayResults(analysis);
    
    // Create optimization config
    await this.createOptimizationConfig();
    
    return analysis;
  }

  private async analyzeBuildOutput(analysis: BundleAnalysis): Promise<void> {
    const buildDir = path.join(process.cwd(), '.next');
    const staticDir = path.join(buildDir, 'static');
    
    // Get all JS files
    const jsFiles: Array<{ name: string; size: number; gzipped: number }> = [];
    
    async function scanDir(dir: string): Promise<void> {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory()) {
          await scanDir(fullPath);
        } else if (entry.name.endsWith('.js')) {
          const stats = await fs.stat(fullPath);
          const content = await fs.readFile(fullPath);
          const gzipped = gzipSync(content);
          
          jsFiles.push({
            name: path.relative(buildDir, fullPath),
            size: stats.size,
            gzipped: gzipped.length
          });
        }
      }
    }
    
    await scanDir(staticDir);
    
    // Calculate totals
    analysis.totalSize = jsFiles.reduce((sum, file) => sum + file.size, 0);
    analysis.gzippedSize = jsFiles.reduce((sum, file) => sum + file.gzipped, 0);
    
    // Find largest files
    analysis.largestFiles = jsFiles
      .sort((a, b) => b.size - a.size)
      .slice(0, 10)
      .map(f => ({ name: f.name, size: f.size }));
  }

  private async checkOptimizations(analysis: BundleAnalysis): Promise<void> {
    const packageJson = JSON.parse(await fs.readFile('package.json', 'utf-8'));
    const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };
    
    // Check for large libraries
    const largeLibraries = {
      'moment': { replacement: 'date-fns or dayjs', savings: 67 },
      'lodash': { replacement: 'lodash-es or native methods', savings: 24 },
      'axios': { replacement: 'native fetch', savings: 13 },
      'jquery': { replacement: 'vanilla JavaScript', savings: 87 },
      '@mui/material': { replacement: 'tree-shaking or lighter library', savings: 120 },
      'antd': { replacement: 'tree-shaking or lighter library', savings: 90 },
      'bootstrap': { replacement: 'Tailwind CSS', savings: 50 }
    };
    
    let potentialSavings = 0;
    
    for (const [lib, info] of Object.entries(largeLibraries)) {
      if (dependencies[lib]) {
        analysis.recommendations.push(
          `Replace ${lib} with ${info.replacement} (save ~${info.savings}KB)`
        );
        potentialSavings += info.savings * 1024;
      }
    }
    
    // Check for code splitting opportunities
    if (analysis.largestFiles.some(f => f.size > 50 * 1024)) {
      analysis.recommendations.push('Implement code splitting for large components');
      potentialSavings += 30 * 1024;
    }
    
    // Check for tree shaking
    if (!packageJson.sideEffects === false) {
      analysis.recommendations.push('Add "sideEffects": false to package.json for tree shaking');
      potentialSavings += 20 * 1024;
    }
    
    // Check for dynamic imports
    analysis.recommendations.push('Use dynamic imports for routes and heavy components');
    analysis.recommendations.push('Enable Next.js automatic static optimization');
    analysis.recommendations.push('Implement progressive hydration for large pages');
    
    analysis.optimizationPotential = potentialSavings;
  }

  private displayResults(analysis: BundleAnalysis): void {
    const formatSize = (bytes: number) => {
      if (bytes < 1024) return `${bytes} B`;
      if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
      return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    };
    
    console.log('\n📊 BUNDLE ANALYSIS RESULTS\n');
    console.log('─'.repeat(60));
    
    // Size summary
    console.log('Current Bundle Size:');
    console.log(`  Total:    ${formatSize(analysis.totalSize)}`);
    console.log(`  Gzipped:  ${formatSize(analysis.gzippedSize)}`);
    console.log(`  Target:   ${formatSize(this.targetSize)}`);
    
    const overTarget = analysis.gzippedSize - this.targetSize;
    if (overTarget > 0) {
      console.log(`  ⚠️  Over target by: ${formatSize(overTarget)}`);
    } else {
      console.log(`  ✅ Under target by: ${formatSize(Math.abs(overTarget))}`);
    }
    
    // Largest files
    console.log('\n📁 Largest Files:');
    console.log('─'.repeat(60));
    analysis.largestFiles.forEach((file, i) => {
      console.log(`${(i + 1).toString().padStart(2)}. ${file.name.padEnd(40)} ${formatSize(file.size)}`);
    });
    
    // Recommendations
    if (analysis.recommendations.length > 0) {
      console.log('\n💡 OPTIMIZATION RECOMMENDATIONS:');
      console.log('─'.repeat(60));
      analysis.recommendations.forEach((rec, i) => {
        console.log(`${i + 1}. ${rec}`);
      });
      
      if (analysis.optimizationPotential > 0) {
        console.log(`\n🎯 Potential savings: ${formatSize(analysis.optimizationPotential)}`);
      }
    }
    
    console.log('\n═'.repeat(60));
  }

  private async createOptimizationConfig(): Promise<void> {
    // Create next.config optimization
    const nextConfigOptimization = `
// Add to next.config.js

const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

module.exports = withBundleAnalyzer({
  // Enable SWC minification
  swcMinify: true,
  
  // Optimize images
  images: {
    domains: ['your-domain.com'],
    formats: ['image/avif', 'image/webp'],
  },
  
  // Optimize fonts
  optimizeFonts: true,
  
  // Compression
  compress: true,
  
  // Production optimizations
  productionBrowserSourceMaps: false,
  
  // Webpack optimizations
  webpack: (config, { dev, isServer }) => {
    // Tree shaking
    config.optimization.usedExports = true;
    config.optimization.sideEffects = false;
    
    // Split chunks
    if (!dev && !isServer) {
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          default: false,
          vendors: false,
          vendor: {
            name: 'vendor',
            chunks: 'all',
            test: /node_modules/,
            priority: 20,
          },
          common: {
            name: 'common',
            minChunks: 2,
            chunks: 'all',
            priority: 10,
            reuseExistingChunk: true,
            enforce: true,
          },
        },
      };
    }
    
    // Module replacement
    config.resolve.alias = {
      ...config.resolve.alias,
      'lodash': 'lodash-es',
      'moment': 'dayjs',
    };
    
    return config;
  },
  
  // Experimental features
  experimental: {
    optimizeCss: true,
    scrollRestoration: true,
  },
});
`;

    // Create optimization utilities
    const dynamicImportHelper = `// Dynamic import helper
export const loadComponent = (path: string) => {
  return dynamic(() => import(\`@/components/\${path}\`), {
    loading: () => <div>Loading...</div>,
    ssr: false,
  });
};

// Lazy load heavy libraries
export const loadChart = () => import('recharts');
export const loadEditor = () => import('@monaco-editor/react');
export const loadPDF = () => import('react-pdf');

// Image optimization
export const OptimizedImage = ({ src, alt, ...props }) => {
  return (
    <Image
      src={src}
      alt={alt}
      placeholder="blur"
      quality={75}
      loading="lazy"
      {...props}
    />
  );
};`;

    // Save optimization guide
    const optimizationGuide = `# Bundle Optimization Guide

## Current Status
- Total Size: ${(this.analyze.totalSize / 1024).toFixed(1)}KB
- Gzipped: ${(this.analyze.gzippedSize / 1024).toFixed(1)}KB
- Target: 200KB

## Quick Wins

### 1. Replace Heavy Libraries
\`\`\`bash
npm uninstall moment lodash
npm install date-fns lodash-es
\`\`\`

### 2. Enable Tree Shaking
Add to package.json:
\`\`\`json
"sideEffects": false
\`\`\`

### 3. Use Dynamic Imports
\`\`\`typescript
const HeavyComponent = dynamic(() => import('./HeavyComponent'), {
  loading: () => <Skeleton />,
  ssr: false
});
\`\`\`

### 4. Optimize Images
- Use next/image component
- Convert to WebP/AVIF
- Implement lazy loading

### 5. Code Splitting
- Split by route
- Split by component
- Split third-party libraries

## Advanced Optimizations

### Preact Compatibility
\`\`\`bash
npm install preact
\`\`\`

Add to next.config.js:
\`\`\`javascript
webpack: (config) => {
  config.resolve.alias = {
    ...config.resolve.alias,
    'react': 'preact/compat',
    'react-dom': 'preact/compat'
  };
  return config;
}
\`\`\`

### Remove Unused CSS
\`\`\`bash
npm install @fullhuman/postcss-purgecss
\`\`\`

### Analyze Bundle
\`\`\`bash
ANALYZE=true npm run build
\`\`\`
`;

    await fs.writeFile('OPTIMIZATION_GUIDE.md', optimizationGuide, 'utf-8');
    console.log('\n✅ Created OPTIMIZATION_GUIDE.md');
    console.log('\n📚 Next steps:');
    console.log('  1. Review OPTIMIZATION_GUIDE.md');
    console.log('  2. Run: ANALYZE=true npm run build');
    console.log('  3. Implement recommended optimizations');
  }
}

// CLI
async function main() {
  const optimizer = new BundleOptimizer();
  await optimizer.analyze();
}

if (require.main === module) {
  main().catch(console.error);
}

export { BundleOptimizer };