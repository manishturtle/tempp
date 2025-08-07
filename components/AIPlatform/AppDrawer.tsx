'use client';

import { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  AppBar,
  Avatar,
  Box,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Toolbar,
  Tooltip,
  Typography,
  Divider,
  IconButton,
  useTheme,
  styled,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  EditNote as PromptIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  Menu as MenuIcon,
  AccountCircle as AccountCircleIcon,
  SmartToy as SmartToyIcon,
  Webhook as WebhookIcon,
  ScienceTwoTone,

} from '@mui/icons-material';

const drawerWidth = 245 ;

const DrawerHeader = styled('div')(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  padding: theme.spacing(2, 2, 2, 2.5),
  ...theme.mixins.toolbar,
  justifyContent: 'space-between',
  borderBottom: '1px solid rgba(0, 0, 0, 0.12)',
  minHeight: '64px !important',
}));

const navItems = [
  // { text: 'Prompt Engine', icon: <DashboardIcon />, path: '/dashboard' },
  // { text: 'Prompt Management', icon: <PromptIcon />, path: '/prompt-management' },
  { text: 'Webhooks', icon: <WebhookIcon />, path: '/webhook' },
  { text: 'Workbench', icon: <ScienceTwoTone />, path: '/prompt-template/list' },
];

interface AppDrawerProps {
  children: React.ReactNode;
}

