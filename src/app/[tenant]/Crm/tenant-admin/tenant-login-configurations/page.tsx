"use client";

import * as React from 'react';
import { useEffect, useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import {
    Box,
    Breadcrumbs,
    Button,
    Container,
    Paper,
    Typography,
    Stack,
    Switch,
    TextField,
    Checkbox,
    FormControlLabel,
    Grid,
    Divider,
    useTheme,
    alpha,
    CircularProgress,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    Chip,
    IconButton,
    Collapse,
    ListItemText,
    Link,
    OutlinedInput,
    FormHelperText
} from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import SaveIcon from '@mui/icons-material/Save';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import CustomSnackbar from '@/app/components/common/CustomSnackbar';
import { getAuthHeaders } from "@/app/hooks/api/auth";
import { COCKPIT_API_BASE_URL } from '@/utils/constants';


// A reusable component for each setting row to keep the code DRY
interface SettingRowProps {
    title: string;
    description: string;
    control: React.ReactNode;
    info?: boolean;
}

const SettingRow: React.FC<SettingRowProps> = ({ title, description, control, info = true }) => {
    const theme = useTheme();
    
    return (
        <Box
            sx={{
                p: 2,
                borderRadius: 1,
                '&:hover': {
                    bgcolor: alpha(theme.palette.primary.light, 0.05),
                }
            }}
        >
            <Stack 
                direction={{ xs: 'column', md: 'row' }} 
                justifyContent="space-between" 
                alignItems={{ xs: 'flex-start', md: 'center' }} 
                spacing={2}
            >
                <Box>
                    <Typography 
                        component="h3" 
                        fontWeight={500} 
                        sx={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: 0.5,
                            color: theme.palette.text.primary
                        }}
                    >
                        {title}
                        {info && 
                            <InfoOutlinedIcon 
                                sx={{ 
                                    fontSize: 16, 
                                    color: theme.palette.text.secondary,
                                    ml: 0.5
                                }} 
                            />}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        {description}
                    </Typography>
                </Box>
                {control}
            </Stack>
        </Box>
    );
};

// A reusable component for the section headers
interface SectionHeaderProps {
    title: string;
    description: string;
    collapsible?: boolean;
    onToggle?: () => void;
    isExpanded?: boolean;
}

const SectionHeader: React.FC<SectionHeaderProps> = ({ 
    title, 
    description, 
    collapsible = false, 
    onToggle, 
    isExpanded = true 
}) => {
    const theme = useTheme();
    
    return (
        <Stack 
            direction="row" 
            justifyContent="space-between" 
            alignItems="flex-start" 
            mb={3}
            sx={{
                pb: 1,
                borderBottom: collapsible ? `1px solid ${theme.palette.divider}` : 'none'
            }}
        >
            <Box>
                <Typography 
                    variant="h6" 
                    component="h2" 
                    gutterBottom 
                    fontWeight={600}
                    color="primary.main"
                >
                    {title}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    {description}
                </Typography>
            </Box>
            {collapsible && (
                <Box 
                    onClick={onToggle} 
                    sx={{ 
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        '&:hover': { opacity: 0.7 }
                    }}
                >
                    {isExpanded ? 
                        <ExpandLessIcon sx={{ color: theme.palette.text.secondary }} /> : 
                        <ArrowDropDownIcon sx={{ color: theme.palette.text.secondary }} />
                    }
                </Box>
            )}
        </Stack>
    );
};

interface Geofence {
  id: number;
  name: string;
  geometry_type: string;
  is_active: boolean;
}

