'use client';

import { useState } from 'react'
import {
  X,
  UploadCloud,
  FileText,
  Sparkles,
  CheckCircle,
  Database,
  ArrowRight,
  ArrowLeft,
  BarChart3,
  AlertTriangle,
  Table2,
  Trash2,
  RefreshCw,
  Clock,
  CheckCircle2,
  Paperclip,
  Send,
  Mic,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
interface DataImportModalProps {
  isOpen: boolean
  onClose: () => void
}
interface ReviewFileData {
  name: string
  source: string
  date: string
  records: string
  rows: number
  errors: number
  warnings: number
  columns: {
    name: string
    type: string
    mapped: boolean
  }[]
  summary: string
  mapping: string
  storage: string
}
const reviewFiles: Record<string, ReviewFileData> = {
  'ga4_export_oct.csv': {
    name: 'ga4_export_oct.csv',
    source: 'Google Analytics 4',
    date: 'Oct 28, 2025',
    records: '12,847',
    rows: 12847,
    errors: 0,
    warnings: 3,
    columns: [
      {
        name: 'Date',
        type: 'date',
        mapped: true,
      },
      {
        name: 'Source/Medium',
        type: 'dimension',
        mapped: true,
      },
      {
        name: 'Campaign',
        type: 'dimension',
        mapped: true,
      },
      {
        name: 'Device Category',
        type: 'dimension',
        mapped: true,
      },
      {
        name: 'Sessions',
        type: 'metric',
        mapped: true,
      },
      {
        name: 'Engaged Sessions',
        type: 'metric',
        mapped: true,
      },
      {
        name: 'Engagement Rate',
        type: 'metric',
        mapped: true,
      },
      {
        name: 'Conversions',
        type: 'metric',
        mapped: true,
      },
      {
        name: 'Revenue',
        type: 'metric',
        mapped: true,
      },
    ],
    summary:
      'Google Analytics 4 export containing 12,847 rows of session data from Oct 1-28, 2025. Includes Source/Medium, Campaign, and Device Category dimensions with Sessions, Engagement Rate, Conversions, and Revenue metrics.',
    mapping:
      "Appended to Acme Corp's web analytics timeline. Connected with Sep 2025 data for MoM trend analysis across all acquisition channels. 3 minor warnings: duplicate session IDs detected in rows 4,201–4,203 (auto-deduplicated).",
    storage:
      'Chunked by week (4 chunks) and indexed for semantic retrieval. Key entities: 48 campaign names, 12 traffic sources, 6 conversion events. Time-series data stored in structured metrics store.',
  },
  'meta_ads_q3.xlsx': {
    name: 'meta_ads_q3.xlsx',
    source: 'Meta Ads',
    date: 'Oct 25, 2025',
    records: '3,241',
    rows: 3241,
    errors: 0,
    warnings: 1,
    columns: [
      {
        name: 'Date',
        type: 'date',
        mapped: true,
      },
      {
        name: 'Campaign Name',
        type: 'dimension',
        mapped: true,
      },
      {
        name: 'Ad Set Name',
        type: 'dimension',
        mapped: true,
      },
      {
        name: 'Impressions',
        type: 'metric',
        mapped: true,
      },
      {
        name: 'Clicks',
        type: 'metric',
        mapped: true,
      },
      {
        name: 'Spend',
        type: 'metric',
        mapped: true,
      },
      {
        name: 'Conversions',
        type: 'metric',
        mapped: true,
      },
      {
        name: 'CPA',
        type: 'metric',
        mapped: true,
      },
    ],
    summary:
      'Meta Ads export containing 3,241 rows of campaign performance data from Q3 2025 (Jul–Sep). Includes Campaign Name and Ad Set dimensions with Impressions, Clicks, Spend, Conversions, and CPA metrics.',
    mapping:
      "Appended to Acme Corp's paid media timeline. Cross-referenced with GA4 conversion data for attribution validation. 1 warning: 14 rows with null CPA values (campaigns with zero conversions).",
    storage:
      'Chunked by month (3 chunks) and indexed for semantic retrieval. Key entities: 22 campaign names, 8 ad sets, 3 conversion types. Spend data stored in financial metrics store for ROAS calculations.',
  },
}
export function DataImportModal({ isOpen, onClose }: DataImportModalProps) {
  const [step, setStep] = useState<'upload' | 'summary' | 'review'>('upload')
  const [isEditing, setIsEditing] = useState(false)
  const [activeReview, setActiveReview] = useState<ReviewFileData | null>(null)
  if (!isOpen) return null
  const handleSimulateUpload = () => {
    setStep('summary')
  }
  const handleClose = () => {
    setStep('upload')
    setIsEditing(false)
    setActiveReview(null)
    onClose()
  }
  const handleReview = (fileName: string) => {
    const fileData = reviewFiles[fileName]
    if (fileData) {
      setActiveReview(fileData)
      setStep('review')
    }
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
        onClick={handleClose}
      />

      {/* Modal Container */}
      <div className="relative w-full max-w-4xl bg-card rounded-2xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] flex flex-col overflow-hidden max-h-[90vh] animate-in fade-in zoom-in-95 duration-200 border border-border/50">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/50 bg-background/80 backdrop-blur-sm shrink-0">
          <div className="flex items-center gap-3">
            {step === 'review' && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setStep('upload')
                  setActiveReview(null)
                }}
                className="text-muted-foreground hover:text-foreground rounded-full hover:bg-accent/50 h-8 w-8 mr-1"
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
            )}
            <div className="p-2 bg-primary/10 rounded-xl">
              <UploadCloud className="w-5 h-5 text-primary" />
            </div>
            <h2 className="font-medium text-base text-foreground">
              {step === 'review' ? 'Import Review' : 'Import Data'}
            </h2>
            {step === 'review' && activeReview && (
              <Badge
                variant="secondary"
                className="ml-1 font-medium bg-secondary/50"
              >
                {activeReview.name}
              </Badge>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleClose}
            className="text-muted-foreground hover:text-foreground rounded-full hover:bg-accent/50"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-8 bg-background">
          {step === 'upload' ? (
            <div className="space-y-8 max-w-3xl mx-auto">
              {/* Upload Zone (B150-inspired) */}
              <div
                className="border-dashed border-2 border-border/80 rounded-2xl bg-accent/10 hover:bg-accent/30 transition-colors cursor-pointer p-12 flex flex-col items-center justify-center text-center relative overflow-hidden group"
                onClick={handleSimulateUpload}
              >
                <div className="absolute inset-0 bg-gradient-to-b from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="w-16 h-16 rounded-2xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center mb-6 shadow-sm">
                  <UploadCloud className="w-8 h-8 text-purple-600 dark:text-purple-400" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-2">
                  Drag & drop files here
                </h3>
                <p className="text-muted-foreground mb-6">
                  or click to browse your computer
                </p>
                <div className="flex items-center gap-4 text-sm text-muted-foreground mb-8 bg-background/50 px-4 py-2 rounded-full border border-border/50">
                  <span className="flex items-center gap-1.5">
                    <FileText className="w-4 h-4" /> CSV
                  </span>
                  <span className="w-1 h-1 rounded-full bg-border"></span>
                  <span className="flex items-center gap-1.5">
                    <FileText className="w-4 h-4" /> XLSX
                  </span>
                  <span className="w-1 h-1 rounded-full bg-border"></span>
                  <span className="flex items-center gap-1.5">
                    <Database className="w-4 h-4" /> Google Sheets URL
                  </span>
                </div>
                <Button
                  variant="default"
                  size="lg"
                  className="px-8 rounded-full shadow-sm"
                >
                  Browse Files
                </Button>
              </div>

              {/* Recent Uploads */}
              <div>
                <h3 className="text-sm font-medium text-foreground mb-4 px-1">
                  Recent Uploads
                </h3>
                <Card className="shadow-sm overflow-hidden border-border/50 rounded-xl">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-accent/30 text-muted-foreground border-b border-border/50">
                      <tr>
                        <th className="px-4 py-3 font-medium">File Name</th>
                        <th className="px-4 py-3 font-medium">Source</th>
                        <th className="px-4 py-3 font-medium">Date</th>
                        <th className="px-4 py-3 font-medium">Records</th>
                        <th className="px-4 py-3 font-medium">Status</th>
                        <th className="px-4 py-3 font-medium text-right">
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border bg-card">
                      <tr className="hover:bg-accent/20 transition-colors">
                        <td className="px-4 py-3 font-medium text-foreground">
                          ga4_export_oct.csv
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          Google Analytics 4
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          Oct 28, 2025
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                          12,847
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="success" className="font-normal">
                            Processed
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-primary h-8"
                            onClick={() => handleReview('ga4_export_oct.csv')}
                          >
                            Review
                          </Button>
                        </td>
                      </tr>
                      <tr className="hover:bg-accent/20 transition-colors">
                        <td className="px-4 py-3 font-medium text-foreground">
                          meta_ads_q3.xlsx
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          Meta Ads
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          Oct 25, 2025
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                          3,241
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="success" className="font-normal">
                            Processed
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-primary h-8"
                            onClick={() => handleReview('meta_ads_q3.xlsx')}
                          >
                            Review
                          </Button>
                        </td>
                      </tr>
                      <tr className="hover:bg-accent/20 transition-colors">
                        <td className="px-4 py-3 font-medium text-foreground">
                          keyword_rankings.csv
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          Semrush
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          Oct 20, 2025
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                          8,932
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            variant="outline"
                            className="font-normal text-amber-600 border-amber-500/30 bg-amber-50 gap-1.5 shadow-none"
                          >
                            <span className="flex h-1.5 w-1.5 relative">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-500"></span>
                            </span>
                            Processing...
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled
                            className="h-8 rounded-full"
                          >
                            Review
                          </Button>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </Card>
              </div>
            </div>
          ) : step === 'review' && activeReview ? (
            <div className="max-w-3xl mx-auto space-y-6 animate-in slide-in-from-right-4 duration-300">
              {/* File Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 shadow-sm">
                    <CheckCircle className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">
                      {activeReview.name}
                    </h3>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {activeReview.source} • {activeReview.date} •{' '}
                      {activeReview.records} rows
                    </p>
                  </div>
                </div>
                <Badge variant="success" className="font-normal shadow-none">
                  Processed
                </Badge>
              </div>

              {/* Data Quality Metrics */}
              <div className="grid grid-cols-3 gap-4">
                <div className="border border-border/50 rounded-xl p-4 bg-card">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Rows Processed
                    </span>
                  </div>
                  <p className="text-2xl font-mono font-bold text-foreground">
                    {activeReview.rows.toLocaleString()}
                  </p>
                </div>
                <div className="border border-border/50 rounded-xl p-4 bg-card">
                  <div className="flex items-center gap-2 mb-2">
                    <X className="w-4 h-4 text-red-400" />
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Errors
                    </span>
                  </div>
                  <p className="text-2xl font-mono font-bold text-foreground">
                    {activeReview.errors}
                  </p>
                </div>
                <div className="border border-border/50 rounded-xl p-4 bg-card">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Warnings
                    </span>
                  </div>
                  <p className="text-2xl font-mono font-bold text-foreground">
                    {activeReview.warnings}
                  </p>
                </div>
              </div>

              {/* AI Import Summary */}
              <Card className="border-border/50 shadow-sm rounded-xl overflow-hidden">
                <CardHeader className="bg-primary/5 border-b border-border/50 pb-3 pt-4">
                  <CardTitle className="flex items-center gap-2 text-primary text-sm font-medium">
                    <Sparkles className="w-4 h-4" />
                    AI Import Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-6 bg-background">
                  <div className="space-y-2">
                    <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                      <FileText className="w-3.5 h-3.5" />
                      What was imported
                    </h4>
                    <p className="text-sm text-muted-foreground bg-accent/20 p-4 rounded-xl leading-relaxed border border-border/40">
                      {activeReview.summary}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                      <ArrowRight className="w-3.5 h-3.5" />
                      Client data mapping
                    </h4>
                    <p className="text-sm text-muted-foreground bg-accent/20 p-4 rounded-xl leading-relaxed border border-border/40">
                      {activeReview.mapping}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                      <Database className="w-3.5 h-3.5" />
                      RAG storage
                    </h4>
                    <p className="text-sm text-muted-foreground bg-accent/20 p-4 rounded-xl leading-relaxed border border-border/40">
                      {activeReview.storage}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Column Schema */}
              <div>
                <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2 px-1">
                  <Table2 className="w-3.5 h-3.5" />
                  Column Schema ({activeReview.columns.length} fields)
                </h4>
                <Card className="shadow-sm overflow-hidden border-border/50 rounded-xl">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-accent/30 text-muted-foreground border-b border-border/50">
                      <tr>
                        <th className="px-4 py-2.5 font-medium text-xs">
                          Column
                        </th>
                        <th className="px-4 py-2.5 font-medium text-xs">
                          Type
                        </th>
                        <th className="px-4 py-2.5 font-medium text-xs text-right">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50 bg-card">
                      {activeReview.columns.map((col, i) => (
                        <tr
                          key={i}
                          className="hover:bg-accent/10 transition-colors"
                        >
                          <td className="px-4 py-2.5 font-medium text-foreground text-sm">
                            {col.name}
                          </td>
                          <td className="px-4 py-2.5">
                            <Badge
                              variant="outline"
                              className="font-mono text-xs shadow-none bg-background border-border/60"
                            >
                              {col.type}
                            </Badge>
                          </td>
                          <td className="px-4 py-2.5 text-right">
                            <Badge
                              variant="outline"
                              className="text-emerald-600 bg-emerald-50 border-emerald-200 shadow-none text-xs"
                            >
                              Mapped
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </Card>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 rounded-full shadow-sm"
                >
                  <RefreshCw className="w-4 h-4" /> Re-process
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-2 rounded-full text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="w-4 h-4" /> Delete Import
                </Button>
                <span className="ml-auto text-xs text-muted-foreground flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  Processed {activeReview.date}
                </span>
              </div>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto space-y-6 animate-in slide-in-from-bottom-4 duration-300">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 shadow-sm">
                    <CheckCircle className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-foreground">
                      File Analyzed Successfully
                    </h3>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      ga4_export_nov.csv • 15,230 rows
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditing(!isEditing)}
                  className="rounded-full border-border/60 shadow-sm"
                >
                  {isEditing ? 'Save Changes' : 'Fine-tune Settings'}
                </Button>
              </div>

              <Card className="border-primary/20 shadow-sm rounded-2xl overflow-hidden">
                <CardHeader className="bg-primary/5 border-b border-border/50 pb-4">
                  <CardTitle className="flex items-center gap-2 text-primary text-base">
                    <Sparkles className="w-5 h-5" />
                    AI Import Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-8 space-y-8 bg-background">
                  {/* Section 1 */}
                  <div className="space-y-3">
                    <h4 className="font-semibold text-foreground flex items-center gap-2 text-sm">
                      <FileText className="w-4 h-4 text-muted-foreground" />
                      What I understood
                    </h4>
                    {isEditing ? (
                      <textarea
                        className="w-full min-h-[80px] p-4 rounded-xl border border-input bg-background text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all shadow-sm"
                        defaultValue="This appears to be a Google Analytics 4 export containing 15,230 rows of session data from Nov 1-30, 2025. It includes dimensions like Source/Medium, Campaign, and Device Category, along with metrics like Sessions, Engagement Rate, and Conversions."
                      />
                    ) : (
                      <p className="text-sm text-muted-foreground bg-accent/20 p-5 rounded-xl leading-relaxed border border-border/40">
                        This appears to be a Google Analytics 4 export
                        containing 15,230 rows of session data from Nov 1-30,
                        2025. It includes dimensions like Source/Medium,
                        Campaign, and Device Category, along with metrics like
                        Sessions, Engagement Rate, and Conversions.
                      </p>
                    )}
                  </div>

                  {/* Section 2 */}
                  <div className="space-y-3">
                    <h4 className="font-semibold text-foreground flex items-center gap-2 text-sm">
                      <ArrowRight className="w-4 h-4 text-muted-foreground" />
                      How it maps to client history
                    </h4>
                    {isEditing ? (
                      <textarea
                        className="w-full min-h-[80px] p-4 rounded-xl border border-input bg-background text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all shadow-sm"
                        defaultValue="This data will be appended to Acme Corp's web analytics timeline. It seamlessly connects with the existing Oct 2025 data, allowing for MoM trend analysis across all acquisition channels."
                      />
                    ) : (
                      <p className="text-sm text-muted-foreground bg-accent/20 p-5 rounded-xl leading-relaxed border border-border/40">
                        This data will be appended to Acme Corp's web analytics
                        timeline. It seamlessly connects with the existing Oct
                        2025 data, allowing for MoM trend analysis across all
                        acquisition channels.
                      </p>
                    )}
                  </div>

                  {/* Section 3 */}
                  <div className="space-y-3">
                    <h4 className="font-semibold text-foreground flex items-center gap-2 text-sm">
                      <Database className="w-4 h-4 text-muted-foreground" />
                      RAG Storage Plan
                    </h4>
                    {isEditing ? (
                      <textarea
                        className="w-full min-h-[80px] p-4 rounded-xl border border-input bg-background text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all shadow-sm"
                        defaultValue="Data will be chunked by week and indexed for semantic retrieval. Key searchable entities: campaign names, traffic sources, and conversion events. Time-series data will be stored in the structured metrics store for visualization."
                      />
                    ) : (
                      <p className="text-sm text-muted-foreground bg-accent/20 p-5 rounded-xl leading-relaxed border border-border/40">
                        Data will be chunked by week and indexed for semantic
                        retrieval. Key searchable entities: campaign names,
                        traffic sources, and conversion events. Time-series data
                        will be stored in the structured metrics store for
                        visualization.
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        {/* Footer */}
        {step === 'review' ? (
          <div className="p-4 border-t border-border/50 bg-background/80 backdrop-blur-sm shrink-0 flex flex-col gap-3">
            <div className="relative flex items-center w-full max-w-3xl mx-auto">
              <Button
                variant="ghost"
                size="icon"
                className="absolute left-3 text-muted-foreground hover:text-foreground h-9 w-9 rounded-full hover:bg-accent/50"
              >
                <Paperclip className="w-4 h-4" />
              </Button>
              <Input
                placeholder="Fine-tune this import with AI..."
                className="pl-12 pr-20 h-12 rounded-xl bg-accent/30 border-border/50 focus-visible:ring-1 focus-visible:ring-primary focus-visible:bg-background shadow-sm text-sm"
              />
              <div className="absolute right-3 flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground hover:text-foreground h-8 w-8 rounded-full hover:bg-accent/50"
                >
                  <Mic className="w-4 h-4" />
                </Button>
                <Button
                  size="icon"
                  className="rounded-lg w-8 h-8 bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
                >
                  <Send className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
            <div className="flex items-center justify-between max-w-3xl mx-auto w-full">
              <div className="flex flex-wrap gap-2">
                <button className="px-3 py-1 rounded-full border border-border/60 bg-background hover:bg-accent/50 text-muted-foreground hover:text-foreground text-xs font-medium transition-colors flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3" /> Remap columns
                </button>
                <button className="px-3 py-1 rounded-full border border-border/60 bg-background hover:bg-accent/50 text-muted-foreground hover:text-foreground text-xs font-medium transition-colors flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3" /> Fix warnings
                </button>
                <button className="px-3 py-1 rounded-full border border-border/60 bg-background hover:bg-accent/50 text-muted-foreground hover:text-foreground text-xs font-medium transition-colors flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3" /> Change chunking
                </button>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setStep('upload')
                  setActiveReview(null)
                }}
                className="rounded-full text-muted-foreground hover:text-foreground shrink-0"
              >
                Back to Imports
              </Button>
            </div>
          </div>
        ) : (
          <div className="p-4 border-t border-border/50 bg-background/80 backdrop-blur-sm shrink-0 flex justify-end gap-3">
            <Button
              variant="ghost"
              onClick={handleClose}
              className="rounded-full hover:bg-accent/50"
            >
              Cancel
            </Button>
            {step === 'summary' && (
              <Button
                variant="default"
                onClick={handleClose}
                className="gap-2 rounded-full shadow-sm"
              >
                Confirm & Process <ArrowRight className="w-4 h-4" />
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

