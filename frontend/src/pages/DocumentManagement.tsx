import { NavLink } from "@/components/NavLink";
import { useEffect, useState } from "react";
import {
  Activity,
  Bot,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  FileSpreadsheet,
  FileText,
  FileType,
  Filter,
  FolderOpen,
  LayoutDashboard,
  Lock,
  MoreVertical,
  PlusCircle,
  Search,
  Sparkles,
  Table2,
} from "lucide-react";

type DocumentStatus = "Indexado" | "Processando" | "Falha";

interface DocumentRecord {
  id: string;
  name: string;
  access: "Interno" | "Confidencial" | "Restrito" | "Tecnico";
  status: DocumentStatus;
  size: string;
  type: string;
  embeddingModel?: string;
  url?: string;
  created_at?: string;
}

const statusStyles: Record<DocumentStatus, string> = {
  Indexado: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  Processando: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  Falha: "bg-red-500/15 text-red-700 dark:text-red-400",
};

const typeIcon = (type: DocumentRecord["type"]) => {
  if (type === "PDF") return <FileType className="h-4 w-4" />;
  if (type === "DOCX") return <FileText className="h-4 w-4" />;
  if (type === "XLSX") return <FileSpreadsheet className="h-4 w-4" />;
  if (type === "TXT") return <Table2 className="h-4 w-4" />;
  return <FileText className="h-4 w-4" />;
};

