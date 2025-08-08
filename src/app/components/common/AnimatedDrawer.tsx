import React, {
  useState,
  useEffect,
  ReactNode,
  MouseEvent,
  createContext,
  useContext,
  useMemo,
  useCallback,
} from "react";
import {
  Box,
  Drawer,
  Typography,
  Fab,
  Paper,
  IconButton,
  Divider,
  Tooltip,
  Slide,
  useTheme,
  Button,
  alpha,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import EventIcon from "@mui/icons-material/Event";

import { useDrawer } from "@/app/contexts/DrawerContext";

// Component-specific constants
const DRAWER_WIDTH_INITIAL = 550;
const DRAWER_WIDTH_EXPANDED = 800;
const SIDEBAR_WIDTH = 250;
const ICON_SIDEBAR_WIDTH = 60;
const EVENT_SECTION_WIDTH = 500;

// Event controls context for children to interact with event section
interface EventControlsContextType {
  isEventSectionOpen: boolean;
  toggleEventSection: () => void;
  setEventContent: (content: ReactNode) => void;
  openEventSection: () => void;
  closeEventSection: () => void;
}

const EventControlsContext = createContext<EventControlsContextType | null>(
  null
);

// Hook to use event controls in child components
export const useEventControls = () => {
  const context = useContext(EventControlsContext);
  if (!context) {
    throw new Error("useEventControls must be used within an AnimatedDrawer");
  }
  return context;
};

export type AnimationState = "entering" | "entered" | "exiting" | "exited";

interface AnimatedDrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  onSave?: () => void;
  saveDisabled?: boolean;
  initialWidth?: number;
  expandedWidth?: number;
  footerContent?: ReactNode;
  disableBackdropClick?: boolean;
  sidebarIcons?: Array<{
    id: string;
    icon: ReactNode;
    tooltip: string;
    onClick?: () => void;
  }>;
  sidebarContent?: {
    [key: string]: ReactNode;
  };
  defaultSidebarItem?: string;
  event?: ReactNode; // Optional event prop
  enableEventSection?: boolean; // Enable event section even without initial content
  onEventToggle?: (isOpen: boolean) => void; // Callback when event section is toggled
  onEventContentChange?: (content: ReactNode) => void; // Callback to change event content dynamically
  leftActionButton?: {
    text: string;
    icon?: ReactNode;
    onClick: () => void;
  };
  rightActionButton?: {
    text: string;
    icon?: ReactNode;
    onClick: () => void;
  };
}

