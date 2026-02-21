import { useState } from 'react';
import { MessageSquare, Bot, Shield, ScrollText } from 'lucide-react';
import AssistantTab from '@/components/AssistantTab';
import ConfigPanel from '@/components/ConfigPanel';
import GuardrailsTab from '@/components/GuardrailsTab';
import PromptConfigTab from '@/components/PromptConfigTab';
import { AIConfig } from '@/types/ai';

type Tab = 'assistant' | 'guardrails' | 'prompts';

const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'assistant', label: 'Assistant', icon: MessageSquare },
  { id: 'guardrails', label: 'Guardrails', icon: Shield },
  { id: 'prompts', label: 'Prompts', icon: ScrollText },
];

const Index = () => {
  const [activeTab, setActiveTab] = useState<Tab>('assistant');
  const [config, setConfig] = useState<AIConfig>({
    temperature: 0.2,
    systemPrompt:
      'You are a helpful assistant for AB InBev internal operations. Answer questions based only on the provided context. If the answer is not in the context, say so clearly.',
    topK: 5,
    model: 'llama3.1',
    embeddingModel: undefined,
  });

  return (
    <div className="flex h-screen flex-col bg-background">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-border bg-primary px-4 py-2.5 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center h-8 w-8 rounded-md bg-secondary">
            <Bot className="h-4.5 w-4.5 text-secondary-foreground" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-primary-foreground tracking-tight">Explainable AI Assistant</h1>
            <p className="text-[10px] text-primary-foreground/60 uppercase tracking-widest">AB InBev · Internal Operations</p>
          </div>
        </div>
        <div className="flex items-center gap-1 rounded-lg bg-primary-foreground/10 p-0.5">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all ${active
                  ? 'bg-secondary text-secondary-foreground shadow-sm'
                  : 'text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/10'
                  }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </header>

      {/* Content */}
      <div className="flex flex-1 overflow-hidden">
        <main className="flex-1 overflow-hidden">
          {activeTab === 'assistant' && <AssistantTab config={config} />}
          {activeTab === 'guardrails' && <GuardrailsTab />}
          {activeTab === 'prompts' && <PromptConfigTab />}
        </main>
        <ConfigPanel config={config} setConfig={setConfig} />
      </div>
    </div>
  );
};

export default Index;
