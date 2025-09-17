/**
 * Memory Leak Detection and Memory Performance Testing
 * Monitors memory usage patterns and detects potential leaks
 */

const { performance } = require('perf_hooks');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

class MemoryTester {
  constructor(options = {}) {
    this.testDuration = options.testDuration || 600000; // 10 minutes
    this.samplingInterval = options.samplingInterval || 5000; // 5 seconds
    this.memoryThreshold = options.memoryThreshold || 512 * 1024 * 1024; // 512MB
    this.heapGrowthThreshold = options.heapGrowthThreshold || 50 * 1024 * 1024; // 50MB
    this.gcThreshold = options.gcThreshold || 10; // Maximum GC cycles per minute
    
    this.results = {
      memorySnapshots: [],
      heapSnapshots: [],
      gcEvents: [],
      leakDetection: {
        potentialLeaks: [],
        memoryGrowthTrend: [],
        suspiciousObjects: []
      },
      recommendations: []
    };
    
    this.isRunning = false;
    this.startTime = null;
    this.baseline = null;
  }

  async startMemoryTest() {
    console.log('🧠 Starting comprehensive memory testing');
    console.log(`⏱️ Test duration: ${this.testDuration / 1000} seconds`);
    console.log(`📊 Sampling interval: ${this.samplingInterval / 1000} seconds`);
    console.log(`🚨 Memory threshold: ${Math.round(this.memoryThreshold / 1024 / 1024)}MB`);
    
    this.isRunning = true;
    this.startTime = performance.now();
    
    // Force initial garbage collection
    if (global.gc) {
      global.gc();
    }
    
    // Take baseline measurement
    this.baseline = this.takeMemorySnapshot();
    console.log('📸 Baseline memory snapshot taken');
    
    // Start monitoring
    const monitoringPromise = this.startContinuousMonitoring();
    const stressTestPromise = this.runMemoryStressTests();
    
    // Run for specified duration
    setTimeout(() => {
      this.stopMemoryTest();
    }, this.testDuration);
    
    try {
      await Promise.all([monitoringPromise, stressTestPromise]);
    } catch (error) {
      console.error('Error during memory testing:', error);
    }
    
    await this.generateReport();
  }

  async startContinuousMonitoring() {
    const monitor = () => {
      if (!this.isRunning) return;
      
      const snapshot = this.takeMemorySnapshot();
      this.results.memorySnapshots.push(snapshot);
      
      // Detect potential leaks
      this.analyzeMemoryGrowth(snapshot);
      
      // Check thresholds
      this.checkMemoryThresholds(snapshot);
      
      // Schedule next monitoring cycle
      setTimeout(monitor, this.samplingInterval);
    };
    
    monitor();
  }

  takeMemorySnapshot() {
    const memoryUsage = process.memoryUsage();
    const timestamp = performance.now() - this.startTime;
    
    const snapshot = {
      timestamp,
      heapUsed: memoryUsage.heapUsed,
      heapTotal: memoryUsage.heapTotal,
      external: memoryUsage.external,
      rss: memoryUsage.rss,
      arrayBuffers: memoryUsage.arrayBuffers || 0
    };
    
    // Add heap statistics if available
    if (global.gc && process.binding && typeof v8 !== 'undefined') {
      try {
        const v8 = require('v8');
        const heapStats = v8.getHeapStatistics();
        snapshot.heapStatistics = {
          totalHeapSize: heapStats.total_heap_size,
          totalHeapSizeExecutable: heapStats.total_heap_size_executable,
          totalPhysicalSize: heapStats.total_physical_size,
          totalAvailableSize: heapStats.total_available_size,
          usedHeapSize: heapStats.used_heap_size,
          heapSizeLimit: heapStats.heap_size_limit,
          mallocedMemory: heapStats.malloced_memory,
          peakMallocedMemory: heapStats.peak_malloced_memory
        };
      } catch (error) {
        // v8 module not available
      }
    }
    
    return snapshot;
  }

