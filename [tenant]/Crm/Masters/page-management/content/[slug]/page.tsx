"use client";

import React, { useState, useCallback, useRef, FC, ReactNode } from "react";
import { DndProvider, useDrag, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { useParams } from "next/navigation";
import {
  QueryClient,
  QueryClientProvider,
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import {
  useAdminLandingPage,
  LandingPage,
} from "@/app/hooks/api/admin/landing-pages";
import ContentBlockEditor from "../../components/content-block-editor";
import BannerGridEditor from "../../components/BannerGridEditor";

// --- MUI Imports ---
import {
  Box,
  Button,
  Chip,
  Dialog,
  FormControl,
  IconButton,
  Link,
  MenuItem,
  Paper,
  Select,
  SelectChangeEvent,
  Stack,
  Typography,
  alpha,
  styled,
  useTheme,
} from "@mui/material";

// --- MUI Icons ---
import AddIcon from "@mui/icons-material/Add";
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import VisibilityIcon from "@mui/icons-material/Visibility";
import PublishIcon from "@mui/icons-material/Publish";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";

// --- User's Theme Context (as provided) ---
// In a real project, this would be in its own file and imported.
// For this self-contained example, it's included here.
import { createContext, useContext, useEffect } from "react";
import {
  createTheme,
  ThemeProvider as MuiThemeProvider,
  responsiveFontSizes,
  Theme,
  CssBaseline,
} from "@mui/material";

// Assuming the types from ThemeContext.tsx are available
type ThemeMode = "light" | "dark";
type ThemeColor =
  | "blue"
  | "purple"
  | "green"
  | "teal"
  | "indigo"
  | "amber"
  | "red"
  | "pink"
  | "orange"
  | "cyan"
  | "deepPurple"
  | "lime";
type FontFamily =
  | "inter"
  | "roboto"
  | "poppins"
  | "montserrat"
  | "opensans"
  | "underdog";

interface ThemeContextType {
  mode: ThemeMode;
  color: ThemeColor;
  fontFamily: FontFamily;
  toggleTheme: () => void;
  changeThemeColor: (color: ThemeColor) => void;
  changeFontFamily: (font: FontFamily) => void;
}

const themeColors = {
  blue: {
    light: {
      primary: "#0ea5e9",
      secondary: "#f50057",
      background: "#f8fafc",
      paper: "#ffffff",
      success: "#22c55e",
      warning: "#f97316",
      error: "#ef4444",
      info: "#3b82f6",
      accent1: "#e0f2fe",
      accent2: "#7dd3fc",
      accent3: "#38bdf8",
    },
    dark: {
      primary: "#38bdf8",
      secondary: "#f48fb1",
      background: "#020617",
      paper: "#0f172a",
      success: "#4ade80",
      warning: "#fb923c",
      error: "#f87171",
      info: "#60a5fa",
      accent1: "#0c4a6e",
      accent2: "#075985",
      accent3: "#0369a1",
    },
  },
  // Other colors omitted for brevity, but would be included as per the user's file
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>("light");
  const [color, setColor] = useState<ThemeColor>("blue");
  const [fontFamily, setFontFamily] = useState<FontFamily>("roboto"); // Set to roboto to match original design

  let theme = createTheme({
    palette: {
      grey: {
        "200": "#e5e7eb",
        "300": "#d1d5db",
        "400": "#9ca3af",
        "500": "#6b7280",
        "600": "#4b5563",
        "700": "#374151",
      },
      text: { primary: "#0f172a", secondary: "#64748b" },
    },
    typography: {
      fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
      h1: { fontWeight: 700, fontSize: "1.5rem", color: "#1e293b" },
      h2: { fontWeight: 600, fontSize: "1.125rem", color: "#1e293b" },
      body1: { fontSize: "1rem", fontWeight: 500 },
      body2: { fontSize: "0.875rem", color: "#64748b" },
      caption: { fontSize: "0.75rem" },
    },
    shape: {
      borderRadius: 8,
    },
    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            textTransform: "none",
            fontWeight: 500,
            borderRadius: 6,
            boxShadow: "none",
          },
          contained: {
            "&:hover": {
              boxShadow: "none",
            },
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: "none",
            boxShadow: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
            border: "1px solid #e5e7eb",
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: ({ ownerState, theme }) => ({
            ...(ownerState.color === "success" && {
              backgroundColor: theme.palette.success.light,
              color: theme.palette.success.dark,
            }),
            ...(ownerState.color === "info" && {
              backgroundColor: theme.palette.info.light,
              color: theme.palette.info.dark,
            }),
            ...(ownerState.color === "default" && {
              backgroundColor: "#f1f5f9",
              color: "#475569",
              border: "1px solid #d1d5db",
            }),
            height: "22px",
            fontSize: "0.75rem",
            fontWeight: 500,
            borderRadius: "9999px",
          }),
        },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            fontSize: "0.875rem",
            borderRadius: 6,
            "& .MuiOutlinedInput-notchedOutline": {
              borderColor: "#d1d5db",
            },
            "&:hover .MuiOutlinedInput-notchedOutline": {
              borderColor: "#9ca3af",
            },
            "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
              borderWidth: "1px",
            },
          },
        },
      },
      MuiSelect: {
        styleOverrides: {
          icon: {
            color: "#6b7280",
          },
        },
      },
    },
  });

  theme = responsiveFontSizes(theme);

  const value = {
    mode,
    color,
    fontFamily,
    toggleTheme: () => setMode((m) => (m === "light" ? "dark" : "light")),
    changeThemeColor: setColor,
    changeFontFamily: setFontFamily,
  };

  return (
    <ThemeContext.Provider value={value}>
      <MuiThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </MuiThemeProvider>
    </ThemeContext.Provider>
  );
}

