'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTenant } from '../../../../../contexts/ai-platform/TenantContext';
import {
  Box,
  Typography,
  Paper,
  Grid as MuiGrid,
  Divider,
  Button,
  CircularProgress,
  Alert,
  Tabs,
  Tab,
  Card,
  CardContent,
  Chip,
  IconButton,
  Tooltip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  GridProps,
} from '@mui/material';
import { ArrowBack as ArrowBackIcon, ContentCopy as ContentCopyIcon } from '@mui/icons-material';
import TipTapEditor from '../../../../../components/AIPlatform/TipTapEditor';
import { marked } from 'marked';
// import { CopyButton } from '@/components/CopyButton';

interface PromptVariantResult {
  variant_id: number;
  status: 'success' | 'error';
  prompt_variant: {
    id: number;
    variant_name: string;
    system_prompt: string;
    user_prompt: string;
    prompt_name: string;
    version_number: string;
  };
  response?: {
    content: string;
    usage?: {
      prompt_tokens: number;
      completion_tokens: number;
      total_tokens: number;
    };
  };
  error?: string;
  usage?: {
    input_tokens: number;
    output_tokens: number;
    total_tokens: number;
    credits_used: number;
  };
}

interface CompareResults {
  results: PromptVariantResult[];
  timestamp: string;
}