  analyzeMemoryGrowth(snapshot) {
    if (this.results.memorySnapshots.length < 2) return;
    
    const previous = this.results.memorySnapshots[this.results.memorySnapshots.length - 2];
    const heapGrowth = snapshot.heapUsed - previous.heapUsed;
    const rssGrowth = snapshot.rss - previous.rss;
    
    this.results.leakDetection.memoryGrowthTrend.push({
      timestamp: snapshot.timestamp,
      heapGrowth,
      rssGrowth,
      heapGrowthRate: heapGrowth / (this.samplingInterval / 1000), // bytes per second
      rssGrowthRate: rssGrowth / (this.samplingInterval / 1000)
    });
    
    // Detect sustained growth patterns
    if (this.results.leakDetection.memoryGrowthTrend.length >= 5) {
      const recentTrend = this.results.leakDetection.memoryGrowthTrend.slice(-5);
      const sustainedGrowth = recentTrend.every(t => t.heapGrowth > 0);
      const totalGrowth = recentTrend.reduce((sum, t) => sum + t.heapGrowth, 0);
      
      if (sustainedGrowth && totalGrowth > this.heapGrowthThreshold) {
        this.results.leakDetection.potentialLeaks.push({
          type: 'sustained_heap_growth',
          timestamp: snapshot.timestamp,
          growth: totalGrowth,
          duration: recentTrend.length * this.samplingInterval,
          severity: totalGrowth > this.heapGrowthThreshold * 2 ? 'high' : 'medium'
        });
      }
    }
  }

  checkMemoryThresholds(snapshot) {
    if (snapshot.heapUsed > this.memoryThreshold) {
      this.results.leakDetection.potentialLeaks.push({
        type: 'memory_threshold_exceeded',
        timestamp: snapshot.timestamp,
        heapUsed: snapshot.heapUsed,
        threshold: this.memoryThreshold,
        severity: 'high'
      });
    }
    
    if (snapshot.rss > this.memoryThreshold * 1.5) {
      this.results.leakDetection.potentialLeaks.push({
        type: 'rss_threshold_exceeded',
        timestamp: snapshot.timestamp,
        rss: snapshot.rss,
        threshold: this.memoryThreshold * 1.5,
        severity: 'medium'
      });
    }
  }

  async runMemoryStressTests() {
    console.log('🏋️ Starting memory stress tests');
    
    const tests = [
      this.arrayLeakTest,
      this.objectLeakTest,
      this.closureLeakTest,
      this.eventListenerLeakTest,
      this.bufferLeakTest
    ];
    
    for (const test of tests) {
      if (!this.isRunning) break;
      await test.call(this);
      await this.sleep(10000); // 10 second pause between tests
    }
  }

  async arrayLeakTest() {
    console.log('📋 Running array leak test');
    const arrays = [];
    const iterations = 1000;
    
    const beforeSnapshot = this.takeMemorySnapshot();
    
    for (let i = 0; i < iterations; i++) {
      // Create large arrays and potentially "forget" to clean them up
      const largeArray = new Array(10000).fill(Math.random());
      arrays.push(largeArray);
      
      // Simulate some arrays being cleaned up
      if (Math.random() > 0.7 && arrays.length > 0) {
        arrays.shift();
      }
      
      if (i % 100 === 0) {
        await this.sleep(10);
      }
    }
    
    const afterSnapshot = this.takeMemorySnapshot();
    const memoryIncrease = afterSnapshot.heapUsed - beforeSnapshot.heapUsed;
    
    this.results.leakDetection.suspiciousObjects.push({
      testName: 'arrayLeakTest',
      memoryIncrease,
      objectsCreated: iterations,
      objectsRetained: arrays.length,
      timestamp: afterSnapshot.timestamp
    });
    
    // Clean up
    arrays.length = 0;
  }

  async objectLeakTest() {
    console.log('📦 Running object leak test');
    const objects = new Map();
    const iterations = 5000;
    
    const beforeSnapshot = this.takeMemorySnapshot();
    
    for (let i = 0; i < iterations; i++) {
      // Create objects with circular references
      const obj = {
        id: i,
        data: new Array(1000).fill(`data-${i}`),
        timestamp: Date.now()
      };
      
      // Create circular reference
      obj.self = obj;
      
      objects.set(i, obj);
      
      // Simulate some cleanup
      if (objects.size > 100 && Math.random() > 0.8) {
        const oldestKey = objects.keys().next().value;
        const oldObj = objects.get(oldestKey);
        if (oldObj) {
          oldObj.self = null; // Break circular reference
          objects.delete(oldestKey);
        }
      }
      
      if (i % 200 === 0) {
        await this.sleep(10);
      }
    }
    
    const afterSnapshot = this.takeMemorySnapshot();
    const memoryIncrease = afterSnapshot.heapUsed - beforeSnapshot.heapUsed;
    
    this.results.leakDetection.suspiciousObjects.push({
      testName: 'objectLeakTest',
      memoryIncrease,
      objectsCreated: iterations,
      objectsRetained: objects.size,
      timestamp: afterSnapshot.timestamp
    });
    
    // Clean up properly
    for (const obj of objects.values()) {
      obj.self = null;
    }
    objects.clear();
  }

