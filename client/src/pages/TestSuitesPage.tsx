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
  TableRegular,
  BotRegular,
  SearchRegular,
  FormRegular,
  ArrowRightRegular,
} from '@fluentui/react-icons';
import { apiClient } from '../api/client';
import { ScenarioCardList } from '../components/tests/ScenarioCardList';
import { ScenarioEditorDialog } from '../components/tests/ScenarioEditorDialog';
import { CodePreviewDrawer } from '../components/tests/CodePreviewDrawer';
import { SuiteSolutionSelector } from '../components/tests/SuiteSolutionSelector';
import { SuiteExplorer } from '../components/tests/SuiteExplorer';
import { AiScenarioGeneratorDialog } from '../components/tests/AiScenarioGeneratorDialog';
import { PlaywrightSynthesisModifier } from '../components/tests/PlaywrightSynthesisModifier';
import { useAiModel } from '../context/AiModelContext';

const useStyles = makeStyles({
  page: {
    padding: '24px 32px 80px 32px', // Bottom padding for sticky action bar
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
  stepperContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 12px',
    backgroundColor: tokens.colorNeutralBackground1,
    borderRadius: '8px',
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    flexWrap: 'wrap',
  },
  stepButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 16px',
    borderRadius: '6px',
    border: 'none',
    backgroundColor: 'transparent',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '500',
    color: tokens.colorNeutralForeground2,
    transition: 'all 0.15s ease',
    ':hover': {
      backgroundColor: tokens.colorNeutralBackground1Hover,
      color: tokens.colorNeutralForeground1,
    },
  },
  activeStepButton: {
    backgroundColor: 'rgba(116, 39, 116, 0.12)',
    color: '#742774',
    fontWeight: '600',
    ':hover': {
      backgroundColor: 'rgba(116, 39, 116, 0.18)',
      color: '#742774',
    },
  },
  stepperDivider: {
    color: tokens.colorNeutralStroke1,
    fontSize: '14px',
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
  templatesBar: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 14px',
    backgroundColor: tokens.colorNeutralBackground2,
    borderRadius: '6px',
    border: `1px solid ${tokens.colorNeutralStroke3}`,
    flexWrap: 'wrap',
  },
  actionsBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 0',
    flexWrap: 'wrap',
    gap: '10px',
  },
  actionGroup: {
    display: 'flex',
    gap: '10px',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  stickyActionBar: {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: tokens.colorNeutralBackground1,
    borderTop: `1px solid ${tokens.colorNeutralStroke2}`,
    padding: '10px 32px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    boxShadow: '0 -4px 12px rgba(0,0,0,0.08)',
    zIndex: 100,
    flexWrap: 'wrap',
    gap: '12px',
  },
});

