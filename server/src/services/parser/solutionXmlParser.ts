import { XMLParser } from 'fast-xml-parser';

export interface ParsedSolutionXml {
  uniqueName: string;
  friendlyName: string;
  version: string;
  isManaged: boolean;
  publisher: {
    uniqueName: string;
    customizationPrefix: string;
    friendlyName?: string;
  };
  rootComponents: Array<{
    type: number | string;
    schemaObjectCode?: string;
    id?: string;
  }>;
}

export function parseSolutionXml(xmlContent: string): ParsedSolutionXml {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    textNodeName: '#text',
  });

  const parsed = parser.parse(xmlContent);
  const manifest = parsed?.ImportExportXml?.SolutionManifest;

  if (!manifest) {
    throw new Error('Invalid solution.xml: Missing SolutionManifest node');
  }

  const uniqueName = manifest.UniqueName || 'UnknownSolution';
  const localizedNames = manifest.LocalizedNames?.LocalizedName;
  const friendlyName = Array.isArray(localizedNames)
    ? localizedNames[0]?.['@_description'] || uniqueName
    : localizedNames?.['@_description'] || uniqueName;

  const version = manifest.Version || '1.0.0.0';
  const isManaged = manifest.Managed === 1 || manifest.Managed === '1' || manifest.Managed === true;

  const publisherNode = manifest.Publisher;
  const publisher = {
    uniqueName: publisherNode?.UniqueName || 'DefaultPublisher',
    customizationPrefix: publisherNode?.CustomizationPrefix || 'new',
    friendlyName: publisherNode?.LocalizedNames?.LocalizedName?.['@_description'] || 'Default Publisher',
  };

  const rootComponentsRaw = manifest.RootComponents?.RootComponent;
  const rootComponents: Array<{ type: number | string; schemaObjectCode?: string; id?: string }> = [];

  if (Array.isArray(rootComponentsRaw)) {
    for (const comp of rootComponentsRaw) {
      rootComponents.push({
        type: comp['@_type'],
        schemaObjectCode: comp['@_schemaObjectCode'],
        id: comp['@_id'],
      });
    }
  } else if (rootComponentsRaw) {
    rootComponents.push({
      type: rootComponentsRaw['@_type'],
      schemaObjectCode: rootComponentsRaw['@_schemaObjectCode'],
      id: rootComponentsRaw['@_id'],
    });
  }

  return {
    uniqueName,
    friendlyName,
    version,
    isManaged,
    publisher,
    rootComponents,
  };
}

