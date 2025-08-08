'use client';

import { useState } from 'react';
import {
  Box,
  Typography,
  TextField,
  Checkbox,
  FormControlLabel,
  Radio,
  RadioGroup,
  FormGroup,
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Stack,
  Grid
} from '@mui/material';

interface SecurityAuthenticationProps {
  onSave?: () => void;
  readOnly?: boolean;
}

/**
 * Security & Authentication settings component 
 * Allows configuration of session management, password policy, account lockout, MFA, and SSO
 */
const SecurityAuthentication: React.FC<SecurityAuthenticationProps> = ({ onSave, readOnly = false }) => {
  // Session Management state
  const [sessionTimeout, setSessionTimeout] = useState<number>(30);
  const [maxSessionDuration, setMaxSessionDuration] = useState<number>(8);

  // Password Policy state
  const [minPasswordLength, setMinPasswordLength] = useState<number>(8);
  const [passwordHistory, setPasswordHistory] = useState<number>(5);
  const [passwordRequirements, setPasswordRequirements] = useState({
    uppercase: true,
    lowercase: true,
    numbers: true,
    specialSymbols: false
  });

  // Account Lockout Policy state
  const [failedAttempts, setFailedAttempts] = useState<number>(5);
  const [lockoutDuration, setLockoutDuration] = useState<number>(15);

  // MFA state
  const [mfaPolicy, setMfaPolicy] = useState<string>('optional');
  const [mfaFactors, setMfaFactors] = useState({
    sms: true,
    email: true,
    authenticatorApp: true,
    hardwareKey: false
  });

  // Password requirement change handlers
  const handlePasswordRequirementChange = (requirement: keyof typeof passwordRequirements) => (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setPasswordRequirements({
      ...passwordRequirements,
      [requirement]: event.target.checked
    });
  };

  // MFA factor change handlers
  const handleMfaFactorChange = (factor: keyof typeof mfaFactors) => (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setMfaFactors({
      ...mfaFactors,
      [factor]: event.target.checked
    });
  };

  // Handle form submit
  const handleSubmit = () => {
    if (onSave) {
      onSave();
    }
  };

  return (
    <Box>
      {/* Section 1: Session Management */}
      <Paper sx={{ p: 3, mb: 3, borderRadius: 2 }}>
        <Typography variant="h6" fontWeight={500} mb={2}>
          Session Management
        </Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Session Inactivity Timeout (minutes)
            </Typography>
            <TextField
              fullWidth
              type="number"
              size="small"
              value={sessionTimeout}
              onChange={(e) => setSessionTimeout(Number(e.target.value))}
              inputProps={{ min: 1 }}
              // disabled={readOnly}
              disabled={true}

            />
          </Box>
          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Maximum Session Duration (hours)
            </Typography>
            <TextField
              fullWidth
              type="number"
              size="small"
              value={maxSessionDuration}
              onChange={(e) => setMaxSessionDuration(Number(e.target.value))}
              inputProps={{ min: 1 }}
              disabled={true}

            />
          </Box>
        </Box>
      </Paper>

      {/* Section 2: Password Policy */}
      <Paper sx={{ p: 3, mb: 3, borderRadius: 2 }}>
        <Typography variant="h6" fontWeight={500} mb={2}>
          Password Policy
        </Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3, mb: 2 }}>
          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Password Minimum Length
            </Typography>
            <TextField
              fullWidth
              type="number"
              size="small"
              value={minPasswordLength}
              onChange={(e) => setMinPasswordLength(Number(e.target.value))}
              inputProps={{ min: 6 }}
              // disabled={readOnly}
              disabled={true}
            />
          </Box>
          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Password History Enforcement
            </Typography>
            <TextField
              fullWidth
              type="number"
              size="small"
              value={passwordHistory}
              // disabled={readOnly}
              onChange={(e) => setPasswordHistory(Number(e.target.value))}
              inputProps={{ min: 0 }}
              disabled={true}

            />
          </Box>
        </Box>

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
          <Box>
            <FormGroup>
              <FormControlLabel
                control={
                  <Checkbox 
                    checked={passwordRequirements.uppercase}
                    onChange={(e) => setPasswordRequirements({...passwordRequirements, uppercase: e.target.checked})}
                    disabled={true}
                  />
                }
                label="Require uppercase letters"
              />
              <FormControlLabel
                control={
                  <Checkbox 
                    checked={passwordRequirements.numbers}
                    onChange={(e) => setPasswordRequirements({...passwordRequirements, numbers: e.target.checked})}
                    disabled={true}
                  />
                }
                label="Require Numbers"
              />
            </FormGroup>
          </Box>
          <Box>
            <FormGroup>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={passwordRequirements.lowercase}
                    onChange={handlePasswordRequirementChange('lowercase')}
                    disabled={true}
                  />
                }
                label="Require Lowercase Letters"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={passwordRequirements.specialSymbols}
                    onChange={handlePasswordRequirementChange('specialSymbols')}
                    disabled={true}
                  />
                }
                label="Require Special Symbols"
              />
            </FormGroup>
          </Box>
        </Box>
      </Paper>

      {/* Section 3: Account Lockout Policy */}
      <Paper sx={{ p: 3, mb: 3, borderRadius: 2 }}>
        <Typography variant="h6" fontWeight={500} mb={2}>
          Account Lockout Policy
        </Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Account Lockout - Failed Attempts
            </Typography>
            <TextField
              fullWidth
              type="number"
              size="small"
              value={failedAttempts}
              onChange={(e) => setFailedAttempts(Number(e.target.value))}
              inputProps={{ min: 1 }}
              disabled={true}
            />
          </Box>
          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Account Lockout - Duration (minutes)
            </Typography>
            <TextField
              fullWidth
              type="number"
              size="small"
              value={lockoutDuration}
              onChange={(e) => setLockoutDuration(Number(e.target.value))}
              inputProps={{ min: 1 }}
              disabled={true}
            />
          </Box>
        </Box>
      </Paper>

      {/* Section 4: Multi-Factor Authentication (MFA) */}
      <Paper sx={{ p: 3, mb: 3, borderRadius: 2 }}>
        <Typography variant="h6" fontWeight={500} mb={2}>
          Multi-Factor Authentication (MFA)
        </Typography>
        
        <Typography variant="body2" color="text.secondary" mb={1}>
          MFA Policy
        </Typography>
        <RadioGroup
          value={mfaPolicy}
          onChange={(e) => !readOnly && setMfaPolicy(e.target.value)}
          sx={{ mb: 3 }}
        >
          <FormControlLabel value="disabled" control={<Radio disabled={true} />} label="Disabled" />
          <FormControlLabel value="optional" control={<Radio disabled={true} />} label="Optional for Users" />
          <FormControlLabel value="required-all" control={<Radio disabled={true} />} label="Required for All Users" />
          <FormControlLabel value="required-admin" control={<Radio disabled={true} />} label="Required for Admins Only" />
        </RadioGroup>

        <Typography variant="body2" color="text.secondary" mb={1}>
          Allowed MFA Factors
        </Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
          <Box>
            <FormGroup>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={mfaFactors.sms}
                    onChange={handleMfaFactorChange('sms')}
                    disabled={true}
                  />
                }
                label="SMS Text Message"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={mfaFactors.email}
                    onChange={handleMfaFactorChange('email')}
                    disabled={true}
                  />
                }
                label="Email Verification"
              />
            </FormGroup>
          </Box>
          <Box>
            <FormGroup>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={mfaFactors.authenticatorApp}
                    onChange={handleMfaFactorChange('authenticatorApp')}
                    disabled={true}
                  />
                }
                label="Authenticator App"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={mfaFactors.hardwareKey}
                    onChange={handleMfaFactorChange('hardwareKey')}
                    disabled={true}
                  />
                }
                label="Hardware Security Key"
              />
            </FormGroup>
          </Box>
        </Box>
      </Paper>

      {/* Section 5: Single Sign-On (SSO) */}
      <Paper sx={{ p: 3, mb: 3, borderRadius: 2 }}>
        <Typography variant="h6" fontWeight={500} mb={2}>
          Single Sign-On (SSO)
        </Typography>
        
        <Box mb={3}>
          <Typography variant="body2" color="text.secondary" fontWeight={500}>
            Google SSO
          </Typography>
          <Typography variant="caption" color="text.secondary" display="block" mb={1}>
            Allow users to sign in with their Google accounts.
          </Typography>
          <FormControlLabel
            control={<Checkbox disabled={true} />}
            label="Enable Google SSO"
          />
        </Box>
        
        <Box>
          <Typography variant="body2" color="text.secondary" fontWeight={500}>
            Custom Enterprise SSO (SAML/OIDC)
          </Typography>
          <Typography variant="caption" color="text.secondary" display="block" mb={1}>
            Configure single sign-on integration with your identity provider.
          </Typography>
          <Button variant="outlined" size="small" disabled={true}>
            Configure Enterprise SSO
          </Button>
        </Box>
      </Paper>

      {/* Save button */}
      {/* <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
        <Button
          variant="contained"
          onClick={handleSubmit}
        >
          Save Changes
        </Button>
      </Box> */}
    </Box>
  );
};

export default SecurityAuthentication;
