import React from 'react';
import { UnifiedModelSelector, UnifiedModelSelectorProps } from './UnifiedModelSelector';

export const GlobalAiModelPill: React.FC<Partial<UnifiedModelSelectorProps>> = (props) => {
  return <UnifiedModelSelector variant="pill" theme="header" {...props} />;
};

export default GlobalAiModelPill;

