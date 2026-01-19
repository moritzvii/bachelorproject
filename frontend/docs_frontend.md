<!-- PROJECT LOGO -->
<br />
<div align="center">
  <img src="./public/vite.svg" alt="Logo" width="80" height="80">
  <h1 align="center">Frontend Documentation</h1>
  <p align="center">
    React + Vite frontend for the Hybrid Intelligence Decision Support system.
    <br />
    Focus: multi-step evaluation workflow, evidence curation, and visualization.
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
        <li><a href="#workflow-view">Workflow view</a></li>
      </ul>
    </li>
    <li><a href="#api">API</a></li>
  </ol>
</details>

---

## Built With

- [![React][React-badge]][React-url]
- [![Vite][Vite-badge]][Vite-url]
- [![TypeScript][TypeScript-badge]][TypeScript-url]
- [![Tailwind][Tailwind-badge]][Tailwind-url]
- [![Radix][Radix-badge]][Radix-url]
- <a href="https://shadcn.io/" style="text-decoration: none; display: inline-block; padding: 4px 0;"><span style="display: inline-flex; align-items: center; height: 28px; border-radius: 0; overflow: hidden; font-size: 11px; font-weight: 500; letter-spacing: 0.4px; text-transform: uppercase; font-family: Verdana, 'DejaVu Sans', Arial, sans-serif; box-sizing: border-box;"><span style="display: inline-flex; align-items: center; gap: 6px; height: 28px; padding: 0 8px; background: #fff; color: #000;"><span style="display: inline-flex; align-items: center; justify-content: center; width: 16px; height: 16px; background: #fff; border-radius: 0;"><img src="./public/img_1.png" alt="Logo" height="12" style="display: block;" /></span>Component Library</span><span style="display: inline-flex; align-items: center; height: 28px; padding: 0 10px; background: #000; color: #fff; font-weight: 700;">shadcn/ui</span></span></a>
- <a href="https://www.shadcn.io/" style="text-decoration: none; display: inline-block; padding: 4px 0;"><span style="display: inline-flex; align-items: center; height: 28px; border-radius: 0; overflow: hidden; font-size: 11px; font-weight: 500; letter-spacing: 0.4px; text-transform: uppercase; font-family: Verdana, 'DejaVu Sans', Arial, sans-serif; box-sizing: border-box;"><span style="display: inline-flex; align-items: center; gap: 6px; height: 28px; padding: 0 8px; background: #fff; color: #000;"><span style="display: inline-flex; align-items: center; justify-content: center; width: 16px; height: 16px; background: #000; border-radius: 0;"><img src="./public/img_2.png" alt="Logo" height="12" style="display: block;" /></span>Component Library</span><span style="display: inline-flex; align-items: center; height: 28px; padding: 0 10px; background: #000; color: #fff; font-weight: 700;">shadcn.io</span></span></a>
- [![Lucide][Lucide-badge]][Lucide-url]
- [![Recharts][Recharts-badge]][Recharts-url]
- [![PDFjs][PDFjs-badge]][PDFjs-url]
- [![ReactRouter][ReactRouter-badge]][ReactRouter-url]

## Mental model

<pre style="font-family: Consolas, Menlo, Monaco, 'Courier New', monospace; line-height: 1.35;">
+====================================================================+
||.......................:: <span style="color:#7AA2F7;">User / Browser</span> ::.......................||
+====================================================================+
                                   <span style="font-size: 2em; line-height: 1; display: inline-block;">&darr;</span>
+====================================================================+
||......................:: <span style="color:#2AC3DE;">React SPA (Vite)</span> ::......................||
||                                                                  ||
||                 <span style="background-color: rgba(61,90,254,0.25); border-radius: 4px; box-shadow: 0 0 0 3px rgba(61,90,254,0.25); display: inline-block; color:#A9B1D6;">router</span> | <span style="background-color: rgba(61,90,254,0.25); border-radius: 4px; box-shadow: 0 0 0 3px rgba(61,90,254,0.25); display: inline-block; color:#A9B1D6;">layouts</span> | <span style="background-color: rgba(61,90,254,0.25); border-radius: 4px; box-shadow: 0 0 0 3px rgba(61,90,254,0.25); display: inline-block; color:#A9B1D6;">ui</span> | <span style="background-color: rgba(61,90,254,0.25); border-radius: 4px; box-shadow: 0 0 0 3px rgba(61,90,254,0.25); display: inline-block; color:#A9B1D6;">features</span>                 ||
||                                                                  ||
+====================================================================+
                                   <span style="font-size: 2em; line-height: 1; display: inline-block;">&darr;</span>
+====================================================================+
||.......................:: <span style="color:#BB9AF7;">Workflow pages</span> ::.......................||
||                                                                  ||
||          <span style="background-color: rgba(61,90,254,0.25); border-radius: 4px; box-shadow: 0 0 0 3px rgba(61,90,254,0.25); display: inline-block; color:#A9B1D6;">strategy</span> &rarr; <span style="background-color: rgba(61,90,254,0.25); border-radius: 4px; box-shadow: 0 0 0 3px rgba(61,90,254,0.25); display: inline-block; color:#A9B1D6;">selection</span> &rarr; <span style="background-color: rgba(61,90,254,0.25); border-radius: 4px; box-shadow: 0 0 0 3px rgba(61,90,254,0.25); display: inline-block; color:#A9B1D6;">reasoning</span> &rarr; <span style="background-color: rgba(61,90,254,0.25); border-radius: 4px; box-shadow: 0 0 0 3px rgba(61,90,254,0.25); display: inline-block; color:#A9B1D6;">positioning</span>          ||
||                                                                  ||
+====================================================================+
                                   <span style="font-size: 2em; line-height: 1; display: inline-block;">&darr;</span>
+====================================================================+
||.........................:: <span style="color:#9ECE6A;">API layer</span> ::..........................||
||                                                                  ||
||                      <span style="background-color: rgba(61,90,254,0.25); border-radius: 4px; box-shadow: 0 0 0 3px rgba(61,90,254,0.25); display: inline-block; color:#A9B1D6;">fetch</span> | <span style="background-color: rgba(61,90,254,0.25); border-radius: 4px; box-shadow: 0 0 0 3px rgba(61,90,254,0.25); display: inline-block; color:#A9B1D6;">json</span> | <span style="background-color: rgba(61,90,254,0.25); border-radius: 4px; box-shadow: 0 0 0 3px rgba(61,90,254,0.25); display: inline-block; color:#A9B1D6;">errors</span>                       ||
||                                                                  ||
+====================================================================+
                                   <span style="font-size: 2em; line-height: 1; display: inline-block;">&darr;</span>
+====================================================================+
||......................:: <span style="color:#FFD866;">Backend services</span> ::......................||
+====================================================================+
</pre>

The frontend is a focused UI shell that guides the evaluation workflow and renders evidence-driven visuals.

---

## Local run

Requirement: Node.js >= 18

```bash
npm install
npm run dev
```

---

## Project structure

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

---
## Architecture

### Workflow view

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

## API

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
