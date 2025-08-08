"use client";

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useRouter } from 'next/navigation';
import { 
  Box,
  Container, 
  Typography,
  Alert,
  AlertColor,
  Snackbar,
  CircularProgress,
  useTheme,
  Modal,
  Paper,
  Fade
} from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import { OnboardingFlow } from '@/app/components/admin/onboarding/OnboardingFlow';
import { useOnboardingMutation, OnboardingTriggerPayload } from '@/app/hooks/api/admin/onboarding';
import { useTenantConfigurationQuery, useUpdateTenantConfigurationMutation } from '@/app/hooks/api/admin/tenant-config';

/**
 * Page component for triggering and managing tenant onboarding
 * Handles the onboarding flow modal and API interactions
 */
const OnboardingTriggerPage = () => {
  const theme = useTheme();
  const router = useRouter();
  const params = useParams();
  const { t } = useTranslation();
  
  // Get the tenant slug from the URL params
  const tenantSlug = Array.isArray(params.tenant) ? params.tenant[0] : params.tenant as string;
  
  // State management
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showInitialSuccess, setShowInitialSuccess] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as AlertColor
  });
  const [isRedirectingAfterInitialSuccess, setIsRedirectingAfterInitialSuccess] = useState(false);

  // Fetch tenant configuration
  const { 
    data: tenantConfig, 
    isLoading: isLoadingConfig,
    isError: isConfigError,
    refetch: refetchConfig
  } = useTenantConfigurationQuery();

  // Initialize onboarding mutation
  const { 
    mutate: triggerOnboarding, 
    isPending: isSubmitting
  } = useOnboardingMutation();
  
  // Initialize tenant configuration update mutation
  const {
    mutate: updateTenantConfig,
    isPending: isUpdatingConfig
  } = useUpdateTenantConfigurationMutation();
  
  // Add effect to handle redirection after the initial success screen shows
  useEffect(() => {
    if (isRedirectingAfterInitialSuccess && tenantSlug) {
      // Redirect to the CRM dashboard
      router.push(`/${tenantSlug}/Crm`);
    }
  }, [isRedirectingAfterInitialSuccess, router, tenantSlug]);

  // Check if onboarding should be shown based on tenant configuration
  useEffect(() => {
    if (tenantConfig) {
      if (tenantConfig.is_onboarding_completed) {
        // Show success screen briefly when onboarding is already completed
        setShowInitialSuccess(true);
        // Hide success screen after 3 seconds and redirect
        const timer = setTimeout(() => {
          setShowInitialSuccess(false);
          // Set redirecting state to trigger the redirection effect
          setIsRedirectingAfterInitialSuccess(true);
        }, 3000);
        return () => clearTimeout(timer);
      } else {
        // Show onboarding modal if onboarding is not completed
        setIsModalOpen(true);
      }
    }
  }, [tenantConfig]);

  // Handle form submission when user clicks Proceed
  const handleOnboardingSubmit = async (data: { 
    industry: string; 
    region: string 
  }) => {
    if (!tenantConfig) return;

    const payload: OnboardingTriggerPayload = {
      industry: data.industry,
      region: data.region,
    };
    
    triggerOnboarding(payload, {
      onSuccess: () => {
        // Mark onboarding as completed
        updateTenantConfig({
          configId: tenantConfig.id,
          updates: { is_onboarding_completed: true }
        }, {
          onSuccess: () => {
            // The modal will close automatically after the success screen
            setTimeout(() => {
              setIsModalOpen(false);
              refetchConfig();
            }, 2000);
          },
          onError: (error) => {
            setSnackbar({
              open: true,
              message: error.response?.data?.message || t('onboarding.errors.update'),
              severity: 'error'
            });
          }
        });
      },
      onError: (error) => {
        setSnackbar({
          open: true,
          message: error.response?.data?.message || t('onboarding.errors.generic'),
          severity: 'error'
        });
      }
    });
  };

  // Handle skip action
  const handleSkip = () => {
    if (!tenantConfig) return;
    
    // Just mark onboarding as completed without triggering the process
    updateTenantConfig({
      configId: tenantConfig.id,
      updates: { is_onboarding_completed: true }
    }, {
      onSuccess: () => {
        // The modal will close automatically after the success screen
        setTimeout(() => {
          setIsModalOpen(false);
          refetchConfig();
        }, 2000);
      },
      onError: (error) => {
        setSnackbar({
          open: true,
          message: error.response?.data?.message || t('onboarding.errors.update'),
          severity: 'error'
        });
      }
    });
  };

  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  return (
      <Box sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        width: '100%',
        p: theme.spacing(3)
      }}>
        {/* <Typography variant="h4" gutterBottom>
          {t('onboarding.page.title')}
        </Typography>
        
        <Typography 
          variant="subtitle1" 
          sx={{ 
            mb: theme.spacing(3),
            color: 'text.secondary'
          }}
        >
          {t('onboarding.page.subtitle')}
        </Typography> */}

        {/* Loading state */}
        {isLoadingConfig && (
          <Box display="flex" justifyContent="center" my={4}>
            <CircularProgress />
          </Box>
        )}

        {/* Error state */}
        {isConfigError && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {t('onboarding.errors.config')}
          </Alert>
        )}

        {/* Initial success screen when onboarding is already completed */}
        <Modal
          open={showInitialSuccess}
          aria-labelledby="onboarding-already-completed-title"
        >
          <Fade in={showInitialSuccess}>
            <Paper
              elevation={0}
              sx={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: 450,
                bgcolor: 'background.paper',
                border: `1px solid ${theme.palette.divider}`,
                boxShadow: theme.shadows[24],
                borderRadius: theme.shape.borderRadius,
                p: theme.spacing(4),
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: theme.spacing(3),
              }}
            >
              <CheckCircleOutlineIcon 
                color="success" 
                sx={{ 
                  fontSize: 80,
                  mb: theme.spacing(2)
                }} 
              />
              
              <Typography 
                variant="h5" 
                component="h2"
                fontWeight={theme.typography.fontWeightMedium}
              >
                {t('onboarding.alreadyCompleted.title')}
              </Typography>
              
              <Typography 
                variant="subtitle1"
                color="text.secondary"
                sx={{ mb: theme.spacing(2) }}
              >
                {t('onboarding.alreadyCompleted.message')}
              </Typography>
            </Paper>
          </Fade>
        </Modal>

        {/* Onboarding modal */}
        {tenantConfig && (
          <OnboardingFlow
            open={isModalOpen}
            onSubmit={handleOnboardingSubmit}
            onSkip={handleSkip}
            isSubmitting={isSubmitting || isUpdatingConfig}
          />
        )}

        {/* Notifications */}
        <Snackbar
          open={snackbar.open}
          autoHideDuration={6000}
          onClose={handleCloseSnackbar}
          anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        >
          <Alert 
            onClose={handleCloseSnackbar}
            severity={snackbar.severity}
            variant="filled"
            sx={{ width: '100%' }}
          >
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Box>
  );
};

export default OnboardingTriggerPage;
