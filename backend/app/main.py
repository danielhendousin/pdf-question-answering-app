from __future__ import annotations

import os
import shutil
import uuid
from pathlib import Path
from typing import Dict, List

from dotenv import load_dotenv
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import FAISS
from langchain_core.documents import Document
from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from pypdf import PdfReader

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
UPLOAD_DIR = DATA_DIR / "uploads"
INDEX_DIR = DATA_DIR / "indexes"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
INDEX_DIR.mkdir(parents=True, exist_ok=True)

app = FastAPI(title="Document Intelligence API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DOCUMENTS: Dict[str, Dict[str, str]] = {}


def get_embeddings() -> OpenAIEmbeddings:
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="OPENAI_API_KEY is missing.")
    return OpenAIEmbeddings(
        api_key=api_key,
        model=os.getenv("EMBEDDING_MODEL", "text-embedding-3-small"),
    )


def get_chat_model() -> ChatOpenAI:
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="OPENAI_API_KEY is missing.")
    return ChatOpenAI(
        api_key=api_key,
        model=os.getenv("CHAT_MODEL", "gpt-4o-mini"),
        temperature=0,
    )


def extract_pdf_text(pdf_path: Path) -> List[Document]:
    reader = PdfReader(str(pdf_path))
    pages: List[Document] = []
    for idx, page in enumerate(reader.pages, start=1):
        text = page.extract_text() or ""
        cleaned = text.strip()
        if cleaned:
            pages.append(
                Document(
                    page_content=cleaned,
                    metadata={"page": idx, "source": pdf_path.name},
                )
            )
    if not pages:
        raise HTTPException(status_code=400, detail="No readable text found in the PDF.")
    return pages


def build_vectorstore(docs: List[Document], document_id: str) -> Path:
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=900,
        chunk_overlap=150,
        separators=["\n\n", "\n", ". ", " ", ""],
    )
    chunks = splitter.split_documents(docs)
    vectorstore = FAISS.from_documents(chunks, get_embeddings())
    save_path = INDEX_DIR / document_id
    if save_path.exists():
        shutil.rmtree(save_path)
    vectorstore.save_local(str(save_path))
    return save_path


def load_vectorstore(document_id: str) -> FAISS:
    info = DOCUMENTS.get(document_id)
    if not info:
        raise HTTPException(status_code=404, detail="Document not found.")
    index_path = Path(info["index_path"])
    if not index_path.exists():
        raise HTTPException(status_code=404, detail="Index not found.")
    return FAISS.load_local(
        str(index_path),
        get_embeddings(),
        allow_dangerous_deserialization=True,
    )


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


@app.post("/upload")
async def upload_pdf(file: UploadFile = File(...)) -> dict:
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Please upload a PDF file.")

    document_id = str(uuid.uuid4())
    filename = f"{document_id}_{file.filename}"
    file_path = UPLOAD_DIR / filename

    with file_path.open("wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    docs = extract_pdf_text(file_path)
    index_path = build_vectorstore(docs, document_id)
    DOCUMENTS[document_id] = {
        "filename": file.filename,
        "path": str(file_path),
        "index_path": str(index_path),
    }

    return {
        "document_id": document_id,
        "filename": file.filename,
        "pages_indexed": len(docs),
        "message": "PDF uploaded and indexed successfully.",
    }


@app.post("/ask")
def ask_question(document_id: str = Form(...), question: str = Form(...), top_k: int = Form(4)) -> dict:
    if not question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty.")

    vectorstore = load_vectorstore(document_id)
    retriever = vectorstore.as_retriever(search_kwargs={"k": max(1, min(top_k, 8))})
    docs = retriever.invoke(question)
    if not docs:
        raise HTTPException(status_code=404, detail="No relevant context found.")

    context_blocks = []
    citations = []
    for idx, doc in enumerate(docs, start=1):
        page = doc.metadata.get("page", "?")
        source = doc.metadata.get("source", "document")
        citations.append({"page": page, "source": source, "snippet": doc.page_content[:220]})
        context_blocks.append(f"[Chunk {idx} | Page {page}]\n{doc.page_content}")

    prompt = f"""
You are a precise document question-answering assistant.
Answer only from the provided context. If the context is insufficient, say so clearly.
When useful, mention page numbers. Keep the answer concise but helpful.

Question:
{question}

Context:
{'\n\n'.join(context_blocks)}
""".strip()

    llm = get_chat_model()
    response = llm.invoke(prompt)

    return {
        "answer": response.content,
        "citations": citations,
        "chunks_used": len(docs),
    }
