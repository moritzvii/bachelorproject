<!-- PROJECT LOGO -->
<br />
<div align="center">
  <img src="../frontend/public/vite.svg" alt="Logo" width="80" height="80">
  <h1 align="center">Backend Documentation</h1>
  <p align="center">
    FastAPI backend for the Hybrid Intelligence Decision Support system.
    <br />
    Focus: orchestrating strategy workflows, NLI stages, and scoring via HTTP.
  </p>
</div>

<!-- TABLE OF CONTENTS -->
<details>
  <summary>Table of Contents</summary>
  <ol>
    <li><a href="#built-with">Built With</a></li>
    <li><a href="#mental-model">Mental model</a></li>
    <li><a href="#local-run">Local run</a></li>
    <li><a href="#project-structure">Project structure</a></li>
    <li>
      <a href="#architecture">Architecture</a>
      <ul>
        <li><a href="#stages-view">Stages view</a></li>
        <li><a href="#responsibilities">Responsibilities</a></li>
      </ul>
    </li>
    <li><a href="#configuration">Configuration</a></li>
    <li><a href="#api">API</a></li>
  </ol>
</details>

---

## Built With

- [![Python][Python-badge]][Python-url]
- [![FastAPI][FastAPI-badge]][FastAPI-url]
- [![FAISS][FAISS-badge]][FAISS-url]
- [![NumPy][NumPy-badge]][NumPy-url]
- [![Pandas][Pandas-badge]][Pandas-url]
- [![PyTorch][PyTorch-badge]][PyTorch-url]
- [![Transformers][Transformers-badge]][Transformers-url]
- [![NLI Model][NLI-badge]][NLI-url]
- <a href="https://platform.openai.com/" style="text-decoration: none;"><span style="display: inline-flex; align-items: center; height: 28px; border-radius: 0; overflow: hidden; font-size: 11px; font-weight: 500; letter-spacing: 0.4px; text-transform: uppercase; font-family: Verdana, 'DejaVu Sans', Arial, sans-serif; box-sizing: border-box;"><span style="display: inline-flex; align-items: center; gap: 6px; height: 28px; padding: 0 8px; background: #fff; color: #000;"><span style="display: inline-flex; align-items: center; justify-content: center; width: 16px; height: 16px; background: #fff; border-radius: 0;"><img src="../frontend/public/img.png" alt="Logo" height="12" style="display: block;" /></span>Embedding Model</span><span style="display: inline-flex; align-items: center; height: 28px; padding: 0 10px; background: #10a37f; color: #fff; font-weight: 700;">text-embedding-3-small</span></span></a>

## Mental model

<pre style="font-family: Consolas, Menlo, Monaco, 'Courier New', monospace; line-height: 1.35;">
+====================================================================+
||.....................:: <span style="color:#7AA2F7;">Client / Frontend</span> ::......................||
+====================================================================+
                                   <span style="font-size: 2em; line-height: 1; display: inline-block;">&darr;</span>
+====================================================================+
||...................:: <span style="color:#2AC3DE;">FastAPI HTTP API (v1)</span> ::....................||
+====================================================================+
                                   <span style="font-size: 2em; line-height: 1; display: inline-block;">&darr;</span>
+====================================================================+
||......................:: <span style="color:#BB9AF7;">Hybrid services</span> ::.......................||
||                                                                  ||
||             <span style="background-color: rgba(61,90,254,0.25); border-radius: 4px; box-shadow: 0 0 0 3px rgba(61,90,254,0.25); display: inline-block; color:#A9B1D6;">strategies</span> | <span style="background-color: rgba(61,90,254,0.25); border-radius: 4px; box-shadow: 0 0 0 3px rgba(61,90,254,0.25); display: inline-block; color:#A9B1D6;">stages</span> | <span style="background-color: rgba(61,90,254,0.25); border-radius: 4px; box-shadow: 0 0 0 3px rgba(61,90,254,0.25); display: inline-block; color:#A9B1D6;">scoring</span> | <span style="background-color: rgba(61,90,254,0.25); border-radius: 4px; box-shadow: 0 0 0 3px rgba(61,90,254,0.25); display: inline-block; color:#A9B1D6;">workflow</span>             ||
||                                                                  ||
+====================================================================+
                                   <span style="font-size: 2em; line-height: 1; display: inline-block;">&darr;</span>
+====================================================================+
||.....................:: <span style="color:#9ECE6A;">NLI stage scripts</span> ::......................||
||                                                                  ||
||                 <span style="background-color: rgba(61,90,254,0.25); border-radius: 4px; box-shadow: 0 0 0 3px rgba(61,90,254,0.25); display: inline-block; color:#A9B1D6;">retrieve</span> &rarr; <span style="background-color: rgba(61,90,254,0.25); border-radius: 4px; box-shadow: 0 0 0 3px rgba(61,90,254,0.25); display: inline-block; color:#A9B1D6;">NLI</span> &rarr; <span style="background-color: rgba(61,90,254,0.25); border-radius: 4px; box-shadow: 0 0 0 3px rgba(61,90,254,0.25); display: inline-block; color:#A9B1D6;">merge</span> &rarr; <span style="background-color: rgba(61,90,254,0.25); border-radius: 4px; box-shadow: 0 0 0 3px rgba(61,90,254,0.25); display: inline-block; color:#A9B1D6;">scoring</span>                 ||
||                                                                  ||
+====================================================================+
                                   <span style="font-size: 2em; line-height: 1; display: inline-block;">&darr;</span>
+====================================================================+
||...............:: <span style="color:#FFD866;">File-based state and artifacts</span> ::...............||
||                                                                  ||
||                     <span style="background-color: rgba(61,90,254,0.25); border-radius: 4px; box-shadow: 0 0 0 3px rgba(61,90,254,0.25); display: inline-block; color:#A9B1D6;">workdir</span> | <span style="background-color: rgba(61,90,254,0.25); border-radius: 4px; box-shadow: 0 0 0 3px rgba(61,90,254,0.25); display: inline-block; color:#A9B1D6;">JSON</span> | <span style="background-color: rgba(61,90,254,0.25); border-radius: 4px; box-shadow: 0 0 0 3px rgba(61,90,254,0.25); display: inline-block; color:#A9B1D6;">parquet</span>                     ||
||                                                                  ||
+====================================================================+
</pre>

The backend is a thin orchestration layer between user workflows and the NLI stage outputs.

---

## Local run

Requirement: Python >= 3.12

```bash
python -m venv .venv
source .venv/bin/activate

python -m pip install --upgrade pip poetry
poetry install

poetry run serve
```

---

## Project structure

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

---
## Architecture

### Stages view

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

---

## Configuration

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

---

## API

OpenAPI schema:

```text
http://127.0.0.1:8000/openapi.json
```

Examples:

```bash
curl http://127.0.0.1:8000/health
curl http://127.0.0.1:8000/hybrid/pipeline/status
```

<!-- MARKDOWN LINKS & IMAGES -->
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
