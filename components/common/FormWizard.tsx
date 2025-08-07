'use client';

import React, { ReactNode, useEffect, useState } from 'react';
import {
  Box,
  Paper,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Button,
  Typography,
  Grid,
  CircularProgress,
  Container,
} from '@mui/material';
import { motion, AnimatePresence, Variants } from 'framer-motion';

// Animation variants for smoother transitions
const contentVariants: Variants = {
  hidden: (direction: number) => ({
    opacity: 0,
    x: direction > 0 ? 20 : -20,
  }),
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.4,
      ease: [0.25, 0.1, 0.25, 1.0],
      when: 'beforeChildren',
      staggerChildren: 0.1,
    },
  },
  exit: (direction: number) => ({
    opacity: 0,
    x: direction > 0 ? -20 : 20,
    transition: {
      duration: 0.3,
      ease: [0.25, 0.1, 0.25, 1.0],
    },
  }),
};

interface StepItem {
  /**
   * Label for the step
   */
  label: string;

  /**
   * Description for the step
   */
  description: string;

  /**
   * Title for the step (shown in the content area)
   */
  title?: string;

  /**
   * Subtitle for the step (shown in the content area)
   */
  subtitle?: string;
}

interface FormWizardProps {
  /**
   * Title of the wizard (optional, will use step title if not provided)
   */
  title?: string;

  /**
   * Optional subtitle description (will use step subtitle if not provided)
   */
  subtitle?: string;

  /**
   * Array of step items to display in the stepper
   */
  steps: StepItem[];

  /**
   * Current active step (zero-based index)
   */
  activeStep: number;

  /**
   * Function to handle moving to the next step
   * For Step 1, 2 and 3: Move to next step
   */
  onNext: () => Promise<void>;

  /**
   * Function to handle moving to the previous step
   * For Step 1: Go back to previous page (router.back())
   * For Step 2, 3, 4: Go to previous step
   */
  onBack: () => void;

  /**
   * Function to handle final submission
   * Only used in the final step
   */
  onFinish: () => Promise<void>;

  /**
   * Function to render the content for the current step
   */
  renderStepContent: (step: number) => ReactNode;

  /**
   * Loading states
   */
  isLoading?: boolean;
  isSavingStep?: boolean;

  /**
   * Custom label for the finish button (defaults to "Confirm & Submit")
   */
  finishButtonLabel?: string;

  /**
   * Custom label for the next button (defaults to "Next")
   */
  nextButtonLabel?: string;

  /**
   * Option to hide the navigation buttons (Back and Next/Submit)
   */
  hideNavigationButtons?: boolean;

  /**
   * Function to handle skipping the upload step (only used in step 3)
   */
  onSkipUpload?: () => void;
}

/**
 * A reusable form wizard component with vertical stepper and content area
 *
 * This component provides a consistent layout for multi-step forms with
 * a vertical stepper on the left and content area on the right.
 */
