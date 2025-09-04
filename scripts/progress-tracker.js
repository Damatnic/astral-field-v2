#!/usr/bin/env node

// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = require('fs')
// eslint-disable-next-line @typescript-eslint/no-require-imports
const path = require('path')

class ProgressTracker {
  constructor() {
    this.progressFile = path.join(__dirname, '../agents/progress-tracker.json')
    this.testResultsDir = path.join(__dirname, '../coverage')
    this.agents = [
      'infrastructure',
      'league-systems', 
      'draft-specialist',
      'team-features',
      'realtime-engineer',
      'ai-ml-specialist',
      'qa-devops'
    ]
  }

  loadProgress() {
    try {
      const data = fs.readFileSync(this.progressFile, 'utf8')
      return JSON.parse(data)
    } catch (error) {
      console.error('Error loading progress data:', error.message)
      return null
    }
  }

  saveProgress(progressData) {
    try {
      fs.writeFileSync(
        this.progressFile, 
        JSON.stringify(progressData, null, 2),
        'utf8'
      )
      console.log('✅ Progress data saved successfully')
    } catch (error) {
      console.error('❌ Error saving progress data:', error.message)
    }
  }

  async getTestCoverage() {
    const coverageData = {}
    
    for (const agent of this.agents) {
      const agentCoverageFile = path.join(
        this.testResultsDir, 
        'agents', 
        agent, 
        'coverage-summary.json'
      )
      
      try {
        if (fs.existsSync(agentCoverageFile)) {
          const coverage = JSON.parse(fs.readFileSync(agentCoverageFile, 'utf8'))
          coverageData[agent] = {
            unit: coverage.total?.lines?.pct || 0,
            integration: coverage.total?.branches?.pct || 0,
            e2e: coverage.total?.functions?.pct || 0
          }
        } else {
          coverageData[agent] = { unit: 0, integration: 0, e2e: 0 }
        }
      } catch (error) {
        coverageData[agent] = { unit: 0, integration: 0, e2e: 0 }
      }
    }
    
    return coverageData
  }

  async checkAgentStatus(agentId) {
    const agentDir = path.join(__dirname, '../agents', agentId)
    const testDir = path.join(__dirname, '../__tests__/agents', agentId)
    const e2eDir = path.join(__dirname, '../playwright-tests/agents', agentId)
    
    const status = {
      workspaceSetup: fs.existsSync(agentDir),
      hasTests: fs.existsSync(testDir) && fs.readdirSync(testDir).length > 0,
      hasE2ETests: fs.existsSync(e2eDir) && fs.readdirSync(e2eDir).length > 0,
      hasMockData: fs.existsSync(path.join(agentDir, 'mock-data')),
      hasDocumentation: fs.existsSync(path.join(agentDir, 'README.md'))
    }
    
    const completionScore = Object.values(status).filter(Boolean).length / Object.keys(status).length
    
    return {
      ...status,
      completionScore: Math.round(completionScore * 100)
    }
  }

  generateProgressReport() {
    const progress = this.loadProgress()
    if (!progress) return

    console.log('\n🚀 ASTRAL FIELD - AGENT PROGRESS REPORT')
    console.log('='.repeat(60))
    console.log(`📅 Last Updated: ${new Date(progress.lastUpdated).toLocaleString()}`)
    console.log()

    // Overall project status
    const totalAgents = progress.agents.length
    const readyAgents = progress.agents.filter(a => a.status === 'ready').length
    const activeAgents = progress.agents.filter(a => a.status === 'active').length
    const completedAgents = progress.agents.filter(a => a.status === 'completed').length

    console.log('📊 OVERALL PROJECT STATUS')
    console.log('-'.repeat(30))
    console.log(`Ready to Start: ${readyAgents}/${totalAgents} agents`)
    console.log(`Currently Active: ${activeAgents}/${totalAgents} agents`)
    console.log(`Completed: ${completedAgents}/${totalAgents} agents`)
    console.log()

    // Individual agent status
    console.log('👥 AGENT STATUS BREAKDOWN')
    console.log('-'.repeat(30))
    
    progress.agents.forEach(agent => {
      const statusEmoji = {
        ready: '🟡',
        active: '🟠', 
        completed: '🟢',
        blocked: '🔴'
      }[agent.status] || '⚪'

      console.log(`${statusEmoji} ${agent.name}`)
      console.log(`   Progress: ${agent.progress.overall}%`)
      console.log(`   Current Task: ${agent.currentTask}`)
      
      if (agent.blockers.length > 0) {
        console.log(`   ⚠️  Blockers: ${agent.blockers.join(', ')}`)
      }
      
      console.log(`   📋 Test Coverage: Unit ${agent.testCoverage.unit}% | Integration ${agent.testCoverage.integration}% | E2E ${agent.testCoverage.e2e}%`)
      console.log(`   🎯 Next Milestone: ${agent.nextMilestone}`)
      console.log()
    })

    // Milestone tracking
    console.log('🎯 MILESTONE PROGRESS')
    console.log('-'.repeat(30))
    
    progress.milestones.forEach(milestone => {
      const statusEmoji = {
        completed: '✅',
        in_progress: '🟡',
        pending: '⏳',
        blocked: '❌'
      }[milestone.status] || '⚪'

      console.log(`${statusEmoji} ${milestone.name} (${milestone.progress}%)`)
      console.log(`   📅 Due: ${new Date(milestone.dueDate).toLocaleDateString()}`)
      console.log(`   🔗 Dependencies: ${milestone.dependencies.join(', ')}`)
      console.log()
    })

    return progress
  }

