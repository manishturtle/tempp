"use client";

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { getAuthHeaders } from "@/app/hooks/api/auth";
import { COCKPIT_API_BASE_URL } from '@/utils/constants';

import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActionArea,
  CircularProgress,
  useTheme,
  Container,
  Button
} from '@mui/material';

export default function SourceSelection() {
  const router = useRouter();
  const params = useParams();
  const { t } = useTranslation();
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [sources, setSources] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const tenantSlug = params?.tenant as string;

  useEffect(() => {
     fetchSources();
  }, [router, tenantSlug]);
  
  const fetchSources = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`${COCKPIT_API_BASE_URL}/${tenantSlug}/tenant-admin/auth-config/sources/`, {
        method: 'GET',
        headers: {
          ...getAuthHeaders(),
        },
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch sources: ${response.statusText}`);
      }
      
      const data = await response.json();
      if (data && Array.isArray(data.sources)) {
        setSources(data.sources);
      } else {
        setSources([]);
      }
    } catch (error) {
      console.error('Error fetching sources:', error);
      setError('Failed to load sources. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSourceSelect = (sourceId: string) => {
    router.push(`/${tenantSlug}/Crm/tenant-admin/tenant-login-configurations?source_id=${sourceId}`);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }
  
  if (error) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box sx={{ 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          justifyContent: 'center', 
          height: '50vh' 
        }}>
          <Typography color="error" gutterBottom>
            {error}
          </Typography>
          <Button 
            variant="contained" 
            onClick={() => fetchSources()}
            sx={{ mt: 2 }}
          >
            {t('common.retry', 'Retry')}
          </Button>
        </Box>
      </Container>
    );
  }
  
  if (sources.length === 0) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box sx={{ mb: 4 }}>
          <Typography variant="h5" component="h1" gutterBottom>
            {t('sources.selectSource', 'Select Source')}
          </Typography>
          <Typography variant="body1" color="text.secondary">
            {t('sources.noSourcesAvailable', 'No sources available for this tenant')}
          </Typography>
        </Box>
      </Container>
    );
  }

  return (
    <>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" component="h1" gutterBottom>
          {t('sources.selectSource', 'Select Source')}
        </Typography>
        <Typography variant="body1" color="text.secondary">
          {t('sources.selectSourceDescription', 'Choose a source to configure authentication settings')}
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {sources.map((source) => (
          <Grid item xs={12} sm={6} md={4} key={source.source_id}>
            <Card 
              variant="outlined"
              sx={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                transition: 'all 0.3s ease',
                borderColor: 'transparent',
                boxShadow: 1,
                position: 'relative',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: 3,
                  borderColor: theme.palette.primary.light,
                },
              }}
            >
              {/* {source.has_auth_config && (
                <Box
                  sx={{
                    position: 'absolute',
                    top: 12,
                    right: 12,
                    bgcolor: theme.palette.success.main,
                    color: '#fff',
                    fontSize: '0.7rem',
                    fontWeight: 'medium',
                    py: 0.3,
                    px: 1,
                    borderRadius: 4,
                    zIndex: 2,
                  }}
                >
                  {t('sources.configExists', 'Configured')}
                </Box>
              )} */}
              <CardActionArea 
                onClick={() => handleSourceSelect(source.source_id)}
                sx={{ 
                  flexGrow: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'stretch',
                  height: '100%',
                }}
              >
                <Box 
                  sx={{ 
                    p: 3,
                    display: 'flex',
                    flexDirection: 'column',
                    height: '100%',
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                    {source.icon_url ? (
                      <Box
                        component="img"
                        src={source.icon_url}
                        alt={source.source_name}
                        sx={{
                          width: 56,
                          height: 56,
                          borderRadius: '12px',
                          objectFit: 'cover',
                          mr: 2,
                          flexShrink: 0,
                        }}
                      />
                    ) : (
                      <Box
                        sx={{
                          width: 56,
                          height: 56,
                          borderRadius: '12px',
                          bgcolor: theme.palette.primary.main,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow: `0 4px 8px ${theme.palette.primary.main}40`,
                          mr: 2,
                          flexShrink: 0,
                        }}
                      >
                        <Typography 
                          variant="h5" 
                          sx={{ 
                            color: '#fff',
                            fontWeight: 'bold',
                          }}
                        >
                          {source.source_name?.charAt(0)?.toUpperCase() || '?'}
                        </Typography>
                      </Box>
                    )}
                    <Box>
                      <Typography 
                        variant="h6" 
                        component="h2" 
                        sx={{ 
                          fontWeight: 600,
                          mb: 0.7,
                          color: theme.palette.text.primary,
                        }}
                      >
                        {source.source_name}
                      </Typography>
                      <Typography 
                        variant="caption" 
                        sx={{ 
                          color: theme.palette.text.secondary,
                          bgcolor: theme.palette.grey[100],
                          py: 0.3,
                          px: 1,
                          borderRadius: 1,
                          fontWeight: 500,
                          display: 'inline-block',
                        }}
                      >
                        ID: {source.source_id}
                      </Typography>
                    </Box>
                  </Box>
                  
                  <Box 
                    sx={{
                      py: 1.5,
                      mt: 'auto',
                      borderTop: `1px solid ${theme.palette.divider}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        display: 'flex',
                        alignItems: 'center',
                        color: theme.palette.text.secondary,
                      }}
                    >
                      {t('sources.application', 'Application')}:
                      <Typography 
                        component="span" 
                        variant="body2" 
                        color="text.primary" 
                        sx={{ fontWeight: 500, ml: 0.5 }}
                      >
                        {source.app_name}
                      </Typography>
                    </Typography>
                  </Box>
                </Box>
              </CardActionArea>
            </Card>
          </Grid>
        ))}
      </Grid>
    </>
  );
}
