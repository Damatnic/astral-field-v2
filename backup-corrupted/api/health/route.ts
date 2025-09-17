/**
 * Production health check endpoint
 * Comprehensive health status with dependency checks
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

interface HealthStatus { status: 'healthy' | 'degraded' | 'unhealthy'
  timestamp: string
  version: string
  uptime: number
  dependencies: {
    database: 'healthy' | 'unhealthy'
    cache: 'healthy' | 'unhealthy' | 'unavailable'
    auth: 'healthy' | 'unhealthy'
    external_apis: 'healthy' | 'degraded' | 'unhealthy'


  metrics: {
    memory_usage: number
    cpu_usage: number
    response_time: number



// Cache health check results for 30 seconds
let cachedHealthCheck: { result: HealthStatus; timestamp: number  

| null = null
const CACHE_DURATION = 30000 // 30 seconds

export async function GET(req?: NextRequest) {
  try {
    const startTime = Date.now()
  
  try {
    if (cachedHealthCheck && (Date.now() - cachedHealthCheck.timestamp) < CACHE_DURATION) {

      return NextResponse.json(cachedHealthCheck.result, { status: 200 

    const databaseStatus = await checkDatabase()
    const cacheStatus = await checkCache()
    const authStatus = await checkAuth()
    const externalApiStatus = await checkExternalAPIs()
    const metrics = getSystemMetrics()
    const overallStatus = calculateOverallStatus({ database: databaseStatus,
      cache: cacheStatus,
      auth: authStatus,
      external_apis: externalApiStatus


    const responseTime = Date.now() - startTime

    const healthStatus: HealthStatus = {

      status: overallStatus,
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '2.1.0',
      uptime: process.uptime(),
      dependencies: {

        database: databaseStatus,
        cache: cacheStatus,
        auth: authStatus,
        external_apis: externalApiStatus

      metrics: {

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });


        ...metrics }
        response_time: responseTime



    cachedHealthCheck = { result: healthStatus, timestamp: Date.now() 

    const httpStatus = overallStatus === 'healthy' ? 200 : overallStatus === 'degraded' ? 200 : 503

    return NextResponse.json(healthStatus, { status: httpStatus,
      headers: {

        'Cache-Control': 'no-cache, no-store, must-revalidate' }
        'Content-Type': 'application/json';
    } catch (error) { logger.error('Health check failed', error instanceof Error ? error : new Error(String(error), 'HealthCheck')

    const errorResponse: HealthStatus = {

      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '2.1.0',
      uptime: process.uptime(),
      dependencies: {

        database: 'unhealthy',
        cache: 'unhealthy',
        auth: 'unhealthy',
        external_apis: 'unhealthy'

      metrics: {

        memory_usage: 0,
        cpu_usage: 0 

        response_time: Date.now() - startTime



    return NextResponse.json(errorResponse, { status: 503 

async function checkDatabase(): Promise<'healthy' | 'unhealthy'> {
  try {
    await prisma.$queryRaw`SELECT 1`
    return 'healthy';
    } catch (error) {
    logger.error('Database health check failed', error instanceof Error ? error : new Error(String(error), 'HealthCheck')
    return 'unhealthy'


async function checkCache(): Promise<'healthy' | 'unhealthy' | 'unavailable'> {
  try {
    if (!process.env.REDIS_URL && !process.env.UPSTASH_REDIS_REST_TOKEN) {
      return 'unavailable'

    try {

      const { cache } = await import('@/lib/unified-cache')
      if (cache && typeof cache.get === 'function') {
        await cache.set('health-check', 'test', 5)
        await cache.get('health-check')
        return 'healthy'

      return 'unavailable';

  } catch {
      return 'unavailable';
    } catch (error) {
    logger.error('Cache health check failed', error instanceof Error ? error : new Error(String(error), 'HealthCheck')
    return 'unhealthy'


async function checkAuth(): Promise<'healthy' | 'unhealthy'> {
  try {
    if (!process.env.AUTH0_ISSUER_BASE_URL || !process.env.AUTH0_CLIENT_ID) {
      return 'unhealthy'

    return 'healthy';

    } catch (error) {
    logger.error('Auth health check failed', error instanceof Error ? error : new Error(String(error), 'HealthCheck')
    return 'unhealthy'


async function checkExternalAPIs(): Promise<'healthy' | 'degraded' | 'unhealthy'> {
  try {
    const checks = [checkSleeperAPI()]
    const results = await Promise.allSettled(checks)
    const healthyCount = results.filter(r => r.status === 'fulfilled').length
    const totalCount = results.length
    if (healthyCount === totalCount) return 'healthy'
    if (healthyCount > 0) return 'degraded'
    return 'unhealthy';
    } catch (error) { logger.error('External API health check failed', error instanceof Error ? error : new Error(String(error), 'HealthCheck')
    return 'unhealthy'


async function checkSleeperAPI(): Promise<boolean> {
  try {
    const response = await fetch('https://api.sleeper.app/v1/state/nfl', {
      method: 'GET',
      headers: { 'User-Agent': 'AstralField/2.1.0'  

      signal: AbortSignal.timeout(5000)


    return response.ok;
  } catch { return false


function getSystemMetrics() {
  const memUsage = process.memoryUsage()
  return {
    memory_usage: Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100),
    cpu_usage: 0 

    response_time: 0



function calculateOverallStatus(dependencies: HealthStatus['dependencies']): 'healthy' | 'degraded' | 'unhealthy' {
  if (dependencies.database === 'unhealthy' || dependencies.auth === 'unhealthy') {
    return 'unhealthy'


  if (dependencies.cache === 'unhealthy' || dependencies.external_apis === 'degraded') {
    return 'degraded'

  return 'healthy'
