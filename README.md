# Power Platform & Copilot QA Platform (`pp-qa`)

An automated testing, inspection, and verification platform designed specifically for Microsoft Power Platform (Model-Driven Apps, Canvas Apps) and Microsoft Copilot Studio (Power Virtual Agents) solutions.

Built with **Microsoft Fluent UI v9**, **Node.js / Express**, **PostgreSQL** (with zero-dependency fallback), multi-model **Agentic AI** (OpenAI & Gemini SDKs), and **Playwright** Page Object Model (POM) patterns modeled after `microsoft/power-platform-playwright-samples`.

---

## Key Features

1. **Microsoft Entra ID SSO & Azure App Onboarding Wizard**:
   - Single sign-on with Microsoft 365 / Entra ID corporate credentials.
   - Onboarding wizard to securely register and test Azure App Client ID & AES-256-GCM encrypted Client Secrets against Dataverse environments.
2. **Automated Solution Ingestion & Extraction**:
   - Lists unmanaged Dataverse solutions via Web API and exports base64 solution ZIP packages (`ExportSolution`).
   - Deep metadata parsing of `solution.xml`, `customizations.xml`, Cloud Flows (`Workflows/*.json`), and Copilot Studio Bots (`Bots/`).
   - Generates comprehensive, categorized Markdown specifications (.md) with Entity Relationship Diagrams (ERD).
3. **Multi-Model Agentic BYOK Chat Assistant**:
   - AES-256-GCM encrypted vault for OpenAI and Google Gemini API keys.
   - Streaming tool calling (`search_solution_metadata`, `get_component_details`, `read_markdown_section`, `propose_test_scenarios`).
   - Model switcher between OpenAI (`gpt-4o`, `gpt-4o-mini`, `o3-mini`) and Gemini (`gemini-2.0-flash`, `gemini-1.5-pro`), with zero-dependency simulated expert agent for offline testing.
4. **Two-Stage Interactive Test Authoring**:
   - Stage 1: Conversational AI proposes structured scenario cards (steps, preconditions, assertions) that users can review, reorder, or customize.
   - Stage 2: Compiles scenario cards into strongly typed TypeScript Playwright test suites using Microsoft's POM templates (`AppProvider`, `ModelDrivenAppPage`, `GridComponent`, `FormComponent`, `CopilotChatComponent`) with smart Dataverse waiting (`ms-spinner`).
5. **Headless Execution & Live Reporting Dashboard**:
   - Dual-domain session state manager (`state-<email>.json` for `make.powerapps.com` and `state-mda-<email>.json` for `*.crm.dynamics.com`).
   - Child process execution queue with real-time Server-Sent Events (SSE) streaming console logs.
   - Full Playwright HTML report viewer, failure screenshot gallery, video playback, and trace downloads (`trace.playwright.dev`).

---

## Directory Layout

```
pp-qa/
├── package.json                   # Root orchestrator scripts (dev, build, test)
├── scripts/
│   └── setup-env.sh               # User-space Node.js (v20 LTS) bootstrapping
├── client/                        # Frontend: React 18 + Vite + Microsoft Fluent UI v9
│   ├── src/
│   │   ├── api/                   # Axios client with JWT interceptor
│   │   ├── components/
│   │   │   ├── auth/              # Microsoft SSO & AzureAppWizardDialog
│   │   │   ├── solutions/         # SolutionCatalog, MetadataViewer, MarkdownDocViewer
│   │   │   ├── chat/              # ChatAssistantDrawer, ModelSelector, ByokModal, ChatMessageList
│   │   │   ├── tests/             # ScenarioCardList, ScenarioEditorDialog, CodePreviewDrawer
│   │   │   └── runner/            # LiveLogConsole, ArtifactGallery, HtmlReportViewer, TestRunDashboard
│   │   └── pages/                 # SolutionsPage, TestSuitesPage, LiveRunsPage, SettingsPage
└── server/                        # Backend: Node.js + Express + TypeScript + Playwright
    ├── src/
    │   ├── config/                # Typed environment variable schema
    │   ├── db/                    # PostgreSQL pool (raw pg) with in-process fallback & migrations
    │   ├── services/
    │   │   ├── auth.service.ts    # JWT authentication & user persistence
    │   │   ├── azureApp.service.ts# AES-256 encrypted Azure credentials & OAuth test
    │   │   ├── dataverse.service.ts # Dataverse Web API client & solution export
    │   │   ├── parser/            # Solution ZIP, XML, Cloud Flow, Bot & Markdown parsers
    │   │   ├── ai/                # OpenAI & @google/genai streaming tool agents
    │   │   ├── testgen/           # Microsoft POM templates & Playwright synthesizer
    │   │   └── runner/            # Dual session auth, execution queue & report collector
    │   └── routes/                # Express REST & SSE endpoints
    └── playwright/                # Embedded Playwright runner runtime
        ├── playwright.config.ts   # Headless Chromium, video, trace, screenshot configuration
        ├── templates/pom.ts       # Base Page Object Models
        └── generated-tests/       # Workspace for synthesized test suites
```

---

## Quick Start

### 1. Environment Setup (Node.js LTS)
If Node.js is not already on your system `$PATH`, run the user-space bootstrapper:
```bash
./scripts/setup-env.sh
export PATH="$HOME/.local/node/bin:$PATH"
```

### 2. Install Dependencies
```bash
npm run install:all
```

### 3. Run Development Servers
Concurrently starts backend API (`http://localhost:5000`) and frontend Vite dev server (`http://localhost:5173`):
```bash
npm run dev
```

### 4. Build for Production
Compiles backend TypeScript into `server/dist/` and bundles frontend client:
```bash
npm run build
```

---

## Running Verification & Unit Tests

The test suite covers database migrations, AES-256 encryption, XML/JSON parsing, AI BYOK tools, test synthesizer, and headless Playwright execution:

```bash
# Run all tests
npm test

# Run solution parser tests
npm run test:parser

# Run BYOK key encryption & AI tool tests
npm run test:byok
```

---

## Documentation

- [ARCHITECTURE.md](ARCHITECTURE.md): Comprehensive system architecture, database DDL, Dataverse Web API integration, and Playwright execution design.
- [PLAN.md](PLAN.md): Complete multi-phase implementation roadmap.
