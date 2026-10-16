import { initDb, closeDb } from '../src/db/pool';
import { AgenticScenarioGenerator } from '../src/services/testgen/agenticScenarioGenerator';
import { AgenticSynthesizer } from '../src/services/testgen/agenticSynthesizer';
import { TestSuiteService } from '../src/services/testSuite.service';
import { findOrCreateUser } from '../src/services/auth.service';
import { SolutionService } from '../src/services/solution.service';
import { extractAndParseSolutionZip } from '../src/services/parser/zipExtractor';
import { createSampleSolutionZip } from './helpers/sampleSolutionZip';

describe('Phase 7: Agentic AI Test Generation & Metadata Synthesis', () => {
  let solutionId: string;
  let userId: string;

  beforeAll(async () => {
    await initDb();
    const user = await findOrCreateUser('agentic-qa@contoso.com', 'Agentic QA Engineer');
    userId = user.id;

    const zip = createSampleSolutionZip();
    const extracted = extractAndParseSolutionZip(zip);
    solutionId = await SolutionService.saveExtractedSolution(userId, extracted);
  });

  afterAll(async () => {
    await closeDb();
  });

  it('should generate metadata-grounded entity CRUD and validation scenarios', async () => {
    const scenarios = await AgenticScenarioGenerator.generateScenarios(
      solutionId,
      { focusArea: 'entity_crud', targetAppType: 'model_driven', targetAppName: 'Customer Service Hub' },
      userId
    );

    expect(scenarios.length).toBeGreaterThanOrEqual(2);

    // Verify happy path scenario has real column data
    const happyPath = scenarios.find((s) => s.title.includes('Create Account Record'));
    expect(happyPath).toBeDefined();
    expect(happyPath?.targetAppType).toBe('model_driven');
    expect(happyPath?.steps.some((st) => st.includes('Account Name'))).toBe(true);
    expect(happyPath?.steps.some((st) => st.includes('Main Phone'))).toBe(true);
    expect(happyPath?.steps.some((st) => st.includes('Industry') || st.includes('Consulting'))).toBe(true);
    expect(happyPath?.steps.some((st) => st.includes('Save & Close'))).toBe(true);

    // Verify validation scenario
    const validation = scenarios.find((s) => s.title.includes('Required Fields'));
    expect(validation).toBeDefined();
    expect(validation?.expectedAssertions.some((a) => a.includes('required') || a.includes('error'))).toBe(true);
  });

  it('should generate parent-child relational scenarios when relationships exist in metadata', async () => {
    const scenarios = await AgenticScenarioGenerator.generateScenarios(
      solutionId,
      { focusArea: 'relationships', targetAppType: 'model_driven', targetAppName: 'Customer Service Hub' },
      userId
    );

    const relScenario = scenarios.find((s) => s.title.includes('Relationship Between Account and contact'));
    expect(relScenario).toBeDefined();
    expect(relScenario?.steps.some((st) => st.includes('subgrid') || st.includes('contact'))).toBe(true);
  });

  it('should generate cloud flow event trigger scenarios grounded in flow definitions', async () => {
    const scenarios = await AgenticScenarioGenerator.generateScenarios(
      solutionId,
      { focusArea: 'cloud_flows', targetAppType: 'model_driven', targetAppName: 'Customer Service Hub' },
      userId
    );

    expect(scenarios.length).toBeGreaterThan(0);
    const flowScenario = scenarios.find((s) => s.title.includes('Case Escalation'));
    expect(flowScenario).toBeDefined();
    expect(flowScenario?.steps.some((st) => st.includes('Case Escalation'))).toBe(true);
  });

  it('should generate Copilot Studio conversational scenarios grounded in bot topics', async () => {
    const scenarios = await AgenticScenarioGenerator.generateScenarios(
      solutionId,
      { focusArea: 'copilot_agent', targetAppType: 'copilot', targetAppName: 'Tier 1 Support Copilot' },
      userId
    );

    expect(scenarios.length).toBeGreaterThan(0);
    const botScenario = scenarios[0];
    expect(botScenario.targetAppType).toBe('copilot');
    expect(botScenario.steps.some((st) => st.includes('greeting') || st.includes('prompt'))).toBe(true);
    expect(botScenario.expectedAssertions.some((a) => a.includes('generative') || a.includes('response'))).toBe(true);
  });

  it('should synthesize Playwright TypeScript specs with test.step blocks and POM calls', async () => {
    const scenarios = await AgenticScenarioGenerator.generateScenarios(
      solutionId,
      { focusArea: 'all', targetAppType: 'model_driven', targetAppName: 'Customer Service Hub' },
      userId
    );

    const code = await AgenticSynthesizer.synthesize({
      suiteTitle: 'Full Regression Verification Suite',
      targetAppType: 'model_driven',
      targetAppName: 'Customer Service Hub',
      scenarios,
      solutionId,
      userId,
      useStepsBlock: true,
    });

    expect(code).toBeDefined();
    expect(code).toContain("import { test, expect } from '@playwright/test';");
    expect(code).toContain("from '../templates/pom';");
    expect(code).toContain("test.describe('Full Regression Verification Suite'");
    expect(code).toContain("appProvider = new AppProvider(page);");
    expect(code).toContain("modelApp = new ModelDrivenAppPage(page);");
    expect(code).toContain("grid = new GridComponent(page);");
    expect(code).toContain("form = new FormComponent(page);");
    expect(code).toContain("copilot = new CopilotChatComponent(page);");
    // Verify test.step blocks are generated for step traceability
    expect(code).toContain("await test.step(");
  });

  it('should create and persist a test suite using AgenticScenarioGenerator and AgenticSynthesizer', async () => {
    const scenarios = await TestSuiteService.generateScenariosForSolution(
      solutionId,
      { focusArea: 'entity_crud', targetAppType: 'model_driven', targetAppName: 'Customer Service Hub' },
      userId
    );

    const suite = await TestSuiteService.createSuite(
      solutionId,
      'Automated Account Verification Suite',
      'End to end tests generated with Agentic AI',
      'model_driven',
      'Customer Service Hub',
      scenarios
    );

    expect(suite.id).toBeDefined();
    expect(suite.scenarios.length).toBeGreaterThan(0);
    expect(suite.generatedCode).toContain('test.describe');
    expect(suite.generatedCode).toContain('await test.step(');

    // Clean up
    await TestSuiteService.deleteSuite(suite.id);
  });
});