const DocumentManagement = () => {
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [selectedDocument, setSelectedDocument] = useState<DocumentRecord | null>(null);

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
      const res = await fetch(`${baseUrl}/documents`);
      if (res.ok) {
        const data = await res.json();
        // maps backend to frontend interface
        const formatted = data.map((d: any) => ({
          id: d.id,
          name: d.name,
          access: "Interno",
          status: "Indexado",
          size: "Ver MinIO",
          type: "PDF",
          url: d.url,
          created_at: d.created_at
        }));
        setDocuments(formatted);
        if (formatted.length > 0) setSelectedDocument(formatted[0]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja apagar?")) return;
    try {
      const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
      const res = await fetch(`${baseUrl}/documents/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchDocuments();
      }
    } catch (err) {
      console.error(err);
    }
  };

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
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-3 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
          >
            <PlusCircle className="h-3.5 w-3.5" />
            Adicionar Fonte
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
        </nav>

        <div className="border-t border-border/80 p-4">
          <div className="rounded-xl border border-border/70 bg-muted/40 p-3">
            <p className="text-xs font-semibold text-foreground">Base de conhecimento</p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">148 documentos indexados</p>
            <div className="mt-2 inline-flex items-center gap-1 rounded-full border border-emerald-500/35 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-600">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Operacional
            </div>
          </div>
        </div>
      </aside>

      <main className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="border-b border-border/80 bg-card/85 backdrop-blur-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
            <div className="min-w-0">
              <h1 className="truncate text-base font-semibold tracking-tight text-foreground sm:text-lg">
                Base de Conhecimento
              </h1>
              <p className="text-xs text-muted-foreground">Gerencie fontes de dados e status de indexacao</p>
            </div>

            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border/80 bg-background/80 px-3 py-1 text-xs font-medium text-muted-foreground">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                Workspace Enterprise
              </span>
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 sm:text-sm"
              >
                <PlusCircle className="h-3.5 w-3.5" />
                Adicionar Fonte
              </button>
            </div>
          </div>
        </header>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden xl:flex-row">
          <section className="flex min-h-0 min-w-0 flex-1 flex-col p-4 sm:p-6">
            <div className="mb-4 flex flex-wrap items-center gap-2 sm:gap-3">
              <div className="relative min-w-[220px] flex-1">
                <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <input
                  className="h-10 w-full rounded-xl border border-border bg-card pl-9 pr-4 text-sm outline-none transition-colors focus:border-primary"
                  type="text"
                  placeholder="Buscar documentos por nome, conteudo ou ID..."
                />
              </div>

              <select className="h-10 rounded-xl border border-border bg-card px-3 text-sm text-muted-foreground outline-none focus:border-primary">
                <option>Todos Departamentos</option>
                <option>Juridico</option>
                <option>Recursos Humanos</option>
                <option>Engenharia</option>
              </select>
              <select className="h-10 rounded-xl border border-border bg-card px-3 text-sm text-muted-foreground outline-none focus:border-primary">
                <option>Compliance: Todos</option>
                <option>Publico</option>
                <option>Confidencial</option>
                <option>Restrito</option>
              </select>
              <button
                type="button"
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground transition-colors hover:border-primary hover:text-primary"
              >
                <Filter className="h-4 w-4" />
              </button>
            </div>

            <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-border/90 bg-card/90 shadow-sm">
              <div className="min-h-0 flex-1 overflow-auto">
                <table className="w-full min-w-[980px] border-collapse text-left">
                  <thead className="sticky top-0 bg-muted/70 backdrop-blur-sm">
                    <tr className="border-b border-border/80">
                      <th className="w-12 px-4 py-3 text-center">
                        <input type="checkbox" className="h-4 w-4 rounded border-border" defaultChecked />
                      </th>
                      <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Nome do Arquivo
                      </th>
                      <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Status
                      </th>
                      <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Tamanho</th>
                      <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Tipo</th>
                      <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Modelo Embedding
                      </th>
                      <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Atualizado
                      </th>
                      <th className="w-10 px-4 py-3" />
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-border/70">
                    {documents.map((doc, index) => {
                      const highlighted = index === 0;
                      const iconColor =
                        doc.type === "PDF"
                          ? "bg-red-500/15 text-red-600"
                          : doc.type === "DOCX"
                            ? "bg-blue-500/15 text-blue-600"
                            : doc.type === "XLSX"
                              ? "bg-emerald-500/15 text-emerald-600"
                              : "bg-slate-500/15 text-slate-600";
                      return (
                        <tr
                          key={doc.id}
                          onClick={() => setSelectedDocument(doc)}
                          className={`group cursor-pointer transition-colors hover:bg-muted/40 ${highlighted ? "bg-primary/5" : ""
                            }`}
                        >
                          <td className="px-4 py-3 text-center">
                            <input
                              type="checkbox"
                              className="h-4 w-4 rounded border-border"
                              defaultChecked={highlighted}
                            />
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className={`inline-flex h-8 w-8 items-center justify-center rounded-md ${iconColor}`}>
                                {typeIcon(doc.type)}
                              </div>
                              <div className="min-w-0">
                                <p className="truncate text-sm font-medium text-foreground">{doc.name}</p>
                                <p className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                                  {doc.access !== "Interno" && <Lock className="h-3 w-3" />}
                                  {doc.access}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${statusStyles[doc.status]}`}
                            >
                              {doc.status === "Falha" ? (
                                <CircleAlert className="h-3.5 w-3.5" />
                              ) : (
                                <span className="h-1.5 w-1.5 rounded-full bg-current" />
                              )}
                              {doc.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-muted-foreground">{doc.size}</td>
                          <td className="px-4 py-3 text-sm text-muted-foreground">{doc.type}</td>
                          <td className="px-4 py-3">
                            <span className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                              {doc.embeddingModel}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-muted-foreground">{doc.created_at || "Hoje"}</td>
                          <td className="px-4 py-3 text-right">
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); handleDelete(doc.id); }}
                              className="rounded-md p-1 px-2 text-red-500 font-bold opacity-0 transition hover:bg-red-500/10 group-hover:opacity-100"
                            >
                              Apagar
                            </button>
                            {doc.url && (
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); window.open(doc.url, '_blank'); }}
                                className="ml-2 rounded-md p-1 px-2 text-primary font-bold opacity-0 transition hover:bg-primary/10 group-hover:opacity-100"
                              >
                                Baixar (MinIO)
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between border-t border-border/80 px-4 py-3">
                <p className="text-sm text-muted-foreground">
                  Mostrando <span className="font-medium text-foreground">1</span> a{" "}
                  <span className="font-medium text-foreground">10</span> de{" "}
                  <span className="font-medium text-foreground">148</span> resultados
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground"
                    disabled
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition-colors hover:border-primary hover:text-primary"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </section>

          <aside className="hidden w-[360px] shrink-0 border-l border-border/80 bg-card/90 xl:flex xl:flex-col">
            {selectedDocument ? (
              <>
                <div className="flex items-start justify-between border-b border-border/80 p-5">
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">Detalhes do Arquivo</h3>
                    <p className="mt-1 text-xs text-muted-foreground">ID: {selectedDocument.id}</p>
                  </div>
                </div>

                <div className="scrollbar-thin flex-1 space-y-5 overflow-y-auto p-5">
                  <div className="flex flex-col items-center">
                    <div className="mb-3 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500/15 text-red-600">
                      <FileType className="h-8 w-8" />
                    </div>
                    <h4 className="w-full break-words text-center text-sm font-semibold text-foreground">
                      {selectedDocument.name}
                    </h4>
                    <div className="mt-2 flex gap-2">
                      <span className="rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">{selectedDocument.type}</span>
                      <span className="rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">{selectedDocument.size}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-xl border border-border/80 bg-muted/40 p-3">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Status</p>
                      <p className="mt-1 text-xs font-semibold text-emerald-600">Indexado</p>
                    </div>
                    <div className="rounded-xl border border-border/80 bg-muted/40 p-3">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Acesso</p>
                      <p className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-amber-600">
                        <Lock className="h-3 w-3" />
                        Confidencial
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Resumo (Gerado por IA)</p>
                    <p className="rounded-xl border border-border/80 bg-muted/40 p-3 text-sm leading-relaxed text-foreground">
                      Este documento descreve os protocolos de seguranca da informacao para 2024, incluindo MFA,
                      classificacao de dados e procedimentos de resposta a incidentes.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Chunks (Amostra)</p>
                    <div className="rounded-md border border-border/80 bg-card p-2 text-xs text-muted-foreground">
                      "Todos os funcionarios devem habilitar MFA em contas corporativas ate 30 de Junho..."
                    </div>
                    <div className="rounded-md border border-border/80 bg-card p-2 text-xs text-muted-foreground">
                      "Dados classificados como confidenciais nao devem ser armazenados em dispositivos pessoais..."
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex h-full items-center justify-center text-muted-foreground p-4 text-center text-sm">Nenhum documento selecionado</div>
            )}
          </aside>
        </div>
      </main>
    </div>
  );
};

export default DocumentManagement;
