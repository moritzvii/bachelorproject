<!-- PROJECT LOGO -->
<br />
<div align="center">
  <img src="frontend/public/vite.svg" alt="Logo" width="80" height="80">
  <h1 align="center">HI Decision Support</h1>
  <p align="center">
    Hybrid Intelligence Decision Support system.
    <br />
    React workflow frontend with a FastAPI backend for evidence scoring and NLI stages.
  </p>
</div>

<!-- TABLE OF CONTENTS -->
<details>
  <summary>Table of Contents</summary>
  <ol>
    <li><a href="#overview">Overview</a></li>
    <li><a href="#built-with">Built With</a></li>
    <li><a href="#workflow-screenshots">Workflow screenshots</a></li>
    <li><a href="#frontend">Frontend</a></li>
    <li><a href="#backend">Backend</a></li>
    <li><a href="#additional-docs">Additional docs</a></li>
  </ol>
</details>

---

## Overview

The system pairs a multi-step frontend workflow with a FastAPI backend that manages strategy stages, evidence scoring, and NLI outputs.

## Built With

### Frontend

- [![React][React-badge]][React-url]
- [![Vite][Vite-badge]][Vite-url]
- [![TypeScript][TypeScript-badge]][TypeScript-url]
- [![Tailwind][Tailwind-badge]][Tailwind-url]
- [![Radix][Radix-badge]][Radix-url]
- <a href="https://shadcn.io/" style="text-decoration: none; display: inline-block; padding: 4px 0;"><span style="display: inline-flex; align-items: center; height: 28px; border-radius: 0; overflow: hidden; font-size: 11px; font-weight: 500; letter-spacing: 0.4px; text-transform: uppercase; font-family: Verdana, 'DejaVu Sans', Arial, sans-serif; box-sizing: border-box;"><span style="display: inline-flex; align-items: center; gap: 6px; height: 28px; padding: 0 8px; background: #fff; color: #000;"><span style="display: inline-flex; align-items: center; justify-content: center; width: 16px; height: 16px; background: #fff; border-radius: 0;"><img src="frontend/public/img_1.png" alt="Logo" height="12" style="display: block;" /></span>Component Library</span><span style="display: inline-flex; align-items: center; height: 28px; padding: 0 10px; background: #000; color: #fff; font-weight: 700;">shadcn/ui</span></span></a>
- <a href="https://www.shadcn.io/" style="text-decoration: none; display: inline-block; padding: 4px 0;"><span style="display: inline-flex; align-items: center; height: 28px; border-radius: 0; overflow: hidden; font-size: 11px; font-weight: 500; letter-spacing: 0.4px; text-transform: uppercase; font-family: Verdana, 'DejaVu Sans', Arial, sans-serif; box-sizing: border-box;"><span style="display: inline-flex; align-items: center; gap: 6px; height: 28px; padding: 0 8px; background: #fff; color: #000;"><span style="display: inline-flex; align-items: center; justify-content: center; width: 16px; height: 16px; background: #000; border-radius: 0;"><img src="frontend/public/img_2.png" alt="Logo" height="12" style="display: block;" /></span>Component Library</span><span style="display: inline-flex; align-items: center; height: 28px; padding: 0 10px; background: #000; color: #fff; font-weight: 700;">shadcn.io</span></span></a>
- [![Lucide][Lucide-badge]][Lucide-url]
- [![Recharts][Recharts-badge]][Recharts-url]
- [![PDFjs][PDFjs-badge]][PDFjs-url]
- [![ReactRouter][ReactRouter-badge]][ReactRouter-url]

### Backend

