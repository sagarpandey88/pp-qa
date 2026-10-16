import React from 'react';
import {
  makeStyles,
  tokens,
  Text,
  Badge,
  Button,
  Card,
  CardHeader,
  CardFooter,
} from '@fluentui/react-components';
import {
  BotRegular,
  PersonRegular,
  SearchRegular,
  DocumentBulletListRegular,
  AddRegular,
  CheckmarkRegular,
} from '@fluentui/react-icons';

const useStyles = makeStyles({
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    padding: '16px',
    overflowY: 'auto',
    flex: 1,
  },
  messageRow: {
    display: 'flex',
    gap: '10px',
    maxWidth: '90%',
  },
  userRow: {
    alignSelf: 'flex-end',
    flexDirection: 'row-reverse',
  },
  assistantRow: {
    alignSelf: 'flex-start',
  },
  bubble: {
    padding: '12px 16px',
    borderRadius: '10px',
    fontSize: '13px',
    lineHeight: '1.5',
    whiteSpace: 'pre-wrap',
  },
  userBubble: {
    backgroundColor: '#0078d4',
    color: '#ffffff',
  },
  assistantBubble: {
    backgroundColor: tokens.colorNeutralBackground1,
    color: tokens.colorNeutralForeground1,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
  },
  toolBadgeList: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '6px',
    marginBottom: '8px',
  },
  scenarioCard: {
    marginTop: '12px',
    padding: '12px',
    backgroundColor: tokens.colorNeutralBackground1,
    border: `1px solid ${tokens.colorNeutralStroke1}`,
    borderRadius: '6px',
  },
});

export interface ChatMessageItem {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  toolsUsed?: Array<{ name: string; args?: any }>;
  proposedScenarios?: any[];
}

interface ChatMessageListProps {
  messages: ChatMessageItem[];
  onImportScenario?: (scenario: any) => void;
}

export const ChatMessageList: React.FC<ChatMessageListProps> = ({
  messages,
  onImportScenario,
}) => {
  const styles = useStyles();

  return (
    <div className={styles.container}>
      {messages.length === 0 && (
        <div style={{ textAlign: 'center', color: '#888', marginTop: '60px' }}>
          <BotRegular style={{ fontSize: '40px', color: '#0078d4', marginBottom: '8px' }} />
          <div><strong>Power Platform &amp; Copilot QA Assistant</strong></div>
          <div style={{ fontSize: '12px', marginTop: '4px' }}>
            Ask me to inspect tables, examine cloud flows, or generate automated Playwright tests.
          </div>
        </div>
      )}

      {messages.map((msg) => {
        const isUser = msg.role === 'user';

        return (
          <div
            key={msg.id}
            className={`${styles.messageRow} ${isUser ? styles.userRow : styles.assistantRow}`}
          >
            {!isUser && (
              <div style={{ marginTop: '4px' }}>
                <BotRegular style={{ fontSize: '20px', color: '#0078d4' }} />
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {/* Tool Execution Badges */}
              {!isUser && msg.toolsUsed && msg.toolsUsed.length > 0 && (
                <div className={styles.toolBadgeList}>
                  {msg.toolsUsed.map((t, tidx) => (
                    <Badge
                      key={tidx}
                      size="small"
                      appearance="tint"
                      color="brand"
                      icon={<SearchRegular />}
                    >
                      Used Tool: {t.name}
                    </Badge>
                  ))}
                </div>
              )}

              <div
                className={`${styles.bubble} ${
                  isUser ? styles.userBubble : styles.assistantBubble
                }`}
              >
                {msg.content}

                {/* Proposed Scenario Cards */}
                {msg.proposedScenarios && msg.proposedScenarios.length > 0 && (
                  <div style={{ marginTop: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ fontWeight: '600', color: '#0078d4' }}>
                        Proposed Test Scenarios ({msg.proposedScenarios.length}):
                      </span>
                      {onImportScenario && msg.proposedScenarios.length > 1 && (
                        <Button
                          size="small"
                          appearance="secondary"
                          icon={<AddRegular />}
                          onClick={() => {
                            msg.proposedScenarios?.forEach((sc) => onImportScenario(sc));
                          }}
                        >
                          Import All ({msg.proposedScenarios.length})
                        </Button>
                      )}
                    </div>
                    {msg.proposedScenarios.map((sc, sidx) => (
                      <div key={sidx} className={styles.scenarioCard}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <strong>{sc.title}</strong>
                          <Badge appearance="filled" color="informative">
                            {sc.targetAppType}
                          </Badge>
                        </div>

                        <div style={{ fontSize: '12px', marginTop: '6px' }}>
                          <strong>Steps:</strong>
                          <ol style={{ margin: '4px 0 0 16px', padding: 0 }}>
                            {sc.steps?.map((st: string, stidx: number) => (
                              <li key={stidx}>{st}</li>
                            ))}
                          </ol>
                        </div>

                        {onImportScenario && (
                          <div style={{ marginTop: '8px', display: 'flex', justifyContent: 'flex-end' }}>
                            <Button
                              size="small"
                              appearance="primary"
                              icon={<AddRegular />}
                              onClick={() => onImportScenario(sc)}
                            >
                              Add to Test Suite
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