// --- Internationalization Placeholder ---
// In a real app, this would come from `react-i18next`
const useTranslation = () => ({
  t: (key: string, options?: any) => {
    const translations: { [key: string]: string } = {
      editingHomepage: "Editing: Main Homepage",
      pageDescription:
        "Configure the layout and content blocks for your store's landing page",
      addNewBlock: "Add New Block",
      allBlockTypes: "All Block Types",
      allStatuses: "All Statuses",
      previewPage: "Preview Page",
      publishChanges: "Publish Changes",
      contentBlocks: "Content Blocks",
      contentBlocksDescription:
        "Drag to reorder blocks. Click edit to modify block content.",
      active: "Active",
      scheduled: "Scheduled",
      inactive: "Inactive",
      edit: "Edit block",
      delete: "Delete block",
    };
    return translations[key] || key;
  },
});

// --- Types ---
type BlockStatus = "Active" | "Scheduled" | "Inactive";
interface ContentBlock {
  id: string;
  title: string;
  block_type: string;
  status: BlockStatus;
  details: string;
  apiBlock?: any; // Store original API block for reference
  order: number;
}

// Define all possible block types
const ALL_BLOCK_TYPES = [
  {
    id: "hero-carousel",
    type: "HERO_CAROUSEL",
    title: "Hero Carousel",
    emptyDetails: "0 slides • Not configured",
  },
  {
    id: "banner-grid",
    type: "BANNER_AD_GRID",
    title: "Banner Grid",
    emptyDetails: "0 banners • Not configured",
  },
  {
    id: "featured-products",
    type: "FEATURED_PRODUCTS",
    title: "Featured Products",
    emptyDetails: "0 products • Not configured",
  },
  {
    id: "recently-viewed",
    type: "RECENTLY_VIEWED",
    title: "Recently Viewed Products",
    emptyDetails: "Not configured",
  },
  {
    id: "text-section",
    type: "TEXT_SECTION",
    title: "Text Section",
    emptyDetails: "No content available",
  },
  {
    id: "newsletter",
    type: "NEWSLETTER",
    title: "Newsletter Signup",
    emptyDetails: "Not configured",
  },
];

/**
 * Transform API blocks to UI ContentBlock format
 */
