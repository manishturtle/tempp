//promop-tmeplat/create

'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useRoleAccess } from "../../../../../contexts/ai-platform/RoleAccessContext";
import FeatureGuard from "../../../../../components/AIPlatform/FeatureGuard";
import CustomSnackbar from "../../../../../components/AIPlatform/snackbar/CustomSnackbar";
import {
  Box,
  Typography,
  TextField,
  Button,
  Grid,
  Paper,
  Divider,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  IconButton as MuiIconButton,
  FormControlLabel,
  Switch,
  Tooltip as MuiTooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
  useTheme,
  useMediaQuery,
  AppBar,
  Toolbar,
  Chip,
  CircularProgress,
  IconButton,
  Container,
  Tab,
  Tabs,
  Snackbar,
  Alert,
  Stack
} from '@mui/material';

import { ArrowBack as ArrowBackIcon, CompareArrows as CompareArrowsIcon, PlayArrow as PlayArrowIcon, AutoFixHigh as AutoFixHighIcon } from '@mui/icons-material';
import CompareVariantsModal from '../list/CompareVariantsModal';
import OpenInFullIcon from '@mui/icons-material/OpenInFull'; // For output expand
import CloseFullscreenIcon from '@mui/icons-material/CloseFullscreen'; // For output collapse
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckIcon from '@mui/icons-material/Check';
import { styled } from '@mui/material/styles';
import { Editor, useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { marked } from 'marked';
import Tooltip from '@mui/material/Tooltip';
import TipTapEditor from '../../../../../components/AIPlatform/TipTapEditor';
import { useParams } from 'next/navigation';
import { AI_PLATFORM_API_BASE_URL } from '@/utils/constants';
import { getAuthHeaders } from '@/app/hooks/api/auth';


// Styled components
const StyledAppBar = styled(AppBar)(({ theme }) => ({
  backgroundColor: theme.palette.background.paper,
  color: theme.palette.text.primary,
  boxShadow: 'none',
  borderBottom: `1px solid ${theme.palette.divider}`,
  position: 'sticky',
  top: 0,
  zIndex: theme.zIndex.appBar
}));

const PageContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  minHeight: '100vh',
  backgroundColor: theme.palette.background.default
}));

const StyledCard = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  borderRadius: theme.shape.borderRadius,
  border: `1px solid ${theme.palette.divider}`,
  boxShadow: 'none',
  backgroundColor: theme.palette.background.paper,
}));

// ExpandButton styled component removed as it's no longer used on general cards

interface PromptForm {
  name: string;
  description: string;
  model: string; // Stores the selected parent model's name (e.g., "ChatGPT")
  subModel: string; // Stores the selected sub-model's actual identifier (e.g., "GPT-4o")
  temperature: string;
  maxTokens: string;
  topP: string;
  frequencyPenalty: string;
  presencePenalty: string;
  inputType: string;
  outputType: string;
  systemPrompt: string;
  userPrompt: string;
  isPublished: boolean;
  isRefiningSystemPrompt: boolean;
  isRefiningUserPrompt: boolean;
}

interface ImageData {
  url: string;
  alt?: string;
  width?: number;
  height?: number;
  format?: string;
  provider?: string;
  model?: string;
  isValid?: boolean;
  [key: string]: any; // Allow additional properties
}

interface TestResult {
  model: string;
  processingTime: string;
  inputTokens: number;
  outputTokens: number;
  totalCost: string;
  testRunId: string;
  response?: string | any; // Can be string or any response object
  max_tokens?: number;
  available_credits?: number;
  availableCredits?: string;
  images?: ImageData[];
  image_count?: number;
  description?: string;
  model_metadata?: {
    name?: string;
    provider?: string;
    type?: string;
  };
} // To store the actual AI response text or image data

// Define types for API response for models and submodels
interface ApiSubModel {
  id: number | string;
  model: number; // parent model ID
  submodel_name: string; // actual ID/name for API and formData.subModel
  display_name: string;
  temperature?: string | number;
  top_p?: string | number;
  max_tokens?: string | number;
  frequency_penalty?: string | number;
  presence_penalty?: string | number;
  tools_enabled?: boolean;
  tool_list?: string[];
}

interface ApiModel {
  id: number | string;
  name: string; // e.g., "ChatGPT", "Gemini" (this is what formData.model will store)
  provider: string;
  description?: string;
  submodels: ApiSubModel[];
}

// Add this interface at the top with other interfaces




