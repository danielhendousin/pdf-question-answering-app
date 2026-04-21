# Document Intelligence Web App for PDF Question Answering

A portfolio-ready project that lets users upload a PDF, index the content with embeddings, and ask grounded questions about the document.

## Why this project is strong
- Combines **AI + web development + information retrieval**
- Demonstrates an end-to-end **RAG workflow**
- Fits graduate applications in **AI, software engineering, web/data science, and information systems**

## Features
- PDF upload
- Automatic text extraction and chunking
- Embedding generation with OpenAI
- Vector search with FAISS
- Grounded answers using retrieved document chunks
- Source snippets with page references

## Tech Stack
### Frontend
- React + Vite

### Backend
- FastAPI
- LangChain
- OpenAI API
- FAISS
- PyPDF

## Project Structure
```bash
pdf_rag_app/
├── backend/
│   ├── app/
│   │   └── main.py
│   ├── requirements.txt
│   ├── .env.example
│   └── README.md
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── styles.css
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
└── README.md
```

## How to Run
### Backend
```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
# add your OPENAI_API_KEY in .env
uvicorn app.main:app --reload
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

Then open the local frontend URL shown by Vite.

## Suggested CV entry
**Document Intelligence Web App for PDF Question Answering**
- Built a full-stack application for document-grounded question answering over uploaded PDFs
- Implemented PDF parsing, chunking, embeddings, and vector retrieval using FastAPI, LangChain, and FAISS
- Integrated an LLM-based answer generation pipeline with source-aware responses and page-level evidence
- Designed a React frontend to support upload, indexing, and interactive question answering

## Future Improvements
- Better UI and chat layout
- Persistent database for multiple users
- OCR support for scanned PDFs
- Authentication and deployment
