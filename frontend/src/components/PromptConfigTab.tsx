import { useState, useEffect, useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
    Save,
    RotateCcw,
    ChevronDown,
    ChevronUp,
    Check,
    AlertCircle,
    ScrollText,
    ShieldCheck,
    Brain,
    HelpCircle,
    FileText,
    Bot,
    Loader2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    getPromptsConfig,
    updatePromptsConfig,
    resetPromptsConfig,
    PromptConfigData,
} from '@/lib/ragApi';
import { toast } from '@/components/ui/sonner';

// ---- Prompt section metadata ----
type SectionMeta = {
    key: keyof PromptConfigData;
    label: string;
    description: string;
    icon: React.ElementType;
    rows: number;
};

const SECTIONS: SectionMeta[] = [
    {
        key: 'system_prompt',
        label: 'System Prompt',
        description:
            'Instrução principal que define o papel, tom e idioma do assistente. É enviado como contexto base a cada interação.',
        icon: Bot,
        rows: 5,
    },
    {
        key: 'rag_prompt_template',
        label: 'RAG Prompt Template',
        description:
            'Template usado para montar o prompt de retrieval-augmented generation. Use {context} e {question} como placeholders.',
        icon: ScrollText,
        rows: 12,
    },
    {
        key: 'compliance_prompt',
        label: 'Compliance Prompt',
        description:
            'Instrução para o classificador de compliance. Define quais tópicos são proibidos e como detectar violações.',
        icon: ShieldCheck,
        rows: 8,
    },
    {
        key: 'hallucination_guard',
        label: 'Controle de Alucinação',
        description:
            'Regras para evitar que o modelo invente informações. Aplicado junto ao prompt RAG.',
        icon: Brain,
        rows: 6,
    },
    {
        key: 'ambiguity_handler',
        label: 'Tratamento de Ambiguidades',
        description:
            'Instruções sobre como lidar com perguntas vagas ou ambíguas do usuário.',
        icon: HelpCircle,
        rows: 5,
    },
    {
        key: 'response_format_instructions',
        label: 'Formato de Resposta',
        description:
            'Define a estrutura e formatação esperada nas respostas (markdown, citações, etc.).',
        icon: FileText,
        rows: 5,
    },
];

