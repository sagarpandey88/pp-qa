import React, { useState } from 'react';
import {
  Button,
  Menu,
  MenuTrigger,
  MenuPopover,
  MenuList,
  MenuItem,
  MenuGroup,
  MenuGroupHeader,
  MenuDivider,
  Badge,
  Text,
  Input,
  Tooltip,
  makeStyles,
  tokens,
  Dialog,
  DialogSurface,
  DialogTitle,
  DialogBody,
  DialogActions,
  DialogContent,
  Field,
  Dropdown,
  Option,
} from '@fluentui/react-components';
import {
  SparkleRegular,
  BotRegular,
  CheckmarkRegular,
  KeyRegular,
  SettingsRegular,
  ChevronDownRegular,
  EditRegular,
  DismissRegular,
} from '@fluentui/react-icons';
import { useNavigate } from 'react-router-dom';
import {
  useAiModel,
  PRESET_AZURE_OPENAI_MODELS,
  PRESET_OPENAI_MODELS,
  PRESET_GEMINI_MODELS,
  AiProvider,
  ModelConfig,
} from '../../context/AiModelContext';
import { ByokModal } from '../chat/ByokModal';

const useStyles = makeStyles({
  container: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
  },
  prefixLabel: {
    fontSize: '12px',
    color: tokens.colorNeutralForeground3,
    fontWeight: '500',
    whiteSpace: 'nowrap',
  },
  // Header style (for dark purple top bar)
  pillButtonHeader: {
    color: '#ffffff',
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    border: '1px solid rgba(255, 255, 255, 0.35)',
    borderRadius: '16px',
    padding: '4px 10px',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontWeight: '500',
    fontSize: '12px',
    cursor: 'pointer',
    transition: 'all 0.15s ease-in-out',
    ':hover': {
      backgroundColor: 'rgba(255, 255, 255, 0.28)',
      color: '#ffffff',
    },
    ':hover:active': {
      backgroundColor: 'rgba(255, 255, 255, 0.38)',
      color: '#ffffff',
    },
  },
  // Panel style (for Playwright AI Assistant, Chat Drawer, Dialogs, Settings)
  pillButtonPanel: {
    backgroundColor: tokens.colorNeutralBackground2,
    border: `1px solid ${tokens.colorNeutralStroke1}`,
    borderRadius: '16px',
    padding: '4px 10px',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontWeight: '500',
    fontSize: '12px',
    color: tokens.colorNeutralForeground1,
    cursor: 'pointer',
    transition: 'all 0.15s ease-in-out',
    ':hover': {
      backgroundColor: tokens.colorNeutralBackground2Hover,
      border: `1px solid ${tokens.colorCompoundBrandStroke}`,
    },
    ':hover:active': {
      backgroundColor: tokens.colorNeutralBackground2Pressed,
    },
  },
  menuHeader: {
    padding: '10px 14px 6px',
    display: 'flex',
    flexDirection: 'column',
    gap: '3px',
    minWidth: '270px',
  },
  menuSubtext: {
    fontSize: '11px',
    color: tokens.colorNeutralForeground3,
    lineHeight: '14px',
  },
  providerHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    padding: '4px 8px',
  },
  statusBadge: {
    fontSize: '10px',
    marginLeft: '2px',
  },
  activeCheck: {
    color: tokens.colorCompoundBrandForeground1,
    marginLeft: 'auto',
  },
  customModelRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 12px',
  },
});

export interface UnifiedModelSelectorProps {
  variant?: 'pill' | 'compact';
  theme?: 'header' | 'panel';
  showPrefix?: boolean;
  prefixText?: string;
  size?: 'small' | 'medium';
  value?: ModelConfig;
  onChange?: (config: ModelConfig) => void;
}

