# Backend RAG (Ollama + Qdrant + Langfuse)

## Endpoints

- `GET /health`
- `GET /models`
- `POST /ingest/document` (multipart com `file` e opcional `embedding_model`)
- `POST /query` (JSON com `query`, `model`, `top_k`, `embedding_model`, `temperature`)

## Exemplo rapido

```bash
curl -s http://localhost:8000/models
```

```bash
curl -s -X POST http://localhost:8000/ingest/document \
  -F "file=@/caminho/para/arquivo.pdf"
```

```bash
curl -s -X POST http://localhost:8000/query \
  -H "Content-Type: application/json" \
  -d '{"query":"Qual e o tema do PDF?","model":"llama3.1"}'
```
