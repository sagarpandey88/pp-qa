import React, { useState } from 'react';
import {
  Dialog,
  DialogTrigger,
  DialogSurface,
  DialogTitle,
  DialogBody,
  DialogActions,
  DialogContent,
  Field,
  Input,
  Textarea,
  Button,
  Dropdown,
  Option,
  Badge,
  Text,
  Spinner,
  Checkbox,
  makeStyles,
  tokens,
} from '@fluentui/react-components';
import {
  SparkleRegular,
  TableRegular,
  ArrowSyncRegular,
  BotRegular,
  CheckmarkRegular,
  DismissRegular,
  DocumentBulletListRegular,
} from '@fluentui/react-icons';
import { apiClient } from '../../api/client';

const useStyles = makeStyles({
  surface: {
    maxWidth: '750px',
    width: '100%',
    maxHeight: '90vh',
    display: 'flex',
    flexDirection: 'column',
  },
  content: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    overflowY: 'auto',
    padding: '8px 0',
  },
  solutionBanner: {
    padding: '12px 16px',
    backgroundColor: tokens.colorNeutralBackground2,
    borderRadius: '6px',
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  previewSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    marginTop: '8px',
  },
  scenarioCard: {
    padding: '12px',
    backgroundColor: tokens.colorNeutralBackground1,
    borderRadius: '6px',
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  scenarioHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stepsBox: {
    backgroundColor: tokens.colorNeutralBackground2,
    padding: '8px 12px',
    borderRadius: '4px',
    fontSize: '12px',
  },
});

interface AiScenarioGeneratorDialogProps {
  solution: any;
  onImportScenarios: (newScenarios: any[], replace?: boolean) => void;
  triggerButton?: React.ReactElement;
  defaultAppType?: string;
  defaultAppName?: string;
}

