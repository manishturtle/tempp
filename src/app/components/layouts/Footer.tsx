'use client';

import React from 'react';
import { 
  Box, 
  Container, 
  Typography, 
  Grid, 
  Link as MuiLink,
  Divider,
  IconButton,
  Stack,
  useTheme
} from '@mui/material';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { 
  Facebook, 
  Twitter, 
  Instagram, 
  LinkedIn, 
  YouTube,
  Email,
  Phone,
  LocationOn
} from '@mui/icons-material';

export function Footer() {
  const { t } = useTranslation('common');
  const theme = useTheme();
  const currentYear = new Date().getFullYear();

  const footerLinks = [
    {
      title: "Shop",
      links: [
        { name: "Products", href: '/store/product' },
        { name: "Categories", href: '/categories' },
        { name: "New Arrivals", href: '/products/new-arrivals' },
        { name: "Special Offer", href: '/products/special-offers' }
      ]
    },
    {
      title: "Customer Service",
      links: [
        { name: "Contact Us", href: '/contact' },
        { name: "FAQ", href: '/faq' },
        { name: "Shipping Policy", href: '/shipping-policy' },
        { name: "Returns Policy", href: '/returns-policy' }
      ]
    },
    {
      title: "About Us",
      links: [
        { name: "Our Story", href: '/about' },
        { name: "Blog", href: '/blog' },
        { name: "Careers", href: '/careers' },
        { name: "Privacy Policy", href: '/privacy-policy' }
      ]
    }
  ];

  return (
    <Box
      component="footer"
      sx={{
        py: 4,
        px: 2,
        mt: 'auto',
        backgroundColor: theme => 
          theme.palette.mode === 'light' 
            ? theme.palette.grey[100] 
            : theme.palette.grey[900]
      }}
    >
      <Container maxWidth="xl">
        <Grid container spacing={4} justifyContent="space-between">
          {/* Company Info */}
          <Grid item xs={12} sm={6} md={3}>
            <Typography variant="h6" color="text.primary" gutterBottom>
              TurtleSoft Store
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Quality Products for Everyone
            </Typography>
            <Stack direction="row" spacing={1}>
              <IconButton color="primary" aria-label="facebook">
                <Facebook />
              </IconButton>
              <IconButton color="primary" aria-label="twitter">
                <Twitter />
              </IconButton>
              <IconButton color="primary" aria-label="instagram">
                <Instagram />
              </IconButton>
              <IconButton color="primary" aria-label="linkedin">
                <LinkedIn />
              </IconButton>
            </Stack>
          </Grid>

          {/* Footer Links */}
          {footerLinks.map((section) => (
            <Grid item xs={12} sm={6} md={2} key={section.title}>
              <Typography variant="h6" color="text.primary" gutterBottom>
                {section.title}
              </Typography>
              <Box component="ul" sx={{ m: 0, p: 0, listStyle: 'none' }}>
                {section.links.map((link) => (
                  <Box component="li" key={link.name} sx={{ py: 0.5 }}>
                    <MuiLink
                      component={Link}
                      href={link.href}
                      color="text.secondary"
                      sx={{ 
                        textDecoration: 'none',
                        '&:hover': { 
                          color: 'primary.main',
                          textDecoration: 'underline' 
                        } 
                      }}
                    >
                      {link.name}
                    </MuiLink>
                  </Box>
                ))}
              </Box>
            </Grid>
          ))}

          {/* Contact Info */}
          <Grid item xs={12} sm={6} md={3}>
            <Typography variant="h6" color="text.primary" gutterBottom>
              Contact Us
            </Typography>
            <Stack spacing={2}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Email sx={{ mr: 1, color: 'text.secondary' }} />
                <Typography variant="body2" color="text.secondary">
                  support@turtlesoft.com
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Phone sx={{ mr: 1, color: 'text.secondary' }} />
                <Typography variant="body2" color="text.secondary">
                  +1 (555) 123-4567
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <LocationOn sx={{ mr: 1, color: 'text.secondary' }} />
                <Typography variant="body2" color="text.secondary">
                  123 Commerce St, Business City
                </Typography>
              </Box>
            </Stack>
          </Grid>
        </Grid>

        <Divider sx={{ my: 3 }} />
        
        <Box sx={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap' }}>
          <Typography variant="body2" color="text.secondary">
            © {currentYear} TurtleSoft Store. All Rights Reserved
          </Typography>
          <Box>
            <MuiLink 
              component={Link} 
              href="/terms" 
              color="text.secondary"
              sx={{ 
                mr: 2, 
                textDecoration: 'none',
                '&:hover': { textDecoration: 'underline' } 
              }}
            >
              Terms of Service
            </MuiLink>
            <MuiLink 
              component={Link} 
              href="/privacy" 
              color="text.secondary"
              sx={{ 
                textDecoration: 'none',
                '&:hover': { textDecoration: 'underline' } 
              }}
            >
              Privacy Policy
            </MuiLink>
          </Box>
        </Box>
      </Container>
    </Box>
  );
}
