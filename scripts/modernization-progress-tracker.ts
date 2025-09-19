#!/usr/bin/env node
import { promises as fs } from 'fs';
import path from 'path';
import chalk from 'chalk';
import { performance } from 'perf_hooks';
import ora from 'ora';
import Table from 'cli-table3';
import boxen from 'boxen';

interface Task {
  id: string;
  category: string;
  description: string;
  status: 'pending' | 'in-progress' | 'completed' | 'blocked';
  priority: 'critical' | 'high' | 'medium' | 'low';
  estimatedHours: number;
  actualHours?: number;
  completedAt?: Date;
  blockedReason?: string;
  files?: number;
  changes?: number;
}

interface ProgressReport {
  overallProgress: number;
  tasksCompleted: number;
  totalTasks: number;
  hoursSpent: number;
  hoursRemaining: number;
  blockedTasks: number;
  criticalTasksRemaining: number;
  lastUpdated: Date;
  estimatedCompletion: Date;
}

class ModernizationProgressTracker {
  private tasks: Map<string, Task> = new Map();
  private startTime: number;
  private progressFile = '.modernization-progress.json';

  constructor() {
    this.startTime = Date.now();
    this.initializeTasks();
    this.loadProgress();
  }

  private initializeTasks(): void {
    const taskList: Task[] = [
      // Phase 1: Analysis & Preparation (COMPLETED)
      {
        id: 'analyze-legacy',
        category: 'Analysis',
        description: 'Scan codebase for legacy patterns',
        status: 'completed',
        priority: 'critical',
        estimatedHours: 2,
        actualHours: 1.5,
        completedAt: new Date('2024-01-18T10:00:00'),
        files: 156,
        changes: 0
      },
      {
        id: 'create-backup',
        category: 'Preparation',
        description: 'Create backup and rollback system',
        status: 'completed',
        priority: 'critical',
        estimatedHours: 1,
        actualHours: 0.5,
        completedAt: new Date('2024-01-18T11:00:00'),
        files: 2,
        changes: 0
      },
      {
        id: 'create-scripts',
        category: 'Tooling',
        description: 'Create modernization scripts',
        status: 'completed',
        priority: 'high',
        estimatedHours: 4,
        actualHours: 3,
        completedAt: new Date('2024-01-18T14:00:00'),
        files: 6,
        changes: 0
      },

      // Phase 2: Code Cleanup (IN PROGRESS)
      {
        id: 'fix-console-logs',
        category: 'Code Cleanup',
        description: 'Replace 3000+ console.log statements',
        status: 'in-progress',
        priority: 'high',
        estimatedHours: 6,
        files: 128,
        changes: 3035
      },
      {
        id: 'remove-jquery',
        category: 'Code Cleanup',
        description: 'Remove jQuery from 65 files',
        status: 'pending',
        priority: 'critical',
        estimatedHours: 8,
        files: 65,
        changes: 0
      },
      {
        id: 'convert-commonjs',
        category: 'Code Cleanup',
        description: 'Convert CommonJS to ES6 modules',
        status: 'pending',
        priority: 'medium',
        estimatedHours: 4,
        files: 45,
        changes: 0
      },
      {
        id: 'fix-async-patterns',
        category: 'Code Cleanup',
        description: 'Modernize callbacks to async/await',
        status: 'pending',
        priority: 'medium',
        estimatedHours: 5,
        files: 78,
        changes: 0
      },

      // Phase 3: TypeScript & Type Safety
      {
        id: 'add-types',
        category: 'TypeScript',
        description: 'Add TypeScript definitions',
        status: 'pending',
        priority: 'high',
        estimatedHours: 10,
        files: 200,
        changes: 0
      },
      {
        id: 'strict-mode',
        category: 'TypeScript',
        description: 'Enable TypeScript strict mode',
        status: 'pending',
        priority: 'medium',
        estimatedHours: 6,
        files: 200,
        changes: 0
      },

      // Phase 4: Testing
      {
        id: 'unit-tests',
        category: 'Testing',
        description: 'Implement unit tests (>80% coverage)',
        status: 'pending',
        priority: 'critical',
        estimatedHours: 12,
        files: 100,
        changes: 0
      },
      {
        id: 'integration-tests',
        category: 'Testing',
        description: 'Create integration tests',
        status: 'pending',
        priority: 'high',
        estimatedHours: 8,
        files: 30,
        changes: 0
      },
      {
        id: 'e2e-tests',
        category: 'Testing',
        description: 'Set up E2E tests with Playwright',
        status: 'pending',
        priority: 'medium',
        estimatedHours: 6,
        files: 20,
        changes: 0
      },

      // Phase 5: Performance
      {
        id: 'bundle-optimization',
        category: 'Performance',
        description: 'Optimize bundle size (<200KB)',
        status: 'pending',
        priority: 'high',
        estimatedHours: 8,
        files: 10,
        changes: 0
      },
      {
        id: 'lazy-loading',
        category: 'Performance',
        description: 'Implement code splitting & lazy loading',
        status: 'pending',
        priority: 'medium',
        estimatedHours: 4,
        files: 25,
        changes: 0
      },
      {
        id: 'image-optimization',
        category: 'Performance',
        description: 'Optimize images (WebP/AVIF)',
        status: 'pending',
        priority: 'low',
        estimatedHours: 2,
        files: 50,
        changes: 0
      },

      // Phase 6: Security
      {
        id: 'security-headers',
        category: 'Security',
        description: 'Implement security headers',
        status: 'pending',
        priority: 'critical',
        estimatedHours: 2,
        files: 3,
        changes: 0
      },
      {
        id: 'input-validation',
        category: 'Security',
        description: 'Add input validation & sanitization',
        status: 'pending',
        priority: 'critical',
        estimatedHours: 6,
        files: 40,
        changes: 0
      },
      {
        id: 'auth-hardening',
        category: 'Security',
        description: 'Harden authentication system',
        status: 'pending',
        priority: 'critical',
        estimatedHours: 4,
        files: 15,
        changes: 0
      },

      // Phase 7: Infrastructure
      {
        id: 'ci-cd-pipeline',
        category: 'Infrastructure',
        description: 'Set up CI/CD with GitHub Actions',
        status: 'pending',
        priority: 'high',
        estimatedHours: 4,
        files: 5,
        changes: 0
      },
      {
        id: 'monitoring',
        category: 'Infrastructure',
        description: 'Implement monitoring (Sentry, DataDog)',
        status: 'completed',
        priority: 'high',
        estimatedHours: 3,
        actualHours: 2,
        completedAt: new Date('2024-01-18T16:00:00'),
        files: 4,
        changes: 0
      },
      {
        id: 'deployment-config',
        category: 'Infrastructure',
        description: 'Configure production deployment',
        status: 'completed',
        priority: 'critical',
        estimatedHours: 2,
        actualHours: 1.5,
        completedAt: new Date('2024-01-18T15:00:00'),
        files: 8,
        changes: 0
      },

      // Phase 8: Documentation
      {
        id: 'api-docs',
        category: 'Documentation',
        description: 'Create API documentation',
        status: 'pending',
        priority: 'medium',
        estimatedHours: 6,
        files: 20,
        changes: 0
      },
      {
        id: 'component-docs',
        category: 'Documentation',
        description: 'Document React components',
        status: 'pending',
        priority: 'low',
        estimatedHours: 4,
        files: 50,
        changes: 0
      },
      {
        id: 'deployment-guide',
        category: 'Documentation',
        description: 'Write deployment guide',
        status: 'pending',
        priority: 'medium',
        estimatedHours: 2,
        files: 3,
        changes: 0
      }
    ];

    taskList.forEach(task => this.tasks.set(task.id, task));
  }

