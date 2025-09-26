#!/usr/bin/env tsx

/**
 * Zenith Test Coverage Analysis & Reporting Script
 * Generates comprehensive coverage reports and quality gates validation
 */

import { execSync } from 'child_process'
import fs from 'fs'
import path from 'path'

interface CoverageThreshold {
  statements: number
  branches: number
  functions: number
  lines: number
}

interface CoverageData {
  total: {
    statements: { total: number; covered: number; pct: number }
    branches: { total: number; covered: number; pct: number }
    functions: { total: number; covered: number; pct: number }
    lines: { total: number; covered: number; pct: number }
  }
}

class ZenithCoverageAnalyzer {
  private readonly coveragePath = path.join(process.cwd(), 'apps/web/coverage')
  private readonly thresholds: Record<string, CoverageThreshold> = {
    global: { statements: 95, branches: 90, functions: 95, lines: 95 },
    authentication: { statements: 100, branches: 100, functions: 100, lines: 100 },
    components: { statements: 95, branches: 85, functions: 95, lines: 95 },
    api: { statements: 100, branches: 95, functions: 100, lines: 100 }
  }

  async generateCoverageReport(): Promise<void> {
    console.log('🧪 Zenith Test Coverage Analysis Starting...\n')

    try {
      // Run all test suites with coverage
      await this.runTestSuites()
      
      // Analyze coverage data
      await this.analyzeCoverage()
      
      // Generate reports
      await this.generateReports()
      
      // Validate quality gates
      await this.validateQualityGates()
      
      console.log('\n✅ Zenith Test Coverage Analysis Complete!')
      
    } catch (error) {
      console.error('\n❌ Coverage analysis failed:', error)
      process.exit(1)
    }
  }

  private async runTestSuites(): Promise<void> {
    console.log('📋 Running comprehensive test suites...\n')

    const testCommands = [
      {
        name: 'Unit Tests',
        command: 'npm run test:unit -- --coverage --watchAll=false --passWithNoTests',
        description: 'Component and utility unit tests'
      },
      {
        name: 'Integration Tests', 
        command: 'npm run test:integration -- --coverage --watchAll=false --passWithNoTests',
        description: 'API and service integration tests'
      },
      {
        name: 'Security Tests',
        command: 'npm run test:security -- --coverage --watchAll=false --passWithNoTests',
        description: 'Security vulnerability tests'
      },
      {
        name: 'Accessibility Tests',
        command: 'npm run test:accessibility -- --coverage --watchAll=false --passWithNoTests',
        description: 'WCAG 2.1 AA compliance tests'
      }
    ]

    for (const test of testCommands) {
      console.log(`⚡ Running ${test.name}...`)
      console.log(`   ${test.description}`)
      
      try {
        const output = execSync(test.command, { 
          cwd: 'apps/web',
          encoding: 'utf8',
          stdio: 'pipe'
        })
        
        console.log(`   ✅ ${test.name} completed\n`)
        
        // Extract key metrics from output
        this.extractTestMetrics(output, test.name)
        
      } catch (error: any) {
        if (error.status !== 0) {
          console.log(`   ⚠️  ${test.name} had failures - check output`)
          console.log(`   Output: ${error.stdout?.slice(-200) || 'No output'}`)
        }
      }
    }
  }

  private extractTestMetrics(output: string, testName: string): void {
    // Extract test count and timing
    const testMatch = output.match(/Tests:\s+(\d+)\s+passed/)
    const timeMatch = output.match(/Time:\s+([\d.]+)s/)
    
    if (testMatch && timeMatch) {
      console.log(`   📊 ${testMatch[1]} tests passed in ${timeMatch[1]}s`)
    }

    // Extract coverage summary
    const coverageMatch = output.match(/All files\s+\|\s+([\d.]+)\s+\|\s+([\d.]+)\s+\|\s+([\d.]+)\s+\|\s+([\d.]+)/)
    if (coverageMatch) {
      console.log(`   📈 Coverage: ${coverageMatch[1]}% statements, ${coverageMatch[2]}% branches`)
    }
  }

  private async analyzeCoverage(): Promise<void> {
    console.log('📊 Analyzing coverage data...\n')

    const coverageSummaryPath = path.join(this.coveragePath, 'coverage-summary.json')
    
    if (!fs.existsSync(coverageSummaryPath)) {
      console.log('⚠️  No coverage summary found, generating...')
      execSync('npm run test:coverage', { cwd: 'apps/web' })
    }

    const coverageData = JSON.parse(fs.readFileSync(coverageSummaryPath, 'utf8'))
    
    this.displayCoverageTable(coverageData)
    this.identifyGaps(coverageData)
  }

