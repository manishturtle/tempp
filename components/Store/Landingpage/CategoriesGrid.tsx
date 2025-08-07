import { Box, Container, Typography } from '@mui/material';
import { CategoryCard } from './CategoryCard';
import { useTheme } from '@mui/material/styles';

export interface Subcategory {
  id: number;
  name: string;
  image: string | null;
  image_alt_text: string;
}

export interface Category {
  id: number;
  name: string;
  image: string | null;
  image_alt_text: string;
  subcategories: Subcategory[];
}

interface CategoriesGridProps {
  categories: Category[];
  title?: string;
}

export const CategoriesGrid = ({ categories, title = 'Shop by Category' }: CategoriesGridProps) => {
  const theme = useTheme();

  if (!categories?.length) {
    return null;
  }

  return (
    <Box sx={{ width: '100%', py: 6 }}>
      <Container maxWidth={false} sx={{ maxWidth: theme.breakpoints.values.xl, px: { xs: 2, sm: 3, md: 4 } }}>
        <Box sx={{ maxWidth: theme.breakpoints.values.lg, mx: 'auto' }}>
          <Typography variant="h4" component="h2" gutterBottom sx={{ 
            mb: 6, 
            textAlign: 'center',
            fontWeight: 700,
            color: 'text.primary',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            [theme.breakpoints.down('sm')]: {
              fontSize: '1.75rem',
              mb: 4,
            },
            '&:after': {
              content: '""',
              display: 'block',
              width: '80px',
              height: '4px',
              backgroundColor: theme.palette.primary.main,
              margin: '16px auto 0',
              borderRadius: '2px',
            }
          }}>
            {title}
          </Typography>
        </Box>
        <Box
          sx={{
            display: 'grid',
            gap: 3,
            gridTemplateColumns: {
              xs: 'repeat(1, 1fr)',
              sm: 'repeat(3, 1fr)',
              md: 'repeat(5, 1fr)',
              lg: 'repeat(6, 1fr)',
              xl: 'repeat(7, 1fr)',
            },
            '& > *': {
              minWidth: 0, // Prevent grid items from overflowing
            },
            width: '100%',
            maxWidth: '100%',
            mx: 'auto',
          }}
        >
          {categories.map((category) => (
            <Box key={category.id} sx={{ display: 'flex', height: '100%' }}>
              <CategoryCard 
                id={category.id}
                name={category.name}
                image={category.image}
                image_alt_text={category.image_alt_text}
                subcategories={category.subcategories}
              />
            </Box>
          ))}
        </Box>
      </Container>
    </Box>
  );
};

export default CategoriesGrid;
