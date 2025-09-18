// API Route: Sleeper Integration Master Control
// Coordinates all Sleeper services and provides system-wide operations

import { NextRequest, NextResponse } from 'next/server';
import { sleeperIntegrationService } from '@/services/sleeper/sleeperIntegrationService';


// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'health';

    switch (action) {
      case 'health':
        const health = await sleeperIntegrationService.getHealthStatus();
        return NextResponse.json({
          success: true,
          data: health,
          timestamp: new Date().toISOString(),
        });
      
      case 'stats':
        const stats = await sleeperIntegrationService.getIntegrationStats();
        return NextResponse.json({
          success: true,
          data: stats,
          timestamp: new Date().toISOString(),
        });
      
      case 'status':
        // Quick status check
        const quickStatus = {
          service: 'Sleeper Integration',
          status: 'operational',
          version: '2.1.0',
          uptime: process.uptime(),
          memory: process.memoryUsage(),
          timestamp: new Date().toISOString(),
        };
        
        return NextResponse.json({
          success: true,
          data: quickStatus,
          timestamp: new Date().toISOString(),
        });
      
      default:
        return NextResponse.json(
          { error: 'Invalid action. Use: health, stats, or status' },
          { status: 400 }
        );
    }
  } catch (error: any) {
    console.error('[API] Integration GET error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to get integration info',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, options = {} } = body;

    let result;

    switch (action) {
      case 'initialize':
        console.log('[API] Initializing Sleeper integration...');
        result = await sleeperIntegrationService.initialize();
        break;
      
      case 'full_sync':
        console.log('[API] Starting full Sleeper sync...');
        result = await sleeperIntegrationService.performFullSync();
        break;
      
      case 'start_maintenance':
        console.log('[API] Starting maintenance schedule...');
        await sleeperIntegrationService.startMaintenanceSchedule();
        result = {
          message: 'Maintenance schedule started',
          description: 'Automatic sync and update routines are now active',
          timestamp: new Date().toISOString(),
        };
        break;
      
      case 'quick_setup':
        console.log('[API] Running quick setup for D\'Amato Dynasty League...');
        
        // Perform essential setup steps
        const initResult = await sleeperIntegrationService.initialize();
        
        if (initResult.success) {
          // Run a quick player sync
          const syncResult = await sleeperIntegrationService.performFullSync();
          
          result = {
            message: 'Quick setup completed for D\'Amato Dynasty League',
            initialization: initResult,
            sync: {
              playersProcessed: syncResult.summary.playersProcessed,
              leaguesProcessed: syncResult.summary.leaguesProcessed,
              errors: syncResult.summary.errors,
              success: syncResult.summary.success,
            },
            nextSteps: [
              'Review player mappings in league sync',
              'Configure real-time scoring settings',
              'Set up automated sync schedule',
              'Test live scoring during next game day',
            ],
            timestamp: new Date().toISOString(),
          };
        } else {
          result = {
            message: 'Quick setup failed',
            error: initResult.message,
            details: initResult.details,
          };
        }
        break;
      
      case 'health_check':
        console.log('[API] Running comprehensive health check...');
        const healthResult = await sleeperIntegrationService.getHealthStatus();
        
        result = {
          message: 'Health check completed',
          health: healthResult,
          summary: {
            overall: healthResult.overall,
            healthyServices: Object.values(healthResult.services).filter(s => s.status === 'healthy').length,
            totalServices: Object.values(healthResult.services).length,
            criticalIssues: Object.values(healthResult.services).filter(s => s.status === 'unhealthy').length,
          },
          recommendations: healthResult.recommendations,
        };
        break;
      
      default:
        return NextResponse.json(
          { error: 'Invalid action. Use: initialize, full_sync, start_maintenance, quick_setup, or health_check' },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      action,
      result,
      timestamp: new Date().toISOString(),
    });

  } catch (error: any) {
    console.error('[API] Integration POST error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Integration operation failed',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}