  private async loadProgress(): Promise<void> {
    try {
      const data = await fs.readFile(this.progressFile, 'utf-8');
      const savedTasks = JSON.parse(data);
      
      savedTasks.forEach((task: Task) => {
        if (this.tasks.has(task.id)) {
          this.tasks.set(task.id, {
            ...this.tasks.get(task.id)!,
            ...task,
            completedAt: task.completedAt ? new Date(task.completedAt) : undefined
          });
        }
      });
    } catch {
      // No saved progress, use defaults
    }
  }

  private async saveProgress(): Promise<void> {
    const tasksArray = Array.from(this.tasks.values());
    await fs.writeFile(this.progressFile, JSON.stringify(tasksArray, null, 2), 'utf-8');
  }

  public generateReport(): ProgressReport {
    const tasksArray = Array.from(this.tasks.values());
    const completed = tasksArray.filter(t => t.status === 'completed');
    const blocked = tasksArray.filter(t => t.status === 'blocked');
    const critical = tasksArray.filter(t => t.priority === 'critical' && t.status !== 'completed');
    
    const totalEstimated = tasksArray.reduce((sum, t) => sum + t.estimatedHours, 0);
    const hoursSpent = completed.reduce((sum, t) => sum + (t.actualHours || t.estimatedHours), 0);
    const hoursRemaining = tasksArray
      .filter(t => t.status !== 'completed')
      .reduce((sum, t) => sum + t.estimatedHours, 0);
    
    const overallProgress = (completed.length / tasksArray.length) * 100;
    
    // Estimate completion based on current velocity
    const velocity = hoursSpent / (completed.length || 1);
    const remainingTasks = tasksArray.length - completed.length;
    const estimatedDaysToComplete = (remainingTasks * velocity) / 8; // 8 hours per day
    
    const estimatedCompletion = new Date();
    estimatedCompletion.setDate(estimatedCompletion.getDate() + Math.ceil(estimatedDaysToComplete));

    return {
      overallProgress,
      tasksCompleted: completed.length,
      totalTasks: tasksArray.length,
      hoursSpent,
      hoursRemaining,
      blockedTasks: blocked.length,
      criticalTasksRemaining: critical.length,
      lastUpdated: new Date(),
      estimatedCompletion
    };
  }

