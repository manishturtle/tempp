'use client';

import React, { useState, useEffect } from 'react';
import { Controller, useFormContext, useWatch } from 'react-hook-form';
import { useParams } from 'next/navigation';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import FormControl from '@mui/material/FormControl';
import RadioGroup from '@mui/material/RadioGroup';
import FormControlLabel from '@mui/material/FormControlLabel';
import Radio from '@mui/material/Radio';
import TextField from '@mui/material/TextField';
import Autocomplete from '@mui/material/Autocomplete';
import CircularProgress from '@mui/material/CircularProgress';
import Paper from '@mui/material/Paper';
import Grid from '@mui/material/Grid';
import FormHelperText from '@mui/material/FormHelperText';
// import { useTranslation } from 'react-i18next';
import { CampaignWizardFormData } from './NewCampaignFormWizard'; // Adjust path
import { useGetMessageTemplates } from '../../../../hooks/engagement/marketing/useMessageTemplates'; // Adjust path
import useDebounce from '../../../../hooks/useDebounce'; // Adjust path
import { MessageTemplate, EmailContentDefinition } from '../../../../types/engagement/marketing'; // Adjust path

const CampaignStepContent: React.FC = () => {
  // const { t } = useTranslation();
  const { control, setValue, getValues, formState: { errors } } = useFormContext<CampaignWizardFormData>();

  const contentType = useWatch({ control, name: 'contentType' });
  const sourceTemplateId = useWatch({ control, name: 'source_template_id' });
  const { tenantSlug } = useParams<{ tenantSlug: string }>();

  const [templateSearchTerm, setTemplateSearchTerm] = useState('');
  const debouncedTemplateSearchTerm = useDebounce(templateSearchTerm, 500);
  const [selectedTemplateObject, setSelectedTemplateObject] = useState<MessageTemplate | null>(null);

  const { data: templatesData, isLoading: isLoadingTemplates } = useGetMessageTemplates(
    tenantSlug,
    1, // page
    debouncedTemplateSearchTerm,
    'EMAIL' // Fixed channel type
  );

  // Effect to update selectedTemplateObject when sourceTemplateId changes (e.g., on form load with initialData)
  useEffect(() => {
    if (sourceTemplateId && templatesData?.results) {
      const foundTemplate = templatesData.results.find(t => t.id === sourceTemplateId);
      if (foundTemplate) setSelectedTemplateObject(foundTemplate);
    } else if (!sourceTemplateId) {
        setSelectedTemplateObject(null);
    }
  }, [sourceTemplateId, templatesData]);


  // Effect to prefill or clear fields when contentType changes or template is selected/deselected
  useEffect(() => {
    if (contentType === 'use_template' && selectedTemplateObject) {
      const templateContent = selectedTemplateObject.content_definition as EmailContentDefinition;
      // Prefill overrides with template content, user can then edit these.
      // Or, if overrides should start blank, don't prefill.
      // Let's assume overrides start blank unless form is loaded with existing override data.
      // If getValues().overrides are all empty, then prefill.
      const currentOverrides = getValues('overrides');
      if (!currentOverrides?.subject && !currentOverrides?.body_html && !currentOverrides?.body_text) {
        setValue('overrides.subject', templateContent.subject_template || '');
        setValue('overrides.body_html', templateContent.body_html_template || '');
        setValue('overrides.body_text', templateContent.body_text_template || '');
      }
      setValue('custom_content.resolved_content.subject', ''); // Clear custom content
      setValue('custom_content.resolved_content.body_html', '');
      setValue('custom_content.resolved_content.body_text', '');
    } else if (contentType === 'custom_message') {
      setValue('source_template_id', undefined); // Clear template ID
      setSelectedTemplateObject(null);
      // If switching from template to custom, option to copy content:
      // const currentOverrides = getValues('overrides');
      // if (selectedTemplateObject && currentOverrides?.subject) { // Check if overrides had content
      //   setValue('custom_content.resolved_content.subject', currentOverrides.subject);
      //   setValue('custom_content.resolved_content.body_html', currentOverrides.body_html || '');
      //   setValue('custom_content.resolved_content.body_text', currentOverrides.body_text || '');
      // }
      setValue('overrides.subject', ''); // Clear overrides
      setValue('overrides.body_html', '');
      setValue('overrides.body_text', '');
    }
  }, [contentType, selectedTemplateObject, setValue, getValues]);


  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        {/* t('campaigns.wizard.content.title', 'Setup Campaign Content') */}
        Setup Campaign Content
      </Typography>

      <FormControl component="fieldset" sx={{ mb: 2 }}>
        <Controller
          name="contentType"
          control={control}
          render={({ field }) => (
            <RadioGroup {...field} row aria-label="Content Type">
              <FormControlLabel value="custom_message" control={<Radio />} label="Create Custom Message" />
              <FormControlLabel value="use_template" control={<Radio />} label="Use Existing Template" />
            </RadioGroup>
          )}
        />
        {errors.contentType && <FormHelperText error>{errors.contentType.message}</FormHelperText>}
      </FormControl>

      {contentType === 'use_template' && (
        <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
          <Typography variant="subtitle1" gutterBottom>Use Template</Typography>
          <Controller
            name="source_template_id"
            control={control}
            render={({ field }) => (
              <Autocomplete
                id="source-template-autocomplete"
                options={templatesData?.results || []}
                getOptionLabel={(option) => `${option.template_name} (ID: ${option.id})`}
                value={selectedTemplateObject || null}
                onChange={(event, newValue) => {
                  setSelectedTemplateObject(newValue);
                  field.onChange(newValue ? newValue.id : undefined);
                }}
                onInputChange={(event, newInputValue) => {
                  setTemplateSearchTerm(newInputValue);
                }}
                loading={isLoadingTemplates}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Select Email Template"
                    variant="outlined"
                    error={!!errors.source_template_id}
                    helperText={errors.source_template_id?.message}
                    InputProps={{
                      ...params.InputProps,
                      endAdornment: (
                        <>
                          {isLoadingTemplates ? <CircularProgress color="inherit" size={20} /> : null}
                          {params.InputProps.endAdornment}
                        </>
                      ),
                    }}
                  />
                )}
                isOptionEqualToValue={(option, value) => option.id === value.id}
                sx={{ mb: 2 }}
              />
            )}
          />
          {selectedTemplateObject && (
            <Box>
              <Typography variant="subtitle2" gutterBottom>Override Template Content (Optional)</Typography>
              <Controller
                name="overrides.subject"
                control={control}
                render={({ field }) => <TextField {...field} label="Override Subject" fullWidth margin="dense" error={!!errors.overrides?.subject} helperText={errors.overrides?.subject?.message} />}
              />
              <Controller
                name="overrides.body_html"
                control={control}
                render={({ field }) => <TextField {...field} label="Override HTML Body" fullWidth multiline rows={5} margin="dense" error={!!errors.overrides?.body_html} helperText={errors.overrides?.body_html?.message} />}
              />
              <Controller
                name="overrides.body_text"
                control={control}
                render={({ field }) => <TextField {...field} label="Override Plain Text Body" fullWidth multiline rows={3} margin="dense" error={!!errors.overrides?.body_text} helperText={errors.overrides?.body_text?.message} />}
              />
            </Box>
          )}
        </Paper>
      )}

      {contentType === 'custom_message' && (
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Typography variant="subtitle1" gutterBottom>Create Custom Message</Typography>
          <Controller
            name="custom_content.resolved_content.subject"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label="Subject"
                fullWidth
                required={contentType === 'custom_message'}
                margin="normal"
                error={!!errors.custom_content?.resolved_content?.subject}
                helperText={errors.custom_content?.resolved_content?.subject?.message}
              />
            )}
          />
          <Controller
            name="custom_content.resolved_content.body_html"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label="HTML Body"
                fullWidth
                required={contentType === 'custom_message'}
                multiline
                rows={10}
                margin="normal"
                error={!!errors.custom_content?.resolved_content?.body_html}
                helperText={errors.custom_content?.resolved_content?.body_html?.message || "Enter HTML content. Use {{variable_name}} for personalization."}
              />
            )}
          />
          <Controller
            name="custom_content.resolved_content.body_text"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label="Plain Text Body (Optional)"
                fullWidth
                multiline
                rows={5}
                margin="normal"
                error={!!errors.custom_content?.resolved_content?.body_text}
                helperText={errors.custom_content?.resolved_content?.body_text?.message}
              />
            )}
          />
        </Paper>
      )}
       {/* Display general error for custom_content object if refine fails */}
       {errors.custom_content && typeof errors.custom_content.message === 'string' && (
        <FormHelperText error sx={{mt:1}}>{errors.custom_content.message}</FormHelperText>
      )}
    </Box>
  );
};


export default CampaignStepContent;
