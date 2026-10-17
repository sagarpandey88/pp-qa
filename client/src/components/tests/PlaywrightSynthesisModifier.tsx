import React, { useState, useEffect, useRef } from 'react';
import {
  Title3,
  Text,
  Button,
  Badge,
  Spinner,
  Textarea,
  Field,
  makeStyles,
  tokens,
  Tooltip,
} from '@fluentui/react-components';
import {
  CodeRegular,
  SparkleRegular,
  SaveRegular,
  PlayRegular,
  CopyRegular,
  ArrowDownloadRegular,
  ArrowResetRegular,
  CheckmarkRegular,
  DismissRegular,
  WarningRegular,
  CheckmarkCircleRegular,
  ChevronDownRegular,
  ChevronUpRegular,
  WrenchRegular,
  BugRegular,
  ListRegular,
  EyeRegular,
} from '@fluentui/react-icons';
import { apiClient } from '../../api/client';
import { ModelSelector, ModelConfig } from '../chat/ModelSelector';

const useStyles = makeStyles({
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
    backgroundColor: tokens.colorNeutralBackground1,
    borderRadius: '10px',
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    padding: '18px 22px',
  },
  headerBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '12px',
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
    paddingBottom: '14px',
  },
  headerLeft: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  tagRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flexWrap: 'wrap',
  },
  headerActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flexWrap: 'wrap',
  },
  modeToggleGroup: {
    display: 'flex',
    gap: '4px',
    backgroundColor: tokens.colorNeutralBackground3,
    padding: '3px',
    borderRadius: '6px',
    border: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  antiPatternBanner: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 14px',
    borderRadius: '6px',
    backgroundColor: '#fff4ce',
    border: '1px solid #fed9cc',
    color: '#8a3707',
    fontSize: '12px',
    gap: '10px',
  },
  studioBody: {
    display: 'grid',
    gridTemplateColumns: '1fr',
    gap: '16px',
  },
  splitLayout: {
    display: 'grid',
    gridTemplateColumns: 'minmax(450px, 1.4fr) minmax(360px, 1fr)',
    gap: '16px',
    alignItems: 'start',
  },
  editorSection: {
    display: 'flex',
    flexDirection: 'column',
    borderRadius: '8px',
    overflow: 'hidden',
    border: '1px solid #333',
    backgroundColor: '#1e1e1e',
  },
  editorToolbar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 14px',
    backgroundColor: '#252526',
    borderBottom: '1px solid #333',
    color: '#ccc',
    fontSize: '12px',
  },
  editorMain: {
    display: 'flex',
    height: '620px',
    backgroundColor: '#1e1e1e',
    overflow: 'hidden',
    position: 'relative',
  },
  lineGutter: {
    width: '48px',
    padding: '14px 8px 14px 4px',
    backgroundColor: '#1e1e1e',
    color: '#6e7681',
    fontFamily: 'Consolas, "Fira Code", Monaco, monospace',
    fontSize: '12px',
    lineHeight: '1.5',
    textAlign: 'right',
    userSelect: 'none',
    overflowY: 'hidden',
    borderRight: '1px solid #2d2d2d',
    flexShrink: 0,
    whiteSpace: 'pre',
  },
  codeTextarea: {
    flex: 1,
    padding: '14px 16px',
    margin: 0,
    backgroundColor: '#1e1e1e',
    color: '#d4d4d4',
    fontFamily: 'Consolas, "Fira Code", Monaco, monospace',
    fontSize: '12px',
    lineHeight: '1.5',
    border: 'none',
    outline: 'none',
    resize: 'none',
    whiteSpace: 'pre',
    overflowX: 'auto',
    overflowY: 'auto',
    tabSize: 2,
  },
  editorFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '6px 14px',
    backgroundColor: '#007acc',
    color: '#ffffff',
    fontSize: '11px',
    fontFamily: 'Consolas, "Fira Code", monospace',
  },
  aiPanel: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    backgroundColor: tokens.colorNeutralBackground2,
    borderRadius: '8px',
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    padding: '16px',
    maxHeight: '680px',
    overflowY: 'auto',
  },
  aiHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: `1px solid ${tokens.colorNeutralStroke3}`,
    paddingBottom: '10px',
  },
  chipsRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '6px',
  },
  chipBtn: {
    fontSize: '11px',
    padding: '4px 8px',
    height: 'auto',
    borderRadius: '12px',
  },
  errorAccordion: {
    borderRadius: '6px',
    border: `1px solid ${tokens.colorNeutralStroke3}`,
    backgroundColor: tokens.colorNeutralBackground1,
    overflow: 'hidden',
  },
  errorAccordionHeader: {
    padding: '8px 12px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    cursor: 'pointer',
    backgroundColor: tokens.colorNeutralBackground3,
    fontSize: '12px',
    fontWeight: 'bold',
  },
  errorAccordionBody: {
    padding: '10px 12px',
  },
  aiResultCard: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    padding: '12px',
    borderRadius: '6px',
    backgroundColor: tokens.colorNeutralBackground1,
    border: '1px solid #107c41',
  },
  diffContainer: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '12px',
    height: '620px',
  },
  diffPane: {
    display: 'flex',
    flexDirection: 'column',
    borderRadius: '8px',
    border: '1px solid #333',
    backgroundColor: '#1e1e1e',
    overflow: 'hidden',
  },
  diffHeader: {
    padding: '8px 12px',
    fontSize: '12px',
    fontWeight: 'bold',
    color: '#ffffff',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  diffCodeArea: {
    flex: 1,
    padding: '12px',
    margin: 0,
    fontFamily: 'Consolas, "Fira Code", Monaco, monospace',
    fontSize: '12px',
    lineHeight: '1.5',
    color: '#d4d4d4',
    overflowY: 'auto',
    whiteSpace: 'pre',
  },
});

