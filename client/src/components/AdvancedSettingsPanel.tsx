import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Settings, Zap, BarChart3, Users } from 'lucide-react';

interface AdvancedSettingsPanelProps {
  projectId: number;
  onClose?: () => void;
}

export function AdvancedSettingsPanel({ projectId: _projectId, onClose }: AdvancedSettingsPanelProps) {
  const [budget, setBudget] = useState<number>(1000);
  const [budgetPeriod, setBudgetPeriod] = useState<'monthly' | 'yearly'>('monthly');
  const [batchSize, setBatchSize] = useState<number>(5);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const [_autoExport, _setAutoExport] = useState<boolean>(false);

  return (
    <div className="w-full max-w-2xl mx-auto p-4">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Settings className="w-6 h-6" />
          <h2 className="text-2xl font-bold">Advanced Settings</h2>
        </div>
        {onClose && (
          <Button variant="ghost" onClick={onClose}>
            ✕
          </Button>
        )}
      </div>

      <Tabs defaultValue="batch" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="batch">
            <Zap className="w-4 h-4 mr-2" />
            Batch
          </TabsTrigger>
          <TabsTrigger value="timeline">
            <BarChart3 className="w-4 h-4 mr-2" />
            Timeline
          </TabsTrigger>
          <TabsTrigger value="budget">
            <AlertCircle className="w-4 h-4 mr-2" />
            Budget
          </TabsTrigger>
          <TabsTrigger value="collaboration">
            <Users className="w-4 h-4 mr-2" />
            Team
          </TabsTrigger>
        </TabsList>

        {/* Batch Processing Settings */}
        <TabsContent value="batch" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Batch Processing</CardTitle>
              <CardDescription>Configure batch video generation settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Max Jobs per Batch</label>
                <Input
                  type="number"
                  min="1"
                  max="20"
                  value={batchSize}
                  onChange={(e) => setBatchSize(parseInt(e.target.value))}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  Process up to {batchSize} videos simultaneously
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Default Provider</label>
                <select className="w-full px-3 py-2 border rounded-md">
                  <option>Veo3</option>
                  <option>Sora</option>
                  <option>Flow</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Default Priority</label>
                <select className="w-full px-3 py-2 border rounded-md">
                  <option>Low</option>
                  <option selected>Medium</option>
                  <option>High</option>
                </select>
              </div>

              <Button className="w-full">Save Batch Settings</Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Timeline Settings */}
        <TabsContent value="timeline" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Timeline Playback</CardTitle>
              <CardDescription>Configure timeline editing and playback</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Default Playback Speed</label>
                <div className="flex gap-2">
                  {[0.5, 0.75, 1.0, 1.5, 2.0].map((speed) => (
                    <Button
                      key={speed}
                      variant={playbackSpeed === speed ? 'default' : 'outline'}
                      onClick={() => setPlaybackSpeed(speed)}
                      className="flex-1"
                    >
                      {speed}x
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Snap to Grid</label>
                <select className="w-full px-3 py-2 border rounded-md">
                  <option>0.25s</option>
                  <option selected>0.5s</option>
                  <option>1s</option>
                  <option>2s</option>
                  <option>Off</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Auto-save Timeline</label>
                <div className="flex items-center gap-2">
                  <input type="checkbox" defaultChecked className="w-4 h-4" />
                  <span className="text-sm">Save timeline changes automatically</span>
                </div>
              </div>

              <Button className="w-full">Save Timeline Settings</Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Budget Settings */}
        <TabsContent value="budget" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Budget Management</CardTitle>
              <CardDescription>Set and monitor project budget</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Monthly Budget</label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    min="0"
                    value={budget}
                    onChange={(e) => setBudget(parseInt(e.target.value))}
                    placeholder="Enter budget amount"
                    className="flex-1"
                  />
                  <span className="px-3 py-2 bg-muted rounded-md text-sm font-medium">
                    credits
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Budget Period</label>
                <div className="flex gap-2">
                  <Button
                    variant={budgetPeriod === 'monthly' ? 'default' : 'outline'}
                    onClick={() => setBudgetPeriod('monthly')}
                    className="flex-1"
                  >
                    Monthly
                  </Button>
                  <Button
                    variant={budgetPeriod === 'yearly' ? 'default' : 'outline'}
                    onClick={() => setBudgetPeriod('yearly')}
                    className="flex-1"
                  >
                    Yearly
                  </Button>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                <p className="text-sm text-blue-900">
                  Current spend: 234 credits / {budget} credits ({Math.round((234 / budget) * 100)}%)
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Alert Threshold</label>
                <select className="w-full px-3 py-2 border rounded-md">
                  <option>50%</option>
                  <option selected>75%</option>
                  <option>90%</option>
                  <option>100%</option>
                </select>
              </div>

              <Button className="w-full">Save Budget Settings</Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Collaboration Settings */}
        <TabsContent value="collaboration" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Team Collaboration</CardTitle>
              <CardDescription>Manage team members and permissions</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 border rounded-md">
                  <div>
                    <p className="font-medium text-sm">Eduardo Viladoms</p>
                    <p className="text-xs text-muted-foreground">Owner</p>
                  </div>
                  <Badge>Admin</Badge>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Invite Team Member</label>
                <div className="flex gap-2">
                  <Input
                    type="email"
                    placeholder="Enter email address"
                    className="flex-1"
                  />
                  <Button>Invite</Button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Default Role for New Members</label>
                <select className="w-full px-3 py-2 border rounded-md">
                  <option>Viewer</option>
                  <option selected>Editor</option>
                  <option>Admin</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Activity Notifications</label>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <input type="checkbox" defaultChecked className="w-4 h-4" />
                    <span className="text-sm">New comments</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="checkbox" defaultChecked className="w-4 h-4" />
                    <span className="text-sm">Video generation complete</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="checkbox" className="w-4 h-4" />
                    <span className="text-sm">Team member activity</span>
                  </div>
                </div>
              </div>

              <Button className="w-full">Save Collaboration Settings</Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