  async updateAgentProgress(agentId, updates) {
    const progress = this.loadProgress()
    if (!progress) return

    const agentIndex = progress.agents.findIndex(a => a.id === agentId)
    if (agentIndex === -1) {
      console.error(`❌ Agent ${agentId} not found`)
      return
    }

    // Update agent data
    progress.agents[agentIndex] = {
      ...progress.agents[agentIndex],
      ...updates,
      lastUpdated: new Date().toISOString()
    }

    // Update overall progress timestamp
    progress.lastUpdated = new Date().toISOString()

    this.saveProgress(progress)
    console.log(`✅ Updated progress for ${agentId}`)
  }

  async runHealthCheck() {
    console.log('\n🏥 AGENT HEALTH CHECK')
    console.log('=' .repeat(40))
    
    for (const agentId of this.agents) {
      const status = await this.checkAgentStatus(agentId)
      const health = status.completionScore
      
      const healthEmoji = health >= 80 ? '🟢' : health >= 60 ? '🟡' : '🔴'
      
      console.log(`${healthEmoji} ${agentId.toUpperCase()} (${health}% complete)`)
      
      if (!status.workspaceSetup) console.log('   ❌ Workspace not set up')
      if (!status.hasTests) console.log('   ❌ No unit tests found') 
      if (!status.hasE2ETests) console.log('   ❌ No E2E tests found')
      if (!status.hasMockData) console.log('   ❌ No mock data found')
      if (!status.hasDocumentation) console.log('   ❌ No documentation found')
      
      console.log()
    }
  }

  generateDailyStandup() {
    const progress = this.loadProgress()
    if (!progress) return

    console.log('\n📋 DAILY STANDUP REPORT')
    console.log('=' .repeat(50))
    console.log(`📅 ${new Date().toLocaleDateString()}`)
    console.log()

    progress.agents.forEach(agent => {
      if (agent.status === 'active' || agent.progress.overall > 0) {
        console.log(`👤 ${agent.name}`)
        console.log(`   ✅ Current Task: ${agent.currentTask}`)
        console.log(`   📊 Progress: ${agent.progress.overall}%`)
        
        if (agent.blockers.length > 0) {
          console.log(`   🚫 Blockers: ${agent.blockers.join(', ')}`)
        }
        
        console.log(`   🎯 Next: ${agent.nextMilestone}`)
        console.log()
      }
    })
  }

  initializeAgent(agentId) {
    const agentDir = path.join(__dirname, '../agents', agentId)
    
    // Create agent directories if they don't exist
    const dirs = ['docs', 'tasks', 'tests', 'mock-data']
    dirs.forEach(dir => {
      const dirPath = path.join(agentDir, dir)
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true })
        console.log(`✅ Created directory: ${dirPath}`)
      }
    })

    // Create test directories
    const testDir = path.join(__dirname, '../__tests__/agents', agentId)
    const e2eDir = path.join(__dirname, '../playwright-tests/agents', agentId)
    
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true })
      console.log(`✅ Created test directory: ${testDir}`)
    }
    
    if (!fs.existsSync(e2eDir)) {
      fs.mkdirSync(e2eDir, { recursive: true })
      console.log(`✅ Created E2E test directory: ${e2eDir}`)
    }

    console.log(`🎉 Agent ${agentId} workspace initialized!`)
  }
}

// CLI Interface
const command = process.argv[2]
const agentId = process.argv[3]
const tracker = new ProgressTracker()

async function main() {
  switch (command) {
    case 'report':
      tracker.generateProgressReport()
      break
    
    case 'standup':
      tracker.generateDailyStandup()
      break
    
    case 'health':
      await tracker.runHealthCheck()
      break
    
    case 'update':
      if (!agentId) {
        console.error('❌ Please specify agent ID')
        process.exit(1)
      }
      // Example: node progress-tracker.js update infrastructure '{"status":"active","progress":{"overall":25}}'
      const updates = JSON.parse(process.argv[4] || '{}')
      await tracker.updateAgentProgress(agentId, updates)
      break
    
    case 'init':
      if (!agentId) {
        console.error('❌ Please specify agent ID')
        process.exit(1)
      }
      tracker.initializeAgent(agentId)
      break
    
    default:
      console.log('🚀 Astral Field Progress Tracker')
      console.log('')
      console.log('Available commands:')
      console.log('  report  - Show complete progress report')
      console.log('  standup - Generate daily standup report')
      console.log('  health  - Run agent health check')
      console.log('  update  - Update agent progress')
      console.log('  init    - Initialize agent workspace')
      console.log('')
      console.log('Examples:')
      console.log('  node progress-tracker.js report')
      console.log('  node progress-tracker.js update infrastructure \'{"status":"active"}\'')
      console.log('  node progress-tracker.js init league-systems')
  }
}

main().catch(console.error)