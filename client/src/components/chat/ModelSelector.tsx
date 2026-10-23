import React from 'react';
import { UnifiedModelSelector, UnifiedModelSelectorProps } from '../ai/UnifiedModelSelector';
import { ModelConfig, AiProvider } from '../../context/AiModelContext';

export type { ModelConfig, AiProvider };

export interface ModelSelectorProps {
  value?: ModelConfig;
  onChange?: (value: ModelConfig) => void;
  compact?: boolean;
  showStatus?: boolean;
  size?: 'small' | 'medium';
}

export const ModelSelector: React.FC<ModelSelectorProps> = ({
  value,
  onChange,
  size = 'small',
}) => {
  return (
    <UnifiedModelSelector
      variant="pill"
      theme="panel"
      size={size}
      value={value}
      onChange={onChange}
    />
  );
};

export default ModelSelector;
