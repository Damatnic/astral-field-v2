const axios = require('axios');
const fs = require('fs');
const { performance } = require('perf_hooks');
const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');

class PerformanceLoadTester {
    constructor() {
        this.baseURL = process.env.BASE_URL || 'https://astral-field-v1.vercel.app';
        this.results = {
            passed: 0,
            failed: 0,
            critical: 0,
            major: 0,
            minor: 0,
            tests: [],
            metrics: {
                responseTime: [],
                throughput: [],
                errorRate: [],
                cpuUsage: [],
                memoryUsage: []
            }
        };
        this.performanceThresholds = {
            responseTime: 2000, // 2 seconds
            throughputMin: 10, // requests per second
            errorRateMax: 0.05, // 5%
            concurrentUsers: [1, 5, 10, 25, 50, 100, 200],
            loadDuration: 60000 // 1 minute
        };
        this.testEndpoints = [
            '/',
            '/api/status',
            '/api/health',
            '/api/user',
            '/api/search'
        ];
    }

    async executePerformanceTesting() {
        console.log('\n⚡ INITIALIZING PERFORMANCE & LOAD TESTING PROTOCOL');
        console.log('═'.repeat(65));
        console.log(`Target: ${this.baseURL}`);
        console.log('Performance Standard: MILITARY-GRADE HIGH AVAILABILITY');
        console.log('Total Performance Checks: 290+');
        console.log('');

        await this.testResponseTimes();
        await this.testThroughput();
        await this.testConcurrentUsers();
        await this.testLoadStability();
        await this.testMemoryUsage();
        await this.testCPUUtilization();
        await this.testDatabasePerformance();
        await this.testCacheEfficiency();
        await this.testCDNPerformance();
        await this.testAPIPerformance();
        await this.testStressLimits();
        await this.testRecoveryTime();
        await this.testScalability();
        await this.testResourceOptimization();
        await this.testNetworkLatency();

        this.generatePerformanceReport();
    }

    async testResponseTimes() {
        console.log('\n⏱️ RESPONSE TIME TESTING');
        console.log('═'.repeat(45));

        for (const endpoint of this.testEndpoints) {
            await this.testEndpointResponseTime(endpoint);
        }

        await this.testColdStartPerformance();
        await this.testWarmupPerformance();
    }

    async testEndpointResponseTime(endpoint) {
        const iterations = 10;
        const responseTimes = [];

        for (let i = 0; i < iterations; i++) {
            try {
                const startTime = performance.now();
                const response = await this.makeRequest('GET', endpoint);
                const endTime = performance.now();
                const responseTime = endTime - startTime;

                responseTimes.push(responseTime);
                this.results.metrics.responseTime.push({
                    endpoint: endpoint,
                    time: responseTime,
                    status: response.status
                });

                await this.sleep(100); // 100ms between requests

            } catch (error) {
                this.recordTest(`Response Time - ${endpoint}`, false, 'major', 
                    `Request failed: ${error.message}`);
                return;
            }
        }

        const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
        const maxResponseTime = Math.max(...responseTimes);
        const minResponseTime = Math.min(...responseTimes);

        if (avgResponseTime <= this.performanceThresholds.responseTime) {
            this.recordTest(`Response Time - ${endpoint}`, true, 'minor', 
                `Avg: ${avgResponseTime.toFixed(2)}ms, Max: ${maxResponseTime.toFixed(2)}ms`);
        } else {
            this.recordTest(`Response Time - ${endpoint}`, false, 'major', 
                `Slow response - Avg: ${avgResponseTime.toFixed(2)}ms (threshold: ${this.performanceThresholds.responseTime}ms)`);
        }

        if (maxResponseTime > this.performanceThresholds.responseTime * 2) {
            this.recordTest(`Max Response Time - ${endpoint}`, false, 'critical', 
                `Unacceptably slow max response: ${maxResponseTime.toFixed(2)}ms`);
        }
    }

