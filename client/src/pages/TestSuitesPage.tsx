import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Title3,
  Text,
  Button,
  Field,
  Input,
  Dropdown,
  Option,
  Badge,
  Spinner,
  makeStyles,
  tokens,
  TabList,
  Tab,
  Tooltip,
} from '@fluentui/react-components';
import {
  DocumentBulletListRegular,
  CodeRegular,
  PlayRegular,
  SaveRegular,
  AddRegular,
  SparkleRegular,
  CheckmarkRegular,
  FolderOpenRegular,
  ArrowResetRegular,
  InfoRegular,
  ChevronDownRegular,
  ChevronUpRegular,
  CopyRegular,
  ArrowDownloadRegular,
} from '@fluentui/react-icons';
import { apiClient } from '../api/client';
import { ScenarioCardList } from '../components/tests/ScenarioCardList';
import { ScenarioEditorDialog } from '../components/tests/ScenarioEditorDialog';
import { CodePreviewDrawer } from '../components/tests/CodePreviewDrawer';
import { SuiteSolutionSelector } from '../components/tests/SuiteSolutionSelector';
import { SuiteExplorer } from '../components/tests/SuiteExplorer';
import { AiScenarioGeneratorDialog } from '../components/tests/AiScenarioGeneratorDialog';
import { PlaywrightSynthesisModifier } from '../components/tests/PlaywrightSynthesisModifier';

const useStyles = makeStyles({
  page: {
    padding: '24px 32px',
    maxWidth: '1440px',
    margin: '0 auto',
    width: '100%',
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  headerRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '12px',
  },
  primaryTabList: {
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  guideBanner: {
    padding: '16px 20px',
    backgroundColor: tokens.colorNeutralBackground1,
    borderRadius: '8px',
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  guideStepsRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '12px',
    marginTop: '6px',
  },
  guideStepCard: {
    padding: '10px 14px',
    backgroundColor: tokens.colorNeutralBackground2,
    borderRadius: '6px',
    border: `1px solid ${tokens.colorNeutralStroke3}`,
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    fontSize: '12px',
  },
  studioHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '12px',
    backgroundColor: tokens.colorNeutralBackground1,
    padding: '12px 18px',
    borderRadius: '8px',
    border: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  metaBar: {
    padding: '16px 20px',
    backgroundColor: tokens.colorNeutralBackground1,
    borderRadius: '8px',
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    display: 'grid',
    gridTemplateColumns: '1.5fr 1.2fr 1fr 1fr',
    gap: '16px',
    alignItems: 'center',
  },
  actionsBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 0',
  },
  actionGroup: {
    display: 'flex',
    gap: '10px',
    alignItems: 'center',
  },
  codePreviewBox: {
    fontFamily: 'Consolas, "Fira Code", Monaco, monospace',
    fontSize: '12px',
    lineHeight: '1.5',
    backgroundColor: '#1e1e1e',
    color: '#d4d4d4',
    padding: '16px',
    borderRadius: '8px',
    overflowX: 'auto',
    whiteSpace: 'pre',
    border: '1px solid #333',
    maxHeight: '600px',
    overflowY: 'auto',
  },
});

