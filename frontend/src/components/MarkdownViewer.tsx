import { useState, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Editor from '@monaco-editor/react';
import { Code, Eye } from 'lucide-react';

interface MarkdownViewerProps {
  content: string;
}

const MarkdownViewer = ({ content }: MarkdownViewerProps) => {
  const [showRaw, setShowRaw] = useState(false);

  const lineCount = useMemo(() => {
    const lines = content.split('\n').length;
    return Math.min(Math.max(lines + 2, 8), 30);
  }, [content]);

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      {/* Toggle bar */}
      <div className="flex items-center justify-end border-b border-border bg-muted/30 px-3 py-1.5">
        <button
          onClick={() => setShowRaw(!showRaw)}
          className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground hover:bg-muted"
          title={showRaw ? 'Visualizar renderizado' : 'Ver código markdown'}
        >
          {showRaw ? (
            <>
              <Eye className="h-3.5 w-3.5" />
              Rendered
            </>
          ) : (
            <>
              <Code className="h-3.5 w-3.5" />
              Markdown
            </>
          )}
        </button>
      </div>

      {showRaw ? (
        <div className="w-full" style={{ height: `${lineCount * 20}px`, minHeight: '160px' }}>
          <Editor
            defaultLanguage="markdown"
            value={content}
            theme="vs-dark"
            options={{
              readOnly: true,
              minimap: { enabled: false },
              lineNumbers: 'on',
              scrollBeyondLastLine: false,
              wordWrap: 'on',
              fontSize: 13,
              padding: { top: 8, bottom: 8 },
              renderLineHighlight: 'none',
              overviewRulerLanes: 0,
              hideCursorInOverviewRuler: true,
              scrollbar: {
                verticalScrollbarSize: 6,
                horizontalScrollbarSize: 6,
              },
            }}
          />
        </div>
      ) : (
        <div className="p-4">
          <div className="prose prose-sm prose-slate dark:prose-invert max-w-none
            prose-table:border prose-table:border-border prose-table:rounded-md
            prose-th:bg-muted/50 prose-th:px-3 prose-th:py-2 prose-th:text-left prose-th:text-xs prose-th:font-semibold prose-th:text-foreground prose-th:border-b prose-th:border-border
            prose-td:px-3 prose-td:py-2 prose-td:text-sm prose-td:border-b prose-td:border-border/50
            prose-strong:text-foreground prose-strong:font-semibold
            prose-p:text-card-foreground prose-p:leading-relaxed
            prose-headings:text-foreground
            prose-li:text-card-foreground
            prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-xs prose-code:font-mono
            prose-pre:bg-muted prose-pre:border prose-pre:border-border
            prose-a:text-primary prose-a:no-underline hover:prose-a:underline
          ">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {content}
            </ReactMarkdown>
          </div>
        </div>
      )}
    </div>
  );
};

export default MarkdownViewer;
