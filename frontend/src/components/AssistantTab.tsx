import { useState, useCallback } from 'react';
import { Send, FileText, Clock, Cpu, Hash, Zap, ChevronDown, ChevronUp, ShieldAlert } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { AIConfig, AIResponse, SourceChunk } from '@/types/ai';
import MarkdownViewer from '@/components/MarkdownViewer';
import { queryRag } from '@/lib/ragApi';
import { toast } from '@/components/ui/sonner';

const ScoreBadge = ({ score, label }: { score: number; label: string }) => {
  const color = score >= 0.85 ? 'bg-success/15 text-success' : score >= 0.7 ? 'bg-warning/15 text-warning' : 'bg-destructive/15 text-destructive';
  return (
    <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium ${color}`}>
      {label}: {(score * 100).toFixed(0)}%
    </span>
  );
};

const SourceCard = ({ source, index }: { source: SourceChunk; index: number }) => {
  const [expanded, setExpanded] = useState(false);
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="rounded-md border border-border bg-muted/30 p-3"
    >
      <div className="flex items-start justify-between cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center gap-2 min-w-0">
          <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <span className="text-xs font-medium truncate">{source.document}</span>
          {source.page && <span className="text-xs text-muted-foreground">p.{source.page}</span>}
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-2">
          <ScoreBadge score={source.similarity} label="sim" />
          {expanded ? <ChevronUp className="h-3 w-3 text-muted-foreground" /> : <ChevronDown className="h-3 w-3 text-muted-foreground" />}
        </div>
      </div>
      <AnimatePresence>
        {expanded && (
          <motion.p initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="mt-2 text-xs text-muted-foreground leading-relaxed overflow-hidden">
            {source.content}
          </motion.p>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

const ResponseMessage = ({ response }: { response: AIResponse & { complianceBlocked?: boolean } }) => (
  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
    <div className="flex justify-end">
      <div className="max-w-[75%] rounded-lg bg-primary px-4 py-2.5 text-sm text-primary-foreground">
        {response.question}
      </div>
    </div>
    <div className={`max-w-[85%] space-y-3 ${response.complianceBlocked ? 'rounded-lg border border-red-500/30 bg-red-500/5 p-4' : ''}`}>
      {response.complianceBlocked && (
        <div className="flex items-center gap-2 mb-2">
          <ShieldAlert className="h-4 w-4 text-red-500" />
          <span className="text-xs font-semibold text-red-500 uppercase tracking-wider">
            Bloqueado por Compliance
          </span>
        </div>
      )}
      <MarkdownViewer content={response.answer} />
      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1"><Cpu className="h-3 w-3" />{response.model}</span>
        <span className="inline-flex items-center gap-1"><Hash className="h-3 w-3" />{response.totalTokens.toLocaleString()} tokens</span>
        <span className="inline-flex items-center gap-1"><Zap className="h-3 w-3" />{response.latencyMs}ms</span>
        <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" />{response.timestamp.toLocaleTimeString()}</span>
      </div>
      <div className="space-y-1.5">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Sources ({response.sources.length} chunks)</p>
        {response.sources.map((s, i) => <SourceCard key={s.id} source={s} index={i} />)}
      </div>
    </div>
  </motion.div>
);

const estimateTokens = (answer: string, sources: SourceChunk[]) => {
  const sourceText = sources.map(s => s.content).join(' ');
  const raw = `${answer} ${sourceText}`;
  return Math.max(1, Math.round(raw.length / 4));
};

type AssistantTabProps = {
  config: AIConfig;
};

const AssistantTab = ({ config }: AssistantTabProps) => {
  const [messages, setMessages] = useState<AIResponse[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSend = useCallback(async () => {
    if (!input.trim() || isLoading) return;
    if (!config.model?.trim()) {
      toast.error('Selecione um modelo antes de perguntar.');
      return;
    }
    const q = input.trim();
    setInput('');
    setIsLoading(true);
    const start = Date.now();
    try {
      const embeddingModel = config.embeddingModel?.trim() || undefined;
      const response = await queryRag({
        query: q,
        model: config.model,
        top_k: config.topK,
        embedding_model: embeddingModel,
        temperature: config.temperature,
      });
      const latencyMs = Math.max(0, Math.round(Date.now() - start));
      const sources: SourceChunk[] = (response.context || []).map((ctx, index) => ({
        id: ctx.document_id ? `${ctx.document_id}-${index}` : `ctx-${Date.now()}-${index}`,
        document: ctx.document_name || 'Documento',
        content: ctx.text || '',
        similarity: typeof ctx.score === 'number' ? ctx.score : 0,
        page: ctx.page ?? undefined,
      }));
      const newResp: AIResponse & { complianceBlocked?: boolean } = {
        id: `resp-${Date.now()}`,
        question: q,
        answer: response.answer || 'Sem resposta.',
        sources,
        model: config.model,
        totalTokens: estimateTokens(response.answer || '', sources),
        latencyMs,
        timestamp: new Date(),
        complianceBlocked: response.compliance_blocked || false,
      };
      setMessages(prev => [...prev, newResp]);
    } catch (err) {
      toast.error('Falha ao consultar o RAG', {
        description: err instanceof Error ? err.message : 'Erro inesperado.',
      });
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, config]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto scrollbar-thin p-4 space-y-4">
        {messages.length === 0 && !isLoading && (
          <div className="text-sm text-muted-foreground">Envie uma pergunta para começar.</div>
        )}
        {messages.map(m => <ResponseMessage key={m.id} response={m} />)}
        {isLoading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className="flex gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-secondary animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="h-1.5 w-1.5 rounded-full bg-secondary animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="h-1.5 w-1.5 rounded-full bg-secondary animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
            Processing query through RAG pipeline...
          </motion.div>
        )}
      </div>
      <div className="border-t border-border bg-card p-3">
        <div className="flex items-center gap-2">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSend()}
            placeholder="Ask about company documents..."
            className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="inline-flex items-center justify-center rounded-md bg-primary p-2.5 text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default AssistantTab;
