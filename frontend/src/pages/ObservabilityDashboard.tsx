import { NavLink } from "@/components/NavLink";
import {
  Activity,
  Bell,
  Bot,
  CalendarDays,
  CheckCircle2,
  FolderOpen,
  LayoutDashboard,
  MapPinned,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const tokenUsageData = [
  { hour: "00:00", tokens: 1500 },
  { hour: "04:00", tokens: 2200 },
  { hour: "08:00", tokens: 5600 },
  { hour: "12:00", tokens: 8400 },
  { hour: "16:00", tokens: 7800 },
  { hour: "20:00", tokens: 6200 },
  { hour: "24:00", tokens: 3100 },
];

const costByModelData = [
  { model: "GPT-4", cost: 850 },
  { model: "GPT-3.5", cost: 210 },
  { model: "Claude", cost: 120 },
  { model: "Llama", cost: 45 },
  { model: "Embed", cost: 20 },
];

const costBarColors = ["#1E3A8A", "#3B82F6", "#60A5FA", "#93C5FD", "#BFDBFE"];

const originData = [
  { city: "Sao Paulo, BR", share: 42 },
  { city: "New York, US", share: 28 },
  { city: "Lisboa, PT", share: 14 },
  { city: "Madrid, ES", share: 9 },
];

const logs = [
  { status: "Success", time: "10:42:05", model: "gpt-4-turbo", tokens: "1,240", latency: "420ms", trace: "#tr-8293a" },
  { status: "Success", time: "10:41:58", model: "claude-3-opus", tokens: "4,102", latency: "1.2s", trace: "#tr-7721b" },
  { status: "Warning", time: "10:41:12", model: "gpt-3.5-turbo", tokens: "890", latency: "2.1s", trace: "#tr-6510c" },
  { status: "Success", time: "10:40:45", model: "gpt-4-turbo", tokens: "540", latency: "310ms", trace: "#tr-5112d" },
  { status: "Error", time: "10:40:02", model: "llama-3-70b", tokens: "0", latency: "-", trace: "#tr-4001e" },
];

const statusPillClass = (status: string) => {
  if (status === "Success") return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400";
  if (status === "Warning") return "bg-amber-500/15 text-amber-700 dark:text-amber-400";
  return "bg-red-500/15 text-red-700 dark:text-red-400";
};

const ObservabilityDashboard = () => {
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

        <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-4">
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
            <p className="px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Governanca</p>
            <button
              type="button"
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
            >
              <ShieldCheck className="h-4 w-4" />
              Compliance Logs
            </button>
          </div>
        </nav>

        <div className="border-t border-border/80 p-4">
          <div className="rounded-xl border border-border/70 bg-muted/40 p-3">
            <p className="text-xs font-semibold text-foreground">Monitoramento</p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">Janela ativa: ultimas 24h</p>
            <div className="mt-2 inline-flex items-center gap-1 rounded-full border border-emerald-500/35 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-600">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
              Sistemas operacionais
            </div>
          </div>
        </div>
      </aside>

      <main className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="border-b border-border/80 bg-card/85 backdrop-blur-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
            <div className="min-w-0">
              <h1 className="truncate text-base font-semibold tracking-tight text-foreground sm:text-lg">
                Observability Dashboard
              </h1>
              <p className="text-xs text-muted-foreground">Metricas, custo e rastreamento de execucoes do workspace</p>
            </div>

            <div className="flex items-center gap-2">
              <div className="hidden items-center gap-2 rounded-full border border-border/80 bg-background/85 px-3 py-1 text-xs text-muted-foreground sm:inline-flex">
                <CalendarDays className="h-3.5 w-3.5" />
                Ultimas 24 horas
              </div>
              <button
                type="button"
                className="relative inline-flex h-9 w-9 items-center justify-center rounded-full border border-border/80 bg-background text-muted-foreground transition-colors hover:text-foreground"
              >
                <Bell className="h-4 w-4" />
                <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-red-500" />
              </button>
            </div>
          </div>
        </header>

        <section className="scrollbar-thin min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-border/90 bg-card/90 p-5 shadow-sm">
              <p className="text-sm font-medium text-muted-foreground">Total Tokens</p>
              <p className="mt-1 text-2xl font-bold text-foreground">24.5M</p>
              <p className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-emerald-600">
                <TrendingUp className="h-3.5 w-3.5" />
                +12.5% vs periodo anterior
              </p>
            </div>

            <div className="rounded-2xl border border-border/90 bg-card/90 p-5 shadow-sm">
              <p className="text-sm font-medium text-muted-foreground">Custo Mensal</p>
              <p className="mt-1 text-2xl font-bold text-foreground">$1,245.00</p>
              <p className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-emerald-600">
                <TrendingDown className="h-3.5 w-3.5" />
                -4.2% vs projecao mensal
              </p>
            </div>

            <div className="rounded-2xl border border-border/90 bg-card/90 p-5 shadow-sm">
              <p className="text-sm font-medium text-muted-foreground">Latencia Media</p>
              <p className="mt-1 text-2xl font-bold text-foreground">450ms</p>
              <p className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-amber-600">
                <TrendingUp className="h-3.5 w-3.5" />
                +2.1% vs periodo anterior
              </p>
            </div>

            <div className="rounded-2xl border border-border/90 bg-card/90 p-5 shadow-sm">
              <p className="text-sm font-medium text-muted-foreground">Taxa de Sucesso</p>
              <p className="mt-1 text-2xl font-bold text-foreground">99.8%</p>
              <p className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-emerald-600">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Estavel
              </p>
            </div>
          </div>

          <div className="mb-6 grid grid-cols-1 gap-4 xl:grid-cols-3">
            <div className="rounded-2xl border border-border/90 bg-card/90 p-5 shadow-sm xl:col-span-2">
              <h3 className="mb-4 text-base font-semibold text-foreground">Token Usage Over Time</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={tokenUsageData} margin={{ left: -18, right: 12, top: 12, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border) / 0.6)" />
                    <XAxis dataKey="hour" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                    <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                    <Tooltip
                      cursor={{ stroke: "hsl(var(--primary))", strokeOpacity: 0.3 }}
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        borderColor: "hsl(var(--border))",
                        borderRadius: "0.75rem",
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="tokens"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2.5}
                      dot={{ stroke: "hsl(var(--primary))", fill: "hsl(var(--background))", r: 3 }}
                      activeDot={{ r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="rounded-2xl border border-border/90 bg-card/90 p-5 shadow-sm">
              <h3 className="mb-4 text-base font-semibold text-foreground">Cost by Model</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={costByModelData} margin={{ left: -20, right: 8, top: 12, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border) / 0.6)" />
                    <XAxis dataKey="model" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                    <YAxis tickFormatter={value => `$${value}`} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                    <Tooltip
                      formatter={value => [`$${value}`, "Cost"]}
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        borderColor: "hsl(var(--border))",
                        borderRadius: "0.75rem",
                      }}
                    />
                    <Bar dataKey="cost" radius={[8, 8, 0, 0]}>
                      {costByModelData.map((entry, index) => (
                        <Cell key={`${entry.model}-${index}`} fill={costBarColors[index]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            <div className="rounded-2xl border border-border/90 bg-card/90 p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-base font-semibold text-foreground">Query Origins</h3>
                <span className="text-xs text-muted-foreground">Top: Brazil</span>
              </div>
              <div className="mb-4 flex h-28 items-center justify-center rounded-xl border border-dashed border-primary/25 bg-primary/5">
                <MapPinned className="h-8 w-8 text-primary/70" />
              </div>
              <div className="space-y-3">
                {originData.map(origin => (
                  <div key={origin.city}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{origin.city}</span>
                      <span className="font-semibold text-primary">{origin.share}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted">
                      <div className="h-1.5 rounded-full bg-primary" style={{ width: `${origin.share}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-border/90 bg-card/90 p-5 shadow-sm xl:col-span-2">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-semibold text-foreground">Live Query Logs</h3>
                  <span className="inline-flex h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="rounded-lg border border-border/80 bg-muted/40 px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground"
                  >
                    Filter
                  </button>
                  <button
                    type="button"
                    className="rounded-lg border border-border/80 bg-muted/40 px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground"
                  >
                    Export
                  </button>
                </div>
              </div>

              <div className="overflow-auto">
                <table className="w-full min-w-[640px] border-collapse text-left">
                  <thead>
                    <tr className="border-b border-border/80 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      <th className="px-2 py-2">Status</th>
                      <th className="px-2 py-2">Time</th>
                      <th className="px-2 py-2">Model</th>
                      <th className="px-2 py-2">Tokens</th>
                      <th className="px-2 py-2">Latency</th>
                      <th className="px-2 py-2">Trace ID</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm">
                    {logs.map(log => (
                      <tr key={log.trace} className="border-b border-border/70 transition-colors hover:bg-muted/35">
                        <td className="px-2 py-3">
                          <span className={`rounded px-2 py-0.5 text-xs font-semibold ${statusPillClass(log.status)}`}>
                            {log.status}
                          </span>
                        </td>
                        <td className="px-2 py-3 font-mono text-xs text-muted-foreground">{log.time}</td>
                        <td className="px-2 py-3 text-foreground">{log.model}</td>
                        <td className="px-2 py-3 text-muted-foreground">{log.tokens}</td>
                        <td className="px-2 py-3 text-muted-foreground">{log.latency}</td>
                        <td className="px-2 py-3 font-mono text-xs text-primary hover:underline">{log.trace}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default ObservabilityDashboard;
