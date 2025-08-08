"use client";

/**
 * Attributes Index Page
 * 
 * This page serves as a navigation hub for all attribute-related pages
 */
import React from 'react';
import { Typography, Box, Container, Grid, Paper, Breadcrumbs, Link } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'next/navigation';
import CategoryIcon from '@mui/icons-material/Category';
import ListAltIcon from '@mui/icons-material/ListAlt';
import StyleIcon from '@mui/icons-material/Style';

export default function AttributesIndexPage() {
  const { t } = useTranslation();
  const router = useRouter();

  const sections = [
    {
      title: t('attributes.attributeGroups'),
      description: t('attributes.attributeGroups.description'),
      icon: <CategoryIcon fontSize="large" color="primary" />,
      path: '/Masters/attributes/attribute-groups'
    },
    {
      title: t('attributes.attributes'),
      description: t('attributes.attributes.description'),
      icon: <ListAltIcon fontSize="large" color="primary" />,
      path: '/Masters/attributes/attributes'
    },
    {
      title: t('attributes.attributeOptions'),
      description: t('attributes.attributeOptions.description'),
      icon: <StyleIcon fontSize="large" color="primary" />,
      path: '/Masters/attributes/attribute-options'
    }
  ];

  return (
    <Container maxWidth="lg">
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          {t('common.attributes')}
        </Typography>
        <Breadcrumbs aria-label="breadcrumb">
          <Link color="inherit" href="/Masters">
            {t('common.masters')}
          </Link>
          <Typography color="textPrimary">{t('common.attributes')}</Typography>
        </Breadcrumbs>
        <Typography variant="subtitle1" color="text.secondary" sx={{ mt: 1 }}>
          {t('attributes.indexDescription')}
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {sections.map((section) => (
          <Grid item xs={12} md={4} key={section.path}>
            <Paper
              sx={{
                p: 3,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
                height: '100%',
                cursor: 'pointer',
                transition: 'all 0.3s',
                '&:hover': {
                  transform: 'translateY(-5px)',
                  boxShadow: 6
                }
              }}
              onClick={() => router.push(section.path)}
            >
              <Box sx={{ mb: 2 }}>{section.icon}</Box>
              <Typography variant="h6" component="h2" gutterBottom>
                {section.title}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {section.description}
              </Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>
    </Container>
  );
}
