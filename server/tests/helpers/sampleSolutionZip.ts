import AdmZip from 'adm-zip';

export function createSampleSolutionZip(): Buffer {
  const zip = new AdmZip();

  const solutionXml = `<?xml version="1.0" encoding="utf-8"?>
<ImportExportXml version="9.2.24011.00171" SolutionPackageVersion="9.2" languagecode="1033" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <SolutionManifest>
    <UniqueName>CustomerCaseAutomation</UniqueName>
    <LocalizedNames>
      <LocalizedName description="Customer Case &amp; Service Automation" languagecode="1033" />
    </LocalizedNames>
    <Descriptions>
      <Description description="Service lifecycle and SLA escalations." languagecode="1033" />
    </Descriptions>
    <Version>1.2.0.4</Version>
    <Managed>0</Managed>
    <Publisher>
      <UniqueName>ContosoGlobal</UniqueName>
      <LocalizedNames>
        <LocalizedName description="Contoso Global Solutions" languagecode="1033" />
      </LocalizedNames>
      <CustomizationPrefix>ctg</CustomizationPrefix>
    </Publisher>
    <RootComponents>
      <RootComponent type="1" schemaObjectCode="account" behavior="0" />
      <RootComponent type="1" schemaObjectCode="incident" behavior="0" />
      <RootComponent type="29" id="{11111111-2222-3333-4444-555555555555}" behavior="0" />
    </RootComponents>
  </SolutionManifest>
</ImportExportXml>`;

  const customizationsXml = `<?xml version="1.0" encoding="utf-8"?>
<ImportExportXml xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <Entities>
    <Entity>
      <Name LocalizedName="Account">account</Name>
      <EntityInfo>
        <entity Name="account">
          <LocalizedNames>
            <LocalizedName description="Account" languagecode="1033" />
          </LocalizedNames>
          <PrimaryIdAttribute>accountid</PrimaryIdAttribute>
          <PrimaryNameAttribute>name</PrimaryNameAttribute>
          <attributes>
            <attribute PhysicalName="name">
              <Type>nvarchar</Type>
              <RequiredLevel>required</RequiredLevel>
              <MaxLength>160</MaxLength>
              <LocalizedNames>
                <LocalizedName description="Account Name" languagecode="1033" />
              </LocalizedNames>
            </attribute>
            <attribute PhysicalName="telephone1">
              <Type>nvarchar</Type>
              <RequiredLevel>none</RequiredLevel>
              <MaxLength>50</MaxLength>
              <LocalizedNames>
                <LocalizedName description="Main Phone" languagecode="1033" />
              </LocalizedNames>
            </attribute>
            <attribute PhysicalName="industrycode">
              <Type>picklist</Type>
              <RequiredLevel>none</RequiredLevel>
              <LocalizedNames>
                <LocalizedName description="Industry" languagecode="1033" />
              </LocalizedNames>
              <optionset Name="account_industrycode">
                <options>
                  <option value="1">
                    <labels><label description="Accounting" languagecode="1033" /></labels>
                  </option>
                  <option value="2">
                    <labels><label description="Agriculture and Non-petrol Natural Resources" languagecode="1033" /></labels>
                  </option>
                  <option value="3">
                    <labels><label description="Consulting" languagecode="1033" /></labels>
                  </option>
                </options>
              </optionset>
            </attribute>
            <attribute PhysicalName="ctg_vipclient">
              <Type>boolean</Type>
              <RequiredLevel>none</RequiredLevel>
              <LocalizedNames>
                <LocalizedName description="VIP Client" languagecode="1033" />
              </LocalizedNames>
            </attribute>
          </attributes>
        </entity>
      </EntityInfo>
      <FormXml>
        <forms type="main">
          <systemform>
            <formid>{44444444-5555-6666-7777-888888888888}</formid>
            <LocalizedNames>
              <LocalizedName description="Account Main Form" languagecode="1033" />
            </LocalizedNames>
          </systemform>
        </forms>
      </FormXml>
      <SavedQueries>
        <savedqueries>
          <savedquery>
            <savedqueryid>{99999999-0000-1111-2222-333333333333}</savedqueryid>
            <LocalizedNames>
              <LocalizedName description="Active Accounts View" languagecode="1033" />
            </LocalizedNames>
            <isdefault>1</isdefault>
          </savedquery>
        </savedqueries>
      </SavedQueries>
    </Entity>
  </Entities>
  <EntityRelationships>
    <EntityRelationship Name="account_primary_contact">
      <EntityRelationshipType>OneToMany</EntityRelationshipType>
      <ReferencingEntityName>contact</ReferencingEntityName>
      <ReferencedEntityName>account</ReferencedEntityName>
      <ReferencingAttributeName>parentcustomerid</ReferencingAttributeName>
      <CascadeDelete>RemoveLink</CascadeDelete>
    </EntityRelationship>
  </EntityRelationships>
</ImportExportXml>`;

  const flowJson = JSON.stringify({
    name: 'Case Escalation Notification',
    properties: {
      displayName: 'Case Escalation Notification Flow',
      definition: {
        triggers: {
          When_a_row_is_created_or_modified: {
            type: 'OpenApiConnection',
            inputs: {
              host: { connectionName: 'shared_commondataserviceforapps' },
              operationId: 'CreateOrUpdateRecordNotification',
            },
          },
        },
        actions: {
          Condition_Is_High_Priority: {
            type: 'If',
            inputs: { expression: "@equals(triggerOutputs()?['prioritycode'], 1)" },
          },
          Send_Teams_Alert: {
            type: 'OpenApiConnection',
            inputs: { host: { connectionName: 'shared_teams' } },
            runAfter: { Condition_Is_High_Priority: ['Succeeded'] },
          },
        },
      },
    },
  });

  const botJson = JSON.stringify({
    name: 'SupportCopilotAgent',
    displayName: 'Tier 1 Support Copilot',
    triggerQueries: ['Help me with my order', 'Check SLA status', 'Contact rep'],
    content: {
      dialogTree: {
        steps: ['Greeting', 'GatherOrderNumber', 'GenerativeAnswersKnowledgeBase'],
      },
    },
  });

  zip.addFile('solution.xml', Buffer.from(solutionXml, 'utf8'));
  zip.addFile('customizations.xml', Buffer.from(customizationsXml, 'utf8'));
  zip.addFile('Workflows/CaseEscalationNotification.json', Buffer.from(flowJson, 'utf8'));
  zip.addFile('Bots/SupportCopilot.json', Buffer.from(botJson, 'utf8'));

  return zip.toBuffer();
}