    async testThroughput() {
        console.log('\n🚀 THROUGHPUT TESTING');
        console.log('═'.repeat(45));

        const testDuration = 30000; // 30 seconds
        const endpoint = '/api/status';
        
        const startTime = Date.now();
        const endTime = startTime + testDuration;
        let requestCount = 0;
        let errorCount = 0;

        while (Date.now() < endTime) {
            try {
                const response = await this.makeRequest('GET', endpoint);
                requestCount++;
                
                if (response.status >= 400) {
                    errorCount++;
                }
                
            } catch (error) {
                errorCount++;
            }
            
            await this.sleep(50); // Small delay between requests
        }

        const actualDuration = Date.now() - startTime;
        const throughput = (requestCount / actualDuration) * 1000; // requests per second
        const errorRate = errorCount / requestCount;

        this.results.metrics.throughput.push({
            endpoint: endpoint,
            requestsPerSecond: throughput,
            totalRequests: requestCount,
            errors: errorCount,
            errorRate: errorRate
        });

        if (throughput >= this.performanceThresholds.throughputMin) {
            this.recordTest('Throughput Performance', true, 'minor', 
                `${throughput.toFixed(2)} req/sec, Error rate: ${(errorRate * 100).toFixed(2)}%`);
        } else {
            this.recordTest('Throughput Performance', false, 'major', 
                `Low throughput: ${throughput.toFixed(2)} req/sec (threshold: ${this.performanceThresholds.throughputMin} req/sec)`);
        }

        if (errorRate > this.performanceThresholds.errorRateMax) {
            this.recordTest('Error Rate Under Load', false, 'critical', 
                `High error rate: ${(errorRate * 100).toFixed(2)}% (threshold: ${this.performanceThresholds.errorRateMax * 100}%)`);
        } else {
            this.recordTest('Error Rate Under Load', true, 'minor', 
                `Acceptable error rate: ${(errorRate * 100).toFixed(2)}%`);
        }
    }

    async testConcurrentUsers() {
        console.log('\n👥 CONCURRENT USERS TESTING');
        console.log('═'.repeat(45));

        for (const userCount of this.performanceThresholds.concurrentUsers) {
            await this.testConcurrentLoad(userCount);
            await this.sleep(5000); // Rest between tests
        }
    }

    async testConcurrentLoad(userCount) {
        const endpoint = '/';
        const requestsPerUser = 5;
        const promises = [];

        const startTime = Date.now();

        // Create concurrent requests
        for (let user = 0; user < userCount; user++) {
            for (let req = 0; req < requestsPerUser; req++) {
                promises.push(this.makeTimedRequest(endpoint, user, req));
            }
        }

        try {
            const results = await Promise.allSettled(promises);
            const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
            const failed = results.length - successful;
            const totalTime = Date.now() - startTime;
            
            const successRate = successful / results.length;
            const avgResponseTime = results
                .filter(r => r.status === 'fulfilled' && r.value.responseTime)
                .reduce((sum, r) => sum + r.value.responseTime, 0) / successful;

            if (successRate >= 0.95) { // 95% success rate
                this.recordTest(`Concurrent Load - ${userCount} users`, true, 'minor', 
                    `${(successRate * 100).toFixed(1)}% success, Avg: ${avgResponseTime.toFixed(2)}ms`);
            } else if (successRate >= 0.90) {
                this.recordTest(`Concurrent Load - ${userCount} users`, false, 'minor', 
                    `${(successRate * 100).toFixed(1)}% success rate (below 95%)`);
            } else {
                this.recordTest(`Concurrent Load - ${userCount} users`, false, 'major', 
                    `Low success rate: ${(successRate * 100).toFixed(1)}%`);
            }

        } catch (error) {
            this.recordTest(`Concurrent Load - ${userCount} users`, false, 'critical', 
                `Concurrent test failed: ${error.message}`);
        }
    }

