'use client';

import { useState, useEffect, useCallback } from 'react';
import { FileText, Plus, Loader2, Trash2, ArrowLeft, Download, Sparkles, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useClient } from '@/lib/client-context';
import { apiFetch } from '@/lib/api';
import { SuluMarkdown } from '@/components/sulu/sulu-markdown';

interface ReportSummary {
  id: string;
  title: string;
  clientName: string;
  createdByAgent: string | null;
  createdAt: string;
  sectionCount: number;
}

interface ReportSection {
  type: string;
  title: string;
  content: string;
  agentType?: string;
}

interface ReportDetail {
  id: string;
  title: string;
  clientName: string;
  createdByAgent: string | null;
  createdAt: string;
  contentJson: {
    sections?: ReportSection[];
    generatedAt?: string;
    prompt?: string;
  };
}

const AGENT_COLORS: Record<string, string> = {
  data: 'text-[#E8450A] border-[#E8450A]/30 bg-[#E8450A]/5',
  strategy: 'text-emerald-600 border-emerald-500/30 bg-emerald-50',
  trends: 'text-purple-600 border-purple-500/30 bg-purple-50',
  visualization: 'text-[#3B82F6] border-[#3B82F6]/30 bg-[#3B82F6]/5',
};

const AGENT_LABELS: Record<string, string> = {
  data: 'Data Agent',
  strategy: 'Strategy Agent',
  trends: 'Trends Agent',
  visualization: 'Viz Agent',
};

const AGENT_GRADIENTS: Record<string, string> = {
  data: 'from-primary/10 to-background',
  strategy: 'from-emerald-500/10 to-background',
  trends: 'from-purple-500/10 to-background',
  visualization: 'from-blue-500/10 to-background',
};

