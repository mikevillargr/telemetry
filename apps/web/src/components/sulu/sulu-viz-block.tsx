'use client';

import { useRef, useState, useEffect } from 'react';
import { Copy, Check, ImageIcon } from 'lucide-react';
import { copySvgAsImage, copyHtmlAsImage } from '@/lib/copy-utils';

interface SuluVizBlockProps {
  language: string;
  code: string;
}

export function SuluVizBlock({ language, code }: SuluVizBlockProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);

  const handleCopyAsImage = async () => {
    if (!containerRef.current) return;

    let success = false;

    if (language === 'svg') {
      const svgEl = containerRef.current.querySelector('svg');
      if (svgEl) {
        success = await copySvgAsImage(svgEl);
      }
    }

    if (!success) {
      success = await copyHtmlAsImage(containerRef.current);
    }

    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (language === 'svg') {
    return (
      <div className="relative group my-4 rounded-xl border border-border/50 overflow-hidden bg-card">
        <div className="flex items-center justify-between px-4 py-2 border-b border-border/30 bg-muted/30">
          <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">SVG Visualization</span>
          <button
            onClick={handleCopyAsImage}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-md hover:bg-accent/50"
            title="Copy as image"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <ImageIcon className="w-3.5 h-3.5" />}
            {copied ? 'Copied!' : 'Copy image'}
          </button>
        </div>
        <div
          ref={containerRef}
          className="p-4 flex items-center justify-center overflow-x-auto [&>svg]:max-w-full [&>svg]:h-auto"
          dangerouslySetInnerHTML={{ __html: code }}
        />
      </div>
    );
  }

  if (language === 'html') {
    return (
      <div className="relative group my-4 rounded-xl border border-border/50 overflow-hidden bg-card">
        <div className="flex items-center justify-between px-4 py-2 border-b border-border/30 bg-muted/30">
          <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">HTML Visualization</span>
          <button
            onClick={handleCopyAsImage}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-md hover:bg-accent/50"
            title="Copy as image"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <ImageIcon className="w-3.5 h-3.5" />}
            {copied ? 'Copied!' : 'Copy image'}
          </button>
        </div>
        <div ref={containerRef} className="p-4">
          <IframeSandbox html={code} />
        </div>
      </div>
    );
  }

  // chart-json: parse and render with recharts
  if (language === 'chart-json' || language === 'chart') {
    return <ChartJsonBlock code={code} />;
  }

  return null;
}

/** Sandboxed iframe for arbitrary HTML visualizations */
function IframeSandbox({ html }: { html: string }) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(400);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const handleLoad = () => {
      try {
        const doc = iframe.contentDocument;
        if (doc?.body) {
          const h = doc.body.scrollHeight;
          if (h > 0) setHeight(Math.min(h + 20, 800));
        }
      } catch { /* cross-origin safety */ }
    };

    iframe.addEventListener('load', handleLoad);
    return () => iframe.removeEventListener('load', handleLoad);
  }, [html]);

  const wrappedHtml = `<!DOCTYPE html><html><head><style>body{margin:0;padding:16px;font-family:'DM Sans',sans-serif;background:transparent;color:#e4e4e7;}</style></head><body>${html}</body></html>`;

  return (
    <iframe
      ref={iframeRef}
      srcDoc={wrappedHtml}
      sandbox="allow-scripts"
      className="w-full border-0 rounded-lg bg-transparent"
      style={{ height }}
      title="Visualization"
    />
  );
}

/** Render a chart-json spec using recharts */
function ChartJsonBlock({ code }: { code: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chartModule, setChartModule] = useState<typeof import('recharts') | null>(null);

  useEffect(() => {
    import('recharts').then(setChartModule).catch(() => setError('Failed to load recharts'));
  }, []);

  let spec: { type?: string; data?: Array<Record<string, unknown>>; xKey?: string; yKeys?: string[]; colors?: string[]; title?: string } | null = null;
  try {
    spec = JSON.parse(code);
  } catch {
    return (
      <div className="my-4 p-4 rounded-xl border border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/20 text-sm text-red-600 dark:text-red-400">
        Invalid chart JSON: {code.slice(0, 100)}...
      </div>
    );
  }

  if (!spec || !spec.data || !Array.isArray(spec.data)) {
    return (
      <div className="my-4 p-4 rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/20 text-sm text-amber-600 dark:text-amber-400">
        Chart JSON missing required &quot;data&quot; array.
      </div>
    );
  }

  const handleCopyImage = async () => {
    if (!containerRef.current) return;
    const { copyHtmlAsImage: copyEl } = await import('@/lib/copy-utils');
    const ok = await copyEl(containerRef.current);
    if (ok) { setCopied(true); setTimeout(() => setCopied(false), 2000); }
  };

  const chartType = spec.type || 'bar';
  const xKey = spec.xKey || Object.keys(spec.data[0] || {})[0] || 'x';
  const yKeys = spec.yKeys || Object.keys(spec.data[0] || {}).filter((k) => k !== xKey);
  const defaultColors = ['#E8450A', '#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#EC4899'];
  const colors = spec.colors || defaultColors;

  if (!chartModule) {
    if (error) return <div className="text-sm text-red-400 p-4">{error}</div>;
    return <div className="text-sm text-muted-foreground p-4">Loading chart...</div>;
  }

  const { ResponsiveContainer, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip } = chartModule;

  const renderChart = () => {
    if (chartType === 'line') {
      return (
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={spec!.data}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey={xKey} tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
            <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
            <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }} />
            {yKeys.map((key, i) => (
              <Line key={key} type="monotone" dataKey={key} stroke={colors[i % colors.length]} strokeWidth={2} dot={false} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      );
    }

    if (chartType === 'pie') {
      const dataKey = yKeys[0] || 'value';
      return (
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie data={spec!.data} dataKey={dataKey} nameKey={xKey} cx="50%" cy="50%" outerRadius={100} label>
              {spec!.data!.map((_, i) => (
                <Cell key={i} fill={colors[i % colors.length]} />
              ))}
            </Pie>
            <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }} />
          </PieChart>
        </ResponsiveContainer>
      );
    }

    // Default: bar chart
    return (
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={spec!.data}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis dataKey={xKey} tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
          <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
          <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }} />
          {yKeys.map((key, i) => (
            <Bar key={key} dataKey={key} fill={colors[i % colors.length]} radius={[4, 4, 0, 0]} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    );
  };

  return (
    <div className="relative group my-4 rounded-xl border border-border/50 overflow-hidden bg-card">
      <div className="flex items-center justify-between px-4 py-2 border-b border-border/30 bg-muted/30">
        <span className="text-xs text-muted-foreground font-medium">
          {spec.title || `${chartType.charAt(0).toUpperCase() + chartType.slice(1)} Chart`}
        </span>
        <button
          onClick={handleCopyImage}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-md hover:bg-accent/50"
          title="Copy as image"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <ImageIcon className="w-3.5 h-3.5" />}
          {copied ? 'Copied!' : 'Copy image'}
        </button>
      </div>
      <div ref={containerRef} className="p-4">
        {renderChart()}
      </div>
    </div>
  );
}
