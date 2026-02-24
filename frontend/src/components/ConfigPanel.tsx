import { useMemo, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { ChevronLeft, ChevronRight, Settings } from 'lucide-react';
import { AIConfig } from '@/types/ai';
import { useMutation, useQuery } from '@tanstack/react-query';
import { ingestPdf, listModels } from '@/lib/ragApi';
import { toast } from '@/components/ui/sonner';

type ConfigPanelProps = {
  config: AIConfig;
  setConfig: Dispatch<SetStateAction<AIConfig>>;
};

const fieldClass =
  'w-full rounded-lg border border-input/80 bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring';
const sectionClass = 'rounded-xl border border-border/80 bg-card/75 p-3.5 shadow-sm';

const ConfigPanel = ({ config, setConfig }: ConfigPanelProps) => {
  const [collapsed, setCollapsed] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [lastUpload, setLastUpload] = useState<{ name: string; chunks: number; embeddingModel: string } | null>(null);

  const { data: modelData, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['ollama-models'],
    queryFn: listModels,
    staleTime: 1000 * 60 * 5,
  });

  const modelOptions = useMemo(() => {
    const names = (modelData ?? [])
      .map(model => model.name ?? model.model ?? '')
      .filter(name => Boolean(name));
    const unique = Array.from(new Set(names)).sort((a, b) => a.localeCompare(b));
    if (config.model && !unique.includes(config.model)) {
      return [config.model, ...unique];
    }
    return unique;
  }, [modelData, config.model]);

  const ingestMutation = useMutation({
    mutationFn: async (file: File) => {
      const embeddingModel = config.embeddingModel?.trim() || undefined;
      return ingestPdf(file, embeddingModel);
    },
    onSuccess: data => {
      setLastUpload({ name: data.document_name, chunks: data.chunks_indexed, embeddingModel: data.embedding_model });
      setSelectedFile(null);
      toast.success(`PDF indexado: ${data.document_name}`, {
        description: `${data.chunks_indexed} chunks com ${data.embedding_model}`,
      });
    },
    onError: err => {
      toast.error('Falha ao enviar PDF', {
        description: err instanceof Error ? err.message : 'Erro inesperado.',
      });
    },
  });

  if (collapsed) {
    return (
      <button
        onClick={() => setCollapsed(false)}
        className="hidden h-full w-11 items-center justify-center border-l border-border/80 bg-card/85 transition-colors hover:bg-muted/50 lg:flex"
      >
        <div className="flex flex-col items-center gap-2">
          <Settings className="h-4 w-4 text-muted-foreground" />
          <ChevronLeft className="h-3 w-3 text-muted-foreground" />
        </div>
      </button>
    );
  }

  return (
    <aside className="w-full shrink-0 overflow-y-auto border-t border-border/80 bg-card/85 scrollbar-thin backdrop-blur-sm lg:w-[22rem] lg:border-l lg:border-t-0">
      <div className="sticky top-0 z-10 border-b border-border/80 bg-card/95 p-4 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-primary/20 to-secondary/25">
              <Settings className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">Centro de Controle</h3>
              <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">DeepDiveIA</p>
            </div>
          </div>
          <button onClick={() => setCollapsed(true)} className="hidden rounded-lg p-1 transition-colors hover:bg-muted lg:block">
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-1 rounded-lg border border-border/70 bg-background/75 p-1 text-xs">
          <button
            type="button"
            className="rounded-md bg-primary px-2 py-1.5 font-semibold text-primary-foreground"
          >
            Parametros
          </button>
          <button
            type="button"
            className="rounded-md px-2 py-1.5 font-medium text-muted-foreground transition-colors hover:bg-muted/50"
          >
            Sessao
          </button>
        </div>
      </div>

      <div className="space-y-4 p-4">
        <section className={sectionClass}>
          <div className="mb-1.5 flex items-center justify-between">
            <label className="block text-xs font-medium uppercase tracking-wider text-muted-foreground">Modelo de resposta</label>
            <button onClick={() => refetch()} className="text-[10px] font-semibold text-primary hover:text-primary/80" type="button">
              Atualizar
            </button>
          </div>
          {modelOptions.length > 0 ? (
            <select
              value={config.model}
              onChange={e => setConfig(c => ({ ...c, model: e.target.value }))}
              className={fieldClass}
            >
              {modelOptions.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          ) : (
            <input
              value={config.model}
              onChange={e => setConfig(c => ({ ...c, model: e.target.value }))}
              placeholder={isLoading ? 'Carregando modelos...' : 'Digite o modelo (ex: llama3.1)'}
              className={fieldClass}
            />
          )}
          {isError && (
            <p className="mt-1 text-[11px] text-destructive">
              Erro ao carregar modelos do Ollama: {error instanceof Error ? error.message : 'verifique o backend.'}
            </p>
          )}
          {!isError && modelOptions.length === 0 && !isLoading && (
            <p className="mt-1 text-[11px] text-muted-foreground">Nenhum modelo encontrado no Ollama.</p>
          )}
        </section>

        <section className={sectionClass}>
          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground">Modelo de embedding</label>
          <select
            value={config.embeddingModel ?? ''}
            onChange={e => setConfig(c => ({ ...c, embeddingModel: e.target.value || undefined }))}
            className={fieldClass}
          >
            <option value="">Usar padrão do backend</option>
            {modelOptions.map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
          <p className="mt-1 text-[11px] text-muted-foreground">Selecione um modelo com suporte a embeddings.</p>
        </section>

        <section className={sectionClass}>
          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground">Upload de PDF</label>
          <div className="space-y-2">
            <input
              type="file"
              accept="application/pdf"
              onChange={e => setSelectedFile(e.target.files?.[0] || null)}
              className="w-full rounded-lg border border-dashed border-input/80 bg-background px-3 py-2 text-xs file:mr-3 file:rounded-md file:border-0 file:bg-secondary file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-secondary-foreground hover:file:bg-secondary/80"
            />
            <button
              type="button"
              disabled={!selectedFile || ingestMutation.isPending}
              onClick={() => selectedFile && ingestMutation.mutate(selectedFile)}
              className="w-full rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              {ingestMutation.isPending ? 'Enviando...' : 'Enviar e indexar'}
            </button>
            {selectedFile && (
              <p className="text-[11px] text-muted-foreground">
                Selecionado: {selectedFile.name}
              </p>
            )}
            {lastUpload && (
              <p className="text-[11px] text-muted-foreground">
                Ultimo upload: {lastUpload.name} ({lastUpload.chunks} chunks, {lastUpload.embeddingModel})
              </p>
            )}
          </div>
        </section>

        <section className={sectionClass}>
          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Temperature: {config.temperature.toFixed(2)}
          </label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={config.temperature}
            onChange={e => setConfig(c => ({ ...c, temperature: parseFloat(e.target.value) }))}
            className="w-full accent-primary"
          />
          <div className="mt-0.5 flex justify-between text-xs text-muted-foreground">
            <span>Preciso</span>
            <span>Criativo</span>
          </div>
        </section>

        <section className={sectionClass}>
          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Top K Retrieval: {config.topK}
          </label>
          <input
            type="range"
            min="1"
            max="20"
            step="1"
            value={config.topK}
            onChange={e => setConfig(c => ({ ...c, topK: parseInt(e.target.value, 10) }))}
            className="w-full accent-primary"
          />
          <div className="mt-0.5 flex justify-between text-xs text-muted-foreground">
            <span>1</span>
            <span>20</span>
          </div>
        </section>

        <section className={sectionClass}>
          <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">Metricas da sessao</p>
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-lg border border-border/70 bg-background/80 px-2.5 py-2">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Modelo</p>
              <p className="mt-1 truncate text-xs font-semibold text-foreground">{config.model || '—'}</p>
            </div>
            <div className="rounded-lg border border-border/70 bg-background/80 px-2.5 py-2">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Embedding</p>
              <p className="mt-1 truncate text-xs font-semibold text-foreground">{config.embeddingModel || 'Padrao'}</p>
            </div>
            <div className="rounded-lg border border-border/70 bg-background/80 px-2.5 py-2">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Top K</p>
              <p className="mt-1 text-xs font-semibold text-foreground">{config.topK} chunks</p>
            </div>
            <div className="rounded-lg border border-border/70 bg-background/80 px-2.5 py-2">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Ultimo upload</p>
              <p className="mt-1 truncate text-xs font-semibold text-foreground">{lastUpload ? `${lastUpload.chunks} chunks` : '—'}</p>
            </div>
          </div>
        </section>

        <section className={sectionClass}>
          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground">System Prompt</label>
          <textarea
            value={config.systemPrompt}
            onChange={e => setConfig(c => ({ ...c, systemPrompt: e.target.value }))}
            rows={6}
            className="w-full resize-none rounded-lg border border-input/80 bg-background px-3 py-2 text-xs font-mono leading-relaxed focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </section>

        <section className="rounded-xl border border-primary/20 bg-gradient-to-br from-primary/8 via-background to-secondary/10 p-3.5">
          <p className="text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">Pipeline DeepDiveIA</span><br />
            Embeddings: {config.embeddingModel || 'backend default'}<br />
            Vector DB: qdrant<br />
            Re-ranker: none
          </p>
        </section>
      </div>
    </aside>
  );
};

export default ConfigPanel;
