import { useMemo, useState } from 'react'

const API_BASE = 'http://127.0.0.1:8000'
const SUGGESTED_QUESTIONS = [
  'What is the main purpose of this document?',
  'Summarize the key points in 5 bullets.',
  'What responsibilities or requirements are mentioned?',
  'Which sections are most important for a student applicant?',
]

export default function App() {
  const [file, setFile] = useState(null)
  const [documentInfo, setDocumentInfo] = useState(null)
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState('')
  const [citations, setCitations] = useState([])
  const [status, setStatus] = useState('Ready to upload a PDF.')
  const [loading, setLoading] = useState(false)
  const [topK, setTopK] = useState(4)

  const fileLabel = useMemo(() => {
    if (!file) return 'No PDF selected yet'
    const sizeMb = (file.size / (1024 * 1024)).toFixed(2)
    return `${file.name} • ${sizeMb} MB`
  }, [file])

  const handleUpload = async () => {
    if (!file) {
      setStatus('Please choose a PDF first.')
      return
    }

    const formData = new FormData()
    formData.append('file', file)

    try {
      setLoading(true)
      setStatus('Uploading and indexing PDF...')
      const response = await fetch(`${API_BASE}/upload`, {
        method: 'POST',
        body: formData,
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.detail || 'Upload failed.')
      setDocumentInfo(data)
      setStatus(`Indexed ${data.filename} successfully.`)
      setAnswer('')
      setCitations([])
    } catch (error) {
      setStatus(error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleAsk = async () => {
    if (!documentInfo?.document_id) {
      setStatus('Upload a PDF before asking a question.')
      return
    }
    if (!question.trim()) {
      setStatus('Please enter a question.')
      return
    }

    const formData = new FormData()
    formData.append('document_id', documentInfo.document_id)
    formData.append('question', question)
    formData.append('top_k', String(topK))

    try {
      setLoading(true)
      setStatus('Searching the document and generating answer...')
      const response = await fetch(`${API_BASE}/ask`, {
        method: 'POST',
        body: formData,
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.detail || 'Question answering failed.')
      setAnswer(data.answer)
      setCitations(data.citations || [])
      setStatus('Answer generated successfully.')
    } catch (error) {
      setStatus(error.message)
    } finally {
      setLoading(false)
    }
  }

  const resetSession = () => {
    setFile(null)
    setDocumentInfo(null)
    setQuestion('')
    setAnswer('')
    setCitations([])
    setTopK(4)
    setStatus('Session cleared. Upload a new PDF to continue.')
  }

  return (
    <div className="pageShell">
      <div className="backgroundGlow glowOne" />
      <div className="backgroundGlow glowTwo" />

      <main className="appShell">
        <section className="hero card">
          <div>
            <p className="eyebrow">Document Intelligence • RAG MVP</p>
            <h1>PDF Question Answering</h1>
            <p className="subtitle">
              Upload a PDF, index its content, and ask grounded questions with citation snippets.
            </p>
          </div>

          <div className="heroStats">
            <div className="statTile">
              <span className="statLabel">Backend</span>
              <strong>FastAPI</strong>
            </div>
            <div className="statTile">
              <span className="statLabel">Retrieval</span>
              <strong>FAISS</strong>
            </div>
            <div className="statTile">
              <span className="statLabel">Flow</span>
              <strong>Upload → Ask</strong>
            </div>
          </div>
        </section>

        <section className="contentGrid">
          <div className="mainColumn">
            <section className="card panel">
              <div className="sectionHeader">
                <div>
                  <p className="sectionTag">Step 1</p>
                  <h2>Upload and index a PDF</h2>
                </div>
                <button className="ghostButton" onClick={resetSession} disabled={loading}>
                  Reset
                </button>
              </div>

              <label className="uploadZone">
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                />
                <span className="uploadTitle">Choose PDF</span>
                <span className="uploadSubtext">Select one document to index and query.</span>
                <span className="uploadFile">{fileLabel}</span>
              </label>

              <div className="actionRow">
                <button className="primaryButton" onClick={handleUpload} disabled={loading}>
                  {loading ? 'Working...' : 'Upload & Index'}
                </button>
              </div>

              {documentInfo && (
                <div className="infoCard successCard">
                  <div>
                    <p className="infoLabel">Indexed file</p>
                    <strong>{documentInfo.filename}</strong>
                  </div>
                  <div className="infoMeta">
                    <span>{documentInfo.pages_indexed} pages indexed</span>
                    <span className="monoText">ID: {documentInfo.document_id}</span>
                  </div>
                </div>
              )}
            </section>

            <section className="card panel">
              <div className="sectionHeader">
                <div>
                  <p className="sectionTag">Step 2</p>
                  <h2>Ask grounded questions</h2>
                </div>
              </div>

              <div className="promptChips">
                {SUGGESTED_QUESTIONS.map((item) => (
                  <button
                    key={item}
                    className="chip"
                    type="button"
                    onClick={() => setQuestion(item)}
                  >
                    {item}
                  </button>
                ))}
              </div>

              <textarea
                rows="6"
                placeholder="Ask something about the uploaded PDF..."
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
              />

              <div className="sliderRow">
                <label htmlFor="topk">Retrieved chunks: <strong>{topK}</strong></label>
                <input
                  id="topk"
                  type="range"
                  min="1"
                  max="8"
                  value={topK}
                  onChange={(e) => setTopK(Number(e.target.value))}
                />
              </div>

              <div className="actionRow">
                <button className="primaryButton" onClick={handleAsk} disabled={loading}>
                  {loading ? 'Working...' : 'Ask Document'}
                </button>
              </div>

              <div className="statusBanner">{status}</div>
            </section>

            {(answer || citations.length > 0) && (
              <section className="card panel answerPanel">
                <div className="sectionHeader compactHeader">
                  <div>
                    <p className="sectionTag">Result</p>
                    <h2>Answer</h2>
                  </div>
                </div>

                <div className="answerBox">
                  <p className="answerText">{answer}</p>
                </div>

                {citations.length > 0 && (
                  <div className="sourcesSection">
                    <h3>Source snippets</h3>
                    <div className="sourcesGrid">
                      {citations.map((item, index) => (
                        <article key={`${item.page}-${index}`} className="sourceCard">
                          <span className="sourceBadge">Page {item.page}</span>
                          <p>{item.snippet}...</p>
                        </article>
                      ))}
                    </div>
                  </div>
                )}
              </section>
            )}
          </div>

          <aside className="sideColumn">
            <section className="card sidePanel">
              <p className="sectionTag">Workflow</p>
              <h3>How to test</h3>
              <ol className="stepsList">
                <li>Select a PDF file.</li>
                <li>Click <strong>Upload & Index</strong>.</li>
                <li>Wait for the document ID and page count.</li>
                <li>Ask a question and review the answer.</li>
              </ol>
            </section>

            <section className="card sidePanel">
              <p className="sectionTag">Tech stack</p>
              <div className="techList">
                <span>React</span>
                <span>FastAPI</span>
                <span>LangChain</span>
                <span>FAISS</span>
                <span>OpenAI API</span>
                <span>PyPDF</span>
              </div>
            </section>

            <section className="card sidePanel">
              <p className="sectionTag">Note</p>
              <p className="sideText">
                Keep your real API key in a local <code>.env</code> file or OS environment variable.
                Do not commit secrets to GitHub.
              </p>
            </section>
          </aside>
        </section>
      </main>
    </div>
  )
}
