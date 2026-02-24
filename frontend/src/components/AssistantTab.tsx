import { useState, useCallback } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Clock,
  Cpu,
  FileSpreadsheet,
  FileText,
  Hash,
  Mic,
  Paperclip,
  Send,
  ShieldAlert,
  Sparkles,
  Zap,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { AIConfig, AIResponse, SourceChunk } from '@/types/ai';
import MarkdownViewer from '@/components/MarkdownViewer';
import { queryRag } from '@/lib/ragApi';
import { toast } from '@/components/ui/sonner';

const ScoreBadge = ({ score, label }: { score: number; label: string }) => {
  const color =
    score >= 0.85
      ? 'border-success/25 bg-success/10 text-success'
      : score >= 0.7
        ? 'border-warning/25 bg-warning/10 text-warning'
        : 'border-destructive/25 bg-destructive/10 text-destructive';
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${color}`}
    >
      {label}: {(score * 100).toFixed(0)}%
    </span>
  );
};

const getSourceIcon = (name: string) => {
  const ext = name.split('.').pop()?.toLowerCase();
  if (ext === 'xlsx' || ext === 'csv') {
    return <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-500" />;
  }
  return <FileText className="h-3.5 w-3.5 text-primary" />;
};

const SourceCard = ({ source, index }: { source: SourceChunk; index: number }) => {
  const [expanded, setExpanded] = useState(false);
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="rounded-xl border border-border/80 bg-card/85 p-3 transition-colors hover:border-primary/30 hover:bg-card"
    >
      <div
        className="flex cursor-pointer items-start justify-between"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            {getSourceIcon(source.document)}
          </span>
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
  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
    <div className="flex justify-end">
      <div className="flex max-w-[84%] flex-row-reverse gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">
          VO
        </div>
        <div>
          <div className="rounded-2xl rounded-tr-sm bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-sm">
            {response.question}
          </div>
          <p className="mt-1 pr-1 text-right text-[10px] text-muted-foreground">
            {response.timestamp.toLocaleTimeString()}
          </p>
        </div>
      </div>
    </div>

    <div className="flex justify-start">
      <div className="flex max-w-[92%] gap-3">
        <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-secondary text-primary-foreground shadow-sm">
          <Sparkles className="h-4 w-4" />
        </div>
        <div
          className={`w-full space-y-3 rounded-2xl rounded-tl-sm border p-4 shadow-sm ${
            response.complianceBlocked
              ? 'border-red-500/30 bg-red-500/5'
              : 'border-border/80 bg-card/90'
          }`}
        >
          {response.complianceBlocked && (
            <div className="mb-2 flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-red-500" />
              <span className="text-xs font-semibold uppercase tracking-wider text-red-500">
                Bloqueado por Compliance
              </span>
            </div>
          )}
          <MarkdownViewer content={response.answer} />
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1 rounded-md border border-border/70 bg-muted/40 px-2 py-1">
              <Cpu className="h-3 w-3" />
              {response.model}
            </span>
            <span className="inline-flex items-center gap-1 rounded-md border border-border/70 bg-muted/40 px-2 py-1">
              <Hash className="h-3 w-3" />
              {response.totalTokens.toLocaleString()} tokens
            </span>
            <span className="inline-flex items-center gap-1 rounded-md border border-border/70 bg-muted/40 px-2 py-1">
              <Zap className="h-3 w-3" />
              {response.latencyMs}ms
            </span>
            <span className="inline-flex items-center gap-1 rounded-md border border-border/70 bg-muted/40 px-2 py-1">
              <Clock className="h-3 w-3" />
              {response.timestamp.toLocaleTimeString()}
            </span>
          </div>
          <div className="space-y-1.5">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Fontes recuperadas ({response.sources.length})
            </p>
            {response.sources.map((s, i) => (
              <SourceCard key={s.id} source={s} index={i} />
            ))}
          </div>
        </div>
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
      <div className="flex-1 space-y-4 overflow-y-auto px-4 py-5 scrollbar-thin sm:px-6">
        {messages.length === 0 && !isLoading && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="mx-auto mt-10 max-w-2xl rounded-3xl border border-border/80 bg-card/85 p-7 shadow-sm"
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                <Sparkles className="h-3.5 w-3.5" />
                DeepDiveIA RAG
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/35 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-600">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Vetor DB online
              </span>
            </div>
            <h2 className="mt-5 text-xl font-semibold tracking-tight text-foreground">
              Converse com seus dados com rastreabilidade de fonte
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Faça perguntas sobre documentos internos, analise similaridade por chunk e valide compliance em tempo real.
            </p>
            <div className="mt-5 grid gap-2 text-xs sm:grid-cols-3">
              <div className="rounded-xl border border-border/70 bg-muted/30 px-3 py-2">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Latencia alvo</p>
                <p className="mt-1 font-semibold text-foreground">&lt; 1.5s</p>
              </div>
              <div className="rounded-xl border border-border/70 bg-muted/30 px-3 py-2">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Fonte obrigatoria</p>
                <p className="mt-1 font-semibold text-foreground">Sim</p>
              </div>
              <div className="rounded-xl border border-border/70 bg-muted/30 px-3 py-2">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Compliance</p>
                <p className="mt-1 font-semibold text-foreground">Ativo</p>
              </div>
            </div>
          </motion.div>
        )}
        {messages.map(m => (
          <ResponseMessage key={m.id} response={m} />
        ))}
        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="inline-flex items-center gap-2 rounded-full border border-border/80 bg-card/85 px-4 py-2 text-sm text-muted-foreground"
          >
            <div className="flex gap-1">
              <span
                className="h-1.5 w-1.5 animate-bounce rounded-full bg-secondary"
                style={{ animationDelay: '0ms' }}
              />
              <span
                className="h-1.5 w-1.5 animate-bounce rounded-full bg-secondary"
                style={{ animationDelay: '150ms' }}
              />
              <span
                className="h-1.5 w-1.5 animate-bounce rounded-full bg-secondary"
                style={{ animationDelay: '300ms' }}
              />
            </div>
            Consultando contexto DeepDiveIA...
          </motion.div>
        )}
      </div>

      <div className="border-t border-border/80 bg-card/75 p-3 backdrop-blur-sm">
        <div className="mx-auto w-full max-w-4xl rounded-2xl border border-border/80 bg-background/90 p-2 shadow-sm">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSend()}
            placeholder="Digite sua pergunta sobre documentos, processos ou compliance..."
            className="w-full rounded-xl border border-transparent bg-transparent px-3 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <div className="mt-1 flex items-center justify-between px-1 pb-1">
            <div className="flex items-center gap-1">
              <button
                type="button"
                className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
                title="Anexar"
              >
                <Paperclip className="h-4 w-4" />
              </button>
              <button
                type="button"
                className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
                title="Audio"
              >
                <Mic className="h-4 w-4" />
              </button>
            </div>
            <div className="flex items-center gap-3">
              <p className="hidden text-[11px] text-muted-foreground sm:block">
                Enter para enviar
              </p>
              <button
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                className="inline-flex items-center justify-center rounded-xl bg-primary p-2.5 text-primary-foreground shadow-sm transition-all hover:bg-primary/90 disabled:opacity-50"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AssistantTab;