const AnimatedDrawer: React.FC<AnimatedDrawerProps> = ({
  open,
  onClose,
  title,
  children,
  onSave,
  saveDisabled = false,
  initialWidth = DRAWER_WIDTH_INITIAL,
  expandedWidth = DRAWER_WIDTH_EXPANDED,
  footerContent,
  disableBackdropClick = true,
  sidebarIcons,
  sidebarContent,
  defaultSidebarItem,
  event,
  enableEventSection = false,
  onEventToggle,
  onEventContentChange,
  leftActionButton,
  rightActionButton,
}) => {
  const theme = useTheme();
  const [drawerWidth, setDrawerWidth] = useState(initialWidth);
  const [drawerAnimation, setDrawerAnimation] =
    useState<AnimationState>("exited");
  const [isEventSectionOpen, setIsEventSectionOpen] = useState(false);
  const [dynamicEventContent, setDynamicEventContent] =
    useState<ReactNode>(null);

  // Use the drawer context
  const drawerContext = useDrawer();
  const [activeSidebarItem, setActiveSidebarItem] = useState<string | null>(
    null
  );

  // Calculate dynamic drawer width based on event section and sidebar state
  const calculateDrawerWidth = () => {
    let baseWidth = drawerWidth;
    if (
      isEventSectionOpen &&
      (event || dynamicEventContent || enableEventSection)
    ) {
      baseWidth += EVENT_SECTION_WIDTH;
    }
    return baseWidth;
  };

  // Handle drawer animation states
  useEffect(() => {
    if (open) {
      setDrawerAnimation("entering");
      setTimeout(() => {
        setDrawerAnimation("entered");
      }, 300);
    } else {
      setDrawerAnimation("exiting");
      setTimeout(() => {
        setDrawerAnimation("exited");
      }, 300);
    }
  }, [open]);

  // Set default sidebar item when drawer opens
  useEffect(() => {
    if (open) {
      // Use the provided default item, or the first icon's id if available, or from context
      const defaultItem =
        defaultSidebarItem ||
        drawerContext?.activeSidebarItem ||
        (sidebarIcons && sidebarIcons.length > 0 ? sidebarIcons[0].id : null);

      setActiveSidebarItem(defaultItem);

      // Also update the context
      if (defaultItem) {
        drawerContext?.setActiveSidebarItem(defaultItem);
        // Always expand drawer width when opening with a sidebar item
        setDrawerWidth(expandedWidth);
      }
    }
  }, [open, defaultSidebarItem, sidebarIcons, drawerContext, expandedWidth]);

  // Handle event section visibility
  useEffect(() => {
    if (open && event) {
      // Auto-open event section when drawer opens and event content is provided
      setIsEventSectionOpen(true);
    } else if (!open) {
      // Close event section when drawer closes
      setIsEventSectionOpen(false);
    }
  }, [open, event]);

  // Toggle drawer width between initial and expanded
  const toggleDrawerWidth = () => {
    setDrawerWidth(drawerWidth === initialWidth ? expandedWidth : initialWidth);
  };

  // Handle backdrop click - prevent closing if disableBackdropClick is true
  const handleBackdropClick = (event: MouseEvent) => {
    if (disableBackdropClick) {
      event.stopPropagation();
    } else {
      onClose();
    }
  };

  // Handle sidebar item click
  const handleSidebarItemClick = (itemId: string) => {
    // Prevent unnecessary state updates if the item is already active
    if (itemId === activeSidebarItem) {
      return;
    }

    // Update local state
    setActiveSidebarItem(itemId);

    // Update drawer context
    drawerContext?.setActiveSidebarItem(itemId);

    // Expand drawer width when clicking a sidebar item
    setDrawerWidth(expandedWidth);
  };

  // Toggle event section visibility (memoized for stability)
  const toggleEventSection = React.useCallback(() => {
    const newState = !isEventSectionOpen;
    setIsEventSectionOpen(newState);
    onEventToggle?.(newState);
  }, [isEventSectionOpen, onEventToggle]);

  // Event control functions to pass to children (memoized to prevent infinite re-renders)
  const eventControls = React.useMemo(
    () => ({
      isEventSectionOpen,
      toggleEventSection,
      setEventContent: (content: ReactNode) => {
        setDynamicEventContent(content);
        onEventContentChange?.(content);
      },
      openEventSection: () => {
        setIsEventSectionOpen(true);
        onEventToggle?.(true);
      },
      closeEventSection: () => {
        setIsEventSectionOpen(false);
        onEventToggle?.(false);
      },
    }),
    [
      isEventSectionOpen,
      toggleEventSection,
      onEventContentChange,
      onEventToggle,
    ]
  );

  // Use provided icons directly - no defaults
  const displaySidebarIcons = sidebarIcons || [];

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={disableBackdropClick ? undefined : onClose}
      sx={(theme) => ({
        "& .MuiDrawer-paper": {
          width: calculateDrawerWidth(),
          maxWidth: "100%",
          height: "88%",
          p: 0,
          marginRight: theme.spacing(1.25), // 10px
          borderRadius: theme.shape.borderRadius, // 8px

          marginTop: "74px", // Standard height of MUI AppBar
          top: 0,
          position: "fixed",
          transition: `width ${theme.transitions.duration.standard}ms ${theme.transitions.easing.easeInOut}, transform ${theme.transitions.duration.complex}ms ${theme.transitions.easing.easeOut} !important`,
          transform:
            drawerAnimation === "entering"
              ? `translateX(${theme.spacing(1)})` // 8px
              : drawerAnimation === "exiting"
              ? `translateX(${theme.spacing(1)})`
              : "translateX(0)",
        },
        "& .MuiBackdrop-root": {
          opacity: 0,
          transition: theme.transitions.create("opacity", {
            duration: theme.transitions.duration.standard,
            easing: theme.transitions.easing.easeInOut,
          }),
        },
        "& .MuiBackdrop-root.MuiModal-backdrop": {
          opacity: 0.5, // Standard modal backdrop opacity
        },
      })}
      transitionDuration={{
        enter: 400, // Use standard MUI duration
        exit: 300,
      }}
      SlideProps={{
        easing: {
          enter: "cubic-bezier(0.4, 0, 0.2, 1)", // MUI easeOut
          exit: "cubic-bezier(0.4, 0, 0.6, 1)", // MUI sharp
        },
        timeout: {
          enter: 400,
          exit: 300,
        },
        style: {
          transition: `transform ${400}ms cubic-bezier(0.4, 0, 0.2, 1)`, // Using MUI easeOut transition
        },
      }}
      keepMounted={false}
      // Prevent closing when clicking outside if disableBackdropClick is true
      onClick={(e) => e.stopPropagation()}
      ModalProps={{
        keepMounted: false,
      }}
    >
      <Box
        sx={{
          display: "flex",
          height: "100%",
          position: "relative",
          bgcolor: "background.paper",
        }}
      >
        {/* Event Section - Left Side */}
        {(event || dynamicEventContent || enableEventSection) && (
          <Box
            sx={(theme) => ({
              width: isEventSectionOpen ? EVENT_SECTION_WIDTH : 0,
              flexShrink: 0,
              overflow: "hidden",
              transition: theme.transitions.create("width", {
                duration: theme.transitions.duration.standard,
                easing: theme.transitions.easing.easeInOut,
              }),
              borderRight: isEventSectionOpen ? "1px solid" : "none",
              borderColor: "divider",
              backgroundColor: theme.palette.background.default,
            })}
          >
            <Box
              sx={(theme) => ({
                width: EVENT_SECTION_WIDTH,
                height: "100%",
                opacity: isEventSectionOpen ? 1 : 0,
                transition: theme.transitions.create("opacity", {
                  duration: theme.transitions.duration.standard,
                  easing: theme.transitions.easing.easeInOut,
                  delay: isEventSectionOpen
                    ? theme.transitions.duration.shorter
                    : 0,
                }),
                p: theme.spacing(2),
                overflow: "auto",
              })}
            >
              {/* Event Section Header */}
              <Box
                sx={(theme) => ({
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  mb: theme.spacing(2),
                  pb: theme.spacing(1),
                  borderBottom: "1px solid",
                  borderColor: "divider",
                })}
              >
                <Typography
                  variant="h6"
                  sx={(theme) => ({
                    fontWeight: theme.typography.fontWeightMedium,
                  })}
                >
                  Events
                </Typography>
                <IconButton
                  size="small"
                  onClick={() => setIsEventSectionOpen(false)}
                  aria-label="Close event section"
                >
                  <CloseIcon fontSize="small" />
                </IconButton>
              </Box>

              {/* Event Content */}
              {dynamicEventContent ||
                event ||
                (enableEventSection && (
                  <Box
                    sx={{ p: 2, textAlign: "center", color: "text.secondary" }}
                  >
                    <Typography variant="body2">
                      No events to display
                    </Typography>
                  </Box>
                ))}
            </Box>
          </Box>
        )}
        {/* Main Content */}
        <Paper
          elevation={0}
          sx={(theme) => ({
            display: "flex",
            flexDirection: "column",
            height: "100%",
            position: "relative",
            borderRadius: 0,
            overflow: "hidden", // Hide overflow for the container
            flexGrow: 1,
            zIndex: 1,
            bgcolor: "background.paper",
          })}
        >
          {/* Header Section - Fixed */}
          <Box
            sx={(theme) => ({
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              p: 2,
              borderBottom: "1px solid",
              borderColor: "divider",
              position: "sticky",
              top: 0,
              zIndex: theme.zIndex.appBar,
              backgroundColor: theme.palette.background.paper,
              borderTopLeftRadius: theme.shape.borderRadius,
              borderTopRightRadius: theme.shape.borderRadius,
              boxShadow: theme.shadows[1],
              minHeight: theme.spacing(8), // Fixed header height (64px)
              flexShrink: 0, // Prevent header from shrinking
            })}
          >
            <Box sx={{ display: "flex", alignItems: "center" }}>
              <Typography variant="h6">{title}</Typography>
            </Box>

            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              {/* Event Section Toggle Button */}
              {(event || dynamicEventContent || enableEventSection) && (
                <Tooltip
                  title={isEventSectionOpen ? "Hide Events" : "Show Events"}
                  placement="bottom"
                >
                  <IconButton
                    onClick={toggleEventSection}
                    size="small"
                    aria-label="Toggle event section"
                    sx={(theme) => ({
                      color: isEventSectionOpen
                        ? theme.palette.primary.main
                        : "inherit",
                      bgcolor: isEventSectionOpen
                        ? alpha(theme.palette.primary.main, 0.1)
                        : "transparent",
                      "&:hover": {
                        bgcolor: isEventSectionOpen
                          ? alpha(theme.palette.primary.main, 0.2)
                          : alpha(theme.palette.action.hover, 0.1),
                      },
                    })}
                  >
                    <EventIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              )}

              <IconButton onClick={onClose} size="small" aria-label="Close">
                <CloseIcon fontSize="small" />
              </IconButton>
            </Box>
          </Box>

          {/* Content Area Section - Scrollable with Sidebar */}
          <Box
            sx={(theme) => ({
              flexGrow: 1,
              display: "flex",
              height: `calc(100% - ${theme.spacing(8 + 7)}px)`, // Subtract header and footer heights (64px + 56px)
              position: "relative",
              overflowY: "auto",
            })}
          >
            {/* Sidebar Content Panel - Only visible when a sidebar item is active AND sidebarContent is not empty */}
            {activeSidebarItem &&
              sidebarContent &&
              Object.keys(sidebarContent).length > 0 && (
                <Box
                  sx={(theme) => ({
                    width: SIDEBAR_WIDTH,
                    flexShrink: 0,
                    p: theme.spacing(2),
                    overflow: "auto",
                    backgroundColor: theme.palette.background.paper,
                    borderRight: "1px solid",
                    borderColor: "divider",
                  })}
                >
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle1" fontWeight="bold">
                      {displaySidebarIcons.find(
                        (icon) => icon.id === activeSidebarItem
                      )?.tooltip || "Information"}
                    </Typography>
                  </Box>

                  {/* Custom sidebar content if provided */}
                  {sidebarContent[activeSidebarItem] ? (
                    sidebarContent[activeSidebarItem]
                  ) : (
                    /* Default placeholder content for each tab */
                    <>
                      {activeSidebarItem === "info" && (
                        <Typography variant="body2">
                          Information about this item would appear here.
                        </Typography>
                      )}
                      {activeSidebarItem === "attachments" && (
                        <Typography variant="body2">
                          Attachments related to this item would be listed here.
                        </Typography>
                      )}
                      {activeSidebarItem === "history" && (
                        <Typography variant="body2">
                          History of changes would be displayed here.
                        </Typography>
                      )}
                      {activeSidebarItem === "comments" && (
                        <Typography variant="body2">
                          Comments and discussions would appear here.
                        </Typography>
                      )}
                      {activeSidebarItem === "bookmarks" && (
                        <Typography variant="body2">
                          Bookmarked items would be listed here.
                        </Typography>
                      )}
                      {activeSidebarItem === "settings" && (
                        <Typography variant="body2">
                          Settings and configuration options would be shown
                          here.
                        </Typography>
                      )}
                    </>
                  )}
                </Box>
              )}

            {/* Main Content - Scrollable */}
            <Box
              sx={(theme) => ({
                flexGrow: 1,
                overflow: "auto", // Only this section is scrollable
                p: theme.spacing(3),
                backgroundColor: theme.palette.background.paper, // Match header and footer background
              })}
            >
              <EventControlsContext.Provider value={eventControls}>
                {children}
              </EventControlsContext.Provider>
            </Box>

            {/* Right Sidebar - Fixed */}
            {displaySidebarIcons.length > 0 && (
              <Box
                sx={(theme) => ({
                  width: ICON_SIDEBAR_WIDTH,
                  flexShrink: 0,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  p: theme.spacing(1),
                  backgroundColor:
                    theme.palette.mode === "dark"
                      ? alpha(theme.palette.background.paper, 0.05)
                      : alpha(theme.palette.background.default, 0.02),
                  borderLeft: "1px solid",
                  borderColor: "divider",
                  zIndex: 2,
                })}
              >
                {displaySidebarIcons.map((item) => (
                  <Tooltip key={item.id} title={item.tooltip} placement="left">
                    <IconButton
                      size="small"
                      onClick={() => {
                        if (item.onClick) {
                          item.onClick();
                          // Also update the context and expand drawer
                          drawerContext.setActiveSidebarItem(item.id);
                          setDrawerWidth(expandedWidth);
                        } else {
                          handleSidebarItemClick(item.id);
                        }
                      }}
                      sx={(theme) => ({
                        my: theme.spacing(0.5),
                        color:
                          activeSidebarItem === item.id
                            ? theme.palette.primary.main
                            : "inherit",
                        bgcolor:
                          activeSidebarItem === item.id
                            ? theme.palette.mode === "dark"
                              ? alpha(theme.palette.background.paper, 0.15)
                              : alpha(theme.palette.primary.light, 0.2)
                            : "transparent",
                        "&:hover": {
                          bgcolor:
                            theme.palette.mode === "dark"
                              ? alpha(theme.palette.background.paper, 0.1)
                              : alpha(theme.palette.primary.light, 0.1),
                        },
                        transition: theme.transitions.create(
                          ["background-color", "color"],
                          {
                            duration: theme.transitions.duration.shorter,
                          }
                        ),
                        borderRadius: theme.shape.borderRadius,
                        p: theme.spacing(1),
                      })}
                    >
                      {item.icon}
                    </IconButton>
                  </Tooltip>
                ))}
              </Box>
            )}
          </Box>

          {/* Footer Section - Fixed */}
          <Box
            sx={(theme) => ({
              p: theme.spacing(2),
              display: "flex",
              justifyContent: leftActionButton ? "space-between" : "flex-end",
              alignItems: "center",
              backgroundColor: theme.palette.background.paper,
              borderBottomLeftRadius: theme.shape.borderRadius,
              borderBottomRightRadius: theme.shape.borderRadius,
              // boxShadow: `0 -${theme.spacing(0.25)}px ${theme.spacing(0.5)}px ${alpha(theme.palette.common.black, 0.05)}`,
              minHeight: theme.spacing(7), // Fixed footer height (56px)
              flexShrink: 0, // Prevent footer from shrinking
              position: "sticky",
              bottom: 0,
              zIndex: theme.zIndex.appBar - 100,
              borderTop: "1px solid",
              borderColor: "divider",
              boxShadow: theme.shadows[1],
            })}
          >
            <Box sx={(theme) => ({ display: "flex", gap: theme.spacing(2) })}>
              {leftActionButton && (
                <Button
                  variant="outlined"
                  color="primary"
                  startIcon={leftActionButton.icon}
                  onClick={leftActionButton.onClick}
                  size="small"
                >
                  {leftActionButton.text}
                </Button>
              )}
            </Box>
            <Box sx={(theme) => ({ display: "flex", gap: theme.spacing(2) })}>
              <Button variant="outlined" onClick={onClose} size="small">
                Cancel
              </Button>
              {onSave && (
                <Button
                  variant="contained"
                  color="primary"
                  onClick={onSave}
                  disabled={saveDisabled}
                  size="small"
                >
                  Save
                </Button>
              )}
              {rightActionButton && (
                <Button
                  variant="contained"
                  color="primary"
                  onClick={rightActionButton.onClick}
                  size="small"
                >
                  {rightActionButton.text}
                </Button>
              )}
              {footerContent}
            </Box>
          </Box>
        </Paper>
      </Box>
    </Drawer>
  );
};

export default AnimatedDrawer;
