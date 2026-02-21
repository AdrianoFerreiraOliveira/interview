# Explainable AI Assistant (RAG + Guardrails)

Projeto completo explicado aqui:
https://youtu.be/05B3wrmGbW4

Projeto full stack para assistente interno com RAG (Retrieval Augmented Generation), guardrails de compliance e engenharia de prompts editavel pela UI.

Stack principal:
- Frontend: React + TypeScript + Vite + TanStack Query + Tailwind + shadcn/ui
- Backend: FastAPI + Qdrant + Ollama + LangChain + Langfuse
- Infra local: Docker Compose (Qdrant, Ollama, Langfuse e dependencias)

## 1. Visao Geral

O sistema permite:
- Ingestao de documentos (`.pdf`, `.txt`, `.md`) no banco vetorial (Qdrant)
- Consulta RAG com modelos Ollama
- Controle de parametros de inferencia (modelo, temperature, top-k, embedding model)
- Guardrails de compliance com duas camadas (pre-check por palavras-chave + classificacao LLM via OpenAI Agents SDK, quando `OPENAI_API_KEY` estiver definido)
- Edicao dos prompts de sistema/RAG/compliance pela interface
- Observabilidade de traces e generations no Langfuse

## 2. Arquitetura

Fluxo de consulta:
1. Usuario envia pergunta pelo frontend.
2. Backend roda `check_compliance`.
3. Se bloqueado, retorna mensagem de compliance sem chamar o pipeline RAG.
4. Se permitido, backend gera embedding da query (Ollama).
5. Backend consulta Qdrant filtrando por `embedding_model`.
6. Backend monta prompt final usando `PromptStore`.
7. Backend chama Ollama LLM para gerar resposta.
8. Retorna resposta + contexto recuperado.

Componentes:
- `frontend`: UI com abas Assistant, Guardrails e Prompts
- `backend/app/main.py`: API FastAPI e orquestracao do pipeline
- `backend/app/rag.py`: ingestao, split e indexacao vetorial
- `backend/app/guardrails.py`: compliance (keyword + agente LLM)
- `backend/app/prompt_store.py`: persistencia de prompts em JSON
- `frontend/docker-compose.yml`: stack de servicos auxiliares

## 3. Estrutura do Repositorio

```text
chat/
|-- backend/
|   |-- app/
|   |   |-- main.py
|   |   |-- rag.py
|   |   |-- guardrails.py
|   |   |-- prompt_store.py
|   |   |-- compliance_store.py
|   |-- requirements.txt
|   |-- .env.example
|   `-- prompts_config.json
|-- frontend/
|   |-- src/
|   |   |-- components/
|   |   |-- lib/ragApi.ts
|   |   `-- pages/Index.tsx
|   |-- package.json
|   `-- docker-compose.yml
|-- debug_models.py
`-- README.md
```

## 4. Pre-requisitos

- Python 3.11+
- Node.js 18+ (ideal 20+)
- npm
- Docker + Docker Compose (opcional, mas recomendado para stack completa)

## 5. Configuracao de Ambiente

### Backend (`backend/.env`)

Use `backend/.env.example` como base.

Variaveis mais importantes:
- `OLLAMA_BASE_URL` (padrao docker: `http://ollama:11434`)
- `QDRANT_URL` (padrao docker: `http://qdrant:6333`)
- `QDRANT_COLLECTION` (padrao: `rag_documents`)
- `EMBEDDING_MODEL` (padrao: `nomic-embed-text`)
- `LANGFUSE_*` para tracing
- `CORS_ORIGINS` (use `http://localhost:8080` no dev frontend)
- `OPENAI_API_KEY` (opcional, mas necessario para guardrail LLM)

### Frontend (`frontend/.env` opcional)

Se necessario, configure:

```bash
VITE_API_BASE_URL=http://localhost:8000
```

Se nao definir, o frontend usa esse mesmo valor por padrao.

## 6. Executando Localmente (sem Docker para frontend)

Importante:
- O backend precisa de Ollama e Qdrant ativos (local ou via Docker).
- Se estiver usando os servicos do compose, configure o backend local para usar `localhost` (exemplo: `OLLAMA_BASE_URL=http://localhost:11434` e `QDRANT_URL=http://localhost:6333`).

### 6.1 Backend

```bash
cd backend
python -m venv venv
# Windows:
venv\Scripts\activate
# Linux/macOS:
# source venv/bin/activate

pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

API em: `http://localhost:8000`

### 6.2 Frontend

```bash
cd frontend
npm install
npm run dev
```

UI em: `http://localhost:8080`

