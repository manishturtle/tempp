'use client';

import {
  AppBar,
  IconButton,
  Toolbar,
  Typography,
  useTheme,
  Menu,
  MenuItem,
  Box,
  Tooltip,
  Avatar,
  Divider,
  alpha,
} from '@mui/material';
import { 
  Menu as MenuIcon, 
  Brightness4, 
  Brightness7,
  ColorLens,
  Translate,
  FormatSize,
} from '@mui/icons-material';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useThemeContext } from '@/app/theme/ThemeContext';
import { useLanguage } from '@/app/i18n/LanguageContext';
import { getTranslation } from '@/app/i18n/languageUtils';
import { usePathname } from 'next/navigation';

interface TopNavProps {
  onMenuClick: () => void;
  isDrawerOpen: boolean;
}

export default function TopNav({ onMenuClick, isDrawerOpen }: TopNavProps) {
  const theme = useTheme();
  const { mode, color, fontFamily, toggleTheme, changeThemeColor, changeFontFamily } = useThemeContext();
  const { currentLanguage, changeLanguage, languages } = useLanguage();
  const [colorMenuAnchor, setColorMenuAnchor] = useState<null | HTMLElement>(null);
  const [userMenuAnchor, setUserMenuAnchor] = useState<null | HTMLElement>(null);
  const [langMenuAnchor, setLangMenuAnchor] = useState<null | HTMLElement>(null);
  const [fontMenuAnchor, setFontMenuAnchor] = useState<null | HTMLElement>(null);
  const pathname = usePathname();
  const tenant = pathname.split('/')[1]; // This will extract "Aad18" from "/Aad18/..."
  
  // Function to translate text
  const t = (key: string) => getTranslation(key, currentLanguage);

  const handleColorMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setColorMenuAnchor(event.currentTarget);
  };

  const handleColorMenuClose = () => {
    setColorMenuAnchor(null);
  };

  const handleUserMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setUserMenuAnchor(event.currentTarget);
  };

  const handleUserMenuClose = () => {
    setUserMenuAnchor(null);
  };

  const router = useRouter();

  const handleLogout = () => {
    if (typeof window === 'undefined') return;
    
    // Get current tenant from URL
    const pathParts = window.location.pathname.split('/');
    const currentTenant = pathParts[1];
    
    if (currentTenant) {
      // Clear tenant-specific items from localStorage
      const tenantPrefix = `${currentTenant}_admin_`;
      const keysToRemove = [
        'token',
        'app_id',
        'has_checked',
        'has_checked_tenant',
        'appLanguage',
        'tenant_slug',
        'companyDetails',
        'fontFamily',
        'logoDark',
        'logoLight',
        'secondaryColor',
        'themeColor',
        'themeMode'
      ];
      
      // Remove each key with the tenant prefix
      keysToRemove.forEach(key => {
        localStorage.removeItem(`${tenantPrefix}${key}`);
      });
    }
    
 
    
    // Redirect to login page
    const baseUrl = window.location.origin;
    window.location.href = `${baseUrl}/${currentTenant || ''}/Crm/`;
    
    handleUserMenuClose();
  };
  
  const handleLangMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setLangMenuAnchor(event.currentTarget);
  };

  const handleLangMenuClose = () => {
    setLangMenuAnchor(null);
  };
  
  const handleFontMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setFontMenuAnchor(event.currentTarget);
  };

  const handleFontMenuClose = () => {
    setFontMenuAnchor(null);
  };

  const colorOptions = [
    { name: 'Blue', value: 'blue', color: '#1976d2' },
    { name: 'Purple', value: 'purple', color: '#7b1fa2' },
    { name: 'Green', value: 'green', color: '#2e7d32' },
    { name: 'Teal', value: 'teal', color: '#00796b' },
    { name: 'Indigo', value: 'indigo', color: '#3f51b5' },
    { name: 'Amber', value: 'amber', color: '#ff8f00' },
    { name: 'Red', value: 'red', color: '#d32f2f' },
    { name: 'Pink', value: 'pink', color: '#c2185b' },
    { name: 'Orange', value: 'orange', color: '#ef6c00' },
    { name: 'Cyan', value: 'cyan', color: '#0097a7' },
    { name: 'Deep Purple', value: 'deepPurple', color: '#512da8' },
    { name: 'Lime', value: 'lime', color: '#afb42b' },
  ];
  
  const fontOptions = [
    { name: 'Inter', value: 'inter', preview: 'Aa' },
    { name: 'Roboto', value: 'roboto', preview: 'Aa' },
    { name: 'Poppins', value: 'poppins', preview: 'Aa' },
    { name: 'Montserrat', value: 'montserrat', preview: 'Aa' },
    { name: 'Open Sans', value: 'opensans', preview: 'Aa' },
    { name: 'Underdog', value: 'underdog', preview: 'Aa' },
  ];

  return (
    <AppBar
      position="fixed"
      sx={{
        zIndex: (theme) => theme.zIndex.drawer + 1,
        transition: (theme) => theme.transitions.create(['width', 'margin'], {
          easing: theme.transitions.easing.sharp,
          duration: theme.transitions.duration.leavingScreen,
        }),
        boxShadow: 'none',
        borderBottom: (theme) => `1px solid ${theme.palette.divider}`,
        backgroundColor: (theme) => 
          theme.palette.mode === 'light' 
            ? theme.palette.background.paper
            : theme.palette.background.paper,
      }}
    >
      <Toolbar component="nav" role="navigation" aria-label="Main navigation">
        <IconButton
          aria-label="open drawer"
          edge="start"
          onClick={onMenuClick}
          sx={{ 
            mr: 2,
            color: theme.palette.text.primary
          }}
        >
          <MenuIcon />
        </IconButton>
        <Box 
          sx={{ 
            flexGrow: 1,
            display: 'flex',
            alignItems: 'center',
            height: 70,
          }}
        >
          {/* <Box 
            component="img"
            src={(() => {
              if (typeof window === 'undefined') return null;
              
              // Get tenant-specific logo keys
              const tenantKey = `${tenant}_admin`;
              const logoDark = localStorage.getItem(`${tenantKey}_logoDark`);
              const logoLight = localStorage.getItem(`${tenantKey}_logoLight`);
              
              // Use dark logo only when mode is explicitly dark
              if (mode === 'dark' && logoDark) {
                return logoDark;
              } else if (logoLight) { 
                // Otherwise use light logo
                return logoLight;
              }
              
              // Fallback to default logo if no tenant-specific logo found
              return '';
            })()}
            alt={t('app.title')}
            sx={{ 
              height: "90%",
              objectFit: 'contain',
              mr: 2,
              maxWidth: '220px'
            }}
          /> */}


          <Box 
            component="img"
            src={(() => {
              if (typeof window === 'undefined') return null;
              
              // Get tenant-specific logo keys
              const tenantKey = `${tenant}_admin`;
              console.log("tenantKey",tenantKey);
              const logoDark = localStorage.getItem(`${tenantKey}_logoDark`);
              const logoLight = localStorage.getItem(`${tenantKey}_logoLight`);
              
              // Use dark logo only when mode is explicitly dark
              if (mode === 'dark' && logoDark) {
                return logoDark;
              } else if (logoLight) { 
                // Otherwise use light logo
                return logoLight;
              }
              
              // Fallback to default logo if no tenant-specific logo found
              return '';
            })()}
            alt={t('app.title')}
            sx={{ 
              height: "90%",
              objectFit: 'contain',
              mr: 2,
              maxWidth: '220px'
            }}
          />


        </Box>
        
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          {/* Language selector */}
          <Tooltip title="Change language">
            <IconButton 
              onClick={handleLangMenuOpen}
              sx={{ 
                ml: 1,
                color: theme.palette.text.primary
              }}
            >
              <Translate />
            </IconButton>
          </Tooltip>
          <Menu
            anchorEl={langMenuAnchor}
            open={Boolean(langMenuAnchor)}
            onClose={handleLangMenuClose}
            PaperProps={{
              elevation: 3,
              sx: {
                overflow: 'visible',
                filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.32))',
                mt: 1.5,
                width: 180,
              },
            }}
            transformOrigin={{ horizontal: 'right', vertical: 'top' }}
            anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
          >
            <Typography variant="subtitle2" sx={{ px: 2, py: 1, fontWeight: 600 }}>
              Select Language
            </Typography>
            <Divider />
            {languages.map((lang) => (
              <MenuItem 
                key={lang.code} 
                onClick={() => {
                  changeLanguage(lang.code);
                  handleLangMenuClose();
                }}
                selected={currentLanguage === lang.code}
                sx={{ py: 1.5 }}
              >
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    width: '100%',
                    justifyContent: 'space-between',
                  }}
                >
                  <span>{t(`languages.${lang.code}`)}</span>
                  {currentLanguage === lang.code && (
                    <Box
                      sx={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        bgcolor: 'primary.main',
                      }}
                    />
                  )}
                </Box>
              </MenuItem>
            ))}
          </Menu>
          
          {/* Theme toggle button */}
          <Tooltip title={`Switch to ${mode === 'light' ? 'dark' : 'light'} mode`}>
            <IconButton 
              onClick={toggleTheme} 
              sx={{ 
                ml: 1,
                color: theme.palette.text.primary
              }}
            >
              {mode === 'light' ? <Brightness4 /> : <Brightness7 />}
            </IconButton>
          </Tooltip>
          
          {/* Font family selector */}
          {/* <Tooltip title="Change font family">
            <IconButton 
              onClick={handleFontMenuOpen}
              sx={{ 
                ml: 1,
                color: theme.palette.text.primary
              }}
            >
              <FormatSize />
            </IconButton>
          </Tooltip> */}
          <Menu
            anchorEl={fontMenuAnchor}
            open={Boolean(fontMenuAnchor)}
            onClose={handleFontMenuClose}
            PaperProps={{
              elevation: 3,
              sx: {
                overflow: 'visible',
                filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.32))',
                mt: 1.5,
                width: 180,
              },
            }}
            transformOrigin={{ horizontal: 'right', vertical: 'top' }}
            anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
          >
            <Typography variant="subtitle2" sx={{ px: 2, py: 1, fontWeight: 600 }}>
              {t('app.font.family')}
            </Typography>
            <Divider />
            {fontOptions.map((option) => (
              <MenuItem 
                key={option.value} 
                onClick={() => {
                  changeFontFamily(option.value as any);
                  handleFontMenuClose();
                }}
                selected={fontFamily === option.value}
                sx={{ py: 1.5 }}
              >
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 30,
                    height: 30,
                    borderRadius: '4px',
                    backgroundColor: theme.palette.mode === 'light' ? alpha(theme.palette.primary.main, 0.1) : alpha(theme.palette.primary.main, 0.2),
                    mr: 2,
                    fontFamily: option.value === 'inter' ? '"Inter", sans-serif' :
                              option.value === 'roboto' ? '"Roboto", sans-serif' :
                              option.value === 'poppins' ? '"Poppins", sans-serif' :
                              option.value === 'montserrat' ? '"Montserrat", sans-serif' :
                              '"Open Sans", sans-serif',
                    fontWeight: 500,
                    fontSize: '14px',
                    color: theme.palette.text.primary,
                  }}
                >
                  {option.preview}
                </Box>
                <Typography
                  sx={{
                    fontFamily: option.value === 'inter' ? '"Inter", sans-serif' :
                                option.value === 'roboto' ? '"Roboto", sans-serif' :
                                option.value === 'poppins' ? '"Poppins", sans-serif' :
                                option.value === 'montserrat' ? '"Montserrat", sans-serif' :
                                '"Open Sans", sans-serif',
                  }}
                >
                  {option.name}
                </Typography>
                {fontFamily === option.value && (
                  <Box
                    sx={{
                      position: 'absolute',
                      right: 10,
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      bgcolor: 'primary.main',
                    }}
                  />
                )}
              </MenuItem>
            ))}
          </Menu>
          
          {/* Color theme selector */}
          {/* <Tooltip title="Change theme color">
            <IconButton 
              onClick={handleColorMenuOpen}
              sx={{ 
                ml: 1,
                color: theme.palette.text.primary
              }}
            >
              <ColorLens />
            </IconButton>
          </Tooltip> */}
          <Menu
            anchorEl={colorMenuAnchor}
            open={Boolean(colorMenuAnchor)}
            onClose={handleColorMenuClose}
            PaperProps={{
              elevation: 3,
              sx: {
                overflow: 'visible',
                filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.32))',
                mt: 1.5,
                width: 180,
              },
            }}
            transformOrigin={{ horizontal: 'right', vertical: 'top' }}
            anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
          >
            <Typography variant="subtitle2" sx={{ px: 2, py: 1, fontWeight: 600 }}>
              {t('app.theme.colors')}
            </Typography>
            <Divider />
            {colorOptions.map((option) => (
              <MenuItem 
                key={option.value} 
                onClick={() => {
                  changeThemeColor(option.value as any);
                  handleColorMenuClose();
                }}
                selected={color === option.value}
                sx={{ py: 1.5 }}
              >
                <Box
                  sx={{
                    width: 20,
                    height: 20,
                    borderRadius: '50%',
                    backgroundColor: option.color,
                    mr: 2,
                    border: '2px solid',
                    borderColor: color === option.value ? 'primary.main' : 'transparent',
                  }}
                />
                {option.name}
              </MenuItem>
            ))}
          </Menu>
          
          {/* User menu */}
          <Tooltip title="Account settings">
            <IconButton
              onClick={handleUserMenuOpen}
              sx={{ 
                ml: 2,
                color: theme.palette.text.primary
              }}
              aria-controls={Boolean(userMenuAnchor) ? 'account-menu' : undefined}
              aria-haspopup="true"
              aria-expanded={Boolean(userMenuAnchor) ? 'true' : undefined}
            >
              <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main' }}>U</Avatar>
            </IconButton>
          </Tooltip>
          <Menu
            id="account-menu"
            anchorEl={userMenuAnchor}
            open={Boolean(userMenuAnchor)}
            onClose={handleUserMenuClose}
            PaperProps={{
              elevation: 3,
              sx: {
                overflow: 'visible',
                filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.32))',
                mt: 1.5,
                width: 180,
              },
            }}
            transformOrigin={{ horizontal: 'right', vertical: 'top' }}
            anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
          >
            <MenuItem onClick={handleLogout}>{t('app.menu.logout')}</MenuItem>
          </Menu>
        </Box>
      </Toolbar>
    </AppBar>
  );
}
