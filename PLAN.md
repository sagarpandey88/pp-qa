# Implementation Plan: Power Platform & Copilot QA Platform (pp-qa)

A full-lifecycle platform to inspect, document, and automatically test Microsoft Power Platform (Model-Driven Apps, Canvas Apps) and Microsoft Copilot Studio solutions using Microsoft Fluent UI v9, PostgreSQL (raw `pg`), multi-model agentic AI (OpenAI & Gemini SDKs), and Playwright testing patterns modeled after `microsoft/power-platform-playwright-samples`.

---

## User Review Required

> [!IMPORTANT]
> **Node.js Environment**: The local machine currently does not have Node.js in the system `$PATH`. Phase 1 includes bootstrapping a standalone user-space Node.js LTS (v20 or v22) in `/home/spadmin/.local/node` (or `~/.nvm`) so no `sudo` or root permissions are required.
>
> **PostgreSQL Configuration**: The backend uses raw `pg` queries against PostgreSQL. A `.env` template will be provided with `DATABASE_URL=postgresql://postgres:postgres@localhost:5432/ppqa`. The app will also include an optional in-process SQLite or fallback mock test database for zero-dependency local verification if a live PostgreSQL server is not immediately accessible.

---

## Open Questions

> [!NOTE]
> All core technical decisions have been confirmed during the `/grill-me` session. No blocking questions remain. Phase execution will proceed in strict order upon your approval.

---

## Proposed Changes

The platform follows a clean two-tier directory layout: `client/` (React 18 + Vite + Microsoft Fluent UI v9) and `server/` (Node.js + Express + TypeScript + raw `pg` + embedded Playwright runner).

```
pp-qa/
├── package.json                   # Root orchestrator scripts (dev, build, test)
├── client/                        # Frontend: React 18 + Vite + Fluent UI v9
└── server/                        # Backend: Express + TypeScript + raw pg + Playwright
```

---

### Phase 1: Environment Bootstrapping & Two-Tier Project Scaffolding

#### [NEW] `scripts/setup-env.sh`
- User-space installer script for Node.js LTS (v20.x) and npm if not found on the system.
- Configures local bin paths in user profile (`~/.bashrc`).

#### [NEW] `package.json` (Root)
- Root workspace orchestration scripts:
  - `npm run dev`: Concurrently runs `client` and `server`.
  - `npm run build`: Compiles `server` (tsc) and `client` (vite build).
  - `npm run test`: Runs server unit tests and Playwright verification suites.

#### [NEW] `server/` Setup
- `server/package.json`: Dependencies: `express`, `pg`, `cors`, `dotenv`, `adm-zip`, `fast-xml-parser`, `openai`, `@google/genai`, `@azure/msal-node`, `playwright`, `@playwright/test`, `jsonwebtoken`. DevDependencies: `typescript`, `@types/express`, `@types/pg`, `@types/node`, `tsx`, `jest`.
- `server/tsconfig.json`: Node 20 ES module target with strict TypeScript checking.
- `server/src/index.ts`: Express application entry point with CORS, JSON body parser, and SSE endpoints.
- `server/src/config/env.ts`: Typed environment variable schema (PORT, DATABASE_URL, ENCRYPTION_KEY, JWT_SECRET).
- `server/src/db/pool.ts`: PostgreSQL connection pool using `pg.Pool` with health check and graceful shutdown.
- `server/src/db/migrate.ts`: Pure SQL migration runner executing numbered `.sql` files in sequence.
- `server/src/db/migrations/001_initial_schema.sql`: Full DDL for `users`, `azure_app_profiles`, `byok_keys`, `solutions`, `solution_tables`, `solution_flows`, `solution_copilot_bots`, `test_suites`, `test_runs`.

#### [NEW] `client/` Setup
- `client/package.json`: Dependencies: `react`, `react-dom`, `@fluentui/react-components`, `@fluentui/react-icons`, `react-router-dom`, `axios`, `canvas-confetti`. DevDependencies: `vite`, `@vitejs/plugin-react`, `typescript`.
- `client/vite.config.ts`: Vite bundler configuration proxying `/api` requests to Express backend (`localhost:5000`).
- `client/src/main.tsx`: React entry point wrapping the application in `<FluentProvider theme={webLightTheme}>`.
- `client/src/App.tsx`: Navigation bar, Microsoft Fluent header, page routing (Solutions, Test Suites, Live Runs, Settings).

---

### Phase 2: Authentication & Azure App Onboarding Wizard

