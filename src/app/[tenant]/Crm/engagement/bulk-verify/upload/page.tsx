'use client';

import React, { useState } from 'react';
import { useForm, Controller, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { 
  Container, 
  Typography, 
  TextField, 
  Button, 
  Box, 
  Alert, 
  CircularProgress, 
  Radio,
  RadioGroup,
  FormControlLabel,
  Paper,
  Card,
  CardContent
} from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import EmailIcon from '@mui/icons-material/Email';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import NextLink from 'next/link';
import { useParams } from 'next/navigation';
import { bulkUploadFormSchema, BulkUploadFormValues } from '../../../../../utils/engagement/validations/emailVerificationSchemas';
import { useUploadBulkListMutation } from '../../../../../hooks/engagement/evs/useUploadBulkListMutation';

const MAX_FILE_SIZE_MB = 5; // Should match the value in the schema

export default function BulkUploadPage() {
  const params = useParams();
  const tenantSlug = params?.tenantSlug as string;
  
  // State to control whether to show the form or success message
  const [showForm, setShowForm] = useState(true);
  const [jobId, setJobId] = useState<string | null>(null);
  const [uploadMethod, setUploadMethod] = useState<'file' | 'manual'>('file');
  
  const uploadMutation = useUploadBulkListMutation(tenantSlug);

  const { control, handleSubmit, formState: { errors }, reset: resetForm, setValue } = useForm<BulkUploadFormValues>({
    resolver: zodResolver(bulkUploadFormSchema),
    defaultValues: {
      uploadType: 'file',
      jobName: '',
      emailListFile: undefined,
      manualEmails: '',
    },
  });

  // Update form values when upload method changes
  const handleUploadMethodChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = event.target.value as 'file' | 'manual';
    setUploadMethod(newValue);
    setValue('uploadType', newValue);
  };

  // Reference to file input element
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  // Function to reset the form and show it again
  const handleStartOver = () => {
    resetForm();
    setUploadMethod('file');
    setValue('uploadType', 'file');
    setValue('jobName', '');
    setValue('emailListFile', undefined);
    setValue('manualEmails', '');
    
    // Reset file input by clearing its value
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    
    setShowForm(true);
  };

  const onSubmit: SubmitHandler<BulkUploadFormValues> = async (data) => {
    // Prepare form data for API submission
    const formData = new FormData();
    
    // Add job name if provided
    if (data.jobName) {
      formData.append('job_name', data.jobName);
    }
    
    // Add emails based on upload type
    if (data.uploadType === 'file' && data.emailListFile instanceof FileList && data.emailListFile.length > 0) {
      formData.append('file', data.emailListFile[0]);
    } else if (data.uploadType === 'manual' && data.manualEmails) {
      // Create a text file from manual emails
      const emailsBlob = new Blob([data.manualEmails], { type: 'text/plain' });
      formData.append('file', emailsBlob, 'manual_emails.txt');
    }
    
    try {
      // Submit to the API
      const response = await uploadMutation.mutateAsync(formData);
      
      // Check if we have a successful response
      if (response?.jobId) {
        console.log('Job submitted successfully:', response.jobId);
        
        // Store the job ID and show success message
        setJobId(response.jobId);
        
        // Hide the form, show success message
        setShowForm(false);
      }
    } catch (error) {
      console.error('Upload failed:', error);
      // Error handling is managed by the mutation
    }
  };

  return (
    <Container maxWidth="lg">
      {showForm ? (
        // Form View
        <Paper sx={{ p: 4, borderRadius: 1 }}>
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6">Select a method to feed email addresses for verification</Typography>
          </Box>

          <form onSubmit={handleSubmit(onSubmit)}>
            {/* Method Selection Section */}
            <Box sx={{ mb: 4 }}>
              <Typography variant="subtitle1" sx={{ mb: 2 }}>How would you like to add email addresses?</Typography>
              
              <Controller
                name="uploadType"
                control={control}
                render={({ field }) => (
                  <RadioGroup
                    {...field}
                    value={uploadMethod}
                    onChange={handleUploadMethodChange}
                    sx={{ width: '100%' }}
                  >
                    <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 2 }}>
                      {/* File Upload Option */}
                      <Box 
                        sx={{ 
                          flex: 1, 
                          border: '1px solid', 
                          borderColor: uploadMethod === 'file' ? '#f5821f' : '#e0e0e0',
                          borderRadius: 1,
                          p: 3,
                          minHeight: '300px',
                          position: 'relative',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'center',
                          alignItems: 'center'
                        }}
                      >
                        <FormControlLabel
                          value="file"
                          control={<Radio 
                            sx={{ 
                              position: 'absolute', 
                              right: 8, 
                              top: 8,
                              color: uploadMethod === 'file' ? '#f5821f' : undefined,
                              '&.Mui-checked': {
                                color: '#f5821f',
                              },
                            }} 
                          />}
                          label=""
                          sx={{ 
                            position: 'absolute',
                            right: 0,
                            top: 0,
                            m: 0
                          }}
                        />
                        <Box sx={{ 
                          width: 60, 
                          height: 60, 
                          borderRadius: '50%', 
                          bgcolor: '#f5821f',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          mb: 2
                        }}>
                          <UploadFileIcon sx={{ color: 'white', fontSize: 30 }} />
                        </Box>
                        <Typography variant="h6" align="center" sx={{ mb: 1 }}>File Upload</Typography>
                      </Box>

                      {/* Manual Entry Option */}
                      <Box 
                        sx={{ 
                          flex: 1, 
                          border: '1px solid', 
                          borderColor: uploadMethod === 'manual' ? '#f5821f' : '#e0e0e0',
                          borderRadius: 1,
                          p: 3,
                          minHeight: '300px',
                          position: 'relative',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'center',
                          alignItems: 'center'
                        }}
                      >
                        <FormControlLabel
                          value="manual"
                          control={<Radio 
                            sx={{ 
                              position: 'absolute', 
                              right: 8, 
                              top: 8,
                              color: uploadMethod === 'manual' ? '#f5821f' : undefined,
                              '&.Mui-checked': {
                                color: '#f5821f',
                              },
                            }} 
                          />}
                          label=""
                          sx={{ 
                            position: 'absolute',
                            right: 0,
                            top: 0,
                            m: 0
                          }}
                        />
                        <Box sx={{ 
                          width: 60, 
                          height: 60, 
                          borderRadius: '50%', 
                          bgcolor: '#e0e0e0',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          mb: 2
                        }}>
                          <EmailIcon sx={{ color: '#757575', fontSize: 30 }} />
                        </Box>
                        <Typography variant="h6" align="center" sx={{ mb: 1 }}>Enter Manually</Typography>
                      </Box>
                    </Box>
                  </RadioGroup>
                )}
              />
            </Box>

            {/* Optional Job Name */}
            <Box sx={{ mb: 3 }}>
              <Controller
                name="jobName"
                control={control}
                render={({ field, fieldState }) => (
                  <>
                    <TextField
                      {...field}
                      label="Job Name (Optional)"
                      fullWidth
                      variant="outlined"
                      error={!!fieldState.error}
                      sx={{ 
                        '& .MuiOutlinedInput-root': {
                          borderRadius: '4px',
                        }
                      }}
                    />
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                      Give your verification job a name for easier identification
                    </Typography>
                  </>
                )}
              />
            </Box>

            {/* File Upload Section */}
            {uploadMethod === 'file' && (
              <Box sx={{ mb: 3 }}>
                <Controller
                  name="emailListFile"
                  control={control}
                  render={({ field: { onChange, onBlur, name, ref }, fieldState }) => (
                    <>
                      <Box 
                        sx={{
                          border: '1px solid #e0e0e0',
                          borderRadius: '4px',
                          p: 1,
                        }}
                      >
                        <input
                          type="file"
                          onChange={(e) => {
                            const target = e.target as HTMLInputElement;
                            if (target.files) {
                              onChange(target.files);
                            }
                          }}
                          onBlur={onBlur}
                          name={name}
                          ref={(e) => {
                            ref(e);
                            fileInputRef.current = e; // Store ref for manual reset
                          }}
                          accept=".csv, .txt, text/csv, text/plain, application/vnd.ms-excel"
                          style={{ width: '100%' }}
                        />
                      </Box>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                        Select your .csv or .txt file. Maximum size: {MAX_FILE_SIZE_MB}MB
                      </Typography>
                      {fieldState.error && (
                        <Typography variant="caption" color="error" sx={{ display: 'block', mt: 0.5 }}>
                          {fieldState.error.message}
                        </Typography>
                      )}
                    </>
                  )}
                />
              </Box>
            )}

            {/* Manual Email Entry Section */}
            {uploadMethod === 'manual' && (
              <Box sx={{ mb: 3 }}>
                <Controller
                  name="manualEmails"
                  control={control}
                  render={({ field, fieldState }) => (
                    <>
                      <TextField
                        {...field}
                        multiline
                        rows={10}
                        fullWidth
                        placeholder="example1@domain.com, example2@domain.com, example3@domain.com"
                        variant="outlined"
                        error={!!fieldState.error}
                        sx={{ 
                          '& .MuiOutlinedInput-root': {
                            borderRadius: '4px',
                          }
                        }}
                      />
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                        {fieldState.error?.message || "You can paste up to 1,000 email addresses at once"}
                      </Typography>
                    </>
                  )}
                />
              </Box>
            )}

            {/* Submit Button */}
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 4 }}>
              <Button 
                type="submit" 
                variant="contained" 
                sx={{ 
                  py: 1, 
                  px: 3, 
                  bgcolor: '#f5821f', 
                  '&:hover': {
                    bgcolor: '#e67812'
                  },
                  borderRadius: '4px',
                  textTransform: 'none',
                  fontWeight: 'normal'
                }}
                disabled={uploadMutation.isPending}
                endIcon={uploadMutation.isPending ? <CircularProgress size={20} color="inherit" /> : <ArrowForwardIcon />}
              >
                {uploadMutation.isPending ? 'Processing...' : 'Next'}
              </Button>
            </Box>
          </form>

          {/* Only show error alert inline */}
          {uploadMutation.isError && (
            <Alert severity="error" sx={{ mt: 3 }}>
              Upload failed: {uploadMutation.error?.message || 'An unknown error occurred.'}
            </Alert>
          )}
        </Paper>
      ) : (
        // Success View
        <Paper sx={{ p: 4, borderRadius: 1 }}>
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <CheckCircleIcon sx={{ fontSize: 80, color: '#4caf50', mb: 2 }} />
            <Typography variant="h5" gutterBottom>Job Submitted Successfully!</Typography>
            <Typography variant="body1" sx={{ mb: 3 }}>
              Your job has been submitted with ID: <strong>{jobId}</strong>
            </Typography>
            
            <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, mt: 4 }}>
              <Button
                variant="outlined"
                onClick={handleStartOver}
                sx={{ 
                  borderColor: '#f5821f', 
                  color: '#f5821f',
                  '&:hover': {
                    borderColor: '#e67812',
                    backgroundColor: 'rgba(245, 130, 31, 0.04)'
                  }
                }}
              >
                Submit Another Job
              </Button>
              
              <Button
                variant="contained"
                component={NextLink}
                href={`/${tenantSlug}/Crm/engagement/bulk-verify/status`}
                sx={{ 
                  bgcolor: '#f5821f', 
                  '&:hover': {
                    bgcolor: '#e67812'
                  }
                }}
              >
                View Job Status
              </Button>
            </Box>
          </Box>
        </Paper>
      )}
    </Container>
  );
}