export default function PromptTemplate({ params }: { params: { tenant: string } }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Safely get tenant_slug from params using React.use()
  const tenant_slug = useParams().tenant;
  
  // Get search params
  const isEditMode = searchParams.has('edit') || searchParams.has('editVariant');
  const promptId = searchParams.get('edit') || searchParams.get('editVariant');
  const isVariantEdit = searchParams.has('editVariant');

  // State for test results and loading states
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [isLoading, setIsLoading] = useState(false); // Form submission loading state
  const [isTestLoading, setIsTestLoading] = useState(false); // Test run loading state
  const [isPageLoading, setIsPageLoading] = useState(true);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'error' | 'warning' | 'info' | 'success';
  }>({ open: false, message: '', severity: 'error' });
  
  // Get role access permissions
  const { hasPermission, hasFeatureAccess, loading: rolesLoading } = useRoleAccess();
  const [error, setError] = useState<string | null>(null); // For test panel errors
  
  // State for variant comparison
  const [compareModalOpen, setCompareModalOpen] = useState(false);
  const [displayVariants, setDisplayVariants] = useState<any[]>([]);
  const [isLoadingVariants, setIsLoadingVariants] = useState(false);
  
  // Use tenant_slug from params instead of useTenant hook if needed
  const tenantSlug = tenant_slug;
  // You might need to adjust how you get the apiBaseUrl based on your setup
  const apiBaseUrl = AI_PLATFORM_API_BASE_URL || ''; // Adjust this as needed
  const tenantLoading = false; // Set based on your needs

  // Notification state
 

  // Ref for tracking if data has been fetched
  const hasFetchedData = React.useRef(false);
  
  // Helper function to safely access URLSearchParams
  const getSearchParam = (key: string): string | null => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return params.get(key);
    }
    return null;
  };

  // State for refinement UI
  const [refining, setRefining] = useState<{
    type: 'system' | 'user' | null;
    loading: boolean;
  }>({
    type: null,
    loading: false
  });

  // Helper function to get default form data
  const getDefaultFormData = (): PromptForm => ({
    name: '',
    description: '',
    model: '',
    subModel: '',
    temperature: '0.7',
    maxTokens: '1000',
    topP: '0.9',
    frequencyPenalty: '0',
    presencePenalty: '0',
    inputType: 'text',
    outputType: 'text',
    systemPrompt: '',
    userPrompt: '',
    isPublished: false,
    isRefiningSystemPrompt: false,
    isRefiningUserPrompt: false
  });

  // Form state
  const [formData, setFormData] = useState<PromptForm>({
    name: '',
    description: '',
    model: '',
    subModel: '',
    temperature: '0.7',
    maxTokens: '1000',
    topP: '1',
    frequencyPenalty: '0',
    presencePenalty: '0',
    inputType: 'text',
    outputType: 'text',
    systemPrompt: '',
    userPrompt: '',
    isPublished: false,
    isRefiningSystemPrompt: false,
    isRefiningUserPrompt: false,
  });

  // Fetch sibling variants for comparison
  const fetchVariantsForComparison = useCallback(async () => {
    if (!promptId) return false;
    
    setIsLoadingVariants(true);
    try {
      // Fetch sibling variants using the get_siblings API endpoint
      const response = await fetch(
        `${AI_PLATFORM_API_BASE_URL}/${tenantSlug}/prompt-management/variants/${promptId}/siblings/`,
        {
          headers: {
            ...getAuthHeaders(),
          },  
        }
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch sibling variants');
      }
      
      const data = await response.json();
      
      // The API returns an object with 'siblings' array and 'current_variant' object
      // We want to include the current variant in the comparison as well
      const siblingVariants = data.siblings || [];
      
      // Add the current variant to the list of variants to compare
      if (data.current_variant) {
        setDisplayVariants([data.current_variant, ...siblingVariants]);
        return siblingVariants.length + 1 > 1; // Return true if we have at least 2 variants to compare
      }
      
      setDisplayVariants(siblingVariants);
      return siblingVariants.length > 1; // Need at least 2 variants to compare
    } catch (error) {
      console.error('Error fetching variants:', error);
      setSnackbar({
        open: true,
        message: error instanceof Error ? error.message : 'Failed to load variants for comparison',
        severity: 'error',
      });
      return false;
    } finally {
      setIsLoadingVariants(false);
    }
  }, [promptId, isEditMode]);

  // Handle click on Compare button
  const handleCompareClick = async () => {
    if (!isEditMode || !promptId) {
      setSnackbar({
        open: true,
        message: 'Please save the prompt first to compare variants',
        severity: 'info',
      });
      return;
    }
    
    const hasVariants = await fetchVariantsForComparison();
    
    if (!hasVariants) {
      setSnackbar({
        open: true,
        message: 'No other variants available for comparison.',
        severity: 'info',
      });
      return;
    }
    
    setCompareModalOpen(true);
  };

  // Handle selecting a variant from the comparison dialog
  const handleSelectVariant = (variant: any) => {
    setFormData(prev => ({
      ...prev,
      systemPrompt: variant.system_prompt || '',
      userPrompt: variant.user_prompt || '',
    }));
    setIsComparingVariants(false);
  };

  // Define the type for SelectChangeEvent
  type SelectChangeEvent = React.ChangeEvent<{ name?: string; value: unknown }>;

  // Editor instances
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
        codeBlock: false,
        blockquote: { HTMLAttributes: {} },
        listItem: { HTMLAttributes: {} },
        bulletList: { HTMLAttributes: {} },
        orderedList: { HTMLAttributes: {} },
        horizontalRule: { HTMLAttributes: {} },
      }),
    ],
    content: '',
    editable: false,
  });

  // Update editor content when test result changes
  useEffect(() => {
    if (editor && testResult?.response) {
      try {
        // Get the response content
        let contentToRender = testResult.response;

        // If it's a string that can be parsed as JSON, parse it
        if (typeof contentToRender === 'string') {
          try {
            const parsed = JSON.parse(contentToRender);
            contentToRender = parsed;
          } catch (e) {
            // Not a JSON string, use as is
            
          }
        }

        // If it's an object with a response property, use that
        if (contentToRender && typeof contentToRender === 'object' && 'response' in contentToRender) {
          contentToRender = contentToRender.response;
        }

        // Convert to string if it's an object or array
        const contentString = typeof contentToRender === 'object'
          ? JSON.stringify(contentToRender, null, 2)
          : String(contentToRender || '');

        // Set the content directly as text
        editor.commands.setContent(contentString);

      } catch (error) {
        console.error('Error updating editor content:', error);
        // Fallback to showing the raw response if there's an error
        editor.commands.setContent(JSON.stringify(testResult, null, 2));
      }
    }
  }, [testResult?.response, editor]);

  // Safe update function for form data
  const safeSetFormData = React.useCallback((data: Partial<PromptForm>) => {
    setFormData(prev => ({
      ...prev,
      ...data
    }));
  }, []);


  // Variables and test values state
  const [userPromptVariables, setUserPromptVariables] = useState<string[]>([]);
  const [variableTestValues, setVariableTestValues] = useState<Record<string, string>>({});

  // Models state
  const [apiModels, setApiModels] = useState<ApiModel[]>([]); // Stores all fetched models
  const [modelsMap, setModelsMap] = useState<Record<string, ApiSubModel[]>>({});
  const [currentSubModels, setCurrentSubModels] = useState<ApiSubModel[]>([]); // Submodels for the selected formData.model

  // UI state
  const [isOutputExpanded, setIsOutputExpanded] = useState(false);
  const [showVersionDialog, setShowVersionDialog] = useState(false);
  const [versionChoice, setVersionChoice] = useState<'new' | 'update' | null>(null);
  const [pendingSubmitData, setPendingSubmitData] = useState<any>(null);

  // Theme and responsive
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('md'));

  useEffect(() => {
    console.log('Form data updated:', formData);
  }, [formData]);

  useEffect(() => {
    const handleError = (error: ErrorEvent) => {
      console.error('Error caught:', error);
      setSnackbar({
        open: true,
        message: 'An error occurred. Please check the console for details.',
        severity: 'error'
      });
    };

    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);




  console.log('Current formData:', formData);
  console.log('Current apiModels:', apiModels);
  console.log('Current currentSubModels:', currentSubModels);


  // Add this handler function inside your PromptTemplate component


  

  const handleCopyClick = async (htmlContent: string) => {
      if (!htmlContent || htmlContent === '<p></p>' || htmlContent === '<p>\n</p>') {
        setSnackbar({ open: true, message: 'Nothing to copy', severity: 'warning' });
        return;
      }
    
      try {
        const blob = new Blob([htmlContent], { type: 'text/html' });
        const clipboardItem = new ClipboardItem({ 'text/html': blob });
        await navigator.clipboard.write([clipboardItem]);
        
        const div = document.createElement('div');
        div.innerHTML = htmlContent;
        const plainText = div.textContent || '';
        await navigator.clipboard.writeText(plainText);
        
        setSnackbar({ open: true, message: 'Copied to clipboard!', severity: 'success' });
      } catch (err) {
        console.error('Failed to copy rich text, falling back to plain text:', err);
        try {
          const div = document.createElement('div');
          div.innerHTML = htmlContent;
          const plainText = div.textContent || '';
          await navigator.clipboard.writeText(plainText);
          setSnackbar({ open: true, message: 'Copied as plain text', severity: 'info' });
        } catch (fallbackErr) {
          console.error('Failed to copy text:', fallbackErr);
          setSnackbar({ open: true, message: 'Failed to copy to clipboard', severity: 'error' });
        }
      }
    };


  // Copy to clipboard component
  const CopyButton: React.FC<{ content: string }> = ({ content }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
      try {
        await navigator.clipboard.writeText(content);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error('Failed to copy:', err);
      }
    };

    return (
      <MuiTooltip title={copied ? 'Copied!' : 'Copy to clipboard'}>
        <MuiIconButton
          size="small"
          onClick={handleCopy}
          sx={{
            position: 'absolute',
            top: 8,
            right: 8,
            opacity: 0.7,
            '&:hover': {
              opacity: 1,
              backgroundColor: 'rgba(0, 0, 0, 0.04)'
            }
          }}
        >
          {copied ? <CheckIcon fontSize="small" /> : <ContentCopyIcon fontSize="small" />}
        </MuiIconButton>
      </MuiTooltip>
    );
  };

  // Helper function to safely stringify with circular reference handling and depth limiting
  const safeStringify = (obj: any, space = 2, maxDepth = 4) => {
    const cache = new Set();
    const replacer = (key: string, value: any) => {
      if (typeof value === 'object' && value !== null) {
        if (cache.has(value)) return '[Circular]';
        cache.add(value);

        // Limit depth
        if (key.split('.').length > maxDepth) {
          return '[Object]';
        }

        // Handle large arrays
        if (Array.isArray(value) && value.length > 50) {
          return `[Array(${value.length})]`;
        }
      }
      return value;
    };

    try {
      return JSON.stringify(obj, replacer, space)
        // Add syntax highlighting for JSON
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/("\w+"):/g, '"<span style="color: #9a6e3a">$1</span>":')
        .replace(/: "(.*?)"/g, ': "<span style="color: #0b5394">$1</span>"')
        .replace(/: (\d+)/g, ': <span style="color: #1a1aa6">$1</span>')
        .replace(/: (true|false|null)/g, ': <span style="color: #aa0d91">$1</span>');
    } catch (e) {
      return String(obj);
    }
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

  // Function to fetch models and submodels based on input/output types
  const fetchModelsByTypes = React.useCallback(async (inputType: string, outputType: string) => {
    try {
      if (!apiBaseUrl || !tenantSlug) {
        console.error('API base URL or tenant slug is not available');
        return;
      }

      setIsPageLoading(true);

      // Construct the base URL with tenant slug
      const baseUrl = apiBaseUrl.endsWith('/') ? apiBaseUrl.slice(0, -1) : apiBaseUrl;
      const path = `/api/${tenantSlug}/model-configurations/models/filter`;
      const url = new URL(path, baseUrl);
      console.log("kjferhf:", url)
      // Add query parameters
      url.searchParams.append('input_type', inputType);
      url.searchParams.append('output_type', outputType);

      console.log('Fetching models from:', url.toString());
      const response = await fetch(url.toString(), {
        credentials: 'include',
        headers: {
          ...getAuthHeaders()
        },
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Failed to fetch filtered models' }));
        throw new Error(errorData.detail || 'Failed to fetch models with specified input/output types');
      }

      const result = await response.json();
      console.log('API Response:', JSON.stringify(result, null, 2));

      // Transform the API response to match our expected format
      const modelsList = result.models || [];
      console.log('Models list:', modelsList);

      const transformedModels: ApiModel[] = modelsList.map((model: any) => {
        // Map the submodels to the expected format
        const submodels = (model.submodels || []).map((sub: any) => ({
          id: sub.id,
          model: model.id,
          submodel_name: sub.name, // Using sub.name from the API
          display_name: sub.display_name || sub.name, // Fallback to sub.name if display_name is not available
          temperature: sub.parameters?.temperature?.toString() || '0.7',
          top_p: sub.parameters?.top_p?.toString() || '0.9',
          max_tokens: sub.parameters?.max_tokens?.toString() || '1000',
          frequency_penalty: sub.parameters?.frequency_penalty?.toString() || '0',
          presence_penalty: sub.parameters?.presence_penalty?.toString() || '0',
          tools_enabled: false,
          tool_list: []
        }));

        console.log(`Model ${model.name} submodels:`, submodels);
        return {
          id: model.id,
          name: model.name,
          provider: model.provider || 'Unknown',
          description: model.description || '',
          submodels: submodels
        };
      });

      console.log('Transformed models:', transformedModels);

      // Update the models list
      setApiModels(transformedModels);

      // If we have models, ensure we have a selected model and submodel
      if (transformedModels.length > 0) {
        let modelToSelect = transformedModels[0];
        let subModelToSelect: ApiSubModel | undefined;

        // If we already have a selected model, try to find it in the new list
        if (formData.model) {
          const existingModel = transformedModels.find(m => m.name === formData.model);
          if (existingModel) {
            modelToSelect = existingModel;
            // Only try to find the previously selected submodel if one was selected
            if (formData.subModel) {
              subModelToSelect = existingModel.submodels?.find(
                sm => sm.submodel_name === formData.subModel
              );
            }
            // If no submodel was selected or we couldn't find it, use the first one
            if (!subModelToSelect && existingModel.submodels?.length > 0) {
              subModelToSelect = existingModel.submodels[0];
            }
          }
        } else if (modelToSelect.submodels?.length > 0) {
          // If no model was selected, use the first submodel of the first model
          subModelToSelect = modelToSelect.submodels[0];
        }

        // Only update the form data if we have a submodel to select
        if (subModelToSelect) {
          setFormData(prev => ({
            ...prev,
            model: modelToSelect.name,
            subModel: subModelToSelect.submodel_name,
            temperature: subModelToSelect.temperature?.toString() || '0.7',
            maxTokens: subModelToSelect.max_tokens?.toString() || '1000',
            topP: subModelToSelect.top_p?.toString() || '0.9',
            frequencyPenalty: subModelToSelect.frequency_penalty?.toString() || '0',
            presencePenalty: subModelToSelect.presence_penalty?.toString() || '0',
          }));

          // Update current submodels for the selected model
          setCurrentSubModels(modelToSelect.submodels);

          console.log('Selected model and submodel:', {
            model: modelToSelect.name,
            subModel: subModelToSelect.submodel_name,
            submodels: modelToSelect.submodels
          });
        }
      } else if (formData.model) {
        // If we already have a selected model, make sure its submodels are set
        const selectedModel = transformedModels.find((m: ApiModel) => m.name === formData.model);
        if (selectedModel) {
          setCurrentSubModels(selectedModel.submodels);
        }
      }

      return transformedModels;
    } catch (error) {
      console.error('Error fetching models by types:', error);
      setSnackbar({
        open: true,
        message: error instanceof Error ? error.message : 'Failed to load models',
        severity: 'error'
      });
      return [];
    } finally {
      setIsPageLoading(false);
    }
  }, [formData.model, formData.subModel, setFormData, setSnackbar, setIsPageLoading, setCurrentSubModels]);

  const fetchAllData = React.useCallback(async () => {
    if (hasFetchedData.current || !apiBaseUrl || !tenantSlug) return;
    hasFetchedData.current = true;

    try {
      setIsPageLoading(true);

      // Initial fetch with default input/output types
      const defaultInputType = formData.inputType || 'text';
      const defaultOutputType = formData.outputType || 'text';

      await fetchModelsByTypes(defaultInputType, defaultOutputType);

      // If in edit mode, fetch the variant details
      if (isEditMode && promptId) {
        const baseUrl = apiBaseUrl.endsWith('/') ? apiBaseUrl.slice(0, -1) : apiBaseUrl;
        const path = `/api/${tenantSlug}/prompt-management/variants/${promptId}/details/`;
        const url = new URL(path, baseUrl);

        console.log('Fetching variant details from:', url.toString());

        const variantResponse = await fetch(url.toString(), {
          credentials: 'include',
          headers: {
            ...getAuthHeaders()
          },
        });

        if (!variantResponse.ok) {
          const errorData = await variantResponse.json().catch(() => ({
            detail: 'Failed to fetch variant details',
          }));
          throw new Error(errorData.detail || 'Failed to fetch variant');
        }

        const variant = await variantResponse.json();
        if (!variant) {
          throw new Error('No variant data found');
        }

        // Process the variant data
        const modelName = variant.model_name || '';
        const submodelName = variant.submodel_name || '';
        const inputType = variant.input_format || 'text';
        const outputType = variant.output_format || 'text';

        const formUpdate: Partial<PromptForm> = {
          name: variant.variant_name || '',
          description: variant.prompt_description || '',
          model: modelName,
          subModel: submodelName,
          temperature: variant.model_parameters?.temperature?.toString() || '0.7',
          maxTokens: variant.model_parameters?.max_tokens?.toString() || '1000',
          topP: variant.model_parameters?.top_p?.toString() || '0.9',
          frequencyPenalty: variant.model_parameters?.frequency_penalty?.toString() || '0',
          presencePenalty: variant.model_parameters?.presence_penalty?.toString() || '0',
          inputType,
          outputType,
          systemPrompt: variant.system_prompt || '',
          userPrompt: variant.user_prompt || '',
          isPublished: variant.is_published || false
        };

        setFormData(prev => ({
          ...getDefaultFormData(),
          ...formUpdate
        }));

        // Extract variables from user prompt if any
        const variables = extractVariables(variant.user_prompt);
        setUserPromptVariables(variables);

        // Initialize test values for variables
        const initialTestValues = variables.reduce((acc: Record<string, string>, variable) => {
          acc[variable] = '';
          return acc;
        }, {});
        setVariableTestValues(initialTestValues);
      } else if (!isEditMode) {
        // For new prompt, set default values
        setFormData(getDefaultFormData());
      }
    } catch (err) {
      console.error('Error in fetchAllData:', err);
      setSnackbar({
        open: true,
        message: err instanceof Error ? err.message : 'Error loading data',
        severity: 'error'
      });
    } finally {
      setIsPageLoading(false);
    }
  }, [isEditMode, promptId]);

  // Initial data fetch
  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // Update modelsMap when apiModels changes
  useEffect(() => {
    if (apiModels.length > 0) {
      const newModelsMap: Record<string, ApiSubModel[]> = {};
      apiModels.forEach(model => {
        newModelsMap[model.name] = model.submodels || [];
      });
      setModelsMap(newModelsMap);

      // If we have a model already selected, update its submodels
      if (formData.model && newModelsMap[formData.model]) {
        const subs = newModelsMap[formData.model] || [];
        setCurrentSubModels(subs);

        // If the current submodel doesn't exist in the new submodels, select the first one
        if (subs.length > 0 && !subs.some(sm => sm.submodel_name === formData.subModel)) {
          const firstSub = subs[0];
          setFormData(prev => ({
            ...prev,
            subModel: firstSub.submodel_name,
            temperature: firstSub.temperature?.toString() || '0.7',
            maxTokens: firstSub.max_tokens?.toString() || '1000',
            topP: firstSub.top_p?.toString() || '0.9',
            frequencyPenalty: firstSub.frequency_penalty?.toString() || '0',
            presencePenalty: firstSub.presence_penalty?.toString() || '0',
          }));
        }
      } else if (apiModels.length > 0 && !formData.model && formData.inputType && formData.outputType) {
        const firstModel = apiModels[0];
        const firstSub = firstModel.submodels?.[0];

        if (firstSub) {
          setFormData(prev => ({
            ...prev,
            model: firstModel.name,
            subModel: firstSub.submodel_name,
            temperature: firstSub.temperature?.toString() || '0.7',
            maxTokens: firstSub.max_tokens?.toString() || '1000',
            topP: firstSub.top_p?.toString() || '0.9',
            frequencyPenalty: firstSub.frequency_penalty?.toString() || '0',
            presencePenalty: firstSub.presence_penalty?.toString() || '0',
          }));
          setCurrentSubModels(firstModel.submodels || []);
        }
      }
    }
  }, [apiModels, formData.model, formData.inputType, formData.outputType, formData.subModel]);

  const handleTextChange = (field: keyof PromptForm) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({ ...prev, [field]: event.target.value }));
  };

  const handleSelectChange = (field: keyof PromptForm) => (event: SelectChangeEvent<string>) => {
    try {
      const value = event?.target?.value;
      if (value === undefined) {
        console.error('No value found in select change event', { event, field });
        return;
      }

      console.log(`Select change - Field: ${field}, Value:`, value);

      // Handle input type or output type changes
      if (field === 'inputType' || field === 'outputType') {
        // Update the form data with the new value
        setFormData(prev => ({
          ...prev,
          [field]: value,
          // Reset model and submodel when input/output types change
          model: '',
          subModel: '',
          temperature: '0.7',
          maxTokens: '1000',
          topP: '0.9',
          frequencyPenalty: '0',
          presencePenalty: '0',
        }));

        // Only fetch models if both input and output types are specified
        const inputType = field === 'inputType' ? value : formData.inputType;
        const outputType = field === 'outputType' ? value : formData.outputType;

        if (inputType && outputType) {
          fetchModelsByTypes(inputType, outputType);
        }

        return;
      }

      if (field === 'model') {
        console.log('Selected model:', value);
        const subs = modelsMap[value] || [];

        // Update current submodels
        setCurrentSubModels(subs);

        // Always select the first submodel when model changes
        if (subs.length > 0) {
          const firstSub = subs[0];
          setFormData(prev => ({
            ...prev,
            model: value,
            subModel: firstSub.submodel_name,
            temperature: firstSub.temperature?.toString() || '0.7',
            maxTokens: firstSub.max_tokens?.toString() || '1000',
            topP: firstSub.top_p?.toString() || '0.9',
            frequencyPenalty: firstSub.frequency_penalty?.toString() || '0',
            presencePenalty: firstSub.presence_penalty?.toString() || '0',
          }));
        } else {
          // If no submodels available, reset the submodel selection
          setFormData(prev => ({
            ...prev,
            model: value,
            subModel: '',
            temperature: '0.7',
            maxTokens: '1000',
            topP: '0.9',
            frequencyPenalty: '0',
            presencePenalty: '0',
          }));
        }
      } else if (field === 'subModel') {
        console.log('Handling submodel change:', value);

        // Find the selected submodel in the current model's submodels
        const selectedSub = currentSubModels.find(sm => sm.submodel_name === value);

        if (selectedSub) {
          console.log('Found selected submodel:', selectedSub);
          // Directly update the form data with the selected submodel
          setFormData(prev => ({
            ...prev,
            subModel: value,
            temperature: selectedSub.temperature?.toString() || '0.7',
            maxTokens: selectedSub.max_tokens?.toString() || '1000',
            topP: selectedSub.top_p?.toString() || '0.9',
            frequencyPenalty: selectedSub.frequency_penalty?.toString() || '0',
            presencePenalty: selectedSub.presence_penalty?.toString() || '0',
          }));
        } else {
          console.warn('Selected submodel not found in current model', {
            selectedValue: value,
            model: formData.model,
            currentSubModels: currentSubModels.map(sm => sm.submodel_name)
          });
        }
      } else {
        // For all other fields, just update the value
        setFormData(prev => ({ ...prev, [field]: value }));
      }
    } catch (error) {
      console.error('Error in handleSelectChange:', error, { field, event });
      // Set a default value to prevent undefined state
      if (field === 'inputType' || field === 'outputType') {
        setFormData(prev => ({ ...prev, [field]: 'text' }));
      }

      setSnackbar({
        open: true,
        message: error instanceof Error ? error.message : 'Error updating selection',
        severity: 'error'
      });
    }
  };

  const handleVariableTestValueChange = (variableName: string) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setVariableTestValues(prev => ({ ...prev, [variableName]: event.target.value }));
  };

  const extractVariables = (prompt: string): string[] => {
    const regex = /{{([^}]+?)}}/g;
    const matches = [...prompt.matchAll(regex)];
    const variables = new Set<string>();
    matches.forEach(match => { const varName = match[1].trim(); if (varName) variables.add(varName); });
    return Array.from(variables);
  };

  useEffect(() => {
    const detectedVars = extractVariables(formData.userPrompt);
    setUserPromptVariables(detectedVars);
    setVariableTestValues(prevValues => {
      const newValues: Record<string, string> = {};
      detectedVars.forEach(v => { newValues[v] = prevValues[v] || ''; });
      return newValues;
    });
  }, [formData.userPrompt]);

  const validateForm = (): string[] => {
    const errors: string[] = [];
    if (!formData.name.trim()) errors.push('Name is required.');
    if (!formData.model) errors.push('Model Family/Provider is required.');
    const selectedModelData = apiModels.find((m: ApiModel) => m.name === formData.model);
    if (formData.model && selectedModelData && selectedModelData.submodels?.length > 0 && !formData.subModel) {
      errors.push('Specific Model/Variant is required for the selected Model Family.');
    }
    if (!formData.inputType) errors.push('Input type is required.');
    if (!formData.outputType) errors.push('Output type is required.');
    if (!formData.systemPrompt.trim()) errors.push('System prompt is required.');
    if (!formData.userPrompt.trim()) errors.push('User prompt is required.');
    const params: (keyof PromptForm)[] = ['temperature', 'maxTokens', 'topP', 'frequencyPenalty', 'presencePenalty'];
    params.forEach(pKey => {
      if (formData[pKey] && isNaN(parseFloat(String(formData[pKey])))) {
        const paramName = pKey.replace(/([A-Z])/g, ' $1').replace(/^./, (str: string) => str.toUpperCase());
        errors.push(`${paramName} must be a valid number.`);
      }
    });
    return errors;
  };

  const handleSubmit = async (event?: React.FormEvent<HTMLFormElement>) => {
    if (event) event.preventDefault();
    const formErrors = validateForm();
    if (formErrors.length > 0) {
      setSnackbar({ open: true, message: formErrors.join(' \n'), severity: 'error' }); return;
    }

    if ((isEditMode || isVariantEdit) && !versionChoice) {
      // Store the form data and show the version choice dialog
      setPendingSubmitData(formData);
      setShowVersionDialog(true);
      return;
    }

    await submitForm(versionChoice);
  };

  // Get the next version number based on the latest version
  const getNextVersionNumber = async (promptId: string): Promise<string> => {
    try {
      // Get all versions of the prompt
      const response = await fetch(`${apiBaseUrl}/${tenantSlug}/prompt-management/prompts/${promptId}/versions/`, 
        { headers: { ...getAuthHeaders() } });
      
      if (!response.ok) {
        throw new Error('Failed to fetch versions');
      }
      const versions = await response.json();

      // Find the highest version number
      let highestVersion = 0;
      versions.forEach((version: any) => {
        const versionNum = parseInt(version.version_number.replace('v', ''));
        if (!isNaN(versionNum) && versionNum > highestVersion) {
          highestVersion = versionNum;
        }
      });

      // Return the next version number
      return `${highestVersion + 1}.0`;
    } catch (error) {
      console.error('Error getting next version number:', error);
      return '1.0'; // Default to v1 if we can't get the current version
    }
  };

  const handleVersionChoice = async (choice: 'new' | 'update') => {
    setVersionChoice(choice);
    setShowVersionDialog(false);

    if (pendingSubmitData) {
      await submitForm(choice);
      setPendingSubmitData(null);
    }
  };

  const submitForm = async (versionChoice: 'new' | 'update' | null = null) => {
    setIsLoading(true);
    setError(null);

    try {
      let url: string;
      let method: string;
      let payload: any;

      // Check if we came from webhook and get the form data
      const urlParams = new URLSearchParams(window.location.search);
      const fromWebhook = urlParams.get('fromWebhook') === 'true';
      const webhookFormData = fromWebhook ? JSON.parse(sessionStorage.getItem('webhookFormData') || '{}') : null;

      if (isVariantEdit || isEditMode) {
        if (versionChoice === 'new') {
          // Get the current prompt data to create a new version
          const response = await fetch(`${apiBaseUrl}/${tenantSlug}/prompt-management/variants/${promptId}/details/`);
          if (!response.ok) {
            throw new Error('Failed to fetch current prompt details');
          }
          const currentPrompt = await response.json();
          
          // Create new version under the existing prompt
          url = `${apiBaseUrl}/${tenantSlug}/prompt-management/prompts/${currentPrompt.prompt_id}/versions/`;
          method = 'POST';

          // Get the next version number
          const nextVersion = await getNextVersionNumber(currentPrompt.prompt_id);

          // Prepare the variant data
          const variantData = {
            variant_name: formData.name,
            system_prompt: formData.systemPrompt,
            user_prompt: formData.userPrompt,
            agentic_submodel: currentSubModels?.find(sm => sm.submodel_name === formData.subModel)?.id || null,
            model_parameters: {
              temperature: parseFloat(formData.temperature),
              max_tokens: parseInt(formData.maxTokens, 10),
              top_p: parseFloat(formData.topP),
              frequency_penalty: parseFloat(formData.frequencyPenalty),
              presence_penalty: parseFloat(formData.presencePenalty)
            },
            variables_schema: {
              type: "object",
              properties: Object.fromEntries(
                userPromptVariables.map(varName => [varName, { type: "string" }])
              )
            },
            input_format: formData.inputType,
            output_format: formData.outputType,
            is_published: false
          };

          // Prepare the version data with the variant
          payload = {
            version_number: nextVersion,
            description: 'New version',
            variants: [variantData]
          };
        } else {
          // Update existing variant
          url = `${apiBaseUrl}/${tenantSlug}/prompt-management/variants/${promptId}/details/`;
          method = 'PUT';

          payload = {
            variant_name: formData.name,
            system_prompt: formData.systemPrompt,
            user_prompt: formData.userPrompt,
            agentic_submodel: currentSubModels?.find(sm => sm.submodel_name === formData.subModel)?.id || null,
            model_parameters: {
              temperature: parseFloat(formData.temperature),
              max_tokens: parseInt(formData.maxTokens, 10),
              top_p: parseFloat(formData.topP),
              frequency_penalty: parseFloat(formData.frequencyPenalty),
              presence_penalty: parseFloat(formData.presencePenalty)
            },
            variables_schema: {
              type: "object",
              properties: {
                ...Object.fromEntries(userPromptVariables.map(varName => [
                  varName, { type: "string" }
                ]))
              }
            },
            input_format: formData.inputType,
            output_format: formData.outputType,
            prompt_description: formData.description
          };
        }
      } else {
        // Handle create new prompt flow
        url = `${apiBaseUrl}/${tenantSlug}/prompt-management/prompts/`;
        method = 'POST';

        payload = {
          name: formData.name,
          description: formData.description,
          is_template: true,
          is_published: false,
          versions: [
            {
              version_number: "1.0",
              description: "Initial version",
              variants: [
                {
                  variant_name: formData.name,
                  system_prompt: formData.systemPrompt,
                  user_prompt: formData.userPrompt,
                  agentic_submodel: currentSubModels?.find(sm => sm.submodel_name === formData.subModel)?.id || null,
                  model_parameters: {
                    temperature: parseFloat(formData.temperature),
                    max_tokens: parseInt(formData.maxTokens, 10),
                    top_p: parseFloat(formData.topP),
                    frequency_penalty: parseFloat(formData.frequencyPenalty),
                    presence_penalty: parseFloat(formData.presencePenalty)
                  },
                  variables_schema: {
                    type: "object",
                    properties: {
                      ...Object.fromEntries(userPromptVariables.map(varName => [
                        varName, { type: "string" }
                      ]))
                    }
                  },
                  input_format: formData.inputType,
                  output_format: formData.outputType,
                  is_published: false,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),

                }
              ]
            }
          ]
        };
      }

      const response = await fetch(url, {
        method,
        headers: { ...getAuthHeaders() },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: `HTTP error! Status: ${response.status}` }));
        throw new Error(errorData.detail || `HTTP error! Status: ${response.status}`);
      }

      const successMessage = isEditMode ? 'Prompt template updated successfully!' : 'Prompt template created successfully!';
      setSnackbar({ open: true, message: successMessage, severity: 'success' });

      // Get the response data for both edit and create flows
      const responseData = await response.json();

      // Check if we came from webhook creation
      const currentUrlParams = new URLSearchParams(window.location.search);
      const isFromWebhook = currentUrlParams.get('fromWebhook') === 'true';

      if (isFromWebhook && webhookFormData) {
        // Get the variant ID from the response
        let variantId;

        if (isEditMode && versionChoice === 'new') {
          // For new version, get the variant ID from the newly created version
          variantId = responseData.versions?.slice(-1)[0]?.variants?.[0]?.id;
        } else if (isEditMode) {
          // For update, get the current variant ID
          variantId = responseData.id;
        } else {
          // For new prompt, get the first variant ID
          variantId = responseData.versions?.[0]?.variants?.[0]?.id;
        }

        if (variantId) {
          // Create redirect URL based on whether we were in edit or create mode
          const redirectUrl = new URL(
            webhookFormData._isEditMode
              ? `/${tenantSlug}/Crm/ai-platform/webhook/create?id=${webhookFormData._webhookId}`
              : `/${tenantSlug}/Crm/ai-platform/webhook/create`,
            window.location.origin
          );

          // Add the variant ID and force refresh
          redirectUrl.searchParams.set('promptVariantId', variantId.toString());
          redirectUrl.searchParams.set('forceRefresh', 'true');

          // Restore webhook form data (except internal fields)
          const { _isEditMode, _webhookId, ...savedFormData } = webhookFormData;
          Object.entries(savedFormData).forEach(([key, value]) => {
            if (Array.isArray(value)) {
              value.forEach(item => redirectUrl.searchParams.append(key, item));
            } else if (value !== null && value !== undefined) {
              redirectUrl.searchParams.set(key, String(value));
            }
          });

          // Clear the session storage
          sessionStorage.removeItem('webhookFormData');

          // Use window.location to force a full page reload and reinitialize the form
          window.location.href = redirectUrl.toString();
        } else {
          console.error('Could not find variant ID in response');
          window.location.href = webhookFormData._isEditMode
            ? `/${tenantSlug}/Crm/ai-platform/webhook/create?id=${webhookFormData._webhookId}`
            : `/${tenantSlug}/Crm/ai-platform/webhook/create`;
        }
      } else if (isEditMode) {
        // For edit mode, go back to list if not from webhook
        router.push(`/${tenantSlug}/Crm/ai-platform/prompt-template/list`);
      } else {
        // For regular create flow, go to list page
        router.push(`/${tenantSlug}/Crm/ai-platform/prompt-template/list`);
      }
    } catch (err) {
      setSnackbar({ open: true, message: err instanceof Error ? err.message : 'An error occurred during submission.', severity: 'error' });
    } finally { setIsLoading(false); }
  };

  // const createWebhook = async (promptVariantId: number) => {
  //   try {
  //     const webhookPayload = {
  //       name: formData.name,
  //       published_prompt_variant: promptVariantId,
  //       webhook_secret_key: "123456",
  //       incoming_url: "http://abc1234568.com",
  //       allowed_ips: ["localhost:1010", "localhost:8050", "127.0.0.1"],
  //       webhook_context: "customer_service"
  //     };

  //     const response = await fetch(`${apiBaseUrl}/${tenantSlug}/webhook-management/webhooks/`, {
  //       method: 'POST',
  //       headers: { 'Content-Type': 'application/json' },
  //       body: JSON.stringify(webhookPayload)
  //     });

  //     if (!response.ok) {
  //       console.error('Failed to create webhook');
  //     }
  //   } catch (error) {
  //     console.error('Error creating webhook:', error);
  //   }
  // };

  const handleTest = async () => {
    if (!formData.model || !formData.subModel || !formData.userPrompt.trim()) {
      setSnackbar({ open: true, message: 'Model, Submodel, and User Prompt are required for testing.', severity: 'warning' });
      return;
    }

    setIsTestLoading(true);
    setError('');
    setTestResult(null);

    // Process variables in both system and user prompts
    const processedPrompts = {
      system_prompt: formData.systemPrompt,
      user_prompt: formData.userPrompt
    };

    // Replace variables in both prompts
    userPromptVariables.forEach(varName => {
      const regex = new RegExp(`\\{\\s*${varName}\\s*\\}`, 'g');
      processedPrompts.system_prompt = processedPrompts.system_prompt.replace(regex, variableTestValues[varName] || `{{${varName}}}`);
      processedPrompts.user_prompt = processedPrompts.user_prompt.replace(regex, variableTestValues[varName] || `{{${varName}}}`);
    });

    try {
      const response = await fetch(`${apiBaseUrl}/${tenantSlug}/prompt-management/run-prompt/`, {
        method: 'POST',
        headers: { ...getAuthHeaders() },
        body: JSON.stringify({
          input_type: formData.inputType,
          output_type: formData.outputType,
          model: formData.model,
          submodel: formData.subModel,
          system_prompt: processedPrompts.system_prompt,
          user_prompt: processedPrompts.user_prompt,
          variables: variableTestValues,
          temperature: parseFloat(formData.temperature),
          max_tokens: parseInt(formData.maxTokens, 10),
          top_p: parseFloat(formData.topP),
          frequency_penalty: parseFloat(formData.frequencyPenalty),
          presence_penalty: parseFloat(formData.presencePenalty)
        })
      });

      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        
        // Check for OpenAI quota exceeded error
        if (errorData.error && errorData.error.includes('insufficient_quota')) {
          throw new Error('OpenAI API quota exceeded. Please check your OpenAI plan and billing details.');
        }
        
        // Fallback to the original error handling
        throw new Error(errorData.detail || errorData.error || `Test run failed (status ${response.status})`);
      }

      const result = await response.json();

      


      const processedImages: ImageData[] = (result.images || []).map((img: any) => {
        try {
          // If the image URL is relative, prepend the API base URL
          let imageUrl = img.url || '';
          if (imageUrl && !imageUrl.startsWith('http')) {
            const baseUrl = `${apiBaseUrl}/${tenantSlug}`; // Update this with your actual API base URL
            imageUrl = `${baseUrl}${imageUrl.startsWith('/') ? '' : '/'}${imageUrl}`;
          }

          const processedImg: ImageData = {
            ...img,
            url: imageUrl,
            alt: img.alt || `Generated image`,
            // Ensure we have a valid URL
            isValid: !!imageUrl
          };

          console.log('Processed image:', processedImg);
          return processedImg;
        } catch (error) {
          console.error('Error processing image:', img, error);
          return {
            url: '',
            alt: 'Invalid image data',
            isValid: false
          };
        }
      }).filter((img: ImageData) => img.isValid);

      // Create the test result with proper typing
      const testResult: TestResult = {
        model: `${formData.model}${formData.subModel ? ` (${currentSubModels.find((sm: ApiSubModel) => sm.submodel_name === formData.subModel)?.display_name || formData.subModel})` : ''}`,
        processingTime: result.processing_time?.toString() ?? 'N/A',
        inputTokens: result.input_tokens ?? 0,
        outputTokens: result.output_tokens ?? 0,
        totalCost: result.credits_used?.toString() ?? 'N/A',
        testRunId: result.test_run_id || 'N/A',
        // Handle both direct response and nested response property
        response: result.response || (typeof result === 'string' ? result : JSON.stringify(result, null, 2)),
        max_tokens: result.max_tokens,
        availableCredits: result.balance_after?.toString(),
        // Include additional metadata if available
        ...(result.description && { description: result.description }),
        ...(result.model_metadata && { model_metadata: result.model_metadata }),
        // Handle image response
        ...(processedImages.length > 0 && {
          images: processedImages,
          image_count: processedImages.length
        })
      };

      console.log('Processed test result:', testResult);

      console.log("lk:", testResult.totalCost)

      setTestResult(testResult);
      setSnackbar({ open: true, message: 'Test run completed successfully!', severity: 'success' });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred during testing.';
      setError(errorMessage);
      setSnackbar({ open: true, message: errorMessage, severity: 'error' });
    } finally {
      setIsTestLoading(false);
    }
  };

  if (isPageLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 'calc(100vh - 64px)' }}>
        <CircularProgress /><Typography sx={{ ml: 2 }}>Loading template data...</Typography>
      </Box>
    );
  }

  return (
    // <FeatureGuard
    //   featureKey="workbench"
    //   permissionKey="create_prompt"
    //   fallback={
    //     <Box sx={{ p: 3, textAlign: 'center', minHeight: 'calc(100vh - 64px)' }}>
    //       <Typography variant="h5" color="error" gutterBottom>
    //         Access Denied
    //       </Typography>
    //       <Typography variant="body1">
    //         You don't have permission to access the Workbench feature.
    //         Please contact your administrator for assistance.
    //       </Typography>
    //     </Box>
    //   }
    // >
      <>
        <CustomSnackbar
          open={snackbar.open}
          message={snackbar.message}
          severity={snackbar.severity}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
        />

        <PageContainer>
        <StyledAppBar>
          <Toolbar>
            <IconButton
              edge="start"
              onClick={() => router.back()}
              sx={{ mr: 2 }}
            >
              <ArrowBackIcon />
            </IconButton>
            <Typography variant="h6" component="h1" sx={{ flexGrow: 1 }}>
              {isEditMode ? 'Edit Prompt Template' : 'Create Prompt Template'}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Button
                variant="outlined"
                color="primary"
                size="medium"
                disabled={isLoading || isPageLoading}
                onClick={() => {
                  // Check permission before publishing
                  if (hasPermission('workbench', 'publish_prompt')) {
                    // Implement publish logic here
                    console.log('Publish button clicked');
                  } else {
                    setSnackbar({
                      open: true,
                      message: 'You don\'t have permission to publish prompts',
                      severity: 'error'
                    });
                  }
                }}
              >
                Publish
              </Button>
              {
                isEditMode && (
                  <Button
                    variant="outlined"
                    color="primary"
                    size="medium"
                    disabled={isLoading || isPageLoading}
                    startIcon={<CompareArrowsIcon />}
                    onClick={handleCompareClick}
                    sx={{ ml: 1 }}
                  >
                    Compare
                  </Button>
                )
              }
              <Button
                type="submit"
                form="prompt-form"
                variant="contained"
                color="primary"
                size="medium"
                disabled={isLoading || isPageLoading || isTestLoading}
                startIcon={isLoading ? <CircularProgress size={20} color="inherit" /> : null}
                sx={{ ml: 1 }}
              >
                {isLoading ? 'Saving...' : isEditMode ? 'Update Prompt' : 'Save Prompt'}
              </Button>
              
              {/* Variant Comparison Modal */}
              <CompareVariantsModal
                open={compareModalOpen}
                onClose={() => setCompareModalOpen(false)}
                variants={displayVariants}
                onCompare={(selectedVariantIds, variables) => {
                  const variantIds = selectedVariantIds.join(',');
                  const varsString = JSON.stringify(variables);
                  router.push(`/${tenantSlug}/Crm/ai-platform/prompt-template/compare?variantIds=${variantIds}&variables=${encodeURIComponent(varsString)}`);
                }}
                tenantSlug={tenantSlug || ''}
              />
            </Box>
          </Toolbar>
        </StyledAppBar>

        <Container maxWidth="lg" sx={{ py: 4 }}>
          <form id="prompt-form" onSubmit={handleSubmit}>
            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 3 }}>
              <Box sx={{ flex: { md: '2' }, minWidth: 0 }}>
                <Stack spacing={2.5}>
                  <StyledCard>
                    <Typography variant="h6" fontWeight="medium" sx={{ mb: 2, color: 'text.primary' }}>Basic Details</Typography>
                    <Stack spacing={2}>
                      <TextField fullWidth variant="outlined" label="Name" placeholder="e.g., Email Summarizer" value={formData.name} onChange={handleTextChange('name')} size="small" required />
                      <TextField fullWidth variant="outlined" label="Description" placeholder="A short description..." multiline rows={3} value={formData.description} onChange={handleTextChange('description')} size="small" />

                    </Stack>
                  </StyledCard>

                  <StyledCard>
                    <Typography variant="h6" fontWeight="medium" sx={{ mb: 2, color: 'text.primary' }}>Input/Output Configuration</Typography>
                    <Stack spacing={2} direction={{ xs: "column", sm: "row" }}>
                      <FormControl fullWidth size="small" error={!formData?.inputType}>
                        <InputLabel id="input-type-label">Input Type</InputLabel>
                        <Select
                          labelId="input-type-label"
                          value={formData?.inputType || 'text'}
                          onChange={handleSelectChange('inputType')}
                          label="Input Type"
                        >
                          <MenuItem value="text">Text</MenuItem>
                          <MenuItem value="image">Image</MenuItem>
                          <MenuItem value="audio">Audio</MenuItem>
                          <MenuItem value="document">Document</MenuItem>
                        </Select>
                      </FormControl>
                      <FormControl fullWidth size="small" error={!formData?.outputType}>
                        <InputLabel id="output-type-label">Output Type</InputLabel>
                        <Select
                          labelId='output-type-label'
                          value={formData?.outputType || 'text'}
                          onChange={handleSelectChange('outputType')}
                          label="Output Type"
                        >
                          <MenuItem value="text">Text</MenuItem>
                          <MenuItem value="image">Image</MenuItem>
                          <MenuItem value="audio">Audio</MenuItem>
                          <MenuItem value="document">Document</MenuItem>
                        </Select>
                      </FormControl>
                    </Stack>
                  </StyledCard>

                  <StyledCard>
                    <Typography variant="h6" fontWeight="medium" sx={{ mb: 2, color: 'text.primary' }}>Model Configuration</Typography>
                    <Stack spacing={2.5}>
                      <Stack spacing={2} direction={{ xs: "column", sm: "row" }}>
                        <FormControl fullWidth size="small">
                          <InputLabel id="model-select-label">Model Family/Provider</InputLabel>
                          <Select labelId="model-select-label" value={formData.model} onChange={handleSelectChange('model')} label="Model Family/Provider">
                            {apiModels.map((model) => (<MenuItem key={model.id.toString()} value={model.name}> {model.name} ({model.provider}) </MenuItem>))}
                          </Select>
                        </FormControl>
                        <FormControl fullWidth size="small" disabled={!formData.model || currentSubModels.length === 0} key={`submodel-control-${formData.model}`}>
                          <InputLabel id="submodel-select-label">Specific Model/Variant</InputLabel>
                          <Select
                            labelId="submodel-select-label"
                            value={formData.subModel || ''}
                            onChange={handleSelectChange('subModel')}
                            label="Specific Model/Variant"
                            key={`submodel-select-${formData.model}`}
                          >
                            {currentSubModels.length > 0 ? currentSubModels.map((sub) => {
                              console.log('Rendering submodel option:', sub.submodel_name, 'selected:', formData.subModel === sub.submodel_name);
                              return (
                                <MenuItem
                                  key={sub.id.toString()}
                                  value={sub.submodel_name}
                                >
                                  {sub.display_name || sub.submodel_name}
                                </MenuItem>
                              );
                            }) : (
                              <MenuItem value="" disabled>
                                {formData.model ? "No variants available" : "Select model family first"}
                              </MenuItem>
                            )}
                          </Select>
                        </FormControl>
                      </Stack>
                      {formData.subModel && (
                        <>
                          <Typography variant="subtitle1" sx={{ mt: 1, mb: 0, fontWeight: 'medium' }}>Parameters</Typography>
                          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' }, gap: 2 }}>
                            <TextField fullWidth type="number" variant="outlined" label="Temperature" value={formData.temperature} onChange={handleTextChange('temperature')} size="small" inputProps={{ step: "0.1", min: "0", max: "2" }} />
                            <TextField fullWidth type="number" variant="outlined" label="Max Tokens" value={formData.maxTokens} onChange={handleTextChange('maxTokens')} size="small" inputProps={{ step: "1", min: "1" }} />
                            <TextField fullWidth type="number" variant="outlined" label="Top P" value={formData.topP} onChange={handleTextChange('topP')} size="small" inputProps={{ step: "0.1", min: "0", max: "1" }} />
                            <TextField fullWidth type="number" variant="outlined" label="Frequency Penalty" value={formData.frequencyPenalty} onChange={handleTextChange('frequencyPenalty')} size="small" inputProps={{ step: "0.1", min: "-2", max: "2" }} />
                            <TextField fullWidth type="number" variant="outlined" label="Presence Penalty" value={formData.presencePenalty} onChange={handleTextChange('presencePenalty')} size="small" inputProps={{ step: "0.1", min: "-2", max: "2" }} />
                          </Box>
                        </>
                      )}
                    </Stack>
                  </StyledCard>

                  <StyledCard>
                    <Typography variant="h6" fontWeight="medium" sx={{ mb: 2, color: 'text.primary' }}>Prompt Definition</Typography>
                    <Stack spacing={2.5}>
                      <Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                          <Typography variant="subtitle1" sx={{ fontWeight: 'medium' }}>System Prompt</Typography>
                          <Tooltip title="Refine system prompt">
                          

                            <IconButton
                              size="small"
                              onClick={async () => {
                                if (!hasPermission('workbench', 'improvise_prompt')) {
                                  setSnackbar({
                                    open: true,
                                    message: 'You don\'t have permission to improvise prompts',
                                    severity: 'error'
                                  });
                                  return;
                                }
                                if (!formData.systemPrompt.trim()) {
                                  setSnackbar({
                                    open: true,
                                    message: 'Please enter some text to refine',
                                    severity: 'warning'
                                  });
                                  return;
                                }
                                setRefining({ type: 'system', loading: true });
                                try {
                                  const response = await fetch(`${apiBaseUrl}/${tenantSlug}/prompt-improvise/`, {
                                    method: 'POST',
                                    headers: {
                                      ...getAuthHeaders()
                                    },
                                    body: JSON.stringify({
                                      prompt_topic: formData.systemPrompt,
                                      prompt_type: 'system_prompt'
                                    }),
                                  });

                                  if (!response.ok) {
                                    throw new Error('Failed to refine prompt');
                                  }

                                  const data = await response.json();
                                  setFormData(prev => ({ ...prev, systemPrompt: data.generated_prompt }));
                                  setSnackbar({
                                    open: true,
                                    message: 'Prompt refined successfully!',
                                    severity: 'success',
                                  });
                                } catch (error) {
                                  console.error('Error refining prompt:', error);
                                  setSnackbar({
                                    open: true,
                                    message: error instanceof Error ? error.message : 'Failed to refine prompt',
                                    severity: 'error',
                                  });
                                } finally {
                                  setRefining({ type: null, loading: false });
                                }
                              }}
                              disabled={refining.loading}
                            >
                              {refining.loading && refining.type === 'system' ?
                                <CircularProgress size={20} /> :
                                <AutoFixHighIcon fontSize="small" />
                              }
                            </IconButton>
                            <Tooltip title="Copy system prompt">
                              <IconButton 
                                size="small" 
                                onClick={() => handleCopyClick(formData.systemPrompt)}
                                aria-label="Copy system prompt"
                              >
                                <ContentCopyIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Tooltip>

                        </Box>
                       
                        <TipTapEditor
                          initialContent={renderContent(formData.systemPrompt)}
                          onUpdate={({ editor }) => {
                            setFormData(prev => ({
                              ...prev,
                              systemPrompt: editor.getHTML(),
                            }));
                          }}
                        />

                      </Box>
                      <Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                          <Typography variant="subtitle1" sx={{ fontWeight: 'medium' }}>
                            User Prompt
                            <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 0.5 }}>
                              (Use {`{{variable_name}}`} for placeholders)
                            </Typography>
                          </Typography>
                          <Tooltip title="Refine user prompt">
                            <IconButton
                              size="small"
                              onClick={async () => {
                                if (!hasPermission('workbench', 'improvise_prompt')) {
                                  setSnackbar({
                                    open: true,
                                    message: 'You don\'t have permission to improvise prompts',
                                    severity: 'error'
                                  });
                                  return;
                                }
                                if (!formData.userPrompt.trim()) {
                                  setSnackbar({
                                    open: true,
                                    message: 'Please enter some text to refine',
                                    severity: 'warning'
                                  });
                                  return;
                                }
                                setRefining({ type: 'user', loading: true });
                                try {
                                  const response = await fetch(`${apiBaseUrl}/${tenantSlug}/prompt-improvise/`, {
                                    method: 'POST',
                                    headers: {
                                      ...getAuthHeaders()
                                    },
                                    body: JSON.stringify({
                                      prompt_topic: formData.userPrompt,
                                      prompt_type: 'user_prompt'
                                    }),
                                  });

                                  if (!response.ok) {
                                    throw new Error('Failed to refine prompt');
                                  }

                                  const data = await response.json();
                                  setFormData(prev => ({ ...prev, userPrompt: data.generated_prompt }));
                                  setSnackbar({
                                    open: true,
                                    message: 'Prompt refined successfully!',
                                    severity: 'success',
                                  });
                                } catch (error) {
                                  console.error('Error refining prompt:', error);
                                  setSnackbar({
                                    open: true,
                                    message: error instanceof Error ? error.message : 'Failed to refine prompt',
                                    severity: 'error',
                                  });
                                } finally {
                                  setRefining({ type: null, loading: false });
                                }
                              }}
                              disabled={refining.loading}
                            >
                              {refining.loading && refining.type === 'user' ?
                                <CircularProgress size={20} /> :
                                <AutoFixHighIcon fontSize="small" />
                              }
                            </IconButton>
                            <Tooltip title="Copy user prompt">
                              <IconButton 
                                size="small" 
                                onClick={() => handleCopyClick(formData.userPrompt)}
                                aria-label="Copy user prompt"
                              >
                                <ContentCopyIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Tooltip>
                        </Box>


                        <TipTapEditor
                          initialContent={renderContent(formData.userPrompt)}
                          onUpdate={({ editor }) => {
                            setFormData(prev => ({
                              ...prev,
                              userPrompt: editor.getHTML(),
                            }));
                          }}
                        />
                      </Box>
                      {userPromptVariables.length > 0 && (
                        <Box mt={1}>
                          <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 'medium' }}>Test Values for Variables</Typography>
                          <Paper variant="outlined" sx={{ p: 2, backgroundColor: 'action.hover' }}>
                            <Stack spacing={1.5}>
                              {userPromptVariables.map(variable => (
                                <TextField key={variable} fullWidth variant="filled" label={`Test value for {{${variable}}}`} value={variableTestValues[variable] || ''} onChange={handleVariableTestValueChange(variable)} size="small" />
                              ))}
                            </Stack>
                          </Paper>
                        </Box>
                      )}
                    </Stack>
                  </StyledCard>
                </Stack>
              </Box>

              <Box sx={{ flex: { md: '1' }, minWidth: 0, position: { md: 'sticky' }, top: { md: '88px' }, alignSelf: { md: 'flex-start' } }}>
                <StyledCard>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6" fontWeight="medium" sx={{ color: 'text.primary' }}>Test & Preview</Typography>
                    <Button
                      variant="contained"
                      color="secondary"
                      onClick={() => {
                        if (hasPermission('workbench', 'test_run')) {
                          handleTest();
                        } else {
                          setSnackbar({
                            open: true,
                            message: 'You don\'t have permission to run prompt tests',
                            severity: 'error'
                          });
                        }
                      }}
                      startIcon={isTestLoading ? <CircularProgress size={18} color="inherit" /> : <PlayArrowIcon />}
                      size="small"
                      disabled={isTestLoading || isPageLoading}
                      sx={{ textTransform: 'none' }}
                    >
                      {isTestLoading ? 'Testing...' : 'Run Test'}
                    </Button>
                  </Box>
                  <Box sx={{ mb: 2, width: '100%' }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                      <Typography variant="subtitle1" fontWeight="medium">Output Preview</Typography>
                      <Box>
                        <Tooltip title={isOutputExpanded ? 'Collapse output' : 'Expand output'}>
                          <IconButton
                            onClick={() => setIsOutputExpanded(!isOutputExpanded)}
                            size="small"
                            aria-label={isOutputExpanded ? 'Collapse output' : 'Expand output'}
                            sx={{ ml: 1 }}
                          >
                            {isOutputExpanded ? <CloseFullscreenIcon fontSize="small" /> : <OpenInFullIcon fontSize="small" />}
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </Box>
                    {error && (
                      <Alert
                        severity="error"
                        sx={{
                          mb: 2,
                          wordBreak: 'break-word',
                          whiteSpace: 'pre-wrap',
                          maxWidth: '100%',
                          overflow: 'hidden'
                        }}
                      >
                        {error}
                      </Alert>
                    )}
                    <Paper
                      variant="outlined"
                      sx={{
                        p: 2,
                        minHeight: 350,
                        backgroundColor: 'grey.50',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: isTestLoading ? 'center' : 'flex-start',
                        justifyContent: isTestLoading ? 'center' : 'flex-start',
                        overflow: 'auto',
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                        maxHeight: '400px',
                        width: '100%',
                        position: 'relative',
                        '&:hover': {
                          boxShadow: 1,
                        },
                      }}
                    >
                      {isTestLoading ? (
                        <CircularProgress />
                      ) : testResult?.testRunId ? (
                        <Box sx={{ width: '100%', maxWidth: '100%', overflow: 'auto' }}>
                          {formData.outputType === 'image' && testResult.images && testResult.images.length > 0 ? (
                            <Box sx={{ width: '100%' }}>
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                                <Typography variant="overline" color="text.secondary">
                                  Generated {testResult.images.length} {testResult.images.length === 1 ? 'Image' : 'Images'}
                                </Typography>
                                {testResult.model_metadata?.provider && (
                                  <Chip
                                    size="small"
                                    label={testResult.model_metadata.provider}
                                    sx={{ ml: 1, textTransform: 'capitalize' }}
                                  />
                                )}
                              </Box>
                              {testResult.description && (
                                <Box sx={{ mb: 2, p: 1.5, bgcolor: 'action.hover', borderRadius: 1 }}>
                                  <Typography variant="body2" color="text.secondary">
                                    {testResult.description || ''}
                                  </Typography>
                                </Box>
                              )}
                              <Box sx={{
                                display: 'grid',
                                gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
                                gap: 2,
                                mt: 2
                              }}>
                                {testResult.images?.map((img: ImageData, index: number) => {
                                  console.log(`Rendering image ${index}:`, img);
                                  return (
                                    <Box
                                      key={index}
                                      sx={{
                                        position: 'relative',
                                        pt: '100%',
                                        borderRadius: 1,
                                        overflow: 'hidden',
                                        border: '1px solid',
                                        borderColor: 'divider',
                                        bgcolor: 'background.paper',
                                      }}
                                    >
                                      {img.url ? (() => {
                                        const imageBaseUrl = apiBaseUrl ? new URL(apiBaseUrl).origin : '';
                                        const correctedImagePath = img.url.replace(/\/api\/.*\/media\//, '/media/');


                                        return (
                                          <img
                                            src={correctedImagePath}
                                            alt={img.alt || `Generated image ${index + 1}`}
                                            title={img.alt || `Generated image ${index + 1}`}
                                            onError={(e) => {
                                              console.error('Error loading image:', img, 'Attempted Full URL:', correctedImagePath);
                                              const target = e.target as HTMLImageElement;
                                              target.alt = 'Failed to load image';
                                              target.style.backgroundColor = '#ffebee';
                                            }}
                                            style={{
                                              position: 'absolute',
                                              top: 0,
                                              left: 0,
                                              width: '100%',
                                              height: '100%',
                                              objectFit: 'cover',
                                              backgroundColor: '#f5f5f5',
                                            }}
                                          />
                                        );
                                      })() : (
                                        <Box sx={{
                                          position: 'absolute',
                                          top: 0,
                                          left: 0,
                                          width: '100%',
                                          height: '100%',
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          bgcolor: '#ffebee',
                                          color: 'error.main',
                                          p: 2,
                                          textAlign: 'center',
                                          fontSize: '0.875rem',
                                        }}>
                                          Failed to load image
                                        </Box>
                                      )}
                                      {img.width && img.height && (
                                        <Typography
                                          variant="caption"
                                          sx={{
                                            position: 'absolute',
                                            bottom: 4,
                                            right: 4,
                                            bgcolor: 'rgba(0,0,0,0.6)',
                                            color: 'white',
                                            px: 0.5,
                                            borderRadius: 0.5,
                                            fontSize: '0.65rem',
                                          }}
                                        >
                                          {img.width}×{img.height}
                                        </Typography>
                                      )}
                                    </Box>
                                  );
                                })}
                              </Box>
                            </Box>
                          ) : testResult.response ? (
                            // <Box sx={{ width: '100%' }}>

                            <TipTapEditor
                              initialContent={renderContent(testResult.response)}
                              editable={false} // Set to false for a read-only view
                            />
                            // </Box>
                          ) : null}
                        </Box>
                      ) : !error ? (
                        <Typography color="text.secondary" sx={{ m: 'auto', textAlign: 'center' }}>
                          Click "RUN TEST" to preview the prompt output.
                        </Typography>
                      ) : null}
                    </Paper>

                    {/* Full Screen Output Modal */}
                    <Dialog
                      fullScreen={fullScreen}
                      open={isOutputExpanded}
                      onClose={() => setIsOutputExpanded(false)}
                      aria-labelledby="output-dialog-title"
                      maxWidth="md"
                      fullWidth
                    >
                      <DialogTitle id="output-dialog-title">
                        Test Output
                        <IconButton
                          aria-label="close"
                          onClick={() => setIsOutputExpanded(false)}
                          sx={{
                            position: 'absolute',
                            right: 8,
                            top: 8,
                            color: (theme) => theme.palette.grey[500],
                          }}
                        >
                          <CloseFullscreenIcon />
                        </IconButton>
                      </DialogTitle>
                      <DialogContent dividers>
                        {testResult?.description && (
                          <Box sx={{ mb: 3, p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
                            <Typography variant="subtitle2" gutterBottom>Image Description</Typography>
                            <Typography variant="body2" color="text.secondary">
                              {testResult?.description || ''}
                            </Typography>
                          </Box>
                        )}
                        {formData.outputType === 'image' && testResult?.images ? (
                          <Box sx={{ width: '100%' }}>
                            <Typography variant="h6" gutterBottom>Generated Images</Typography>
                            <Box sx={{
                              display: 'grid',
                              gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' },
                              gap: 3,
                              mt: 2
                            }}>
                              {testResult.images.map((img, index) => (
                                <Box
                                  key={index}
                                  sx={{
                                    position: 'relative',
                                    pt: '100%',
                                    borderRadius: 1,
                                    overflow: 'hidden',
                                    border: '1px solid',
                                    borderColor: 'divider',
                                  }}
                                >
                                  <img
                                    src={img.url}
                                    alt={img.alt || `Generated image ${index + 1}`}
                                    onError={(e) => {
                                      const target = e.target as HTMLImageElement;
                                      target.alt = 'Failed to load image';
                                      target.style.backgroundColor = '#ffebee';
                                    }}
                                    style={{
                                      position: 'absolute',
                                      top: 0,
                                      left: 0,
                                      width: '100%',
                                      height: '100%',
                                      objectFit: 'cover',
                                      backgroundColor: '#f5f5f5',
                                    }}
                                  />
                                </Box>
                              ))}
                            </Box>
                          </Box>
                        ) : testResult?.response ? (
                          <Box sx={{ width: '100%' }}>
                            <Typography variant="h6" gutterBottom>AI Response</Typography>
                            <Box
                              component="pre"
                              sx={{
                                margin: 0,
                                whiteSpace: 'pre-wrap',
                                wordWrap: 'break-word',
                                fontFamily: 'monospace',
                                fontSize: '0.875rem',
                                lineHeight: 1.5,
                                overflowX: 'auto',
                                maxWidth: '100%',
                                p: 2,
                                bgcolor: 'grey.50',
                                borderRadius: 1,
                                border: '1px solid',
                                borderColor: 'divider',
                              }}
                            >
                              <TipTapEditor
                                initialContent={renderContent(testResult.response)}
                                editable={false} // Set to false for a read-only view
                              />
                            </Box>
                          </Box>
                        ) : null}
                      </DialogContent>
                      <DialogActions>
                        <Button
                          onClick={() => setIsOutputExpanded(false)}
                          variant="contained"
                          color="primary"
                          size="small"
                          sx={{ m: 1 }}
                        >
                          Close
                        </Button>
                      </DialogActions>
                    </Dialog>
                  </Box>
                  {/* Redundant metadata already incorporated into the main testResult display above or can be if needed */}
                  {/* {testResult && ( <Box> ... </Box> )} */}
                  {testResult && ( // This metadata section might be redundant if info is in the box above
                    <Box>
                      <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 'medium' }}>Test Run Metadata</Typography>
                      <Stack spacing={0.5}> {/* Reduced spacing */}
                        {[
                          { label: "Model", value: testResult.model },
                          { label: "Processing Time", value: `${testResult.processingTime} ms` },
                          { label: "Credits Used", value: testResult.totalCost },
                          { label: "Available Credits", value: testResult.availableCredits },
                        ].map(item => (
                          <Box key={item.label} sx={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Typography variant="body2" color="text.secondary">{item.label}</Typography>
                            <Typography variant="body2">{item.value}</Typography>
                          </Box>
                        ))}
                      </Stack>
                    </Box>
                  )}
                </StyledCard>
              </Box>
            </Box>
          </form>
        </Container>
      </PageContainer>

      {/* Version Choice Dialog */}
      <Dialog
        open={showVersionDialog}
        onClose={() => setShowVersionDialog(false)}
        aria-labelledby="version-dialog-title"
      >
        <DialogTitle id="version-dialog-title">
          Choose Update Type
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            Do you want to create a new version of this prompt or update the existing one?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => handleVersionChoice('update')} color="primary">
            Update Existing
          </Button>
          <Button onClick={() => handleVersionChoice('new')} color="primary" variant="contained">
            Create New Version
          </Button>
        </DialogActions>
      </Dialog>

      <CustomSnackbar 
        open={snackbar.open}
        message={snackbar.message}
        severity={snackbar.severity as AlertColor}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      />


    </>
    // </FeatureGuard>
  );

}