#### [NEW] `server/src/services/auth.service.ts` & `server/src/routes/auth.routes.ts`
- Microsoft Entra ID SSO token validation via MSAL/Graph.
- Issues JWT application session cookies or bearer tokens.
- User profile persistence in `users` table.

#### [NEW] `server/src/services/azureApp.service.ts` & `server/src/routes/azureApp.routes.ts`
- Encryption and decryption of Azure App Client Secret using AES-256-GCM.
- CRUD endpoints for `azure_app_profiles` (Tenant ID, Client ID, Secret, Environment URL).
- `/api/azure-profiles/test-connection`: Validates credentials by requesting a client credentials token from `https://login.microsoftonline.com/{tenantId}/oauth2/v2.0/token` with scope `{environmentUrl}/.default`.

#### [NEW] `client/src/components/auth/`
- `LoginButton.tsx`: Microsoft-branded login button triggering Entra ID sign-in.
- `AzureAppWizardDialog.tsx`: Fluent UI `Dialog` modal prompting first-time users for Tenant ID, Client ID, Client Secret, and Dataverse Environment URL with a "Test Connection" button and inline status badges.

---

### Phase 3: Solution Retrieval, Extraction & Modular Markdown Generation

```mermaid
sequenceDiagram
    participant User as User / Browser
    participant API as Backend API
    participant DV as Dataverse Web API
    participant Parser as Extraction Engine
    participant DB as PostgreSQL

    User->>API: GET /api/dataverse/solutions (unmanaged)
    API->>DV: GET /api/dataverse/v9.2/solutions?$filter=ismanaged eq false
    DV-->>API: Solutions list
    API-->>User: Display solution cards

    User->>API: POST /api/dataverse/solutions/:id/export
    API->>DV: POST /api/dataverse/v9.2/ExportSolution (SolutionName, Managed=false)
    DV-->>API: ExportSolutionFile (base64 ZIP)
    API->>Parser: Extract ZIP in-memory / storage
    Parser->>Parser: Parse solution.xml & customizations.xml
    Parser->>Parser: Parse Workflows/*.json & Bots/*
    Parser->>Parser: Generate categorized Markdown specification
    Parser->>DB: INSERT solutions, solution_tables, flows, copilot_bots
    API-->>User: Extraction complete (ready for chat & testgen)
```

#### [NEW] `server/src/services/dataverse.service.ts` & `server/src/routes/dataverse.routes.ts`
- `fetchUnmanagedSolutions(profileId)`: Lists unmanaged solutions via Dataverse Web API.
- `exportSolution(profileId, solutionUniqueName)`: Calls Dataverse `ExportSolution` action and receives base64 ZIP payload.
- `/api/solutions/upload`: Multer route for manual solution ZIP file upload fallback.

#### [NEW] `server/src/services/parser/`
- `zipExtractor.ts`: Reads ZIP streams and extracts XML/JSON components safely using `adm-zip`.
- `solutionXmlParser.ts`: Parses `solution.xml` for version, publisher prefix, and component inventory (`fast-xml-parser`).
- `customizationsParser.ts`: Parses `customizations.xml`:
  - Entities/Tables: SchemaName, DisplayName, PrimaryId, PrimaryName, Attributes (data type, required level, max length, picklists/OptionSets).
  - Relationships: 1:N, N:1, N:N mappings and cascade behaviors.
  - Forms & Views: SystemForms layout and SavedQueries FetchXml.
- `cloudFlowParser.ts`: Parses `Workflows/*.json` for triggers (Dataverse events, recurrence, HTTP), actions tree, and connection references.
- `copilotBotParser.ts`: Parses `Bots/` and `BotComponents/` for Copilot Studio topics, dialog trees, generative answers nodes, and variables.
- `markdownGenerator.ts`: Compiles extracted components into a modular, formatted Markdown document with tables of contents, data dictionary, workflow diagrams, and Copilot topics.

#### [NEW] `client/src/components/solutions/`
- `SolutionCatalog.tsx`: Fluent UI `DataGrid` listing unmanaged solutions with version, publisher, and an "Extract & Inspect" button.
- `MetadataViewer.tsx`: Fluent UI `TabList` exploring Tables, Columns, Relationships, Cloud Flows, and Copilot Bots.
- `MarkdownDocViewer.tsx`: Rendered Markdown specification viewer with copy and download provisions.

---

### Phase 4: Multi-Model Agentic BYOK Chat Assistant

