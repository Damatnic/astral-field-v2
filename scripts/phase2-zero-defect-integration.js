const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

class Phase2ZeroDefectIntegrator {
    constructor() {
        this.testResults = {
            crossBrowser: { passed: 0, failed: 0, critical: 0, major: 0, minor: 0, tests: [] },
            mobileResponsive: { passed: 0, failed: 0, critical: 0, major: 0, minor: 0, tests: [] },
            errorEdgeCase: { passed: 0, failed: 0, critical: 0, major: 0, minor: 0, tests: [] },
            deploymentEnvironment: { passed: 0, failed: 0, critical: 0, major: 0, minor: 0, tests: [] }
        };
        this.totalChecks = 0;
        this.startTime = new Date();
        this.phase2Modules = [
            { name: 'Cross-Browser Compatibility', script: 'cross-browser-testing.js', expectedChecks: 150 },
            { name: 'Mobile & Responsive', script: 'mobile-responsive-testing.js', expectedChecks: 140 },
            { name: 'Error Handling & Edge Cases', script: 'error-edge-case-testing.js', expectedChecks: 130 },
            { name: 'Deployment & Environment', script: 'deployment-environment-testing.js', expectedChecks: 120 }
        ];
    }

    async executePhase2Testing() {
        console.log('\n🚀 PHASE 2 ZERO-DEFECT INTEGRATION PROTOCOL');
        console.log('='.repeat(60));
        console.log('TARGET: 1,444 Total Checks (540 Phase 2 + 904 Phase 1)');
        console.log('STANDARD: Military-Grade Zero Tolerance for Critical Issues');
        console.log('SCOPE: Cross-Platform & Environment Validation');
        console.log('='.repeat(60));

        for (const testModule of this.phase2Modules) {
            await this.executeModule(testModule);
        }

        await this.generateComprehensiveCertification();
    }

    async executeModule(module) {
        console.log(`\n📋 EXECUTING: ${module.name}`);
        console.log('-'.repeat(40));
        
        try {
            const scriptPath = path.join(__dirname, module.script);
            
            if (!fs.existsSync(scriptPath)) {
                throw new Error(`Module script not found: ${module.script}`);
            }

            const result = await this.runModuleScript(scriptPath);
            this.processModuleResults(module, result);
            
            console.log(`✅ ${module.name}: ${result.passed}/${result.total} checks passed`);
            
            if (result.critical > 0) {
                console.log(`🚨 CRITICAL FAILURES: ${result.critical}`);
            }
            
        } catch (error) {
            console.error(`❌ Module execution failed: ${module.name}`, error.message);
            this.recordModuleFailure(module, error);
        }
    }

    async runModuleScript(scriptPath) {
        return new Promise((resolve, reject) => {
            const child = spawn('node', [scriptPath], {
                stdio: ['pipe', 'pipe', 'pipe'],
                env: { ...process.env, NODE_ENV: 'test' }
            });

            let output = '';
            let errorOutput = '';

            child.stdout.on('data', (data) => {
                output += data.toString();
            });

            child.stderr.on('data', (data) => {
                errorOutput += data.toString();
            });

            child.on('close', (code) => {
                if (code === 0) {
                    try {
                        const results = this.parseModuleOutput(output);
                        resolve(results);
                    } catch (parseError) {
                        reject(new Error(`Failed to parse module output: ${parseError.message}`));
                    }
                } else {
                    reject(new Error(`Module exited with code ${code}: ${errorOutput}`));
                }
            });

            child.on('error', (error) => {
                reject(error);
            });
        });
    }

    parseModuleOutput(output) {
        const lines = output.split('\n');
        const results = { passed: 0, failed: 0, total: 0, critical: 0, major: 0, minor: 0, details: [] };

        for (const line of lines) {
            if (line.includes('PASSED:')) {
                const match = line.match(/PASSED:\s*(\d+)/);
                if (match) results.passed = parseInt(match[1]);
            }
            if (line.includes('FAILED:')) {
                const match = line.match(/FAILED:\s*(\d+)/);
                if (match) results.failed = parseInt(match[1]);
            }
            if (line.includes('CRITICAL:')) {
                const match = line.match(/CRITICAL:\s*(\d+)/);
                if (match) results.critical = parseInt(match[1]);
            }
            if (line.includes('MAJOR:')) {
                const match = line.match(/MAJOR:\s*(\d+)/);
                if (match) results.major = parseInt(match[1]);
            }
            if (line.includes('MINOR:')) {
                const match = line.match(/MINOR:\s*(\d+)/);
                if (match) results.minor = parseInt(match[1]);
            }
        }

        results.total = results.passed + results.failed;
        return results;
    }

    processModuleResults(module, result) {
        const moduleKey = this.getModuleKey(module.name);
        this.testResults[moduleKey] = {
            passed: result.passed,
            failed: result.failed,
            critical: result.critical,
            major: result.major,
            minor: result.minor,
            total: result.total,
            tests: result.details || []
        };

        this.totalChecks += result.total;
    }

    getModuleKey(moduleName) {
        const keyMap = {
            'Cross-Browser Compatibility': 'crossBrowser',
            'Mobile & Responsive': 'mobileResponsive',
            'Error Handling & Edge Cases': 'errorEdgeCase',
            'Deployment & Environment': 'deploymentEnvironment'
        };
        return keyMap[moduleName] || 'unknown';
    }

