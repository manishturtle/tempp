'use client';

import { usePathname } from 'next/navigation';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useRoleAccess } from '../../contexts/ai-platform/RoleAccessContext';
import Image from 'next/image';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
  IconButton,
  styled,
  alpha,
  ButtonProps,
  TypographyProps,
} from '@mui/material';
import LogoutIcon from '@mui/icons-material/Logout';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import Link from 'next/link';
import ConfirmationDialog from './ConfirmationDialog';
import { useTenant } from '../../contexts/ai-platform/TenantContext';
import { Avatar, Menu, MenuItem, ListItemIcon, ListItemText, Divider } from '@mui/material';
import VpnKeyIcon from '@mui/icons-material/VpnKey';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import Tooltip from '@mui/material/Tooltip';
import CustomSnackbar from '../../components/AIPlatform/snackbar/CustomSnackbar';

// Styled Components
const StyledAppBar = styled(AppBar)(({ theme }) => ({
  backgroundColor: theme.palette.background.paper,
  color: theme.palette.text.primary,
  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  position: 'sticky',
  top: 0,
  zIndex: theme.zIndex.drawer + 1,
  borderBottom: `1px solid ${theme.palette.divider}`,
  padding: theme.spacing(0, 2),
}));

interface NavButtonProps extends ButtonProps {
  active: boolean;
  component?: React.ElementType;
}

const NavButton = styled(Button, {
  shouldForwardProp: (prop) => prop !== 'active',
})<NavButtonProps>(({ theme, active }) => ({
  color: active ? theme.palette.primary.main : theme.palette.text.secondary,
  textTransform: 'none',
  fontWeight: active ? 600 : 400,
  fontSize: '0.9375rem',
  padding: theme.spacing(1, 2),
  borderRadius: theme.shape.borderRadius,
  position: 'relative',
  transition: 'all 0.2s ease-in-out',
  letterSpacing: '0.3px',
  textDecoration: 'none',
  '&:hover': {
    backgroundColor: alpha(theme.palette.primary.main, 0.04),
    color: theme.palette.primary.main,
  },
  '&::after': {
    content: '""',
    position: 'absolute',
    bottom: 0,
    left: '50%',
    transform: active ? 'translateX(-50%)' : 'translateX(-50%) scaleX(0)',
    width: 'calc(100% - 24px)',
    height: '2px',
    backgroundColor: theme.palette.primary.main,
    transition: 'transform 0.2s ease-in-out',
  },
  '&:hover::after': {
    transform: 'translateX(-50%)',
  },
}));

interface LogoProps extends TypographyProps {
  onClick?: () => void;
}

const Logo = styled('div', {
  shouldForwardProp: (prop) => prop !== 'onClick',
})<LogoProps>(({ theme, onClick }) => ({
  cursor: onClick ? 'pointer' : 'default',
  transition: 'all 0.3s ease',
  '&:hover': {
    opacity: onClick ? 0.8 : 1,
  },
  '& img': {
    height: '65px',
    width: 'auto',
    objectFit: 'contain'
  }
}));

interface NavItem {
  label: string;
  path: string;
}

interface HeaderProps {
  // Add any props you need here
}

