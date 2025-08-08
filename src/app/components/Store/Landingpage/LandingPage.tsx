"use client";

import { FC, useEffect, useMemo } from "react";
import { Box, Typography, CircularProgress, Grid, Button } from "@mui/material";
import { useRouter } from "next/navigation";
import {
  useLandingPage,
  useDivisionHierarchy,
} from "@/app/hooks/api/store/useNavigation";
import { CategoriesGrid } from "./CategoriesGrid";

// Import Swiper React components and styles
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Pagination, Autoplay, EffectFade } from "swiper/modules";

// Import Swiper styles
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";
import "swiper/css/effect-fade";

interface LandingPageProps {
  pageId: number;
}

/**
 * LandingPage component that displays a landing page with dynamic content blocks
 *
 * @param {LandingPageProps} props - Component props
 * @returns {React.ReactElement} LandingPage component
 */
// Transform division hierarchy to categories format
const transformToCategories = (divisions: any[]) => {
  if (!divisions || divisions.length === 0) return [];

  // Get all categories from all divisions
  const allCategories: any[] = [];

  divisions.forEach((division) => {
    if (division.categories && division.categories.length > 0) {
      allCategories.push(...division.categories);
    }
  });

  return allCategories;
};

export const LandingPage: FC<LandingPageProps> = ({ pageId }) => {
  const router = useRouter();
  const {
    data: landingPage,
    isLoading: isLandingPageLoading,
    error: landingPageError,
  } = useLandingPage(pageId);
  const {
    data: divisionData,
    isLoading: isDivisionsLoading,
    error: divisionsError,
  } = useDivisionHierarchy();

  const pathParts = window.location.pathname.split("/");
  const tenantSlug = pathParts[1];

  // useEffect(() => {
  //   if (landingPage) {
  //     console.log("landingPage", landingPage);
  //   }
  // }, [landingPage]);

  // Transform division data to categories format
  const categories = useMemo(() => {
    if (!divisionData) return [];
    return transformToCategories(divisionData);
  }, [divisionData]);

  const isLoading = isLandingPageLoading || isDivisionsLoading;
  const error = landingPageError || divisionsError;

  // Render categories grid block
  const renderCategoriesGrid = () => {
    if (categories.length === 0) return null;

    return <CategoriesGrid categories={categories} />;
  };

  // Handle rendering hero carousel block
  const renderHeroCarousel = (block: any) => {
    const { content } = block;

    if (!content.slides || content.slides.length === 0) {
      return null;
    }

    return (
      <Box sx={{ width: "100%", position: "relative" }}>
        <Swiper
          modules={[Autoplay, Pagination, Navigation, EffectFade]}
          spaceBetween={0}
          slidesPerView={1}
          loop={true}
          effect="fade"
          autoplay={{
            delay: content.autoplaySpeed || 5000,
            disableOnInteraction: false,
          }}
          pagination={{ clickable: true }}
          navigation={content.arrows}
          className="landing-hero-swiper"
        >
          {content.slides.map((slide: any, index: number) => (
            <SwiperSlide key={index}>
              <Box
                sx={{
                  position: "relative",
                  // height: { xs: "30vh", md: "50vh" },
                  backgroundColor: slide.background_color || "#ffffff",
                }}
              >
                {/* Desktop Image (hidden on mobile) */}
                <Box
                  component="img"
                  src={slide.desktop_image_url}
                  alt={slide.heading}
                  sx={{
                    display: { xs: "none", md: "block" },
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                  }}
                />

                {/* Mobile Image (hidden on desktop) */}
                <Box
                  component="img"
                  src={slide.mobile_image_url}
                  alt={slide.heading}
                  sx={{
                    display: { xs: "block", md: "none" },
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                  }}
                />

                {/* Content Overlay */}
                {/* Clickable overlay that covers the entire slide */}
                <Box
                  onClick={() =>
                    slide.button_link && router.push(slide.button_link)
                  }
                  sx={{
                    position: "absolute",
                    inset: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    textAlign: "center",
                    padding: 4,
                    backgroundColor: "rgba(0,0,0,0.4)",
                    cursor: slide.button_link ? "pointer" : "default",
                    "&:hover": {
                      backgroundColor: slide.button_link
                        ? "rgba(0,0,0,0.5)"
                        : "rgba(0,0,0,0.4)",
                    },
                    transition: "background-color 0.3s ease",
                  }}
                >
                  <Box
                    sx={{
                      maxWidth: "md",
                      mx: "auto",
                      pointerEvents: "none", // Ensures clicks pass through to the parent
                    }}
                    onClick={(e) => e.stopPropagation()} // Prevent double triggering
                  >
                    <Typography
                      variant="h2"
                      component="h2"
                      color="white"
                      sx={{ fontWeight: "bold", mb: 2 }}
                    >
                      {slide.heading}
                    </Typography>
                    <Typography variant="h5" color="white" sx={{ mb: 4 }}>
                      {slide.subheading}
                    </Typography>
                    {/* {slide.button_text && (
                      <Button
                        variant="contained"
                        color="primary"
                        size="large"
                        sx={{ 
                          px: 4, 
                          py: 1,
                          pointerEvents: 'auto' // Re-enable pointer events for the button
                        }}
                      >
                        {slide.button_text}
                      </Button>
                    )} */}
                  </Box>
                </Box>
              </Box>
            </SwiperSlide>
          ))}
        </Swiper>
      </Box>
    );
  };

  // Render banner grid block
  const renderBanners = (block: any) => {
    // Check if block type is BANNER_AD_GRID
    if (block.block_type !== "BANNER_AD_GRID" || !block.content?.banners) {
      return null;
    }

    const { banners, layout_style } = block.content;

    // Define grid sizes based on layout style
    const getGridSizes = () => {
      switch (layout_style) {
        case "oneColumn":
          return { xs: 12, md: 12, lg: 12 };
        case "twoColumns":
          return { xs: 12, md: 6, lg: 6 };
        case "threeColumns":
          return { xs: 12, md: 4, lg: 4 };
        case "fourColumns":
          return { xs: 12, sm: 6, md: 3, lg: 3 };
        default:
          return { xs: 12, md: 4, lg: 4 }; // Default to threeColumns
      }
    };

    // Handle banner click based on action type
    const handleBannerClick = (banner: any) => {
      if (!banner.cta_action_type || banner.cta_action_type === "NO_ACTION") {
        return; // Do nothing
      }

      if (banner.cta_action_type === "URL_LINK" && banner.action_value) {
        window.open(banner.action_value, "_blank"); // Open in new tab
      } else if (
        banner.cta_action_type === "INTERNAL_PAGE" &&
        banner.action_value
      ) {
        // Check if action_value already starts with a slash
        const actionValue = banner.action_value.startsWith('/') ? banner.action_value.substring(1) : banner.action_value;
        
        // Check if the action_value already includes the tenant slug to prevent duplication
        if (actionValue.startsWith(tenantSlug)) {
          router.push(`/${actionValue}`);
        } else {
          router.push(`/${tenantSlug}/${actionValue}`);
        }
      }
    };

    const gridSizes = getGridSizes();

    return (
      <Box sx={{ width: "100%", py: 4 }}>
        {/* {block.title && (
          <Typography variant="h4" component="h2" align="center" gutterBottom>
            {block.title}
          </Typography>
        )} */}
        <Grid container spacing={2}>
          {banners.map((banner: any) => (
            <Grid item key={banner.id} {...gridSizes}>
              <Box
                sx={{
                  position: "relative",
                  height: { xs: "200px", md: "250px" },
                  cursor:
                    banner.cta_action_type !== "NO_ACTION"
                      ? "pointer"
                      : "default",
                  overflow: "hidden",
                  borderRadius: 1,
                  "&:hover": {
                    "& img": {
                      transform: "scale(1.05)",
                    },
                    "& .banner-overlay": {
                      backgroundColor: "rgba(0,0,0,0.5)",
                    },
                  },
                }}
                onClick={() => handleBannerClick(banner)}
              >
                <Box
                  component="img"
                  src={banner.image_url}
                  alt={banner.alt_text || ""}
                  sx={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    transition: "transform 0.3s ease",
                  }}
                />
                {banner.alt_text && (
                  <Box
                    className="banner-overlay"
                    sx={{
                      position: "absolute",
                      bottom: 0,
                      left: 0,
                      width: "100%",
                      padding: 2,
                      backgroundColor: "rgba(0,0,0,0.4)",
                      transition: "background-color 0.3s ease",
                    }}
                  >
                    <Typography variant="subtitle1" color="white">
                      {banner.alt_text}
                    </Typography>
                  </Box>
                )}
              </Box>
            </Grid>
          ))}
        </Grid>
      </Box>
    );
  };

  // Handle error or loading states
  if (isLoading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          py: 8,
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (error || !landingPage) {
    return (
      <Box sx={{ py: 4 }}>
        <Typography variant="h6" color="error" align="center">
          Failed to load landing page content
        </Typography>
      </Box>
    );
  }

  return (
    <Box component="main">
      {/* Render blocks based on their type */}
      {landingPage.blocks
        .filter((block) => block.is_active)
        .sort((a, b) => a.order - b.order)
        .map((block) => (
          <Box key={block.id}>
            {block.block_type === "HERO_CAROUSEL" && renderHeroCarousel(block)}
            {block.block_type === "BANNER_AD_GRID" && renderBanners(block)}
            {/* Additional block types can be added here */}
          </Box>
        ))}

      {/* Always show categories grid at the bottom */}
      {renderCategoriesGrid()}
    </Box>
  );
};

export default LandingPage;
