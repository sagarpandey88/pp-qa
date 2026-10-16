export interface BotTopic {
  name: string;
  displayName: string;
  triggerPhrases: string[];
  nodes: Array<{
    type: string;
    text?: string;
    action?: string;
  }>;
  hasGenerativeAnswers: boolean;
}

export interface ParsedCopilotBot {
  botSchemaName: string;
  displayName: string;
  topics: BotTopic[];
}

export function parseCopilotBotData(botData: any, botComponents: any[] = []): ParsedCopilotBot {
  const botSchemaName = botData?.name || botData?.schemaName || 'copilot_agent';
  const displayName = botData?.displayName || botData?.friendlyName || 'Copilot Studio Agent';

  const topics: BotTopic[] = [];

  for (const comp of botComponents) {
    const compName = comp.name || comp.schemaName || 'topic';
    const compDisplay = comp.displayName || compName;
    const triggerPhrases: string[] = [];
    const nodes: Array<{ type: string; text?: string; action?: string }> = [];
    let hasGenerativeAnswers = false;

    // Check trigger phrases
    if (Array.isArray(comp.triggerQueries)) {
      triggerPhrases.push(...comp.triggerQueries);
    } else if (comp.triggerPhrases) {
      triggerPhrases.push(...comp.triggerPhrases);
    }

    // Check dialog nodes or text
    if (comp.content) {
      const contentStr = typeof comp.content === 'string' ? comp.content : JSON.stringify(comp.content);
      if (contentStr.toLowerCase().includes('generativeanswers') || contentStr.toLowerCase().includes('searchanswers')) {
        hasGenerativeAnswers = true;
      }
      nodes.push({
        type: 'DialogStep',
        text: comp.description || 'Topic workflow execution step',
      });
    }

    topics.push({
      name: compName,
      displayName: compDisplay,
      triggerPhrases,
      nodes,
      hasGenerativeAnswers,
    });
  }

  // Provide fallback default topic if components array was empty
  if (topics.length === 0) {
    topics.push({
      name: 'ConversationalGreeting',
      displayName: 'Greeting & Generative Help',
      triggerPhrases: ['Hi', 'Help', 'What can you do?'],
      nodes: [
        { type: 'Message', text: 'Hello! How can I assist you with Power Platform today?' },
        { type: 'GenerativeAnswers', text: 'Answers grounded in enterprise knowledge documents' },
      ],
      hasGenerativeAnswers: true,
    });
  }

  return {
    botSchemaName,
    displayName,
    topics,
  };
}