const Header: React.FC<HeaderProps> = () => {
  const router = useRouter();
  const pathname = usePathname() || '';
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'error' | 'warning' | 'info' | 'success';
  }>({ open: false, message: '', severity: 'error' });
  const open = Boolean(anchorEl);
  const { tenantSlug } = useTenant();

  const handleProfileMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleProfileMenuClose = () => {
    setAnchorEl(null);
  }; 
  
  const handleApiKeyClick = () => {
    handleProfileMenuClose();
    router.push(`/${tenantSlug}/api-key`);
  };

  const handleCreditsClick = () => {
    handleProfileMenuClose();
    router.push(`/${tenantSlug}/credits`);
  };

  const handleLogoutClick = () => {
    setShowLogoutConfirm(true);
  };

  const handleConfirmLogout = () => {
    // Store the tenant slug before clearing storage
    const currentTenantSlug = tenantSlug || localStorage.getItem('tenant_slug') || '';

    // Comprehensive clearing of all browser storage
    if (typeof window !== 'undefined') {
      // Clear localStorage - first enumerate all keys then remove them
      const localStorageKeys = Object.keys(localStorage);
      localStorageKeys.forEach((key) => {
        localStorage.removeItem(key);
      });
      localStorage.clear(); // Double-check with clear()

      // Clear sessionStorage - first enumerate all keys then remove them
      const sessionStorageKeys = Object.keys(sessionStorage);
      sessionStorageKeys.forEach((key) => {
        sessionStorage.removeItem(key);
      });
      sessionStorage.clear(); // Double-check with clear()

      // Clear all cookies with multiple approaches to ensure complete removal
      document.cookie.split(';').forEach((cookie) => {
        const [name] = cookie.trim().split('=');
        if (name) {
          // Clear with multiple paths to catch all possible cookie paths
          document.cookie = `${name}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT; Max-Age=0; Secure; SameSite=Strict`;
          document.cookie = `${name}=; Path=${window.location.pathname}; Expires=Thu, 01 Jan 1970 00:00:01 GMT; Max-Age=0; Secure; SameSite=Strict`;
        }
      });

      // Clear any application-specific state
      try {
        // Clear IndexedDB if used
        if (window.indexedDB && window.indexedDB.databases) {
          window.indexedDB.databases().then((dbs) => {
            dbs?.forEach((db) => {
              if (db.name) {
                window.indexedDB.deleteDatabase(db.name);
              }
            });
          }).catch(() => {});
        }
      } catch (e) {
        console.error('Error clearing IndexedDB:', e);
      }
    }

    // Redirect to the tenant login page using the stored tenant slug
    if (currentTenantSlug) {
      // Use router.push for Next.js navigation
      router.push(`/${currentTenantSlug}`);
      // Force a full page reload to ensure all state is cleared
      window.location.href = `/${currentTenantSlug}`;
    } else {
      // Fallback to base URL if tenant slug is not available
      router.push('/');
      window.location.href = '/';
    }
  };

  const handleCancelLogout = () => {
    setShowLogoutConfirm(false);
  };

  // Ensure tenantSlug is defined before using it in paths
  const navItems: NavItem[] = [
    { label: 'Webhooks', path: `/${tenantSlug ?? ''}/webhook` },
    { label: 'Workbench', path: `/${tenantSlug ?? ''}/prompt-template/list` },
  ];
  
  // Get role access permissions
  const { hasFeatureAccess, loading: rolesLoading } = useRoleAccess();

  // Function to handle navigation with permission check
  const handleNavigation = (path: string, requiredFeature?: string) => {
    // If no feature requirement or loading, allow navigation
    if (!requiredFeature || rolesLoading) {
      router.push(path);
      return;
    }
    
    // Check if the user has access to this feature
    const hasAccess = hasFeatureAccess(requiredFeature);
    if (hasAccess) {
      router.push(path);
    } else {
      // Show error message
      setSnackbar({
        open: true,
        message: `You don't have access to this feature. Please contact your administrator.`,
        severity: 'error'
      });
    }
  };

  // Check if current path starts with any of the workbench paths
  const isWorkbenchActive = pathname.startsWith(`/${tenantSlug ?? ''}/prompt-template`);

  const handleLogoClick = () => {
    const path = `/${tenantSlug ?? ''}`;
    router.push(path);
  };

  return (
    <>
      <Toolbar disableGutters sx={{ minHeight: 64, padding: '0 16px' }}>
        <Logo
          sx={{
            flexGrow: 1,
            display: 'flex',
            alignItems: 'center'
          }}
          onClick={handleLogoClick}
        >
          <Image 
            src="/turtle_brand_logo.png" 
            alt="TurtleSoftwares Logo"
            width={150}
            height={40}
            priority
          />
        </Logo>
        
       
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: { xs: 0.5, sm: 1 },
          }}
        >
          {navItems.map((item) => (
            <NavButton
              key={item.label}
              active={pathname === item.path || 
                (item.label === 'Workbench' && isWorkbenchActive)}
              onClick={() => {
                // Check permissions based on feature
                if (item.label === 'Webhooks') {
                  handleNavigation(item.path, 'webhook_configration');
                } else if (item.label === 'Workbench') {
                  handleNavigation(item.path, 'workbench');
                } else {
                  router.push(item.path);
                }
              }}
              disableRipple
            >
              {item.label}
            </NavButton>
          ))}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <IconButton
              onClick={handleProfileMenuOpen}
              size="small"
              sx={{ ml: 2 }}
              aria-controls={open ? 'account-menu' : undefined}
              aria-haspopup="true"
              aria-expanded={open ? 'true' : undefined}
            >
              <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main' }}>
                <PersonOutlineIcon fontSize="small" />
              </Avatar>
            </IconButton>
            <Menu
              anchorEl={anchorEl}
              id="account-menu"
              open={open}
              onClose={handleProfileMenuClose}
              onClick={handleProfileMenuClose}
              PaperProps={{
                elevation: 0,
                sx: {
                  overflow: 'visible',
                  filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.15))',
                  mt: 1.5,
                  '& .MuiAvatar-root': {
                    width: 32,
                    height: 32,
                    ml: -0.5,
                    mr: 1,
                  },
                  '&:before': {
                    content: '""',
                    display: 'block',
                    position: 'absolute',
                    top: 0,
                    right: 14,
                    width: 10,
                    height: 10,
                    bgcolor: 'background.paper',
                    transform: 'translateY(-50%) rotate(45deg)',
                    zIndex: 0,
                  },
                },
              }}
              transformOrigin={{ horizontal: 'right', vertical: 'top' }}
              anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
            >
              <MenuItem onClick={handleApiKeyClick}>
                <ListItemIcon>
                  <VpnKeyIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText>API Key</ListItemText>
              </MenuItem>
              <MenuItem onClick={handleCreditsClick}>
                <ListItemIcon>
                  <AccountBalanceWalletIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText>Available Credits</ListItemText>
              </MenuItem>
              <Divider />
              <MenuItem onClick={handleLogoutClick}>
                <ListItemIcon>
                  <LogoutIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText>Logout</ListItemText>
              </MenuItem>
            </Menu>
          </Box>

          <ConfirmationDialog
            open={showLogoutConfirm}
            title="Confirm Logout"
            message="Are you sure you want to log out?"
            confirmText="Logout"
            cancelText="Cancel"
            onConfirm={handleConfirmLogout}
            onCancel={handleCancelLogout}
            confirmColor="error"
          />
        </Box>
      </Toolbar>
      {/* Snackbar for permission errors */}
      <CustomSnackbar
        open={snackbar.open}
        message={snackbar.message}
        severity={snackbar.severity}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
      />
    </>
  );
};

export default Header;