const FormWizard = ({
  title,
  subtitle,
  steps,
  activeStep,
  onNext,
  onBack,
  onFinish,
  renderStepContent,
  isLoading = false,
  isSavingStep = false,
  finishButtonLabel = "Confirm & Submit",
  nextButtonLabel = "Next",
  hideNavigationButtons = false,
  onSkipUpload,
}: FormWizardProps) => {
  // Determine if we're on the final step
  const isFinalStep = activeStep === steps.length - 1;
  
  // Track direction of navigation for animations
  const [direction, setDirection] = useState(0);
  const [prevStep, setPrevStep] = useState(activeStep);

  // Update direction when activeStep changes
  useEffect(() => {
    if (activeStep > prevStep) {
      setDirection(1); // forward
    } else if (activeStep < prevStep) {
      setDirection(-1); // backward
    }
    setPrevStep(activeStep);
  }, [activeStep, prevStep]);

  if (isLoading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Paper
          elevation={3}
          sx={{
            p: 4,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 2,
            minHeight: "50vh",
          }}
        >
          <CircularProgress size={60} sx={{ mb: 3 }} />
          <Typography variant="h6" color="text.secondary">
            Loading...
          </Typography>
        </Paper>
      </Container>
    );
  }

  return (
    <Box sx={{ width: "100%", px: 2 }}>
      <Grid container spacing={3}>
        {/* Left Panel - Stepper only */}
        <Grid item xs={12} md={3}>
          <Paper
            sx={{
              p: 3,
              border: "1px solid #ccc",
              borderRadius: 2,
              position: "sticky",
              top: 86, // Add some space from the top of the viewport
              maxHeight: "calc(100vh - 48px)", // Subtract top and bottom margin
              overflow: "auto", // In case the stepper is taller than the viewport
              "&::-webkit-scrollbar": {
                display: "none",
              },
              boxShadow: "none",
            }}
          >
            {/* Vertical Stepper */}
            <Stepper
              activeStep={activeStep}
              orientation="vertical"
              sx={{ ml: 1 }}
            >
              {steps.map((step, index) => (
                <Step
                  key={index}
                  completed={activeStep > index}
                  sx={{
                    "& .MuiStepIcon-root": {
                      color: activeStep === index ? "primary.main" : "grey.400",
                      "&.Mui-completed": {
                        color: "success.main",
                      },
                      transition: "all 0.4s ease",
                    },
                    "& .MuiStepIcon-text": {
                      fill: "white",
                      fontWeight: "bold",
                      fontSize: "0.9rem", // Make the number text smaller
                    },
                  }}
                >
                  <StepLabel
                    sx={{
                      ".MuiStepLabel-label": {
                        fontWeight: activeStep === index ? "bold" : "normal",
                        transition: "all 0.3s ease",
                      },
                    }}
                  >
                    <Typography
                      variant="body2"
                      fontWeight={activeStep === index ? "bold" : "normal"}
                    >
                      {step.label}
                    </Typography>
                  </StepLabel>
                  <StepContent sx={{ mt: -1 }}>
                    <AnimatePresence>
                      {activeStep === index && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.3 }}
                        >
                          <Typography variant="caption" color="text.secondary">
                            {step.description}
                          </Typography>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </StepContent>
                </Step>
              ))}
            </Stepper>
          </Paper>
        </Grid>

        {/* Right Panel - Title and Form Content */}
        <Grid item xs={12} md={9}>
          <Paper
            sx={{
              p: 0,
              border: "1px solid #ccc",
              display: "flex",
              flexDirection: "column",
              borderRadius: 2,
              overflow: "hidden",
              minHeight: "70vh",
              boxShadow: "none",
            }}
          >
            {/* Title Section */}
            <Box sx={{ p: 2.5, borderBottom: 1, borderColor: "divider" }}>
              <AnimatePresence mode="wait">
                <motion.div
                  key={`title-${activeStep}`}
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.1 }}
                >
                  <Typography
                    variant="h5"
                    component="h2"
                    fontWeight="bold"
                    gutterBottom
                  >
                    {steps[activeStep]?.title ||
                      title ||
                      steps[activeStep]?.label ||
                      ""}
                  </Typography>
                  {(steps[activeStep]?.subtitle || subtitle) && (
                    <Typography variant="subtitle1" color="text.secondary">
                      {steps[activeStep]?.subtitle || subtitle}
                    </Typography>
                  )}
                </motion.div>
              </AnimatePresence>
            </Box>

            {/* Form Content */}
            <form onSubmit={(e) => e.preventDefault()}>
              <Box sx={{ p: 3, minHeight: "50vh", overflow: "hidden" }}>
                {renderStepContent(activeStep)}
              </Box>

              {/* Action Buttons */}
              <Box
                component={motion.div}
                initial={{ opacity: 0.8 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  p: 3,
                  borderTop: 1,
                  borderColor: "divider",
                  bgcolor: "background.default",
                }}
              >
                {/* Back button aligned to the left */}
                <Button variant="outlined" onClick={onBack}>
                  Back
                </Button>

                {/* Next/Submit button aligned to the right */}
                {!hideNavigationButtons && (
                  <Box sx={{ display: "flex", gap: 2 }}>
                    {/* Show Skip Upload button only in step 3 (activeStep 2) */}
                    {activeStep === 2 && onSkipUpload && (
                      <Button
                        variant="outlined"
                        color="primary"
                        onClick={onSkipUpload}
                        disabled={isSavingStep}
                      >
                        Skip Upload
                      </Button>
                    )}

                    {isFinalStep ? (
                      <Button
                        variant="contained"
                        color="primary"
                        onClick={() => onFinish()}
                        disabled={isSavingStep}
                        startIcon={
                          isSavingStep ? (
                            <CircularProgress size={20} color="inherit" />
                          ) : null
                        }
                      >
                        {isSavingStep ? "Processing..." : finishButtonLabel}
                      </Button>
                    ) : (
                      <Button
                        variant="contained"
                        onClick={() => onNext()}
                        disabled={isSavingStep}
                        startIcon={
                          isSavingStep ? (
                            <CircularProgress size={20} color="inherit" />
                          ) : null
                        }
                      >
                        {isSavingStep ? "Processing..." : nextButtonLabel}
                      </Button>
                    )}
                  </Box>
                )}
              </Box>
            </form>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default FormWizard;
