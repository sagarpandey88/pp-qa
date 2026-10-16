import React, { useState } from 'react';
import {
  TabList,
  Tab,
  makeStyles,
  tokens,
  Table,
  TableHeader,
  TableRow,
  TableHeaderCell,
  TableBody,
  TableCell,
  TableCellLayout,
  Badge,
  Text,
  Accordion,
  AccordionItem,
  AccordionHeader,
  AccordionPanel,
} from '@fluentui/react-components';
import {
  TableRegular,
  FlowRegular,
  BotRegular,
  FolderOpenRegular,
  CheckmarkRegular,
  DismissRegular,
} from '@fluentui/react-icons';

const useStyles = makeStyles({
  container: {
    backgroundColor: tokens.colorNeutralBackground1,
    borderRadius: '8px',
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    padding: '20px',
  },
  tabList: {
    marginBottom: '16px',
    borderBottom: `1px solid ${tokens.colorNeutralStroke3}`,
  },
  tableWrapper: {
    marginTop: '12px',
  },
});

interface MetadataViewerProps {
  tables: any[];
  flows: any[];
  bots: any[];
}

export const MetadataViewer: React.FC<MetadataViewerProps> = ({ tables, flows, bots }) => {
  const styles = useStyles();
  const [selectedTab, setSelectedTab] = useState<'tables' | 'flows' | 'bots'>('tables');

  return (
    <div className={styles.container}>
      <TabList
        selectedValue={selectedTab}
        onTabSelect={(_, data) => setSelectedTab(data.value as any)}
        className={styles.tabList}
      >
        <Tab value="tables" icon={<TableRegular />}>
          Dataverse Tables ({tables.length})
        </Tab>
        <Tab value="flows" icon={<FlowRegular />}>
          Cloud Flows ({flows.length})
        </Tab>
        <Tab value="bots" icon={<BotRegular />}>
          Copilot Agents ({bots.length})
        </Tab>
      </TabList>

      {selectedTab === 'tables' && (
        <div>
          {tables.length === 0 ? (
            <Text style={{ color: '#666' }}>No tables extracted in this solution package.</Text>
          ) : (
            <Accordion collapsible multiple>
              {tables.map((t, idx) => {
                const cols = typeof t.columns === 'string' ? JSON.parse(t.columns) : (t.columns || []);
                const rels = typeof t.relationships === 'string' ? JSON.parse(t.relationships) : (t.relationships || []);

                return (
                  <AccordionItem value={`table-${idx}`} key={t.id || idx}>
                    <AccordionHeader>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <TableRegular style={{ color: '#0078d4' }} />
                        <strong>{t.display_name || t.schemaName}</strong>
                        <code>({t.schema_name || t.schemaName})</code>
                        <Badge appearance="tint" color="brand">{cols.length} Columns</Badge>
                        {rels.length > 0 && <Badge appearance="outline">{rels.length} Relationships</Badge>}
                      </div>
                    </AccordionHeader>
                    <AccordionPanel>
                      <div style={{ marginBottom: '12px', fontSize: '13px' }}>
                        <div><strong>Primary ID:</strong> <code>{t.primary_id_attribute || t.primaryIdAttribute}</code></div>
                        <div><strong>Primary Name:</strong> <code>{t.primary_name_attribute || t.primaryNameAttribute}</code></div>
                      </div>

                      <Table size="small">
                        <TableHeader>
                          <TableRow>
                            <TableHeaderCell>Column Schema</TableHeaderCell>
                            <TableHeaderCell>Display Name</TableHeaderCell>
                            <TableHeaderCell>Data Type</TableHeaderCell>
                            <TableHeaderCell>Required</TableHeaderCell>
                            <TableHeaderCell>Options / Length</TableHeaderCell>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {cols.map((col: any, cidx: number) => (
                            <TableRow key={cidx}>
                              <TableCell><code>{col.schemaName}</code></TableCell>
                              <TableCell>{col.displayName}</TableCell>
                              <TableCell>
                                <Badge size="small" appearance="tint" color="subtle">{col.type}</Badge>
                              </TableCell>
                              <TableCell>{col.requiredLevel}</TableCell>
                              <TableCell>
                                {col.maxLength ? `Max: ${col.maxLength}` : col.options?.length ? `${col.options.length} options` : '-'}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </AccordionPanel>
                  </AccordionItem>
                );
              })}
            </Accordion>
          )}
        </div>
      )}

      {selectedTab === 'flows' && (
        <div>
          {flows.length === 0 ? (
            <Text style={{ color: '#666' }}>No cloud flows extracted in this solution package.</Text>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHeaderCell>Flow Name</TableHeaderCell>
                  <TableHeaderCell>Trigger Type</TableHeaderCell>
                  <TableHeaderCell>Actions</TableHeaderCell>
                  <TableHeaderCell>Connections</TableHeaderCell>
                </TableRow>
              </TableHeader>
              <TableBody>
                {flows.map((f, idx) => {
                  const acts = typeof f.actions === 'string' ? JSON.parse(f.actions) : (f.actions || []);
                  const conns = typeof f.connection_references === 'string' ? JSON.parse(f.connection_references) : (f.connectionReferences || f.connection_references || []);

                  return (
                    <TableRow key={f.id || idx}>
                      <TableCell>
                        <TableCellLayout media={<FlowRegular style={{ color: '#0078d4' }} />}>
                          <strong>{f.name}</strong>
                        </TableCellLayout>
                      </TableCell>
                      <TableCell>
                        <Badge appearance="filled" color="informative">{f.trigger_type || f.triggerType}</Badge>
                      </TableCell>
                      <TableCell>{acts.length} steps</TableCell>
                      <TableCell>{Array.isArray(conns) ? conns.join(', ') || 'Internal' : 'Internal'}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>
      )}

      {selectedTab === 'bots' && (
        <div>
          {bots.length === 0 ? (
            <Text style={{ color: '#666' }}>No Copilot Studio bots extracted in this solution package.</Text>
          ) : (
            bots.map((b, bidx) => {
              const topics = typeof b.topics === 'string' ? JSON.parse(b.topics) : (b.topics || []);

              return (
                <div key={b.id || bidx} style={{ marginBottom: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                    <BotRegular style={{ fontSize: '20px', color: '#0078d4' }} />
                    <strong style={{ fontSize: '15px' }}>{b.display_name || b.displayName}</strong>
                    <code>({b.bot_schema_name || b.botSchemaName})</code>
                  </div>

                  <Table size="small">
                    <TableHeader>
                      <TableRow>
                        <TableHeaderCell>Topic Name</TableHeaderCell>
                        <TableHeaderCell>Trigger Phrases</TableHeaderCell>
                        <TableHeaderCell>Generative Answers</TableHeaderCell>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {topics.map((t: any, tidx: number) => (
                        <TableRow key={tidx}>
                          <TableCell><strong>{t.displayName || t.name}</strong></TableCell>
                          <TableCell>{Array.isArray(t.triggerPhrases) ? t.triggerPhrases.join('; ') : 'Implicit'}</TableCell>
                          <TableCell>
                            {t.hasGenerativeAnswers ? (
                              <Badge appearance="filled" color="success" icon={<CheckmarkRegular />}>Enabled</Badge>
                            ) : (
                              <Badge appearance="tint" color="subtle" icon={<DismissRegular />}>None</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};
