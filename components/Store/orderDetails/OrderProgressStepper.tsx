'use client';

import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Stepper,
  Step,
  StepLabel,
  StepConnector,
  styled,
  useTheme,
  StepIconProps,
} from '@mui/material';
import CheckIcon from '@mui/icons-material/Check';
import { OrderProgressStep } from '@/app/types/store/orderTypes';

/**
 * Props for the OrderProgressStepper component
 */
interface OrderProgressStepperProps {
  /** Array of steps in the order progress */
  steps: OrderProgressStep[];
}

/**
 * Custom styled StepConnector for the order progress stepper
 */
const CustomStepConnector = styled(StepConnector)(({ theme }) => ({
  '& .MuiStepConnector-line': {
    borderColor: theme.palette.divider,
    borderTopWidth: 2,
  },
  '&.Mui-active': {
    '& .MuiStepConnector-line': {
      borderColor: theme.palette.primary.main,
    },
  },
  '&.Mui-completed': {
    '& .MuiStepConnector-line': {
      borderColor: theme.palette.success.main,
    },
  },
}));

/**
 * Custom StepIcon component for the order progress stepper
 */
const CustomStepIcon = (props: StepIconProps) => {
  const { active, completed, className } = props;
  const theme = useTheme();

  if (completed) {
    return (
      <Box
        className={className}
        sx={{
          backgroundColor: theme.palette.success.main,
          zIndex: 1,
          color: theme.palette.success.contrastText,
          width: 24,
          height: 24,
          display: 'flex',
          borderRadius: '50%',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <CheckIcon sx={{ fontSize: 16 }} />
      </Box>
    );
  }

  return (
    <Box
      className={className}
      sx={{
        backgroundColor: active ? theme.palette.primary.main : theme.palette.action.disabled,
        zIndex: 1,
        color: active ? theme.palette.primary.contrastText : theme.palette.getContrastText(theme.palette.action.disabled),
        width: 24,
        height: 24,
        display: 'flex',
        borderRadius: '50%',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      {props.icon}
    </Box>
  );
};

/**
 * Order Progress Stepper component
 * 
 * Displays the current status of an order with a visual stepper
 * @param props Component props
 * @returns React component
 */
export const OrderProgressStepper: React.FC<OrderProgressStepperProps> = ({ steps }) => {
  const { t } = useTranslation('common');
  const theme = useTheme();
  
  // Find the active step index (first active or last completed)
  const activeStepIndex = steps.findIndex(step => step.active) !== -1 
    ? steps.findIndex(step => step.active)
    : steps.filter(step => step.completed).length - 1;

  return (
    <Box sx={{ my: theme.spacing(4) }}>
      <Stepper 
        activeStep={activeStepIndex} 
        alternativeLabel
        connector={<CustomStepConnector />}
      >
        {steps.map((step) => (
          <Step key={step.labelKey} completed={step.completed}>
            <StepLabel
              StepIconComponent={CustomStepIcon}
              StepIconProps={{
                active: step.active,
                completed: step.completed,
              }}
            >
              {t(step.labelKey)}
            </StepLabel>
          </Step>
        ))}
      </Stepper>
    </Box>
  );
};

export default OrderProgressStepper;
