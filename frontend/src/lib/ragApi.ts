export type OllamaModel = {
  name?: string;
  model?: string;
  digest?: string;
  modified_at?: string;
  size?: number;
  details?: {
    format?: string;
    family?: string;
    families?: string[];
    parameter_size?: string;
    quantization_level?: string;
  };
};

export type QueryRequest = {
  query: string;
  model: string;
  top_k: number;
  embedding_model?: string;
  temperature: number;
};

export type QueryContextItem = {
  text: string;
  document_id?: string;
  document_name?: string;
  page?: number;
  score?: number;
};

export type ComplianceInfo = {
  is_blocked: boolean;
  detected_topic: string;
  reasoning: string;
};

export type QueryResponse = {
  answer: string;
  context: QueryContextItem[];
  compliance_blocked: boolean;
  compliance_info?: ComplianceInfo;
};

export type IngestResponse = {
  document_id: string;
  document_name: string;
  chunks_indexed: number;
  embedding_model: string;
};

export type GuardrailConfigData = {
  enabled: boolean;
  blocked_topics: string[];
  compliance_message: string;
  guardrail_model: string;
};

export type ComplianceCheckResponse = {
  is_blocked: boolean;
  detected_topic: string;
  reasoning: string;
};

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

const fetchJson = async <T>(url: string, options?: RequestInit): Promise<T> => {
  const response = await fetch(url, options);
  if (!response.ok) {
    let detail = `${response.status} ${response.statusText}`;
    try {
      const payload = await response.json();
      if (payload?.detail) {
        detail = String(payload.detail);
      }
    } catch {
      try {
        const text = await response.text();
        if (text) detail = text;
      } catch {
        // ignore
      }
    }
    throw new Error(detail);
  }
  return response.json() as Promise<T>;
};

export const listModels = async (): Promise<OllamaModel[]> =>
  fetchJson<OllamaModel[]>(`${API_BASE_URL}/models`);

export const ingestPdf = async (
  file: File,
  embeddingModel?: string
): Promise<IngestResponse> => {
  const form = new FormData();
  form.append("file", file);
  if (embeddingModel) {
    form.append("embedding_model", embeddingModel);
  }
  return fetchJson<IngestResponse>(`${API_BASE_URL}/ingest/document`, {
    method: "POST",
    body: form,
  });
};

export const queryRag = async (payload: QueryRequest): Promise<QueryResponse> =>
  fetchJson<QueryResponse>(`${API_BASE_URL}/query`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

// ---- Guardrails API ----

export const getGuardrailsConfig = async (): Promise<GuardrailConfigData> =>
  fetchJson<GuardrailConfigData>(`${API_BASE_URL}/guardrails/config`);

export const updateGuardrailsConfig = async (
  config: Partial<GuardrailConfigData>
): Promise<GuardrailConfigData> =>
  fetchJson<GuardrailConfigData>(`${API_BASE_URL}/guardrails/config`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(config),
  });

export const checkCompliance = async (
  query: string
): Promise<ComplianceCheckResponse> =>
  fetchJson<ComplianceCheckResponse>(`${API_BASE_URL}/guardrails/check`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });

// ---- Prompts Config API ----

export type PromptConfigData = {
  version: string;
  description: string;
  last_updated: string;
  system_prompt: string;
  rag_prompt_template: string;
  compliance_prompt: string;
  hallucination_guard: string;
  ambiguity_handler: string;
  response_format_instructions: string;
  blocked_topics_list: string[];
};

export const getPromptsConfig = async (): Promise<PromptConfigData> =>
  fetchJson<PromptConfigData>(`${API_BASE_URL}/prompts/config`);

export const updatePromptsConfig = async (
  config: Partial<PromptConfigData>
): Promise<PromptConfigData> =>
  fetchJson<PromptConfigData>(`${API_BASE_URL}/prompts/config`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(config),
  });

export const resetPromptsConfig = async (): Promise<PromptConfigData> =>
  fetchJson<PromptConfigData>(`${API_BASE_URL}/prompts/config/reset`, {
    method: "POST",
  });