- [![Python][Python-badge]][Python-url]
- [![FastAPI][FastAPI-badge]][FastAPI-url]
- [![FAISS][FAISS-badge]][FAISS-url]
- [![NumPy][NumPy-badge]][NumPy-url]
- [![Pandas][Pandas-badge]][Pandas-url]
- [![PyTorch][PyTorch-badge]][PyTorch-url]
- [![Transformers][Transformers-badge]][Transformers-url]
- [![NLI Model][NLI-badge]][NLI-url]
- <a href="https://platform.openai.com/" style="text-decoration: none;"><span style="display: inline-flex; align-items: center; height: 28px; border-radius: 0; overflow: hidden; font-size: 11px; font-weight: 500; letter-spacing: 0.4px; text-transform: uppercase; font-family: Verdana, 'DejaVu Sans', Arial, sans-serif; box-sizing: border-box;"><span style="display: inline-flex; align-items: center; gap: 6px; height: 28px; padding: 0 8px; background: #fff; color: #000;"><span style="display: inline-flex; align-items: center; justify-content: center; width: 16px; height: 16px; background: #fff; border-radius: 0;"><img src="frontend/public/img.png" alt="Logo" height="12" style="display: block;" /></span>Embedding Model</span><span style="display: inline-flex; align-items: center; height: 28px; padding: 0 10px; background: #10a37f; color: #fff; font-weight: 700;">text-embedding-3-small</span></span></a>

## Workflow screenshots

### Step 1 - Strategic Plan

Define the strategic intent, segment, and region, or select a predefined plan.

![Strategic Plan](frontend/public/screenshots/1.png)

### Step 2 - Evidence Selection

Curate the knowledgebase by including or excluding evidence, with score guidance.

![Evidence Selection](frontend/public/screenshots/2.png)

### Step 3 - Evidence Reasoning

Adjust alignment and stability sliders to reflect the evidence signal.

![Evidence Reasoning](frontend/public/screenshots/3.png)

### Step 4 - Evidence Positioning

Place evidence in the GE-McKinsey matrix and refine the final position.

![Evidence Positioning](frontend/public/screenshots/4.png)

### Step 5 - Recommendation Dashboard

Review strategic insights and the evidence foundation behind the recommendation.

![Recommendation Dashboard](frontend/public/screenshots/5.png)

### Feature detail

Source document viewer for evidence traceability and report inspection.

![Source Document Viewer](frontend/public/screenshots/6.png)

## Frontend

React + Vite frontend for the Hybrid Intelligence Decision Support system.
Focus: multi-step evaluation workflow, evidence curation, and visualization.

### Local run

Requirement: Node.js >= 18

```bash
npm install
npm run dev
```

### Project structure

```text
.
|-- public/              # static assets
|-- src/
|   |-- main.tsx         # React root, router, providers
|   |-- router/          # route definitions
|   |-- pages/           # screen-level routes
|   |-- layouts/         # app layout shells
|   |-- components/      # shared UI components
|   |-- features/        # workflow features (charts, selection, pdf)
|   |-- data/            # datasets and matrix presets
|   |-- lib/             # API client, helpers
|   |-- hooks/           # UI hooks
|   |-- styles/          # Tailwind entrypoint
|   `-- types/           # type declarations
|-- index.html
|-- package.json
|-- vite.config.ts
|-- tailwind.config.js
|-- tsconfig*.json
`-- vercel.json
```

Each top-level folder represents a system responsibility.

### Architecture

#### Workflow view

<pre style="font-family: Consolas, Menlo, Monaco, 'Courier New', monospace; line-height: 1.35;">
+====================================================================+
||......................:: <span style="color:#9ECE6A;">1-Strategic Plan</span> ::......................||
||                                                                  ||
||                        <span style="background-color: rgba(110,118,129,0.25); border-radius: 4px; box-shadow: 0 0 0 3px rgba(110,118,129,0.25); display: inline-block; color:#E6EDF3;">strategic-plan.tsx</span>                        ||
||                                                                  ||
+====================================================================+
                                   <span style="font-size: 2em; line-height: 1; display: inline-block;">&darr;</span>
+====================================================================+
||....................:: <span style="color:#BB9AF7;">2-Evidence Selection</span> ::....................||
||                                                                  ||
||     <span style="background-color: rgba(110,118,129,0.25); border-radius: 4px; box-shadow: 0 0 0 3px rgba(110,118,129,0.25); display: inline-block; color:#E6EDF3;">evidence-selection-loading.tsx</span> &rarr; <span style="background-color: rgba(110,118,129,0.25); border-radius: 4px; box-shadow: 0 0 0 3px rgba(110,118,129,0.25); display: inline-block; color:#E6EDF3;">evidence-selection.tsx</span>      ||
||                                                                  ||
+====================================================================+
                                   <span style="font-size: 2em; line-height: 1; display: inline-block;">&darr;</span>
