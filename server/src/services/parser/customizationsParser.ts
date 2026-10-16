import { XMLParser } from 'fast-xml-parser';

export interface ColumnMetadata {
  schemaName: string;
  displayName: string;
  type: string;
  requiredLevel: string;
  maxLength?: number;
  options?: Array<{ label: string; value: number | string }>;
  lookupTarget?: string;
}

export interface RelationshipMetadata {
  name: string;
  type: 'OneToMany' | 'ManyToOne' | 'ManyToMany';
  referencingEntity: string;
  referencedEntity: string;
  referencingAttribute?: string;
  cascadeDelete?: string;
}

export interface FormMetadata {
  formId: string;
  name: string;
  type: string;
  fields: string[];
}

export interface ViewMetadata {
  queryId: string;
  name: string;
  isDefault: boolean;
  fetchXml?: string;
}

export interface EntityTableMetadata {
  schemaName: string;
  displayName: string;
  primaryIdAttribute: string;
  primaryNameAttribute: string;
  columns: ColumnMetadata[];
  relationships: RelationshipMetadata[];
  forms: FormMetadata[];
  views: ViewMetadata[];
}

export function parseCustomizationsXml(xmlContent: string): {
  tables: EntityTableMetadata[];
  globalRelationships: RelationshipMetadata[];
} {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    textNodeName: '#text',
  });

  const parsed = parser.parse(xmlContent);
  const root = parsed?.ImportExportXml;
  if (!root) {
    return { tables: [], globalRelationships: [] };
  }

  const entitiesNode = root.Entities?.Entity;
  const rawEntities = Array.isArray(entitiesNode)
    ? entitiesNode
    : entitiesNode
    ? [entitiesNode]
    : [];

  const tables: EntityTableMetadata[] = [];

  for (const ent of rawEntities) {
    const schemaName = ent.Name?.['#text'] || ent.Name || ent['@_Name'] || 'unnamed_entity';
    const localizedNames = ent.LocalizedNames?.LocalizedName;
    const displayName = Array.isArray(localizedNames)
      ? localizedNames[0]?.['@_description'] || schemaName
      : localizedNames?.['@_description'] || schemaName;

    const primaryIdAttribute = ent.EntityInfo?.entity?.PrimaryIdAttribute || `${schemaName}id`;
    const primaryNameAttribute = ent.EntityInfo?.entity?.PrimaryNameAttribute || `${schemaName}name`;

    // Parse attributes/columns
    const attributesNode = ent.EntityInfo?.entity?.attributes?.attribute;
    const rawAttrs = Array.isArray(attributesNode)
      ? attributesNode
      : attributesNode
      ? [attributesNode]
      : [];

    const columns: ColumnMetadata[] = [];
    for (const attr of rawAttrs) {
      const attrSchema = attr.PhysicalName || attr.Name || attr['@_PhysicalName'];
      if (!attrSchema) continue;

      const attrLocNames = attr.LocalizedNames?.LocalizedName;
      const attrDisplay = Array.isArray(attrLocNames)
        ? attrLocNames[0]?.['@_description'] || attrSchema
        : attrLocNames?.['@_description'] || attrSchema;

      const type = attr.Type || 'nvarchar';
      const req = attr.RequiredLevel || 'none';
      const maxLen = attr.MaxLength ? parseInt(attr.MaxLength, 10) : undefined;

      // Check for OptionSet options
      let options: Array<{ label: string; value: number | string }> | undefined;
      const optionsNode = attr.optionset?.options?.option;
      if (optionsNode) {
        const rawOptions = Array.isArray(optionsNode) ? optionsNode : [optionsNode];
        options = rawOptions.map(opt => {
          const optLabel = Array.isArray(opt.labels?.label)
            ? opt.labels.label[0]?.['@_description']
            : opt.labels?.label?.['@_description'] || String(opt['@_value']);
          return {
            label: optLabel,
            value: opt['@_value'],
          };
        });
      }

      columns.push({
        schemaName: attrSchema,
        displayName: attrDisplay,
        type,
        requiredLevel: req,
        maxLength: maxLen,
        options,
      });
    }

    // Parse forms
    const formsNode = ent.FormXml?.forms?.systemform;
    const rawForms = Array.isArray(formsNode) ? formsNode : formsNode ? [formsNode] : [];
    const forms: FormMetadata[] = rawForms.map(f => {
      const formId = f.formid || f['@_formid'] || 'form-id';
      const locName = Array.isArray(f.LocalizedNames?.LocalizedName)
        ? f.LocalizedNames.LocalizedName[0]?.['@_description']
        : f.LocalizedNames?.LocalizedName?.['@_description'] || 'Information';
      return {
        formId,
        name: locName,
        type: f['@_type'] || 'main',
        fields: [],
      };
    });

    // Parse savedqueries/views
    const queriesNode = ent.SavedQueries?.savedqueries?.savedquery;
    const rawQueries = Array.isArray(queriesNode) ? queriesNode : queriesNode ? [queriesNode] : [];
    const views: ViewMetadata[] = rawQueries.map(q => {
      const queryId = q.savedqueryid || 'view-id';
      const locName = Array.isArray(q.LocalizedNames?.LocalizedName)
        ? q.LocalizedNames.LocalizedName[0]?.['@_description']
        : q.LocalizedNames?.LocalizedName?.['@_description'] || 'Active Records';
      return {
        queryId,
        name: locName,
        isDefault: q.isdefault === '1' || q.isdefault === 1,
        fetchXml: typeof q.fetchxml === 'string' ? q.fetchxml : undefined,
      };
    });

    tables.push({
      schemaName,
      displayName,
      primaryIdAttribute,
      primaryNameAttribute,
      columns,
      relationships: [],
      forms,
      views,
    });
  }

  // Parse global EntityRelationships
  const relsNode = root.EntityRelationships?.EntityRelationship;
  const rawRels = Array.isArray(relsNode) ? relsNode : relsNode ? [relsNode] : [];
  const globalRelationships: RelationshipMetadata[] = [];

  for (const rel of rawRels) {
    const relName = rel['@_Name'] || rel.Name || 'unnamed_rel';
    const relType = rel.EntityRelationshipType === 'ManyToMany' ? 'ManyToMany' : 'OneToMany';
    const referencing = rel.ReferencingEntityName || rel.ReferencingEntity;
    const referenced = rel.ReferencedEntityName || rel.ReferencedEntity;

    const relationship: RelationshipMetadata = {
      name: relName,
      type: relType,
      referencingEntity: referencing || '',
      referencedEntity: referenced || '',
      referencingAttribute: rel.ReferencingAttributeName,
      cascadeDelete: rel.CascadeDelete,
    };

    globalRelationships.push(relationship);

    // Attach to referencing table
    const refTable = tables.find(t => t.schemaName.toLowerCase() === referencing?.toLowerCase());
    if (refTable) {
      refTable.relationships.push(relationship);
    }
    // Attach to referenced table
    const targetTable = tables.find(t => t.schemaName.toLowerCase() === referenced?.toLowerCase());
    if (targetTable && targetTable !== refTable) {
      targetTable.relationships.push(relationship);
    }
  }

  return { tables, globalRelationships };
}