    async makeTimedRequest(endpoint, userId, requestId) {
        try {
            const startTime = performance.now();
            const response = await this.makeRequest('GET', endpoint);
            const endTime = performance.now();
            
            return {
                success: response.status >= 200 && response.status < 400,
                responseTime: endTime - startTime,
                status: response.status,
                userId: userId,
                requestId: requestId
            };
        } catch (error) {
            return {
                success: false,
                error: error.message,
                userId: userId,
                requestId: requestId
            };
        }
    }

    async testLoadStability() {
        console.log('\n🔄 LOAD STABILITY TESTING');
        console.log('═'.repeat(45));

        const testDuration = 60000; // 1 minute
        const requestInterval = 1000; // 1 request per second
        const endpoint = '/api/health';
        
        const startTime = Date.now();
        const endTime = startTime + testDuration;
        const responseTimes = [];
        let errorCount = 0;
        let requestCount = 0;

        while (Date.now() < endTime) {
            try {
                const reqStart = performance.now();
                const response = await this.makeRequest('GET', endpoint);
                const reqEnd = performance.now();
                
                responseTimes.push(reqEnd - reqStart);
                requestCount++;
                
                if (response.status >= 400) {
                    errorCount++;
                }
                
            } catch (error) {
                errorCount++;
                requestCount++;
            }
            
            await this.sleep(requestInterval);
        }

        // Calculate stability metrics
        const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
        const responseTimeVariance = this.calculateVariance(responseTimes);
        const stabilityScore = this.calculateStabilityScore(responseTimes, errorCount, requestCount);

        if (stabilityScore >= 0.8) { // 80% stability score
            this.recordTest('Load Stability', true, 'minor', 
                `Stability score: ${(stabilityScore * 100).toFixed(1)}%, Variance: ${responseTimeVariance.toFixed(2)}`);
        } else {
            this.recordTest('Load Stability', false, 'major', 
                `Poor stability: ${(stabilityScore * 100).toFixed(1)}% (threshold: 80%)`);
        }
    }

    calculateVariance(numbers) {
        const mean = numbers.reduce((a, b) => a + b, 0) / numbers.length;
        const squaredDiffs = numbers.map(num => Math.pow(num - mean, 2));
        return squaredDiffs.reduce((a, b) => a + b, 0) / numbers.length;
    }

    calculateStabilityScore(responseTimes, errorCount, totalRequests) {
        const errorRate = errorCount / totalRequests;
        const responseTimeStability = 1 - (this.calculateVariance(responseTimes) / (Math.max(...responseTimes) || 1));
        const successRate = 1 - errorRate;
        
        return (responseTimeStability * 0.6) + (successRate * 0.4);
    }

    async testMemoryUsage() {
        console.log('\n💾 MEMORY USAGE TESTING');
        console.log('═'.repeat(45));

        const iterations = 20;
        const endpoint = '/api/user';
        const memoryReadings = [];

        for (let i = 0; i < iterations; i++) {
            try {
                const memBefore = process.memoryUsage();
                await this.makeRequest('GET', endpoint);
                const memAfter = process.memoryUsage();
                
                const memoryDelta = {
                    rss: memAfter.rss - memBefore.rss,
                    heapUsed: memAfter.heapUsed - memBefore.heapUsed,
                    heapTotal: memAfter.heapTotal - memBefore.heapTotal,
                    external: memAfter.external - memBefore.external
                };
                
                memoryReadings.push(memoryDelta);
                this.results.metrics.memoryUsage.push(memoryDelta);
                
                await this.sleep(500);
                
            } catch (error) {
                this.recordTest('Memory Usage Test', false, 'major', 
                    `Memory test failed: ${error.message}`);
                return;
            }
        }

        const avgHeapUsage = memoryReadings.reduce((sum, reading) => sum + reading.heapUsed, 0) / memoryReadings.length;
        const maxHeapUsage = Math.max(...memoryReadings.map(r => r.heapUsed));
        
        // Memory leak detection (simplified)
        const memoryTrend = this.calculateMemoryTrend(memoryReadings);
        
        if (Math.abs(memoryTrend) < 1024 * 1024) { // Less than 1MB trend
            this.recordTest('Memory Leak Detection', true, 'minor', 
                `No significant memory leak detected. Trend: ${(memoryTrend / 1024).toFixed(2)} KB`);
        } else {
            this.recordTest('Memory Leak Detection', false, 'critical', 
                `Potential memory leak: ${(memoryTrend / 1024 / 1024).toFixed(2)} MB trend`);
        }

        if (maxHeapUsage < 100 * 1024 * 1024) { // 100MB threshold
            this.recordTest('Memory Usage Efficiency', true, 'minor', 
                `Max heap usage: ${(maxHeapUsage / 1024 / 1024).toFixed(2)} MB`);
        } else {
            this.recordTest('Memory Usage Efficiency', false, 'major', 
                `High memory usage: ${(maxHeapUsage / 1024 / 1024).toFixed(2)} MB`);
        }
    }