// ---- Collapsible section ----
const PromptSection = ({
    meta,
    value,
    onChange,
    isDirty,
}: {
    meta: SectionMeta;
    value: string;
    onChange: (v: string) => void;
    isDirty: boolean;
}) => {
    const [open, setOpen] = useState(true);
    const Icon = meta.icon;

    return (
        <div className="rounded-lg border border-border bg-card overflow-hidden">
            <button
                type="button"
                onClick={() => setOpen(!open)}
                className="flex w-full items-center justify-between px-4 py-3 bg-muted/30 hover:bg-muted/50 transition-colors text-left"
            >
                <div className="flex items-center gap-2.5 min-w-0">
                    <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="text-sm font-semibold text-foreground truncate">{meta.label}</span>
                    {isDirty && (
                        <span className="shrink-0 h-2 w-2 rounded-full bg-amber-500 animate-pulse" title="Alteração não salva" />
                    )}
                </div>
                {open ? (
                    <ChevronUp className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                ) : (
                    <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                )}
            </button>
            <AnimatePresence initial={false}>
                {open && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                    >
                        <div className="px-4 pt-2 pb-4 space-y-2.5">
                            <p className="text-xs text-muted-foreground leading-relaxed">
                                {meta.description}
                            </p>
                            <textarea
                                value={value}
                                onChange={e => onChange(e.target.value)}
                                rows={meta.rows}
                                className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs font-mono leading-relaxed focus:outline-none focus:ring-1 focus:ring-ring resize-y"
                                spellCheck={false}
                            />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

// ---- Main component ----
const PromptConfigTab = () => {
    const queryClient = useQueryClient();

    const { data: serverConfig, isLoading, isError, error } = useQuery({
        queryKey: ['prompts-config'],
        queryFn: getPromptsConfig,
        staleTime: 1000 * 60 * 5,
    });

    const [local, setLocal] = useState<PromptConfigData | null>(null);

    // Sync server -> local on first load or after reset
    useEffect(() => {
        if (serverConfig && !local) {
            setLocal(serverConfig);
        }
    }, [serverConfig, local]);

    const isDirty = useCallback(
        (key: keyof PromptConfigData) => {
            if (!serverConfig || !local) return false;
            return local[key] !== serverConfig[key];
        },
        [serverConfig, local],
    );

    const hasAnyDirty = useCallback(() => {
        return SECTIONS.some(s => isDirty(s.key));
    }, [isDirty]);

    // Save mutation
    const saveMutation = useMutation({
        mutationFn: (cfg: Partial<PromptConfigData>) => updatePromptsConfig(cfg),
        onSuccess: data => {
            queryClient.setQueryData(['prompts-config'], data);
            setLocal(data);
            toast.success('Prompt configuration saved', {
                description: `v${data.version} • ${new Date(data.last_updated).toLocaleString()}`,
            });
        },
        onError: err => {
            toast.error('Falha ao salvar configuração', {
                description: err instanceof Error ? err.message : 'Erro inesperado.',
            });
        },
    });

    // Reset mutation
    const resetMutation = useMutation({
        mutationFn: resetPromptsConfig,
        onSuccess: data => {
            queryClient.setQueryData(['prompts-config'], data);
            setLocal(data);
            toast.success('Configuração restaurada ao padrão');
        },
        onError: err => {
            toast.error('Falha ao resetar configuração', {
                description: err instanceof Error ? err.message : 'Erro inesperado.',
            });
        },
    });

    const handleSave = () => {
        if (!local) return;
        const patch: Partial<PromptConfigData> = {};
        for (const s of SECTIONS) {
            if (isDirty(s.key)) {
                (patch as any)[s.key] = local[s.key];
            }
        }
        saveMutation.mutate(patch);
    };

    const handleReset = () => {
        if (!window.confirm('Restaurar todas as instruções ao padrão original? As configurações atuais serão perdidas.')) return;
        resetMutation.mutate();
    };

    const handleChange = (key: keyof PromptConfigData, value: string) => {
        setLocal(prev => (prev ? { ...prev, [key]: value } : prev));
    };

    // ---- Render ----
    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full text-muted-foreground gap-2">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span className="text-sm">Carregando configuração de prompts...</span>
            </div>
        );
    }

    if (isError) {
        return (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-6">
                <AlertCircle className="h-8 w-8 text-destructive" />
                <p className="text-sm text-destructive font-medium">
                    Erro ao carregar configuração de prompts
                </p>
                <p className="text-xs text-muted-foreground">
                    {error instanceof Error ? error.message : 'Verifique se o backend está rodando.'}
                </p>
            </div>
        );
    }

    if (!local) return null;

    return (
        <div className="flex h-full flex-col">
            {/* Toolbar */}
            <div className="flex items-center justify-between border-b border-border bg-card px-4 py-3">
                <div className="flex items-center gap-2.5">
                    <ScrollText className="h-4 w-4 text-muted-foreground" />
                    <div>
                        <h2 className="text-sm font-semibold text-foreground">Engenharia de Prompts</h2>
                        <p className="text-[10px] text-muted-foreground">
                            v{local.version} • Última atualização: {local.last_updated ? new Date(local.last_updated).toLocaleString() : '—'}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={handleReset}
                        disabled={resetMutation.isPending}
                        className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors disabled:opacity-50"
                    >
                        <RotateCcw className="h-3 w-3" />
                        Reset
                    </button>
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={!hasAnyDirty() || saveMutation.isPending}
                        className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
                    >
                        {saveMutation.isPending ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                        ) : saveMutation.isSuccess && !hasAnyDirty() ? (
                            <Check className="h-3 w-3" />
                        ) : (
                            <Save className="h-3 w-3" />
                        )}
                        {saveMutation.isPending ? 'Salvando...' : 'Salvar'}
                    </button>
                </div>
            </div>

            {/* Sections */}
            <div className="flex-1 overflow-y-auto scrollbar-thin p-4 space-y-3">
                {/* Description card */}
                <div className="rounded-lg bg-muted/30 border border-border/50 px-4 py-3">
                    <p className="text-xs text-muted-foreground leading-relaxed">
                        
                        Configure cada prompt por responsabilidade. As instruções são salvas em um arquivo JSON local
                        e aplicadas automaticamente pelo pipeline RAG. Edite cada seção individualmente e salve para persistir.
                    </p>
                </div>

                {SECTIONS.map(meta => (
                    <PromptSection
                        key={meta.key}
                        meta={meta}
                        value={String(local[meta.key] ?? '')}
                        onChange={v => handleChange(meta.key, v)}
                        isDirty={isDirty(meta.key)}
                    />
                ))}

                {/* Blocked topics list */}
                <div className="rounded-lg border border-border bg-card overflow-hidden">
                    <div className="flex items-center gap-2.5 px-4 py-3 bg-muted/30">
                        <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-semibold text-foreground">Tópicos Bloqueados</span>
                    </div>
                    <div className="px-4 py-3">
                        <p className="text-xs text-muted-foreground mb-2 leading-relaxed">
                            Lista de tópicos que o compliance deve bloquear. Um por linha.
                        </p>
                        <textarea
                            value={(local.blocked_topics_list ?? []).join('\n')}
                            onChange={e =>
                                setLocal(prev =>
                                    prev
                                        ? {
                                            ...prev,
                                            blocked_topics_list: e.target.value
                                                .split('\n')
                                                .map(s => s.trim())
                                                .filter(Boolean),
                                        }
                                        : prev,
                                )
                            }
                            rows={4}
                            className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs font-mono leading-relaxed focus:outline-none focus:ring-1 focus:ring-ring resize-y"
                            spellCheck={false}
                        />
                    </div>
                </div>

                {/* JSON preview */}
                <details className="rounded-lg border border-border bg-card overflow-hidden group">
                    <summary className="flex items-center gap-2.5 px-4 py-3 bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer text-sm font-semibold text-foreground select-none">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        JSON Preview
                    </summary>
                    <pre className="px-4 py-3 text-[11px] font-mono text-muted-foreground overflow-x-auto leading-relaxed whitespace-pre-wrap">
                        {JSON.stringify(local, null, 2)}
                    </pre>
                </details>
            </div>
        </div>
    );
};

export default PromptConfigTab;