  async closureLeakTest() {
    console.log('🔗 Running closure leak test');
    const closures = [];
    const iterations = 2000;
    
    const beforeSnapshot = this.takeMemorySnapshot();
    
    for (let i = 0; i < iterations; i++) {
      // Create closures that capture large amounts of data
      const largeData = new Array(5000).fill(`closure-data-${i}`);
      
      const closure = function(input) {
        // This closure captures largeData
        return function(x) {
          return largeData[x % largeData.length] + input;
        };
      }(`closure-${i}`);
      
      closures.push(closure);
      
      // Simulate occasional cleanup
      if (closures.length > 50 && Math.random() > 0.9) {
        closures.shift();
      }
      
      if (i % 100 === 0) {
        await this.sleep(5);
      }
    }
    
    const afterSnapshot = this.takeMemorySnapshot();
    const memoryIncrease = afterSnapshot.heapUsed - beforeSnapshot.heapUsed;
    
    this.results.leakDetection.suspiciousObjects.push({
      testName: 'closureLeakTest',
      memoryIncrease,
      objectsCreated: iterations,
      objectsRetained: closures.length,
      timestamp: afterSnapshot.timestamp
    });
    
    // Clean up
    closures.length = 0;
  }

  async eventListenerLeakTest() {
    console.log('👂 Running event listener leak test');
    const { EventEmitter } = require('events');
    const emitters = [];
    const iterations = 1000;
    
    const beforeSnapshot = this.takeMemorySnapshot();
    
    for (let i = 0; i < iterations; i++) {
      const emitter = new EventEmitter();
      const largeData = new Array(1000).fill(`listener-data-${i}`);
      
      // Add multiple listeners that capture data
      emitter.on('test', function() {
        // This listener captures largeData
        return largeData.length;
      });
      
      emitter.on('cleanup', function() {
        largeData.length = 0;
      });
      
      emitters.push(emitter);
      
      // Simulate some cleanup
      if (emitters.length > 20 && Math.random() > 0.85) {
        const oldEmitter = emitters.shift();
        oldEmitter.removeAllListeners();
      }
      
      if (i % 50 === 0) {
        await this.sleep(5);
      }
    }
    
    const afterSnapshot = this.takeMemorySnapshot();
    const memoryIncrease = afterSnapshot.heapUsed - beforeSnapshot.heapUsed;
    
    this.results.leakDetection.suspiciousObjects.push({
      testName: 'eventListenerLeakTest',
      memoryIncrease,
      objectsCreated: iterations,
      objectsRetained: emitters.length,
      timestamp: afterSnapshot.timestamp
    });
    
    // Clean up
    emitters.forEach(emitter => emitter.removeAllListeners());
    emitters.length = 0;
  }

  async bufferLeakTest() {
    console.log('💾 Running buffer leak test');
    const buffers = [];
    const iterations = 500;
    
    const beforeSnapshot = this.takeMemorySnapshot();
    
    for (let i = 0; i < iterations; i++) {
      // Create large buffers
      const buffer = Buffer.alloc(100000, `buffer-${i}`);
      buffers.push(buffer);
      
      // Simulate some cleanup
      if (buffers.length > 10 && Math.random() > 0.8) {
        buffers.shift();
      }
      
      if (i % 25 === 0) {
        await this.sleep(10);
      }
    }
    
    const afterSnapshot = this.takeMemorySnapshot();
    const memoryIncrease = afterSnapshot.heapUsed - beforeSnapshot.heapUsed;
    
    this.results.leakDetection.suspiciousObjects.push({
      testName: 'bufferLeakTest',
      memoryIncrease,
      objectsCreated: iterations,
      objectsRetained: buffers.length,
      timestamp: afterSnapshot.timestamp
    });
    
    // Clean up
    buffers.length = 0;
  }

