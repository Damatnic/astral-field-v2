import { NextRequest, NextResponse } from 'next/server';
import { backupService } from '@/lib/backup-recovery';
import { getToken } from 'next-auth/jwt';

// Admin authentication check
async function checkAdminAuth(request: NextRequest): Promise<boolean> {
  try {
    const token = await getToken({ 
      req: request, 
      secret: process.env.NEXTAUTH_SECRET 
    });
    return token?.isAdmin === true;
  } catch (error) {
    return false;
  }
}

// GET - Get backup history and status
export async function GET(request: NextRequest) {
  if (!await checkAdminAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const backupHistory = backupService.getBackupHistory();
    const recoveryPoints = backupService.getRecoveryPoints();

    return NextResponse.json({
      backups: backupHistory,
      recoveryPoints: recoveryPoints,
      status: 'operational',
      timestamp: new Date().toISOString(),
    });

  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to get backup status', details: error.message },
      { status: 500 }
    );
  }
}

// POST - Create a new backup
export async function POST(request: NextRequest) {
  if (!await checkAdminAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { type = 'full', config = {} } = body;

    let backup;

    if (type === 'full') {
      backup = await backupService.createFullBackup(config);
    } else if (type === 'incremental') {
      const { lastBackupId } = body;
      if (!lastBackupId) {
        return NextResponse.json(
          { error: 'lastBackupId required for incremental backup' },
          { status: 400 }
        );
      }
      backup = await backupService.createIncrementalBackup(lastBackupId);
    } else {
      return NextResponse.json(
        { error: 'Invalid backup type. Use "full" or "incremental"' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      message: 'Backup created successfully',
      backup: backup,
      timestamp: new Date().toISOString(),
    });

  } catch (error: any) {
    return NextResponse.json(
      { error: 'Backup creation failed', details: error.message },
      { status: 500 }
    );
  }
}

// PUT - Restore from backup
export async function PUT(request: NextRequest) {
  if (!await checkAdminAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { backupId, confirmRestore } = body;

    if (!backupId) {
      return NextResponse.json(
        { error: 'backupId is required' },
        { status: 400 }
      );
    }

    if (!confirmRestore) {
      return NextResponse.json(
        { error: 'confirmRestore must be true to proceed with restoration' },
        { status: 400 }
      );
    }

    const result = await backupService.restoreFromBackup(backupId);

    return NextResponse.json({
      message: result.success ? 'Restoration completed' : 'Restoration failed',
      result: result,
      timestamp: new Date().toISOString(),
    }, {
      status: result.success ? 200 : 500
    });

  } catch (error: any) {
    return NextResponse.json(
      { error: 'Restoration failed', details: error.message },
      { status: 500 }
    );
  }
}

// DELETE - Verify backup integrity
export async function DELETE(request: NextRequest) {
  if (!await checkAdminAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const backupId = searchParams.get('backupId');

    if (!backupId) {
      return NextResponse.json(
        { error: 'backupId is required' },
        { status: 400 }
      );
    }

    const isValid = await backupService.verifyBackupIntegrity(backupId);

    return NextResponse.json({
      backupId: backupId,
      isValid: isValid,
      message: isValid ? 'Backup integrity verified' : 'Backup integrity check failed',
      timestamp: new Date().toISOString(),
    });

  } catch (error: any) {
    return NextResponse.json(
      { error: 'Integrity verification failed', details: error.message },
      { status: 500 }
    );
  }
}