export default function CompareVariantsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { tenantSlug, apiBaseUrl } = useTenant();
  
  const [results, setResults] = useState<PromptVariantResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;
    let isMounted = true;
    let isFetching = false;
    
    const fetchComparisonResults = async () => {
      // Prevent multiple simultaneous fetches
      if (isFetching || !isMounted) return;
      isFetching = true;

      try {
        setIsLoading(true);
        setError(null);
        
        // Get and validate variant IDs
        const variantIdsParam = searchParams.get('variantIds');
        if (!variantIdsParam) {
          throw new Error('No variants selected for comparison');
        }
        
        // Parse variant IDs
        const variantIds = variantIdsParam.split(',').filter(Boolean).map(Number);
        if (variantIds.length === 0) {
          throw new Error('No valid variant IDs provided');
        }
        
        // Parse variables
        let variables: Record<number, Record<string, any>> = {};
        const variablesParam = searchParams.get('variables');
        
        if (variablesParam) {
          try {
            const parsedVars = JSON.parse(decodeURIComponent(variablesParam));
            Object.entries(parsedVars).forEach(([key, value]) => {
              const id = typeof key === 'string' ? parseInt(key, 10) : key;
              if (!isNaN(id)) {
                variables[id] = value as Record<string, any>;
              }
            });
          } catch (e) {
            console.warn('Failed to parse variables, continuing without them', e);
          }
        }

        // Prepare the request payload
        const payload = {
          variants: variantIds.map(variantId => ({
            variant_id: variantId,
            variables: variables[variantId] || {}
          }))
        };

        console.log('Sending payload to API:', JSON.stringify(payload, null, 2));
        
        const endpoint = `${apiBaseUrl}/${tenantSlug}/prompt-management/run-multiple-variants/`;
        console.log('API Endpoint:', endpoint);
        
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
          },
          body: JSON.stringify(payload),
          signal
        });

        if (!response.ok) {
          let errorMessage = `HTTP error! status: ${response.status}`;
          try {
            const errorData = await response.json();
            console.error('API Error Response:', errorData);
            errorMessage = errorData.detail || errorData.message || JSON.stringify(errorData);
          } catch (e) {
            console.error('Failed to parse error response:', e);
          }
          throw new Error(`Failed to compare variants: ${errorMessage}`);
        }
        
        const data: CompareResults = await response.json();
        
        if (isMounted) {
          setResults(data.results || []);
        }
      } catch (err) {
        if (isMounted) {
          console.error('Error comparing variants:', err);
          setError(err instanceof Error ? err.message : 'An unknown error occurred');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
          isFetching = false;
        }
      }
    };

    // Only fetch if we have required data and not already fetching
    if (tenantSlug && apiBaseUrl && !isFetching) {
      fetchComparisonResults();
    }
    
    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [tenantSlug, apiBaseUrl, searchParams]);
  

  const handleCopyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

    const renderContent = (content: any): string => {
      try {
        // If content is an object with a response property, use that
        if (content && typeof content === 'object' && 'response' in content) {
          return renderContent(content.response);
        }
  
        // If content is already a string
        if (typeof content === 'string') {
          // Check if it's a JSON string
          try {
            const parsed = JSON.parse(content);
            // If it's a JSON object with a response property, use that
            if (parsed && typeof parsed === 'object' && 'response' in parsed) {
              return renderContent(parsed.response);
            }
            // Otherwise, format as JSON
            return `<pre style="margin: 0; white-space: pre-wrap; word-break: break-word;">${safeStringify(parsed)}</pre>`;
          } catch {
            // Check if it's markdown
            const isMarkdown = /^#|\*\*|`{3}|- \[[x\s]\]|!\[.*\]\(.*\)/.test(content);
            if (isMarkdown) {
              return marked.parse(content) as string;
            }
  
            // For non-markdown content, normalize multiple newlines to single newline, then replace with <br>
            return content
              .replace(/\r\n/g, '\n')  // Normalize Windows line endings
              .replace(/\n{2,}/g, '\n') // Replace multiple newlines with single
              .replace(/\n/g, '<br>');   // Then replace single newlines with <br>
          }
        }
        // If content is an object, format it as JSON
        else if (typeof content === 'object' && content !== null) {
          return `<pre style="margin: 0; white-space: pre-wrap; word-break: break-word;">${safeStringify(content)}</pre>`;
        }
        // For any other case, convert to string
        return String(content);
      } catch (error) {
        console.error('Error rendering content:', error);
        const errorContent = typeof content === 'string' ? content : safeStringify(content);
        return (
          <>
            <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
              <code>{errorContent}</code>
            </pre>
            <CopyButton content={errorContent} />
          </>
        );
      }
    };
  

  const filteredResults = results.filter((result) => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    try {
      return (
        (result.prompt_variant?.variant_name?.toLowerCase() || '').includes(searchLower) ||
        (result.prompt_variant?.prompt_name?.toLowerCase() || '').includes(searchLower) ||
        (result.status === 'success' && (result.response?.content?.toLowerCase() || '').includes(searchLower)) ||
        (result.status === 'error' && (result.error?.toLowerCase() || '').includes(searchLower))
      );
    } catch (err) {
      console.error('Error filtering results:', err, result);
      return false;
    }
  });

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
        <Typography variant="body1" sx={{ ml: 2 }}>Loading comparison results...</Typography>
      </Box>
    );
  }


  if (error) {
    return (
      <Box p={3}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <Button
          variant="outlined"
          startIcon={<ArrowBackIcon />}
          onClick={() => router.back()}
        >
          Go Back
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, bgcolor: '#f5f5f5', minHeight: '100vh' }}>
      <Box sx={{ maxWidth: 1400, mx: 'auto' }}>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box display="flex" alignItems="center">
            <IconButton onClick={() => router.back()} sx={{ mr: 1 }}>
              <ArrowBackIcon />
            </IconButton>
            <Typography variant="h5" fontWeight="bold">Compare Prompt Variants</Typography>
          </Box>
          <TextField
            size="small"
            placeholder="Search results..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            sx={{ width: 300, bgcolor: 'white' }}
          />
        </Box>

        {/* Main content */}
        <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
          {filteredResults.map((result, index) => (
            <Paper 
              key={result.variant_id} 
              elevation={0}
              sx={{ 
                flex: '1 1 300px',
                minWidth: 300,
                bgcolor: 'white',
                borderRadius: 2,
                overflow: 'hidden',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
              }}
            >
              {/* Variant header */}
              <Box 
                sx={{ 
                  bgcolor: 'primary.main', 
                  color: 'white',
                  p: 2,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <Box>
                  <Typography variant="subtitle1" fontWeight="bold">
                    {result.prompt_variant.variant_name}
                  </Typography>
                  <Typography variant="caption" sx={{ opacity: 0.8 }}>
                    {result.prompt_variant.prompt_name} (v{result.prompt_variant.version_number})
                  </Typography>
                </Box>
                <Chip
                  label={result.status === 'success' ? 'Success' : 'Error'}
                  color={result.status === 'success' ? 'success' : 'error'}
                  size="small"
                  sx={{ color: 'white', fontWeight: 'bold' }}
                />
              </Box>

              {/* Content */}
              <Box sx={{ p: 2 }}>
                {/* System Prompt */}
                <Box mb={3}>
                  <Typography variant="subtitle2" fontWeight="bold" mb={1}>
                    System Prompt
                  </Typography>
                  <Paper
                    variant="outlined"
                    sx={{
                      p: 2,
                      bgcolor: '#fafafa',
                      borderRadius: 1,
                      whiteSpace: 'pre-wrap',
                      fontFamily: 'monospace',
                      fontSize: '0.875rem',
                      minHeight: 100,
                      maxHeight: 200,
                      overflow: 'auto'
                    }}
                  >
                    {/* {result.prompt_variant.system_prompt || 'No system prompt'} */}
                     <TipTapEditor
                                              initialContent={renderContent(result.prompt_variant.system_prompt)}
                                             editable={false}
                                            />
                    
                  </Paper>
                </Box>


                {/* User Prompt */}
                <Box mb={3}>
                  <Typography variant="subtitle2" fontWeight="bold" mb={1}>
                    User Prompt
                  </Typography>
                  <Paper
                    variant="outlined"
                    sx={{
                      p: 2,
                      bgcolor: '#fafafa',
                      borderRadius: 1,
                      whiteSpace: 'pre-wrap',
                      fontFamily: 'monospace',
                      fontSize: '0.875rem',
                      minHeight: 80,
                      maxHeight: 150,
                      overflow: 'auto'
                    }}
                  >
                    {/* {result.prompt_variant.user_prompt || 'No user prompt'}
                     */}
                     <TipTapEditor
                                              initialContent={renderContent(result.prompt_variant.user_prompt)}
                                             editable={false}
                                            />
                  </Paper>
                </Box>


                {/* Response */}
                <Box>
                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                    <Typography variant="subtitle2" fontWeight="bold">
                      Response
                    </Typography>
                    <Tooltip title={copiedIndex === index ? 'Copied!' : 'Copy to clipboard'}>
                      <IconButton
                        size="small"
                        onClick={() => handleCopyToClipboard(result.response?.content || '', index)}
                      >
                        <ContentCopyIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                  <Paper
                    variant="outlined"
                    sx={{
                      p: 2,
                      bgcolor: '#fafafa',
                      borderRadius: 1,
                      whiteSpace: 'pre-wrap',
                      fontFamily: 'monospace',
                      fontSize: '0.875rem',
                      minHeight: 150,
                      maxHeight: 300,
                      overflow: 'auto'
                    }}
                  >
                    {result.status === 'success' ? (
                      <TipTapEditor
                        initialContent={renderContent(result.response?.content)}
                        editable={false}
                      />
                    ) : (
                      <Typography color="error">
                        {result.error || 'An error occurred while generating the response'}
                      </Typography>
                    )}
                  </Paper>
                </Box>

                {/* Token Usage */}
                {result.usage && (
                  <Box mt={2} textAlign="right">
                    <Chip
                      size="small"
                      label={
                        <Typography variant="caption">
                          Tokens: {result.usage.input_tokens} in / {result.usage.output_tokens} out / {result.usage.total_tokens} total
                        </Typography>
                      }
                      variant="outlined"
                    />
                  </Box>
                )}
              </Box>
            </Paper>
          ))}
        </Box>
      </Box>
    </Box>
  );
}
