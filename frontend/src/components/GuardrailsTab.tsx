import { useState, useCallback, useEffect } from 'react';
import {
    Shield,
    ShieldCheck,
    ShieldX,
    Plus,
    Trash2,
    Save,
    FlaskConical,
    Loader2,
    ToggleLeft,
    ToggleRight,
    AlertTriangle,
    CheckCircle2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from '@/components/ui/sonner';
import {
    getGuardrailsConfig,
    updateGuardrailsConfig,
    checkCompliance,
    type GuardrailConfigData,
} from '@/lib/ragApi';

const DEFAULT_TOPICS = [
    'política',
    'religião',
    'violência',
    'drogas',
    'demissões / layoffs',
];

const topicIcons: Record<string, string> = {
    'política': '🏛️',
    'religião': '⛪',
    'violência': '⚠️',
    'drogas': '💊',
    'demissões / layoffs': '📋',
};

const GuardrailsTab = () => {
    const [config, setConfig] = useState<GuardrailConfigData | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [newTopic, setNewTopic] = useState('');
    const [testQuery, setTestQuery] = useState('');
    const [testResult, setTestResult] = useState<{
        is_blocked: boolean;
        detected_topic: string;
        reasoning: string;
    } | null>(null);
    const [testing, setTesting] = useState(false);

    const fetchConfig = useCallback(async () => {
        try {
            const data = await getGuardrailsConfig();
            setConfig(data);
        } catch (err) {
            toast.error('Erro ao carregar configuração de guardrails', {
                description: err instanceof Error ? err.message : 'Erro inesperado.',
            });
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchConfig();
    }, [fetchConfig]);

    const handleSave = async () => {
        if (!config) return;
        setSaving(true);
        try {
            const updated = await updateGuardrailsConfig(config);
            setConfig(updated);
            toast.success('Configuração salva com sucesso');
        } catch (err) {
            toast.error('Erro ao salvar configuração', {
                description: err instanceof Error ? err.message : 'Erro inesperado.',
            });
        } finally {
            setSaving(false);
        }
    };

    const handleToggleEnabled = () => {
        if (!config) return;
        setConfig({ ...config, enabled: !config.enabled });
    };

    const handleToggleTopic = (topic: string) => {
        if (!config) return;
        const topics = config.blocked_topics.includes(topic)
            ? config.blocked_topics.filter((t) => t !== topic)
            : [...config.blocked_topics, topic];
        setConfig({ ...config, blocked_topics: topics });
    };

    const handleAddTopic = () => {
        if (!config || !newTopic.trim()) return;
        const topic = newTopic.trim().toLowerCase();
        if (config.blocked_topics.includes(topic)) {
            toast.warning('Tópico já existe na lista');
            return;
        }
        setConfig({ ...config, blocked_topics: [...config.blocked_topics, topic] });
        setNewTopic('');
    };

    const handleRemoveTopic = (topic: string) => {
        if (!config) return;
        setConfig({
            ...config,
            blocked_topics: config.blocked_topics.filter((t) => t !== topic),
        });
    };

    const handleTest = async () => {
        if (!testQuery.trim()) return;
        setTesting(true);
        setTestResult(null);
        try {
            const result = await checkCompliance(testQuery.trim());
            setTestResult(result);
        } catch (err) {
            toast.error('Erro ao testar compliance', {
                description: err instanceof Error ? err.message : 'Erro inesperado.',
            });
        } finally {
            setTesting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex h-full items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (!config) {
        return (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                Falha ao carregar configuração. Verifique o backend.
            </div>
        );
    }

    return (
        <div className="flex h-full flex-col overflow-y-auto scrollbar-thin">
            <div className="mx-auto w-full max-w-3xl space-y-6 p-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-gradient-to-br from-amber-500/20 to-red-500/20 border border-amber-500/30">
                            <Shield className="h-5 w-5 text-amber-500" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-foreground">Guardrails & Compliance</h2>
                            <p className="text-xs text-muted-foreground">
                                Gerencie tópicos sensíveis e teste políticas de compliance
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
                    >
                        {saving ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <Save className="h-4 w-4" />
                        )}
                        Salvar
                    </button>
                </div>

                {/* Master toggle */}
                <motion.div
                    layout
                    className={`rounded-xl border p-4 transition-colors ${config.enabled
                            ? 'border-green-500/30 bg-green-500/5'
                            : 'border-border bg-muted/30'
                        }`}
                >
                    <button
                        onClick={handleToggleEnabled}
                        className="flex w-full items-center justify-between"
                    >
                        <div className="flex items-center gap-3">
                            {config.enabled ? (
                                <ShieldCheck className="h-5 w-5 text-green-500" />
                            ) : (
                                <ShieldX className="h-5 w-5 text-muted-foreground" />
                            )}
                            <div className="text-left">
                                <p className="text-sm font-semibold text-foreground">
                                    {config.enabled ? 'Guardrails Ativos' : 'Guardrails Desativados'}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    {config.enabled
                                        ? 'Todas as queries passam por verificação de compliance'
                                        : 'Queries não são verificadas — desativado'}
                                </p>
                            </div>
                        </div>
                        {config.enabled ? (
                            <ToggleRight className="h-8 w-8 text-green-500" />
                        ) : (
                            <ToggleLeft className="h-8 w-8 text-muted-foreground" />
                        )}
                    </button>
                </motion.div>

                {/* Blocked topics */}
                <div className="rounded-xl border border-border bg-card p-5 space-y-4">
                    <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">
                        Tópicos Bloqueados
                    </h3>
                    <div className="grid gap-2">
                        {[...DEFAULT_TOPICS, ...config.blocked_topics.filter((t) => !DEFAULT_TOPICS.includes(t))].map(
                            (topic) => {
                                const isActive = config.blocked_topics.includes(topic);
                                const isDefault = DEFAULT_TOPICS.includes(topic);
                                const icon = topicIcons[topic] || '🚫';
                                return (
                                    <motion.div
                                        key={topic}
                                        layout
                                        className={`flex items-center justify-between rounded-lg border px-4 py-2.5 transition-all ${isActive
                                                ? 'border-amber-500/30 bg-amber-500/5'
                                                : 'border-border bg-muted/20 opacity-60'
                                            }`}
                                    >
                                        <label className="flex items-center gap-3 cursor-pointer flex-1">
                                            <input
                                                type="checkbox"
                                                checked={isActive}
                                                onChange={() => handleToggleTopic(topic)}
                                                className="h-4 w-4 accent-amber-500 rounded"
                                            />
                                            <span className="text-base">{icon}</span>
                                            <span className="text-sm font-medium text-foreground capitalize">
                                                {topic}
                                            </span>
                                        </label>
                                        {!isDefault && (
                                            <button
                                                onClick={() => handleRemoveTopic(topic)}
                                                className="p-1 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                                                title="Remover tópico"
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </button>
                                        )}
                                    </motion.div>
                                );
                            }
                        )}
                    </div>
                    {/* Add custom topic */}
                    <div className="flex items-center gap-2 pt-2">
                        <input
                            value={newTopic}
                            onChange={(e) => setNewTopic(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleAddTopic()}
                            placeholder="Adicionar tópico personalizado..."
                            className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                        />
                        <button
                            onClick={handleAddTopic}
                            disabled={!newTopic.trim()}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-foreground hover:bg-muted/50 transition-colors disabled:opacity-40"
                        >
                            <Plus className="h-3.5 w-3.5" />
                            Adicionar
                        </button>
                    </div>
                </div>

                {/* Compliance message */}
                <div className="rounded-xl border border-border bg-card p-5 space-y-3">
                    <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">
                        Mensagem de Compliance
                    </h3>
                    <p className="text-xs text-muted-foreground">
                        Mensagem exibida ao usuário quando uma query é bloqueada
                    </p>
                    <textarea
                        value={config.compliance_message}
                        onChange={(e) =>
                            setConfig({ ...config, compliance_message: e.target.value })
                        }
                        rows={3}
                        className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm leading-relaxed focus:outline-none focus:ring-1 focus:ring-ring resize-none"
                    />
                </div>

                {/* Guardrail model */}
                <div className="rounded-xl border border-border bg-card p-5 space-y-3">
                    <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">
                        Modelo do Guardrail
                    </h3>
                    <p className="text-xs text-muted-foreground">
                        Modelo OpenAI usado para classificação LLM (requer OPENAI_API_KEY)
                    </p>
                    <input
                        value={config.guardrail_model}
                        onChange={(e) =>
                            setConfig({ ...config, guardrail_model: e.target.value })
                        }
                        placeholder="gpt-4o-mini"
                        className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                </div>

                {/* Test area */}
                <div className="rounded-xl border border-border bg-card p-5 space-y-4">
                    <div className="flex items-center gap-2">
                        <FlaskConical className="h-4 w-4 text-muted-foreground" />
                        <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">
                            Testar Compliance
                        </h3>
                    </div>
                    <p className="text-xs text-muted-foreground">
                        Envie uma query de teste para verificar se seria bloqueada pelos guardrails ativos
                    </p>
                    <div className="flex items-center gap-2">
                        <input
                            value={testQuery}
                            onChange={(e) => setTestQuery(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleTest()}
                            placeholder="Ex: O que você acha sobre política?"
                            className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                        />
                        <button
                            onClick={handleTest}
                            disabled={!testQuery.trim() || testing}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground transition-colors hover:bg-secondary/80 disabled:opacity-50"
                        >
                            {testing ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <FlaskConical className="h-4 w-4" />
                            )}
                            Testar
                        </button>
                    </div>
                    <AnimatePresence>
                        {testResult && (
                            <motion.div
                                initial={{ opacity: 0, y: -4 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -4 }}
                                className={`rounded-lg border p-4 ${testResult.is_blocked
                                        ? 'border-red-500/40 bg-red-500/5'
                                        : 'border-green-500/40 bg-green-500/5'
                                    }`}
                            >
                                <div className="flex items-start gap-3">
                                    {testResult.is_blocked ? (
                                        <AlertTriangle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                                    ) : (
                                        <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                                    )}
                                    <div className="space-y-1.5">
                                        <p className="text-sm font-semibold text-foreground">
                                            {testResult.is_blocked ? '⛔ Query BLOQUEADA' : '✅ Query PERMITIDA'}
                                        </p>
                                        {testResult.detected_topic && (
                                            <p className="text-xs text-muted-foreground">
                                                <span className="font-medium">Tópico detectado:</span> {testResult.detected_topic}
                                            </p>
                                        )}
                                        <p className="text-xs text-muted-foreground">
                                            <span className="font-medium">Raciocínio:</span> {testResult.reasoning}
                                        </p>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Info box */}
                <div className="rounded-xl border border-border bg-muted/30 p-4">
                    <p className="text-xs text-muted-foreground leading-relaxed">
                        <span className="font-semibold text-foreground">Como funciona:</span>{' '}
                        O sistema usa duas camadas de verificação. Primeiro, uma checagem rápida por
                        palavras-chave. Se não houver match, um agente LLM (via OpenAI Agents SDK)
                        classifica a query. Se <code>OPENAI_API_KEY</code> não estiver configurada, apenas
                        a checagem por keywords será utilizada.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default GuardrailsTab;