    recordModuleFailure(module, error) {
        const moduleKey = this.getModuleKey(module.name);
        this.testResults[moduleKey] = {
            passed: 0,
            failed: module.expectedChecks,
            critical: module.expectedChecks,
            major: 0,
            minor: 0,
            total: module.expectedChecks,
            error: error.message,
            tests: []
        };
        this.totalChecks += module.expectedChecks;
    }

    async generateComprehensiveCertification() {
        const endTime = new Date();
        const duration = Math.round((endTime - this.startTime) / 1000);

        const totals = this.calculateTotals();
        const phase1Checks = 904; // From Phase 1
        const grandTotal = totals.total + phase1Checks;

        console.log('\n' + '='.repeat(70));
        console.log('📊 PHASE 2 ZERO-DEFECT CERTIFICATION REPORT');
        console.log('='.repeat(70));

        console.log('\n🎯 PHASE 2 EXECUTION SUMMARY:');
        console.log(`   Cross-Browser Compatibility: ${this.testResults.crossBrowser.passed}/${this.testResults.crossBrowser.total} passed`);
        console.log(`   Mobile & Responsive:         ${this.testResults.mobileResponsive.passed}/${this.testResults.mobileResponsive.total} passed`);
        console.log(`   Error Handling & Edge Cases: ${this.testResults.errorEdgeCase.passed}/${this.testResults.errorEdgeCase.total} passed`);
        console.log(`   Deployment & Environment:    ${this.testResults.deploymentEnvironment.passed}/${this.testResults.deploymentEnvironment.total} passed`);

        console.log('\n📈 COMPREHENSIVE TOTALS:');
        console.log(`   Phase 1 (Foundation):        904 checks`);
        console.log(`   Phase 2 (Cross-Platform):    ${totals.total} checks`);
        console.log(`   GRAND TOTAL:                 ${grandTotal} / 1,444 checks`);

        console.log('\n🔍 QUALITY METRICS:');
        console.log(`   Success Rate:                ${((totals.passed / totals.total) * 100).toFixed(2)}%`);
        console.log(`   Critical Failures:           ${totals.critical}`);
        console.log(`   Major Issues:                ${totals.major}`);
        console.log(`   Minor Issues:                ${totals.minor}`);
        console.log(`   Execution Time:              ${duration} seconds`);

        const certificationStatus = this.determineCertificationStatus(totals);
        console.log(`\n🏆 CERTIFICATION STATUS:      ${certificationStatus}`);

        if (totals.critical === 0) {
            console.log('\n✅ ZERO-DEFECT STANDARD: ACHIEVED');
            console.log('   No critical failures detected across all Phase 2 modules');
        } else {
            console.log('\n❌ ZERO-DEFECT STANDARD: NOT ACHIEVED');
            console.log(`   ${totals.critical} critical failures require immediate attention`);
        }

        await this.generateDetailedReport(totals, grandTotal, duration);
    }

    calculateTotals() {
        const totals = { passed: 0, failed: 0, critical: 0, major: 0, minor: 0, total: 0 };

        Object.values(this.testResults).forEach(result => {
            totals.passed += result.passed;
            totals.failed += result.failed;
            totals.critical += result.critical;
            totals.major += result.major;
            totals.minor += result.minor;
            totals.total += result.total;
        });

        return totals;
    }

    determineCertificationStatus(totals) {
        if (totals.critical === 0 && totals.major === 0) {
            return 'GOLD - Zero Defects';
        } else if (totals.critical === 0) {
            return 'SILVER - Zero Critical';
        } else if (totals.critical <= 3) {
            return 'BRONZE - Minimal Critical';
        } else {
            return 'FAILED - Critical Issues';
        }
    }

    async generateDetailedReport(totals, grandTotal, duration) {
        const reportData = {
            timestamp: new Date().toISOString(),
            phase: 2,
            target: 'Cross-Platform & Environment Validation',
            execution: {
                duration: duration,
                totalChecks: totals.total,
                grandTotal: grandTotal,
                targetTotal: 1444
            },
            results: {
                passed: totals.passed,
                failed: totals.failed,
                critical: totals.critical,
                major: totals.major,
                minor: totals.minor,
                successRate: ((totals.passed / totals.total) * 100).toFixed(2)
            },
            modules: this.testResults,
            certification: {
                status: this.determineCertificationStatus(totals),
                zeroDefectAchieved: totals.critical === 0,
                readyForPhase3: totals.critical === 0 && totals.major <= 5
            }
        };

        const reportPath = path.join(__dirname, '..', 'PHASE2_CERTIFICATION_REPORT.json');
        fs.writeFileSync(reportPath, JSON.stringify(reportData, null, 2));

        console.log(`\n📄 Detailed report saved: ${reportPath}`);

        if (reportData.certification.readyForPhase3) {
            console.log('\n🚀 PHASE 3 READINESS: CONFIRMED');
            console.log('   Phase 2 quality standards met - ready for Advanced Quality & Compliance Testing');
        } else {
            console.log('\n⚠️  PHASE 3 READINESS: PENDING');
            console.log('   Address critical and major issues before proceeding to Phase 3');
        }
    }
}

if (require.main === module) {
    const integrator = new Phase2ZeroDefectIntegrator();
    integrator.executePhase2Testing().catch(console.error);
}

module.exports = Phase2ZeroDefectIntegrator;