  public displayDashboard(): void {
    console.clear();
    
    const report = this.generateReport();
    
    // Header
    console.log(boxen(
      chalk.blue.bold('🚀 CODEBASE MODERNIZATION PROGRESS TRACKER'),
      {
        padding: 1,
        margin: 1,
        borderStyle: 'double',
        borderColor: 'blue'
      }
    ));

    // Progress Bar
    const progressBar = this.createProgressBar(report.overallProgress);
    console.log(chalk.white('Overall Progress:'));
    console.log(progressBar);
    console.log();

    // Summary Stats
    const statsTable = new Table({
      style: { head: ['cyan'] },
      colWidths: [25, 15, 25, 15]
    });

    statsTable.push(
      [chalk.bold('Metric'), chalk.bold('Value'), chalk.bold('Metric'), chalk.bold('Value')],
      [
        'Tasks Completed', 
        `${report.tasksCompleted}/${report.totalTasks}`,
        'Hours Spent', 
        `${report.hoursSpent.toFixed(1)}h`
      ],
      [
        'Progress', 
        `${report.overallProgress.toFixed(1)}%`,
        'Hours Remaining', 
        `${report.hoursRemaining.toFixed(1)}h`
      ],
      [
        'Critical Tasks Left', 
        chalk.red(report.criticalTasksRemaining.toString()),
        'Est. Completion', 
        chalk.yellow(report.estimatedCompletion.toLocaleDateString())
      ],
      [
        'Blocked Tasks', 
        report.blockedTasks > 0 ? chalk.red(report.blockedTasks.toString()) : '0',
        'Velocity', 
        `${(report.hoursSpent / (report.tasksCompleted || 1)).toFixed(1)}h/task`
      ]
    );

    console.log(statsTable.toString());
    console.log();

    // Tasks by Category
    this.displayTasksByCategory();
    
    // Current Sprint
    this.displayCurrentSprint();
    
    // Files Impact Summary
    this.displayFilesImpact();

    // Save progress
    this.saveProgress();
  }

  private createProgressBar(percentage: number): string {
    const width = 50;
    const filled = Math.round((percentage / 100) * width);
    const empty = width - filled;
    
    const bar = chalk.green('█').repeat(filled) + chalk.gray('░').repeat(empty);
    const percentStr = `${percentage.toFixed(1)}%`;
    
    return `[${bar}] ${percentStr}`;
  }