export const AiScenarioGeneratorDialog: React.FC<AiScenarioGeneratorDialogProps> = ({
  solution,
  onImportScenarios,
  triggerButton,
  defaultAppType = 'model_driven',
  defaultAppName = 'Customer Service Hub',
}) => {
  const styles = useStyles();
  const [open, setOpen] = useState(false);
  const [focusArea, setFocusArea] = useState('all');
  const [targetAppType, setTargetAppType] = useState(defaultAppType);
  const [targetAppName, setTargetAppName] = useState(defaultAppName);
  const [engineProvider, setEngineProvider] = useState('byok');
  const [customPrompt, setCustomPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [generatedScenarios, setGeneratedScenarios] = useState<any[]>([]);
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!solution?.id) {
      setError('Please select a solution first before generating test scenarios.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.post('/test-suites/generate-scenarios', {
        solutionId: solution.id,
        focusArea,
        prompt: customPrompt,
        targetAppType,
        targetAppName,
        provider: engineProvider === 'byok' ? undefined : engineProvider,
      });

      const list = res.data?.scenarios || [];
      setGeneratedScenarios(list);
      // Select all by default
      setSelectedIndices(new Set(list.map((_: any, idx: number) => idx)));
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to generate test scenarios');
    } finally {
      setLoading(false);
    }
  };

  const toggleSelect = (index: number) => {
    const next = new Set(selectedIndices);
    if (next.has(index)) {
      next.delete(index);
    } else {
      next.add(index);
    }
    setSelectedIndices(next);
  };

  const handleApply = (replace: boolean = false) => {
    const chosen = generatedScenarios.filter((_, idx) => selectedIndices.has(idx));
    if (chosen.length === 0) {
      alert('Please select at least one scenario to import.');
      return;
    }
    onImportScenarios(chosen, replace);
    setOpen(false);
    setGeneratedScenarios([]);
  };

  return (
    <Dialog open={open} onOpenChange={(_, data) => setOpen(data.open)}>
      <DialogTrigger disableButtonEnhancement>
        {triggerButton || (
          <Button appearance="primary" icon={<SparkleRegular />}>
            ✨ AI Generate Scenarios
          </Button>
        )}
      </DialogTrigger>

      <DialogSurface className={styles.surface}>
        <DialogBody>
          <DialogTitle>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <SparkleRegular style={{ color: '#0078d4', fontSize: '22px' }} />
              <span>AI Scenario Synthesis for Solution</span>
            </div>
          </DialogTitle>

          <DialogContent className={styles.content}>
            {/* Active Solution Info */}
            <div className={styles.solutionBanner}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text weight="semibold">
                  Analyzing Solution: {solution?.friendly_name || solution?.unique_name || 'No solution selected'}
                </Text>
                {solution?.version && <Badge appearance="outline">v{solution.version}</Badge>}
              </div>

              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '4px' }}>
                <Badge appearance="tint" color="success" icon={<TableRegular />}>
                  {solution?.table_count ?? 'Dataverse'} Tables Grounded
                </Badge>
                <Badge appearance="tint" color="warning" icon={<ArrowSyncRegular />}>
                  {solution?.flow_count ?? 'Automated'} Flows Grounded
                </Badge>
                <Badge appearance="tint" color="informative" icon={<BotRegular />}>
                  {solution?.bot_count ?? 'Copilot'} Bots Grounded
                </Badge>
              </div>
            </div>

            {error && (
              <div style={{ padding: '10px 14px', backgroundColor: '#fde7e9', color: '#a80000', borderRadius: '6px', fontSize: '13px' }}>
                {error}
              </div>
            )}

            {/* Config Fields */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <Field label="Generation Scope &amp; Focus Area">
                <Dropdown
                  value={
                    focusArea === 'all'
                      ? 'Full Solution End-to-End (All Components)'
                      : focusArea === 'entity_crud'
                      ? 'Dataverse Entity Forms & Grids (CRUD)'
                      : focusArea === 'relationships'
                      ? 'Parent-Child Relational Flows & Subgrids'
                      : focusArea === 'cloud_flows'
                      ? 'Cloud Flows & SLA Escalations'
                      : focusArea === 'copilot_agent'
                      ? 'Copilot Studio Conversational Agents'
                      : 'Custom Prompt Focus'
                  }
                  selectedOptions={[focusArea]}
                  onOptionSelect={(_, data) => setFocusArea(data.optionValue as string)}
                >
                  <Option value="all">Full Solution End-to-End (All Components)</Option>
                  <Option value="entity_crud">Dataverse Entity Forms &amp; Grids (CRUD)</Option>
                  <Option value="relationships">Parent-Child Relational Flows &amp; Subgrids</Option>
                  <Option value="cloud_flows">Cloud Flows &amp; SLA Escalations</Option>
                  <Option value="copilot_agent">Copilot Studio Conversational Agents</Option>
                  <Option value="custom">Custom Prompt Focus</Option>
                </Dropdown>
              </Field>

              <Field label="AI / Synthesis Engine">
                <Dropdown
                  value={
                    engineProvider === 'byok'
                      ? 'Agentic AI (Auto BYOK / Vault)'
                      : engineProvider === 'openai'
                      ? 'OpenAI (GPT-4o)'
                      : engineProvider === 'azure_openai'
                      ? 'Azure OpenAI Service'
                      : engineProvider === 'gemini'
                      ? 'Google Gemini (Gemini 2.0 Flash)'
                      : 'Metadata Engine (Offline)'
                  }
                  selectedOptions={[engineProvider]}
                  onOptionSelect={(_, data) => setEngineProvider(data.optionValue as string)}
                >
                  <Option value="byok">Agentic AI (Auto BYOK / Vault)</Option>
                  <Option value="openai">OpenAI (GPT-4o)</Option>
                  <Option value="azure_openai">Azure OpenAI Service</Option>
                  <Option value="gemini">Google Gemini (Gemini 2.0 Flash)</Option>
                  <Option value="metadata">Metadata Engine (Offline Fast)</Option>
                </Dropdown>
              </Field>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <Field label="Target Power Platform Component">
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

              <Field label="Target App or Agent Name">
                <Input
                  value={targetAppName}
                  onChange={(e, data) => setTargetAppName(data.value)}
                  placeholder="e.g. Customer Service Hub or Support Copilot"
                />
              </Field>
            </div>

            {focusArea === 'custom' && (
              <Field label="Custom Requirements Prompt">
                <Textarea
                  rows={2}
                  value={customPrompt}
                  onChange={(e, data) => setCustomPrompt(data.value)}
                  placeholder="e.g. Test VIP account creation with required phone validation and automatic escalation trigger"
                />
              </Field>
            )}

            <Button
              appearance="primary"
              icon={loading ? <Spinner size="tiny" /> : <SparkleRegular />}
              onClick={handleGenerate}
              disabled={loading || !solution?.id}
            >
              {loading ? 'Synthesizing Scenarios with Agentic AI...' : 'Generate Grounded Test Scenarios'}
            </Button>

            {/* Generated Scenarios Preview */}
            {generatedScenarios.length > 0 && (
              <div className={styles.previewSection}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text weight="semibold">
                    Synthesized Scenarios ({generatedScenarios.length}):
                  </Text>
                  <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>
                    Select scenarios to add to your test suite
                  </Text>
                </div>

                {generatedScenarios.map((sc, idx) => {
                  const isChecked = selectedIndices.has(idx);
                  return (
                    <div key={idx} className={styles.scenarioCard}>
                      <div className={styles.scenarioHeader}>
                        <Checkbox
                          checked={isChecked}
                          onChange={() => toggleSelect(idx)}
                          label={
                            <span style={{ fontWeight: '600' }}>
                              #{idx + 1} {sc.title}
                            </span>
                          }
                        />
                        <Badge
                          appearance="filled"
                          color={
                            sc.targetAppType === 'copilot'
                              ? 'informative'
                              : sc.targetAppType === 'canvas'
                              ? 'warning'
                              : 'success'
                          }
                        >
                          {sc.targetAppType}
                        </Badge>
                      </div>

                      <div className={styles.stepsBox}>
                        <strong>Steps ({sc.steps?.length || 0}):</strong>
                        <ul style={{ margin: '4px 0 0 16px', padding: 0 }}>
                          {sc.steps?.slice(0, 3).map((st: string, sidx: number) => (
                            <li key={sidx}>{st}</li>
                          ))}
                          {(sc.steps?.length || 0) > 3 && (
                            <li style={{ color: '#888' }}>+ {sc.steps.length - 3} more steps...</li>
                          )}
                        </ul>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </DialogContent>

          <DialogActions style={{ marginTop: '16px' }}>
            <Button appearance="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>

            {generatedScenarios.length > 0 && (
              <>
                <Button
                  appearance="secondary"
                  onClick={() => handleApply(true)}
                  disabled={selectedIndices.size === 0}
                >
                  Replace All in Suite
                </Button>
                <Button
                  appearance="primary"
                  icon={<CheckmarkRegular />}
                  onClick={() => handleApply(false)}
                  disabled={selectedIndices.size === 0}
                >
                  Append {selectedIndices.size} Scenarios to Suite
                </Button>
              </>
            )}
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
};