export const TestSuitesPage: React.FC = () => {
  const styles = useStyles();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Top level view: 'explorer' (browse all existing suites) or 'studio' (author/synthesize active suite)
  const [activeView, setActiveView] = useState<'explorer' | 'studio'>('explorer');

  // Studio tabs: 'cards' or 'code'
  const [studioTab, setStudioTab] = useState<'cards' | 'code'>('cards');

  // Show/hide guided explanation
  const [showGuide, setShowGuide] = useState(true);

  // Loaded data
  const [suites, setSuites] = useState<any[]>([]);
  const [solutions, setSolutions] = useState<any[]>([]);
  const [selectedSuiteId, setSelectedSuiteId] = useState<string | null>(null);

  // Active Suite fields in Studio
  const [title, setTitle] = useState('Account Lifecycle & SLA Verification Suite');
  const [solutionId, setSolutionId] = useState<string>('');
  const [targetAppType, setTargetAppType] = useState('model_driven');
  const [targetAppName, setTargetAppName] = useState('Customer Service Hub');
  const [scenarios, setScenarios] = useState<any[]>([]);
  const [generatedCode, setGeneratedCode] = useState<string>('');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [synthesizing, setSynthesizing] = useState(false);
  const [isCodeDrawerOpen, setIsCodeDrawerOpen] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  // Fetch initial data
  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const [suitesRes, solsRes] = await Promise.all([
        apiClient.get('/test-suites').catch(() => ({ data: [] })),
        apiClient.get('/solutions').catch(() => ({ data: [] })),
      ]);

      const loadedSuites = suitesRes.data || [];
      const loadedSolutions = solsRes.data || [];
      setSuites(loadedSuites);
      setSolutions(loadedSolutions);

      // Handle query params
      const qSolutionId = searchParams.get('solutionId');
      const qSuiteId = searchParams.get('suiteId');
      const qTab = searchParams.get('tab');

      let currentSolId = '';
      if (qSolutionId && loadedSolutions.some((s: any) => s.id === qSolutionId)) {
        currentSolId = qSolutionId;
      } else if (loadedSolutions.length > 0) {
        currentSolId = loadedSolutions[0].id;
      }
      setSolutionId(currentSolId);

      // Determine initial suite to load
      if (qSuiteId) {
        const found = loadedSuites.find((s: any) => s.id === qSuiteId);
        if (found) {
          loadSuite(found);
          setActiveView('studio');
          if (qTab === 'code') {
            setStudioTab('code');
          }
          return;
        }
      }

      // Check draft scenarios from chat
      const draftStr = localStorage.getItem('ppqa_draft_scenarios');
      if (draftStr) {
        try {
          const drafts = JSON.parse(draftStr);
          if (Array.isArray(drafts) && drafts.length > 0) {
            setScenarios((prev) => [...prev, ...drafts]);
            localStorage.removeItem('ppqa_draft_scenarios');
            setActiveView('studio');
            return;
          }
        } catch (e) {}
      }

      if (loadedSuites.length > 0) {
        // Load the first suite matching the solution if available
        const matched = loadedSuites.find((s: any) => (s.solution_id || s.solutionId) === currentSolId) || loadedSuites[0];
        loadSuite(matched);
        if (qTab === 'code') {
          setActiveView('studio');
          setStudioTab('code');
        }
      } else {
        // Prepare empty new suite
        resetNewSuite(currentSolId, loadedSolutions);
        if (qTab === 'code') {
          setActiveView('studio');
          setStudioTab('code');
        }
      }
    } catch (err) {
      console.error('Failed to load test suite data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  const loadSuite = (s: any) => {
    setSelectedSuiteId(s.id);
    setTitle(s.title || 'Untitled Test Suite');
    const sId = s.solution_id || s.solutionId || (solutions[0]?.id || '');
    setSolutionId(sId);
    setTargetAppType(s.target_app_type || s.targetAppType || 'model_driven');
    setTargetAppName(s.target_app_name || s.targetAppName || 'Customer Service Hub');
    setScenarios(s.scenarios || []);
    setGeneratedCode(s.generated_code || s.generatedCode || '');
  };

  const resetNewSuite = (solId?: string, solsList = solutions) => {
    const targetSol = solsList.find((s) => s.id === solId) || solsList[0];
    const friendly = targetSol?.friendly_name || targetSol?.unique_name || 'Power Platform';

    setSelectedSuiteId(null);
    setTitle(`${friendly} End-to-End SLA & Form Suite`);
    setSolutionId(targetSol?.id || '');
    setTargetAppType('model_driven');
    setTargetAppName('Customer Service Hub');
    setScenarios([]);
    setGeneratedCode('');
    setActiveView('studio');
    setStudioTab('cards');
  };

  const handleOpenSuite = (suite: any) => {
    loadSuite(suite);
    setActiveView('studio');
  };

  const handleSaveSuite = async () => {
    setSaving(true);
    try {
      const payload = {
        title,
        solutionId: solutionId || (solutions[0]?.id || null),
        targetAppType,
        targetAppName,
        scenarios,
      };

      let savedSuiteId = selectedSuiteId;

      if (selectedSuiteId) {
        const res = await apiClient.put(`/test-suites/${selectedSuiteId}`, payload);
        setGeneratedCode(res.data.generatedCode || '');
      } else {
        const res = await apiClient.post('/test-suites', payload);
        savedSuiteId = res.data.id;
        setSelectedSuiteId(savedSuiteId);
        setGeneratedCode(res.data.generatedCode || '');
      }

      const refetched = await apiClient.get('/test-suites');
      setSuites(refetched.data || []);
      alert('Test suite saved successfully!');
    } catch (err: any) {
      alert(`Save failed: ${err.response?.data?.error || err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleSynthesize = async (options?: { useAi?: boolean; provider?: string }) => {
    setSynthesizing(true);
    try {
      // First save if new
      let suiteIdToSynthesize = selectedSuiteId;
      if (!suiteIdToSynthesize) {
        const saveRes = await apiClient.post('/test-suites', {
          title,
          solutionId: solutionId || (solutions[0]?.id || null),
          targetAppType,
          targetAppName,
          scenarios,
        });
        suiteIdToSynthesize = saveRes.data.id;
        setSelectedSuiteId(suiteIdToSynthesize);
      } else {
        // Update first to ensure current scenario cards are saved
        await apiClient.put(`/test-suites/${suiteIdToSynthesize}`, {
          title,
          solutionId,
          targetAppType,
          targetAppName,
          scenarios,
          preserveCode: true,
        });
      }

      const res = await apiClient.post(`/test-suites/${suiteIdToSynthesize}/synthesize`, {
        useAi: options?.useAi ?? true,
        provider: options?.provider,
      });
      setGeneratedCode(res.data.code);

      // Refresh suites
      const refetched = await apiClient.get('/test-suites');
      setSuites(refetched.data || []);

      setStudioTab('code');
    } catch (err: any) {
      alert(`Synthesis failed: ${err.response?.data?.error || err.message}`);
    } finally {
      setSynthesizing(false);
    }
  };

  const handleRunSuite = async (suiteIdToRun?: string) => {
    const id = suiteIdToRun || selectedSuiteId;
    if (!id) {
      alert('Please save the test suite before running.');
      return;
    }

    try {
      await apiClient.post('/runs', { testSuiteId: id });
      navigate('/runs');
    } catch (err: any) {
      alert(`Failed to queue test run: ${err.response?.data?.error || err.message}`);
    }
  };

  const handleDeleteSuite = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this test suite and its synthesized Playwright spec?')) {
      return;
    }

    try {
      await apiClient.delete(`/test-suites/${id}`);
      const refetched = await apiClient.get('/test-suites');
      setSuites(refetched.data || []);

      if (selectedSuiteId === id) {
        if (refetched.data && refetched.data.length > 0) {
          loadSuite(refetched.data[0]);
        } else {
          resetNewSuite(solutionId, solutions);
        }
      }
    } catch (err: any) {
      alert(`Delete failed: ${err.response?.data?.error || err.message}`);
    }
  };

  const handleImportScenariosFromAi = (newScenarios: any[], replace: boolean = false) => {
    if (replace) {
      setScenarios(newScenarios);
    } else {
      setScenarios([...scenarios, ...newScenarios]);
    }
    setStudioTab('cards');
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(generatedCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleDownloadCode = () => {
    const filename = `${title.toLowerCase().replace(/[^a-z0-9]/g, '-')}.spec.ts`;
    const blob = new Blob([generatedCode], { type: 'text/typescript;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  const activeSolution = solutions.find((s) => s.id === solutionId);

  return (
    <div className={styles.page}>
      {/* Page Title & Main Actions */}
      <div className={styles.headerRow}>
        <div>
          <Title3>Test Suite Studio &amp; Playwright Synthesis</Title3>
          <Text style={{ display: 'block', color: tokens.colorNeutralForeground3, marginTop: '2px' }}>
            Solution-aware automated testing: inspect Dataverse components, author scenario cards, and synthesize official Microsoft Playwright suites.
          </Text>
        </div>

        <div className={styles.actionGroup}>
          <Button
            appearance="subtle"
            icon={showGuide ? <ChevronUpRegular /> : <InfoRegular />}
            onClick={() => setShowGuide(!showGuide)}
          >
            {showGuide ? 'Hide Testing Guide' : 'How It Works'}
          </Button>

          {activeView === 'studio' && (
            <>
              <Button
                appearance="secondary"
                icon={<SaveRegular />}
                onClick={handleSaveSuite}
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Save Suite'}
              </Button>

              <Button
                appearance="primary"
                icon={<SparkleRegular />}
                onClick={() => handleSynthesize({ useAi: true })}
                disabled={synthesizing || scenarios.length === 0}
              >
                {synthesizing ? 'Synthesizing with AI...' : '✨ Synthesize Playwright Code'}
              </Button>

              <Button
                appearance="primary"
                icon={<PlayRegular />}
                onClick={() => handleRunSuite()}
                disabled={!selectedSuiteId}
              >
                Run Test Suite
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Guided Process Banner (Explains Two-Stage Testing & Synthesis Clearly) */}
      {showGuide && (
        <div className={styles.guideBanner}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <InfoRegular style={{ color: '#0078d4', fontSize: '20px' }} />
              <strong>Two-Stage QA Testing &amp; Playwright Synthesis Architecture</strong>
            </div>
            <Button
              size="small"
              appearance="subtle"
              icon={<ChevronUpRegular />}
              onClick={() => setShowGuide(false)}
            />
          </div>

          <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>
            Understand the complete lifecycle from unmanaged Dataverse packages to automated headless browser execution:
          </Text>

          <div className={styles.guideStepsRow}>
            <div className={styles.guideStepCard}>
              <strong style={{ color: '#0078d4' }}>Step 1: Solution Selection</strong>
              <span>
                Link your test suite to an extracted Dataverse solution. The AI uses its real tables, columns, flows, and bots to scope test authoring.
              </span>
            </div>

            <div className={styles.guideStepCard}>
              <strong style={{ color: '#107c41' }}>Step 2: Interactive Scenario Cards</strong>
              <span>
                Define human-readable test cases with preconditions, command bar steps, form inputs, and expected verifications. Use AI generation or add manually.
              </span>
            </div>

            <div className={styles.guideStepCard}>
              <strong style={{ color: '#5c2d91' }}>Step 3: Playwright Synthesis</strong>
              <span>
                Click <em>Generate Playwright Code</em>. The synthesizer compiles your cards into strongly-typed TypeScript utilizing Microsoft Page Object Models (POM).
              </span>
            </div>

            <div className={styles.guideStepCard}>
              <strong style={{ color: '#d83b01' }}>Step 4: Automated Execution &amp; Traces</strong>
              <span>
                Click <em>Run Test Suite</em> to execute tests in headless Chromium using Dual-Domain SSO. Review HTML reports, screenshots, and video recordings.
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Top Primary View Tabs: Existing Test Suites vs Suite Studio */}
      <TabList
        selectedValue={activeView}
        onTabSelect={(_, data) => setActiveView(data.value as any)}
        className={styles.primaryTabList}
      >
        <Tab value="explorer" icon={<DocumentBulletListRegular />}>
          Existing Test Suites ({suites.length})
        </Tab>
        <Tab value="studio" icon={<CodeRegular />}>
          {selectedSuiteId ? `Suite Studio: ${title}` : 'Suite Studio: New Test Suite'}
        </Tab>
      </TabList>

      {/* VIEW 1: Existing Test Suites Explorer */}
      {activeView === 'explorer' && (
        <SuiteExplorer
          suites={suites}
          solutions={solutions}
          selectedSolutionId={solutionId || 'all'}
          onSelectSolution={(solId) => {
            setSolutionId(solId);
            setSearchParams({ solutionId: solId });
          }}
          onOpenSuite={handleOpenSuite}
          onNewSuite={() => resetNewSuite(solutionId, solutions)}
          onViewCode={(s) => {
            loadSuite(s);
            setIsCodeDrawerOpen(true);
          }}
          onModifyCode={(s) => {
            loadSuite(s);
            setActiveView('studio');
            setStudioTab('code');
          }}
          onRunSuite={handleRunSuite}
          onDeleteSuite={handleDeleteSuite}
        />
      )}

      {/* VIEW 2: Suite Studio & Playwright Synthesis */}
      {activeView === 'studio' && (
        <>
          {/* Solution Selector & Context Banner */}
          <SuiteSolutionSelector
            solutions={solutions}
            selectedSolutionId={solutionId}
            onSelectSolution={(solId) => {
              setSolutionId(solId);
              setSearchParams({ solutionId: solId });
            }}
          />

          {/* Suite Switcher & Quick Navigation Header */}
          <div className={styles.studioHeader}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Text weight="semibold">Active Test Suite:</Text>
              <Dropdown
                style={{ minWidth: '280px' }}
                value={title}
                selectedOptions={[selectedSuiteId || '']}
                onOptionSelect={(_, data) => {
                  const target = suites.find((s) => s.id === data.optionValue);
                  if (target) loadSuite(target);
                }}
              >
                {suites.map((s) => (
                  <Option key={s.id} value={s.id} text={s.title}>
                    📄 {s.title} ({s.scenarios?.length || 0} scenarios)
                  </Option>
                ))}
              </Dropdown>
            </div>

            <div className={styles.actionGroup}>
              <Button
                appearance="subtle"
                icon={<AddRegular />}
                onClick={() => resetNewSuite(solutionId, solutions)}
              >
                + New Suite
              </Button>

              <AiScenarioGeneratorDialog
                solution={activeSolution}
                onImportScenarios={handleImportScenariosFromAi}
                defaultAppType={targetAppType}
                defaultAppName={targetAppName}
              />
            </div>
          </div>

          {/* Meta Configuration Bar */}
          <div className={styles.metaBar}>
            <Field label="Suite Title" required>
              <Input
                value={title}
                onChange={(e, data) => setTitle(data.value)}
                placeholder="e.g. Account Lifecycle & SLA Verification Suite"
              />
            </Field>

            <Field label="Target Power Platform Solution">
              <Dropdown
                value={activeSolution?.friendly_name || activeSolution?.unique_name || 'Select Solution...'}
                selectedOptions={[solutionId]}
                onOptionSelect={(_, data) => setSolutionId(data.optionValue as string)}
              >
                {solutions.map((sol) => (
                  <Option key={sol.id} value={sol.id} text={sol.friendly_name || sol.unique_name}>
                    {sol.friendly_name || sol.unique_name}
                  </Option>
                ))}
              </Dropdown>
            </Field>

            <Field label="Target Platform Type">
              <Dropdown
                value={
                  targetAppType === 'model_driven'
                    ? 'Model-Driven App'
                    : targetAppType === 'canvas'
                    ? 'Canvas App'
                    : 'Copilot Studio Agent'
                }
                selectedOptions={[targetAppType]}
                onOptionSelect={(_, data) => setTargetAppType(data.optionValue as string)}
              >
                <Option value="model_driven">Model-Driven App</Option>
                <Option value="canvas">Canvas App</Option>
                <Option value="copilot">Copilot Studio Agent</Option>
              </Dropdown>
            </Field>

            <Field label="Target App / Model Name">
              <Input
                value={targetAppName}
                onChange={(e, data) => setTargetAppName(data.value)}
                placeholder="Customer Service Hub"
              />
            </Field>
          </div>

          {/* Sub Tab Switcher: Interactive Scenario Cards vs Synthesized Playwright Code */}
          <TabList
            selectedValue={studioTab}
            onTabSelect={(_, data) => setStudioTab(data.value as any)}
            style={{ borderBottom: `1px solid ${tokens.colorNeutralStroke2}` }}
          >
            <Tab value="cards" icon={<DocumentBulletListRegular />}>
              Interactive Scenario Cards ({scenarios.length})
            </Tab>
            <Tab value="code" icon={<CodeRegular />}>
              Playwright Synthesis &amp; AI Modifier (.spec.ts)
              {generatedCode && (
                <Badge size="small" appearance="filled" color="success" style={{ marginLeft: '6px' }}>
                  Ready
                </Badge>
              )}
            </Tab>
          </TabList>

          {/* TAB 1: Scenario Cards View */}
          {studioTab === 'cards' && (
            <>
              <div className={styles.actionsBar}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Text weight="semibold">
                    Interactive Scenario Cards ({scenarios.length})
                  </Text>
                  <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>
                    — Visual behavioral specifications compiled into Microsoft Power Platform Page Object Models
                  </Text>
                </div>

                <div className={styles.actionGroup}>
                  <AiScenarioGeneratorDialog
                    solution={activeSolution}
                    onImportScenarios={handleImportScenariosFromAi}
                    defaultAppType={targetAppType}
                    defaultAppName={targetAppName}
                    triggerButton={
                      <Button appearance="secondary" icon={<SparkleRegular />}>
                        ✨ AI Generate Scenarios
                      </Button>
                    }
                  />

                  <ScenarioEditorDialog
                    onSave={(newScenario) => setScenarios([...scenarios, newScenario])}
                  />
                </div>
              </div>

              <ScenarioCardList
                scenarios={scenarios}
                onUpdateScenarios={setScenarios}
              />
            </>
          )}

          {/* TAB 2: Playwright Synthesis & AI Modification Studio */}
          {studioTab === 'code' && (
            generatedCode ? (
              <PlaywrightSynthesisModifier
                suiteId={selectedSuiteId}
                suiteTitle={title}
                solutionId={solutionId}
                targetAppType={targetAppType}
                targetAppName={targetAppName}
                scenarios={scenarios}
                code={generatedCode}
                onSaveCode={async (newCode) => {
                  setGeneratedCode(newCode);
                  const refetched = await apiClient.get('/test-suites');
                  setSuites(refetched.data || []);
                }}
                onRunSuite={() => handleRunSuite()}
                onResynthesize={() => handleSynthesize({ useAi: true })}
                isSynthesizing={synthesizing}
                initialErrorLog={searchParams.get('errorLog') || ''}
              />
            ) : (
              <div style={{ textAlign: 'center', padding: '48px 24px', backgroundColor: tokens.colorNeutralBackground1, borderRadius: '8px', border: `1px solid ${tokens.colorNeutralStroke2}` }}>
                <CodeRegular style={{ fontSize: '48px', color: '#0078d4', marginBottom: '8px' }} />
                <Title3 style={{ fontSize: '18px', display: 'block' }}>Playwright Code Not Synthesized Yet</Title3>
                <Text style={{ color: tokens.colorNeutralForeground3, display: 'block', margin: '8px 0 16px' }}>
                  Click <strong>Generate Playwright Code</strong> to compile your {scenarios.length} interactive scenario cards into strongly-typed Microsoft Page Object Model tests, or initialize an editable template to customize with the AI Assistant.
                </Text>
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                  <Button
                    appearance="primary"
                    icon={<SparkleRegular />}
                    onClick={() => handleSynthesize({ useAi: true })}
                    disabled={synthesizing || scenarios.length === 0}
                  >
                    {synthesizing ? 'Synthesizing...' : '✨ Generate Playwright Code Now'}
                  </Button>
                  <Button
                    appearance="secondary"
                    icon={<CodeRegular />}
                    onClick={() => {
                      setGeneratedCode(`import { test, expect } from '@playwright/test';\nimport { AppProvider, LoginPage, ModelDrivenAppPage, GridComponent, FormComponent, CopilotChatComponent } from '../templates/pom';\n\ntest.describe('${title}', () => {\n  let appProvider: AppProvider;\n  let loginPage: LoginPage;\n  let modelApp: ModelDrivenAppPage;\n  let grid: GridComponent;\n  let form: FormComponent;\n  let copilot: CopilotChatComponent;\n\n  test.beforeEach(async ({ page }) => {\n    appProvider = new AppProvider(page);\n    loginPage = new LoginPage(page);\n    modelApp = new ModelDrivenAppPage(page);\n    grid = new GridComponent(page);\n    form = new FormComponent(page);\n    copilot = new CopilotChatComponent(page);\n    await appProvider.navigateToApp(process.env.PP_APP_URL || 'https://org.crm.dynamics.com');\n    if (await loginPage.isLoginPage()) { await loginPage.login(); }\n    await appProvider.waitForAppReady();\n  });\n\n  test('Sample Scenario', async ({ page }) => {\n    await test.step('Navigate and perform actions', async () => {\n      // Use the AI Assistant on the right to author steps or fix issues\n    });\n  });\n});\n`);
                    }}
                  >
                    Open Blank Studio Template
                  </Button>
                </div>
              </div>
            )
          )}
        </>
      )}

      {/* Side Drawer for Full-Screen Code Inspection */}
      <CodePreviewDrawer
        open={isCodeDrawerOpen}
        onClose={() => setIsCodeDrawerOpen(false)}
        suiteTitle={title}
        code={generatedCode}
        onRunSuite={() => handleRunSuite()}
        onResynthesizeAi={() => handleSynthesize({ useAi: true })}
        isSynthesizing={synthesizing}
        onOpenStudio={() => {
          setIsCodeDrawerOpen(false);
          setActiveView('studio');
          setStudioTab('code');
        }}
      />
    </div>
  );
};

export default TestSuitesPage;
