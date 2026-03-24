'use client';

import { useRef, useState, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Copy, Check } from 'lucide-react';
import { copyText, copyTable } from '@/lib/copy-utils';
import { SuluVizBlock } from './sulu-viz-block';

interface SuluMarkdownProps {
  content: string;
}

const VIZ_LANGUAGES = new Set(['svg', 'html', 'chart-json', 'chart']);

export function SuluMarkdown({ content }: SuluMarkdownProps) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        h1: ({ children }) => (
          <h1 className="text-lg font-bold text-foreground mt-5 mb-2 first:mt-0">{children}</h1>
        ),
        h2: ({ children }) => (
          <h2 className="text-base font-bold text-foreground mt-4 mb-2 first:mt-0">{children}</h2>
        ),
        h3: ({ children }) => (
          <h3 className="text-sm font-bold text-foreground mt-3 mb-1.5 first:mt-0">{children}</h3>
        ),
        h4: ({ children }) => (
          <h4 className="text-sm font-semibold text-foreground mt-2 mb-1 first:mt-0">{children}</h4>
        ),
        p: ({ children }) => (
          <p className="text-sm text-foreground leading-relaxed mb-3 last:mb-0">{children}</p>
        ),
        strong: ({ children }) => (
          <strong className="font-semibold text-foreground">{children}</strong>
        ),
        em: ({ children }) => (
          <em className="italic text-foreground/90">{children}</em>
        ),
        a: ({ href, children }) => (
          <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2 hover:text-primary/80">
            {children}
          </a>
        ),
        ul: ({ children }) => (
          <ul className="list-disc pl-5 mb-3 space-y-1 text-sm text-foreground">{children}</ul>
        ),
        ol: ({ children }) => (
          <ol className="list-decimal pl-5 mb-3 space-y-1 text-sm text-foreground">{children}</ol>
        ),
        li: ({ children }) => (
          <li className="leading-relaxed">{children}</li>
        ),
        blockquote: ({ children }) => (
          <blockquote className="border-l-3 border-primary/40 pl-4 my-3 text-sm text-muted-foreground italic">
            {children}
          </blockquote>
        ),
        hr: () => <hr className="my-4 border-border/50" />,
        img: ({ src, alt }) => (
          <span className="block my-3">
            <img src={src} alt={alt || ''} className="max-w-full rounded-lg border border-border/50" />
          </span>
        ),
        table: ({ children }) => <CopyableTable>{children}</CopyableTable>,
        thead: ({ children }) => (
          <thead className="bg-muted/40 border-b border-border/50">{children}</thead>
        ),
        tbody: ({ children }) => <tbody>{children}</tbody>,
        tr: ({ children }) => (
          <tr className="border-b border-border/30 last:border-0 hover:bg-muted/20 transition-colors">{children}</tr>
        ),
        th: ({ children }) => (
          <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">{children}</th>
        ),
        td: ({ children }) => (
          <td className="px-3 py-2 text-sm text-foreground whitespace-nowrap">{children}</td>
        ),
        code: ({ className, children }) => {
          const match = /language-(\w[\w-]*)/.exec(className || '');
          const lang = match ? match[1] : '';
          const codeStr = String(children).replace(/\n$/, '');

          // Visualization blocks
          if (VIZ_LANGUAGES.has(lang)) {
            return <SuluVizBlock language={lang} code={codeStr} />;
          }

          // Fenced code blocks (has language class)
          if (className) {
            return <CopyableCodeBlock language={lang} code={codeStr} />;
          }

          // Inline code
          return (
            <code className="px-1.5 py-0.5 rounded-md bg-muted/60 text-[13px] font-mono text-foreground border border-border/30">
              {children}
            </code>
          );
        },
        pre: ({ children }) => <>{children}</>,
      }}
    >
      {content}
    </ReactMarkdown>
  );
}

/** Table wrapper with a hover "Copy table" button */
function CopyableTable({ children }: { children: React.ReactNode }) {
  const tableRef = useRef<HTMLTableElement>(null);
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    if (!tableRef.current) return;
    const ok = await copyTable(tableRef.current);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, []);

  return (
    <div className="relative group my-3 rounded-xl border border-border/50 overflow-hidden bg-card">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/30 bg-muted/30">
        <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Table</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors px-1.5 py-0.5 rounded hover:bg-accent/50"
          title="Copy table as text"
        >
          {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <div className="overflow-x-auto">
        <table ref={tableRef} className="w-full text-sm border-collapse">
          {children}
        </table>
      </div>
    </div>
  );
}

/** Fenced code block with copy button */
function CopyableCodeBlock({ language, code }: { language: string; code: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    const ok = await copyText(code);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [code]);

  return (
    <div className="relative group my-3 rounded-xl border border-border/50 overflow-hidden bg-card">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/30 bg-muted/30">
        <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide font-mono">
          {language || 'code'}
        </span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors px-1.5 py-0.5 rounded hover:bg-accent/50"
          title="Copy code"
        >
          {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <pre className="p-4 overflow-x-auto">
        <code className="text-[13px] font-mono text-foreground leading-relaxed">{code}</code>
      </pre>
    </div>
  );
}
