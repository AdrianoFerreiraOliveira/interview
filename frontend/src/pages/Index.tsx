import { useMemo, useState, type ElementType } from 'react';
import {
  Activity,
  Bot,
  FolderOpen,
  LayoutDashboard,
  MessageSquare,
  ScrollText,
  Shield,
  Sparkles,
} from 'lucide-react';
import AssistantTab from '@/components/AssistantTab';
import ConfigPanel from '@/components/ConfigPanel';
import GuardrailsTab from '@/components/GuardrailsTab';
import { NavLink } from '@/components/NavLink';
import PromptConfigTab from '@/components/PromptConfigTab';
import { AIConfig } from '@/types/ai';

type Tab = 'assistant' | 'guardrails' | 'prompts';

const tabs: { id: Tab; label: string; subtitle: string; icon: ElementType }[] = [
  { id: 'assistant', label: 'Conversa', subtitle: 'Chat RAG com fontes', icon: MessageSquare },
  { id: 'guardrails', label: 'Compliance', subtitle: 'Politicas e bloqueios', icon: Shield },
  { id: 'prompts', label: 'Prompts', subtitle: 'Engenharia de instrucoes', icon: ScrollText },
];

const Index = () => {
  const [activeTab, setActiveTab] = useState<Tab>('assistant');
  const [config, setConfig] = useState<AIConfig>({
    temperature: 0.2,
    systemPrompt:
      'Você é a assistente DeepDiveIA. Responda apenas com base no contexto recuperado. Se a resposta não estiver no contexto, deixe isso explícito.',
    topK: 5,
    model: 'llama3.1',
    embeddingModel: undefined,
  });
  const activeMeta = useMemo(
    () => tabs.find(tab => tab.id === activeTab) ?? tabs[0],
    [activeTab],
  );

  return (
    <div className="relative flex h-screen overflow-hidden bg-background">
      <div className="pointer-events-none absolute inset-0 brand-grid opacity-15" />
      <div className="pointer-events-none absolute inset-y-0 left-0 w-[44vw] bg-gradient-to-r from-primary/10 to-transparent" />

      <aside className="hidden w-72 shrink-0 border-r border-border/80 bg-card/90 backdrop-blur-sm lg:flex lg:flex-col">
        <div className="flex h-16 items-center gap-3 border-b border-border/80 px-5">
          <div className="brand-glow flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-secondary">
            <Bot className="h-4 w-4 text-primary-foreground" />
          </div>
          <div>
            <p className="text-sm font-semibold tracking-tight text-foreground">DeepDiveIA</p>
            <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Enterprise RAG</p>
          </div>
        </div>

        <div className="p-4">
          <button
            type="button"
            onClick={() => setActiveTab('assistant')}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-3 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Novo Chat
          </button>
        </div>

        <nav className="flex-1 space-y-6 overflow-y-auto px-3 pb-4">
          <div className="space-y-1">
            <p className="px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Plataforma</p>
            <NavLink
              to="/"
              end
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
              activeClassName="bg-primary/10 text-primary ring-1 ring-primary/20"
            >
              <LayoutDashboard className="h-4 w-4" />
              Dashboard
            </NavLink>
            <NavLink
              to="/document-management"
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
              activeClassName="bg-primary/10 text-primary ring-1 ring-primary/20"
            >
              <FolderOpen className="h-4 w-4" />
              Documentos
            </NavLink>
            <NavLink
              to="/observability"
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
              activeClassName="bg-primary/10 text-primary ring-1 ring-primary/20"
            >
              <Activity className="h-4 w-4" />
              Observabilidade
            </NavLink>
          </div>

          <div className="space-y-1">
            <p className="px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Workspace</p>
            {tabs.map(tab => {
              const Icon = tab.icon;
              const active = tab.id === activeTab;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-all ${
                    active
                      ? 'bg-primary/10 text-primary ring-1 ring-primary/20'
                      : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{tab.label}</p>
                    <p className="truncate text-[11px]">{tab.subtitle}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </nav>

        <div className="border-t border-border/80 p-4">
          <div className="rounded-xl border border-border/70 bg-muted/40 p-3">
            <p className="text-xs font-semibold text-foreground">Sessao ativa</p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">RAG v2.1 • Ollama Local</p>
            <div className="mt-2 inline-flex items-center gap-1 rounded-full border border-emerald-500/35 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-600">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Online
            </div>
          </div>
        </div>
      </aside>

      <div className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="border-b border-border/80 bg-card/85 backdrop-blur-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
            <div className="min-w-0">
              <h1 className="truncate text-base font-semibold tracking-tight text-foreground sm:text-lg">
                {activeMeta.label}
              </h1>
              <p className="text-xs text-muted-foreground">{activeMeta.subtitle}</p>
            </div>

            <div className="hidden items-center gap-2 sm:flex">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border/80 bg-background/80 px-3 py-1 text-xs font-medium text-muted-foreground">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                DeepDiveIA Workspace
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/35 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-600">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
                Sistemas operacionais
              </span>
            </div>

            <div className="flex w-full items-center gap-1 rounded-lg border border-border/80 bg-background/85 p-1 sm:hidden">
              {tabs.map(tab => {
                const Icon = tab.icon;
                const active = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-2 text-xs font-semibold transition-all ${
                      active ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>
        </header>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row">
          <main className="min-h-0 flex-1 overflow-hidden">
            {activeTab === 'assistant' && <AssistantTab config={config} />}
            {activeTab === 'guardrails' && <GuardrailsTab />}
            {activeTab === 'prompts' && <PromptConfigTab />}
          </main>

          {activeTab === 'assistant' && <ConfigPanel config={config} setConfig={setConfig} />}
        </div>
      </div>
    </div>
  );
};

export default Index;