  private displayTasksByCategory(): void {
    console.log(chalk.blue.bold('📊 Progress by Category:'));
    console.log();

    const categories = new Map<string, Task[]>();
    
    for (const task of this.tasks.values()) {
      if (!categories.has(task.category)) {
        categories.set(task.category, []);
      }
      categories.get(task.category)!.push(task);
    }

    const categoryTable = new Table({
      head: ['Category', 'Progress', 'Status', 'Files Affected'],
      style: { head: ['cyan'] },
      colWidths: [20, 25, 25, 18]
    });

    for (const [category, tasks] of categories) {
      const completed = tasks.filter(t => t.status === 'completed').length;
      const progress = (completed / tasks.length) * 100;
      const progressBar = this.createMiniProgressBar(progress);
      
      const statusCounts = {
        completed: tasks.filter(t => t.status === 'completed').length,
        inProgress: tasks.filter(t => t.status === 'in-progress').length,
        pending: tasks.filter(t => t.status === 'pending').length,
        blocked: tasks.filter(t => t.status === 'blocked').length
      };
      
      const statusStr = [
        statusCounts.completed > 0 ? chalk.green(`✓${statusCounts.completed}`) : '',
        statusCounts.inProgress > 0 ? chalk.yellow(`⚡${statusCounts.inProgress}`) : '',
        statusCounts.pending > 0 ? chalk.gray(`○${statusCounts.pending}`) : '',
        statusCounts.blocked > 0 ? chalk.red(`✗${statusCounts.blocked}`) : ''
      ].filter(s => s).join(' ');
      
      const totalFiles = tasks.reduce((sum, t) => sum + (t.files || 0), 0);
      
      categoryTable.push([
        category,
        progressBar,
        statusStr,
        totalFiles.toString()
      ]);
    }

    console.log(categoryTable.toString());
    console.log();
  }

  private createMiniProgressBar(percentage: number): string {
    const width = 15;
    const filled = Math.round((percentage / 100) * width);
    const empty = width - filled;
    
    const bar = chalk.green('▰').repeat(filled) + chalk.gray('▱').repeat(empty);
    return `${bar} ${percentage.toFixed(0)}%`;
  }

  private displayCurrentSprint(): void {
    console.log(chalk.blue.bold('🎯 Current Sprint (Active & Next Tasks):'));
    console.log();

    const sprintTable = new Table({
      head: ['Task', 'Priority', 'Status', 'Est. Hours', 'Files'],
      style: { head: ['cyan'] },
      colWidths: [40, 12, 15, 12, 10]
    });

    const activeTasks = Array.from(this.tasks.values())
      .filter(t => t.status === 'in-progress' || 
                   (t.status === 'pending' && t.priority === 'critical'))
      .sort((a, b) => {
        const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      })
      .slice(0, 5);

    for (const task of activeTasks) {
      const priorityColor = {
        critical: chalk.red,
        high: chalk.yellow,
        medium: chalk.blue,
        low: chalk.gray
      }[task.priority];

      const statusIcon = {
        'in-progress': chalk.yellow('⚡'),
        'pending': chalk.gray('○'),
        'completed': chalk.green('✓'),
        'blocked': chalk.red('✗')
      }[task.status];

      sprintTable.push([
        task.description,
        priorityColor(task.priority.toUpperCase()),
        `${statusIcon} ${task.status}`,
        `${task.estimatedHours}h`,
        task.files?.toString() || '0'
      ]);
    }

    console.log(sprintTable.toString());
    console.log();
  }

