# Backend - Document Intelligence API

This FastAPI service powers PDF upload, indexing, and question answering.

## Features
- Upload a PDF
- Extract text from pages
- Chunk and embed content
- Store embeddings in FAISS
- Ask natural-language questions about the document
- Return source snippets and page references

## Run locally
```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload
```

The API will run at `http://127.0.0.1:8000`.
