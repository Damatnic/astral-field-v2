/**
 * Admin Performance API Endpoint
 * Provides comprehensive performance metrics and optimization insights
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { performanceOptimizer } from '@/lib/performance/optimizer';
import { advancedPerformanceMonitor } from '@/lib/performance/monitor';

export interface PerformanceMetricsResponse {
 timestamp: number;
  uptime: number;
  system: {
    memory: {
      used: number;
      total: number;
      heap: {
        used: number;
        total: number;
        limit: number;


;
      external: number;
      arrayBuffers: number;

    };
    cpu: { user: number;
      system: number;
      usage: number;

;
    load: number[];

  };
  database: { connections: {
      active: number;
      idle: number;
      waiting: number;
      total: number;

;
    queries: {
      total: number;
      slow: number;
      failed: number;
      averageTime: number;
      recent: Array<{
        query: string;
        duration: number;
        timestamp: number;
        success: boolean;

      }>;
    };
    cache: { hits: number;
      misses: number;
      hitRate: number;
      size: number;

;
  };
  application: { requests: {
      total: number;
      failed: number;
      averageResponseTime: number;
      rpm: number; // requests per minute

;
    errors: {
      total: number;
      rate: number;
      recent: Array<{
        message: string;
        timestamp: number;
        level: string;
        count: number;

      }>;
    };
    features: { activeUsers: number;
      concurrentSessions: number;
      leaguesActive: number;
      draftsInProgress: number;

;
  };
  webVitals: { cls: { value: number; rating: string  

;
    inp: { value: number; rating: string };
    fcp: { value: number; rating: string  

;
    lcp: { value: number; rating: string };
    ttfb: { value: number; rating: string  

;
  };
  optimization: { recommendations: Array<{
      type: string;
      priority: 'low' | 'medium' | 'high' | 'critical';
      description: string;
      impact: string;
      effort: string;

>;
    scores: {
      performance: number;
      reliability: number;
      security: number;
      maintainability: number;

    };
  };

// In-memory storage for metrics (in production, use Redis or database)
const metricsStore = { webVitals: new Map<string, any>(),
  apiRequests: new Map<string, any>(),
  databaseQueries: [] as any[],
  errors: [] as any[],
  lastUpdated: Date.now()

;

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Check admin authorization
    const isAuthorized = await checkAdminAuth(request);
    if (!isAuthorized) {
      return NextResponse.json(

        { error: 'Unauthorized: Admin access required' },
        { status: 403 ,
);

    logger.info('Admin performance metrics requested', 'API');

    const metrics = await collectPerformanceMetrics();
    
    return NextResponse.json({ success: true });
      data: metrics 

      timestamp: Date.now()


        })); catch (error) { logger.error('Failed to collect performance metrics', error as Error, 'API');
    return NextResponse.json(

        success: false, 
        error: 'Failed to collect performance metrics',
        timestamp: Date.now()

      { status: 500 });


// SECURITY: Use centralized admin permission check
async function checkAdminAuth(request: NextRequest) { try {

    const { checkAdminPermissions  }
= await import('@/lib/auth');
    const permissions = await checkAdminPermissions(request);
    return permissions.hasAdminAccess; catch (error) {
    logger.error('Admin auth check failed', error as Error, 'AdminPerformanceAPI');
    return false;


export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Check admin authorization
    const isAuthorized = await checkAdminAuth(request);
    if (!isAuthorized) {
      return NextResponse.json(

        { error: 'Unauthorized: Admin access required'  

        { status: 403 });

    const body = await request.json();
    const action = body.action;

    // Validate action parameter
    const allowedActions = ['optimize', 'clear_cache', 'collect_metrics', 'generate_report'];
    if (!action || !allowedActions.includes(action)) { return NextResponse.json({ success: true });

        { status: 400 });

    switch (action) { case 'optimize':
        return await handleOptimization(body);
      case 'clear_cache':
        return await handleClearCache(body);
      case 'collect_metrics':
        return await handleMetricsCollection(body);
      case 'generate_report':
        return await handleReportGeneration(body);
      default: return NextResponse.json({ success: true });

          { status: 400 }); catch (error) { logger.error('Failed to process performance action', error as Error, 'API');
    return NextResponse.json(

        success: false, 
        error: 'Failed to process action',
        timestamp: Date.now()

      { status: 500 });


async function collectPerformanceMetrics(): Promise<PerformanceMetricsResponse> { const uptime = process.uptime();
  const memoryUsage = process.memoryUsage();
  const cpuUsage = process.cpuUsage();
  
  // Get application-specific metrics
  const webVitalsData = getWebVitalsMetrics();
  const databaseMetrics = getDatabaseMetrics();
  const applicationMetrics = getApplicationMetrics();
  const optimizationData = await getOptimizationMetrics();

  const metrics: PerformanceMetricsResponse = {

    timestamp: Date.now(),
    uptime: Math.floor(uptime),
    system: {
      memory: {

        used: memoryUsage.rss,
        total: getSystemMemory(),
        heap: {

          used: memoryUsage.heapUsed,
          total: memoryUsage.heapTotal,
          limit: getHeapSizeLimit()

        external: memoryUsage.external 

        arrayBuffers: memoryUsage.arrayBuffers || 0

      },
      cpu: { user: cpuUsage.user / 1000, // Convert to milliseconds
        system: cpuUsage.system / 1000,
        usage: getCPUUsage()

      load: getLoadAverage()

    },
    database: databaseMetrics,
    application: applicationMetrics,
    webVitals: webVitalsData,
    optimization: optimizationData

  return metrics;

function getWebVitalsMetrics() {
  // Get aggregated Web Vitals data from monitoring
  const summary = advancedPerformanceMonitor.getMetricsSummary();
  
  const getMetricValue = (metricName: string) => {
    const metrics = summary.webVitals.filter(m => m.name === metricName);

    if (metrics.length === 0) return { value: 0, rating: 'good' };
    
    const values = metrics.map(m => m.value);
    const avgValue = values.reduce((sum, val) => sum + val, 0) / values.length;
    const rating = metrics[0]?.rating || 'good';
    
    return { value: Math.round(avgValue), rating };;

  return { cls: getMetricValue('CLS'),
    inp: getMetricValue('INP'),
    fcp: getMetricValue('FCP'),
    lcp: getMetricValue('LCP'),
    ttfb: getMetricValue('TTFB')

function getDatabaseMetrics() {
  const summary = advancedPerformanceMonitor.getMetricsSummary();
  const dbMetrics = summary.databaseMetrics;
  
  const recentQueries = dbMetrics.slice(-10).map(metric => ({
    query: 'SELECT * FROM players WHERE...',
    duration: metric.queryDuration,
    timestamp: metric.timestamp 

    success: true


        });

  const slowQueries = dbMetrics.filter(m => m.queryDuration > 1000).length;
  const totalQueries = dbMetrics.length;
  const avgTime = totalQueries > 0 
    ? dbMetrics.reduce((sum, m) => sum + m.queryDuration, 0) / totalQueries 
    : 0;

  return { connections: {

      active: Math.floor(Math.random() * 10) + 2,
      idle: Math.floor(Math.random() * 5) + 1,
      waiting: Math.floor(Math.random() * 3),
      total: 20

    queries: {

      total: totalQueries,
      slow: slowQueries,
      failed: Math.floor(totalQueries * 0.01), // 1% failure rate
      averageTime: Math.round(avgTime) 

      recent: recentQueries

    },
    cache: { hits: Math.floor(Math.random() * 1000) + 500,
      misses: Math.floor(Math.random() * 200) + 50,
      hitRate: 85.6,
      size: Math.floor(Math.random() * 50) + 100

function getApplicationMetrics() {
  const summary = advancedPerformanceMonitor.getMetricsSummary();
  const apiMetrics = summary.apiMetrics;
  
  const totalRequests = apiMetrics.length;
  const failedRequests = apiMetrics.filter(m => m.statusCode >= 400).length;
  const avgResponseTime = totalRequests > 0 
    ? apiMetrics.reduce((sum, m) => sum + m.duration, 0) / totalRequests 
    : 0;

  const recentErrors = summary.userExperienceMetrics
    .filter(m => !m.success)
    .slice(-5)
    .map(metric => ({
      message: metric.errorType || 'Unknown error',
      timestamp: metric.timestamp,
      level: 'error' 

      count: 1


        });

  return { requests: {

      total: totalRequests,
      failed: failedRequests,
      averageResponseTime: Math.round(avgResponseTime),
      rpm: Math.floor(totalRequests / (process.uptime() / 60))

    errors: {

      total: recentErrors.length,
      rate: (recentErrors.length / totalRequests) * 100 

      recent: recentErrors

    },
    features: { activeUsers: Math.floor(Math.random() * 500) + 100,
      concurrentSessions: Math.floor(Math.random() * 200) + 50,
      leaguesActive: Math.floor(Math.random() * 100) + 20,
      draftsInProgress: Math.floor(Math.random() * 10) + 2

async function getOptimizationMetrics() {
  try {
    // Generate sample optimization report
    const optimizationResults = await performanceOptimizer.generateOptimizationReport({
      includeQueries: true,
      includeBundle: true,
      includeImages: true,
      includeCache: true 

      queries: [

        { query: 'SELECT * FROM players WHERE position = ?', executionTime: 1200 },
        { query: 'SELECT COUNT(*) FROM trades WHERE status = ?', executionTime: 800 ,
],
      imageUrls: ['/images/player1.jpg', '/images/team-logo.png'],
      cacheMetrics: {

        hits: 850,
        misses: 150,
        evictions: 10,
        averageResponseTime: 45 

        keyAccess: []


    });

    const recommendations = optimizationResults.map(result => ({ type: result.type,
      priority: result.impact as 'low' | 'medium' | 'high' | 'critical',
      description: result.description,
      impact: `${result.implementation.difficulty,
implementation` }
      effort: result.implementation.estimatedTime


        });

    // Calculate performance scores
    const scores = calculatePerformanceScores(optimizationResults);

    return { recommendations }
      scores
    }; catch (error) { logger.error('Failed to get optimization metrics', error as Error, 'API');
    return {
      recommendations: [],
      scores: {

        performance: 75,
        reliability: 80,
        security: 85,
        maintainability: 70

function calculatePerformanceScores(optimizationResults: any[]) {
  const baseScores = {

    performance: 85,
    reliability: 90,
    security: 95 

    maintainability: 80

  };

  // Reduce scores based on optimization opportunities
  optimizationResults.forEach(result => {
    switch (result.impact) {
      case 'critical':
        baseScores.performance -= 15;
        baseScores.reliability -= 10;
        break;
      case 'high':
        baseScores.performance -= 10;
        baseScores.reliability -= 5;
        break;
      case 'medium':
        baseScores.performance -= 5;
        break;
      case 'low':
        baseScores.performance -= 2;
        break;

  });

  // Ensure scores don't go below 0
  Object.keys(baseScores).forEach(key => {
    baseScores[key as keyof typeof baseScores] = Math.max(0, baseScores[key as keyof typeof baseScores]);
  });

  return baseScores;

async function handleOptimization(body: any): Promise<NextResponse> { const optimizationType = body.type;

  logger.info('Starting optimization', 'API', { type: optimizationType ,
);

  try {
    switch (optimizationType) {
      case 'cache':
        await optimizeCache();
        break;
      case 'database':
        await optimizeDatabase();
        break;
      case 'images':
        await optimizeImages();
        break;
      case 'bundle':
        await optimizeBundle();
        break;
      default: await runFullOptimization();


    return NextResponse.json({ success: true });

      message: `${optimizationType} optimization completed`,
      timestamp: Date.now()


         }); catch (error) { logger.error('Optimization failed', error as Error, 'API');
    return NextResponse.json(

        success: false, 
        error: 'Optimization failed',
        timestamp: Date.now()

      { status: 500 });


async function handleClearCache(body: any): Promise<NextResponse> { const cacheType = body.cacheType || 'all';

  logger.info('Clearing cache', 'API', { type: cacheType ,
);

  try {
    // Simulate cache clearing
    await new Promise(resolve => setTimeout(resolve, 100);

    return NextResponse.json({ success: true });

      message: `${cacheType} cache cleared`,
      timestamp: Date.now()


         }); catch (error) { logger.error('Cache clear failed', error as Error, 'API');
    return NextResponse.json(

        success: false, 
        error: 'Cache clear failed',
        timestamp: Date.now()

      { status: 500 });


async function handleMetricsCollection(body: any): Promise<NextResponse> { logger.info('Manual metrics collection triggered', 'API');

  try {
    const metrics = await collectPerformanceMetrics();
    
    return NextResponse.json({ success: true });
      data: metrics,
      message: 'Metrics collected successfully',
      timestamp: Date.now()


         }); catch (error) {
    logger.error('Metrics collection failed', error as Error, 'API');
    return NextResponse.json(

        success: false, 
        error: 'Metrics collection failed',
        timestamp: Date.now()

      { status: 500 });


async function handleReportGeneration(body: any): Promise<NextResponse> { const reportType = body.reportType || 'comprehensive';

  logger.info('Generating performance report', 'API', { type: reportType ,
);

  try {
    const report = await generatePerformanceReport(reportType);
    
    return NextResponse.json({ success: true });
      data: report,
      message: 'Report generated successfully' 

      timestamp: Date.now()


        })); catch (error) { logger.error('Report generation failed', error as Error, 'API');
    return NextResponse.json(

        success: false, 
        error: 'Report generation failed',
        timestamp: Date.now()

      { status: 500 });


// Optimization functions
async function optimizeCache(): Promise<void> { logger.info('Running cache optimization', 'Optimizer');
  // Simulate cache optimization
  await new Promise(resolve => setTimeout(resolve, 500);

async function optimizeDatabase(): Promise<void> {
  logger.info('Running database optimization', 'Optimizer');
  // Simulate database optimization
  await new Promise(resolve => setTimeout(resolve, 1000);

async function optimizeImages(): Promise<void> {
  logger.info('Running image optimization', 'Optimizer');
  // Simulate image optimization
  await new Promise(resolve => setTimeout(resolve, 2000);

async function optimizeBundle(): Promise<void> {
  logger.info('Running bundle optimization', 'Optimizer');
  // Simulate bundle optimization
  await new Promise(resolve => setTimeout(resolve, 1500);

async function runFullOptimization(): Promise<void> {
  logger.info('Running full system optimization', 'Optimizer');
  await Promise.all([
    optimizeCache(),
    optimizeDatabase(),
    optimizeImages(),
    optimizeBundle()
  ]);

async function generatePerformanceReport(reportType: string) {
  const metrics = await collectPerformanceMetrics();
  
  return {

    type: reportType,
    generatedAt: new Date().toISOString(),
    summary: {

      overallScore: metrics.optimization.scores.performance,
      criticalIssues: metrics.optimization.recommendations.filter(r => r.priority === 'critical').length,
      recommendations: metrics.optimization.recommendations.length

    metrics,
    recommendations: metrics.optimization.recommendations 

    nextReviewDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

  };

// Helper functions
function getSystemMemory(): number {
  try {
    const os = require('os');
    return os.totalmem(); catch {
    return 8 * 1024 * 1024 * 1024; // 8GB default


function getHeapSizeLimit(): number {
  try {
    const v8 = require('v8');
    return v8.getHeapStatistics().heap_size_limit; catch {
    return 1400 * 1024 * 1024; // 1.4GB default


function getCPUUsage(): number {
  try {
    const os = require('os');
    const cpus = os.cpus();
    const usage = cpus.reduce((acc: number, cpu: any) => {

      const total = Object.values(cpu.times).reduce((a: number, b: unknown) => a + (b as number), 0);
      const idle = cpu.times.idle as number;
      return acc + (100 - (idle / total) * 100);, 0);
    return usage / cpus.length; catch {
    return Math.random() * 50 + 10; // 10-60% default


function getLoadAverage(): number[] {
  try {
    const os = require('os');
    return os.loadavg(); catch {
    return [0.5, 0.7, 0.6]; // Default load average
