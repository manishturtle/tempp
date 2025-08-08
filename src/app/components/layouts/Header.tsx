"use client";

import React from "react";
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  IconButton,
  Box,
  Container,
  Badge,
  Menu,
  MenuItem,
  Divider,
  Avatar,
  useMediaQuery,
  SxProps,
  Theme,
  Tooltip,
  Autocomplete,
  TextField,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
  Popover,
} from "@mui/material";
import Image from "next/image";
import {
  ShoppingCart,
  ShoppingCartOutlined,
  Person,
  PersonOutline,
  Menu as MenuIcon,
  Search,
  Favorite,
  AccountCircle,
  KeyboardArrowDown,
  StorefrontOutlined,
  ReceiptOutlined,
} from "@mui/icons-material";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { useThemeContext } from "@/app/theme/ThemeContext";
import { useState, useEffect, useRef } from "react";
import { useAuthRefresh } from "@/app/contexts/AuthRefreshContext";
import { useCart } from "@/app/hooks/api/store/useCart";
import { useWishlist } from "@/app/hooks/api/store/useWishlist";
import { useProductSearch } from "@/app/hooks/api/admin/useProductSearch";
import { useSearch } from "@/app/contexts/SearchContext";
import { Search as SearchIcon } from "@mui/icons-material";
import { useSearchParams, usePathname } from "next/navigation";
import { DeliverToPopup } from "./DeliveryToPopup";
import { Login } from "@mui/icons-material";

import { COCKPIT_API_BASE_URL, COCKPIT_FRONTEND_URL } from "@/utils/constants";

