import { useMemo, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { Settings, ChevronLeft, ChevronRight } from 'lucide-react';
import { AIConfig } from '@/types/ai';
import { useMutation, useQuery } from '@tanstack/react-query';
import { ingestPdf, listModels } from '@/lib/ragApi';
import { toast } from '@/components/ui/sonner';

type ConfigPanelProps = {
  config: AIConfig;
  setConfig: Dispatch<SetStateAction<AIConfig>>;
};

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
        className="flex items-center justify-center w-10 h-full border-l border-border bg-card hover:bg-muted/50 transition-colors"
      >
        <div className="flex flex-col items-center gap-2">
          <Settings className="h-4 w-4 text-muted-foreground" />
          <ChevronLeft className="h-3 w-3 text-muted-foreground" />
        </div>
      </button>
    );
  }

  return (
    <div className="w-72 shrink-0 border-l border-border bg-card overflow-y-auto scrollbar-thin">
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <Settings className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold text-foreground">Configuration</h3>
        </div>
        <button onClick={() => setCollapsed(true)} className="p-1 rounded hover:bg-muted transition-colors">
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      </div>
      <div className="p-4 space-y-5">
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wider">Model</label>
            <button
              onClick={() => refetch()}
              className="text-[10px] font-medium text-muted-foreground hover:text-foreground"
              type="button"
            >
              Atualizar
            </button>
          </div>
          {modelOptions.length > 0 ? (
            <select
              value={config.model}
              onChange={e => setConfig(c => ({ ...c, model: e.target.value }))}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
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
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
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
        </div>
        <div>
          <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5">Embedding Model</label>
          <select
            value={config.embeddingModel ?? ''}
            onChange={e => setConfig(c => ({ ...c, embeddingModel: e.target.value || undefined }))}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="">Usar padrão do backend</option>
            {modelOptions.map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
          <p className="mt-1 text-[11px] text-muted-foreground">Selecione um modelo com suporte a embeddings.</p>
        </div>
        <div>
          <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5">Upload de PDF</label>
          <div className="space-y-2">
            <input
              type="file"
              accept="application/pdf"
              onChange={e => setSelectedFile(e.target.files?.[0] || null)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs file:mr-3 file:rounded file:border-0 file:bg-secondary file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-secondary-foreground hover:file:bg-secondary/80"
            />
            <button
              type="button"
              disabled={!selectedFile || ingestMutation.isPending}
              onClick={() => selectedFile && ingestMutation.mutate(selectedFile)}
              className="w-full rounded-md bg-primary px-3 py-2 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
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
                Último upload: {lastUpload.name} ({lastUpload.chunks} chunks, {lastUpload.embeddingModel})
              </p>
            )}
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5">
            Temperature: {config.temperature.toFixed(2)}
          </label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={config.temperature}
            onChange={e => setConfig(c => ({ ...c, temperature: parseFloat(e.target.value) }))}
            className="w-full accent-secondary"
          />
          <div className="flex justify-between text-xs text-muted-foreground mt-0.5">
            <span>Precise</span>
            <span>Creative</span>
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5">
            Top K Retrieval: {config.topK}
          </label>
          <input
            type="range"
            min="1"
            max="20"
            step="1"
            value={config.topK}
            onChange={e => setConfig(c => ({ ...c, topK: parseInt(e.target.value) }))}
            className="w-full accent-secondary"
          />
          <div className="flex justify-between text-xs text-muted-foreground mt-0.5">
            <span>1</span>
            <span>20</span>
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5">System Prompt</label>
          <textarea
            value={config.systemPrompt}
            onChange={e => setConfig(c => ({ ...c, systemPrompt: e.target.value }))}
            rows={6}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs font-mono leading-relaxed focus:outline-none focus:ring-1 focus:ring-ring resize-none"
          />
        </div>
        <div className="rounded-md bg-muted/50 p-3">
          <p className="text-xs text-muted-foreground">
            <span className="font-medium text-foreground">Pipeline info</span><br />
            Embeddings: {config.embeddingModel || 'backend default'}<br />
            Vector DB: qdrant<br />
            Re-ranker: none
          </p>
        </div>
      </div>
    </div>
  );
};

export default ConfigPanel;