#### [NEW] `server/src/services/ai/byok.service.ts` & `server/src/routes/byok.routes.ts`
- Secure vault for OpenAI and Gemini API keys with AES-256-GCM encryption in `byok_keys` table.
- Supports both organization-level global keys and user-level overrides with masked key hints (`sk-...39aF`).

#### [NEW] `server/src/services/ai/`
- `openai.client.ts`: Official `openai` SDK client with streaming tool calling (`stream: true`).
- `gemini.client.ts`: Official `@google/genai` SDK client with streaming tool calling.
- `agent.tools.ts`: Defines function call tools:
  - `search_solution_metadata`: Semantic/keyword query over tables, columns, flows, and copilot topics.
  - `get_component_details`: Returns full JSON schema for an entity or flow action graph.
  - `read_markdown_section`: Fetches specific sections of the generated solution specification.
  - `propose_test_scenarios`: Emits structured test scenario objects (title, target app, steps, expected assertions).
- `prompts.ts`: Power Platform and Copilot Studio test engineering prompt templates.
- `server/src/routes/chat.routes.ts`: SSE chat streaming endpoint `/api/chat/stream`.

#### [NEW] `client/src/components/chat/`
- `ChatAssistantDrawer.tsx`: Fluent UI `Drawer` containing the conversational AI assistant.
- `ModelSelector.tsx`: Fluent UI `Dropdown` to switch between OpenAI (GPT-4o, o3-mini) and Gemini (Gemini 2.0 Flash, Gemini 1.5 Pro).
- `ByokModal.tsx`: Dialog to enter and test personal or organization API keys.
- `ChatMessageList.tsx`: Markdown-enabled chat stream with tool-execution status badges.

---

### Phase 5: Two-Stage Interactive Test Case Authoring

```mermaid
flowchart LR
    Chat["1. Chat Assistant Suggests Tests"] --> ScenarioCards["2. Interactive Scenario Cards"]
    ScenarioCards --> EditSteps["3. User Modifies / Adds Steps"]
    EditSteps --> Synthesizer["4. Synthesize Playwright Code"]
    Synthesizer --> CodeDrawer["5. TypeScript Code Preview & Edit"]
```

#### [NEW] `server/src/services/testgen/`
- `pomTemplates.ts`: Base Page Object Models modeled after `microsoft/power-platform-playwright-samples`:
  - `AppProvider`: App launcher and global ready checks.
  - `ModelDrivenAppPage`: Command bar buttons, form navigation, tab switching.
  - `GridComponent`: Dataverse view grids, filtering, cell reading, sorting.
  - `FormComponent`: Text fields, lookup pickers, option sets, date fields, subgrids.
  - `CopilotChatComponent`: Embedded Copilot Studio chat interaction and generative answer checks.
- `testSynthesizer.ts`: Compiles structured test scenarios into executable TypeScript Playwright specs with smart waiting logic (`ms-spinner`).

#### [NEW] `client/src/components/tests/`
- `ScenarioCardList.tsx`: Visual cards representing test scenarios (preconditions, steps, expected outcomes).
- `ScenarioEditorDialog.tsx`: Dialog allowing users to manually add, edit, or reorder test steps and assertions.
- `CodePreviewDrawer.tsx`: Monaco / CodeMirror editor displaying the synthesized TypeScript Playwright test suite with a "Run Test Suite" button.

---

### Phase 6: Headless Playwright Execution & Rich Reporting Dashboard

#### [NEW] `server/playwright/`
- `playwright.config.ts`: Configured for headless Chromium/WebKit/Firefox with video recording (`on`), screenshot on failure (`only-on-failure`), and trace recording (`retain-on-failure`).
- `.playwright-ms-auth/`: Dual-domain session state cache:
  - `state-<email>.json`: Power Apps domain session (`make.powerapps.com`).
  - `state-mda-<email>.json`: Dynamics 365 / Dataverse domain session (`*.crm.dynamics.com`).

#### [NEW] `server/src/services/runner/`
- `authSessionManager.ts`:
  - Strategy 1: Headless automated login via credentials (`MS_AUTH_EMAIL`, `MS_USER_PASSWORD`) saving tokens to `.playwright-ms-auth/`.
  - Strategy 2: One-time interactive session capture fallback for MFA/Conditional Access.
- `executionQueue.ts`: Spawns Playwright test runner as a child process with real-time log capturing.
- `reportCollector.ts`: Collects test execution duration, pass/fail status, traces, failure screenshots, and generates the Playwright HTML report.
- `server/src/routes/runner.routes.ts`: Endpoints `/api/runs`, `/api/runs/:id`, and SSE endpoint `/api/runs/:id/logs`.

