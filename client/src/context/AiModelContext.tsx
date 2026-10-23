import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { apiClient } from '../api/client';

export type AiProvider = 'azure_openai' | 'openai' | 'gemini';

export interface ModelConfig {
  provider: AiProvider;
  model: string;
}

export interface PresetModel {
  id: string;
  label: string;
  provider: AiProvider;
  description?: string;
  isDefault?: boolean;
}

export interface ByokKeyInfo {
  provider: AiProvider;
  isConfigured: boolean;
  maskedKey?: string;
  endpoint?: string;
  deployment?: string;
  lastUpdated?: string;
}

export const PRESET_AZURE_OPENAI_MODELS: PresetModel[] = [
  { id: 'gpt-4o', label: 'Azure OpenAI (gpt-4o)', provider: 'azure_openai', description: 'Flagship multimodal reasoning model', isDefault: true },
  { id: 'gpt-4o-mini', label: 'Azure OpenAI (gpt-4o-mini)', provider: 'azure_openai', description: 'Fast, lightweight cost-effective model' },
  { id: 'gpt-4', label: 'Azure OpenAI (gpt-4)', provider: 'azure_openai', description: 'Standard GPT-4 deployment' },
  { id: 'o1', label: 'Azure OpenAI (o1)', provider: 'azure_openai', description: 'Advanced step-by-step reasoning' },
  { id: 'gpt-4.5-preview', label: 'Azure OpenAI (gpt-4.5-preview)', provider: 'azure_openai', description: 'Next-generation preview model' },
];

export const PRESET_OPENAI_MODELS: PresetModel[] = [
  { id: 'gpt-4o', label: 'OpenAI GPT-4o (Omni)', provider: 'openai', description: 'High-intelligence flagship model', isDefault: true },
  { id: 'gpt-4o-mini', label: 'OpenAI GPT-4o-mini', provider: 'openai', description: 'Fast, efficient model for rapid iterations' },
  { id: 'o3-mini', label: 'OpenAI o3-mini (Reasoning)', provider: 'openai', description: 'Specialized for coding and logic synthesis' },
  { id: 'o1', label: 'OpenAI o1 (Deep Reasoning)', provider: 'openai', description: 'High-depth reasoning model' },
  { id: 'gpt-4-turbo', label: 'OpenAI GPT-4 Turbo', provider: 'openai', description: 'Previous-generation flagship' },
];