const transformApiBlocksToContentBlocks = (apiData: any): ContentBlock[] => {
  if (!apiData || !apiData.blocks || !Array.isArray(apiData.blocks)) {
    return [];
  }
  // Map API blocks to our ContentBlock format
  const transformedBlocks: ContentBlock[] = apiData.blocks.map((block: any) => {
    const blockTypeInfo = ALL_BLOCK_TYPES.find(
      (t) => t.type === block.block_type
    ) || {
      id: block.id,
      type: block.block_type,
      title: block.block_type,
      emptyDetails: "No details available",
    };

    // Generate details based on block type
    let details = "";
    switch (block.block_type) {
      case "HERO_CAROUSEL":
        const slideCount = block.content?.slides?.length || 0;
        const autoplay = block.content?.autoplay
          ? `Auto-rotate every ${block.content.autoplaySpeed / 1000}s`
          : "No auto-rotate";
        details = `${slideCount} slide${
          slideCount !== 1 ? "s" : ""
        } • ${autoplay}`;
        break;
      case "BANNER_AD_GRID":
        const bannerCount = block.content?.banners?.length || 0;
        const layout = block.content?.columns
          ? `${block.content.columns}-column layout`
          : "Grid layout";
        details = `${bannerCount} banner${
          bannerCount !== 1 ? "s" : ""
        } • ${layout}`;
        break;
      case "FEATURED_PRODUCTS":
        const productCount = block.content?.products?.length || 0;
        const view = block.content?.view_type || "Carousel view";
        details = `${productCount} product${
          productCount !== 1 ? "s" : ""
        } • ${view}`;
        break;
      default:
        details = block.content?.description || blockTypeInfo.emptyDetails;
    }

    return {
      id: block.id.toString(),
      block_type: block.block_type,
      title: blockTypeInfo.title,
      status: block.is_active ? "Active" : "Inactive",
      details,
      apiBlock: block, // Keep original for reference
      order: block.order,
    };
  });

  // Get all currently used order numbers
  const usedOrderNumbers = new Set(
    transformedBlocks.map((block) => block.order)
  );

  // Find the next available order number starting from a given value
  const getNextAvailableOrder = (startOrder: number): number => {
    let order = startOrder;
    while (usedOrderNumbers.has(order)) {
      order++;
    }
    return order;
  };

  // Add missing block types as inactive
  ALL_BLOCK_TYPES.forEach((blockType, index) => {
    const exists = transformedBlocks.some((block) => {
      const apiBlock = block.apiBlock;
      return apiBlock && apiBlock.block_type === blockType.type;
    });

    if (!exists) {
      // Find next available order number starting from index+1
      const orderNum = getNextAvailableOrder(index + 1);

      // Add this order number to the used set to prevent future conflicts
      usedOrderNumbers.add(orderNum);

      transformedBlocks.push({
        id: `missing-${index + 1}`,
        block_type: blockType.type,
        title: blockType.title,
        status: "Inactive",
        details: blockType.emptyDetails,
        order: orderNum,
      });
    }
  });

  return transformedBlocks;
};

const saveBlockOrder = async (blocks: ContentBlock[]): Promise<void> => {
  console.log(
    "Saving new block order:",
    blocks.map((b) => b.title)
  );
  await new Promise((resolve) => setTimeout(resolve, 500));
  return Promise.resolve();
};

const ItemTypes = { BLOCK: "block" };

interface ContentBlockItemProps {
  item: ContentBlock;
  index: number;
  moveBlock: (dragIndex: number, hoverIndex: number) => void;
  onEdit: (block: ContentBlock) => void;
}

