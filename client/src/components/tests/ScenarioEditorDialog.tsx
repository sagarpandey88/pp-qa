import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTrigger,
  DialogSurface,
  DialogTitle,
  DialogBody,
  DialogActions,
  DialogContent,
  Field,
  Input,
  Textarea,
  Button,
  Dropdown,
  Option,
  Text,
  makeStyles,
} from '@fluentui/react-components';
import { EditRegular, AddRegular } from '@fluentui/react-icons';

const useStyles = makeStyles({
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
    marginTop: '12px',
  },
});

interface ScenarioEditorDialogProps {
  scenario?: any;
  onSave: (scenario: any) => void;
  triggerButton?: React.ReactElement;
}

export const ScenarioEditorDialog: React.FC<ScenarioEditorDialogProps> = ({
  scenario,
  onSave,
  triggerButton,
}) => {
  const styles = useStyles();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [targetAppType, setTargetAppType] = useState('model_driven');
  const [stepsText, setStepsText] = useState('');
  const [assertionsText, setAssertionsText] = useState('');
  const [preconditionsText, setPreconditionsText] = useState('');

  useEffect(() => {
    if (scenario) {
      setTitle(scenario.title || '');
      setTargetAppType(scenario.targetAppType || 'model_driven');
      setStepsText((scenario.steps || []).join('\n'));
      setAssertionsText((scenario.expectedAssertions || []).join('\n'));
      setPreconditionsText((scenario.preconditions || []).join('\n'));
    } else {
      setTitle('');
      setTargetAppType('model_driven');
      setStepsText('');
      setAssertionsText('');
      setPreconditionsText('');
    }
  }, [scenario, open]);

  const handleSave = () => {
    if (!title.trim()) {
      alert('Scenario title is required');
      return;
    }

    const steps = stepsText
      .split('\n')
      .map(s => s.trim())
      .filter(Boolean);

    const expectedAssertions = assertionsText
      .split('\n')
      .map(s => s.trim())
      .filter(Boolean);

    const preconditions = preconditionsText
      .split('\n')
      .map(s => s.trim())
      .filter(Boolean);

    onSave({
      id: scenario?.id || `scenario-${Date.now()}`,
      title,
      targetAppType,
      preconditions,
      steps,
      expectedAssertions,
    });

    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={(_, data) => setOpen(data.open)}>
      <DialogTrigger disableButtonEnhancement>
        {triggerButton || (
          <Button appearance="secondary" icon={<AddRegular />}>
            Add Scenario Card
          </Button>
        )}
      </DialogTrigger>
      <DialogSurface style={{ maxWidth: '600px', width: '100%' }}>
        <DialogBody>
          <DialogTitle>{scenario ? 'Edit Test Scenario' : 'New Test Scenario'}</DialogTitle>
          <DialogContent className={styles.container}>
            <Field label="Scenario Title" required>
              <Input
                value={title}
                onChange={(e, data) => setTitle(data.value)}
                placeholder="e.g. Create Account & Validate SLA Escalation"
              />
            </Field>

            <Field label="Target Power Platform Component">
              <Dropdown
                value={
                  targetAppType === 'model_driven'
                    ? 'Model-Driven App'
                    : targetAppType === 'canvas'
                    ? 'Canvas App'
                    : 'Copilot Studio Agent'
                }
                selectedOptions={[targetAppType]}
                onOptionSelect={(_, data) => setTargetAppType(data.optionValue as string)}
              >
                <Option value="model_driven">Model-Driven App</Option>
                <Option value="canvas">Canvas App</Option>
                <Option value="copilot">Copilot Studio Agent</Option>
              </Dropdown>
            </Field>

            <Field label="Preconditions (one per line)">
              <Textarea
                rows={2}
                value={preconditionsText}
                onChange={(e, data) => setPreconditionsText(data.value)}
                placeholder="Active Dataverse user session&#10;Account entity permissions"
              />
            </Field>

            <Field label="Execution Steps (one per line)" required>
              <Textarea
                rows={4}
                value={stepsText}
                onChange={(e, data) => setStepsText(data.value)}
                placeholder="Click + New button on command bar&#10;Fill Account Name with &quot;Contoso Energy&quot;&#10;Click Save &amp; Close"
              />
            </Field>

            <Field label="Expected Assertions (one per line)" required>
              <Textarea
                rows={3}
                value={assertionsText}
                onChange={(e, data) => setAssertionsText(data.value)}
                placeholder="Grid contains &quot;Contoso Energy&quot;&#10;No error notification banners displayed"
              />
            </Field>
          </DialogContent>

          <DialogActions style={{ marginTop: '16px' }}>
            <Button appearance="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button appearance="primary" onClick={handleSave}>
              Save Scenario
            </Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
};