export const PRESET_GEMINI_MODELS: PresetModel[] = [
  { id: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash', provider: 'gemini', description: 'Ultra-fast multimodal reasoning', isDefault: true },
  { id: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro', provider: 'gemini', description: 'Deep context reasoning and large metadata analysis' },
  { id: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro', provider: 'gemini', description: 'Advanced analytical capabilities' },
  { id: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash', provider: 'gemini', description: 'Lightweight fast response' },
];

export const ALL_PRESETS: PresetModel[] = [
  ...PRESET_AZURE_OPENAI_MODELS,
  ...PRESET_OPENAI_MODELS,
  ...PRESET_GEMINI_MODELS,
];

const STORAGE_ACTIVE_CONFIG = 'ppqa_active_model_config';
const STORAGE_CUSTOM_MODELS = 'ppqa_custom_models';
const STORAGE_DEFAULT_OPENAI = 'ppqa_default_model_openai';
const STORAGE_DEFAULT_GEMINI = 'ppqa_default_model_gemini';
const STORAGE_DEFAULT_AZURE = 'ppqa_default_deployment_azure';
const EVENT_MODEL_CHANGED = 'ppqa_model_changed';

interface AiModelContextType {
  modelConfig: ModelConfig;
  setModelConfig: (config: ModelConfig) => void;
  setProvider: (provider: AiProvider) => void;
  setModel: (model: string) => void;
  byokKeys: ByokKeyInfo[];
  refreshByokKeys: () => Promise<void>;
  isConfigured: (provider: AiProvider) => boolean;
  activeProviderKeyInfo?: ByokKeyInfo;
  customHistory: string[];
  addCustomModel: (model: string) => void;
  getProviderLabel: (provider?: AiProvider) => string;
  getModelLabel: (provider?: AiProvider, model?: string) => string;
  getShortModelLabel: (config?: ModelConfig) => string;
  getDefaultModelForProvider: (provider: AiProvider) => string;
}

const AiModelContext = createContext<AiModelContextType | undefined>(undefined);

function getInitialModelConfig(): ModelConfig {
  try {
    const saved = localStorage.getItem(STORAGE_ACTIVE_CONFIG);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && parsed.provider && parsed.model) {
        return parsed;
      }
    }

    const defaultOpenAi = localStorage.getItem(STORAGE_DEFAULT_OPENAI);
    if (defaultOpenAi) {
      return { provider: 'openai', model: defaultOpenAi };
    }

    const defaultGemini = localStorage.getItem(STORAGE_DEFAULT_GEMINI);
    if (defaultGemini) {
      return { provider: 'gemini', model: defaultGemini };
    }
  } catch (e) {
    console.warn('[AiModelContext] Failed reading model from storage:', e);
  }

  return { provider: 'openai', model: 'gpt-4o' };
}

export const AiModelProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [modelConfig, setModelConfigState] = useState<ModelConfig>(getInitialModelConfig);
  const [byokKeys, setByokKeys] = useState<ByokKeyInfo[]>([]);
  const [customHistory, setCustomHistory] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_CUSTOM_MODELS);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  const getDefaultModelForProvider = useCallback((provider: AiProvider): string => {
    try {
      if (provider === 'openai') {
        const stored = localStorage.getItem(STORAGE_DEFAULT_OPENAI);
        if (stored) return stored;
      } else if (provider === 'gemini') {
        const stored = localStorage.getItem(STORAGE_DEFAULT_GEMINI);
        if (stored) return stored;
      } else if (provider === 'azure_openai') {
        const stored = localStorage.getItem(STORAGE_DEFAULT_AZURE);
        if (stored) return stored;
      }
    } catch {}

    const defaultPreset = ALL_PRESETS.find((p) => p.provider === provider && p.isDefault);
    return defaultPreset ? defaultPreset.id : provider === 'gemini' ? 'gemini-2.0-flash' : 'gpt-4o';
  }, []);

  const refreshByokKeys = useCallback(async () => {
    try {
      const res = await apiClient.get('/byok');
      if (Array.isArray(res.data)) {
        setByokKeys(res.data);
      }
    } catch (err) {
      // Offline fallback / unauthenticated
    }
  }, []);

  useEffect(() => {
    refreshByokKeys();
  }, [refreshByokKeys]);

  const setModelConfig = useCallback((newConfig: ModelConfig) => {
    const trimmedModel = newConfig.model.trim() || getDefaultModelForProvider(newConfig.provider);
    const updated: ModelConfig = {
      provider: newConfig.provider,
      model: trimmedModel,
    };

    setModelConfigState(updated);

    try {
      localStorage.setItem(STORAGE_ACTIVE_CONFIG, JSON.stringify(updated));
      if (updated.provider === 'openai') {
        localStorage.setItem(STORAGE_DEFAULT_OPENAI, updated.model);
      } else if (updated.provider === 'gemini') {
        localStorage.setItem(STORAGE_DEFAULT_GEMINI, updated.model);
      } else if (updated.provider === 'azure_openai') {
        localStorage.setItem(STORAGE_DEFAULT_AZURE, updated.model);
      }
    } catch (e) {
      console.error('[AiModelContext] Failed saving active config:', e);
    }

    // Broadcast across windows / listeners in the same page
    window.dispatchEvent(new CustomEvent(EVENT_MODEL_CHANGED, { detail: updated }));
  }, [getDefaultModelForProvider]);

  const setProvider = useCallback((newProvider: AiProvider) => {
    const currentModel = modelConfig.model;
    const isModelValidForNewProvider = ALL_PRESETS.some(
      (p) => p.provider === newProvider && p.id === currentModel
    );

    const targetModel = isModelValidForNewProvider
      ? currentModel
      : getDefaultModelForProvider(newProvider);

    setModelConfig({ provider: newProvider, model: targetModel });
  }, [modelConfig.model, getDefaultModelForProvider, setModelConfig]);

  const setModel = useCallback((newModel: string) => {
    setModelConfig({ provider: modelConfig.provider, model: newModel });
  }, [modelConfig.provider, setModelConfig]);

  const addCustomModel = useCallback((modelName: string) => {
    const trimmed = modelName.trim();
    if (!trimmed) return;
    const isPreset = ALL_PRESETS.some((p) => p.id === trimmed);
    if (!isPreset) {
      setCustomHistory((prev) => {
        const next = [trimmed, ...prev.filter((m) => m !== trimmed)].slice(0, 8);
        try {
          localStorage.setItem(STORAGE_CUSTOM_MODELS, JSON.stringify(next));
        } catch {}
        return next;
      });
    }
  }, []);

  // Sync state if another tab or component fired an event
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_ACTIVE_CONFIG && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (parsed && parsed.provider && parsed.model) {
            setModelConfigState(parsed);
          }
        } catch {}
      }
    };

    const handleCustomEvent = (e: Event) => {
      const ce = e as CustomEvent<ModelConfig>;
      if (ce.detail && ce.detail.provider && ce.detail.model) {
        setModelConfigState(ce.detail);
      }
    };

    window.addEventListener('storage', handleStorage);
    window.addEventListener(EVENT_MODEL_CHANGED, handleCustomEvent);

    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener(EVENT_MODEL_CHANGED, handleCustomEvent);
    };
  }, []);

  const isConfigured = useCallback((provider: AiProvider): boolean => {
    const found = byokKeys.find((k) => k.provider === provider);
    return Boolean(found?.isConfigured);
  }, [byokKeys]);

  const activeProviderKeyInfo = useMemo(() => {
    return byokKeys.find((k) => k.provider === modelConfig.provider);
  }, [byokKeys, modelConfig.provider]);

  const getProviderLabel = useCallback((provider?: AiProvider): string => {
    const p = provider || modelConfig.provider;
    switch (p) {
      case 'azure_openai':
        return 'Azure OpenAI';
      case 'openai':
        return 'OpenAI';
      case 'gemini':
        return 'Google Gemini';
      default:
        return 'AI Provider';
    }
  }, [modelConfig.provider]);

  const getModelLabel = useCallback((provider?: AiProvider, model?: string): string => {
    const p = provider || modelConfig.provider;
    const m = model || modelConfig.model;
    const preset = ALL_PRESETS.find((item) => item.provider === p && item.id === m);
    if (preset) return preset.label;
    const pLabel = getProviderLabel(p);
    return `${pLabel} (${m})`;
  }, [modelConfig, getProviderLabel]);

  const getShortModelLabel = useCallback((config?: ModelConfig): string => {
    const c = config || modelConfig;
    switch (c.provider) {
      case 'azure_openai':
        return `Azure: ${c.model}`;
      case 'openai':
        return `OpenAI: ${c.model}`;
      case 'gemini':
        return `Gemini: ${c.model.replace('gemini-', '')}`;
      default:
        return `${c.model}`;
    }
  }, [modelConfig]);

  const value = useMemo<AiModelContextType>(() => ({
    modelConfig,
    setModelConfig,
    setProvider,
    setModel,
    byokKeys,
    refreshByokKeys,
    isConfigured,
    activeProviderKeyInfo,
    customHistory,
    addCustomModel,
    getProviderLabel,
    getModelLabel,
    getShortModelLabel,
    getDefaultModelForProvider,
  }), [
    modelConfig,
    setModelConfig,
    setProvider,
    setModel,
    byokKeys,
    refreshByokKeys,
    isConfigured,
    activeProviderKeyInfo,
    customHistory,
    addCustomModel,
    getProviderLabel,
    getModelLabel,
    getShortModelLabel,
    getDefaultModelForProvider,
  ]);

  return (
    <AiModelContext.Provider value={value}>
      {children}
    </AiModelContext.Provider>
  );
};

export const useAiModel = (): AiModelContextType => {
  const context = useContext(AiModelContext);
  if (!context) {
    throw new Error('useAiModel must be used within an AiModelProvider');
  }
  return context;
};

