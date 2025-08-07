import { Card, CardActionArea, CardMedia, CardContent, Typography, Box, useMediaQuery } from '@mui/material';
import { useTheme, alpha } from '@mui/material/styles';
import { useRouter } from 'next/navigation';
import { Subcategory } from './CategoriesGrid';

interface CategoryCardProps {
  id: number;
  name: string;
  image: string | null;
  image_alt_text: string;
  subcategories: Subcategory[];
}

export const CategoryCard = ({
  id,
  name,
  image,
  image_alt_text,
  subcategories = []
}: CategoryCardProps) => {
  const theme = useTheme();
  const router = useRouter();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const handleClick = () => {
    // Get the current path to extract tenant
    const pathParts = window.location.pathname.split('/');
    const tenantSlug = pathParts[1]; // Get the tenant slug from the URL
    
    // Navigate to store product page with category filter and tenant slug
    router.push(`/${tenantSlug}/store/product?category=${id}`);
  };

  // Get first 3 subcategories for display
  const displaySubcategories = subcategories.slice(0, 3);
  const hasMoreSubcategories = subcategories.length > 3;

  return (
    <Card
      sx={{
        height: '100%',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        transition: 'all 0.3s ease-in-out',
        position: 'relative',
        overflow: 'hidden',
        borderRadius: theme.shape.borderRadius * 1.5,
        boxShadow: theme.shadows[2],
        '&:hover': {
          transform: 'translateY(-8px)',
          boxShadow: theme.shadows[8],
          '& .category-overlay': {
            opacity: 1,
            visibility: 'visible',
          },
        },
      }}
      elevation={0}
    >
      <CardActionArea 
        onClick={handleClick} 
        sx={{ 
          height: '100%', 
          display: 'flex', 
          flexDirection: 'column',
          alignItems: 'stretch',
          '&:hover .category-image': {
            transform: 'scale(1.05)',
          },
        }}
      >
        {/* Image Container */}
        <Box sx={{ 
          position: 'relative', 
          paddingTop: '100%',
          overflow: 'hidden',
          backgroundColor: theme.palette.grey[100],
        }}>
          <CardMedia
            className="category-image"
            component="img"
            image={image || '/placeholder-category.jpg'}
            alt={image_alt_text || name}
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              transition: 'transform 0.5s ease-in-out',
            }}
          />
          
          {/* Overlay on hover */}
          <Box 
            className="category-overlay"
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: `linear-gradient(to top, ${alpha(theme.palette.primary.dark, 0.8)} 0%, ${alpha(theme.palette.primary.main, 0.1)} 100%)`,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'flex-end',
              padding: theme.spacing(2),
              opacity: 0,
              visibility: 'hidden',
              transition: 'all 0.3s ease-in-out',
            }}
          >
            <Typography 
              variant="h6" 
              component="div" 
              sx={{ 
                color: theme.palette.common.white,
                fontWeight: 600,
                textShadow: '0 1px 2px rgba(0,0,0,0.3)',
                mb: 1,
              }}
            >
              {name}
            </Typography>
            {displaySubcategories.length > 0 && (
              <Box sx={{ mt: 1 }}>
                <Typography 
                  variant="caption" 
                  sx={{ 
                    color: theme.palette.common.white,
                    display: 'block',
                    mb: 0.5,
                    opacity: 0.9,
                  }}
                >
                  Popular in {name}:
                </Typography>
                <Box component="ul" sx={{ pl: 2, m: 0, listStyle: 'none' }}>
                  {displaySubcategories.map((sub) => (
                    <Typography 
                      key={sub.id} 
                      component="li"
                      variant="caption"
                      sx={{ 
                        color: theme.palette.common.white,
                        '&:before': {
                          content: '"•"',
                          display: 'inline-block',
                          mx: 0.5,
                          color: theme.palette.secondary.main,
                        }
                      }}
                    >
                      {sub.name}
                    </Typography>
                  ))}
                  {hasMoreSubcategories && (
                    <Typography 
                      variant="caption"
                      sx={{ 
                        color: theme.palette.common.white,
                        fontStyle: 'italic',
                        display: 'block',
                        mt: 0.5,
                      }}
                    >
                      +{subcategories.length - 3} more
                    </Typography>
                  )}
                </Box>
              </Box>
            )}
          </Box>
        </Box>
        
        {/* Category Name */}
        <CardContent 
          sx={{ 
            flexGrow: 1, 
            p: 2,
            textAlign: 'center',
            backgroundColor: theme.palette.background.paper,
            borderTop: `1px solid ${theme.palette.divider}`,
          }}
        >
          <Typography 
            variant="subtitle1" 
            component="div" 
            sx={{ 
              fontWeight: 500,
              color: theme.palette.text.primary,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {name}
          </Typography>
          {!isMobile && subcategories.length > 0 && (
            <Typography 
              variant="caption" 
              color="text.secondary"
              sx={{
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                height: '2.8em',
                lineHeight: 1.4,
                mt: 0.5,
              }}
            >
              {subcategories.slice(0, 3).map(sc => sc.name).join(' • ')}
              {subcategories.length > 3 && ' • ...'}
            </Typography>
          )}
        </CardContent>
      </CardActionArea>
    </Card>
  );
};

export default CategoryCard;