export default function ReportsPage() {
  const { selectedClient } = useClient();
  const [reports, setReports] = useState<ReportSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [selectedReport, setSelectedReport] = useState<ReportDetail | null>(null);
  const [viewLoading, setViewLoading] = useState(false);
  const [showNewModal, setShowNewModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newPrompt, setNewPrompt] = useState('');

  const fetchReports = useCallback(async () => {
    if (!selectedClient) return;
    setLoading(true);
    try {
      const data = await apiFetch<ReportSummary[]>(`/api/reports/${selectedClient.id}`);
      setReports(data);
    } catch (err) {
      console.error('Failed to fetch reports:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedClient]);

  useEffect(() => {
    fetchReports();
    setSelectedReport(null);
  }, [fetchReports]);

  const handleViewReport = async (reportId: string) => {
    if (!selectedClient) return;
    setViewLoading(true);
    try {
      const data = await apiFetch<ReportDetail>(`/api/reports/${selectedClient.id}/${reportId}`);
      setSelectedReport(data);
    } catch (err) {
      console.error('Failed to fetch report:', err);
    } finally {
      setViewLoading(false);
    }
  };

  const handleDeleteReport = async (reportId: string) => {
    if (!selectedClient || !confirm('Delete this report?')) return;
    try {
      await apiFetch(`/api/reports/${selectedClient.id}/${reportId}`, { method: 'DELETE' });
      setReports((prev) => prev.filter((r) => r.id !== reportId));
      if (selectedReport?.id === reportId) setSelectedReport(null);
    } catch (err) {
      console.error('Failed to delete report:', err);
    }
  };

  const handleGenerateReport = async () => {
    if (!selectedClient) return;
    setGenerating(true);
    setShowNewModal(false);
    try {
      const data = await apiFetch<ReportDetail>(`/api/reports/${selectedClient.id}/generate`, {
        method: 'POST',
        body: {
          title: newTitle.trim() || undefined,
          prompt: newPrompt.trim() || undefined,
        },
      });
      setSelectedReport(data);
      setNewTitle('');
      setNewPrompt('');
      fetchReports();
    } catch (err) {
      console.error('Failed to generate report:', err);
      alert(`Report generation failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setGenerating(false);
    }
  };

  // Report detail view
  if (selectedReport) {
    const sections = selectedReport.contentJson?.sections || [];
    return (
      <div className="p-8 h-full overflow-y-auto bg-background">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedReport(null)}
              className="gap-2 rounded-full"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Reports
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-2 rounded-full shadow-sm"
              onClick={() => {
                if (!selectedClient) return;
                window.open(`/api/reports/${selectedClient.id}/${selectedReport.id}/export/pptx`, '_blank');
              }}
            >
              <Download className="w-4 h-4" /> Export PPTX
            </Button>
          </div>

          <div className="mb-8">
            <h1 className="text-2xl font-bold tracking-tight text-foreground mb-2">
              {selectedReport.title}
            </h1>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <span>{selectedReport.clientName}</span>
              <span>•</span>
              <span>{new Date(selectedReport.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
              {selectedReport.createdByAgent && (
                <>
                  <span>•</span>
                  <Badge variant="outline" className={`shadow-none text-[10px] h-5 px-2 font-medium ${AGENT_COLORS[selectedReport.createdByAgent] || ''}`}>
                    {AGENT_LABELS[selectedReport.createdByAgent] || selectedReport.createdByAgent}
                  </Badge>
                </>
              )}
            </div>
          </div>

          <div className="space-y-6">
            {sections.map((section, i) => (
              <Card key={i} className="shadow-sm border-border/50 overflow-hidden">
                <div className="border-b border-border/50 px-5 py-3 flex items-center justify-between bg-muted/20">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-foreground">{section.title}</h3>
                    {section.agentType && (
                      <Badge variant="outline" className={`shadow-none text-[10px] h-5 px-1.5 font-medium ${AGENT_COLORS[section.agentType] || ''}`}>
                        <Sparkles className="w-3 h-3 mr-1" />{AGENT_LABELS[section.agentType] || section.agentType}
                      </Badge>
                    )}
                  </div>
                </div>
                <CardContent className="p-5">
                  <SuluMarkdown content={section.content} />
                </CardContent>
              </Card>
            ))}

            {sections.length === 0 && (
              <div className="text-center text-muted-foreground py-12">
                This report has no content sections.
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Report list view
  return (
    <div className="p-8 h-full overflow-y-auto bg-background">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Reports
          </h1>
          <p className="text-muted-foreground mt-1">
            Generated intelligence and client deliverables.
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            className="gap-2 shadow-sm rounded-full px-5"
            onClick={() => setShowNewModal(true)}
            disabled={!selectedClient || generating}
          >
            {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            {generating ? 'Generating...' : 'New Report'}
          </Button>
        </div>
      </div>

      {!selectedClient ? (
        <div className="text-center py-20 text-muted-foreground">
          Select a client from the Dashboard to view reports.
        </div>
      ) : loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : reports.length === 0 ? (
        <div className="text-center py-20">
          <FileText className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">No reports yet</h3>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            Generate an AI report to get started. Sulu will analyze your client data and produce a comprehensive intelligence deliverable.
          </p>
          <Button
            className="gap-2 rounded-full px-5"
            onClick={() => setShowNewModal(true)}
            disabled={generating}
          >
            <Sparkles className="w-4 h-4" /> Generate First Report
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {reports.map((report) => {
            const agent = report.createdByAgent || 'strategy';
            return (
              <Card
                key={report.id}
                className="hover:border-primary/40 transition-all cursor-pointer group overflow-hidden flex flex-col shadow-sm border-border/50 rounded-2xl hover:shadow-md"
                onClick={() => handleViewReport(report.id)}
              >
                <div className={`h-28 bg-gradient-to-br ${AGENT_GRADIENTS[agent] || 'from-primary/10 to-background'} border-b border-border/50 flex items-center justify-center relative`}>
                  <FileText className="w-10 h-10 text-muted-foreground/30 group-hover:text-primary/50 transition-colors" />
                  <div className="absolute top-3 right-3 flex items-center gap-1">
                    <Badge variant="outline" className={`text-[10px] h-5 px-2 font-medium rounded-full shadow-none ${AGENT_COLORS[agent] || ''}`}>
                      {AGENT_LABELS[agent] || agent}
                    </Badge>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDeleteReport(report.id); }}
                    className="absolute top-3 left-3 w-6 h-6 rounded-full bg-background/80 border border-border/50 flex items-center justify-center text-muted-foreground hover:bg-destructive/10 hover:border-destructive/30 hover:text-destructive shadow-sm transition-colors opacity-0 group-hover:opacity-100"
                    title="Delete report"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
                <CardHeader className="py-5 flex-1 bg-card">
                  <CardTitle className="text-base leading-tight mb-2 group-hover:text-primary transition-colors text-foreground">
                    {report.title}
                  </CardTitle>
                  <div className="flex items-center justify-between mt-auto pt-2">
                    <p className="text-sm font-medium text-foreground">
                      {report.clientName}
                    </p>
                    <p className="text-xs text-muted-foreground font-medium">
                      {new Date(report.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  </div>
                </CardHeader>
                <div className="px-6 pb-5 pt-0 bg-card">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{report.sectionCount} section{report.sectionCount !== 1 ? 's' : ''}</span>
                    <span className="group-hover:text-primary transition-colors font-medium">View →</span>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {viewLoading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="bg-card p-6 rounded-2xl shadow-xl flex items-center gap-3 border border-border/50">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
            <span className="text-sm text-foreground">Loading report...</span>
          </div>
        </div>
      )}

      {/* New Report Modal */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowNewModal(false)} />
          <div className="relative bg-card rounded-2xl shadow-xl border border-border/50 w-full max-w-lg p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">Generate Report</h2>
              <Button variant="ghost" size="icon" onClick={() => setShowNewModal(false)} className="rounded-full">
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Report Title</label>
                <Input
                  placeholder="e.g., Monthly Performance Review"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="rounded-xl"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Custom Prompt (optional)</label>
                <textarea
                  placeholder="Leave blank for default comprehensive report, or describe what you want..."
                  value={newPrompt}
                  onChange={(e) => setNewPrompt(e.target.value)}
                  rows={3}
                  className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="ghost" onClick={() => setShowNewModal(false)} className="rounded-full">Cancel</Button>
              <Button onClick={handleGenerateReport} className="gap-2 rounded-full px-5">
                <Sparkles className="w-4 h-4" /> Generate
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
