"use client";

import React, { useState, useEffect } from 'react';
import { 
    Box, 
    Button, 
    FormControl, 
    InputLabel, 
    MenuItem, 
    Modal, 
    Select, 
    SelectChangeEvent, 
    Typography,
    Stack,
    useTheme,
    Paper,
    Fade,
    Divider,
    CircularProgress
} from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import { useTranslation } from 'react-i18next';
import { useParams, useRouter } from 'next/navigation';

interface OnboardingData {
  industry: string;
  region: string;
}

interface OnboardingFlowProps {
  open: boolean;
  onSubmit: (data: OnboardingData) => void;
  onSkip: () => void;
  isSubmitting: boolean;
}

export const OnboardingFlow: React.FC<OnboardingFlowProps> = ({ 
  open, 
  onSubmit, 
  onSkip,
  isSubmitting 
}) => {
  const theme = useTheme();
  const router = useRouter();
  const params = useParams();
  const { t } = useTranslation();
  
  // Get the tenant slug from the URL params
  const tenantSlug = Array.isArray(params.tenant) ? params.tenant[0] : params.tenant;
  
  const [formData, setFormData] = useState<OnboardingData>({
    industry: '',
    region: ''
  });
  
  // Add state to track success screen
  const [showSuccess, setShowSuccess] = useState(false);
  const [successAction, setSuccessAction] = useState<'proceed' | 'skip'>('proceed');
  const [isRedirecting, setIsRedirecting] = useState(false);

  const handleFieldChange = (field: keyof OnboardingData) => (event: SelectChangeEvent) => {
    setFormData(prev => ({
      ...prev,
      [field]: event.target.value
    }));
  };

  // Add effect for redirection after onboarding is completed
  useEffect(() => {
    if (isRedirecting && tenantSlug) {
      // Allow time for success screen to show before redirecting
      const redirectTimer = setTimeout(() => {
        router.push(`/${tenantSlug}/Crm`);
      }, 3000);
      
      return () => clearTimeout(redirectTimer);
    }
  }, [isRedirecting, router, tenantSlug]);

  const handleSubmit = () => {
    if (formData.industry && formData.region) {
      setSuccessAction('proceed');
      setShowSuccess(true);
      // Delay the actual submission to show success screen
      setTimeout(() => {
        onSubmit(formData);
        // Set redirecting state to trigger the useEffect
        setIsRedirecting(true);
      }, 2000);
    }
  };
  
  const handleSkip = () => {
    setSuccessAction('skip');
    setShowSuccess(true);
    // Delay the actual skip to show success screen
    setTimeout(() => {
      onSkip();
      // Set redirecting state to trigger the useEffect
      setIsRedirecting(true);
    }, 2000);
  };

  // Render success screen
  if (showSuccess) {
    return (
      <Modal
        open={open}
        aria-labelledby="onboarding-success-title"
      >
        <Fade in={open}>
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
              {successAction === 'proceed' 
                ? t('onboarding.success.proceed.title') 
                : t('onboarding.success.skip.title')}
            </Typography>
            
            <Typography 
              variant="subtitle1"
              color="text.secondary"
              sx={{ mb: theme.spacing(2) }}
            >
              {successAction === 'proceed' 
                ? t('onboarding.success.proceed.message') 
                : t('onboarding.success.skip.message')}
            </Typography>
            
            <Divider sx={{ width: '100%', my: theme.spacing(2) }} />
            
            <Box sx={{ mt: theme.spacing(1), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CircularProgress size={24} sx={{ mr: theme.spacing(1) }} />
              <Typography variant="body2" component="span">
                {isRedirecting 
                  ? t('onboarding.success.redirecting', { tenant: tenantSlug })
                  : t('onboarding.success.redirecting')}
              </Typography>
            </Box>
          </Paper>
        </Fade>
      </Modal>
    );
  }

  // Render main onboarding form
  return (
    <Paper
      elevation={0}
      sx={{
        width: 450,
        bgcolor: 'background.paper',
        border: `1px solid ${theme.palette.divider}`,
        borderRadius: theme.shape.borderRadius,
        p: theme.spacing(4),
        display: 'flex',
        flexDirection: 'column',
        gap: theme.spacing(3),
        margin: '0 auto',
      }}
    >
        <Typography 
          id="onboarding-modal-title" 
          variant="h5" 
          component="h2" 
          align="center"
          fontWeight={theme.typography.fontWeightMedium}
        >
          {t('onboarding.welcome')}
        </Typography>
        
        <Typography 
          id="onboarding-modal-description" 
          variant="subtitle1" 
          align="center"
          color="text.secondary"
        >
          {t('onboarding.description')}
        </Typography>

        <FormControl fullWidth>
          <InputLabel id="industry-select-label">
            {t('onboarding.industry.label')}
          </InputLabel>
          <Select
            labelId="industry-select-label"
            id="industry-select"
            value={formData.industry}
            label={t('onboarding.industry.label')}
            onChange={handleFieldChange('industry')}
          >
            <MenuItem value="fashion">{t('onboarding.industry.options.fashion')}</MenuItem>
            <MenuItem value="electronics">{t('onboarding.industry.options.electronics')}</MenuItem>
            <MenuItem value="home_goods">{t('onboarding.industry.options.home_goods')}</MenuItem>
            <MenuItem value="food_and_beverage">{t('onboarding.industry.options.food_and_beverage')}</MenuItem>
            <MenuItem value="health_and_beauty">{t('onboarding.industry.options.health_and_beauty')}</MenuItem>
          </Select>
        </FormControl>

        <FormControl fullWidth>
          <InputLabel id="region-select-label">
            {t('onboarding.region.label')}
          </InputLabel>
          <Select
            labelId="region-select-label"
            id="region-select"
            value={formData.region}
            label={t('onboarding.region.label')}
            onChange={handleFieldChange('region')}
          >
            <MenuItem value="in">{t('onboarding.region.options.india')}</MenuItem>
            <MenuItem value="us">{t('onboarding.region.options.us')}</MenuItem>
            <MenuItem value="eu">{t('onboarding.region.options.europe')}</MenuItem>
            <MenuItem value="au">{t('onboarding.region.options.au')}</MenuItem>
            <MenuItem value="uk">{t('onboarding.region.options.uk')}</MenuItem>
            <MenuItem value="ae">{t('onboarding.region.options.ae')}</MenuItem>
          </Select>
        </FormControl>

        <Stack direction="row" spacing={2} sx={{ mt: theme.spacing(2) }}>
          <Button
            variant="outlined"
            color="secondary"
            size="large"
            onClick={handleSkip}
            disabled={isSubmitting}
            sx={{ 
              py: theme.spacing(1.5),
              fontWeight: theme.typography.fontWeightMedium,
              flex: 1
            }}
          >
            {t('onboarding.button.skip')}
          </Button>
          
          <Button
            variant="contained"
            color="primary"
            size="large"
            onClick={handleSubmit}
            disabled={!formData.industry || !formData.region || isSubmitting}
            sx={{ 
              py: theme.spacing(1.5),
              fontWeight: theme.typography.fontWeightMedium,
              flex: 1
            }}
          >
            {isSubmitting ? t('onboarding.button.submitting') : t('onboarding.button.proceed')}
          </Button>
        </Stack>
    </Paper>
  );
};