export const TestSuitesPage: React.FC = () => {
  const styles = useStyles();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { modelConfig, getShortModelLabel } = useAiModel();

  // Top level view: 'explorer' or 'studio'
  const [activeView, setActiveView] = useState<'explorer' | 'studio'>('explorer');

  // Studio step: 'scenarios' | 'code' | 'run'
  const [studioStep, setStudioStep] = useState<'scenarios' | 'code' | 'run'>('scenarios');

  // Show/hide guided explanation
  const [showGuide, setShowGuide] = useState(false);

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

  // Track unsaved status
  const [isModified, setIsModified] = useState(false);

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
            setStudioStep('code');
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
            setIsModified(true);
            return;
          }
        } catch (e) {}
      }

      if (loadedSuites.length > 0) {
        const matched = loadedSuites.find((s: any) => (s.solution_id || s.solutionId) === currentSolId) || loadedSuites[0];
        loadSuite(matched);
        if (qTab === 'code') {
          setActiveView('studio');
          setStudioStep('code');
        }
      } else {
        resetNewSuite(currentSolId, loadedSolutions);
        if (qTab === 'code') {
          setActiveView('studio');
          setStudioStep('code');
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
    setIsModified(false);
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
    setStudioStep('scenarios');
    setIsModified(true);
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
      setIsModified(false);
      alert('Test suite saved successfully!');
    } catch (err: any) {
      alert(`Save failed: ${err.response?.data?.error || err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleSynthesize = async (options?: { useAi?: boolean; provider?: string; model?: string }) => {
    setSynthesizing(true);
    try {
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
        provider: options?.provider || modelConfig.provider,
        model: options?.model || modelConfig.model,
      });
      setGeneratedCode(res.data.code);

      const refetched = await apiClient.get('/test-suites');
      setSuites(refetched.data || []);

      setStudioStep('code');
      setIsModified(false);
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
      navigate(`/runs?suiteId=${id}`);
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
        if (refetched.data.length > 0) {
          loadSuite(refetched.data[0]);
        } else {
          resetNewSuite(solutionId, solutions);
        }
      }
    } catch (err: any) {
      alert(`Delete failed: ${err.response?.data?.error || err.message}`);
    }
  };

  // Quick scenario template insertion handlers
  const handleAddTemplate = (type: 'form' | 'grid' | 'copilot' | 'blank') => {
    setIsModified(true);
    const id = `scenario-${Date.now()}`;
    let newCard: any;

    if (type === 'form') {
      newCard = {
        id,
        title: 'Create Entity Record & Verify SLA Timeline',
        targetAppType: targetAppType || 'model_driven',
        steps: [
          'Navigate to the active Model-Driven application and open the main entity grid',
          'Click "+ New" in the Power Platform command bar to launch the main creation form',
          'Fill required entity attributes (Name, Primary Contact, Category, Description)',
          'Click "Save" and wait for the record ID and form confirmation banner',
        ],
        verifications: [
          'Form save confirmation banner "Your changes were saved" is displayed without errors',
          'Header status displays "Active" and record ID is populated in the URL',
          'SLA Timer component initiates with correct SLA milestone target calculation',
        ],
      };
    } else if (type === 'grid') {
      newCard = {
        id,
        title: 'Entity View Lookup, Quick Find & Column Filtering',
        targetAppType: targetAppType || 'model_driven',
        steps: [
          'Open the main entity grid view from the sitemap navigation',
          'Enter test search keyword into the Power Apps Quick Find search box',
          'Press Enter and wait for the Dataverse grid to refresh matching rows',
          'Open column filter for Status Reason and select "Active"',
        ],
        verifications: [
          'Grid results list matches the search term without Dataverse timeout errors',
          'Total record count indicator in bottom status bar accurately updates',
          'First row can be clicked to open the target read-only record form',
        ],
      };
    } else if (type === 'copilot') {
      newCard = {
        id,
        title: 'Copilot Studio Conversational Turn & Intent Matching',
        targetAppType: 'copilot',
        steps: [
          'Launch Copilot Studio side-pane chat interface inside the app',
          'Send trigger prompt: "Check SLA status for high priority customer incident"',
          'Wait for bot thinking indicator and adaptive card response',
        ],
        verifications: [
          'Copilot responds within 5000ms with recognized topic intent',
          'Adaptive card renders accurate Dataverse entity lookup card',
          'Follow-up suggestion chips appear and remain clickable',
        ],
      };
    } else {
      newCard = {
        id,
        title: `Custom Test Scenario #${scenarios.length + 1}`,
        targetAppType: targetAppType || 'model_driven',
        steps: ['Open application and verify initial page ready state'],
        verifications: ['Target element is rendered and interactive'],
      };
    }

    setScenarios([...scenarios, newCard]);
  };

  const handleImportScenariosFromAi = (newScenarios: any[], replace = false) => {
    setIsModified(true);
    if (replace) {
      setScenarios(newScenarios);
    } else {
      setScenarios([...scenarios, ...newScenarios]);
    }
    setStudioStep('scenarios');
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
        </div>
      </div>

      {/* Guided Process Banner */}
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
              <strong style={{ color: '#0078d4' }}>Step 1: Scenarios &amp; Behavior</strong>
              <span>
                Define human-readable test cases with preconditions, command bar steps, and verifications using fast templates or AI.
              </span>
            </div>

            <div className={styles.guideStepCard}>
              <strong style={{ color: '#107c41' }}>Step 2: Playwright Synthesis</strong>
              <span>
                Click <em>Synthesize Playwright Code</em> to compile scenarios into strongly-typed TypeScript utilizing Microsoft POMs.
              </span>
            </div>

            <div className={styles.guideStepCard}>
              <strong style={{ color: '#742774' }}>Step 3: Automated Execution &amp; Traces</strong>
              <span>
                Execute tests in headless Chromium using Dual-Domain SSO. Review live console logs, HTML reports, and traces.
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
            setStudioStep('code');
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
              setIsModified(true);
            }}
          />

          {/* 3-Step Guided Studio Stepper */}
          <div className={styles.stepperContainer}>
            <button
              type="button"
              className={`${styles.stepButton} ${studioStep === 'scenarios' ? styles.activeStepButton : ''}`}
              onClick={() => setStudioStep('scenarios')}
            >
              <span>1. Define Scenarios</span>
              <Badge appearance={studioStep === 'scenarios' ? 'filled' : 'outline'} color="brand">
                {scenarios.length} cards
              </Badge>
            </button>

            <span className={styles.stepperDivider}>&rarr;</span>

            <button
              type="button"
              className={`${styles.stepButton} ${studioStep === 'code' ? styles.activeStepButton : ''}`}
              onClick={() => setStudioStep('code')}
            >
              <span>2. Synthesize &amp; Refine Script</span>
              {generatedCode ? (
                <Badge appearance="filled" color="success">
                  Ready
                </Badge>
              ) : (
                <Badge appearance="outline" color="informative">
                  Not Synthesized
                </Badge>
              )}
            </button>

            <span className={styles.stepperDivider}>&rarr;</span>

            <button
              type="button"
              className={`${styles.stepButton} ${studioStep === 'run' ? styles.activeStepButton : ''}`}
              onClick={() => {
                if (selectedSuiteId) {
                  navigate(`/runs?suiteId=${selectedSuiteId}`);
                } else {
                  handleSaveSuite();
                }
              }}
            >
              <span>3. Run &amp; Live Reports</span>
              <PlayRegular style={{ fontSize: '14px' }} />
            </button>
          </div>

          {/* Suite Switcher & Quick Meta Header */}
          <div className={styles.studioHeader}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
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

              {isModified && (
                <Badge appearance="tint" color="warning">
                  Unsaved changes
                </Badge>
              )}
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
                onChange={(e, data) => {
                  setTitle(data.value);
                  setIsModified(true);
                }}
                placeholder="e.g. Account Lifecycle & SLA Verification Suite"
              />
            </Field>

            <Field label="Target Power Platform Solution">
              <Dropdown
                value={activeSolution?.friendly_name || activeSolution?.unique_name || 'Select Solution...'}
                selectedOptions={[solutionId]}
                onOptionSelect={(_, data) => {
                  setSolutionId(data.optionValue as string);
                  setIsModified(true);
                }}
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
                onOptionSelect={(_, data) => {
                  setTargetAppType(data.optionValue as string);
                  setIsModified(true);
                }}
              >
                <Option value="model_driven">Model-Driven App</Option>
                <Option value="canvas">Canvas App</Option>
                <Option value="copilot">Copilot Studio Agent</Option>
              </Dropdown>
            </Field>

            <Field label="Target App / Model Name">
              <Input
                value={targetAppName}
                onChange={(e, data) => {
                  setTargetAppName(data.value);
                  setIsModified(true);
                }}
                placeholder="Customer Service Hub"
              />
            </Field>
          </div>

          {/* STEP 1: Scenario Cards View */}
          {studioStep === 'scenarios' && (
            <>
              {/* Quick Scenario Templates Bar */}
              <div className={styles.templatesBar}>
                <Text weight="semibold" size={200} style={{ marginRight: '6px' }}>
                  Quick Add Template:
                </Text>
                <Button
                  size="small"
                  appearance="secondary"
                  icon={<FormRegular />}
                  onClick={() => handleAddTemplate('form')}
                >
                  + Form Create &amp; Save
                </Button>
                <Button
                  size="small"
                  appearance="secondary"
                  icon={<SearchRegular />}
                  onClick={() => handleAddTemplate('grid')}
                >
                  + Grid Search &amp; Filter
                </Button>
                <Button
                  size="small"
                  appearance="secondary"
                  icon={<BotRegular />}
                  onClick={() => handleAddTemplate('copilot')}
                >
                  + Copilot Chat Turn
                </Button>
                <Button
                  size="small"
                  appearance="subtle"
                  icon={<AddRegular />}
                  onClick={() => handleAddTemplate('blank')}
                >
                  + Blank Card
                </Button>
              </div>

              <div className={styles.actionsBar}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Text weight="semibold">
                    Interactive Scenario Cards ({scenarios.length})
                  </Text>
                  <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>
                    — Visual behavioral specifications compiled into Microsoft Page Object Models
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
                    onSave={(newScenario) => {
                      setScenarios([...scenarios, newScenario]);
                      setIsModified(true);
                    }}
                  />

                  <Button
                    appearance="primary"
                    icon={<ArrowRightRegular />}
                    iconPosition="after"
                    onClick={() => setStudioStep('code')}
                  >
                    Proceed to Script Synthesis &rarr;
                  </Button>
                </div>
              </div>

              <ScenarioCardList
                scenarios={scenarios}
                onUpdateScenarios={(updated) => {
                  setScenarios(updated);
                  setIsModified(true);
                }}
              />
            </>
          )}

          {/* STEP 2: Playwright Synthesis & AI Studio */}
          {studioStep === 'code' && (
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
                  setIsModified(false);
                }}
                onRunSuite={() => handleRunSuite()}
                onResynthesize={() => handleSynthesize({ useAi: true })}
                isSynthesizing={synthesizing}
                initialErrorLog={searchParams.get('errorLog') || ''}
              />
            ) : (
              <div style={{ textAlign: 'center', padding: '48px 24px', backgroundColor: tokens.colorNeutralBackground1, borderRadius: '8px', border: `1px solid ${tokens.colorNeutralStroke2}` }}>
                <CodeRegular style={{ fontSize: '48px', color: '#742774', marginBottom: '8px' }} />
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
                    {synthesizing ? 'Synthesizing...' : `✨ Generate Playwright Code (${modelConfig.model})`}
                  </Button>
                  <Button
                    appearance="secondary"
                    icon={<CodeRegular />}
                    onClick={() => {
                      setGeneratedCode(`import { test, expect } from '@playwright/test';\nimport { AppProvider, LoginPage, ModelDrivenAppPage, GridComponent, FormComponent, CopilotChatComponent } from '../templates/pom';\n\ntest.describe('${title}', () => {\n  let appProvider: AppProvider;\n  let loginPage: LoginPage;\n  let modelApp: ModelDrivenAppPage;\n  let grid: GridComponent;\n  let form: FormComponent;\n  let copilot: CopilotChatComponent;\n\n  test.beforeEach(async ({ page }) => {\n    appProvider = new AppProvider(page);\n    loginPage = new LoginPage(page);\n    modelApp = new ModelDrivenAppPage(page);\n    grid = new GridComponent(page);\n    form = new FormComponent(page);\n    copilot = new CopilotChatComponent(page);\n    await appProvider.navigateToApp(process.env.PP_APP_URL || 'https://org.crm.dynamics.com');\n    if (await loginPage.isLoginPage()) { await loginPage.login(); }\n    await appProvider.waitForAppReady();\n  });\n\n  test('Sample Scenario', async ({ page }) => {\n    await test.step('Navigate and perform actions', async () => {\n      // Use the AI Assistant on the right to author steps or fix issues\n    });\n  });\n});\n`);
                      setIsModified(true);
                    }}
                  >
                    Open Blank Studio Template
                  </Button>
                </div>
              </div>
            )
          )}

          {/* Sticky Bottom Quick-Action Bar */}
          <div className={styles.stickyActionBar}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Text weight="semibold" style={{ fontSize: '14px' }}>
                {title}
              </Text>
              <Badge appearance="outline">
                {scenarios.length} scenarios
              </Badge>
              {isModified ? (
                <Badge appearance="filled" color="warning">
                  Unsaved changes
                </Badge>
              ) : (
                <Badge appearance="tint" color="success">
                  Saved
                </Badge>
              )}
              <Tooltip content={`Active AI Model for Synthesis: ${getShortModelLabel()}`} relationship="label">
                <Badge appearance="tint" color="informative" icon={<SparkleRegular />}>
                  {getShortModelLabel()}
                </Badge>
              </Tooltip>
            </div>

            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <Button
                appearance="secondary"
                icon={<SaveRegular />}
                onClick={handleSaveSuite}
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Save Suite'}
              </Button>

              <Button
                appearance="secondary"
                icon={<SparkleRegular />}
                onClick={() => handleSynthesize({ useAi: true })}
                disabled={synthesizing || scenarios.length === 0}
              >
                {synthesizing ? 'Synthesizing...' : '⚡ Synthesize Script'}
              </Button>

              <Button
                appearance="primary"
                icon={<PlayRegular />}
                onClick={() => handleRunSuite()}
                disabled={!selectedSuiteId && scenarios.length === 0}
              >
                ▶ Run Suite
              </Button>
            </div>
          </div>
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
          setStudioStep('code');
        }}
      />
    </div>
  );
};

export default TestSuitesPage;