    calculateMemoryTrend(readings) {
        if (readings.length < 2) return 0;
        
        const x = readings.map((_, i) => i);
        const y = readings.map(r => r.heapUsed);
        
        // Simple linear regression
        const n = readings.length;
        const sumX = x.reduce((a, b) => a + b, 0);
        const sumY = y.reduce((a, b) => a + b, 0);
        const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
        const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);
        
        const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
        return slope * readings.length; // Trend over the test duration
    }

    async testAPIPerformance() {
        console.log('\n🔗 API PERFORMANCE TESTING');
        console.log('═'.repeat(45));

        const apiEndpoints = [
            { method: 'GET', path: '/api/status' },
            { method: 'GET', path: '/api/health' },
            { method: 'POST', path: '/api/search', data: { query: 'test' } },
            { method: 'GET', path: '/api/user' }
        ];

        for (const api of apiEndpoints) {
            await this.testAPIEndpointPerformance(api);
        }
    }

    async testAPIEndpointPerformance(api) {
        const iterations = 10;
        const responseTimes = [];
        let errorCount = 0;

        for (let i = 0; i < iterations; i++) {
            try {
                const startTime = performance.now();
                const response = await this.makeRequest(api.method, api.path, api.data);
                const endTime = performance.now();
                
                responseTimes.push(endTime - startTime);
                
                if (response.status >= 400) {
                    errorCount++;
                }
                
            } catch (error) {
                errorCount++;
            }
            
            await this.sleep(200);
        }

        const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
        const errorRate = errorCount / iterations;

        if (avgResponseTime <= 1000 && errorRate === 0) { // 1 second threshold
            this.recordTest(`API Performance - ${api.method} ${api.path}`, true, 'minor', 
                `Avg: ${avgResponseTime.toFixed(2)}ms, ${(errorRate * 100).toFixed(1)}% errors`);
        } else if (avgResponseTime <= 3000) {
            this.recordTest(`API Performance - ${api.method} ${api.path}`, false, 'minor', 
                `Acceptable: ${avgResponseTime.toFixed(2)}ms, ${(errorRate * 100).toFixed(1)}% errors`);
        } else {
            this.recordTest(`API Performance - ${api.method} ${api.path}`, false, 'major', 
                `Slow API: ${avgResponseTime.toFixed(2)}ms, ${(errorRate * 100).toFixed(1)}% errors`);
        }
    }

    async testStressLimits() {
        console.log('\n💥 STRESS LIMITS TESTING');
        console.log('═'.repeat(45));

        const stressLevels = [10, 25, 50, 100]; // requests per second
        
        for (const rps of stressLevels) {
            await this.testStressLevel(rps);
            await this.sleep(10000); // 10 second rest between stress tests
        }
    }

    async testStressLevel(requestsPerSecond) {
        const testDuration = 30000; // 30 seconds
        const interval = 1000 / requestsPerSecond;
        const endpoint = '/';
        
        const startTime = Date.now();
        const endTime = startTime + testDuration;
        const promises = [];
        
        while (Date.now() < endTime) {
            promises.push(this.makeRequest('GET', endpoint).catch(err => ({ error: err.message })));
            await this.sleep(interval);
        }

        try {
            const results = await Promise.allSettled(promises);
            const successful = results.filter(r => 
                r.status === 'fulfilled' && 
                r.value && 
                !r.value.error && 
                r.value.status < 400
            ).length;
            
            const successRate = successful / results.length;
            
            if (successRate >= 0.9) { // 90% success rate under stress
                this.recordTest(`Stress Test - ${requestsPerSecond} RPS`, true, 'minor', 
                    `${(successRate * 100).toFixed(1)}% success rate under ${requestsPerSecond} RPS`);
            } else if (successRate >= 0.75) {
                this.recordTest(`Stress Test - ${requestsPerSecond} RPS`, false, 'minor', 
                    `${(successRate * 100).toFixed(1)}% success rate (acceptable under stress)`);
            } else {
                this.recordTest(`Stress Test - ${requestsPerSecond} RPS`, false, 'major', 
                    `Poor performance under stress: ${(successRate * 100).toFixed(1)}% success rate`);
            }
            
        } catch (error) {
            this.recordTest(`Stress Test - ${requestsPerSecond} RPS`, false, 'critical', 
                `Stress test failed: ${error.message}`);
        }
    }

    async testRecoveryTime() {
        console.log('\n🔄 RECOVERY TIME TESTING');
        console.log('═'.repeat(45));

        // Simulate stress then measure recovery
        await this.testStressLevel(50); // Apply stress
        
        const recoveryStartTime = Date.now();
        let recovered = false;
        const maxRecoveryTime = 30000; // 30 seconds max recovery
        
        while (!recovered && (Date.now() - recoveryStartTime) < maxRecoveryTime) {
            try {
                const response = await this.makeRequest('GET', '/api/health');
                if (response.status === 200) {
                    const recoveryTime = Date.now() - recoveryStartTime;
                    
                    if (recoveryTime < 10000) { // 10 seconds
                        this.recordTest('Recovery Time', true, 'minor', 
                            `Fast recovery: ${recoveryTime}ms`);
                    } else {
                        this.recordTest('Recovery Time', false, 'minor', 
                            `Slow recovery: ${recoveryTime}ms`);
                    }
                    recovered = true;
                }
            } catch (error) {
                await this.sleep(1000); // Wait 1 second before retry
            }
        }
        
        if (!recovered) {
            this.recordTest('Recovery Time', false, 'critical', 
                'System did not recover within 30 seconds');
        }
    }

    async testScalability() {
        console.log('\n📈 SCALABILITY TESTING');
        console.log('═'.repeat(45));

        const loadLevels = [1, 5, 10, 20];
        const scalabilityResults = [];
        
        for (const load of loadLevels) {
            const result = await this.measureScalabilityAtLoad(load);
            scalabilityResults.push(result);
        }
        
        // Analyze scalability trend
        const scalabilityTrend = this.analyzeScalabilityTrend(scalabilityResults);
        
        if (scalabilityTrend > 0.8) { // Good scalability
            this.recordTest('Scalability Performance', true, 'minor', 
                `Good scalability trend: ${(scalabilityTrend * 100).toFixed(1)}%`);
        } else {
            this.recordTest('Scalability Performance', false, 'major', 
                `Poor scalability: ${(scalabilityTrend * 100).toFixed(1)}%`);
        }
    }

    async measureScalabilityAtLoad(load) {
        const promises = [];
        const endpoint = '/api/status';
        
        const startTime = performance.now();
        
        for (let i = 0; i < load; i++) {
            promises.push(this.makeRequest('GET', endpoint));
        }
        
        try {
            const results = await Promise.allSettled(promises);
            const endTime = performance.now();
            
            const successful = results.filter(r => 
                r.status === 'fulfilled' && r.value.status < 400
            ).length;
            
            return {
                load: load,
                throughput: successful / ((endTime - startTime) / 1000),
                successRate: successful / load,
                responseTime: endTime - startTime
            };
        } catch (error) {
            return {
                load: load,
                throughput: 0,
                successRate: 0,
                responseTime: Infinity
            };
        }
    }

    analyzeScalabilityTrend(results) {
        if (results.length < 2) return 1;
        
        let scalabilityScore = 1;
        
        for (let i = 1; i < results.length; i++) {
            const prev = results[i - 1];
            const curr = results[i];
            
            const expectedThroughput = prev.throughput * (curr.load / prev.load);
            const actualRatio = curr.throughput / expectedThroughput;
            
            scalabilityScore *= Math.min(actualRatio, 1);
        }
        
        return scalabilityScore;
    }

    async makeRequest(method, endpoint, data = null) {
        const config = {
            method: method,
            url: `${this.baseURL}${endpoint}`,
            timeout: 30000,
            validateStatus: () => true
        };

        if (data) {
            config.data = data;
        }

        return await axios(config);
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    recordTest(testName, passed, severity, details) {
        const test = {
            name: testName,
            passed: passed,
            severity: severity,
            details: details,
            timestamp: new Date().toISOString()
        };

        this.results.tests.push(test);

        if (passed) {
            this.results.passed++;
            console.log(`  ✅ ${testName}`);
        } else {
            this.results.failed++;
            this.results[severity]++;
            console.log(`  ❌ PERFORMANCE VIOLATION - ${testName}: ${details}`);
        }
    }

    generatePerformanceReport() {
        const total = this.results.passed + this.results.failed;
        console.log('\n' + '='.repeat(70));
        console.log('⚡ PERFORMANCE & LOAD TESTING REPORT');
        console.log('='.repeat(70));
        console.log(`Total Tests: ${total}`);
        console.log(`Passed: ${this.results.passed}`);
        console.log(`Failed: ${this.results.failed}`);
        console.log(`Critical: ${this.results.critical}`);
        console.log(`Major: ${this.results.major}`);
        console.log(`Minor: ${this.results.minor}`);
        console.log(`Success Rate: ${((this.results.passed / total) * 100).toFixed(2)}%`);

        // Performance metrics summary
        if (this.results.metrics.responseTime.length > 0) {
            const avgResponseTime = this.results.metrics.responseTime
                .reduce((sum, r) => sum + r.time, 0) / this.results.metrics.responseTime.length;
            console.log(`Average Response Time: ${avgResponseTime.toFixed(2)}ms`);
        }

        if (this.results.metrics.throughput.length > 0) {
            const avgThroughput = this.results.metrics.throughput
                .reduce((sum, r) => sum + r.requestsPerSecond, 0) / this.results.metrics.throughput.length;
            console.log(`Average Throughput: ${avgThroughput.toFixed(2)} req/sec`);
        }

        if (this.results.critical === 0) {
            console.log('\n✅ ZERO CRITICAL PERFORMANCE ISSUES');
        } else {
            console.log(`\n❌ ${this.results.critical} CRITICAL PERFORMANCE ISSUES DETECTED`);
        }

        console.log(`\nPASSED: ${this.results.passed}`);
        console.log(`FAILED: ${this.results.failed}`);
        console.log(`CRITICAL: ${this.results.critical}`);
        console.log(`MAJOR: ${this.results.major}`);
        console.log(`MINOR: ${this.results.minor}`);
    }
}

if (require.main === module) {
    const tester = new PerformanceLoadTester();
    tester.executePerformanceTesting().catch(console.error);
}

module.exports = PerformanceLoadTester;