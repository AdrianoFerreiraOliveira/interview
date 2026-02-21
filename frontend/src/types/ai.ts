export interface SourceChunk {
  id: string;
  document: string;
  content: string;
  similarity: number;
  page?: number;
}

export interface AIResponse {
  id: string;
  question: string;
  answer: string;
  sources: SourceChunk[];
  model: string;
  totalTokens: number;
  latencyMs: number;
  timestamp: Date;
}

export interface AIConfig {
  temperature: number;
  systemPrompt: string;
  topK: number;
  model: string;
  embeddingModel?: string;
}