+====================================================================+
||....................:: <span style="color:#7DCFFF;">3-Evidence Reasoning</span> ::....................||
||                                                                  ||
||                      <span style="background-color: rgba(110,118,129,0.25); border-radius: 4px; box-shadow: 0 0 0 3px rgba(110,118,129,0.25); display: inline-block; color:#E6EDF3;">evidence-reasoning.tsx</span>                      ||
||                                                                  ||
+====================================================================+
                                   <span style="font-size: 2em; line-height: 1; display: inline-block;">&darr;</span>
+====================================================================+
||...................:: <span style="color:#2AC3DE;">4-Evidence Positioning</span> ::...................||
||                                                                  ||
||   <span style="background-color: rgba(110,118,129,0.25); border-radius: 4px; box-shadow: 0 0 0 3px rgba(110,118,129,0.25); display: inline-block; color:#E6EDF3;">evidence-positioning-loading.tsx</span> &rarr; <span style="background-color: rgba(110,118,129,0.25); border-radius: 4px; box-shadow: 0 0 0 3px rgba(110,118,129,0.25); display: inline-block; color:#E6EDF3;">evidence-positioning.tsx</span>    ||
||                                                                  ||
+====================================================================+
                                   <span style="font-size: 2em; line-height: 1; display: inline-block;">&darr;</span>
+====================================================================+
||.................:: <span style="color:#FF9E64;">5-Recommendation Dashboard</span> ::.................||
||                                                                  ||
||                   <span style="background-color: rgba(110,118,129,0.25); border-radius: 4px; box-shadow: 0 0 0 3px rgba(110,118,129,0.25); display: inline-block; color:#E6EDF3;">recommendation-dashboard.tsx</span>                   ||
||                                                                  ||
+====================================================================+
</pre>

### API

App entry point:

```text
http://127.0.0.1:5173
```

Examples:

```bash
http://127.0.0.1:5173/login
http://127.0.0.1:5173/strategic-plan
http://127.0.0.1:5173/dashboard
```

## Backend

FastAPI backend for the Hybrid Intelligence Decision Support system.
Focus: orchestrating strategy workflows, NLI stages, and scoring via HTTP.

### Local run

Requirement: Python >= 3.12

```bash
python -m venv .venv
source .venv/bin/activate

python -m pip install --upgrade pip poetry
poetry install

poetry run serve
```

### Project structure

```text
.
|-- app/
|   |-- __main__.py        # uvicorn entry point
|   |-- main.py            # app factory, CORS, health
|   |-- api/               # HTTP routes (v1)
|   |-- modules/           # hybrid services and schemas
|   |-- pipelines/         # NLI stage scripts
|   |-- infrastructure/    # paths, persistence, presets
|   |-- config/            # settings
|   |-- scripts/           # CLI helpers
|   `-- data/              # default data/workdir root
|-- pyproject.toml
|-- poetry.lock
|-- pytest.ini
`-- README.md
```

Each top-level folder represents a system responsibility.

### Architecture

#### Stages view

<pre style="font-family: Consolas, Menlo, Monaco, 'Courier New', monospace; line-height: 1.35;">
+====================================================================+
||..................:: <span style="color:#FFD866;">Preprocessing artifacts</span> ::...................||
+====================================================================+
                                   <span style="font-size: 2em; line-height: 1; display: inline-block;">&darr;</span>
+====================================================================+
||........................:: <span style="color:#7AA2F7;">2-Hypothesen</span> ::........................||
||                                                                  ||
||                      <span style="background-color: rgba(110,118,129,0.25); border-radius: 4px; box-shadow: 0 0 0 3px rgba(110,118,129,0.25); display: inline-block; color:#E6EDF3;">strategy_hypotheses.py</span>                      ||
||                                                                  ||
+====================================================================+
                                   <span style="font-size: 2em; line-height: 1; display: inline-block;">&darr;</span>
+====================================================================+
||........................:: <span style="color:#9ECE6A;">3-Embeddings</span> ::........................||
||                                                                  ||
||                 <span style="background-color: rgba(61,90,254,0.25); border-radius: 4px; box-shadow: 0 0 0 3px rgba(61,90,254,0.25); display: inline-block; color:#A9B1D6; font-weight:600;">forecast-reports</span> | <span style="background-color: rgba(61,90,254,0.25); border-radius: 4px; box-shadow: 0 0 0 3px rgba(61,90,254,0.25); display: inline-block; color:#A9B1D6; font-weight:600;">risk-reports</span>                  ||
||                                                                  ||
+====================================================================+
                                   <span style="font-size: 2em; line-height: 1; display: inline-block;">&darr;</span>