const QUICK_FIX_PRESETS = [
  {
    label: '🛠️ Fix Failing Locator / Timeout',
    prompt: 'Fix locator timeout: replace brittle selector with resilient POM auto-waiting or increase timeout for slow command bar render.',
  },
  {
    label: '⏱️ Remove waitForNetworkIdle',
    prompt: 'Remove waitForNetworkIdle anti-pattern and replace with POM built-in auto-waiting to prevent telemetry polling timeouts.',
  },
  {
    label: '🛡️ Add Dialog Confirmation',
    prompt: 'Add dialog confirmation handling using await modelApp.confirmDialog() for record save or deactivation modal.',
  },
  {
    label: '🔍 Add Validation Assertion',
    prompt: 'Add explicit form and grid field assertions using await form.assertFieldValue() and await grid.assertRowContains().',
  },
  {
    label: '⚡ Add Command Button Fallback',
    prompt: 'Use await modelApp.clickCommandButtonIfVisible() to gracefully handle intermittent or conditional ribbon buttons.',
  },
  {
    label: '🧩 Validate POM Signatures',
    prompt: 'Ensure all POM constructors receive { page } in test.beforeEach and test steps are properly wrapped in await test.step().',
  },
];

interface PlaywrightSynthesisModifierProps {
  suiteId?: string | null;
  suiteTitle: string;
  solutionId?: string;
  targetAppType: string;
  targetAppName: string;
  scenarios: any[];
  code: string;
  onSaveCode: (newCode: string) => Promise<void> | void;
  onRunSuite: () => void;
  onResynthesize: () => void;
  isSynthesizing?: boolean;
  initialErrorLog?: string;
}