// Main Component
const AuthenticationSettings = () => {
    // Hooks must be called unconditionally at the top level
    const { t } = useTranslation();
    const theme = useTheme();
    const router = useRouter();
    const params = useParams();
    const searchParams = useSearchParams();
    
    // Derived values
    const tenantSlug = params?.tenant as string;
    
    // State management - all state declarations at the top
    // Section state management
    const [expandedSections, setExpandedSections] = React.useState({
        signup: true,
        login: true,
        password: true,
        advanced: true
    });
    
    const [user, setUser] = React.useState<any>(null);
    const [sourceId, setSourceId] = React.useState<string>('');
    const [ipAddresses, setIpAddresses] = React.useState<string[]>([]);
    const [currentIp, setCurrentIp] = React.useState<string>('');
    const [ipError, setIpError] = React.useState<string>('');
    const [allowedDomains, setAllowedDomains] = React.useState<string[]>([]);
    const [currentDomain, setCurrentDomain] = React.useState('');
    const [domainError, setDomainError] = React.useState('');
    
    // API and loading states
    const [loading, setLoading] = React.useState(false);
    const [saveLoading, setSaveLoading] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);
    const [saveSuccess, setSaveSuccess] = React.useState(false);
    const [sources, setSources] = React.useState<any[]>([]);
    
    // Snackbar state
    const [snackbarOpen, setSnackbarOpen] = React.useState(false);
    const [snackbarMessage, setSnackbarMessage] = React.useState('');
    const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error' | 'info' | 'warning'>('info');
    
    // Role configuration with IDs and display names
    const roles = [
        { id: '1', name: 'Super Role' },
        { id: '2', name: 'Developer' },
    ];

    // Settings state
    const [settings, setSettings] = React.useState({
        // Signup & Onboarding
        registrationType: 'public',
        sourceTracking: 'none', 
        source_id: '',
        is_active: true,
        inviteOnly: false,
        domainRestriction: false,
        allowedDomains: [] as string[],
        default_roles: ['1'], // Default to Super Role ID
        
        // Login & Authentication
        ipRestrictions: false,
        allowedIps: [] as string[],
        geofencing: false,        // Geofencing feature
        stayLoggedIn: true,
        sessionDuration: '60', // minutes
        rememberMeDuration: '30', // days
        
        // Password & Security Policy
        passwordMinLength: '8',
        reqUppercase: true,
        reqLowercase: false,
        reqNumber: false,
        reqSpecialChar: true,
        disallowCommon: true,
        passwordExpiry: false,
        passwordHistory: false,
        accountLockout: true,
        passwordResetMethod: 'email',
        
        // Advanced Security
        captcha: false, 
        inactivityPolicy: true,
        inactivityTimeout: '30', // minutes
        realTimeFeedback: true,
    });

    // Geofence state
    const [geofences, setGeofences] = useState<Geofence[]>([]);
    const [selectedGeofences, setSelectedGeofences] = useState<number[]>([]);
    const [isLoadingGeofences, setIsLoadingGeofences] = useState(false);

    // Debug function to help with issues
    const logCurrentState = () => {
        console.log('Current settings state:', {
            registrationType: settings.registrationType,
            public_signup_no_approval: settings.registrationType === 'public',
            approval_required: settings.registrationType === 'approval', 
            invite_only_signup: settings.registrationType === 'invite'
        });
    };
    
    // Fetch authentication settings from API
    const fetchAuthSettings = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            
            // Check if source_id is provided in URL
            const sourceId = searchParams?.get('source_id');
            console.log('Fetching auth settings for source:', sourceId);
            
            if (!sourceId) {
                console.log('No source_id provided, using defaults');
                setLoading(false);
                return;
            }
            
            const response = await fetch(
                `${COCKPIT_API_BASE_URL}/${tenantSlug}/tenant-admin/auth-config/?source_id=${sourceId}`, 
                {
                    method: 'GET',
                    headers: {
                        ...getAuthHeaders(),
                    }
                }
            );
            
            if (!response.ok) {
                throw new Error(`Error fetching authentication settings: ${response.status}`);
            }
            
            const data = await response.json();
            console.log('Fetched auth settings:', data);
            
            // Map API response to form state
            updateSettingsFromApi(data);
            
        } catch (err: any) {
            console.error('Error fetching auth settings:', err);
            setError(err.message || 'Failed to fetch authentication settings');
        } finally {
            setLoading(false);
        }
    }, [searchParams, settings]);

    // Synchronize settings when fetched from API
    const updateSettingsFromApi = (data: any) => {
        console.log('API data received:', data);
        setSettings({
            ...settings,
            is_active: Boolean(data.is_active),
            source_id: data.source_id || '',
            registrationType: data.public_signup_no_approval ? 'public' : 
                            data.approval_required ? 'approval' : 
                            data.invite_only_signup ? 'invite' : 'public',
            domainRestriction: Boolean(data.domain_restriction),
            allowedDomains: Array.isArray(data.allowed_domains) ? data.allowed_domains : [],
            default_roles: data.default_roles ? data.default_roles.map(String) : ['1'],
            ipRestrictions: Boolean(data.ip_restrictions),
            allowedIps: Array.isArray(data.allowed_ips) ? data.allowed_ips : [],
            sessionDuration: String(data.session_duration || 60),
            rememberMeDuration: String(data.remember_me_duration || 30),
            captcha: Boolean(data.captcha),
            inactivityPolicy: Boolean(data.inactivity_policy),
            inactivityTimeout: String(data.inactivity_timeout || 30),
            realTimeFeedback: Boolean(data.real_time_feedback),
        });
        
        // Also update the local state for domains and IPs
        setAllowedDomains(Array.isArray(data.allowed_domains) ? data.allowed_domains : []);
        setIpAddresses(Array.isArray(data.allowed_ips) ? data.allowed_ips : []);
        
        console.log('Settings updated from API');
    };

    // Submit function
    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        try {
            setSaveLoading(true);
            setSaveSuccess(false);
            setError(null);
            
            const sourceId = searchParams?.get('source_id');
            console.log('Source ID:', sourceId);
            // Use sourceId (from URL) as fallback for settings.source_id
            if (!searchParams?.get('source_id')) {
                setError('Source ID is required');
                // Show error in snackbar
                setSnackbarMessage('Source ID is required');
                setSnackbarSeverity('error');
                setSnackbarOpen(true);
                return;
            }
            // Debug registration type
            console.log('Registration type selected:', settings.registrationType);
            
            // Map form state to API request format
            const requestData = {
                is_active: Boolean(settings.is_active),
                source_id: searchParams?.get('source_id') || 'default',
                // Explicitly set registration type flags based on current selection
                public_signup_no_approval: settings.registrationType === 'public' ? true : false,
                approval_required: settings.registrationType === 'approval' ? true : false,
                invite_only_signup: settings.registrationType === 'invite' ? true : false,
                domain_restriction: Boolean(settings.domainRestriction),
                // Ensure allowed_domains is never undefined, even if empty
                allowed_domains: Array.isArray(settings.allowedDomains) ? settings.allowedDomains : [],
                default_roles: settings.default_roles.map(r => parseInt(r)),
                ip_restrictions: Boolean(settings.ipRestrictions),
                // Ensure allowed_ips is never undefined, even if empty
                allowed_ips: Array.isArray(settings.allowedIps) ? settings.allowedIps : [],
                session_duration: parseInt(settings.sessionDuration) || 60,
                remember_me_duration: parseInt(settings.rememberMeDuration) || 30,
                captcha: Boolean(settings.captcha),
                inactivity_policy: Boolean(settings.inactivityPolicy),
                inactivity_timeout: parseInt(settings.inactivityTimeout) || 30,
                real_time_feedback: Boolean(settings.realTimeFeedback),
                geofences: selectedGeofences,
            };
            
            console.log('Submitting auth settings:', requestData);
            
            const response = await fetch(`${COCKPIT_API_BASE_URL}/${tenantSlug}/tenant-admin/auth-config/`, {
                method: 'POST',
                headers: {
                    ...getAuthHeaders(),
                },
                body: JSON.stringify(requestData)
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `Error ${response.status}`);
            }
            
            const responseData = await response.json();
            console.log('Auth settings saved successfully:', responseData);
            console.log('Final registration type sent:', {
                registrationType: settings.registrationType,
                public_signup_no_approval: settings.registrationType === 'public',
                approval_required: settings.registrationType === 'approval',
                invite_only_signup: settings.registrationType === 'invite'
            });
            setSaveSuccess(true);
            
            // Show success snackbar
            setSnackbarMessage('Authentication settings saved successfully!');
            setSnackbarSeverity('success');
            setSnackbarOpen(true);
            
        } catch (err: any) {
            console.error('Error saving auth settings:', err);
            const errorMessage = err.message || 'Failed to save authentication settings';
            setError(errorMessage);
            setSaveSuccess(false);
            
            // Show error snackbar
            setSnackbarMessage(errorMessage);
            setSnackbarSeverity('error');
            setSnackbarOpen(true);
        } finally {
            setSaveLoading(false);
        }
    };
    
    // Authentication and initialization effect
    useEffect(() => {
        const initialize = async () => {
            try {
                const sourceIdParam = searchParams.get('source_id');
                if (!sourceIdParam) {
                    router.push(`/${tenantSlug}/Crm/tenant-admin/sources`);
                    return;
                }

                setSourceId(sourceIdParam);
                setLoading(false);
            } catch (error) {
                console.error('Initialization error:', error);
                router.push(tenantSlug ? `/${tenantSlug}/Crm/tenant-admin/login` : '/');
            }
        };

        initialize();
    }, [router, tenantSlug, searchParams]);

    // Load sources and authentication settings when component mounts
    useEffect(() => {
        // Get source ID from URL query params
        const currentSource = searchParams?.get('source_id');
        if (currentSource) {
            console.log(`Loading settings for source: ${currentSource}`);
            setSourceId(currentSource);
            // Also update source_id in settings state
            setSettings(prev => ({
                ...prev,
                source_id: currentSource
            }));
        }
        
        // Log current state for debugging
        logCurrentState();
        
        // Load authentication settings
        fetchAuthSettings();
    }, [searchParams]);

    // Load geofences when component mounts
    useEffect(() => {
        const fetchGeofences = async () => {
            if (!tenantSlug) return;
            
            setIsLoadingGeofences(true);
            try {
                const response = await fetch(`${COCKPIT_API_BASE_URL}/${tenantSlug}/tenant-admin/geofences/?is_active=true`, {
                    headers: {
                        ...getAuthHeaders()
                    }
                });

                if (!response.ok) {
                    throw new Error('Failed to fetch geofences');
                }

                const data = await response.json();
                setGeofences(Array.isArray(data) ? data : (data.results || []));
            } catch (err) {
                console.error('Error fetching geofences:', err);
                // Handle error (e.g., show a snackbar)
            } finally {
                setIsLoadingGeofences(false);
            }
        };

        fetchGeofences();
    }, [tenantSlug]);

    // Handler to toggle section expansion
    const toggleSection = (section: string) => {
        setExpandedSections(prev => ({
            ...prev,
            [section]: !prev[section as keyof typeof prev]
        }));
    };

    // Handler to toggle switch states
    const handleSwitchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setSettings({
            ...settings,
            [event.target.name]: event.target.checked,
        });
    };
    
    // Handler to toggle checkbox states
    const handleCheckboxChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setSettings({
            ...settings,
            [event.target.name]: event.target.checked,
        });
    };
    
    // Handler for text input changes
    const handleTextChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setSettings({
            ...settings,
            [event.target.name]: event.target.value,
        });
    };
    
    // Handler for select changes
    const handleSelectChange = (event: React.ChangeEvent<{ name?: string; value: unknown }>) => {
        const name = event.target.name as string;
        const value = event.target.value;
        
        console.log(`Select changed: ${name} = ${value}`);
        
        setSettings({
            ...settings,
            [name]: value,
        });
        
        // If changing registration type, log for debugging
        if (name === 'registrationType') {
            console.log('Registration type changed to:', value);
            console.log('Values will be:', {
                public_signup_no_approval: value === 'public',
                approval_required: value === 'approval',
                invite_only_signup: value === 'invite'
            });
        }
    };
    
    // Handler for multiple role selection
    const handleRoleChange = (event: React.ChangeEvent<{ value: unknown }>) => {
        setSettings({
            ...settings,
            default_roles: event.target.value as string[],
        });
    };
    
    // Validate IP address format
    const isValidIpAddress = (ip: string): boolean => {
        // Basic IPv4 validation pattern
        const ipv4Pattern = /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
        // Basic CIDR notation pattern (e.g., 192.168.1.0/24)
        const cidrPattern = /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\/([0-9]|[1-2][0-9]|3[0-2])$/;
        
        return ipv4Pattern.test(ip) || cidrPattern.test(ip);
    };
    
    // Validate domain format
    const isValidDomain = (domain: string): boolean => {
        // Basic domain validation pattern (supports subdomains and TLDs)
        const domainPattern = /^([a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,}$/i;
        return domainPattern.test(domain);
    };

    // Handle adding a new IP address
    const handleAddIpAddress = () => {
        if (!currentIp) {
            setIpError(t('auth.settings.ipError.empty', 'Please enter an IP address'));
            return;
        }

        if (!isValidIpAddress(currentIp)) {
            setIpError(t('auth.settings.ipError.invalid', 'Please enter a valid IPv4 address or CIDR range'));
            return;
        }

        if (ipAddresses.includes(currentIp)) {
            setIpError(t('auth.settings.ipError.duplicate', 'This IP address is already in the list'));
            return;
        }
        
        const newIpAddresses = [...ipAddresses, currentIp];
        // Update local state
        setIpAddresses(newIpAddresses);
        // Update settings state that will be sent to API
        setSettings(prev => ({
            ...prev,
            allowedIps: newIpAddresses
        }));
        setCurrentIp('');
        setIpError('');
    };

    // Handle removing an IP address
    const handleDeleteIpAddress = (ipToDelete: string) => {
        const updatedIpAddresses = ipAddresses.filter(ip => ip !== ipToDelete);
        // Update local state
        setIpAddresses(updatedIpAddresses);
        // Update settings state that will be sent to API
        setSettings(prev => ({
            ...prev,
            allowedIps: updatedIpAddresses
        }));
    };
    
    // Handle IP input key press
    const handleIpKeyPress = (event: React.KeyboardEvent) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            handleAddIpAddress();
        }
    };
    
    // Handle adding a new domain
    const handleAddDomain = () => {
        if (!currentDomain) {
            setDomainError(t('auth.settings.domainError.empty', 'Please enter a domain'));
            return;
        }

        if (!isValidDomain(currentDomain)) {
            setDomainError(t('auth.settings.domainError.invalid', 'Please enter a valid domain (e.g., example.com)'));
            return;
        }

        if (allowedDomains.includes(currentDomain.toLowerCase())) {
            setDomainError(t('auth.settings.domainError.duplicate', 'This domain is already in the list'));
            return;
        }
        
        const newDomains = [...allowedDomains, currentDomain.toLowerCase()];
        // Update local state
        setAllowedDomains(newDomains);
        // Update settings state that will be sent to API
        setSettings(prev => ({
            ...prev,
            allowedDomains: newDomains
        }));
        setCurrentDomain('');
        setDomainError('');
    };
    
    // Handle removing a domain
    const handleDeleteDomain = (domainToDelete: string) => {
        const updatedDomains = allowedDomains.filter(domain => domain !== domainToDelete);
        // Update local state
        setAllowedDomains(updatedDomains);
        // Update settings state that will be sent to API
        setSettings(prev => ({
            ...prev,
            allowedDomains: updatedDomains
        }));
    };
    
    // Handle domain input key press
    const handleDomainKeyPress = (event: React.KeyboardEvent) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            handleAddDomain();
        }
    };

    // Handler for geofence selection
    const handleGeofenceChange = (event: SelectChangeEvent<number[]>) => {
        const value = event.target.value;
        setSelectedGeofences(
            // Handle both array and single value cases
            typeof value === 'string' 
              ? value.split(',').map(v => parseInt(v, 10))
              : value as number[]
        );
    };

    // Show loading state while initializing
    if (!tenantSlug) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
                <CircularProgress />
            </Box>
        );
    }

    return (
        
        <Box component="form" onSubmit={handleSubmit}>
            {/* Snackbar for notifications */}
            <CustomSnackbar
                open={snackbarOpen}
                message={snackbarMessage}
                severity={snackbarSeverity}
                onClose={() => setSnackbarOpen(false)}
                autoHideDuration={6000}
            />
            {/* Header */}
            <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems="flex-start" mb={4} spacing={2}>
                <Box>
                    <Breadcrumbs aria-label="breadcrumb" sx={{ mb: 1 }}>
                        <Link
                            color="inherit"
                            href={`/${tenantSlug}/Crm/tenant-admin/sources`}
                            sx={{ textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
                        >
                            {t('common.sources', 'Sources')}
                        </Link>
                        <Typography color="text.primary">
                            {sourceId ? sourceId.toUpperCase() : ''}
                        </Typography>
                    </Breadcrumbs>
                    <Typography variant="h5" component="h1" gutterBottom>
                        {t('auth.settings.title', 'Authentication Settings')}
                    </Typography>
                </Box>
                <Stack direction="row" spacing={1}>
                    <Button 
                        variant="outlined" 
                        color="secondary"
                        onClick={() => router.push(`/${tenantSlug}/Crm/tenant-admin/sources`)}
                    >
                        {t('common.cancel', 'Cancel')}
                    </Button>
                    <Button 
                        variant="contained" 
                        color="primary"
                        type="submit"
                        disabled={saveLoading}
                        startIcon={saveLoading ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
                    >
                        {saveLoading ? 
                            t('common.saving', 'Saving...') : 
                            t('common.saveChanges', 'Save Changes')
                        }
                    </Button>
                </Stack>
            </Stack>
            
            <Stack spacing={4}>
                {/* User Signup & Onboarding Section */}
                <Paper 
                    variant="outlined" 
                    sx={{ 
                        p: 3, 
                        borderRadius: 1,
                        boxShadow: theme => theme.shadows[1]
                    }}
                >
                    <SectionHeader 
                        title={t('auth.settings.signupTitle', 'User Signup & Onboarding')}
                        description={t('auth.settings.signupDesc', 'Configure how users can register and create accounts in your application.')}
                        collapsible
                        onToggle={() => toggleSection('signup')}
                        isExpanded={expandedSections.signup}
                    />
                    
                    {expandedSections.signup && (
                        <Stack spacing={1} sx={{ mt: 2 }}>
                            <SettingRow
                                title={t('auth.settings.registrationType', 'Registration Type')}
                                description={t('auth.settings.registrationTypeDesc', 'Control who can sign up for your application')}
                                control={
                                    <FormControl size="small" sx={{ minWidth: 200 }}>
                                        <Select
                                            name="registrationType"
                                            value={settings.registrationType}
                                            onChange={(e) => {
                                                const value = e.target.value as string;
                                                console.log('Registration type directly selected:', value);
                                                setSettings(prev => ({
                                                    ...prev,
                                                    registrationType: value
                                                }));
                                            }}
                                            displayEmpty
                                            inputProps={{ 'aria-label': 'Registration Type' }}
                                            sx={{ bgcolor: 'background.paper' }}
                                        >
                                            <MenuItem value="public">{t('auth.settings.publicSignup', 'Public Signup (No Approval)')}</MenuItem>
                                            <MenuItem value="approval">{t('auth.settings.approvalRequired', 'Approval Required')}</MenuItem>
                                            <MenuItem value="invite">{t('auth.settings.closedSignup', 'Enable Invite-Only Signup')}</MenuItem>
                                        </Select>
                                    </FormControl>
                                }
                            />
                            
                            <Box sx={{ width: '100%' }}>
                                <SettingRow
                                    title={t('auth.settings.domainRestriction', 'Domain Restriction')}
                                    description={t('auth.settings.domainRestrictionDesc', 'Allow signups only from specific email domains')}
                                    control={
                                        <Switch 
                                            name="domainRestriction" 
                                            checked={settings.domainRestriction} 
                                            onChange={handleSwitchChange}
                                            color="primary"
                                        />
                                    }
                                />
                                
                                <Collapse in={settings.domainRestriction} sx={{ mt: 1, ml: 4, mb: 3 }}>
                                    <Box sx={{ p: 0, pb: 1 }}>
                                        <Typography variant="body2" sx={{ fontWeight: 500, mb: 1 }}>
                                            {t('auth.settings.domainAddList', 'Allowed Email Domains')}
                                        </Typography>
                                        
                                        <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
                                            <TextField
                                                placeholder={t('auth.settings.domainPlaceholder', 'e.g., company.com')}
                                                value={currentDomain}
                                                variant="outlined"
                                                size="small"
                                                onChange={(e) => setCurrentDomain(e.target.value)}
                                                onKeyPress={handleDomainKeyPress}
                                                error={!!domainError}
                                                helperText={domainError}
                                                fullWidth
                                                sx={{ 
                                                    bgcolor: 'background.paper',
                                                    '& .MuiOutlinedInput-root': {
                                                        borderRadius: '4px'
                                                    }
                                                }}
                                            />
                                            <Button
                                                variant="text"
                                                color="primary"
                                                onClick={handleAddDomain}
                                                startIcon={<AddIcon />}
                                                sx={{ 
                                                    minWidth: '100px',
                                                    color: theme.palette.primary.main,
                                                    fontWeight: 500
                                                }}
                                            >
                                                {t('common.add', 'Add')}
                                            </Button>
                                        </Stack>
                                        
                                        <Box sx={{ 
                                            display: 'flex', 
                                            flexWrap: 'wrap', 
                                            gap: 1,
                                            mt: 1,
                                            minHeight: allowedDomains.length ? 'auto' : '30px'
                                        }}>
                                            {allowedDomains.map((domain) => (
                                                <Chip
                                                    key={domain}
                                                    label={domain}
                                                    onDelete={() => handleDeleteDomain(domain)}
                                                    deleteIcon={
                                                        <Box 
                                                            component="span" 
                                                            sx={{ 
                                                                display: 'inline-flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                ml: -0.5
                                                            }}
                                                        >
                                                            <CloseIcon fontSize="small" />
                                                        </Box>
                                                    }
                                                    sx={{
                                                        bgcolor: 'rgba(0, 0, 0, 0.08)',
                                                        color: theme.palette.text.primary,
                                                        borderRadius: '16px',
                                                        border: 'none',
                                                        fontSize: '0.875rem',
                                                        fontWeight: 400,
                                                        height: '32px',
                                                        '& .MuiChip-deleteIcon': {
                                                            color: theme.palette.text.secondary,
                                                            '&:hover': {
                                                                color: theme.palette.text.primary
                                                            }
                                                        }
                                                    }}
                                                />
                                            ))}
                                            {allowedDomains.length === 0 && (
                                                <Typography variant="body2" color="text.disabled" sx={{ fontSize: '0.875rem' }}>
                                                    {t('auth.settings.noDomainsAdded', 'No domains added')}
                                                </Typography>
                                            )}
                                        </Box>
                                    </Box>
                                </Collapse>
                            </Box>
                            <SettingRow
                                title={t('auth.settings.defaultRoles', 'Default Roles on Signup')}
                                description={t('auth.settings.defaultRolesDesc', 'The assigned roles for new users')}
                                control={
                                    <FormControl size="small" sx={{ minWidth: 200 }}>
                                        <Select
                                            multiple
                                            name="default_roles"
                                            value={settings.default_roles}
                                            onChange={handleRoleChange}
                                            displayEmpty
                                            variant="outlined"
                                            sx={{ bgcolor: 'background.paper' }}
                                            renderValue={(selected) => (
                                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                                    {(selected as string[]).map((roleId) => {
                                                        const role = roles.find(r => r.id === roleId);
                                                        return (
                                                            <Chip 
                                                                key={roleId}
                                                                label={role ? role.name : `Role ${roleId}`}
                                                                size="small"
                                                            />
                                                        );
                                                    })}
                                                </Box>
                                            )}
                                        >
                                            {roles.map((role) => (
                                                <MenuItem key={role.id} value={role.id}>
                                                    <Checkbox checked={settings.default_roles.includes(role.id)} />
                                                    <ListItemText primary={role.name} />
                                                </MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>
                                }
                            />
                        </Stack>
                    )}
                </Paper>

                {/* User Login & Authentication Section */}
                <Paper 
                    variant="outlined" 
                    sx={{ 
                        p: 3, 
                        borderRadius: 1,
                        boxShadow: theme => theme.shadows[1]
                    }}
                >
                    <SectionHeader 
                        title={t('auth.settings.loginTitle', 'User Login & Authentication')}
                        description={t('auth.settings.loginDesc', 'Configure how users authenticate and access your application.')}
                        collapsible
                        onToggle={() => toggleSection('login')}
                        isExpanded={expandedSections.login}
                    />
                    {expandedSections.login && (
                        <Stack spacing={1} sx={{ mt: 2 }}>
                            <Box sx={{ width: '100%' }}>
                                <SettingRow
                                    title={t('auth.settings.ipRestrictions', 'IP Restrictions')}
                                    description={t('auth.settings.ipRestrictionsDesc', 'Limit login access to specific IP addresses or ranges')}
                                    control={
                                        <Switch 
                                            name="ipRestrictions" 
                                            checked={settings.ipRestrictions} 
                                            onChange={handleSwitchChange}
                                            color="primary"
                                        />
                                    }
                                />
                                
                                <Collapse in={settings.ipRestrictions} sx={{ mt: 1, ml: 4}}>
                                    <Box 
                                        sx={{ 
                                            p: 0, 
                                            pb: 1
                                        }}
                                    >
                                        <Typography variant="body2" sx={{ fontWeight: 500, mb: 1 }}>
                                            {t('auth.settings.ipAddList', 'Allowed IPs (Optional)')}
                                        </Typography>
                                        
                                        {/* Input for adding IP addresses */}
                                        <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
                                            <TextField
                                                size="medium"
                                                placeholder={t('auth.settings.ipPlaceholder', 'e.g., 192.168.1.1, 10.0.0.0/24')}
                                                value={currentIp}
                                                variant="outlined"
                                                sx={{ bgcolor: 'background.paper' }}
                                                size="small"
                                                onChange={(e) => setCurrentIp(e.target.value)}
                                                onKeyPress={handleIpKeyPress}
                                                error={!!ipError}
                                                helperText={ipError}
                                                fullWidth
                                                sx={{ 
                                                    bgcolor: 'background.paper',
                                                    '& .MuiOutlinedInput-root': {
                                                        borderRadius: '4px'
                                                    }
                                                }}
                                                variant="outlined"
                                            />
                                            <Button
                                                variant="text"
                                                color="primary"
                                                onClick={handleAddIpAddress}
                                                startIcon={<AddIcon />}
                                                sx={{ 
                                                    minWidth: '100px',
                                                    color: theme.palette.primary.main,
                                                    fontWeight: 500
                                                }}
                                            >
                                                {t('common.addIp', 'Add IP')}
                                            </Button>
                                        </Stack>
                                        
                                        {/* Display added IP addresses as chips */}
                                        <Box sx={{ 
                                            display: 'flex', 
                                            flexWrap: 'wrap', 
                                            gap: 1,
                                            mt: 1,
                                            minHeight: ipAddresses.length ? 'auto' : '30px'
                                        }}>
                                            {ipAddresses.map((ip) => (
                                                <Chip
                                                    key={ip}
                                                    label={ip}
                                                    onDelete={() => handleDeleteIpAddress(ip)}
                                                    deleteIcon={
                                                        <Box 
                                                            component="span" 
                                                            sx={{ 
                                                                display: 'inline-flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                ml: -0.5
                                                            }}
                                                        >
                                                            <CloseIcon fontSize="small" />
                                                        </Box>
                                                    }
                                                    sx={{
                                                        bgcolor: 'rgba(0, 0, 0, 0.08)',
                                                        color: theme.palette.text.primary,
                                                        borderRadius: '16px',
                                                        border: 'none',
                                                        fontSize: '0.875rem',
                                                        fontWeight: 400,
                                                        height: '32px',
                                                        '& .MuiChip-deleteIcon': {
                                                            color: theme.palette.text.secondary,
                                                            '&:hover': {
                                                                color: theme.palette.text.primary
                                                            }
                                                        }
                                                    }}
                                                />
                                            ))}
                                            {ipAddresses.length === 0 && (
                                                <Typography variant="body2" color="text.disabled" sx={{ fontSize: '0.875rem' }}>
                                                    {t('auth.settings.noIpAdded', 'No IP restrictions added')}
                                                </Typography>
                                            )}
                                        </Box>
                                    </Box>
                                </Collapse>
                            </Box>
                            
                            {/* Geofencing Feature */}
                            <Box sx={{ width: '100%' }}>
                                <SettingRow
                                    title={t('auth.settings.geofencing', 'Geofencing Restrictions')}
                                    description={t('auth.settings.geofencingDesc', 'Limit login access to specific geographic locations')}
                                    control={
                                        <Switch 
                                            name="geofencing" 
                                            checked={settings.geofencing} 
                                            onChange={handleSwitchChange}
                                            color="primary"
                                        />
                                    }
                                />
                                
                                <Collapse in={settings.geofencing} sx={{ mt: 1, ml: 4, mb: 3 }}>
                                    <Box sx={{ p: 0, pb: 1 }}>
                                        <Typography variant="body2" sx={{ fontWeight: 500, mb: 1 }}>
                                            {t('auth.settings.geofencingConfig', 'Configure Allowed Locations')}
                                        </Typography>
                                        <Grid item xs={12}>
                                            <FormControl fullWidth variant="outlined" margin="normal">
                                                <InputLabel id="geofences-label">Allowed Geofences</InputLabel>
                                                <Select
                                                    labelId="geofences-label"
                                                    id="geofences"
                                                    multiple
                                                    value={selectedGeofences}
                                                    onChange={handleGeofenceChange}
                                                    input={<OutlinedInput label="Allowed Geofences" />}
                                                    renderValue={(selected) => (
                                                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                                            {selected.map((value) => {
                                                                const geofence = geofences.find(g => g.id === value);
                                                                return geofence ? (
                                                                    <Chip 
                                                                        key={value} 
                                                                        label={geofence.name} 
                                                                        size="small"
                                                                        color="primary"
                                                                        variant="outlined"
                                                                    />
                                                                ) : null;
                                                            })}
                                                        </Box>
                                                    )}
                                                    disabled={isLoadingGeofences}
                                                >
                                                    {isLoadingGeofences ? (
                                                        <MenuItem disabled>
                                                            <CircularProgress size={24} />
                                                            <Typography variant="body2" sx={{ ml: 1 }}>Loading geofences...</Typography>
                                                        </MenuItem>
                                                    ) : geofences.length === 0 ? (
                                                        <MenuItem disabled>No geofences available</MenuItem>
                                                    ) : (
                                                        geofences.map((geofence) => (
                                                            <MenuItem key={geofence.id} value={geofence.id}>
                                                                <Checkbox checked={selectedGeofences.includes(geofence.id)} />
                                                                <ListItemText 
                                                                    primary={geofence.name} 
                                                                    secondary={`Type: ${geofence.geometry_type}`} 
                                                                />
                                                            </MenuItem>
                                                        ))
                                                    )}
                                                </Select>
                                                <FormHelperText>
                                                    Select one or more geofences where login will be allowed
                                                </FormHelperText>
                                            </FormControl>
                                        </Grid>
                                    </Box>
                                </Collapse>
                            </Box>
                            
                            <SettingRow
                                title={t('auth.settings.sessionDuration', 'Session Duration')}
                                description={t('auth.settings.sessionDurationDesc', 'Set the maximum time a user can remain logged in (minutes)')}
                                control={
                                    <TextField
                                        name="sessionDuration"
                                        type="number"
                                        size="small"
                                        value={settings.sessionDuration}
                                        onChange={handleTextChange}
                                        InputProps={{ 
                                            inputProps: { min: 1, max: 10080 },
                                        }}
                                        sx={{ 
                                            width: '120px',
                                            bgcolor: 'background.paper'
                                        }}
                                    />
                                }
                            />
                            <SettingRow
                                title={t('auth.settings.rememberMeDuration', 'Remember Me Duration')}
                                description={t('auth.settings.rememberMeDurationDesc', 'Set the maximum time to remember a user (days)')}
                                control={
                                    <TextField
                                        name="rememberMeDuration"
                                        type="number"
                                        size="small"
                                        value={settings.rememberMeDuration}
                                        onChange={handleTextChange}
                                        InputProps={{ 
                                            inputProps: { min: 1, max: 365 },
                                        }}
                                        sx={{ 
                                            width: '120px',
                                            bgcolor: 'background.paper'
                                        }}
                                    />
                                }
                            />
                        </Stack>
                    )}
                </Paper>
                    
                {/* Password & Security Policy Management Section */}
                {/* <Paper 
                    variant="outlined" 
                    sx={{ 
                        p: 3, 
                        borderRadius: 1,
                        boxShadow: theme => theme.shadows[1]
                    }}
                >
                    <SectionHeader 
                        title={t('auth.settings.passwordTitle', 'Password & Security Policy Management')}
                        description={t('auth.settings.passwordDesc', 'Configure password requirements and security policies')}
                        collapsible
                        onToggle={() => toggleSection('passwordPolicy')}
                        isExpanded={expandedSections.passwordPolicy}
                    />
                    {expandedSections.passwordPolicy && (
                        <Stack spacing={2} sx={{ mt: 2 }}>
                            <Box
                                sx={{
                                    p: 2,
                                    borderRadius: 1,
                                    bgcolor: alpha(theme.palette.background.paper, 0.5),
                                    border: `1px solid ${theme.palette.divider}`
                                }}
                            >
                                <Typography fontWeight={500} color="primary.main" gutterBottom>
                                    {t('auth.settings.passwordStrength', 'Password Strength Requirements')}
                                </Typography>
                                <Typography variant="body2" color="text.secondary" mb={2}>
                                    {t('auth.settings.passwordStrengthDesc', 'Define the complexity rules for user passwords')}
                                </Typography>
                                <Grid container spacing={2}>
                                    <Grid size={{ xs: 12, sm: 6 }}>
                                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                                            <FormControlLabel 
                                                control={
                                                    <Checkbox 
                                                        checked={true} 
                                                        disabled 
                                                    />} 
                                                label={t('auth.settings.minLength', 'Minimum Length')} 
                                            />
                                            <TextField 
                                                name="passwordMinLength"
                                                size="small" 
                                                type="number"
                                                value={settings.passwordMinLength} 
                                                onChange={handleTextChange}
                                                InputProps={{ inputProps: { min: 6, max: 64 } }}
                                                sx={{ width: '80px', bgcolor: 'background.paper' }} 
                                            />
                                        </Stack>
                                    </Grid>
                                    <Grid size={{ xs: 12, sm: 6 }}>
                                        <FormControlLabel 
                                            control={
                                                <Checkbox 
                                                    name="reqUppercase" 
                                                    checked={settings.reqUppercase} 
                                                    onChange={handleCheckboxChange} 
                                                    sx={{ color: theme.palette.primary.main }}
                                                />
                                            } 
                                            label={t('auth.settings.reqUppercase', 'Require Uppercase Letter')} 
                                        />
                                    </Grid>
                                    <Grid size={{ xs: 12, sm: 6 }}>
                                        <FormControlLabel 
                                            control={
                                                <Checkbox 
                                                    name="reqLowercase" 
                                                    checked={settings.reqLowercase} 
                                                    onChange={handleCheckboxChange}
                                                    sx={{ color: theme.palette.primary.main }}
                                                />
                                            } 
                                            label={t('auth.settings.reqLowercase', 'Require Lowercase Letter')} 
                                        />
                                    </Grid>
                                    <Grid size={{ xs: 12, sm: 6 }}>
                                        <FormControlLabel 
                                            control={
                                                <Checkbox 
                                                    name="reqNumber" 
                                                    checked={settings.reqNumber} 
                                                    onChange={handleCheckboxChange}
                                                    sx={{ color: theme.palette.primary.main }}
                                                />
                                            } 
                                            label={t('auth.settings.reqNumber', 'Require Number')} 
                                        />
                                    </Grid>
                                    <Grid size={{ xs: 12, sm: 6 }}>
                                        <FormControlLabel 
                                            control={
                                                <Checkbox 
                                                    name="reqSpecialChar" 
                                                    checked={settings.reqSpecialChar} 
                                                    onChange={handleCheckboxChange}
                                                    sx={{ color: theme.palette.primary.main }}
                                                />
                                            } 
                                            label={t('auth.settings.reqSpecialChar', 'Require Special Character (!@#$%)')} 
                                        />
                                    </Grid>
                                    <Grid size={{ xs: 12, sm: 6 }}>
                                        <FormControlLabel 
                                            control={
                                                <Checkbox 
                                                    name="disallowCommon" 
                                                    checked={settings.disallowCommon} 
                                                    onChange={handleCheckboxChange}
                                                    sx={{ color: theme.palette.primary.main }}
                                                />
                                            } 
                                            label={t('auth.settings.disallowCommon', 'Disallow Common Passwords')} 
                                        />
                                    </Grid>
                                </Grid>
                            </Box>
                            
                            <Divider sx={{ my: 1 }} />
                            
                            <SettingRow
                                title={t('auth.settings.passwordExpiry', 'Enable Password Expiry')}
                                description={t('auth.settings.passwordExpiryDesc', 'Require periodic password changes')}
                                control={
                                    <Switch 
                                        name="passwordExpiry" 
                                        checked={settings.passwordExpiry} 
                                        onChange={handleSwitchChange}
                                        color="primary"
                                    />
                                }
                            />
                            <SettingRow
                                title={t('auth.settings.passwordHistory', 'Enforce Password History')}
                                description={t('auth.settings.passwordHistoryDesc', 'Prevent reuse of previous passwords')}
                                control={
                                    <Switch 
                                        name="passwordHistory" 
                                        checked={settings.passwordHistory} 
                                        onChange={handleSwitchChange}
                                        color="primary"
                                    />
                                }
                            />
                            <SettingRow
                                title={t('auth.settings.accountLockout', 'Enable Account Lockout')}
                                description={t('auth.settings.accountLockoutDesc', 'Lock users after failed login attempts')}
                                control={
                                    <Switch 
                                        name="accountLockout" 
                                        checked={settings.accountLockout} 
                                        onChange={handleSwitchChange}
                                        color="primary"
                                    />
                                }
                            />
                            <SettingRow
                                title={t('auth.settings.passwordResetMethod', 'Password Reset Method')}
                                description={t('auth.settings.passwordResetMethodDesc', 'How users can reset forgotten passwords')}
                                control={
                                    <FormControl size="small" sx={{ minWidth: 180 }}>
                                        <Select
                                            name="passwordResetMethod"
                                            value={settings.passwordResetMethod}
                                            onChange={handleSelectChange as any}
                                            displayEmpty
                                            variant="outlined"
                                            sx={{ bgcolor: 'background.paper' }}
                                        >
                                            <MenuItem value="email">{t('auth.settings.emailOtp', 'OTP via Email')}</MenuItem>
                                            <MenuItem value="sms">{t('auth.settings.smsOtp', 'OTP via SMS')}</MenuItem>
                                            <MenuItem value="security-questions">{t('auth.settings.securityQuestions', 'Security Questions')}</MenuItem>
                                        </Select>
                                    </FormControl>
                                }
                            />
                        </Stack>
                    )}
                </Paper> */}

                {/* Advanced Security & User Experience */}
                <Paper 
                    variant="outlined" 
                    sx={{ 
                        p: 3, 
                        borderRadius: 1,
                        boxShadow: theme => theme.shadows[1]
                    }}
                >
                    <SectionHeader 
                        title={t('auth.settings.advancedTitle', 'Advanced Security & User Experience')}
                        description={t('auth.settings.advancedDesc', 'Configure additional security measures and user experience settings')}
                        collapsible
                        onToggle={() => toggleSection('advanced')}
                        isExpanded={expandedSections.advanced}
                    />
                    {expandedSections.advanced && (
                        <Stack spacing={1} sx={{ mt: 2 }}>
                            <SettingRow
                                title={t('auth.settings.captcha', 'Enable CAPTCHA')}
                                description={t('auth.settings.captchaDesc', 'Protect against automated bots')}
                                control={
                                    <Switch 
                                        name="captcha" 
                                        checked={settings.captcha} 
                                        onChange={handleSwitchChange}
                                        color="primary"
                                    />
                                }
                            />
                            <SettingRow
                                title={t('auth.settings.inactivity', 'Enable Inactivity Policy')}
                                description={t('auth.settings.inactivityDesc', 'Log out inactive users automatically')}
                                control={
                                    <Switch 
                                        name="inactivityPolicy" 
                                        checked={settings.inactivityPolicy} 
                                        onChange={handleSwitchChange}
                                        color="primary"
                                    />
                                }
                            />
                            <SettingRow
                                title={t('auth.settings.realTimeFeedback', 'Enable Real-Time Password Strength Feedback')}
                                description={t('auth.settings.realTimeFeedbackDesc', 'Show password strength meter to users')}
                                control={
                                    <Switch 
                                        name="realTimeFeedback" 
                                        checked={settings.realTimeFeedback} 
                                        onChange={handleSwitchChange}
                                        color="primary"
                                    />
                                }
                            />
                        </Stack>
                    )}
                </Paper>
            </Stack>
        </Box>
    );
}

// To make this a default export for a Next.js page
export default AuthenticationSettings;
