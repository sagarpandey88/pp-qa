import React, { useState, useRef, useEffect } from 'react';
import {
  Drawer,
  DrawerHeader,
  DrawerHeaderTitle,
  DrawerBody,
  DrawerFooter,
  Button,
  Input,
  Textarea,
  Dropdown,
  Option,
  Badge,
  makeStyles,
  tokens,
  Spinner,
} from '@fluentui/react-components';
import {
  DismissRegular,
  SendRegular,
  BotRegular,
  KeyRegular,
  SparkleRegular,
  FolderOpenRegular,
} from '@fluentui/react-icons';
import { apiClient } from '../../api/client';
import { UnifiedModelSelector } from '../ai/UnifiedModelSelector';
import { ByokModal } from './ByokModal';
import { useAiModel } from '../../context/AiModelContext';
import { ChatMessageList, ChatMessageItem } from './ChatMessageList';

const useStyles = makeStyles({
  drawer: {
    width: '480px',
    maxWidth: '90vw',
  },
  headerControls: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginTop: '8px',
  },
  body: {
    padding: 0,
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
  },
  inputArea: {
    padding: '16px',
    borderTop: `1px solid ${tokens.colorNeutralStroke2}`,
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    backgroundColor: tokens.colorNeutralBackground1,
  },
  suggestionsRow: {
    display: 'flex',
    gap: '6px',
    overflowX: 'auto',
    paddingBottom: '4px',
  },
  sendRow: {
    display: 'flex',
    gap: '8px',
  },
});

interface ChatAssistantDrawerProps {
  open: boolean;
  onClose: () => void;
  activeSolutionId?: string;
  onScenarioImported?: (scenario: any) => void;
}