export function Header() {
  const { t } = useTranslation("common");
  const { mode } = useThemeContext();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [userInitials, setUserInitials] = useState<string>("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  // Use MUI's useMediaQuery with a direct media query for mobile detection
  const isMobile = useMediaQuery("(max-width:600px)");
  const { searchQuery, setSearchQuery, handleSearch } = useSearch();
  const [searchOpen, setSearchOpen] = useState(false);
  const searchParams = useSearchParams();

  // Check if current URL is ending with store, store/, cart, or cart/
  const [showHamburgerMenu, setShowHamburgerMenu] = useState(true);
  const pathname = usePathname();
  const shouldHideLocation =
    pathname?.includes("cart") ||
    pathname?.includes("checkout") ||
    pathname?.match(/\/product\/[^/]+\/?$/);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const path = window.location.pathname;
      // Check if path ends with /store, /store/, /cart, or /cart/ regardless of tenant prefix
      const isExcludedPath =
        path.match(/\/(store|store\/|cart|cart\/)$/) !== null;
      setShowHamburgerMenu(!isExcludedPath);
    }
  }, []);

  // Check for access token in localStorage
  const [hasAccessToken, setHasAccessToken] = useState(false);
  const [tenantSlug, setTenantSlug] = useState("");
  interface UserLocation {
    pincode?: string;
    country?: string;
    countryCode?: string;
    address?: string;
  }

  const [location, setLocation] = React.useState<UserLocation | null>(null);
  
  // Delivery popup state
  const [deliveryPopupAnchor, setDeliveryPopupAnchor] = useState<HTMLElement | null>(null);
  const [isDeliveryPopupOpen, setIsDeliveryPopupOpen] = useState(false);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isHoveringRef = useRef(false);
  const [user, setUser] = useState<{
    first_name?: string;
    last_name?: string;
    email?: string;
  } | null>(null);
  const { refreshTrigger } = useAuthRefresh(); // Get the refresh trigger from context

  // Search functionality
  const {
    searchResults = [],
    isLoading: isSearchLoading,
    setSearchTerm,
  } = useProductSearch(tenantSlug, searchQuery);

  useEffect(() => {
    if (searchQuery) {
      console.log("Searching for:", searchQuery);
      setSearchTerm(searchQuery);
    }
  }, [searchQuery, setSearchTerm]);

  // Initialize search from URL params if available
  useEffect(() => {
    const urlSearchQuery = searchParams.get("search");
    if (urlSearchQuery) {
      setSearchQuery(urlSearchQuery);
    }
  }, [searchParams, setSearchQuery]);

  // Function to call session API and store user data
  const fetchSessionData = async (tenantSlug: string, sessionId: string) => {
    try {
      const response = await fetch(
        `${COCKPIT_API_BASE_URL}/${tenantSlug}/auth/session/?session_id=${sessionId}`, //cockpit api
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        
        // Store data in localStorage with tenant prefix
        if (data.access_token) {
          localStorage.setItem(`${tenantSlug}_access_token`, data.access_token);
        }
        if (data.refresh_token) {
          localStorage.setItem(`${tenantSlug}_refresh_token`, data.refresh_token);
        }
        if (data.user) {
          localStorage.setItem(`${tenantSlug}_auth_user`, JSON.stringify(data.user));
        }
        
        // Also store additional tenant-specific data
        localStorage.setItem(`${tenantSlug}_appLanguage`, 'en');
        localStorage.setItem(`${tenantSlug}_app_id`, '5');
        
        // Update component state
        setHasAccessToken(!!data.access_token);
        setUser(data.user);
        
        if (data.user) {
          const firstInitial = data.user.first_name
            ? data.user.first_name.charAt(0).toUpperCase()
            : "";
          const lastInitial = data.user.last_name
            ? data.user.last_name.charAt(0).toUpperCase()
            : "";
          setUserInitials(`${firstInitial}${lastInitial}`);
        }
        
        console.log('Session data stored successfully');
      } else {
        console.error('Failed to fetch session data:', response.statusText);
      }
    } catch (error) {
      console.error('Error fetching session data:', error);
    }
  };

  useEffect(() => {
    // Get tenant slug from URL first
    let tenantSlug = "";
    if (typeof window !== "undefined") {
      const pathParts = window.location.pathname.split("/").filter(Boolean);
      tenantSlug = pathParts[0] || "";
      setTenantSlug(tenantSlug);

      // Check if we have a session_id in URL params
      const urlParams = new URLSearchParams(window.location.search);
      const sessionId = urlParams.get('session_id');
      
      // If we have a session_id, fetch session data
      if (sessionId && tenantSlug) {
        fetchSessionData(tenantSlug, sessionId);
        return; // Exit early as fetchSessionData will handle state updates
      }

      // Get token with tenant prefix
      const token = tenantSlug
        ? localStorage.getItem(`${tenantSlug}_access_token`)
        : null;
      setHasAccessToken(!!token);

      // Get user data for avatar
      if (tenantSlug) {
        const userData = localStorage.getItem(`${tenantSlug}_auth_user`);
        if (userData) {
          try {
            const userDataObj = JSON.parse(userData);
            setUser(userDataObj);
            const firstInitial = userDataObj.first_name
              ? userDataObj.first_name.charAt(0).toUpperCase()
              : "";
            const lastInitial = userDataObj.last_name
              ? userDataObj.last_name.charAt(0).toUpperCase()
              : "";
            setUserInitials(`${firstInitial}${lastInitial}`);
          } catch (e) {
            console.error("Error parsing user data:", e);
          }
        }
      }
    }
  }, [refreshTrigger]); // Re-run this effect when the refreshTrigger changes

  // Get cart data to show the count
  const { cart } = useCart();

  // Get wishlist data to show the count
  const { wishlist } = useWishlist(hasAccessToken);

  const handleProfileMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const clearTenantData = (slug: string) => {
    if (typeof window === "undefined") return;

    // Clear tenant-specific data from localStorage
    const tenantPrefix = slug.toLowerCase();
    const localStorageKeys = Object.keys(localStorage);

    // Clear all keys that start with the tenant prefix
    localStorageKeys.forEach((key) => {
      if (key.toLowerCase().startsWith(`${tenantPrefix}_`)) {
        localStorage.removeItem(key);
      }
    });

    // Clear auth tokens (they're already prefixed with tenant slug in authService)
    localStorage.removeItem(`${tenantPrefix}_access_token`);
    localStorage.removeItem(`${tenantPrefix}_refresh_token`);

    // Clear session storage for this tenant
    const sessionStorageKeys = Object.keys(sessionStorage);
    sessionStorageKeys.forEach((key) => {
      if (key.toLowerCase().startsWith(`${tenantPrefix}_`)) {
        sessionStorage.removeItem(key);
      }
    });


    // Clear global auth tokens as fallback
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
  };

  const handleLogout = () => {
    if (typeof window !== "undefined") {
      // Clear only the current tenant's data
      if (tenantSlug) {
        clearTenantData(tenantSlug);
      } else {
        // Fallback: clear all auth-related data if tenantSlug is not available
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        sessionStorage.clear();
      }
    }

    // Close the menu
    handleMenuClose();

    // Navigate to tenant's store page
    if (tenantSlug) {
      window.location.href = `/${tenantSlug}/store/`;
    } else {
      // Fallback to home page if tenantSlug is not available
      window.location.href = "/";
    }
  };

  const handleMobileMenuToggle = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  const menuId = "primary-account-menu";
  // Only render menu when user is authenticated
  // Format user name with proper handling of potentially long names
  const formatUserName = () => {
    const firstName = user?.first_name || "";
    const lastName = user?.last_name || "";
    const fullName = `${firstName} ${lastName}`.trim();

    if (!fullName) return "Guest";

    // Truncate very long names (e.g., more than 20 characters)
    return fullName.length > 20 ? `${fullName.substring(0, 20)}...` : fullName;
  };

  // Format email with proper truncation
  const formatEmail = (email: string) => {
    if (!email) return "";
    // Truncate email if too long (e.g., more than 25 characters)
    return email.length > 25 ? `${email.substring(0, 25)}...` : email;
  };

  const renderMenu = hasAccessToken ? (
    <Menu
      anchorEl={anchorEl}
      id={menuId}
      keepMounted
      open={Boolean(anchorEl)}
      onClose={handleMenuClose}
      PaperProps={{
        elevation: 3,
        sx: {
          minWidth: 240,
          borderRadius: 1,
          mt: 1,
          p: 0,
          overflow: "hidden",
        },
      }}
      transformOrigin={{ horizontal: "right", vertical: "top" }}
      anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
    >
      {/* User Info Section with Primary Color */}
      <Box
        sx={{
          p: 1,
          borderBottom: "1px solid theme.palette.divider",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center" }}>
          <Avatar
            sx={{
              width: 40,
              height: 40,
              mr: 1.5,
              bgcolor: "primary.light",
              color: "primary.contrastText",
              fontSize: "1rem",
              fontWeight: 500,
              flexShrink: 0,
            }}
          >
            {user?.first_name || user?.last_name ? (
              `${user.first_name?.charAt(0) || ""}${
                user.last_name?.charAt(0) || ""
              }`.toUpperCase()
            ) : (
              <Person />
            )}
          </Avatar>
          <Box sx={{ minWidth: 0 }}>
            {" "}
            {/* This enables text truncation */}
            <Typography
              variant="subtitle1"
              fontWeight="medium"
              noWrap
              title={
                user?.first_name || user?.last_name
                  ? `${user.first_name || ""} ${user.last_name || ""}`.trim()
                  : ""
              }
            >
              {formatUserName()}
            </Typography>
            {user?.email && (
              <Typography
                variant="body2"
                sx={{
                  opacity: 0.9,
                  fontSize: "0.75rem",
                }}
                noWrap
                title={user.email}
              >
                {formatEmail(user.email)}
              </Typography>
            )}
          </Box>
        </Box>
      </Box>

      <MenuItem
        key="addresses"
        component={Link}
        href={`/${tenantSlug}/store/account/addresses`}
        onClick={handleMenuClose}
      >
        {t("account.addresses")}
      </MenuItem>
      <MenuItem
        key="orders"
        component={Link}
        href={`/${tenantSlug}/store/account/orders`}
        onClick={handleMenuClose}
      >
        {t("account.orders")}
      </MenuItem>
      <MenuItem
        key="wishlist"
        component={Link}
        href={`/${tenantSlug}/store/account/wishlist`}
        onClick={handleMenuClose}
      >
        {t("wishlist.title")}
      </MenuItem>
      <MenuItem key="logout" onClick={handleLogout}>
        {t("account.logout")}
      </MenuItem>
    </Menu>
  ) : null;

  return (
    <AppBar
      position="fixed"
      color="default"
      elevation={0}
      sx={{
        zIndex: (theme) => theme.zIndex.drawer + 1,
        backgroundColor: (theme) =>
          theme.palette.mode === "light"
            ? theme.palette.common.white
            : theme.palette.background.default,
        backdropFilter: "blur(8px)",
        // borderBottom: (theme) => `1px solid ${theme.palette.divider}`,
        // boxShadow: (theme) => theme.shadows[3],
      }}
    >
      <Container maxWidth="xl">
        <Toolbar
          disableGutters
          sx={{
            display: "flex",
            flexWrap: "wrap", // Allow items to wrap on mobile
            alignItems: "center",
            minHeight: { xs: 64, sm: 72 },
            px: { xs: 1, sm: 2 }, // Add some padding
          }}
        >
          {/* --- Main Header Row - Hide on mobile --- */}
          {!isMobile && (
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                width: "100%",
                justifyContent: "space-between",
              }}
            >
              {/* LEFT SECTION */}
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  flex: 1,
                  justifyContent: "flex-start",
                }}
              >
                <Box
                  component={Link}
                  href={`/${tenantSlug}/store/`}
                  sx={{
                    textDecoration: "none",
                    color: "inherit",
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  {(() => {
                    // Helper function to try getting item from localStorage with retries
                    const getItemWithRetry = (
                      keys: string[],
                      maxRetries: number
                    ): string | null => {
                      if (typeof window === "undefined") return null;

                      let retries = 0;
                      let result = null;

                      while (retries < maxRetries) {
                        // Try each key in order until we find a value
                        for (const key of keys) {
                          result = localStorage.getItem(key);
                          if (result) return result;
                        }
                        retries++;
                      }

                      return null;
                    };

                    try {
                      // Try to get logos with retries, checking both tenant-prefixed and non-prefixed keys
                      const tenantPrefix = tenantSlug ? `${tenantSlug}_` : "";

                      // Try tenant-prefixed keys first, then fall back to non-prefixed
                      const logoDark = getItemWithRetry(
                        [`${tenantPrefix}logoDark`, "logoDark"],
                        3
                      );
                      const logoLight = getItemWithRetry(
                        [`${tenantPrefix}logoLight`, "logoLight"],
                        3
                      );
                      const legacyLogo = getItemWithRetry(
                        [`${tenantPrefix}logo`, "logo"],
                        3
                      );

                      // Get brand name with tenant prefix fallback
                      const brandName =
                        localStorage.getItem(`${tenantPrefix}brandName`) ||
                        localStorage.getItem("brandName") ||
                        "";

                      // Determine logo source
                      let logoSrc = "";

                      // Use dark logo only when mode is explicitly dark
                      if (mode === "dark" && logoDark) {
                        logoSrc = logoDark;
                      } else if (logoLight) {
                        // Otherwise use light logo
                        logoSrc = logoLight;
                      } else if (legacyLogo) {
                        // Fall back to legacy logo if available
                        logoSrc = `${
                          process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ||
                          "http://localhost:3000/"
                        }${legacyLogo}`;
                      } else {
                        // Return empty box if no logo is available
                        return <Box sx={{ width: 160, height: 60 }} />;
                      }

                      return (
                        <Image
                          src={logoSrc}
                          alt={brandName}
                          width={160} // Slightly smaller for better balance
                          height={50}
                          priority
                          style={{
                            objectFit: "contain",
                            height: "auto", // Maintain aspect ratio
                            maxHeight: "50px", // Control max height
                          }}
                        />
                      );
                    } catch (error) {
                      console.error("Error loading logo:", error);
                      // Return empty box instead of fallback logo
                      return <Box sx={{ width: 160, height: 60 }} />;
                    }
                  })()}
                </Box>
              </Box>

              <Box
                sx={{
                  flex: { sm: 1.5, md: 2, lg: 2.5 }, // Let it grow but be balanced
                  display: "flex",
                  justifyContent: "center",
                  px: 2,
                  mt: 2,
                }}
              >
                {/* Search Component remains the same */}
                <Autocomplete
                  freeSolo
                  disableClearable
                  fullWidth
                  options={searchResults}
                  loading={isSearchLoading}
                  onOpen={() => setSearchOpen(true)}
                  onClose={() => setSearchOpen(false)}
                  inputValue={searchQuery}
                  onInputChange={(event, newValue) => {
                    setSearchQuery(newValue);
                    if (newValue) {
                      setSearchTerm(newValue);
                    }
                  }}
                  onChange={(event, value) => {
                    if (value && typeof value !== "string") {
                      if (value.sku) {
                        const productDetailUrl = `/${tenantSlug}/store/product/${value.sku}`;
                        window.location.href = productDetailUrl;
                      }
                    }
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && searchQuery) {
                      event.preventDefault();
                      handleSearch(searchQuery);
                    }
                  }}
                  getOptionLabel={(option) =>
                    typeof option === "string" ? option : option.name
                  }
                  renderOption={(props, option) => {
                    const { key, ...otherProps } = props as {
                      key: React.Key;
                    };
                    return (
                      <li {...otherProps} key={key}>
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            py: 1,
                            width: "100%",
                          }}
                        >
                          {option.thumbnail && (
                            <Image
                              src={option.thumbnail}
                              alt={option.name}
                              width={40}
                              height={40}
                              style={{
                                marginRight: 12,
                                objectFit: "contain",
                                borderRadius: 1,
                              }}
                            />
                          )}
                          <Box>
                            <Typography variant="body2" noWrap>
                              {option.name}
                            </Typography>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              {option.sku} • {option.display_price}
                            </Typography>
                          </Box>
                        </Box>
                      </li>
                    );
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      size="small"
                      placeholder={t(
                        "products.placeholder",
                        "Search products..."
                      )}
                      InputProps={{
                        ...params.InputProps,
                        type: "search",
                        startAdornment: (
                          <SearchIcon
                            fontSize="small"
                            color="action"
                            sx={{
                              mr: 1,
                              color: searchOpen
                                ? "primary.main"
                                : "action.active",
                            }}
                          />
                        ),
                      }}
                    />
                  )}
                />
              </Box>

              {/* RIGHT SECTION */}
              <Box
                sx={{
                  display: "flex",
                  flex: 1,
                  alignItems: "center",
                  justifyContent: "flex-end",
                }}
              >
                {!shouldHideLocation && (
                  <Box
                    onMouseEnter={(event) => {
                      isHoveringRef.current = true;
                      if (hoverTimeoutRef.current) {
                        clearTimeout(hoverTimeoutRef.current);
                        hoverTimeoutRef.current = null;
                      }
                      if (!isDeliveryPopupOpen) {
                        setDeliveryPopupAnchor(event.currentTarget);
                        setIsDeliveryPopupOpen(true);
                      }
                    }}
                    // Removed onMouseLeave logic to make popup modal-like (stays open until Cancel/Save). See NFR: location popup should only close on explicit user action.
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      mr: 2,
                      cursor: "pointer",
                      bgcolor: "background.paper",
                      borderRadius: 1,
                      px: 1,
                      py: 0.5,
                    }}
                  >
                    {(() => {
                      let displayLoc: any = {};
                      if (typeof window !== "undefined" && tenantSlug) {
                        const locRaw = localStorage.getItem(`${tenantSlug}_location`);
                        if (locRaw) {
                          try {
                            displayLoc = JSON.parse(locRaw);
                          } catch {}
                        }
                      }
                      const countryCode = displayLoc?.country || "";
                      return countryCode ? (
                        <img
                          loading="lazy"
                          width={20}
                          srcSet={`https://flagcdn.com/w40/${countryCode.toLowerCase()}.png 2x`}
                          src={`https://flagcdn.com/w20/${countryCode.toLowerCase()}.png`}
                          alt={countryCode}
                          style={{ marginRight: 6 }}
                        />
                      ) : (
                        <span style={{ fontSize: 18, marginRight: 6 }}>📍</span>
                      );
                    })()}
                    <Box>
                      <Typography
                        variant="caption"
                        sx={{
                          color: "text.secondary",
                          lineHeight: 1,
                          fontWeight: 500,
                        }}
                      >
                        Deliver to:
                      </Typography>
                      <Typography
                        variant="subtitle2"
                        sx={{
                          fontWeight: 700,
                          color: "text.primary",
                          lineHeight: 1,
                        }}
                      >
                        {(() => {
                          let displayLoc: any = {};
                          if (typeof window !== "undefined" && tenantSlug) {
                            const locRaw = localStorage.getItem(
                              `${tenantSlug}_location`
                            );
                            if (locRaw) {
                              try {
                                displayLoc = JSON.parse(locRaw);
                              } catch {}
                            }
                          }
                          if (displayLoc?.pincode && displayLoc?.country) {
                            return `${displayLoc.pincode}, ${displayLoc.country}`;
                          }
                          if (displayLoc?.pincode) {
                            return displayLoc.pincode;
                          }
                          if (displayLoc?.country) {
                            return displayLoc.country;
                          }
                          return "Pincode";
                        })()}
                      </Typography>
                    </Box>
                  </Box>
                )}
                {hasAccessToken && (
                  <Tooltip title={t("wishlist.title")}>
                    <IconButton
                      sx={{
                        color: "primary.main",
                        backgroundColor: "theme.palette.background.default",
                      }}
                      component={Link}
                      href={`/${tenantSlug}/store/account/wishlist`}
                    >
                      <Badge badgeContent={wishlist?.count || 0} color="error">
                        <Favorite />
                      </Badge>
                    </IconButton>
                  </Tooltip>
                )}

                <Tooltip title={t("store.cart.title")}>
                  <IconButton
                    sx={{
                      color: "primary.main",
                      backgroundColor: "theme.palette.background.default",
                    }}
                    component={Link}
                    href={`/${tenantSlug}/store/cart`}
                  >
                    <Badge
                      badgeContent={cart?.items?.length || 0}
                      color="error"
                    >
                      <ShoppingCart />
                    </Badge>
                  </IconButton>
                </Tooltip>

                {hasAccessToken ? (
                  <Tooltip title={t("account.profile")}>
                    <IconButton
                      edge="end"
                      onClick={handleProfileMenuOpen}
                      sx={{
                        color: "primary.contrastText",
                        width: 50,
                        height: 50,
                        fontSize: "0.875rem",
                        fontWeight: 500,
                      }}
                    >
                      {user?.first_name || user?.last_name ? (
                        <Avatar
                          sx={{
                            width: 40,
                            height: 40,
                            bgcolor: "primary.main",
                            color: "primary.contrastText",
                            fontSize: "1rem",
                            fontWeight: 500,
                          }}
                        >
                          {`${user?.first_name?.charAt(0) || ""}${
                            user?.last_name?.charAt(0) || ""
                          }`.toUpperCase()}
                        </Avatar>
                      ) : (
                        <Avatar
                          sx={{
                            bgcolor: "primary.main",
                            width: 32,
                            height: 32,
                          }}
                        >
                          <Person sx={{ fontSize: 20 }} />
                        </Avatar>
                      )}
                    </IconButton>
                  </Tooltip>
                ) : (
                  <Button
                    variant="contained"
                    color="primary"
                    component={Link}

                    href={`${COCKPIT_FRONTEND_URL}/${tenantSlug}/auth/login?source=ecommerce`}
                    sx={{
                      ml: 2,
                      borderColor: "rgba(255, 255, 255, 0.5)",
                    }}
                  >
                    {t("auth.login")}
                  </Button>
                )}
              </Box>
            </Box>
          )}

          {isMobile && (
            <>
              <Box
                sx={{ width: "100%", display: "flex", alignItems: "center" }}
              >
                {showHamburgerMenu && (
                  <IconButton
                    size="large"
                    edge="start"
                    color="inherit"
                    aria-label="menu"
                    onClick={handleMobileMenuToggle}
                    sx={{ mr: 1 }}
                  >
                    <MenuIcon />
                  </IconButton>
                )}
                {/* The same Autocomplete component, now just rendered here on mobile */}
                <Autocomplete
                  freeSolo
                  disableClearable
                  fullWidth
                  options={searchResults}
                  loading={isSearchLoading}
                  onOpen={() => setSearchOpen(true)}
                  onClose={() => setSearchOpen(false)}
                  inputValue={searchQuery}
                  onInputChange={(event, newValue) => {
                    setSearchQuery(newValue);
                    if (newValue) {
                      setSearchTerm(newValue);
                    }
                  }}
                  onChange={(event, value) => {
                    if (value && typeof value !== "string") {
                      if (value.sku) {
                        const productDetailUrl = `/${tenantSlug}/store/product/${value.sku}`;
                        window.location.href = productDetailUrl;
                      }
                    }
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && searchQuery) {
                      event.preventDefault();
                      handleSearch(searchQuery);
                    }
                  }}
                  getOptionLabel={(option) =>
                    typeof option === "string" ? option : option.name
                  }
                  renderOption={(props, option) => {
                    const { key, ...otherProps } = props as { key: React.Key };
                    return (
                      <li {...otherProps} key={key}>
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            py: 1,
                            width: "100%",
                          }}
                        >
                          {option.thumbnail && (
                            <Image
                              src={option.thumbnail}
                              alt={option.name}
                              width={40}
                              height={40}
                              style={{
                                marginRight: 12,
                                objectFit: "contain",
                                borderRadius: 1,
                              }}
                            />
                          )}
                          <Box>
                            <Typography variant="body2" noWrap>
                              {option.name}
                            </Typography>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              {option.sku} • {option.display_price}
                            </Typography>
                          </Box>
                        </Box>
                      </li>
                    );
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      size="small"
                      placeholder={t(
                        "products.placeholder",
                        "Search products..."
                      )}
                      sx={{ mb: "0px !important" }}
                      InputProps={{
                        ...params.InputProps,
                        type: "search",
                        sx: {
                          borderRadius: "1.25rem",
                          "& fieldset": {
                            borderRadius: "1.25rem",
                          },
                        },
                        startAdornment: (
                          <SearchIcon
                            fontSize="small"
                            color="action"
                            sx={{
                              mr: 1,
                              color: searchOpen
                                ? "primary.main"
                                : "action.active",
                            }}
                          />
                        ),
                      }}
                    />
                  )}
                />
              </Box>
              {/* Mobile Side Drawer */}
              <Drawer
                anchor="left"
                open={isMobile && mobileMenuOpen}
                onClose={handleMobileMenuToggle}
                sx={{
                  "& .MuiDrawer-paper": {
                    width: 240,
                    boxSizing: "border-box",
                    mt: "50px",
                  },
                }}
              >
                <Box
                  sx={{
                    width: 240,
                    pt: 2,
                    pb: 2,
                  }}
                  role="presentation"
                  onClick={handleMobileMenuToggle}
                >
                  <List>
                    <ListItem>
                      <Link
                        href={`/${tenantSlug}/store/`}
                        style={{
                          textDecoration: "none",
                          display: "flex",
                          width: "100%",
                          color: "inherit",
                        }}
                      >
                        <ListItemIcon sx={{ minWidth: 40 }}>
                          <StorefrontOutlined />
                        </ListItemIcon>
                        <ListItemText
                          primary={t("navigation.store", "Store")}
                          sx={{ mt: 0 }}
                        />
                      </Link>
                    </ListItem>
                    <ListItem>
                      <Link
                        href={`/${tenantSlug}/store/account`}
                        style={{
                          textDecoration: "none",
                          display: "flex",
                          width: "100%",
                          color: "inherit",
                        }}
                      >
                        <ListItemIcon sx={{ minWidth: 40 }}>
                          <PersonOutline />
                        </ListItemIcon>
                        <ListItemText
                          primary={t("navigation.account", "Account")}
                          sx={{ mt: 0 }}
                        />
                      </Link>
                    </ListItem>
                    <ListItem>
                      <Link
                        href={`/${tenantSlug}/store/cart`}
                        style={{
                          textDecoration: "none",
                          display: "flex",
                          width: "100%",
                          color: "inherit",
                        }}
                      >
                        <ListItemIcon sx={{ minWidth: 40 }}>
                          <ShoppingCartOutlined />
                        </ListItemIcon>
                        <ListItemText
                          primary={t("navigation.cart", "My Cart")}
                          sx={{ mt: 0 }}
                        />
                      </Link>
                      {cart && cart?.items?.length > 0 && (
                        <Chip label={cart?.items?.length || 0} sx={{ mt: 0 }} />
                      )}
                    </ListItem>
                    <ListItem>
                      <Link
                        href={`/${tenantSlug}/store/account/orders`}
                        style={{
                          textDecoration: "none",
                          display: "flex",
                          width: "100%",
                          color: "inherit",
                        }}
                      >
                        <ListItemIcon sx={{ minWidth: 40 }}>
                          <ReceiptOutlined />
                        </ListItemIcon>
                        <ListItemText
                          primary={t("navigation.orders", "My Orders")}
                          sx={{ mt: 0 }}
                        />
                      </Link>
                    </ListItem>
                  </List>
                </Box>
              </Drawer>
            </>
          )}
        </Toolbar>
      </Container>
      {renderMenu}
      
      {/* Delivery Location Popup */}
      <Popover
        open={isDeliveryPopupOpen}
        anchorEl={deliveryPopupAnchor}
        onClose={() => {
          setIsDeliveryPopupOpen(false);
          setDeliveryPopupAnchor(null);
        }}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'center',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'center',
        }}
        PaperProps={{
          onMouseEnter: () => {
            isHoveringRef.current = true;
            if (hoverTimeoutRef.current) {
              clearTimeout(hoverTimeoutRef.current);
              hoverTimeoutRef.current = null;
            }
          },
          onMouseLeave: () => {
            isHoveringRef.current = false;
            hoverTimeoutRef.current = setTimeout(() => {
              if (!isHoveringRef.current) {
                setIsDeliveryPopupOpen(false);
                setDeliveryPopupAnchor(null);
              }
            }, 300);
          },
          sx: {
            mt: 1,
            boxShadow: 3,
          },
          'data-delivery-popup': true,
        }}
      >
        <DeliverToPopup
          tenantSlug={tenantSlug}
          open={isDeliveryPopupOpen}
          onClose={() => {
            setIsDeliveryPopupOpen(false);
            setDeliveryPopupAnchor(null);
          }}
        />
      </Popover>
    </AppBar>
  );
}