## 7. Executando com Docker Compose (servicos de infra)

O arquivo de compose esta em `frontend/docker-compose.yml` e sobe:
- backend
- qdrant
- ollama
- langfuse (web + worker + dependencias)

### 7.1 Subir stack

```bash
docker compose -f frontend/docker-compose.yml up --build
```

### 7.2 Baixar modelos no Ollama

Depois de subir os containers:

```bash
docker compose -f frontend/docker-compose.yml exec ollama ollama pull llama3.1
docker compose -f frontend/docker-compose.yml exec ollama ollama pull nomic-embed-text
```

### 7.3 Subir frontend local

```bash
cd frontend
npm install
npm run dev
```

## 8. Endpoints do Backend

Health e modelos:
- `GET /health`
- `GET /models`

Guardrails:
- `GET /guardrails/config`
- `PUT /guardrails/config`
- `POST /guardrails/check`

Prompts:
- `GET /prompts/config`
- `PUT /prompts/config`
- `POST /prompts/config/reset`

RAG:
- `POST /ingest/document` (multipart: `file` + opcional `embedding_model`)
- `POST /query`

### 8.1 Exemplos `curl`

Listar modelos:

```bash
curl -s http://localhost:8000/models
```

Ingerir documento:

```bash
curl -s -X POST http://localhost:8000/ingest/document \
  -F "file=@/caminho/arquivo.pdf"
```

Consultar RAG:

```bash
curl -s -X POST http://localhost:8000/query \
  -H "Content-Type: application/json" \
  -d '{
    "query":"Qual e o tema principal do documento?",
    "model":"llama3.1",
    "top_k":5,
    "temperature":0.2
  }'
```

## 9. Interface Web

Abas principais:
- `Assistant`: chat RAG com exibicao de fontes e score
- `Guardrails`: liga/desliga compliance, edita topicos bloqueados e testa query
- `Prompts`: edita secoes de prompt e persiste em `backend/prompts_config.json`

Painel lateral:
- Seleciona modelo de geracao
- Seleciona embedding model
- Faz upload e indexacao de PDF
- Ajusta `temperature` e `top_k`

## 10. Guardrails de Compliance

Comportamento atual:
- Se `enabled=false`, nenhuma query e bloqueada.
- Se `enabled=true`, roda primeiro keyword pre-check.
- Sem `OPENAI_API_KEY`, fica apenas no pre-check por palavras-chave.
- Com `OPENAI_API_KEY`, usa OpenAI Agents SDK para classificacao adicional.
- Quando bloqueada, a resposta vem com `compliance_blocked=true` e mensagem configuravel.

## 11. Prompts e Persistencia

Arquivo de configuracao:
- `backend/prompts_config.json`

Store:
- `backend/app/prompt_store.py`

O backend combina:
- `hallucination_guard`
- `ambiguity_handler`
- `response_format_instructions`
- `rag_prompt_template`

Isso forma o prompt final enviado ao modelo de geracao.

## 12. Observabilidade (Langfuse)

Se as chaves/langfuse host estiverem configurados:
- ingest cria trace `ingest_document`
- query cria trace `rag_query`
- geracao cria observation `ollama_generate`

## 13. Testes

Frontend:

```bash
cd frontend
npm run test
```

Atualmente existe teste base em `frontend/src/test/example.test.ts`.

Backend:
- Nao ha suite de testes automatizados no repositorio neste momento.

## 14. Troubleshooting

`Erro ao carregar modelos do Ollama`:
- Verifique se Ollama esta ativo e acessivel em `OLLAMA_BASE_URL`.
- Confirme se existe pelo menos um modelo baixado (`ollama pull ...`).

`Falha no upload/indexacao`:
- Tipos aceitos no backend: `.pdf`, `.txt`, `.md`.
- Verifique se o arquivo nao esta vazio.

`Query sem contexto relevante`:
- Confirme se o documento foi ingerido.
- Use o mesmo `embedding_model` na ingestao e na consulta.

`CORS no frontend`:
- Ajuste `CORS_ORIGINS` no backend para incluir `http://localhost:8080`.

`OPENAI_API_KEY nao configurada`:
- Guardrail LLM fica desativado e apenas o pre-check por palavras-chave sera aplicado.

`ModuleNotFoundError` para libs `langchain_*`:
- Instale as dependencias ausentes no ambiente do backend.
- Exemplo comum: `langchain-community`, `langchain-text-splitters`, `langchain-core`, `langchain-qdrant`, `langchain-ollama`.

## 15. Scripts uteis

- `debug_models.py`: script simples para validar `GET /models`.

---