  stopMemoryTest() {
    console.log('⏹️ Stopping memory test');
    this.isRunning = false;
  }

  async generateReport() {
    console.log('📊 Generating memory test report');
    
    const endTime = performance.now() - this.startTime;
    const finalSnapshot = this.takeMemorySnapshot();
    
    // Calculate statistics
    const memoryGrowth = finalSnapshot.heapUsed - this.baseline.heapUsed;
    const rssGrowth = finalSnapshot.rss - this.baseline.rss;
    const peakMemory = Math.max(...this.results.memorySnapshots.map(s => s.heapUsed));
    const averageMemory = this.results.memorySnapshots.reduce((sum, s) => sum + s.heapUsed, 0) / this.results.memorySnapshots.length;
    
    // Analyze growth patterns
    const growthAnalysis = this.analyzeGrowthPatterns();
    
    // Generate recommendations
    const recommendations = this.generateMemoryRecommendations(memoryGrowth, peakMemory, growthAnalysis);
    
    const report = {
      testSummary: {
        duration: Math.round(endTime),
        samplesCollected: this.results.memorySnapshots.length,
        samplingInterval: this.samplingInterval
      },
      memoryMetrics: {
        baseline: {
          heapUsed: this.baseline.heapUsed,
          rss: this.baseline.rss
        },
        final: {
          heapUsed: finalSnapshot.heapUsed,
          rss: finalSnapshot.rss
        },
        growth: {
          heap: memoryGrowth,
          rss: rssGrowth,
          percentage: ((memoryGrowth / this.baseline.heapUsed) * 100)
        },
        peak: peakMemory,
        average: Math.round(averageMemory)
      },
      leakDetection: {
        potentialLeaks: this.results.leakDetection.potentialLeaks,
        suspiciousObjects: this.results.leakDetection.suspiciousObjects,
        growthAnalysis
      },
      recommendations
    };

    // Output results
    console.log('\n🧠 MEMORY TEST RESULTS');
    console.log('=' .repeat(50));
    console.log(`Test Duration: ${Math.round(endTime / 1000)} seconds`);
    console.log(`Samples Collected: ${report.testSummary.samplesCollected}`);
    
    console.log('\n📊 Memory Metrics:');
    console.log(`Baseline Heap: ${this.formatBytes(report.memoryMetrics.baseline.heapUsed)}`);
    console.log(`Final Heap: ${this.formatBytes(report.memoryMetrics.final.heapUsed)}`);
    console.log(`Heap Growth: ${this.formatBytes(report.memoryMetrics.growth.heap)} (${report.memoryMetrics.growth.percentage.toFixed(2)}%)`);
    console.log(`Peak Memory: ${this.formatBytes(report.memoryMetrics.peak)}`);
    console.log(`Average Memory: ${this.formatBytes(report.memoryMetrics.average)}`);
    
    if (report.leakDetection.potentialLeaks.length > 0) {
      console.log('\n⚠️ Potential Memory Leaks Detected:');
      report.leakDetection.potentialLeaks.forEach((leak, index) => {
        console.log(`${index + 1}. ${leak.type} - Severity: ${leak.severity}`);
        console.log(`   Time: ${Math.round(leak.timestamp / 1000)}s`);
        if (leak.growth) console.log(`   Growth: ${this.formatBytes(leak.growth)}`);
      });
    }
    
    if (report.leakDetection.suspiciousObjects.length > 0) {
      console.log('\n🔍 Suspicious Object Analysis:');
      report.leakDetection.suspiciousObjects.forEach(obj => {
        console.log(`${obj.testName}:`);
        console.log(`  Memory Increase: ${this.formatBytes(obj.memoryIncrease)}`);
        console.log(`  Objects Created: ${obj.objectsCreated}`);
        console.log(`  Objects Retained: ${obj.objectsRetained}`);
        console.log(`  Retention Rate: ${((obj.objectsRetained / obj.objectsCreated) * 100).toFixed(1)}%`);
      });
    }
    
    console.log('\n💡 Recommendations:');
    report.recommendations.forEach(rec => console.log(`• ${rec}`));

    // Save detailed results
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportPath = `scripts/performance/memory-test-${timestamp}.json`;
    fs.writeFileSync(reportPath, JSON.stringify({
      ...report,
      rawData: {
        memorySnapshots: this.results.memorySnapshots,
        memoryGrowthTrend: this.results.leakDetection.memoryGrowthTrend
      }
    }, null, 2));
    console.log(`\n📄 Detailed report saved to: ${reportPath}`);

    return report;
  }

