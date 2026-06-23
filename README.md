# MSA Compliance Automation

An automated Master Service Agreement (MSA) legal clause auditor. It extracts contract provisions using local Retrieval-Augmented Generation (RAG) and audits them against corporate policy criteria on macOS Apple Silicon hardware (using Apple MLX) or fallback simulated dry-run modes.

This project contains a high-fidelity **Next.js 15 App Router** frontend dashboard connected to a lightweight **FastAPI** backend endpoint suite.

---

## Key Features

*   **Dynamic Policy Modification:** Management UI to add, search, and edit active compliance rules directly inside the dashboard.
*   **Single Contract Auditing:** Drag-and-drop plain text (`.txt`) contracts to receive overall compliance ratings (circular radial meter) and rule breakdown cards.
*   **Batch Audits:** Dedicated matrix dashboard where users can queue multiple contracts, audit them sequentially to avoid local GPU VRAM contention, and view results in a premium data table.
*   **Parent-Child Retrieval Chunking:** Increases F1-score and Exact Match (EM) token overlap metrics by indexing smaller child fragments for precise retrieval and sending larger contextual parent paragraphs to the LLM.
*   **Apple Silicon MLX Acceleration:** Optimized for local GPU acceleration on Mac Unified Memory using quantized Qwen 2.5 instruct models.
*   **No Network Leakage:** Operates 100% locally. No external APIs or third-party cloud engines are used, ensuring absolute legal privacy.

---

## Directory Structure

```
MSA-Compliance-Automation/
├── backend/
│   ├── config/
│   │   └── rules.json          # Compliance policy rule definitions (Delaware Law, etc.)
│   ├── data/
│   │   ├── db/                 # Local persistent ChromaDB vector store
│   │   ├── processed/          # CUAD benchmark training/test dataset files
│   │   └── test_contracts/     # Mock contracts for manual verification testing
│   ├── src/
│   │   ├── chunker.py          # Custom recursive sliding-window chunker
│   │   ├── vector_store.py     # SentenceTransformers embedding generator & ChromaDB client
│   │   ├── compliance_engine.py# Central RAG orchestrator & local GPU model loader
│   │   └── main.py             # FastAPI REST endpoints
│   ├── evaluate_rag_performance.py # CUAD dataset benchmark evaluation script
│   └── test_compliance.py      # Console CLI test script
├── frontend/
│   ├── src/
│   │   ├── app/                # Layouts, globals styles, page components
│   │   ├── components/         # Premium glassmorphism UI components (Uploader, ScoreMeter)
│   │   ├── hooks/              # custom React state machine hook (useCompliance.ts)
│   │   └── utils/              # API REST client wrapper pointing to localhost:8000
│   └── README.md               # Frontend-specific execution guide
├── docs/
│   ├── pipeline_architecture.md# Layman analogy, Mermaid diagrams, & endpoint sequence maps
│   └── rag_optimization_guide.md# Model sizes, Parent-Child indexes, and validation sweeps
├── AGENTS.md                   # Strict styling and development instructions for coding agents
└── README.md                   # You are here (Monorepo Master Guide)
```

---

## Quick Start (Run Locally)

### Prerequisite
Ensure you have **Node.js 18+** and **Python 3.10+** installed.

### 1. Launch the Backend API
Navigate to the `backend/` directory:
```bash
cd backend
```

Create a virtual environment, activate it, and install Python modules:
```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

Launch the FastAPI dev server:
```bash
uvicorn src.main:app --reload --port 8000
```
*   The API server will launch at: **http://localhost:8000**
*   Interactive Swagger API docs: **http://localhost:8000/docs**

*(Note: The Qwen weights load lazily into RAM/VRAM on the first upload request, saving CPU/memory on initial start).*

### 2. Launch the Next.js Frontend
In a new terminal window, navigate to the `frontend/` directory:
```bash
cd frontend
```

Install Node modules (if not already done) and start the Next.js server:
```bash
npm install
npm run dev
```
*   The interface will launch at: **http://localhost:3000**
*   Dynamic navigation between **Single Audit** and **Batch Audit** is fully supported in the top header tabs.

### 3. Run RAG Performance Benchmarks (Optional)
To execute the pipeline benchmark script (`evaluate_rag_performance.py`), you will need the Contract Understanding Atticus Dataset (CUAD) v1 files. 

Because of their size, the dataset files are excluded from Git repository tracking (`backend/cuad_data/` is ignored). You can download the dataset directly from the official sources:
*   **Dataset Source**: Download the CUAD v1 dataset in `.txt` format from the official Hugging Face dataset repository: **[theatticusproject/cuad](https://huggingface.co/datasets/theatticusproject/cuad)**.
*   **Setup**: Extract the `.txt` contract files into `backend/cuad_data/CUAD_v1/full_contract_txt/` (maintaining the `Part_I` and `Part_II` subdirectories).

To run the benchmark:
```bash
# In backend/ directory with active venv:
python evaluate_rag_performance.py --samples 3
```

---

## In-Depth Documentation

For advanced details on implementation, architecture, and validation:
*   Read the **[Pipeline Architecture Deep-Dive](docs/pipeline_architecture.md)** to learn about the layman open-book analogy, modular API routing, and model cache lifecycles.
*   Read the **[RAG Optimization & Benchmarks Guide](docs/rag_optimization_guide.md)** to learn about Parent-Child vector maps, prompt verbatim constraints, and running parameter sweeps against the CUAD legal dataset.
