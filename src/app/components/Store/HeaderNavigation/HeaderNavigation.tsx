'use client';

import React, { useState, useEffect } from 'react';
import {
  AppBar,
  Toolbar,
  Box,
  Typography,
  Button,
  Container,
  IconButton,
  Skeleton,
  useMediaQuery,
  Popper,
  Paper,
  ClickAwayListener,
  Grid,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  ListItemIcon,
  Avatar,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import MenuIcon from '@mui/icons-material/Menu';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { useHeaderConfig, useDivisionHierarchy, Division, Category, SimpleDivision } from '@/app/hooks/api/store/useNavigation';
import { useTranslation } from 'react-i18next';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
/**
 * HeaderNavigation component for the store
 * Displays a seamless, integrated main navigation header and a context-aware mega menu
 */
export const HeaderNavigation = (): React.ReactElement => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { t } = useTranslation();
  const pathname = usePathname();
  const tenantSlug = pathname.split('/')[1];

  // --- STATE MANAGEMENT ---
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [menuMode, setMenuMode] = useState<'division' | 'more' | null>(null);
  const [activeDivisionForMenu, setActiveDivisionForMenu] = useState<Division | null>(null);
  const appBarRef = React.useRef<HTMLElement>(null);

  // --- DATA FETCHING ---
  const { data: headerConfig, isLoading: isHeaderLoading } = useHeaderConfig();
  const { data: hierarchyData, isLoading: isHierarchyLoading } = useDivisionHierarchy();

  // --- DERIVED DATA ---
  const moreDivisions = React.useMemo(() => {
    if (!hierarchyData || !headerConfig?.divisions) return [];
    const headerDivisionNames = new Set(headerConfig.divisions.map(d => d.name));
    return hierarchyData.filter(div => !headerDivisionNames.has(div.name));
  }, [hierarchyData, headerConfig]);


  // --- EVENT HANDLERS ---
  const handleDivisionClick = (headerDivision: SimpleDivision) => {
    if (isMenuOpen && menuMode === 'division' && activeDivisionForMenu?.name === headerDivision.name) {
      handleMenuClose();
      return;
    }
    const fullDivisionData = hierarchyData?.find(d => d.name === headerDivision.name);
    if (fullDivisionData) {
      setActiveDivisionForMenu(fullDivisionData);
      setMenuMode('division');
      setIsMenuOpen(true);
      
      // If on product page, update URL with division parameter
      if (isProductPage && !window.location.pathname.includes('/product/')) {
        const url = new URL(window.location.href);
        // Clear category and subcategory parameters if they exist
        url.searchParams.delete('category');
        url.searchParams.delete('subcategory');
        // Set division parameter
        url.searchParams.set('division', fullDivisionData.id.toString());
        window.history.pushState({}, '', url.toString());
        // Trigger a custom event to notify about the URL change
        const event = new Event('popstate');
        window.dispatchEvent(event);
      }
    }
  };

  const handleMoreClick = () => {
    if (isMenuOpen && menuMode === 'more') {
      handleMenuClose();
      return;
    }
    setMenuMode('more');
    setIsMenuOpen(true);
  };

  const handleSubcategoryClick = (e: React.MouseEvent, id: string | number) => {
    if (isProductPage) {
      e.preventDefault();
      
      // Check if we're on a product detail page (has a product ID in the URL)
      const isProductDetailPage = /\/product\/[^/]+\/?$/.test(window.location.pathname);
      
      if (isProductDetailPage) {
        // On product detail page, navigate to product listing with the subcategory
        const pathSegments = window.location.pathname.split('/').filter(Boolean);
        // Remove the last segment (product ID) to get to the product listing page
        const basePath = pathSegments.slice(0, -1).join('/');
        const newUrl = `/${basePath}/?subcategory=${id.toString()}`;
        window.location.href = newUrl;
      } else {
        // On product listing page, update parameters
        const url = new URL(window.location.href);
        // Clear category parameter if it exists
        url.searchParams.delete('category');
        // Clear division parameter if it exists
        url.searchParams.delete('division');
        // Set subcategory parameter
        url.searchParams.set('subcategory', id.toString());
        window.history.pushState({}, '', url.toString());
        // Trigger a custom event to notify about the URL change
        const event = new Event('popstate');
        window.dispatchEvent(event);
      }
    }
    // Close the menu after handling the click
    handleMenuClose();
  };

  const isProductPage = pathname.includes('/store/product');

  const handleCategoryClick = (e: React.MouseEvent, id: string | number) => {
    if (isProductPage) {
      e.preventDefault();
      
      // Check if we're on a product detail page (has a product ID in the URL)
      const isProductDetailPage = /\/product\/[^/]+\/?$/.test(window.location.pathname);
      
      if (isProductDetailPage) {
        // On product detail page, navigate to product listing with the category
        const pathSegments = window.location.pathname.split('/').filter(Boolean);
        // Remove the last segment (product ID) to get to the product listing page
        const basePath = pathSegments.slice(0, -1).join('/');
        const newUrl = `/${basePath}/?category=${id.toString()}`;
        window.location.href = newUrl;
      } else {
        // On product listing page, update parameters
        const url = new URL(window.location.href);
        // Clear subcategory parameter if it exists
        url.searchParams.delete('subcategory');
        // Clear division parameter if it exists
        url.searchParams.delete('division');
        // Set category parameter
        url.searchParams.set('category', id.toString());
        window.history.pushState({}, '', url.toString());
        // Trigger a custom event to notify about the URL change
        const event = new Event('popstate');
        window.dispatchEvent(event);
      }
    }
    // If not on product page, the default Link behavior will handle the navigation
  };

  const handleMenuClose = () => {
    setIsMenuOpen(false);
    setMenuMode(null);
    setActiveDivisionForMenu(null);
  };

  // --- RENDER COMPONENTS ---
  const MegaMenu = () => {
    const DEFAULT_IMAGE_URL = 'https://placehold.co/32x32/F5F5F5/E0E0E0?text=%20';
    const [hoveredDivision, setHoveredDivision] = useState<Division | null>(null);
    const [hoveredCategory, setHoveredCategory] = useState<Category | null>(null);

    useEffect(() => {
      if (!isMenuOpen) return;
      if (menuMode === 'division' && activeDivisionForMenu) {
        setHoveredDivision(activeDivisionForMenu);
        setHoveredCategory(activeDivisionForMenu.categories?.[0] || null);
      } else if (menuMode === 'more' && moreDivisions.length > 0) {
        const defaultDivision = moreDivisions[0];
        setHoveredDivision(defaultDivision);
        setHoveredCategory(defaultDivision.categories?.[0] || null);
      }
    }, [isMenuOpen, menuMode, activeDivisionForMenu, moreDivisions]);
    
    const EmptyState = ({ message }: { message: string }) => (
       <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', p: 2, width: '100%' }}>
            <Typography variant="body2" color="text.secondary">{message}</Typography>
       </Box>
    );

    const renderTwoColumnLayout = (division: Division) => {
        if (!division.categories || division.categories.length === 0) {
            return <EmptyState message={`No categories available for ${division.name}.`} />;
        }

        return (
            <Grid container sx={{ backgroundColor:'grey.100',width:'100%' }} >
                <Grid  size={{xs:12,md:6}} sx={{ borderRight: `1px solid ${theme.palette.divider}` }}>
                <List component="nav" dense>
                    {division.categories.map((cat) => (
                    <ListItem key={cat.id} disablePadding>
                        <ListItemButton 
                            component={Link} 
                            href={`/${tenantSlug}/store/product?category=${cat.id}`} 
                            onClick={(e) => {
                                handleCategoryClick(e, cat.id);
                                handleMenuClose();
                            }} 
                            onMouseEnter={() => setHoveredCategory(cat)} 
                            selected={hoveredCategory?.id === cat.id}
                        >
                            <ListItemIcon sx={{ minWidth: 40 }}><Avatar variant="square" src={cat.image || DEFAULT_IMAGE_URL} alt={cat.image_alt_text || cat.name} sx={{ width: 32, height: 32 }} /></ListItemIcon>
                            <ListItemText primary={cat.name} />
                            {cat.subcategories?.length > 0 && <ChevronRightIcon fontSize="small" />}
                        </ListItemButton>
                    </ListItem>
                    ))}
                </List>
                </Grid>
                <Grid size={{xs:12,md:6}}>
                <List component="nav" dense>
                    {hoveredCategory?.subcategories && hoveredCategory.subcategories.length > 0 ? (
                        hoveredCategory.subcategories.map((sub) => (
                            <ListItem key={sub.id} disablePadding>
                                <ListItemButton component={Link} href={`/${tenantSlug}/store/product?subcategory=${sub.id}`} onClick={(e) => handleSubcategoryClick(e, sub.id)}>
                                <ListItemIcon sx={{ minWidth: 40 }}><Avatar variant="square" src={sub.image || DEFAULT_IMAGE_URL} alt={sub.image_alt_text || sub.name} sx={{ width: 32, height: 32 }} /></ListItemIcon>
                                <ListItemText primary={sub.name} />
                                </ListItemButton>
                            </ListItem>
                        ))
                    ) : ( <EmptyState message="No subcategories" /> )}
                </List>
                </Grid>
            </Grid>
        );
    }

    const renderThreeColumnLayout = () => (
      <Grid container sx={{ backgroundColor:'grey.100',width:'100%' }}>
        <Grid size={{xs:4,md:4}} sx={{ borderRight: `1px solid ${theme.palette.divider}` }}>
          <List component="nav" dense>
            {moreDivisions.map((div) => (
              <ListItem key={div.id} disablePadding>
                <ListItemButton component={Link} href={`/${tenantSlug}/store/product?division=${div.id}`} onClick={handleMenuClose} onMouseEnter={() => { setHoveredDivision(div); setHoveredCategory(div.categories?.[0] || null); }} selected={hoveredDivision?.id === div.id}>
                  <ListItemIcon sx={{ minWidth: 40 }}><Avatar variant="square" src={div.image || DEFAULT_IMAGE_URL} alt={div.image_alt_text || div.name} sx={{ width: 32, height: 32 }} /></ListItemIcon>
                  <ListItemText primary={div.name} />
                  <ChevronRightIcon fontSize="small" />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </Grid>
        <Grid size={{xs:4,md:4}} sx={{ borderRight: `1px solid ${theme.palette.divider}` }}>
          <List component="nav" dense>
            {hoveredDivision?.categories && hoveredDivision.categories.length > 0 ? (
                hoveredDivision.categories.map((cat) => (
                    <ListItem key={cat.id} disablePadding>
                        <ListItemButton 
                            component={Link} 
                            href={`/${tenantSlug}/store/product?category=${cat.id}`} 
                            onClick={(e) => {
                                handleCategoryClick(e, cat.id);
                                handleMenuClose();
                            }} 
                            onMouseEnter={() => setHoveredCategory(cat)} 
                            selected={hoveredCategory?.id === cat.id}
                        >
                        <ListItemIcon sx={{ minWidth: 40 }}><Avatar variant="square" src={cat.image || DEFAULT_IMAGE_URL} alt={cat.image_alt_text || cat.name} sx={{ width: 32, height: 32 }} /></ListItemIcon>
                        <ListItemText primary={cat.name} />
                        {cat.subcategories?.length > 0 && <ChevronRightIcon fontSize="small" />}
                        </ListItemButton>
                    </ListItem>
                ))
            ) : ( <EmptyState message="No categories" /> )}
          </List>
        </Grid>
        <Grid size={{xs:4,md:4}}>
          <List component="nav" dense>
            {hoveredCategory?.subcategories && hoveredCategory.subcategories.length > 0 ? (
                hoveredCategory.subcategories.map((sub) => (
                    <ListItem key={sub.id} disablePadding>
                        <ListItemButton component={Link} href={`/${tenantSlug}/store/product?subcategory=${sub.id}`} onClick={(e) => handleSubcategoryClick(e, sub.id)}>
                        <ListItemIcon sx={{ minWidth: 40 }}><Avatar variant="square" src={sub.image || DEFAULT_IMAGE_URL} alt={sub.image_alt_text || sub.name} sx={{ width: 32, height: 32 }} /></ListItemIcon>
                        <ListItemText primary={sub.name} />
                        </ListItemButton>
                    </ListItem>
                ))
            ) : ( <EmptyState message="No subcategories" /> )}
          </List>
        </Grid>
      </Grid>
    );

    return (
      <Popper open={isMenuOpen} anchorEl={appBarRef.current} placement="bottom" sx={{ zIndex: theme.zIndex.modal, width: '100%', left: 0, right: 0 }}>
        <Paper elevation={0} square>
          <ClickAwayListener onClickAway={handleMenuClose}>
            <Box maxWidth="xl" sx={{ py: 2, minHeight: '40vh', display: 'flex', alignItems: 'stretch' }}>
              {(isHierarchyLoading || isHeaderLoading) ? <Typography sx={{ p: 2, width: '100%', textAlign: 'center' }}>Loading Navigation...</Typography> : (
                (menuMode === 'division' && activeDivisionForMenu) ? renderTwoColumnLayout(activeDivisionForMenu) :
                (menuMode === 'more' && moreDivisions.length > 0) ? renderThreeColumnLayout() : null
              )}
            </Box>
          </ClickAwayListener>
        </Paper>
      </Popper>
    );
  };

  const HeaderSkeleton = () => (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
      {[...Array(5)].map((_, i) => <Skeleton key={i} variant="text" width={120} height={40} />)}
    </Box>
  )

  return (
    <>
      <AppBar ref={appBarRef} position="static" color="default" square elevation={isMenuOpen ? 0 : 2} sx={{ backgroundColor: theme.palette.background.paper, transition: theme.transitions.create(['box-shadow']) }}>
        <Container maxWidth="xl">
          <Toolbar sx={{minHeight: { xs: 30, sm: 56 }}}>
            {!isMobile && (
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexGrow: 1, px: theme.spacing(1) }}>
                {(isHeaderLoading) ? <HeaderSkeleton /> : (
                  <>
                    {headerConfig?.divisions.map((division) => (
                      <Button 
                        key={division.id} 
                        onClick={() => handleDivisionClick(division)} 
                        sx={{ 
                          textTransform: 'none', 
                          fontSize: theme.typography.body2.fontSize, 
                          mx: theme.spacing(1), 
                          // UPDATED: Change text color when active
                          color: isMenuOpen && menuMode === 'division' && activeDivisionForMenu?.name === division.name ? 'primary.main' : 'text.primary'
                        }}
                      >
                        {division.name}
                      </Button>
                    ))}
                    {moreDivisions.length > 0 && (
                      <Button 
                        onClick={handleMoreClick} 
                        endIcon={<KeyboardArrowDownIcon />}
                        sx={{ 
                          textTransform: 'none', 
                          fontSize: theme.typography.body2.fontSize, 
                          mx: theme.spacing(1),
                          // UPDATED: Change text color when active
                          color: isMenuOpen && menuMode === 'more' ? 'primary.main' : 'text.primary'
                        }}
                      >
                        More 
                      </Button>
                    )}
                  </>
                )}
              </Box>
            )}
             {isMobile && <IconButton size="large" edge="start" color="inherit" aria-label="menu" sx={{ ml: theme.spacing(2) }}><MenuIcon /></IconButton>}
          </Toolbar>
        </Container>
      </AppBar>
      {!isMobile && <MegaMenu />}
    </>
  );
};