export const UnifiedModelSelector: React.FC<UnifiedModelSelectorProps> = ({
  variant = 'pill',
  theme = 'panel',
  showPrefix = false,
  prefixText = 'Unified AI Model:',
  size = 'small',
  value: controlledValue,
  onChange: controlledOnChange,
}) => {
  const styles = useStyles();
  const navigate = useNavigate();
  const globalAi = useAiModel();

  const activeConfig = controlledValue || globalAi.modelConfig;
  const updateConfig = controlledOnChange || globalAi.setModelConfig;

  const [isByokOpen, setIsByokOpen] = useState(false);
  const [isCustomDialogOpen, setIsCustomDialogOpen] = useState(false);
  const [customProvider, setCustomProvider] = useState<AiProvider>(activeConfig.provider);
  const [customModelInput, setCustomModelInput] = useState(activeConfig.model);

  const shortLabel = globalAi.getShortModelLabel(activeConfig);
  const providerConfigured = globalAi.isConfigured(activeConfig.provider);
  const providerLabel = globalAi.getProviderLabel(activeConfig.provider);

  const handleSelectPreset = (provider: AiProvider, modelId: string) => {
    updateConfig({ provider, model: modelId });
  };

  const handleOpenCustomDialog = () => {
    setCustomProvider(activeConfig.provider);
    setCustomModelInput(activeConfig.model);
    setIsCustomDialogOpen(true);
  };

  const handleApplyCustomModel = () => {
    const trimmed = customModelInput.trim();
    if (trimmed) {
      updateConfig({ provider: customProvider, model: trimmed });
      globalAi.addCustomModel(trimmed);
    }
    setIsCustomDialogOpen(false);
  };

  const buttonStyle = theme === 'header' ? styles.pillButtonHeader : styles.pillButtonPanel;
  const iconColor = theme === 'header' ? '#ffb900' : '#0078d4';

  return (
    <div className={styles.container}>
      {showPrefix && (
        <span className={styles.prefixLabel}>
          {prefixText}
        </span>
      )}

      <Menu>
        <MenuTrigger disableButtonEnhancement>
          <Tooltip
            content={`Unified AI Model: ${providerLabel} (${activeConfig.model}). Unified across Playwright AI Studio, Chat Assistant, Scenario Gen & Synthesizer. Click to change.`}
            relationship="label"
          >
            <Button
              appearance="subtle"
              size={size}
              className={buttonStyle}
              icon={<SparkleRegular style={{ fontSize: '15px', color: iconColor }} />}
              aria-label={`Unified AI Model: ${shortLabel}`}
            >
              <span>{shortLabel}</span>
              <Badge
                size="small"
                appearance={providerConfigured ? 'filled' : 'tint'}
                color={providerConfigured ? 'success' : 'subtle'}
                className={styles.statusBadge}
              >
                {providerConfigured ? 'Vault' : 'Mock'}
              </Badge>
              <ChevronDownRegular style={{ fontSize: '12px', opacity: 0.8 }} />
            </Button>
          </Tooltip>
        </MenuTrigger>

        <MenuPopover>
          <MenuList>
            <div className={styles.menuHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <BotRegular style={{ fontSize: '16px', color: tokens.colorBrandForeground1 }} />
                <Text weight="semibold" size={300}>Unified AI Model Selector</Text>
                <Badge size="small" appearance="tint" color="brand">Global</Badge>
              </div>
              <Text className={styles.menuSubtext}>
                Selected model is unified across Playwright AI Assistant, Test Studio, Chat Assistant, Scenario Gen &amp; Synthesizer.
              </Text>
            </div>

            <MenuDivider />

            {/* Azure OpenAI Section */}
            <MenuGroup>
              <MenuGroupHeader>
                <div className={styles.providerHeader}>
                  <Text weight="semibold" size={200}>Azure OpenAI Service</Text>
                  <Badge
                    size="small"
                    appearance="tint"
                    color={globalAi.isConfigured('azure_openai') ? 'success' : 'subtle'}
                  >
                    {globalAi.isConfigured('azure_openai') ? 'Key Configured' : 'Sandbox Mock'}
                  </Badge>
                </div>
              </MenuGroupHeader>
              {PRESET_AZURE_OPENAI_MODELS.map((preset) => {
                const isActive = activeConfig.provider === 'azure_openai' && activeConfig.model === preset.id;
                return (
                  <MenuItem
                    key={`azure-${preset.id}`}
                    icon={isActive ? <CheckmarkRegular className={styles.activeCheck} /> : undefined}
                    onClick={() => handleSelectPreset('azure_openai', preset.id)}
                  >
                    {preset.id}
                  </MenuItem>
                );
              })}
            </MenuGroup>

            <MenuDivider />

            {/* OpenAI Section */}
            <MenuGroup>
              <MenuGroupHeader>
                <div className={styles.providerHeader}>
                  <Text weight="semibold" size={200}>OpenAI Direct</Text>
                  <Badge
                    size="small"
                    appearance="tint"
                    color={globalAi.isConfigured('openai') ? 'success' : 'subtle'}
                  >
                    {globalAi.isConfigured('openai') ? 'Key Configured' : 'Sandbox Mock'}
                  </Badge>
                </div>
              </MenuGroupHeader>
              {PRESET_OPENAI_MODELS.map((preset) => {
                const isActive = activeConfig.provider === 'openai' && activeConfig.model === preset.id;
                return (
                  <MenuItem
                    key={`openai-${preset.id}`}
                    icon={isActive ? <CheckmarkRegular className={styles.activeCheck} /> : undefined}
                    onClick={() => handleSelectPreset('openai', preset.id)}
                  >
                    {preset.id}
                  </MenuItem>
                );
              })}
            </MenuGroup>

            <MenuDivider />

            {/* Google Gemini Section */}
            <MenuGroup>
              <MenuGroupHeader>
                <div className={styles.providerHeader}>
                  <Text weight="semibold" size={200}>Google Gemini</Text>
                  <Badge
                    size="small"
                    appearance="tint"
                    color={globalAi.isConfigured('gemini') ? 'success' : 'subtle'}
                  >
                    {globalAi.isConfigured('gemini') ? 'Key Configured' : 'Sandbox Mock'}
                  </Badge>
                </div>
              </MenuGroupHeader>
              {PRESET_GEMINI_MODELS.map((preset) => {
                const isActive = activeConfig.provider === 'gemini' && activeConfig.model === preset.id;
                return (
                  <MenuItem
                    key={`gemini-${preset.id}`}
                    icon={isActive ? <CheckmarkRegular className={styles.activeCheck} /> : undefined}
                    onClick={() => handleSelectPreset('gemini', preset.id)}
                  >
                    {preset.id}
                  </MenuItem>
                );
              })}
            </MenuGroup>

            {/* Custom history */}
            {globalAi.customHistory.length > 0 && (
              <>
                <MenuDivider />
                <MenuGroup>
                  <MenuGroupHeader>
                    <Text weight="semibold" size={200}>Recently Used Custom Models</Text>
                  </MenuGroupHeader>
                  {globalAi.customHistory.map((cm) => {
                    const isActive = activeConfig.model === cm;
                    return (
                      <MenuItem
                        key={`custom-${cm}`}
                        icon={isActive ? <CheckmarkRegular className={styles.activeCheck} /> : undefined}
                        onClick={() => updateConfig({ provider: activeConfig.provider, model: cm })}
                      >
                        Custom: {cm}
                      </MenuItem>
                    );
                  })}
                </MenuGroup>
              </>
            )}

            <MenuDivider />

            <MenuItem
              icon={<EditRegular />}
              onClick={handleOpenCustomDialog}
            >
              Enter Custom Deployment / Model Name...
            </MenuItem>
            <MenuItem
              icon={<KeyRegular />}
              onClick={() => setIsByokOpen(true)}
            >
              Configure BYOK Keys &amp; Vault...
            </MenuItem>
            <MenuItem
              icon={<SettingsRegular />}
              onClick={() => navigate('/settings')}
            >
              Open AI Settings &amp; Vault
            </MenuItem>
          </MenuList>
        </MenuPopover>
      </Menu>

      {/* Custom Model Dialog */}
      <Dialog open={isCustomDialogOpen} onOpenChange={(_, data) => setIsCustomDialogOpen(data.open)}>
        <DialogSurface style={{ maxWidth: '440px' }}>
          <DialogBody>
            <DialogTitle>Set Custom Model or Deployment</DialogTitle>
            <DialogContent style={{ display: 'flex', flexDirection: 'column', gap: '14px', paddingTop: '10px' }}>
              <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>
                Type any custom Azure deployment name (e.g. <code>my-gpt4o-deployment</code>) or specific model identifier (e.g. <code>o3-mini</code>, <code>gpt-4.5-preview</code>). This configuration applies across all screens.
              </Text>

              <Field label="Target AI Provider">
                <Dropdown
                  value={
                    customProvider === 'azure_openai'
                      ? 'Azure OpenAI Service'
                      : customProvider === 'openai'
                      ? 'OpenAI Direct'
                      : 'Google Gemini'
                  }
                  selectedOptions={[customProvider]}
                  onOptionSelect={(_, data) => setCustomProvider(data.optionValue as AiProvider)}
                >
                  <Option value="azure_openai">Azure OpenAI Service</Option>
                  <Option value="openai">OpenAI Direct</Option>
                  <Option value="gemini">Google Gemini</Option>
                </Dropdown>
              </Field>

              <Field label="Deployment or Model Name" required>
                <Input
                  value={customModelInput}
                  onChange={(_, data) => setCustomModelInput(data.value)}
                  placeholder="e.g. gpt-4o, my-custom-deployment, gemini-2.0-flash"
                />
              </Field>
            </DialogContent>
            <DialogActions>
              <Button appearance="secondary" onClick={() => setIsCustomDialogOpen(false)}>
                Cancel
              </Button>
              <Button appearance="primary" onClick={handleApplyCustomModel} disabled={!customModelInput.trim()}>
                Apply Globally
              </Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>

      {/* BYOK Modal */}
      {isByokOpen && (
        <ByokModal
          open={isByokOpen}
          onOpenChange={(op) => setIsByokOpen(op)}
          onKeysUpdated={() => {
            globalAi.refreshByokKeys();
            setIsByokOpen(false);
          }}
          triggerButton={<span style={{ display: 'none' }} />}
        />
      )}
    </div>
  );
};
