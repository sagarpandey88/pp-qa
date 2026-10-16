import React, { useState, useEffect } from 'react';
import {
  Dropdown,
  Option,
  OptionGroup,
  Input,
  Button,
  Tooltip,
  makeStyles,
  tokens,
  Text,
  Badge,
} from '@fluentui/react-components';
import {
  BotRegular,
  SparkleRegular,
  EditRegular,
  ListRegular,
  CheckmarkRegular,
} from '@fluentui/react-icons';

export interface ModelConfig {
  provider: 'openai' | 'azure_openai' | 'gemini';
  model: string;
}

const PRESET_AZURE_OPENAI_MODELS = [
  { id: 'gpt-4o', label: 'Azure OpenAI (gpt-4o)' },
  { id: 'gpt-4o-mini', label: 'Azure OpenAI (gpt-4o-mini)' },
  { id: 'gpt-4', label: 'Azure OpenAI (gpt-4)' },
  { id: 'o1', label: 'Azure OpenAI (o1)' },
];

const PRESET_OPENAI_MODELS = [
  { id: 'gpt-4o', label: 'OpenAI GPT-4o (Omni)' },
  { id: 'gpt-4o-mini', label: 'OpenAI GPT-4o-mini' },
  { id: 'o3-mini', label: 'OpenAI o3-mini (Reasoning)' },
  { id: 'o1', label: 'OpenAI o1 (Deep Reasoning)' },
];