+====================================================================+
||.......................:: <span style="color:#BB9AF7;">4-PremisePairs</span> ::.......................||
||                                                                  ||
||                 <span style="background-color: rgba(61,90,254,0.25); border-radius: 4px; box-shadow: 0 0 0 3px rgba(61,90,254,0.25); display: inline-block; color:#A9B1D6; font-weight:600;">forecast-reports</span> | <span style="background-color: rgba(61,90,254,0.25); border-radius: 4px; box-shadow: 0 0 0 3px rgba(61,90,254,0.25); display: inline-block; color:#A9B1D6; font-weight:600;">risk-reports</span>                  ||
||                                                                  ||
+====================================================================+
                                   <span style="font-size: 2em; line-height: 1; display: inline-block;">&darr;</span>
+====================================================================+
||.........................:: <span style="color:#ff002b;">5-Reports</span> ::..........................||
||                                                                  ||
||                          <span style="background-color: rgba(110,118,129,0.25); border-radius: 4px; box-shadow: 0 0 0 3px rgba(110,118,129,0.25); display: inline-block; color:#E6EDF3;">merge_pairs.py</span>                          ||
||                                                                  ||
+====================================================================+
                                   <span style="font-size: 2em; line-height: 1; display: inline-block;">&darr;</span>
+====================================================================+
||........................:: <span style="color:#7DCFFF;">6-UserReview</span> ::........................||
||                                                                  ||
||                        <span style="background-color: rgba(110,118,129,0.25); border-radius: 4px; box-shadow: 0 0 0 3px rgba(110,118,129,0.25); display: inline-block; color:#E6EDF3;">add_user_status.py</span>                        ||
||                                                                  ||
+====================================================================+
                                   <span style="font-size: 2em; line-height: 1; display: inline-block;">&darr;</span>
+====================================================================+
||.........................:: <span style="color:#2AC3DE;">7-Scoring</span> ::..........................||
||                                                                  ||
||                 <span style="background-color: rgba(110,118,129,0.25); border-radius: 4px; box-shadow: 0 0 0 3px rgba(110,118,129,0.25); display: inline-block; color:#E6EDF3;">score_summary.py</span> | <span style="background-color: rgba(110,118,129,0.25); border-radius: 4px; box-shadow: 0 0 0 3px rgba(110,118,129,0.25); display: inline-block; color:#E6EDF3;">intervall.py</span>                  ||
||                                                                  ||
+====================================================================+
                                   <span style="font-size: 2em; line-height: 1; display: inline-block;">&darr;</span>
+====================================================================+
||.....................:: <span style="color:#FF9E64;">8-HumanKalibration</span> ::.....................||
||                                                                  ||
||                       <span style="background-color: rgba(110,118,129,0.25); border-radius: 4px; box-shadow: 0 0 0 3px rgba(110,118,129,0.25); display: inline-block; color:#E6EDF3;">human_calibration.py</span>                       ||
||                                                                  ||
+====================================================================+
                                   <span style="font-size: 2em; line-height: 1; display: inline-block;">&darr;</span>
+====================================================================+
||.........................:: <span style="color:#C3E88D;">9-Strategy</span> ::.........................||
||                                                                  ||
||                     <span style="background-color: rgba(110,118,129,0.25); border-radius: 4px; box-shadow: 0 0 0 3px rgba(110,118,129,0.25); display: inline-block; color:#E6EDF3;">compute_distribution.py</span>                      ||
||                                                                  ||
+====================================================================+
</pre>

### Responsibilities

- API layer: FastAPI app, v1 router, health endpoints.
- Service layer: modules/hybrid/services orchestrate workflow state and stage execution.
- Stages: app/pipelines/nli scripts for retrieval, NLI pairing, reports, scoring.
- State handling: workdir files under NLI_DATA_ROOT/NLI_WORKDIR and presets in PRESETS_DIR.
- Configuration: pydantic-settings loads .env and environment variables.

### Configuration

Environment variables are loaded from `.env` in the repository root (if present).