  private displayCoverageTable(data: any): void {
    console.log('╔══════════════════════════════════════════════╗')
    console.log('║         ZENITH COVERAGE ANALYSIS            ║')
    console.log('╠══════════════════════════════════════════════╣')
    
    const total = data.total
    console.log(`║ Statements:    ${this.formatPercentage(total.statements.pct)}% ${this.getProgressBar(total.statements.pct)}   ║`)
    console.log(`║ Branches:      ${this.formatPercentage(total.branches.pct)}% ${this.getProgressBar(total.branches.pct)}   ║`)
    console.log(`║ Functions:     ${this.formatPercentage(total.functions.pct)}% ${this.getProgressBar(total.functions.pct)}   ║`)
    console.log(`║ Lines:         ${this.formatPercentage(total.lines.pct)}% ${this.getProgressBar(total.lines.pct)}   ║`)
    console.log('╠══════════════════════════════════════════════╣')
    console.log(`║ Total Tests:   ${this.countTotalTests()}                     ║`)
    console.log(`║ Test Files:    ${this.countTestFiles()}                      ║`)
    console.log(`║ Source Files:  ${Object.keys(data).length - 1}                     ║`)
    console.log('╚══════════════════════════════════════════════╝\n')
  }

  private formatPercentage(pct: number): string {
    return pct.toFixed(1).padStart(5)
  }

  private getProgressBar(pct: number): string {
    const filled = Math.floor(pct / 10)
    const empty = 10 - filled
    const color = pct >= 95 ? '█' : pct >= 85 ? '▓' : '░'
    return color.repeat(filled) + '░'.repeat(empty)
  }

  private countTotalTests(): number {
    try {
      const output = execSync('find apps/web/__tests__ -name "*.test.*" -o -name "*.spec.*" | wc -l', { encoding: 'utf8' })
      return parseInt(output.trim()) || 0
    } catch {
      return 0
    }
  }

  private countTestFiles(): number {
    try {
      const output = execSync('find apps/web/__tests__ -name "*.test.*" -o -name "*.spec.*" | wc -l', { encoding: 'utf8' })
      return parseInt(output.trim()) || 0
    } catch {
      return 0
    }
  }

