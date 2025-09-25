'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface AutomationSettings {
  enabled: boolean;
  waiverDay: number;
  waiverTime: string;
  timezone: string;
  notifications: {
    beforeProcessing: boolean;
    afterProcessing: boolean;
    onFailure: boolean;
  };
}

interface JobStatus {
  isScheduled: boolean;
  nextExecution?: string;
  status: string;
}

interface ProcessingHistory {
  id: string;
  status: string;
  processed: number;
  failed: number;
  error?: string;
  executedAt: string;
  duration?: number;
}

interface WaiverAutomationProps {
  leagueId: string;
  leagueName: string;
}

const DAYS_OF_WEEK = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' }
];

const TIMEZONES = [
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' }
];

export function WaiverAutomationDashboard({ leagueId, leagueName }: WaiverAutomationProps) {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [triggering, setTriggering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [settings, setSettings] = useState<AutomationSettings>({
    enabled: false,
    waiverDay: 3, // Wednesday
    waiverTime: '12:00',
    timezone: 'America/New_York',
    notifications: {
      beforeProcessing: true,
      afterProcessing: true,
      onFailure: true
    }
  });

  const [jobStatus, setJobStatus] = useState<JobStatus>({
    isScheduled: false,
    status: 'inactive'
  });

  const [history, setHistory] = useState<ProcessingHistory[]>([]);
  const [preview, setPreview] = useState<any>(null);

  useEffect(() => {
    fetchAutomationData();
  }, [leagueId]);

  const fetchAutomationData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/waivers/automation?leagueId=${leagueId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error);
      }

      setSettings(data.data.automation);
      setJobStatus(data.data.jobStatus);
      setHistory(data.data.recentProcessing);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to load automation settings');
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const response = await fetch('/api/waivers/automation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          leagueId,
          ...settings
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error);
      }

      setSuccess(`Automation settings ${settings.enabled ? 'enabled' : 'disabled'} successfully`);
      await fetchAutomationData(); // Refresh data
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const triggerManualProcessing = async (dryRun: boolean = false) => {
    try {
      setTriggering(true);
      setError(null);
      setSuccess(null);

      const response = await fetch('/api/waivers/trigger', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          leagueId,
          dryRun
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error);
      }

      if (dryRun) {
        setPreview(data.data.preview);
        setSuccess('Preview generated successfully');
      } else {
        setSuccess(`Waiver processing completed: ${data.data.processed} successful, ${data.data.failed} failed`);
        await fetchAutomationData(); // Refresh history
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to process waivers');
    } finally {
      setTriggering(false);
    }
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return 'success';
      case 'failed':
        return 'danger';
      case 'pending':
        return 'warning';
      default:
        return 'default';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">Loading automation settings...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Waiver Wire Automation</span>
            <Badge variant={settings.enabled ? 'success' : 'secondary'}>
              {settings.enabled ? 'Enabled' : 'Disabled'}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert variant="success">
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          )}

          <Tabs defaultValue="settings" className="w-full">
            <TabsList>
              <TabsTrigger value="settings">Settings</TabsTrigger>
              <TabsTrigger value="manual">Manual Processing</TabsTrigger>
              <TabsTrigger value="history">Processing History</TabsTrigger>
            </TabsList>

            <TabsContent value="settings" className="space-y-6">
              <div className="flex items-center space-x-2">
                <Switch
                  id="automation-enabled"
                  checked={settings.enabled}
                  onCheckedChange={(checked) => 
                    setSettings(prev => ({ ...prev, enabled: checked }))
                  }
                />
                <Label htmlFor="automation-enabled">Enable Automatic Waiver Processing</Label>
              </div>

              {settings.enabled && (
                <div className="space-y-4 border-l-4 border-blue-500 pl-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="waiver-day">Processing Day</Label>
                      <Select
                        value={settings.waiverDay.toString()}
                        onValueChange={(value) => 
                          setSettings(prev => ({ ...prev, waiverDay: parseInt(value) }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {DAYS_OF_WEEK.map(day => (
                            <SelectItem key={day.value} value={day.value.toString()}>
                              {day.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="waiver-time">Processing Time</Label>
                      <Input
                        id="waiver-time"
                        type="time"
                        value={settings.waiverTime}
                        onChange={(e) => 
                          setSettings(prev => ({ ...prev, waiverTime: e.target.value }))
                        }
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="timezone">Timezone</Label>
                    <Select
                      value={settings.timezone}
                      onValueChange={(value) => 
                        setSettings(prev => ({ ...prev, timezone: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TIMEZONES.map(tz => (
                          <SelectItem key={tz.value} value={tz.value}>
                            {tz.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Notification Preferences</Label>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="notify-before"
                          checked={settings.notifications.beforeProcessing}
                          onCheckedChange={(checked) => 
                            setSettings(prev => ({
                              ...prev,
                              notifications: { ...prev.notifications, beforeProcessing: checked }
                            }))
                          }
                        />
                        <Label htmlFor="notify-before">Notify before processing</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="notify-after"
                          checked={settings.notifications.afterProcessing}
                          onCheckedChange={(checked) => 
                            setSettings(prev => ({
                              ...prev,
                              notifications: { ...prev.notifications, afterProcessing: checked }
                            }))
                          }
                        />
                        <Label htmlFor="notify-after">Notify after processing</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="notify-failure"
                          checked={settings.notifications.onFailure}
                          onCheckedChange={(checked) => 
                            setSettings(prev => ({
                              ...prev,
                              notifications: { ...prev.notifications, onFailure: checked }
                            }))
                          }
                        />
                        <Label htmlFor="notify-failure">Notify on failures</Label>
                      </div>
                    </div>
                  </div>

                  {jobStatus.isScheduled && jobStatus.nextExecution && (
                    <div className="bg-blue-50 p-4 rounded">
                      <div className="text-sm font-medium">Next Processing:</div>
                      <div className="text-lg">{formatDateTime(jobStatus.nextExecution)}</div>
                    </div>
                  )}
                </div>
              )}

              <Button 
                onClick={saveSettings} 
                disabled={saving}
                className="w-full md:w-auto"
              >
                {saving ? 'Saving...' : 'Save Settings'}
              </Button>
            </TabsContent>

            <TabsContent value="manual" className="space-y-6">
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold">Manual Processing</h3>
                  <p className="text-sm text-muted-foreground">
                    Manually trigger waiver processing or preview what would happen.
                  </p>
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={() => triggerManualProcessing(true)}
                    disabled={triggering}
                    variant="outline"
                  >
                    {triggering ? 'Loading...' : 'Preview Processing'}
                  </Button>
                  <Button
                    onClick={() => triggerManualProcessing(false)}
                    disabled={triggering}
                    variant="primary"
                  >
                    {triggering ? 'Processing...' : 'Process Waivers Now'}
                  </Button>
                </div>

                {preview && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Processing Preview</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <div className="text-center">
                          <div className="text-2xl font-bold">{preview.totalClaims}</div>
                          <div className="text-sm text-muted-foreground">Total Claims</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-green-600">{preview.expectedSuccessful}</div>
                          <div className="text-sm text-muted-foreground">Expected Successful</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-red-600">{preview.expectedFailed}</div>
                          <div className="text-sm text-muted-foreground">Expected Failed</div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <h4 className="font-semibold">Expected Successful Claims:</h4>
                        {preview.details.successful.map((claim: any, index: number) => (
                          <div key={index} className="flex justify-between items-center p-2 bg-green-50 rounded">
                            <span>{claim.team} → {claim.player}</span>
                            {claim.bid && <span className="font-mono">${claim.bid}</span>}
                          </div>
                        ))}

                        {preview.details.failed.length > 0 && (
                          <>
                            <h4 className="font-semibold mt-4">Expected Failed Claims:</h4>
                            {preview.details.failed.map((claim: any, index: number) => (
                              <div key={index} className="flex justify-between items-center p-2 bg-red-50 rounded">
                                <span>{claim.team} → {claim.player}</span>
                                <span className="text-sm text-red-600">{claim.reason}</span>
                              </div>
                            ))}
                          </>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>

            <TabsContent value="history" className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold">Processing History</h3>
                <p className="text-sm text-muted-foreground">
                  Recent waiver processing runs for this league.
                </p>
              </div>

              {history.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No processing history available</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {history.map((run) => (
                    <Card key={run.id}>
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="flex items-center gap-2">
                              <Badge variant={getStatusColor(run.status)}>
                                {run.status}
                              </Badge>
                              <span className="text-sm text-muted-foreground">
                                {formatDateTime(run.executedAt)}
                              </span>
                            </div>
                            <div className="mt-1">
                              <span className="text-green-600">{run.processed} successful</span>
                              {run.failed > 0 && (
                                <span className="text-red-600 ml-2">{run.failed} failed</span>
                              )}
                              {run.duration && (
                                <span className="text-muted-foreground ml-2">
                                  ({run.duration}ms)
                                </span>
                              )}
                            </div>
                            {run.error && (
                              <div className="text-sm text-red-600 mt-1">
                                Error: {run.error}
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}