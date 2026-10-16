import { initDb, closeDb } from '../src/db/pool';
import { synthesizePlaywrightTestSuite } from '../src/services/testgen/testSynthesizer';
import { TestSuiteService } from '../src/services/testSuite.service';
import { findOrCreateUser } from '../src/services/auth.service';
import { SolutionService } from '../src/services/solution.service';
import { extractAndParseSolutionZip } from '../src/services/parser/zipExtractor';
import { createSampleSolutionZip } from './helpers/sampleSolutionZip';

describe('Phase 5: Playwright Test Synthesizer & Suites', () => {
  let solutionId: string;
  let suiteId: string;

  beforeAll(async () => {
    await initDb();
    const user = await findOrCreateUser('testgen@contoso.com', 'Testgen Tester');
    const zip = createSampleSolutionZip();
    const extracted = extractAndParseSolutionZip(zip);
    solutionId = await SolutionService.saveExtractedSolution(user.id, extracted);
  });

  afterAll(async () => {
    if (suiteId) {
      await TestSuiteService.deleteSuite(suiteId);
    }
    await closeDb();
  });

  it('should synthesize executable TypeScript Playwright test code from scenarios', () => {
    const scenarios = [
      {
        title: 'Create Account Record & Validate In Grid',
        targetAppType: 'model_driven',
        targetAppName: 'Customer Service Hub',
        preconditions: ['Active Dataverse session'],
        steps: [
          'Click "+ New" command bar button',
          'Fill "Account Name" with "Fabrikam Aerospace"',
          'Select "Industry" option "Consulting"',
          'Click "Save & Close"',
        ],
        expectedAssertions: [
          'Active Accounts grid contains "Fabrikam Aerospace"',
        ],
      },
      {
        title: 'Send Greeting To Support Copilot',
        targetAppType: 'copilot',
        targetAppName: 'SupportCopilotAgent',
        steps: [
          'Send Copilot prompt "Hi, I need help with my account"',
        ],
        expectedAssertions: [
          'Copilot response contains "Hello"',
        ],
      },
    ];

    const code = synthesizePlaywrightTestSuite({
      suiteTitle: 'Account Service End-to-End Suite',
      targetAppType: 'model_driven',
      targetAppName: 'Customer Service Hub',
      scenarios,
    });

    expect(code).toBeDefined();
    expect(code).toContain("test.describe('Account Service End-to-End Suite'");
    expect(code).toContain("from '../templates/pom';");
    expect(code).toContain("AppProvider");
    expect(code).toContain("test('Create Account Record & Validate In Grid'");
    expect(code).toContain("await modelApp.clickCommandButton('New');");
    expect(code).toContain("await form.setTextInput('accountname', 'Fabrikam Aerospace');");
    expect(code).toContain("await modelApp.saveAndClose();");
    expect(code).toContain("await grid.assertRowContains('Fabrikam Aerospace');");
    expect(code).toContain("await copilot.sendMessage('Hi, I need help with my account');");
  });

  it('should persist a test suite and spec file to disk', async () => {
    const suite = await TestSuiteService.createSuite(
      solutionId,
      'Integration Verification Suite',
      'End to end tests for Customer Case Automation solution',
      'model_driven',
      'Customer Service Hub',
      [
        {
          title: 'Verify Account View',
          targetAppType: 'model_driven',
          steps: ['Search "Contoso" in grid'],
          expectedAssertions: ['Grid contains "Contoso"'],
        },
      ]
    );

    expect(suite.id).toBeDefined();
    expect(suite.title).toBe('Integration Verification Suite');
    expect(suite.generatedCode).toContain('test.describe');
    suiteId = suite.id;

    const fetched = await TestSuiteService.getSuite(suiteId);
    expect(fetched).toBeDefined();
    expect(fetched?.scenarios.length).toBe(1);
  });

  it('should update test suite and re-synthesize spec', async () => {
    const updated = await TestSuiteService.updateSuite(suiteId, {
      title: 'Updated Integration Suite',
      scenarios: [
        {
          title: 'Updated Scenario 1',
          targetAppType: 'model_driven',
          steps: ['Click "+ New"'],
          expectedAssertions: ['Form visible'],
        },
        {
          title: 'Updated Scenario 2',
          targetAppType: 'copilot',
          steps: ['Send prompt "Help"'],
          expectedAssertions: ['Response visible'],
        },
      ],
    });

    expect(updated?.title).toBe('Updated Integration Suite');
    expect(updated?.scenarios.length).toBe(2);
    expect(updated?.generatedCode).toContain("test('Updated Scenario 1'");
    expect(updated?.generatedCode).toContain("test('Updated Scenario 2'");
  });

  it('should list suites with associated solution name and details', async () => {
    const list = await TestSuiteService.listSuites(solutionId);
    expect(list.length).toBeGreaterThan(0);
    const suite = list.find((s) => s.id === suiteId);
    expect(suite).toBeDefined();
    expect(suite.solutionName).toContain('Customer Case');
    expect(suite.solutionUniqueName).toBe('CustomerCaseAutomation');
  });

  it('should generate tailored AI test scenarios based on actual solution tables, flows, and bots', async () => {
    const scenarios = await TestSuiteService.generateScenariosForSolution(solutionId, {
      focusArea: 'all',
      targetAppType: 'model_driven',
      targetAppName: 'Customer Service Hub',
    });

    expect(scenarios.length).toBeGreaterThan(0);
    const tableScenario = scenarios.find((s) => s.title.includes('Account'));
    expect(tableScenario).toBeDefined();
    expect(tableScenario?.targetAppType).toBe('model_driven');
    expect(tableScenario?.steps.some((st) => st.includes('Account'))).toBe(true);

    const flowScenario = scenarios.find((s) => s.title.includes('Case Escalation'));
    expect(flowScenario).toBeDefined();

    const botScenario = scenarios.find((s) => s.targetAppType === 'copilot');
    expect(botScenario).toBeDefined();
  });
});