#### [NEW] `client/src/components/runner/`
- `TestRunDashboard.tsx`: Fluent UI dashboard displaying live execution status, pass/fail counters, and execution duration.
- `LiveLogConsole.tsx`: Real-time streaming log terminal via SSE.
- `ArtifactGallery.tsx`: Failure screenshots, recorded video playback, and download link for Playwright traces.
- `HtmlReportViewer.tsx`: Embedded iframe displaying the full `@playwright/test` HTML report.

---

## Verification Plan

### Automated Tests
1. **Database & Migration Tests**:
   - Run SQL migration scripts: `npm run db:migrate --prefix server`
   - Verify all 9 tables exist and constraints pass.
2. **Parser Unit Tests**:
   - Run unit tests with sample Power Platform solution ZIP packages (containing `customizations.xml`, `solution.xml`, flows, and bots): `npm run test:parser --prefix server`
   - Assert tables, columns, relationships, and flows are extracted into expected JSON structures.
3. **AI BYOK Encryption Tests**:
   - Verify AES-256-GCM encryption/decryption round-trip: `npm run test:byok --prefix server`
4. **Playwright Synthesizer Tests**:
   - Generate test specs from sample scenario cards and verify syntax via `npx tsc --noEmit` on generated files.

### Manual Verification
1. **Azure App Onboarding**:
   - Open frontend at `http://localhost:5173`.
   - Log in with Microsoft account.
   - Enter Azure App credentials in the Onboarding Wizard, click "Test Connection", and verify successful Dataverse token acquisition.
2. **Solution Extraction**:
   - View list of unmanaged solutions.
   - Click "Export & Extract" on a solution.
   - Confirm generated Markdown is visible and tables/flows are browsable in the Fluent UI DataGrid.
3. **Agentic Chat & Test Generation**:
   - Configure OpenAI / Gemini BYOK key in settings.
   - Open Chat Assistant: ask *"Generate test cases for the Account entity and approval flow"*.
   - Verify scenario cards appear in the UI.
   - Click "Generate Playwright Code" and view the synthesized TypeScript code in the drawer.
4. **Headless Execution & Reporting**:
   - Click "Run Tests".
   - Watch real-time logs stream in the Live Log Console.
   - Inspect the pass/fail execution timeline, screenshots, and Playwright HTML report.

---

### Phase 7: Agentic AI Test Generation & Metadata-Grounded Playwright Synthesis

#### 1. Objectives
- Transform test generation and Playwright synthesis into an Agentic AI system that leverages extracted Dataverse tables, columns, picklists, relationships, cloud flows, Copilot topics, and modular markdown specifications.
- Dual-tier support: Full Agentic AI (OpenAI GPT-4o/o3-mini, Azure OpenAI, Google Gemini 2.0 Flash) + 100% offline Metadata-Aware Deterministic Compiler.
- Page Object Model synthesis adhering to `microsoft/power-platform-playwright-samples` with structured `test.step()` logging.

#### 2. Architecture & Components
- `server/src/services/ai/prompts.ts`: Advanced Power Platform QA prompts & POM method contracts.
- `server/src/services/ai/agent.tools.ts`: Tool registrations for grounded scenario generation & Playwright code synthesis.
- `server/src/services/ai/gemini.client.ts`: Tool calling & function execution support for `@google/genai`.
- `server/src/services/ai/openai.client.ts`: Multi-turn iterative tool execution loop.
- `server/src/services/testgen/agenticScenarioGenerator.ts`: Solution metadata & markdown aggregator with multi-objective scenario generation.
- `server/src/services/testgen/agenticSynthesizer.ts`: AI-grounded TypeScript Playwright synthesizer.
- `server/src/services/testgen/testSynthesizer.ts`: Metadata-aware semantic compiler with `test.step()`.
- `server/src/services/testSuite.service.ts`: Integrated scenario & code generation with AI options.
- `server/src/routes/testSuite.routes.ts`: Enhanced REST routes for scenario generation & code synthesis preview.
- `client/src/components/tests/AiScenarioGeneratorDialog.tsx`: Mode selector, model switcher, and metadata grounding badges.
- `client/src/components/tests/CodePreviewDrawer.tsx`: AI synthesis action & model badges.
- `client/src/pages/TestSuitesPage.tsx`: Connected AI studio authoring.

