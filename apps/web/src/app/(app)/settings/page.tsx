'use client';

import { useState, useEffect, useCallback } from 'react'
import {
  Settings as SettingsIcon,
  Plus,
  Eye,
  EyeOff,
  RefreshCw,
  Download,
  Copy,
  Trash2,
  Key,
  Loader2,
  Check,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { apiFetch } from '@/lib/api'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('users')
  const [showKeys, setShowKeys] = useState<Record<number, boolean>>({})
  const tabs = [
    {
      id: 'users',
      label: 'Users',
    },
    {
      id: 'agents',
      label: 'Agent Configuration',
    },
    {
      id: 'apikeys',
      label: 'API Keys',
    },
    {
      id: 'billing',
      label: 'Billing / Usage',
    },
    {
      id: 'audit',
      label: 'Audit Log',
    },
  ]
  const users = [
    {
      name: 'Sarah Chen',
      email: 'sarah@growthrocket.io',
      role: 'Account Manager',
      roleColor: 'bg-blue-50 text-blue-600 border-blue-200',
      status: 'Active',
    },
    {
      name: 'Marcus Rivera',
      email: 'marcus@growthrocket.io',
      role: 'Account Manager',
      roleColor: 'bg-blue-50 text-blue-600 border-blue-200',
      status: 'Active',
    },
    {
      name: 'Jordan Park',
      email: 'jordan@growthrocket.io',
      role: 'Strategist',
      roleColor: 'bg-emerald-50 text-emerald-600 border-emerald-200',
      status: 'Active',
    },
    {
      name: 'Alex Thompson',
      email: 'alex@growthrocket.io',
      role: 'Admin',
      roleColor: 'bg-primary/10 text-primary border-primary/30',
      status: 'Active',
    },
    {
      name: 'Priya Sharma',
      email: 'priya@growthrocket.io',
      role: 'Leadership',
      roleColor: 'bg-purple-50 text-purple-600 border-purple-200',
      status: 'Inactive',
    },
  ]
  const agents = [
    {
      name: 'Data Agent',
      desc: 'Analyzes metrics, pulls data, generates insights',
      color: 'border-t-primary',
      model: 'Opus 4.6',
    },
    {
      name: 'Visualization Agent',
      desc: 'Creates charts, graphs, and visual reports',
      color: 'border-t-blue-500',
      model: 'Sonnet 4.6',
    },
    {
      name: 'Strategy Agent',
      desc: 'Provides strategic recommendations and action plans',
      color: 'border-t-emerald-500',
      model: 'Opus 4.6',
    },
    {
      name: 'Trends Agent',
      desc: 'Monitors industry trends and algorithm updates',
      color: 'border-t-purple-500',
      model: 'Haiku 4.5',
    },
  ]
  const apiKeys = [
    {
      name: 'Google Analytics 4',
      status: 'Connected',
      lastUsed: '2 min ago',
      key: '****...a3f2',
    },
    {
      name: 'Google Search Console',
      status: 'Connected',
      lastUsed: '15 min ago',
      key: '****...b7e1',
    },
    {
      name: 'Meta Ads API',
      status: 'Connected',
      lastUsed: '1 hour ago',
      key: '****...c9d4',
    },
    {
      name: 'Semrush API',
      status: 'Connected',
      lastUsed: '3 hours ago',
      key: '****...e2f8',
    },
  ]
  const usageData = [
    {
      name: 'Data Agent',
      value: 45000,
      fill: 'hsl(16 91% 47%)',
    },
    {
      name: 'Viz Agent',
      value: 28000,
      fill: '#3B82F6',
    },
    {
      name: 'Strategy Agent',
      value: 32000,
      fill: '#10B981',
    },
    {
      name: 'Trends Agent',
      value: 19847,
      fill: '#8B5CF6',
    },
  ]
  const auditLogs = [
    {
      time: '10:42 AM',
      user: 'Sarah Chen',
      action: 'Generated report',
      client: 'Acme Corp',
      details: 'Q3 Performance Review',
    },
    {
      time: '09:15 AM',
      user: 'Marcus Rivera',
      action: 'Connected data source',
      client: 'TechFlow Inc',
      details: 'Meta Ads API',
    },
    {
      time: 'Yesterday',
      user: 'Jordan Park',
      action: 'Updated client goals',
      client: 'Vertex AI',
      details: 'Target ROAS changed to 4.5x',
    },
    {
      time: 'Yesterday',
      user: 'Alex Thompson',
      action: 'Invited user',
      client: 'System',
      details: 'Sent invite to david@growthrocket.io',
    },
    {
      time: 'Oct 12',
      user: 'Sarah Chen',
      action: 'Pulled latest data',
      client: 'Bloom Health',
      details: 'Manual sync triggered',
    },
    {
      time: 'Oct 11',
      user: 'System',
      action: 'Agent model updated',
      client: 'System',
      details: 'Trends Agent updated to Haiku 4.5',
    },
    {
      time: 'Oct 10',
      user: 'Marcus Rivera',
      action: 'Generated report',
      client: 'NovaPay',
      details: 'Competitor Landscape',
    },
    {
      time: 'Oct 08',
      user: 'Sarah Chen',
      action: 'Created client',
      client: 'Acme Corp',
      details: 'Initial onboarding completed',
    },
  ]
  const toggleKey = (index: number) => {
    setShowKeys((prev) => ({
      ...prev,
      [index]: !prev[index],
    }))
  }
  return (
    <div className="h-full flex flex-col overflow-hidden bg-background">
      <div className="shrink-0 p-8 pb-6 max-w-7xl mx-auto w-full">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Settings
        </h1>
        <p className="text-muted-foreground mt-1">
          Platform configuration and administration.
        </p>
      </div>

      <div className="flex-1 min-h-0 flex flex-col md:flex-row mx-8 mb-8 max-w-7xl border border-border rounded-lg overflow-hidden bg-card shadow-sm">
        {/* Left Sub-nav */}
        <div className="w-full md:w-64 border-r border-border bg-accent/30 p-4 space-y-1 flex-shrink-0 overflow-y-auto">
          {tabs.map((tab) => (
            <div
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-2.5 rounded-md text-sm font-medium cursor-pointer transition-colors ${activeTab === tab.id ? 'bg-card text-primary border-l-2 border-primary shadow-sm' : 'text-muted-foreground hover:bg-accent hover:text-foreground border-l-2 border-transparent'}`}
            >
              {tab.label}
            </div>
          ))}
        </div>

        {/* Right Content Area */}
        <div className="flex-1 min-w-0 p-6 md:p-8 overflow-y-auto overflow-x-hidden">
          {/* USERS TAB */}
          {activeTab === 'users' && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">
                    User Management
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Manage team access and roles.
                  </p>
                </div>
                <Button className="gap-2 shadow-sm">
                  <Plus className="w-4 h-4" /> Invite User
                </Button>
              </div>

              <div className="border border-border rounded-md overflow-hidden bg-card shadow-sm">
                <table className="w-full text-sm text-left">
                  <thead className="bg-accent/50 text-muted-foreground border-b border-border">
                    <tr>
                      <th className="px-4 py-3 font-medium">Name</th>
                      <th className="px-4 py-3 font-medium">Email</th>
                      <th className="px-4 py-3 font-medium">Role</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {users.map((user, i) => (
                      <tr
                        key={i}
                        className="hover:bg-accent/20 transition-colors"
                      >
                        <td className="px-4 py-3 font-medium text-foreground">
                          {user.name}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {user.email}
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            variant="outline"
                            className={`font-medium ${user.roleColor}`}
                          >
                            {user.role}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div
                              className={`w-8 h-4 rounded-full p-0.5 cursor-pointer transition-colors ${user.status === 'Active' ? 'bg-primary' : 'bg-border'}`}
                            >
                              <div
                                className={`w-3 h-3 rounded-full bg-white shadow-sm transition-transform ${user.status === 'Active' ? 'translate-x-4' : 'translate-x-0'}`}
                              ></div>
                            </div>
                            <span className="text-xs font-medium text-muted-foreground">
                              {user.status}
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* AGENT CONFIG TAB */}
          {activeTab === 'agents' && (
            <div className="space-y-6 animate-fade-in">
              <div>
                <h2 className="text-lg font-semibold text-foreground">
                  Agent Configuration
                </h2>
                <p className="text-sm text-muted-foreground">
                  Configure AI models and capabilities for each specialized
                  agent.
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {agents.map((agent, i) => (
                  <Card
                    key={i}
                    className={`border-t-4 ${agent.color} shadow-sm`}
                  >
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base text-foreground">
                        {agent.name}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        {agent.desc}
                      </p>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Language Model
                        </label>
                        <select className="w-full h-9 rounded-md border border-border bg-background px-3 py-1 text-sm text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary shadow-sm">
                          <option
                            value="opus"
                            selected={agent.model === 'Opus 4.6'}
                          >
                            Claude 3.5 Opus (4.6)
                          </option>
                          <option
                            value="sonnet"
                            selected={agent.model === 'Sonnet 4.6'}
                          >
                            Claude 3.5 Sonnet (4.6)
                          </option>
                          <option
                            value="haiku"
                            selected={agent.model === 'Haiku 4.5'}
                          >
                            Claude 3 Haiku (4.5)
                          </option>
                        </select>
                      </div>
                      <div className="flex items-center justify-between pt-2 border-t border-border/50">
                        <span className="text-sm font-medium text-foreground">
                          Allow per-client overrides
                        </span>
                        <div className="w-8 h-4 rounded-full bg-primary p-0.5 cursor-pointer">
                          <div className="w-3 h-3 rounded-full bg-white shadow-sm translate-x-4"></div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* API KEYS TAB */}
          {activeTab === 'apikeys' && (
            <ApiKeysTab />
          )}

          {/* BILLING TAB */}
          {activeTab === 'billing' && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">
                    Usage & Billing
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Monitor API consumption and costs.
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 bg-background shadow-sm"
                >
                  <Download className="w-4 h-4 text-muted-foreground" /> Export
                  CSV
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="shadow-sm">
                  <CardContent className="p-5">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                      Total API Calls
                    </p>
                    <div className="text-2xl font-mono font-semibold text-foreground">
                      124,847
                    </div>
                  </CardContent>
                </Card>
                <Card className="shadow-sm">
                  <CardContent className="p-5">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                      Total Cost
                    </p>
                    <div className="text-2xl font-mono font-semibold text-foreground">
                      $342.18
                    </div>
                  </CardContent>
                </Card>
                <Card className="shadow-sm">
                  <CardContent className="p-5">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                      Avg Cost / Query
                    </p>
                    <div className="text-2xl font-mono font-semibold text-foreground">
                      $0.0027
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card className="shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base text-foreground">
                    Usage by Agent
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[250px] w-full mt-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={usageData}
                        margin={{
                          top: 10,
                          right: 10,
                          left: -20,
                          bottom: 0,
                        }}
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="#E2E8F0"
                          vertical={false}
                        />
                        <XAxis
                          dataKey="name"
                          stroke="#64748B"
                          fontSize={12}
                          tickLine={false}
                          axisLine={false}
                        />
                        <YAxis
                          stroke="#64748B"
                          fontSize={12}
                          tickLine={false}
                          axisLine={false}
                          tickFormatter={(val) => `${val / 1000}k`}
                        />
                        <Tooltip
                          cursor={{
                            fill: '#F1F5F9',
                            opacity: 0.4,
                          }}
                          contentStyle={{
                            backgroundColor: '#FFFFFF',
                            borderColor: '#E2E8F0',
                            borderRadius: '8px',
                            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                          }}
                          itemStyle={{
                            color: '#1E293B',
                            fontWeight: 500,
                          }}
                        />
                        <Bar dataKey="value" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* AUDIT LOG TAB */}
          {activeTab === 'audit' && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">
                    Audit Log
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    System-wide activity history.
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 bg-background shadow-sm"
                >
                  <Download className="w-4 h-4 text-muted-foreground" /> Export
                  Log
                </Button>
              </div>

              <div className="border border-border rounded-md overflow-hidden bg-card shadow-sm">
                <table className="w-full text-sm text-left">
                  <thead className="bg-accent/50 text-muted-foreground border-b border-border">
                    <tr>
                      <th className="px-4 py-3 font-medium">Timestamp</th>
                      <th className="px-4 py-3 font-medium">User</th>
                      <th className="px-4 py-3 font-medium">Action</th>
                      <th className="px-4 py-3 font-medium">Client</th>
                      <th className="px-4 py-3 font-medium">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {auditLogs.map((log, i) => (
                      <tr
                        key={i}
                        className="hover:bg-accent/20 transition-colors"
                      >
                        <td className="px-4 py-3 text-muted-foreground font-medium whitespace-nowrap">
                          {log.time}
                        </td>
                        <td className="px-4 py-3 font-medium text-foreground whitespace-nowrap">
                          {log.user}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-foreground">
                          {log.action}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                          {log.client}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground truncate max-w-[200px]">
                          {log.details}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

interface ApiKeyRecord {
  id: string;
  name: string;
  keyPrefix: string;
  scopeClientId: string | null;
  lastUsedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
  rawKey?: string;
}

function ApiKeysTab() {
  const [keys, setKeys] = useState<ApiKeyRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [newlyCreated, setNewlyCreated] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const fetchKeys = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch<ApiKeyRecord[]>('/api/api-keys');
      setKeys(data);
    } catch { /* empty */ }
    setLoading(false);
  }, []);

  useEffect(() => { fetchKeys(); }, [fetchKeys]);

  const handleCreate = async () => {
    if (!newKeyName.trim()) return;
    setCreating(true);
    try {
      const result = await apiFetch<ApiKeyRecord>('/api/api-keys', {
        method: 'POST',
        body: { name: newKeyName.trim() },
      });
      setNewlyCreated(result.rawKey || null);
      setNewKeyName('');
      setShowCreate(false);
      await fetchKeys();
    } catch { /* empty */ }
    setCreating(false);
  };

  const handleRevoke = async (id: string) => {
    try {
      await apiFetch(`/api/api-keys/${id}`, { method: 'DELETE' });
      await fetchKeys();
    } catch { /* empty */ }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const activeKeys = keys.filter((k) => !k.revokedAt);
  const revokedKeys = keys.filter((k) => k.revokedAt);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">API Keys</h2>
          <p className="text-sm text-muted-foreground">
            Generate keys for external integrations (OpenClaw, webhooks, custom apps).
          </p>
        </div>
        <Button size="sm" className="gap-2 shadow-sm" onClick={() => setShowCreate(true)}>
          <Plus className="w-4 h-4" /> Generate Key
        </Button>
      </div>

      {showCreate && (
        <Card className="shadow-sm border-primary/30">
          <CardContent className="p-5">
            <div className="flex items-end gap-3">
              <div className="flex-1 space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Key Name</label>
                <Input
                  placeholder="e.g. OpenClaw Integration"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                  className="bg-background shadow-sm"
                />
              </div>
              <Button size="sm" onClick={handleCreate} disabled={creating || !newKeyName.trim()} className="gap-2">
                {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Key className="w-4 h-4" />}
                {creating ? 'Creating...' : 'Create'}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setShowCreate(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {newlyCreated && (
        <Card className="shadow-sm border-emerald-500/30 bg-emerald-500/5">
          <CardContent className="p-5">
            <p className="text-sm font-medium text-foreground mb-2">Your new API key (copy it now — it won&apos;t be shown again):</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 bg-background border border-border rounded-md px-3 py-2 text-sm font-mono text-foreground break-all">
                {newlyCreated}
              </code>
              <Button size="sm" variant="outline" className="gap-1.5 shrink-0" onClick={() => handleCopy(newlyCreated)}>
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copied' : 'Copy'}
              </Button>
            </div>
            <Button size="sm" variant="ghost" className="mt-3 text-muted-foreground" onClick={() => setNewlyCreated(null)}>Dismiss</Button>
          </CardContent>
        </Card>
      )}

      {loading && (
        <div className="flex items-center justify-center py-12 text-muted-foreground gap-2">
          <Loader2 className="w-5 h-5 animate-spin" /> Loading keys...
        </div>
      )}

      {!loading && activeKeys.length === 0 && !showCreate && (
        <div className="text-center py-12">
          <Key className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-50" />
          <p className="text-muted-foreground mb-2">No API keys yet</p>
          <p className="text-xs text-muted-foreground">Generate a key to allow external apps to access the Telemetry API.</p>
        </div>
      )}

      {!loading && activeKeys.length > 0 && (
        <div className="space-y-3">
          {activeKeys.map((key) => (
            <Card key={key.id} className="shadow-sm">
              <CardContent className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                    <h3 className="font-medium text-foreground">{key.name}</h3>
                  </div>
                  <p className="text-xs text-muted-foreground font-medium">
                    {key.keyPrefix} · Created {new Date(key.createdAt).toLocaleDateString()}
                    {key.lastUsedAt && <> · Last used {new Date(key.lastUsedAt).toLocaleDateString()}</>}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20"
                  onClick={() => handleRevoke(key.id)}
                >
                  <Trash2 className="w-3 h-3" /> Revoke
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!loading && revokedKeys.length > 0 && (
        <div className="mt-6">
          <h3 className="text-sm font-medium text-muted-foreground mb-3">Revoked Keys</h3>
          <div className="space-y-2">
            {revokedKeys.map((key) => (
              <div key={key.id} className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-accent/20 opacity-60">
                <div>
                  <span className="text-sm text-muted-foreground">{key.name}</span>
                  <span className="text-xs text-muted-foreground ml-2">{key.keyPrefix}</span>
                </div>
                <Badge variant="outline" className="text-[10px] text-red-500 border-red-200">Revoked</Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      <Card className="shadow-sm border-border/50 mt-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">API Reference</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">Use your API key in the <code className="bg-accent px-1.5 py-0.5 rounded text-xs">X-API-Key</code> header.</p>
          <div className="space-y-2 font-mono text-xs">
            <div className="flex items-center gap-2 p-2 rounded bg-accent/50 border border-border/50">
              <Badge variant="outline" className="text-[9px] px-1 bg-blue-50 text-blue-600 border-blue-200 shrink-0">GET</Badge>
              <span className="text-foreground">/api/v1/clients</span>
              <span className="text-muted-foreground ml-auto">List clients</span>
            </div>
            <div className="flex items-center gap-2 p-2 rounded bg-accent/50 border border-border/50">
              <Badge variant="outline" className="text-[9px] px-1 bg-blue-50 text-blue-600 border-blue-200 shrink-0">GET</Badge>
              <span className="text-foreground">/api/v1/clients/:id/metrics</span>
              <span className="text-muted-foreground ml-auto">Metric snapshot</span>
            </div>
            <div className="flex items-center gap-2 p-2 rounded bg-accent/50 border border-border/50">
              <Badge variant="outline" className="text-[9px] px-1 bg-blue-50 text-blue-600 border-blue-200 shrink-0">GET</Badge>
              <span className="text-foreground">/api/v1/clients/:id/reports</span>
              <span className="text-muted-foreground ml-auto">List reports</span>
            </div>
            <div className="flex items-center gap-2 p-2 rounded bg-accent/50 border border-border/50">
              <Badge variant="outline" className="text-[9px] px-1 bg-emerald-50 text-emerald-600 border-emerald-200 shrink-0">POST</Badge>
              <span className="text-foreground">/api/v1/agents/query</span>
              <span className="text-muted-foreground ml-auto">Query AI agents</span>
            </div>
            <div className="flex items-center gap-2 p-2 rounded bg-accent/50 border border-border/50">
              <Badge variant="outline" className="text-[9px] px-1 bg-blue-50 text-blue-600 border-blue-200 shrink-0">GET</Badge>
              <span className="text-foreground">/api/v1/trends/digest</span>
              <span className="text-muted-foreground ml-auto">Trends digest</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