  private identifyGaps(data: any): void {
    console.log('🔍 Identifying coverage gaps...\n')

    const gaps: string[] = []
    
    Object.entries(data).forEach(([file, coverage]: [string, any]) => {
      if (file === 'total') return
      
      const statements = coverage.statements?.pct || 0
      const branches = coverage.branches?.pct || 0
      const functions = coverage.functions?.pct || 0
      const lines = coverage.lines?.pct || 0
      
      if (statements < 95 || branches < 90 || functions < 95 || lines < 95) {
        const shortFile = file.replace(process.cwd(), '').replace(/^\//, '')
        gaps.push(`${shortFile}: ${statements.toFixed(1)}% statements, ${branches.toFixed(1)}% branches`)
      }
    })

    if (gaps.length > 0) {
      console.log('⚠️  Files below coverage thresholds:')
      gaps.slice(0, 10).forEach(gap => console.log(`   • ${gap}`))
      if (gaps.length > 10) {
        console.log(`   ... and ${gaps.length - 10} more files`)
      }
    } else {
      console.log('✅ All files meet coverage thresholds!')
    }
    console.log()
  }

  private async generateReports(): Promise<void> {
    console.log('📝 Generating detailed reports...\n')

    // Generate HTML report
    console.log('   🌐 HTML coverage report...')
    execSync('npm run coverage:report', { cwd: 'apps/web' })
    
    // Generate badge
    console.log('   🏆 Coverage badge...')
    this.generateCoverageBadge()
    
    // Generate trend analysis
    console.log('   📈 Coverage trend analysis...')
    this.generateTrendReport()
    
    console.log('   ✅ All reports generated\n')
  }

  private generateCoverageBadge(): void {
    const summaryPath = path.join(this.coveragePath, 'coverage-summary.json')
    const data = JSON.parse(fs.readFileSync(summaryPath, 'utf8'))
    const totalPct = data.total.statements.pct
    
    const color = totalPct >= 95 ? 'brightgreen' : totalPct >= 85 ? 'yellow' : 'red'
    const badge = `https://img.shields.io/badge/coverage-${totalPct.toFixed(1)}%25-${color}`
    
    const badgeHtml = `
<!DOCTYPE html>
<html>
<head>
    <title>Coverage Badge</title>
</head>
<body>
    <img src="${badge}" alt="Coverage Badge" />
    <p>Generated: ${new Date().toISOString()}</p>
    <p>Total Coverage: ${totalPct.toFixed(1)}%</p>
</body>
</html>`
    
    fs.writeFileSync(path.join(this.coveragePath, 'badge.html'), badgeHtml)
  }

  private generateTrendReport(): void {
    const historyPath = path.join(this.coveragePath, 'history.json')
    const summaryPath = path.join(this.coveragePath, 'coverage-summary.json')
    
    const currentData = JSON.parse(fs.readFileSync(summaryPath, 'utf8'))
    const currentCoverage = {
      date: new Date().toISOString(),
      statements: currentData.total.statements.pct,
      branches: currentData.total.branches.pct,
      functions: currentData.total.functions.pct,
      lines: currentData.total.lines.pct
    }
    
    let history = []
    if (fs.existsSync(historyPath)) {
      history = JSON.parse(fs.readFileSync(historyPath, 'utf8'))
    }
    
    history.push(currentCoverage)
    
    // Keep last 30 entries
    if (history.length > 30) {
      history = history.slice(-30)
    }
    
    fs.writeFileSync(historyPath, JSON.stringify(history, null, 2))
    
    // Generate trend HTML
    this.generateTrendHTML(history)
  }

  private generateTrendHTML(history: any[]): void {
    const chartData = history.map(h => ({
      date: new Date(h.date).toLocaleDateString(),
      statements: h.statements,
      branches: h.branches,
      functions: h.functions,
      lines: h.lines
    }))
    
    const html = `
<!DOCTYPE html>
<html>
<head>
    <title>Coverage Trend</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .chart-container { width: 100%; height: 400px; margin: 20px 0; }
    </style>
</head>
<body>
    <h1>Zenith Coverage Trend Analysis</h1>
    <div class="chart-container">
        <canvas id="coverageChart"></canvas>
    </div>
    <script>
        const ctx = document.getElementById('coverageChart').getContext('2d');
        new Chart(ctx, {
            type: 'line',
            data: {
                labels: ${JSON.stringify(chartData.map(d => d.date))},
                datasets: [
                    {
                        label: 'Statements',
                        data: ${JSON.stringify(chartData.map(d => d.statements))},
                        borderColor: 'rgb(75, 192, 192)',
                        tension: 0.1
                    },
                    {
                        label: 'Branches',
                        data: ${JSON.stringify(chartData.map(d => d.branches))},
                        borderColor: 'rgb(255, 99, 132)',
                        tension: 0.1
                    },
                    {
                        label: 'Functions',
                        data: ${JSON.stringify(chartData.map(d => d.functions))},
                        borderColor: 'rgb(54, 162, 235)',
                        tension: 0.1
                    },
                    {
                        label: 'Lines',
                        data: ${JSON.stringify(chartData.map(d => d.lines))},
                        borderColor: 'rgb(153, 102, 255)',
                        tension: 0.1
                    }
                ]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100,
                        title: { display: true, text: 'Coverage %' }
                    },
                    x: {
                        title: { display: true, text: 'Date' }
                    }
                },
                plugins: {
                    title: {
                        display: true,
                        text: 'Test Coverage Trend Over Time'
                    }
                }
            }
        });
    </script>
</body>
</html>`
    
    fs.writeFileSync(path.join(this.coveragePath, 'trend.html'), html)
  }

  private async validateQualityGates(): Promise<void> {
    console.log('🚀 Validating Zenith Quality Gates...\n')

    const summaryPath = path.join(this.coveragePath, 'coverage-summary.json')
    const data = JSON.parse(fs.readFileSync(summaryPath, 'utf8'))
    const total = data.total
    
    const gates = [
      { name: 'Statements Coverage', actual: total.statements.pct, threshold: 95 },
      { name: 'Branches Coverage', actual: total.branches.pct, threshold: 90 },
      { name: 'Functions Coverage', actual: total.functions.pct, threshold: 95 },
      { name: 'Lines Coverage', actual: total.lines.pct, threshold: 95 }
    ]
    
    let passed = 0
    let failed = 0
    
    console.log('Quality Gate Results:')
    gates.forEach(gate => {
      const status = gate.actual >= gate.threshold ? '✅ PASS' : '❌ FAIL'
      const indicator = gate.actual >= gate.threshold ? passed++ : failed++
      
      console.log(`   ${status} ${gate.name}: ${gate.actual.toFixed(1)}% (threshold: ${gate.threshold}%)`)
    })
    
    console.log(`\n📊 Quality Gates Summary: ${passed} passed, ${failed} failed`)
    
    if (failed > 0) {
      console.log('\n❌ Quality gates failed! Coverage below Zenith standards.')
      console.log('   Recommendation: Add tests to improve coverage before deployment.')
      process.exit(1)
    } else {
      console.log('\n🏆 All quality gates passed! Code meets Zenith standards.')
    }
  }
}

// Execute coverage analysis
async function main() {
  const analyzer = new ZenithCoverageAnalyzer()
  await analyzer.generateCoverageReport()
}

if (require.main === module) {
  main().catch(console.error)
}

export { ZenithCoverageAnalyzer }