const ContentBlockItem: FC<ContentBlockItemProps> = ({
  item,
  index,
  moveBlock,
  onEdit,
}) => {
  const { t } = useTranslation();
  const theme = useTheme();
  const ref = useRef<HTMLDivElement>(null);

  const [, drop] = useDrop({
    accept: ItemTypes.BLOCK,
    hover(draggedItem: { index: number }, monitor) {
      if (!ref.current) return;
      const dragIndex = draggedItem.index;
      const hoverIndex = index;
      if (dragIndex === hoverIndex) return;
      const hoverBoundingRect = ref.current?.getBoundingClientRect();
      const hoverMiddleY =
        (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;
      const clientOffset = monitor.getClientOffset();
      const hoverClientY = clientOffset!.y - hoverBoundingRect.top;
      if (dragIndex < hoverIndex && hoverClientY < hoverMiddleY) return;
      if (dragIndex > hoverIndex && hoverClientY > hoverMiddleY) return;
      moveBlock(dragIndex, hoverIndex);
      draggedItem.index = hoverIndex;
    },
  });

  const [{ isDragging }, drag] = useDrag(() => ({
    type: ItemTypes.BLOCK,
    item: () => ({ id: item.id, index }),
    collect: (monitor) => ({ isDragging: monitor.isDragging() }),
  }));

  // Combine the drag and drop refs
  drag(drop(ref));

  const statusChip = (status: BlockStatus) => {
    switch (status) {
      case "Active":
        return <Chip label={t("active")} color="success" />;
      case "Scheduled":
        return <Chip label={t("scheduled")} color="info" />;
      case "Inactive":
        return <Chip label={t("inactive")} color="default" />;
    }
  };

  const handleOpenEditor = () => {
    onEdit(item);
  };

  return (
    <Paper
      sx={{
        p: 2,
        opacity: isDragging ? 0.4 : 1,
        transition: "box-shadow 150ms ease-in-out",
        cursor: "grab",
        boxShadow: "none",
        backgroundColor: "#fff",
        "&:hover": {
          boxShadow: theme.shadows[1],
        },
      }}
    >
      <Stack direction="row" alignItems="center" spacing={1.5} ref={ref}>
        <Box sx={{ color: "grey.400", display: "flex" }}>
          <DragIndicatorIcon />
        </Box>
        <Box flexGrow={1}>
          <Typography
            variant="body1"
            component="div"
            sx={{ display: "flex", alignItems: "center", gap: 1.5 }}
          >
            {`${index + 1}. ${item.title}`}
            {statusChip(item.status)}
          </Typography>
          <Typography variant="body2" mt={0.25}>
            {item.details}
          </Typography>
        </Box>
        <Stack direction="row" spacing={0.5}>
          <IconButton
            aria-label={t("edit")}
            size="small"
            sx={{ color: "grey.500" }}
            onClick={handleOpenEditor}
          >
            <EditIcon sx={{ fontSize: "1.25rem" }} />
          </IconButton>
          <IconButton
            aria-label={t("delete")}
            size="small"
            sx={{ color: "grey.500" }}
          >
            <DeleteIcon sx={{ fontSize: "1.25rem" }} />
          </IconButton>
        </Stack>
      </Stack>
    </Paper>
  );
};

interface PageParams {
  tenant: string;
  slug: string;
}

const HomepageEditor: FC = () => {
  const { t } = useTranslation();
  const theme = useTheme();
  const queryClient = useQueryClient();
  const params = useParams() as unknown as PageParams;
  const slug = params.slug;

  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [selectedBlock, setSelectedBlock] = useState<ContentBlock | null>(null);
  const [mainData, setMainData] = useState<any>(null);

  const handleEditBlock = (block: ContentBlock) => {
    console.log("Editing block:", block);
    setSelectedBlock(block);
    setIsEditorOpen(true);
  };

  const handleCloseEditor = () => {
    setIsEditorOpen(false);
    setSelectedBlock(null);
  };

  // Call the API using the slug from URL params
  const {
    data: pageData,
    isLoading: isLoadingPage,
    error: pageError,
  } = useAdminLandingPage(slug);

  const [blocks, setBlocks] = useState<ContentBlock[]>([]);

  // Transform API data to ContentBlock format when pageData changes
  useEffect(() => {
    if (pageData) {
      const mainData = {
        id: pageData.id,
        slug: pageData.slug,
        title: pageData.title,
        meta_description: pageData.meta_description,
        meta_keywords: pageData.meta_keywords,
      };
      const transformedBlocks = transformApiBlocksToContentBlocks(pageData);
      setBlocks(transformedBlocks);
      setMainData(mainData);

      console.log("Transformed blocks:", transformedBlocks);
    }
  }, [pageData]);

  const mutation = useMutation({ mutationFn: saveBlockOrder });

  const moveBlock = useCallback((dragIndex: number, hoverIndex: number) => {
    setBlocks((prevBlocks) => {
      const newBlocks = [...prevBlocks];
      const [draggedBlock] = newBlocks.splice(dragIndex, 1);
      newBlocks.splice(hoverIndex, 0, draggedBlock);
      return newBlocks;
    });
  }, []);

  const AddBlockDashedButton = styled(Button)(({ theme }) => ({
    border: `1px dashed ${theme.palette.grey[300]}`,
    backgroundColor: "transparent",
    color: theme.palette.text.secondary,
    padding: theme.spacing(1.5),
    marginTop: theme.spacing(2),
    fontWeight: 500,
    "&:hover": {
      backgroundColor: alpha(theme.palette.primary.main, 0.04),
      borderColor: theme.palette.grey[400],
    },
  }));

  // We now handle loading and error states in the content variable below

  // Prepare loading and error content
  let content;
  if (isLoadingPage) {
    content = <Typography>Loading content blocks...</Typography>;
  } else if (pageError) {
    content = (
      <Typography color="error">
        Error loading page: {(pageError as Error).message}
      </Typography>
    );
  } else {
    content = (
      <>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          justifyContent="space-between"
          alignItems={{ xs: "flex-start", sm: "center" }}
          mb={3}
        >
          <Box>
            <Typography variant="h1">{t("editingHomepage")}</Typography>
            <Typography variant="body2">{t("pageDescription")}</Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            sx={{ mt: { xs: 2, sm: 0 }, py: 1, px: 2 }}
          >
            {t("addNewBlock")}
          </Button>
        </Stack>

        {/* <Paper sx={{ p: 2, mb: 3 }}>
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            justifyContent="space-between"
            alignItems={{ xs: 'stretch', md: 'center' }}
            spacing={2}
          >
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <FormControl size="small" sx={{minWidth: 180}}>
                   <Select value={blockType} onChange={(e: SelectChangeEvent) => setBlockType(e.target.value)} IconComponent={ExpandMoreIcon}>
                      <MenuItem value="all">{t('allBlockTypes')}</MenuItem>
                      <MenuItem value="carousel">Hero Carousel</MenuItem>
                      <MenuItem value="grid">Banner Grid</MenuItem>
                   </Select>
                </FormControl>
                 <FormControl size="small" sx={{minWidth: 180}}>
                  <Select value={status} onChange={(e: SelectChangeEvent) => setStatus(e.target.value)} IconComponent={ExpandMoreIcon}>
                      <MenuItem value="all">{t('allStatuses')}</MenuItem>
                      <MenuItem value="active">Active</MenuItem>
                      <MenuItem value="scheduled">Scheduled</MenuItem>
                      <MenuItem value="inactive">Inactive</MenuItem>
                  </Select>
                </FormControl>
            </Stack>
            <Stack direction="row" spacing={3} alignItems="center">
              <Link component="button" underline="none" color="text.primary" variant="body1" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, fontSize: '0.875rem' }}>
                  <VisibilityIcon sx={{ fontSize: '1.25rem', color: 'grey.600' }}/> {t('previewPage')}
              </Link>
              <Link component="button" underline="none" color="text.primary" variant="body1" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, fontSize: '0.875rem' }} onClick={() => mutation.mutate(blocks)}>
                  <PublishIcon sx={{ fontSize: '1.25rem', color: 'grey.600' }}/> {t('publishChanges')}
              </Link>
            </Stack>
          </Stack>
        </Paper> */}

        <Paper sx={{ p: { xs: 2, md: 3 } }}>
          <Typography variant="h2">{t("contentBlocks")}</Typography>
          <Typography variant="body2" mb={2}>
            {t("contentBlocksDescription")}
          </Typography>

          <DndProvider backend={HTML5Backend}>
            <Stack spacing={1.5}>
              {blocks.map((item, index) => (
                <ContentBlockItem
                  key={item.id}
                  index={index}
                  item={item}
                  moveBlock={moveBlock}
                  onEdit={handleEditBlock}
                />
              ))}
            </Stack>
          </DndProvider>

          <AddBlockDashedButton fullWidth startIcon={<AddIcon />}>
            {t("addNewBlock")}
          </AddBlockDashedButton>
        </Paper>
      </>
    );
  }

  return (
    <Box
      sx={{
        backgroundColor: theme.palette.background.default,
        minHeight: "100vh",
      }}
    >
      {content}

      {/* Content Block Editor Dialog */}
      <Dialog
        open={isEditorOpen}
        onClose={handleCloseEditor}
        disableEscapeKeyDown
        disableAutoFocus
        disableEnforceFocus
        disablePortal={false}
        disableScrollLock={false}
        hideBackdrop={false}
        disableRestoreFocus
        keepMounted={false}
        // maxWidth="xl"
        // fullWidth
        PaperProps={{
          onClick: (e: React.MouseEvent<HTMLDivElement>) => e.stopPropagation(),
          sx: {
            // height: 'auto',
            minHeight: "98vh",
            maxHeight: "98vh",
            overflowY: "auto",
            minWidth: "99vw",
            maxWidth: "99vw",
          },
        }}
      >
        {selectedBlock?.block_type === "BANNER_AD_GRID" && (
          <BannerGridEditor
            mainData={mainData}
            initialData={selectedBlock}
            onClose={handleCloseEditor}
            onSave={(data) => {
              // Here you would typically make an API call to update the block data
              // For now, we'll just invalidate the query to refresh the page
              queryClient.invalidateQueries({
                queryKey: ["adminLandingPage", slug],
              });
            }}
          />
        )}
        {selectedBlock?.block_type === "HERO_CAROUSEL" && (
          <ContentBlockEditor
            mainData={mainData}
            onClose={handleCloseEditor}
            blockData={selectedBlock}
            onSaveSuccess={() => {
              // Refresh data by invalidating the landing page query
              queryClient.invalidateQueries({
                queryKey: ["adminLandingPage", slug],
              });
              // The page will automatically re-render with fresh data without a full reload
            }}
          />
        )}
      </Dialog>
    </Box>
  );
};

const queryClient = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <HomepageEditor />
      </ThemeProvider>
    </QueryClientProvider>
  );
}
