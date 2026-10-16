export interface FlowStep {
  name: string;
  type: string;
  inputs?: any;
  runAfter?: Record<string, string[]>;
}

export interface ParsedCloudFlow {
  workflowId: string;
  name: string;
  triggerType: string;
  triggers: Record<string, any>;
  actions: FlowStep[];
  connectionReferences: string[];
}

export function parseCloudFlowJson(jsonContent: string, fallbackName = 'Cloud Flow'): ParsedCloudFlow {
  let parsed: any;
  try {
    parsed = typeof jsonContent === 'string' ? JSON.parse(jsonContent) : jsonContent;
  } catch (e) {
    return {
      workflowId: 'unknown-flow-id',
      name: fallbackName,
      triggerType: 'Unknown',
      triggers: {},
      actions: [],
      connectionReferences: [],
    };
  }

  // Definition is usually inside parsed.properties?.definition or parsed.definition or root
  const definition = parsed.properties?.definition || parsed.definition || parsed;
  const flowName = parsed.properties?.displayName || parsed.name || fallbackName;
  const workflowId = parsed.id || parsed.properties?.id || 'flow-' + Date.now();

  const triggersObj = definition.triggers || {};
  const triggerKeys = Object.keys(triggersObj);

  let triggerType = 'Manual / Instant';
  if (triggerKeys.length > 0) {
    const firstTrigger = triggersObj[triggerKeys[0]];
    const tType = firstTrigger.type || '';
    if (tType.toLowerCase().includes('openapiconnection') || tType.toLowerCase().includes('dataverse')) {
      triggerType = 'Dataverse Event';
    } else if (tType.toLowerCase().includes('recurrence')) {
      triggerType = 'Scheduled (Recurrence)';
    } else if (tType.toLowerCase().includes('request') || tType.toLowerCase().includes('http')) {
      triggerType = 'HTTP Webhook / Instant';
    } else {
      triggerType = tType || 'Automated';
    }
  }

  const actionsObj = definition.actions || {};
  const actions: FlowStep[] = Object.keys(actionsObj).map(actionKey => {
    const act = actionsObj[actionKey];
    return {
      name: actionKey,
      type: act.type || 'Action',
      inputs: act.inputs,
      runAfter: act.runAfter,
    };
  });

  // Extract connection references
  const connRefs: string[] = [];
  const connReferencesObj = parsed.properties?.connectionReferences || definition.connectionReferences;
  if (connReferencesObj && typeof connReferencesObj === 'object') {
    connRefs.push(...Object.keys(connReferencesObj));
  }

  return {
    workflowId,
    name: flowName,
    triggerType,
    triggers: triggersObj,
    actions,
    connectionReferences: connRefs,
  };
}

