import { ParsedSolutionXml } from './solutionXmlParser';
import { EntityTableMetadata, RelationshipMetadata } from './customizationsParser';
import { ParsedCloudFlow } from './cloudFlowParser';
import { ParsedCopilotBot } from './copilotBotParser';

export interface FullSolutionMetadata {
  manifest: ParsedSolutionXml;
  tables: EntityTableMetadata[];
  relationships: RelationshipMetadata[];
  flows: ParsedCloudFlow[];
  bots: ParsedCopilotBot[];
}

export function generateSolutionMarkdown(metadata: FullSolutionMetadata): string {
  const { manifest, tables, relationships, flows, bots } = metadata;

  let md = `# Solution Specification: ${manifest.friendlyName} (\`${manifest.uniqueName}\`)\n\n`;

  // 1. Executive Summary
  md += `## 1. Executive Summary\n\n`;
  md += `| Attribute | Value |\n`;
  md += `| :--- | :--- |\n`;
  md += `| **Unique Name** | \`${manifest.uniqueName}\` |\n`;
  md += `| **Display Name** | ${manifest.friendlyName} |\n`;
  md += `| **Version** | \`${manifest.version}\` |\n`;
  md += `| **Package Type** | ${manifest.isManaged ? 'Managed (Production)' : 'Unmanaged (Customizable)'} |\n`;
  md += `| **Publisher** | ${manifest.publisher.friendlyName} (\`${manifest.publisher.customizationPrefix}\`) |\n`;
  md += `| **Dataverse Tables** | ${tables.length} |\n`;
  md += `| **Cloud Flows** | ${flows.length} |\n`;
  md += `| **Copilot Agents** | ${bots.length} |\n\n`;

  // 2. Data Dictionary & Entities
  md += `## 2. Data Dictionary & Dataverse Tables\n\n`;
  if (tables.length === 0) {
    md += `*No custom entities or tables found in this solution package.*\n\n`;
  } else {
    for (const table of tables) {
      md += `### Table: ${table.displayName} (\`${table.schemaName}\`)\n\n`;
      md += `- **Primary ID Attribute**: \`${table.primaryIdAttribute}\`\n`;
      md += `- **Primary Name Attribute**: \`${table.primaryNameAttribute}\`\n`;
      md += `- **Included Forms**: ${table.forms.length > 0 ? table.forms.map(f => `\`${f.name}\``).join(', ') : 'Default Information Form'}\n`;
      md += `- **Views / Queries**: ${table.views.length > 0 ? table.views.map(v => `\`${v.name}\``).join(', ') : 'Default Active View'}\n\n`;

      md += `#### Columns & Attributes\n\n`;
      md += `| Column Schema Name | Display Name | Data Type | Required Level | Details |\n`;
      md += `| :--- | :--- | :--- | :--- | :--- |\n`;

      for (const col of table.columns) {
        let details = '-';
        if (col.maxLength) {
          details = `Max: ${col.maxLength}`;
        } else if (col.options && col.options.length > 0) {
          details = `Options: ${col.options.map(o => `${o.label} (${o.value})`).join(', ')}`;
        }
        md += `| \`${col.schemaName}\` | ${col.displayName} | \`${col.type}\` | ${col.requiredLevel} | ${details} |\n`;
      }
      md += `\n`;
    }
  }

  // 3. Entity Relationships Diagram (Mermaid)
  md += `## 3. Entity Relationship Diagram (ERD)\n\n`;
  if (relationships.length > 0) {
    md += '```mermaid\nerDiagram\n';
    for (const rel of relationships.slice(0, 15)) {
      const p1 = rel.referencedEntity || 'Parent';
      const p2 = rel.referencingEntity || 'Child';
      const relLabel = rel.name ? rel.name.slice(0, 24) : 'references';
      md += `    ${p1} ||--o{ ${p2} : "${relLabel}"\n`;
    }
    md += '```\n\n';
  } else {
    md += `*No cross-entity relationships declared.*\n\n`;
  }

  // 4. Cloud Flows (Power Automate)
  md += `## 4. Cloud Flows & Business Process Automations\n\n`;
  if (flows.length === 0) {
    md += `*No cloud flows detected in this solution package.*\n\n`;
  } else {
    for (const flow of flows) {
      md += `### Flow: ${flow.name}\n\n`;
      md += `- **Trigger Type**: \`${flow.triggerType}\`\n`;
      md += `- **Action Steps Count**: ${flow.actions.length}\n`;
      if (flow.connectionReferences.length > 0) {
        md += `- **Connection References**: ${flow.connectionReferences.map(c => `\`${c}\``).join(', ')}\n`;
      }
      if (flow.actions.length > 0) {
        md += `\n**Sequential Action Steps:**\n`;
        flow.actions.slice(0, 10).forEach((act, idx) => {
          md += `${idx + 1}. **${act.name}** (\`${act.type}\`)\n`;
        });
      }
      md += `\n`;
    }
  }

  // 5. Copilot Studio Agents
  md += `## 5. Copilot Studio (PVA) Agents & Conversational Topics\n\n`;
  if (bots.length === 0) {
    md += `*No Copilot Studio bots detected in this solution package.*\n\n`;
  } else {
    for (const bot of bots) {
      md += `### Agent: ${bot.displayName} (\`${bot.botSchemaName}\`)\n\n`;
      md += `| Topic Name | Trigger Phrases | Generative Answers |\n`;
      md += `| :--- | :--- | :--- |\n`;
      for (const top of bot.topics) {
        const phrases = top.triggerPhrases.length > 0 ? top.triggerPhrases.join('; ') : 'Implicit trigger';
        md += `| **${top.displayName}** | ${phrases} | ${top.hasGenerativeAnswers ? '✅ Yes' : '❌ No'} |\n`;
      }
      md += `\n`;
    }
  }

  // 6. Testability & Playwright QA Readiness Matrix
  md += `## 6. Playwright QA Readiness Matrix\n\n`;
  md += `The components in this solution can be verified with automated Playwright suites:\n\n`;
  md += `| Target Component | Recommended Playwright Page Object | Test Verification Scope |\n`;
  md += `| :--- | :--- | :--- |\n`;
  for (const table of tables.slice(0, 5)) {
    md += `| **Table: ${table.displayName}** | \`ModelDrivenAppPage\` + \`FormComponent\` | Record creation, field validation, required checks, save & close |\n`;
    md += `| **View: ${table.displayName}** | \`GridComponent\` | Quick find search, column filtering, active record list assertion |\n`;
  }
  for (const flow of flows.slice(0, 3)) {
    md += `| **Flow: ${flow.name}** | \`AppProvider\` (API & UI Trigger) | Trigger event dispatch, run status verification, state change |\n`;
  }
  for (const bot of bots.slice(0, 2)) {
    md += `| **Copilot: ${bot.displayName}** | \`CopilotChatComponent\` | Utterance intent matching, adaptive card rendering, generative answer verification |\n`;
  }
  md += `\n---\n*Generated by Power Platform & Copilot QA Platform (pp-qa)*\n`;

  return md;
}