export const ChatAssistantDrawer: React.FC<ChatAssistantDrawerProps> = ({
  open,
  onClose,
  activeSolutionId,
  onScenarioImported,
}) => {
  const styles = useStyles();
  const { modelConfig, setModelConfig } = useAiModel();

  const [solutions, setSolutions] = useState<any[]>([]);
  const [currentSolutionId, setCurrentSolutionId] = useState<string>(activeSolutionId || '');

  useEffect(() => {
    if (activeSolutionId) {
      setCurrentSolutionId(activeSolutionId);
    }
  }, [activeSolutionId]);

  useEffect(() => {
    apiClient
      .get('/solutions')
      .then((res) => {
        const list = res.data || [];
        setSolutions(list);
        if (!currentSolutionId && list.length > 0) {
          setCurrentSolutionId(list[0].id);
        }
      })
      .catch(() => {});
  }, []);

  const [messages, setMessages] = useState<ChatMessageItem[]>([]);
  const [inputText, setInputText] = useState('');
  const [streaming, setStreaming] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text || streaming) return;

    const userMsg: ChatMessageItem = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
    };

    const assistantMsgId = `assistant-${Date.now()}`;
    const initialAssistantMsg: ChatMessageItem = {
      id: assistantMsgId,
      role: 'assistant',
      content: '',
      toolsUsed: [],
      proposedScenarios: [],
    };

    const newMessages = [...messages, userMsg];
    setMessages([...newMessages, initialAssistantMsg]);
    setInputText('');
    setStreaming(true);

    try {
      const token = localStorage.getItem('ppqa_token');
      const response = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          provider: modelConfig.provider,
          model: modelConfig.model,
          messages: newMessages.map(m => ({ role: m.role, content: m.content })),
          solutionId: currentSolutionId || activeSolutionId || undefined,
        }),
      });

      if (!response.body) throw new Error('ReadableStream not supported.');

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const block of lines) {
          const blockLines = block.split('\n');
          let eventType = 'message';
          let dataStr = '';

          for (const line of blockLines) {
            if (line.startsWith('event: ')) {
              eventType = line.slice(7).trim();
            } else if (line.startsWith('data: ')) {
              dataStr = line.slice(6).trim();
            }
          }

          if (dataStr) {
            try {
              const parsed = JSON.parse(dataStr);

              setMessages(prev => {
                const current = [...prev];
                const last = current[current.length - 1];
                if (last && last.id === assistantMsgId) {
                  if (eventType === 'chunk' && parsed.text) {
                    last.content += parsed.text;
                  } else if (eventType === 'tool_call') {
                    last.toolsUsed = [...(last.toolsUsed || []), { name: parsed.name, args: parsed.args }];
                  } else if (eventType === 'scenarios' && parsed.scenarios) {
                    last.proposedScenarios = [...(last.proposedScenarios || []), ...parsed.scenarios];
                  }
                }
                return current;
              });
            } catch (e) {
              console.error('Failed to parse SSE event', e);
            }
          }
        }
      }
    } catch (err: any) {
      setMessages(prev => {
        const current = [...prev];
        const last = current[current.length - 1];
        if (last && last.id === assistantMsgId) {
          last.content += `\n\n[Error: ${err.message || 'Stream connection failed'}]`;
        }
        return current;
      });
    } finally {
      setStreaming(false);
    }
  };

  const activeSolution = solutions.find((s) => s.id === currentSolutionId);

  return (
    <Drawer
      type="overlay"
      position="end"
      open={open}
      onOpenChange={(_, data) => {
        if (!data.open) onClose();
      }}
      className={styles.drawer}
    >
      <DrawerHeader>
        <DrawerHeaderTitle
          action={
            <Button
              appearance="subtle"
              icon={<DismissRegular />}
              onClick={onClose}
            />
          }
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <BotRegular style={{ color: '#0078d4', fontSize: '20px' }} />
            <span>Power Platform QA Assistant</span>
          </div>
        </DrawerHeaderTitle>

        <div className={styles.headerControls}>
          <UnifiedModelSelector variant="pill" theme="panel" showPrefix prefixText="Unified AI:" />
          <ByokModal />
        </div>

        {/* Target Solution Context Selector */}
        <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FolderOpenRegular style={{ color: '#0078d4', fontSize: '18px' }} />
          <Dropdown
            size="small"
            style={{ flex: 1 }}
            value={
              activeSolution
                ? `Solution: ${activeSolution.friendly_name || activeSolution.unique_name}`
                : 'Targeting: All Solutions'
            }
            selectedOptions={[currentSolutionId]}
            onOptionSelect={(_, data) => setCurrentSolutionId(data.optionValue as string)}
          >
            {solutions.map((sol) => (
              <Option key={sol.id} value={sol.id} text={sol.friendly_name || sol.unique_name}>
                📦 {sol.friendly_name || sol.unique_name} (v{sol.version || '1.0'})
              </Option>
            ))}
          </Dropdown>
        </div>
      </DrawerHeader>

      <DrawerBody className={styles.body}>
        <ChatMessageList
          messages={messages}
          onImportScenario={onScenarioImported}
        />
        <div ref={messagesEndRef} />

        <div className={styles.inputArea}>
          <div className={styles.suggestionsRow}>
            <Button
              size="small"
              appearance="subtle"
              icon={<SparkleRegular />}
              onClick={() => handleSend('Generate test cases for Account entity and escalation flow')}
            >
              Generate Test Scenarios
            </Button>
            <Button
              size="small"
              appearance="subtle"
              onClick={() => handleSend('Summarize Cloud Flows and Copilot Studio topics')}
            >
              Explain Architecture
            </Button>
          </div>

          <div className={styles.sendRow}>
            <Input
              style={{ flex: 1 }}
              placeholder="Ask anything or generate tests..."
              value={inputText}
              onChange={(e, data) => setInputText(data.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              disabled={streaming}
            />
            <Button
              appearance="primary"
              icon={streaming ? <Spinner size="tiny" /> : <SendRegular />}
              onClick={() => handleSend()}
              disabled={streaming || !inputText.trim()}
            >
              Send
            </Button>
          </div>
        </div>
      </DrawerBody>
    </Drawer>
  );
};