const PRESET_GEMINI_MODELS = [
  { id: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash' },
  { id: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro' },
  { id: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro' },
];

const useStyles = makeStyles({
  container: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    flexWrap: 'nowrap',
  },
  dropdown: {
    minWidth: '230px',
  },
  providerSelect: {
    width: '125px',
    minWidth: '125px',
  },
  customInput: {
    width: '180px',
    minWidth: '160px',
  },
  iconBtn: {
    minWidth: '32px',
    padding: '4px',
  },
});

interface ModelSelectorProps {
  value: ModelConfig;
  onChange: (value: ModelConfig) => void;
}

export const ModelSelector: React.FC<ModelSelectorProps> = ({ value, onChange }) => {
  const styles = useStyles();

  // Load custom models history from localStorage
  const [customHistory, setCustomHistory] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem('ppqa_custom_models');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const isPreset =
    (value.provider === 'azure_openai' && PRESET_AZURE_OPENAI_MODELS.some((m) => m.id === value.model)) ||
    (value.provider === 'openai' && PRESET_OPENAI_MODELS.some((m) => m.id === value.model)) ||
    (value.provider === 'gemini' && PRESET_GEMINI_MODELS.some((m) => m.id === value.model));

  // If the initial model is not a preset, start in custom input mode
  const [isCustomMode, setIsCustomMode] = useState<boolean>(!isPreset);
  const [customInputText, setCustomInputText] = useState<string>(value.model);

  useEffect(() => {
    setCustomInputText(value.model);
  }, [value.model]);

  const saveToCustomHistory = (modelName: string) => {
    const trimmed = modelName.trim();
    if (!trimmed) return;
    const isStandard =
      PRESET_AZURE_OPENAI_MODELS.some((m) => m.id === trimmed) ||
      PRESET_OPENAI_MODELS.some((m) => m.id === trimmed) ||
      PRESET_GEMINI_MODELS.some((m) => m.id === trimmed);
    if (!isStandard && !customHistory.includes(trimmed)) {
      const updated = [trimmed, ...customHistory.filter((m) => m !== trimmed)].slice(0, 5);
      setCustomHistory(updated);
      try {
        localStorage.setItem('ppqa_custom_models', JSON.stringify(updated));
      } catch (e) {
        console.error('Failed to save custom model history', e);
      }
    }
  };

  const handleSelectPreset = (_: any, data: any) => {
    const selected = data.optionValue as string;

    if (selected === 'azure_openai:custom_input') {
      setIsCustomMode(true);
      onChange({ provider: 'azure_openai', model: customInputText || 'gpt-4o' });
      return;
    }
    if (selected === 'openai:custom_input') {
      setIsCustomMode(true);
      onChange({ provider: 'openai', model: customInputText || 'gpt-4o' });
      return;
    }
    if (selected === 'gemini:custom_input') {
      setIsCustomMode(true);
      onChange({ provider: 'gemini', model: customInputText || 'gemini-2.0-flash' });
      return;
    }

    if (selected.startsWith('azure_openai:')) {
      const model = selected.replace('azure_openai:', '');
      onChange({ provider: 'azure_openai', model });
    } else if (selected.startsWith('openai:')) {
      const model = selected.replace('openai:', '');
      onChange({ provider: 'openai', model });
    } else if (selected.startsWith('gemini:')) {
      const model = selected.replace('gemini:', '');
      onChange({ provider: 'gemini', model });
    }
  };

  const handleCustomModelChange = (newModel: string) => {
    setCustomInputText(newModel);
    onChange({ provider: value.provider, model: newModel.trim() });
    if (newModel.trim()) {
      saveToCustomHistory(newModel.trim());
    }
  };

  const handleProviderToggle = (_: any, data: any) => {
    const newProvider = data.optionValue as 'openai' | 'azure_openai' | 'gemini';
    const defaultModel =
      newProvider === 'azure_openai' ? 'gpt-4o' : newProvider === 'openai' ? 'gpt-4o' : 'gemini-2.0-flash';
    onChange({ provider: newProvider, model: customInputText || defaultModel });
  };

  const providerLabel =
    value.provider === 'azure_openai'
      ? 'Azure OpenAI'
      : value.provider === 'openai'
      ? 'OpenAI'
      : 'Gemini';

  const selectedKey = `${value.provider}:${value.model}`;
  const displayText = isPreset
    ? `${providerLabel} (${value.model})`
    : `${providerLabel} (${value.model || 'Custom'})`;

  if (isCustomMode) {
    return (
      <div className={styles.container}>
        {/* Provider selector */}
        <Dropdown
          className={styles.providerSelect}
          size="small"
          value={providerLabel}
          selectedOptions={[value.provider]}
          onOptionSelect={handleProviderToggle}
          aria-label="AI Provider"
        >
          <Option value="azure_openai">Azure OpenAI</Option>
          <Option value="openai">OpenAI</Option>
          <Option value="gemini">Gemini</Option>
        </Dropdown>

        {/* Custom freeform model input */}
        <Tooltip content="Type any custom model or deployment name (e.g. gpt-4o, my-deployment-name, o3-mini)" relationship="label">
          <Input
            className={styles.customInput}
            size="small"
            value={customInputText}
            onChange={(_, data) => handleCustomModelChange(data.value)}
            placeholder="Deployment / model..."
            aria-label="Custom model name"
          />
        </Tooltip>

        {/* Switch back to preset dropdown */}
        <Tooltip content="Switch to standard preset models" relationship="label">
          <Button
            size="small"
            appearance="subtle"
            className={styles.iconBtn}
            icon={<ListRegular />}
            onClick={() => setIsCustomMode(false)}
            aria-label="Switch to standard model presets"
          />
        </Tooltip>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <Dropdown
        className={styles.dropdown}
        size="small"
        value={displayText}
        selectedOptions={[selectedKey]}
        onOptionSelect={handleSelectPreset}
        aria-label="Select AI model"
      >
        <OptionGroup label="Azure OpenAI Service">
          {PRESET_AZURE_OPENAI_MODELS.map((m) => (
            <Option key={m.id} value={`azure_openai:${m.id}`}>
              {m.label}
            </Option>
          ))}
          <Option value="azure_openai:custom_input">
            ✏️ Custom Azure Deployment...
          </Option>
        </OptionGroup>

        <OptionGroup label="OpenAI Models">
          {PRESET_OPENAI_MODELS.map((m) => (
            <Option key={m.id} value={`openai:${m.id}`}>
              {m.label}
            </Option>
          ))}
          <Option value="openai:custom_input">
            ✏️ Enter Custom OpenAI Model...
          </Option>
        </OptionGroup>

        <OptionGroup label="Google Gemini Models">
          {PRESET_GEMINI_MODELS.map((m) => (
            <Option key={m.id} value={`gemini:${m.id}`}>
              {m.label}
            </Option>
          ))}
          <Option value="gemini:custom_input">
            ✏️ Enter Custom Gemini Model...
          </Option>
        </OptionGroup>

        {customHistory.length > 0 && (
          <OptionGroup label="Recently Used Custom Models">
            {customHistory.map((cm) => (
              <Option key={cm} value={`${value.provider}:${cm}`} text={`Custom (${cm})`}>
                {`Custom (${cm})`}
              </Option>
            ))}
          </OptionGroup>
        )}
      </Dropdown>

      {/* Button to toggle to custom freeform model input */}
      <Tooltip content="Enter custom model or deployment name" relationship="label">
        <Button
          size="small"
          appearance="subtle"
          className={styles.iconBtn}
          icon={<EditRegular />}
          onClick={() => setIsCustomMode(true)}
          aria-label="Enter custom model name"
        />
      </Tooltip>
    </div>
  );
};
