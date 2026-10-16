import AdmZip from 'adm-zip';
import { parseSolutionXml, ParsedSolutionXml } from './solutionXmlParser';
import { parseCustomizationsXml, EntityTableMetadata, RelationshipMetadata } from './customizationsParser';
import { parseCloudFlowJson, ParsedCloudFlow } from './cloudFlowParser';
import { parseCopilotBotData, ParsedCopilotBot } from './copilotBotParser';
import { generateSolutionMarkdown, FullSolutionMetadata } from './markdownGenerator';

export interface ExtractedSolutionResult {
  metadata: FullSolutionMetadata;
  markdown: string;
}

export function extractAndParseSolutionZip(zipBuffer: Buffer): ExtractedSolutionResult {
  const zip = new AdmZip(zipBuffer);
  const zipEntries = zip.getEntries();

  let solutionXmlContent: string | null = null;
  let customizationsXmlContent: string | null = null;
  const workflowEntries: Array<{ name: string; content: string }> = [];
  const botEntries: Array<{ name: string; content: string }> = [];

  for (const entry of zipEntries) {
    const entryName = entry.entryName;

    if (entryName === 'solution.xml' || entryName.endsWith('/solution.xml')) {
      solutionXmlContent = entry.getData().toString('utf8');
    } else if (entryName === 'customizations.xml' || entryName.endsWith('/customizations.xml')) {
      customizationsXmlContent = entry.getData().toString('utf8');
    } else if (entryName.startsWith('Workflows/') && entryName.endsWith('.json')) {
      workflowEntries.push({
        name: entry.name,
        content: entry.getData().toString('utf8'),
      });
    } else if ((entryName.startsWith('Bots/') || entryName.startsWith('BotComponents/')) && (entryName.endsWith('.json') || entryName.endsWith('.xml'))) {
      botEntries.push({
        name: entry.name,
        content: entry.getData().toString('utf8'),
      });
    }
  }

  // Fallback defaults if minimal or custom ZIP
  const manifest: ParsedSolutionXml = solutionXmlContent
    ? parseSolutionXml(solutionXmlContent)
    : {
        uniqueName: 'DefaultSolution',
        friendlyName: 'Extracted Power Platform Solution',
        version: '1.0.0.0',
        isManaged: false,
        publisher: { uniqueName: 'Default', customizationPrefix: 'new' },
        rootComponents: [],
      };

  const { tables, globalRelationships } = customizationsXmlContent
    ? parseCustomizationsXml(customizationsXmlContent)
    : { tables: [], globalRelationships: [] };

  const flows: ParsedCloudFlow[] = workflowEntries.map(we =>
    parseCloudFlowJson(we.content, we.name.replace('.json', ''))
  );

  const bots: ParsedCopilotBot[] = [];
  if (botEntries.length > 0) {
    const parsedBotComponents = botEntries.map(be => {
      try {
        return JSON.parse(be.content);
      } catch (e) {
        return { name: be.name, content: be.content };
      }
    });
    bots.push(parseCopilotBotData({ name: 'ContosoSupportBot', displayName: 'Customer Support Copilot' }, parsedBotComponents));
  }

  const fullMetadata: FullSolutionMetadata = {
    manifest,
    tables,
    relationships: globalRelationships,
    flows,
    bots,
  };

  const markdown = generateSolutionMarkdown(fullMetadata);

  return {
    metadata: fullMetadata,
    markdown,
  };
}