  analyzeGrowthPatterns() {
    const trends = this.results.leakDetection.memoryGrowthTrend;
    if (trends.length === 0) return { overall: 'no_data' };
    
    const positiveGrowthCount = trends.filter(t => t.heapGrowth > 0).length;
    const negativeGrowthCount = trends.filter(t => t.heapGrowth < 0).length;
    const stableCount = trends.filter(t => Math.abs(t.heapGrowth) < 1024 * 1024).length; // 1MB threshold
    
    const totalGrowth = trends.reduce((sum, t) => sum + t.heapGrowth, 0);
    const averageGrowthRate = trends.reduce((sum, t) => sum + t.heapGrowthRate, 0) / trends.length;
    
    let pattern = 'unknown';
    if (positiveGrowthCount > trends.length * 0.7) {
      pattern = 'consistent_growth';
    } else if (stableCount > trends.length * 0.8) {
      pattern = 'stable';
    } else if (negativeGrowthCount > trends.length * 0.4) {
      pattern = 'fluctuating';
    }
    
    return {
      overall: pattern,
      totalGrowth,
      averageGrowthRate,
      positiveGrowthPercentage: (positiveGrowthCount / trends.length) * 100,
      stablePercentage: (stableCount / trends.length) * 100
    };
  }

  generateMemoryRecommendations(memoryGrowth, peakMemory, growthAnalysis) {
    const recommendations = [];
    
    if (memoryGrowth > this.heapGrowthThreshold) {
      recommendations.push('Significant memory growth detected. Investigate potential memory leaks.');
    }
    
    if (peakMemory > this.memoryThreshold) {
      recommendations.push('Peak memory usage exceeded threshold. Consider optimizing memory-intensive operations.');
    }
    
    if (growthAnalysis.overall === 'consistent_growth') {
      recommendations.push('Consistent memory growth pattern suggests possible memory leak. Review object lifecycle management.');
    }
    
    if (this.results.leakDetection.potentialLeaks.length > 0) {
      recommendations.push('Potential memory leaks detected. Review event listeners, closures, and object references.');
    }
    
    // Specific recommendations based on test results
    const suspiciousTests = this.results.leakDetection.suspiciousObjects.filter(obj => 
      obj.objectsRetained > obj.objectsCreated * 0.1
    );
    
    if (suspiciousTests.length > 0) {
      recommendations.push('High object retention rates detected. Ensure proper cleanup of unused objects.');
    }
    
    recommendations.push('Implement object pooling for frequently created/destroyed objects.');
    recommendations.push('Use WeakMap/WeakSet for caching to allow garbage collection.');
    recommendations.push('Monitor memory usage in production with tools like clinic.js or 0x.');
    recommendations.push('Consider running with --inspect and using Chrome DevTools for heap analysis.');
    
    return recommendations;
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// CLI execution
if (require.main === module) {
  const args = process.argv.slice(2);
  const options = {};
  
  for (let i = 0; i < args.length; i += 2) {
    const key = args[i].replace('--', '');
    const value = args[i + 1];
    
    if (key === 'duration') options.testDuration = parseInt(value) * 1000;
    if (key === 'interval') options.samplingInterval = parseInt(value) * 1000;
    if (key === 'threshold') options.memoryThreshold = parseInt(value) * 1024 * 1024;
    if (key === 'heap-growth') options.heapGrowthThreshold = parseInt(value) * 1024 * 1024;
  }
  
  const tester = new MemoryTester(options);
  
  process.on('SIGINT', () => {
    console.log('\n⏹️ Received interrupt signal, stopping test...');
    tester.stopMemoryTest();
    process.exit(0);
  });
  
  tester.startMemoryTest().catch(error => {
    console.error('❌ Memory test failed:', error);
    process.exit(1);
  });
}

module.exports = MemoryTester;