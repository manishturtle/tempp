'use client';

import React, { useState, useEffect } from 'react';
import { Box, CssBaseline } from '@mui/material';
import dynamic from 'next/dynamic';
import { useLanguage } from '@/app/i18n/LanguageContext';

// Dynamically import client-only components with ssr: false
const TopNav = dynamic(() => import('./TopNav'), { ssr: false });
const SideNav = dynamic(() => import('./SideNav'), { ssr: false });

interface AppLayoutProps {
  children: React.ReactNode;
}

// Constants
const DRAWER_WIDTH = 240;
const COLLAPSED_DRAWER_WIDTH = 64;
const TOPBAR_HEIGHT = 64;

export default function AppLayout({ children }: AppLayoutProps) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const { currentLanguage } = useLanguage();
  const isRTL = currentLanguage === 'ar';

  useEffect(() => {
    // Check for mobile only on the client side
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 600);
    };
    
    // Set initial values
    checkMobile();
    setIsDrawerOpen(!isMobile);
    
    // Add resize listener
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, [isMobile]);

  const handleDrawerToggle = () => {
    setIsDrawerOpen(!isDrawerOpen);
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <CssBaseline />
      
      {/* Fixed TopNav */}
      <TopNav 
        onMenuClick={handleDrawerToggle} 
        isDrawerOpen={isDrawerOpen} 
      />
      
      {/* Collapsible SideNav below TopNav */}
      <SideNav 
        isOpen={isDrawerOpen} 
        onClose={() => setIsDrawerOpen(false)}
        variant={isMobile ? 'temporary' : 'permanent'}
        collapsedWidth={COLLAPSED_DRAWER_WIDTH}
        isRTL={isRTL}
      />
      
      <Box
        component="main"
        role="main"
        aria-label="Main content"
        sx={(theme) => ({
          flexGrow: 1,
          p: 3,
          mt: `${TOPBAR_HEIGHT}px`,
          ...(isRTL
            ? {
                mr: { 
                  xs: 0,
                  // sm: `${isDrawerOpen ? DRAWER_WIDTH : COLLAPSED_DRAWER_WIDTH}px`
                },
                ml: { xs: 0 },
              }
            : {
                ml: { 
                  xs: 0,
                  // sm: `${isDrawerOpen ? DRAWER_WIDTH : COLLAPSED_DRAWER_WIDTH}px`
                },
              }),
          width: {
            xs: '100%',
            sm: `calc(100% - ${isDrawerOpen ? DRAWER_WIDTH : COLLAPSED_DRAWER_WIDTH}px)`
          },
          transition: theme.transitions.create(['margin', 'width'], {
            easing: theme.transitions.easing.easeInOut,
            duration: theme.transitions.duration.standard,
          }),
        })}
      >
        <Box sx={{ 
          width: '100%',
          display: 'flex',
          justifyContent: 'center',
          transition: (theme) => theme.transitions.create('opacity', {
            duration: theme.transitions.duration.shortest,
          }),
        }}>
          <Box sx={{ 
            width: '100%',
            animation: isDrawerOpen ? 'none' : 'fadeIn 0.3s ease-in-out',
            '@keyframes fadeIn': {
              '0%': { opacity: 0.9 },
              '100%': { opacity: 1 }
            }
          }}>
            {children}
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