export const PlaywrightSynthesisModifier: React.FC<PlaywrightSynthesisModifierProps> = ({
  suiteId,
  suiteTitle,
  solutionId,
  targetAppType,
  targetAppName,
  scenarios,
  code: initialCode,
  onSaveCode,
  onRunSuite,
  onResynthesize,
  isSynthesizing = false,
  initialErrorLog = '',
}) => {
  const styles = useStyles();

  // Code state
  const [currentCode, setCurrentCode] = useState(initialCode);
  const [savedCode, setSavedCode] = useState(initialCode);
  const [originalCode, setOriginalCode] = useState(initialCode);

  // Sync when initial code changes from external synthesis
  useEffect(() => {
    setCurrentCode(initialCode);
    setSavedCode(initialCode);
    if (!originalCode) {
      setOriginalCode(initialCode);
    }
  }, [initialCode]);

  // View mode: 'split' | 'full' | 'diff'
  const [viewMode, setViewMode] = useState<'split' | 'full' | 'diff'>('split');

  // AI Assistant state
  const [modelConfig, setModelConfig] = useState<ModelConfig>({
    provider: 'azure_openai',
    model: 'gpt-4o',
  });
  const [instruction, setInstruction] = useState('');
  const [errorLog, setErrorLog] = useState(initialErrorLog);
  const [showErrorLog, setShowErrorLog] = useState(Boolean(initialErrorLog));
  const [isModifying, setIsModifying] = useState(false);
  const [aiResult, setAiResult] = useState<{
    modifiedCode: string;
    explanation: string;
    changes: string[];
  } | null>(null);

  // UI state
  const [isSaving, setIsSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const gutterRef = useRef<HTMLDivElement>(null);

  const isDirty = currentCode !== savedCode;
  const lineCount = currentCode ? currentCode.split('\n').length : 0;
  const charCount = currentCode ? currentCode.length : 0;

  // Anti-pattern detection
  const hasNetworkIdle =
    currentCode.includes('waitForNetworkIdle') ||
    currentCode.includes("waitForLoadState('networkidle')") ||
    currentCode.includes('waitForLoadState("networkidle")');

  // Synchronize gutter scrolling with textarea
  const handleScroll = () => {
    if (textareaRef.current && gutterRef.current) {
      gutterRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  };

  // Support Tab key indentation in textarea
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const target = e.currentTarget;
      const start = target.selectionStart;
      const end = target.selectionEnd;
      const value = target.value;
      const updated = value.substring(0, start) + '  ' + value.substring(end);
      setCurrentCode(updated);
      setTimeout(() => {
        target.selectionStart = target.selectionEnd = start + 2;
      }, 0);
    } else if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      handleSave();
    }
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      if (suiteId) {
        await apiClient.put(`/test-suites/${suiteId}`, {
          generatedCode: currentCode,
          preserveCode: true,
        });
      }
      await onSaveCode(currentCode);
      setSavedCode(currentCode);
      setNotification('Playwright script saved successfully!');
      setTimeout(() => setNotification(null), 3500);
    } catch (err: any) {
      alert(`Save failed: ${err.response?.data?.error || err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(currentCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const filename = `${suiteTitle.toLowerCase().replace(/[^a-z0-9]/g, '-')}.spec.ts`;
    const blob = new Blob([currentCode], { type: 'text/typescript;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleRevert = () => {
    if (window.confirm('Revert all unsaved modifications back to the last saved script?')) {
      setCurrentCode(savedCode);
      setAiResult(null);
    }
  };

  const handleModifyWithAi = async (customInstruction?: string) => {
    const finalInstruction = customInstruction || instruction;
    if (!finalInstruction.trim()) {
      alert('Please enter a modification instruction or pick a quick fix preset.');
      return;
    }

    try {
      setIsModifying(true);
      setNotification(null);

      const payload = {
        code: currentCode,
        instruction: finalInstruction,
        errorLog: errorLog.trim() || undefined,
        suiteTitle,
        targetAppType,
        targetAppName,
        solutionId,
        provider: modelConfig.provider,
        model: modelConfig.model,
        autoSave: false,
      };

      const endpoint = suiteId
        ? `/test-suites/${suiteId}/modify-code`
        : '/test-suites/modify-code';

      const res = await apiClient.post(endpoint, payload);

      if (res.data.success) {
        setAiResult({
          modifiedCode: res.data.modifiedCode,
          explanation: res.data.explanation,
          changes: res.data.changes || [],
        });
        setNotification('✨ AI has prepared script modifications. Review diff or apply to editor.');
      }
    } catch (err: any) {
      alert(`AI Modification failed: ${err.response?.data?.error || err.message}`);
    } finally {
      setIsModifying(false);
    }
  };

  const handleApplyAiChanges = () => {
    if (aiResult) {
      setCurrentCode(aiResult.modifiedCode);
      setViewMode('split');
      setNotification('✅ Applied AI modifications to editor! Click "Save Modifications" to persist.');
    }
  };

  const handleAcceptDiff = () => {
    if (aiResult) {
      setCurrentCode(aiResult.modifiedCode);
      setViewMode('split');
      setNotification('✅ Accepted diff modifications!');
    }
  };

  const handleRejectDiff = () => {
    setViewMode('split');
  };

  // Generate line numbers for gutter
  const lineNumbersText = Array.from({ length: Math.max(lineCount, 1) }, (_, i) => i + 1).join('\n');

  return (
    <div className={styles.container}>
      {/* Top Header Bar */}
      <div className={styles.headerBar}>
        <div className={styles.headerLeft}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CodeRegular style={{ fontSize: '20px', color: '#0078d4' }} />
            <Title3 style={{ margin: 0, fontSize: '17px' }}>
              Playwright Synthesis &amp; Modification Studio
            </Title3>
          </div>
          <div className={styles.tagRow}>
            <Badge appearance="filled" color="brand">TypeScript</Badge>
            <Badge appearance="outline">@playwright/test</Badge>
            <Badge appearance="tint" color="informative">
              {targetAppName || 'Unified Interface'} ({targetAppType})
            </Badge>
            {isDirty ? (
              <Badge appearance="filled" color="warning">
                ● Unsaved Modifications
              </Badge>
            ) : (
              <Badge appearance="tint" color="success">
                ✓ Saved to Test Suite
              </Badge>
            )}
            {hasNetworkIdle ? (
              <Badge appearance="filled" color="danger">
                ⚠️ Contains waitForNetworkIdle
              </Badge>
            ) : (
              <Badge appearance="tint" color="success">
                ✓ Resilient POM Auto-Waiting
              </Badge>
            )}
          </div>
        </div>

        {/* Header Right Action Group */}
        <div className={styles.headerActions}>
          {/* Mode Toggles */}
          <div className={styles.modeToggleGroup}>
            <Tooltip content="Side-by-side Editor & AI Assistant" relationship="label">
              <Button
                size="small"
                appearance={viewMode === 'split' ? 'primary' : 'subtle'}
                icon={<CodeRegular />}
                onClick={() => setViewMode('split')}
              >
                Split Studio
              </Button>
            </Tooltip>

            <Tooltip content="Maximized Code Editor" relationship="label">
              <Button
                size="small"
                appearance={viewMode === 'full' ? 'primary' : 'subtle'}
                icon={<EyeRegular />}
                onClick={() => setViewMode('full')}
              >
                Full Editor
              </Button>
            </Tooltip>

            <Tooltip content="Compare Before vs After AI Modifications" relationship="label">
              <Button
                size="small"
                appearance={viewMode === 'diff' ? 'primary' : 'subtle'}
                icon={<ListRegular />}
                onClick={() => setViewMode('diff')}
                disabled={!aiResult}
              >
                Diff Review {aiResult && '✨'}
              </Button>
            </Tooltip>
          </div>

          <Button
            size="small"
            appearance="secondary"
            icon={copied ? <CheckmarkRegular /> : <CopyRegular />}
            onClick={handleCopy}
            disabled={!currentCode}
          >
            {copied ? 'Copied' : 'Copy'}
          </Button>

          <Button
            size="small"
            appearance="secondary"
            icon={<ArrowDownloadRegular />}
            onClick={handleDownload}
            disabled={!currentCode}
          >
            Download .spec.ts
          </Button>

          {isDirty && (
            <Button
              size="small"
              appearance="subtle"
              icon={<ArrowResetRegular />}
              onClick={handleRevert}
            >
              Revert
            </Button>
          )}

          <Button
            size="small"
            appearance="secondary"
            icon={<SaveRegular />}
            onClick={handleSave}
            disabled={isSaving || !isDirty}
          >
            {isSaving ? 'Saving...' : 'Save Modifications'}
          </Button>

          <Button
            size="small"
            appearance="subtle"
            icon={<SparkleRegular style={{ color: '#5c2d91' }} />}
            onClick={onResynthesize}
            disabled={isSynthesizing || scenarios.length === 0}
          >
            {isSynthesizing ? 'Re-Synthesizing...' : 'Re-Synthesize All'}
          </Button>

          <Button
            size="small"
            appearance="primary"
            icon={<PlayRegular />}
            onClick={onRunSuite}
            disabled={!suiteId}
          >
            Run Test Suite
          </Button>
        </div>
      </div>

      {/* Notification Toast Banner */}
      {notification && (
        <div style={{
          backgroundColor: '#eff6fc',
          border: '1px solid #c7e0f4',
          color: '#004e8c',
          padding: '8px 14px',
          borderRadius: '6px',
          fontSize: '12px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span>{notification}</span>
          <Button size="small" appearance="subtle" icon={<DismissRegular />} onClick={() => setNotification(null)} />
        </div>
      )}

      {/* Anti-Pattern Alert Warning */}
      {hasNetworkIdle && (
        <div className={styles.antiPatternBanner}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <WarningRegular style={{ fontSize: '18px' }} />
            <span>
              <strong>Anti-Pattern Detected:</strong> Your script contains <code>waitForNetworkIdle</code>. Modern Power Platform telemetry polling makes this wait flaky and causes 30s timeouts.
            </span>
          </div>
          <Button
            size="small"
            appearance="primary"
            icon={<SparkleRegular />}
            onClick={() => {
              setInstruction('Remove waitForNetworkIdle anti-pattern and use POM auto-waiting');
              handleModifyWithAi('Remove waitForNetworkIdle anti-pattern and use POM auto-waiting');
            }}
            disabled={isModifying}
          >
            {isModifying ? 'Fixing...' : '✨ Auto-Fix with AI'}
          </Button>
        </div>
      )}

      {/* Main Studio Viewport */}
      {viewMode === 'diff' && aiResult ? (
        /* Diff Comparison View */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Badge appearance="filled" color="informative">Side-by-Side Diff Review</Badge>
              <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>
                Compare current code (Left) with AI-modified code (Right)
              </Text>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <Button appearance="secondary" onClick={handleRejectDiff}>
                Discard Diff
              </Button>
              <Button appearance="primary" icon={<CheckmarkRegular />} onClick={handleAcceptDiff}>
                Accept &amp; Apply Diff
              </Button>
            </div>
          </div>

          <div className={styles.diffContainer}>
            <div className={styles.diffPane}>
              <div className={styles.diffHeader} style={{ backgroundColor: '#5c2d2d' }}>
                <span>Current Editor Code (Before)</span>
                <span>{lineCount} lines</span>
              </div>
              <pre className={styles.diffCodeArea}>{currentCode}</pre>
            </div>

            <div className={styles.diffPane}>
              <div className={styles.diffHeader} style={{ backgroundColor: '#1e4620' }}>
                <span>AI Modified Code (After)</span>
                <span>{aiResult.modifiedCode.split('\n').length} lines</span>
              </div>
              <pre className={styles.diffCodeArea}>{aiResult.modifiedCode}</pre>
            </div>
          </div>
        </div>
      ) : (
        /* Standard Split or Full Code Editor View */
        <div className={viewMode === 'split' ? styles.splitLayout : styles.studioBody}>
          {/* LEFT: Code Editor */}
          <div className={styles.editorSection}>
            <div className={styles.editorToolbar}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ color: '#61afef' }}>📄 {suiteTitle.toLowerCase().replace(/[^a-z0-9]/g, '-')}.spec.ts</span>
                {isDirty && <span style={{ color: '#e5c07b' }}>● Edited</span>}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span>Tab: 2 spaces</span>
                <span>UTF-8</span>
                <span>TypeScript</span>
              </div>
            </div>

            <div className={styles.editorMain}>
              {/* Line numbers gutter */}
              <div ref={gutterRef} className={styles.lineGutter}>
                {lineNumbersText}
              </div>

              {/* Editable code textarea */}
              <textarea
                ref={textareaRef}
                className={styles.codeTextarea}
                value={currentCode}
                onChange={(e) => setCurrentCode(e.target.value)}
                onScroll={handleScroll}
                onKeyDown={handleKeyDown}
                spellCheck={false}
                placeholder="// Enter or modify Playwright TypeScript test suite code..."
              />
            </div>

            <div className={styles.editorFooter}>
              <div>
                <span>Ln {lineCount}, Col {charCount}</span>
                <span style={{ marginLeft: '14px' }}>Page Object Model: Microsoft POM</span>
              </div>
              <div>
                <span>Ctrl+S / Cmd+S to Save</span>
              </div>
            </div>
          </div>

          {/* RIGHT: Playwright AI Assistant (in split mode) */}
          {viewMode === 'split' && (
            <div className={styles.aiPanel}>
              <div className={styles.aiHeader}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <SparkleRegular style={{ color: '#0078d4', fontSize: '18px' }} />
                  <strong style={{ fontSize: '14px' }}>Playwright AI Assistant</strong>
                </div>
                <ModelSelector
                  value={modelConfig}
                  onChange={(newModel) => setModelConfig(newModel)}
                />
              </div>

              <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>
                Describe modifications or paste failure logs. AI fixes locators, adds assertions, and aligns code with Microsoft Power Platform POM patterns.
              </Text>

              {/* Quick Action Presets */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <Text size={100} weight="semibold" style={{ color: tokens.colorNeutralForeground4, textTransform: 'uppercase' }}>
                  Quick Fix Presets
                </Text>
                <div className={styles.chipsRow}>
                  {QUICK_FIX_PRESETS.map((preset, idx) => (
                    <Button
                      key={idx}
                      size="small"
                      appearance="subtle"
                      className={styles.chipBtn}
                      onClick={() => setInstruction(preset.prompt)}
                    >
                      {preset.label}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Instruction Textarea */}
              <Field label="Modification Instructions / Description of Issue" required>
                <Textarea
                  value={instruction}
                  onChange={(_, data) => setInstruction(data.value)}
                  placeholder="e.g. Save button locator timed out; add dialog confirmation for deactivation; or add Main Phone verification step."
                  rows={3}
                />
              </Field>

              {/* Optional Error Log / Stack Trace Accordion */}
              <div className={styles.errorAccordion}>
                <div
                  className={styles.errorAccordionHeader}
                  onClick={() => setShowErrorLog(!showErrorLog)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <BugRegular style={{ color: '#d83b01' }} />
                    <span>Include Failure Error Trace / Terminal Output</span>
                    {errorLog.trim() && (
                      <Badge size="small" appearance="filled" color="danger">
                        Trace Added
                      </Badge>
                    )}
                  </div>
                  {showErrorLog ? <ChevronUpRegular /> : <ChevronDownRegular />}
                </div>

                {showErrorLog && (
                  <div className={styles.errorAccordionBody}>
                    <Textarea
                      value={errorLog}
                      onChange={(_, data) => setErrorLog(data.value)}
                      placeholder="Paste terminal error logs or stack trace from failed Playwright run here (e.g. TimeoutError: locator.click: Timeout 30000ms exceeded...)"
                      rows={4}
                      style={{ fontFamily: 'Consolas, monospace', fontSize: '11px' }}
                    />
                  </div>
                )}
              </div>

              {/* AI Modification Button */}
              <Button
                appearance="primary"
                icon={<SparkleRegular />}
                onClick={() => handleModifyWithAi()}
                disabled={isModifying || !instruction.trim()}
              >
                {isModifying ? (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Spinner size="tiny" />
                    AI Modifying Playwright Script...
                  </span>
                ) : (
                  '✨ Modify Script with AI Assistant'
                )}
              </Button>

              {/* AI Modification Result Card */}
              {aiResult && (
                <div className={styles.aiResultCard}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <CheckmarkCircleRegular style={{ color: '#107c41', fontSize: '18px' }} />
                      <strong style={{ fontSize: '13px' }}>AI Modifications Ready</strong>
                    </div>
                    <Badge size="small" appearance="filled" color="success">
                      {aiResult.changes.length} Changes
                    </Badge>
                  </div>

                  <Text size={200} style={{ color: tokens.colorNeutralForeground2 }}>
                    {aiResult.explanation}
                  </Text>

                  {aiResult.changes.length > 0 && (
                    <ul style={{ margin: '4px 0', paddingLeft: '18px', fontSize: '11px', color: tokens.colorNeutralForeground2 }}>
                      {aiResult.changes.map((ch, i) => (
                        <li key={i}>{ch}</li>
                      ))}
                    </ul>
                  )}

                  <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                    <Button
                      size="small"
                      appearance="primary"
                      icon={<CheckmarkRegular />}
                      onClick={handleApplyAiChanges}
                    >
                      Apply Changes to Editor
                    </Button>

                    <Button
                      size="small"
                      appearance="secondary"
                      icon={<EyeRegular />}
                      onClick={() => setViewMode('diff')}
                    >
                      Review Diff
                    </Button>

                    <Button
                      size="small"
                      appearance="subtle"
                      icon={<DismissRegular />}
                      onClick={() => setAiResult(null)}
                    >
                      Discard
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