  private displayFilesImpact(): void {
    console.log(chalk.blue.bold('📁 Files Impact Summary:'));
    console.log();

    const impactTable = new Table({
      head: ['Status', 'Files', 'Changes', 'Percentage'],
      style: { head: ['cyan'] },
      colWidths: [15, 15, 15, 15]
    });

    const tasksArray = Array.from(this.tasks.values());
    
    const completedFiles = tasksArray
      .filter(t => t.status === 'completed')
      .reduce((sum, t) => sum + (t.files || 0), 0);
    
    const inProgressFiles = tasksArray
      .filter(t => t.status === 'in-progress')
      .reduce((sum, t) => sum + (t.files || 0), 0);
    
    const pendingFiles = tasksArray
      .filter(t => t.status === 'pending')
      .reduce((sum, t) => sum + (t.files || 0), 0);
    
    const totalFiles = completedFiles + inProgressFiles + pendingFiles;
    
    const completedChanges = tasksArray
      .filter(t => t.status === 'completed')
      .reduce((sum, t) => sum + (t.changes || 0), 0);

    impactTable.push(
      [
        chalk.green('Completed'),
        completedFiles.toString(),
        completedChanges.toString(),
        `${((completedFiles / totalFiles) * 100).toFixed(1)}%`
      ],
      [
        chalk.yellow('In Progress'),
        inProgressFiles.toString(),
        '~3000',
        `${((inProgressFiles / totalFiles) * 100).toFixed(1)}%`
      ],
      [
        chalk.gray('Pending'),
        pendingFiles.toString(),
        '0',
        `${((pendingFiles / totalFiles) * 100).toFixed(1)}%`
      ],
      [
        chalk.bold('TOTAL'),
        chalk.bold(totalFiles.toString()),
        chalk.bold((completedChanges + 3000).toString()),
        chalk.bold('100.0%')
      ]
    );

    console.log(impactTable.toString());
    console.log();
  }

  public async updateTask(taskId: string, updates: Partial<Task>): Promise<void> {
    if (this.tasks.has(taskId)) {
      const task = this.tasks.get(taskId)!;
      this.tasks.set(taskId, { ...task, ...updates });
      
      if (updates.status === 'completed' && !task.completedAt) {
        this.tasks.get(taskId)!.completedAt = new Date();
      }
      
      await this.saveProgress();
    }
  }

  public async runCheckin(): Promise<void> {
    const spinner = ora('Generating progress report...').start();
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    spinner.succeed('Report generated!');
    
    this.displayDashboard();
    
    // Show recommendations
    console.log(boxen(
      chalk.yellow.bold('📋 NEXT STEPS & RECOMMENDATIONS:\n\n') +
      chalk.white('1. ') + chalk.red.bold('CRITICAL: ') + 
        chalk.white('Remove jQuery dependencies (blocking modern features)\n') +
      chalk.white('2. ') + chalk.yellow.bold('HIGH: ') + 
        chalk.white('Complete console.log replacement (in progress)\n') +
      chalk.white('3. ') + chalk.yellow.bold('HIGH: ') + 
        chalk.white('Add TypeScript strict mode for type safety\n') +
      chalk.white('4. ') + chalk.blue.bold('MEDIUM: ') + 
        chalk.white('Set up CI/CD pipeline for automated testing\n\n') +
      chalk.gray('Run ') + chalk.cyan('npm run modernize:safe') + 
        chalk.gray(' to start automated fixes'),
      {
        padding: 1,
        borderStyle: 'round',
        borderColor: 'yellow'
      }
    ));
  }
}

// CLI Commands
async function main() {
  const tracker = new ModernizationProgressTracker();
  const command = process.argv[2];

  switch (command) {
    case 'checkin':
    case 'status':
      await tracker.runCheckin();
      break;
      
    case 'update':
      const taskId = process.argv[3];
      const status = process.argv[4] as any;
      if (taskId && status) {
        await tracker.updateTask(taskId, { status });
        console.log(chalk.green(`✓ Updated task ${taskId} to ${status}`));
        await tracker.runCheckin();
      } else {
        console.log(chalk.red('Usage: tracker update <task-id> <status>'));
      }
      break;
      
    case 'help':
      console.log(`
${chalk.blue.bold('Modernization Progress Tracker')}

${chalk.white('Commands:')}
  ${chalk.cyan('checkin')}  - Display current progress and recommendations
  ${chalk.cyan('status')}   - Same as checkin
  ${chalk.cyan('update')}   - Update task status: update <task-id> <status>
  ${chalk.cyan('help')}     - Show this help message

${chalk.white('Status values:')}
  pending, in-progress, completed, blocked

${chalk.white('Example:')}
  ${chalk.gray('$')} tracker checkin
  ${chalk.gray('$')} tracker update fix-console-logs completed
`);
      break;
      
    default:
      await tracker.runCheckin();
  }
}

if (require.main === module) {
  main().catch(console.error);
}

export { ModernizationProgressTracker };