| Name | Responsibility | Default |
|------|---------------|---------|
| APP_HOST | Bind address | `127.0.0.1` |
| APP_PORT | HTTP port | `8000` |
| APP_RELOAD | Auto reload | `false` |
| FRONTEND_ORIGINS | CORS allowlist | `http://localhost:5173, https://hybridintelligence.dev` |
| OPENAI_API_KEY | OpenAI API key for stage scripts | `unset` |
| NLI_DATA_ROOT | Base data directory | `app/data/nli` |
| NLI_WORKDIR | Stages workdir | `NLI_DATA_ROOT/workdir` |
| PRESETS_DIR | Preset files | `presets` |
| NLI_MODEL_NAME | Local NLI model | `microsoft/deberta-large-mnli` |

### API

OpenAPI schema:

```text
http://127.0.0.1:8000/openapi.json
```

Examples:

```bash
curl http://127.0.0.1:8000/health
curl http://127.0.0.1:8000/hybrid/pipeline/status
```

## Additional docs

- `frontend/docs_frontend.md`
- `backend/docs_backend.md`

<!-- MARKDOWN LINKS & IMAGES -->
[React-badge]: https://img.shields.io/badge/React-61DAFB?style=for-the-badge&logo=react&logoColor=000000
[React-url]: https://react.dev/
[Vite-badge]: https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white
[Vite-url]: https://vitejs.dev/
[TypeScript-badge]: https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white
[TypeScript-url]: https://www.typescriptlang.org/
[Tailwind-badge]: https://img.shields.io/badge/Tailwind%20CSS-38B2AC?style=for-the-badge&logo=tailwindcss&logoColor=white
[Tailwind-url]: https://tailwindcss.com/
[Radix-badge]: https://img.shields.io/badge/Radix%20UI-161618?style=for-the-badge&logo=radixui&logoColor=white
[Radix-url]: https://www.radix-ui.com/
[Recharts-badge]: https://img.shields.io/badge/Recharts-22C55E?style=for-the-badge
[Recharts-url]: https://recharts.org/en-US/
[PDFjs-badge]: https://img.shields.io/badge/PDF.js-FF5722?style=for-the-badge&logo=adobeacrobatreader&logoColor=white
[PDFjs-url]: https://mozilla.github.io/pdf.js/
[ReactRouter-badge]: https://img.shields.io/badge/React%20Router-CA4245?style=for-the-badge&logo=reactrouter&logoColor=white
[ReactRouter-url]: https://reactrouter.com/
[Lucide-badge]: https://img.shields.io/badge/Lucide-000000?style=for-the-badge&logo=lucide&logoColor=white
[Lucide-url]: https://lucide.dev/
[Python-badge]: https://img.shields.io/badge/Python-3.12-3776AB?style=for-the-badge&logo=python&logoColor=white
[Python-url]: https://www.python.org/
[FastAPI-badge]: https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white
[FastAPI-url]: https://fastapi.tiangolo.com/
[FAISS-badge]: https://img.shields.io/badge/FAISS-0866FF?style=for-the-badge&logo=meta&logoColor=white
[FAISS-url]: https://github.com/facebookresearch/faiss
[Transformers-badge]: https://img.shields.io/badge/Transformers-HuggingFace-FFD21E?style=for-the-badge&logo=huggingface&logoColor=000000&labelColor=FFFFFF
[Transformers-url]: https://huggingface.co/docs/transformers/
[PyTorch-badge]: https://img.shields.io/badge/PyTorch-EE4C2C?style=for-the-badge&logo=pytorch&logoColor=white
[PyTorch-url]: https://pytorch.org/
[NumPy-badge]: https://img.shields.io/badge/NumPy-013243?style=for-the-badge&logo=numpy&logoColor=white
[NumPy-url]: https://numpy.org/
[Pandas-badge]: https://img.shields.io/badge/Pandas-150458?style=for-the-badge&logo=pandas&logoColor=white
[Pandas-url]: https://pandas.pydata.org/
[NLI-badge]: https://img.shields.io/badge/NLI%20Model-microsoft%2Fdeberta--large--mnli-FFD21E?style=for-the-badge&logo=huggingface&logoColor=000000&labelColor=FFFFFF
[NLI-url]: https://huggingface.co/microsoft/deberta-large-mnli