export default function AppDrawer({ children }: AppDrawerProps) {
  const theme = useTheme();
  const router = useRouter();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const handleDrawerToggle = () => {
    if (isClosing) return;
    setMobileOpen(!mobileOpen);
  };

  const handleDrawerTransitionEnd = () => {
    setIsClosing(false);
  };

  const handleDrawerClose = () => {
    setIsClosing(true);
    setMobileOpen(false);
  };

  const handleNavigation = (path: string) => {
    router.push(path);
  };

  const handleMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    // Handle logout logic here
    handleClose();
  };

  return (
    <Box sx={{ display: 'flex', height: '100vh' }}>
      <Box
        component="nav"
        sx={{
          width: { md: collapsed ? 73 : drawerWidth },
          flexShrink: { md: 0 },
          transition: theme.transitions.create('width', {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.leavingScreen,
          }),
        }}
        aria-label="mailbox folders"
      >
        {/* Mobile header */}
        <Box sx={{ flexGrow: 1, display: { xs: 'flex', md: 'none' } }}>
          <AppBar position="fixed" sx={{ bgcolor: 'white', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
            <Toolbar>
              <IconButton
                color="inherit"
                aria-label="open drawer"
                edge="start"
                onClick={handleDrawerToggle}
                sx={{ mr: 2, color: 'text.primary' }}
              >
                <MenuIcon />
              </IconButton>
              <Box sx={{ flexGrow: 1 }} />
              <div>
                <IconButton
                  size="large"
                  aria-label="account of current user"
                  aria-controls="menu-appbar"
                  aria-haspopup="true"
                  onClick={handleMenu}
                  color="inherit"
                  sx={{ color: 'text.primary' }}
                >
                  <AccountCircleIcon />
                </IconButton>
                <Menu
                  id="menu-appbar"
                  anchorEl={anchorEl}
                  anchorOrigin={{
                    vertical: 'top',
                    horizontal: 'right',
                  }}
                  keepMounted
                  transformOrigin={{
                    vertical: 'top',
                    horizontal: 'right',
                  }}
                  open={open}
                  onClose={handleClose}
                >
                  <MenuItem onClick={handleClose}>Profile</MenuItem>
                  <MenuItem onClick={handleLogout}>Logout</MenuItem>
                </Menu>
              </div>
            </Toolbar>
          </AppBar>
        </Box>

        {/* Mobile drawer */}
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onTransitionEnd={handleDrawerTransitionEnd}
          onClose={handleDrawerClose}
          ModalProps={{
            keepMounted: true, // Better open performance on mobile.
          }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
              backgroundColor: '#ffffff',
              borderRight: 'none',
              boxShadow: '2px 0 10px rgba(0, 0, 0, 0.05)',
            },
          }}
        >
          <DrawerHeader>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 2,
                opacity: 1,
                width: 'auto',
              }}>
                <Box 
                  component="img"
                  src="/turtle-brand.png" 
                  alt="Logo" 
                  sx={{ 
                    width: 32, 
                    height: 32,
                    objectFit: 'contain' 
                  }}
                />
                <Typography variant="h6" noWrap component="div" sx={{ fontWeight: 600 }}>
                  AI Platform
                </Typography>
              </Box>
              <Box sx={{ ml: 'auto' }}>
                <IconButton onClick={handleDrawerClose} size="small">
                  <ChevronLeftIcon />
                </IconButton>
              </Box>
            </Box>
          </DrawerHeader>
          <Divider />
          <List>
            {navItems.map((item) => (
              <ListItem key={item.path} disablePadding>
                <ListItemButton
                  selected={pathname === item.path}
                  onClick={() => {
                    handleNavigation(item.path);
                    handleDrawerClose();
                  }}
                  sx={{
                    '&.Mui-selected': {
                      backgroundColor: 'rgba(25, 118, 210, 0.08)',
                      '&:hover': {
                        backgroundColor: 'rgba(25, 118, 210, 0.12)',
                      },
                    },
                    overflow: 'hidden',
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 40 }}>{item.icon}</ListItemIcon>
                  <ListItemText 
                    primary={item.text}
                    sx={{ 
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </Drawer>

        {/* Desktop drawer */}
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: collapsed ? 73 : drawerWidth,
              backgroundColor: '#ffffff',
              borderRight: 'none',
              boxShadow: '2px 0 10px rgba(0, 0, 0, 0.05)',
              transition: theme.transitions.create('width', {
                easing: theme.transitions.easing.sharp,
                duration: theme.transitions.duration.enteringScreen,
              }),
              overflowX: 'hidden',
            },
          }}
          open={!collapsed}
        >
          <DrawerHeader>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 2,
                opacity: collapsed ? 0 : 1,
                width: collapsed ? 0 : 'auto',
                overflow: 'hidden',
                transition: 'all 0.2s',
              }}>
                <Box 
                  component="img"
                  src="/turtle-brand.png" 
                  alt="Logo" 
                  sx={{ 
                    width: 32, 
                    height: 32,
                    objectFit: 'contain' 
                  }}
                />
                <Typography variant="h6" noWrap component="div" sx={{ fontWeight: 600 }}>
                  AI Platform
                </Typography>
              </Box>
              <Box sx={{ ml: 'auto' }}>
                <Tooltip title={collapsed ? 'Expand' : 'Collapse'}>
                  <IconButton onClick={() => setCollapsed(!collapsed)} size="small">
                    {collapsed ? <ChevronRightIcon /> : <ChevronLeftIcon />}
                  </IconButton>
                </Tooltip>
              </Box>
            </Box>
          </DrawerHeader>
          <Divider />
          <List>
            {navItems.map((item) => (
              <ListItem key={item.path} disablePadding>
                <ListItemButton
                  selected={pathname.startsWith(item.path) && item.path !== '/' || pathname === item.path}
                  onClick={() => handleNavigation(item.path)}
                  sx={{
                    '&.Mui-selected': {
                      backgroundColor: 'rgba(25, 118, 210, 0.08)',
                      borderLeft: '3px solid #1976d2',
                      '&:hover': {
                        backgroundColor: 'rgba(25, 118, 210, 0.12)',
                      },
                      '& .MuiListItemIcon-root': {
                        color: 'primary.main',
                      },
                    },
                    '&:hover': {
                      backgroundColor: 'rgba(0, 0, 0, 0.04)',
                    },
                    overflow: 'hidden',
                    pl: collapsed ? 2.5 : 3,
                    py: 1.5,
                    transition: 'all 0.2s',
                  }}
                >
                  <ListItemIcon sx={{ 
                    minWidth: 40,
                    color: 'text.secondary',
                    transition: 'color 0.2s',
                  }}>
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText 
                    primary={item.text}
                    sx={{ 
                      opacity: collapsed ? 0 : 1,
                      transition: 'opacity 0.2s',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      width: collapsed ? 0 : 'auto',
                      '& .MuiTypography-root': {
                        fontWeight: 'normal',
                        color: theme => pathname.startsWith(item.path) && item.path !== '/' || pathname === item.path 
                          ? theme.palette.primary.main 
                          : 'text.primary',
                      },
                    }}
                  />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </Drawer>
      </Box>
      <Box 
        component="main" 
        sx={{ 
          flexGrow: 1, 
          width: '100%',
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          pt: { xs: '64px', md: 0 },
          bgcolor: '#f5f7ff',
        }}
      >
        {/* Desktop header */}
        <AppBar 
          position="fixed" 
          sx={{ 
            width: { md: `calc(100% - ${collapsed ? 73 : drawerWidth}px)` },
            ml: { md: `${collapsed ? 73 : drawerWidth}px` },
            bgcolor: 'white',
            boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
            transition: theme.transitions.create(['width', 'margin'], {
              easing: theme.transitions.easing.sharp,
              duration: theme.transitions.duration.leavingScreen,
            }),
            zIndex: theme.zIndex.drawer + 1,
          }}
        >
          <Toolbar>
            {/* Removed the hamburger menu icon from header */}
            <Box sx={{ flexGrow: 1 }} />
            <div>
              <IconButton
                size="large"
                aria-label="account of current user"
                aria-controls="menu-appbar"
                aria-haspopup="true"
                onClick={handleMenu}
                color="inherit"
                sx={{ color: 'text.primary' }}
              >
                <AccountCircleIcon />
              </IconButton>
              <Menu
                id="menu-appbar"
                anchorEl={anchorEl}
                anchorOrigin={{
                  vertical: 'top',
                  horizontal: 'right',
                }}
                keepMounted
                transformOrigin={{
                  vertical: 'top',
                  horizontal: 'right',
                }}
                open={open}
                onClose={handleClose}
              >
                <MenuItem onClick={handleClose}>Profile</MenuItem>
                <MenuItem onClick={handleLogout}>Logout</MenuItem>
              </Menu>
            </div>
          </Toolbar>
        </AppBar>
        
        <Box 
          sx={{ 
            flexGrow: 1, 
            p: 3,
            overflow: 'auto',
            mt: { xs: 0, md: '64px' },
            height: { xs: 'calc(100vh - 64px)', md: 'calc(100vh - 64px)' },
            boxSizing: 'border-box',
            bgcolor: '#f5f7ff',
          }}
        >
          {children}
        </Box>
      </Box>
    </Box>
  );
}
