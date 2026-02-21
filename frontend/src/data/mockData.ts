import { AIResponse, SourceChunk } from '@/types/ai';

const sampleSources: SourceChunk[] = [
  {
    id: 'chunk-1',
    document: 'Supply Chain Policy v3.2.pdf',
    content: 'All brewery operations must maintain a minimum 14-day inventory buffer for raw materials including barley, hops, and water treatment chemicals...',
    similarity: 0.94,
    page: 12,
  },
  {
    id: 'chunk-2',
    document: 'Q4 2025 Operations Report.docx',
    content: 'The Leuven facility achieved 99.2% uptime in Q4, exceeding the 98.5% target. Key improvements included predictive maintenance on fermentation tanks...',
    similarity: 0.87,
    page: 8,
  },
  {
    id: 'chunk-3',
    document: 'Procurement Guidelines 2025.pdf',
    content: 'Vendor selection criteria must include sustainability scoring (min 70/100) and quality certification (ISO 22000 required for all ingredient suppliers)...',
    similarity: 0.81,
    page: 23,
  },
  {
    id: 'chunk-4',
    document: 'AB InBev Safety Standards.pdf',
    content: 'Monthly safety audits are mandatory for all production facilities. Results must be reported within 48 hours to regional safety coordinators...',
    similarity: 0.72,
    page: 5,
  },
];

export const sampleResponses: AIResponse[] = [
  {
    id: 'resp-1',
    question: 'What is the minimum inventory buffer required for brewery operations?',
    answer: 'According to the Supply Chain Policy v3.2, all brewery operations must maintain a **minimum 14-day inventory buffer** for raw materials including barley, hops, and water treatment chemicals. This policy was last updated in March 2025 and applies to all global facilities.\n\nThe Q4 2025 Operations Report also confirms that the Leuven facility maintained compliance with this policy while achieving 99.2% uptime.',
    sources: sampleSources.slice(0, 3),
    model: 'gpt-4-turbo',
    totalTokens: 1847,
    latencyMs: 2340,
    timestamp: new Date('2025-12-15T10:30:00'),
  },
  {
    id: 'resp-2',
    question: 'What are the vendor sustainability requirements?',
    answer: 'Vendor selection must include a **sustainability scoring of minimum 70/100** and quality certification. ISO 22000 is required for all ingredient suppliers. This is documented in the Procurement Guidelines 2025.',
    sources: sampleSources.slice(2, 4),
    model: 'gpt-4-turbo',
    totalTokens: 923,
    latencyMs: 1580,
    timestamp: new Date('2025-12-15T10:32:00'),
  },
];
