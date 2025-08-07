'use client';

import React, { useState, useEffect } from 'react';
import { Controller, useFormContext } from 'react-hook-form';
import { useParams } from 'next/navigation';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Autocomplete from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';
import CircularProgress from '@mui/material/CircularProgress';
import Chip from '@mui/material/Chip';
import FormHelperText from '@mui/material/FormHelperText';
// import { useTranslation } from 'react-i18next';
import { CampaignWizardFormData } from './NewCampaignFormWizard'; // Fixed import path
import { useGetLists } from '../../../../hooks/engagement/marketing/useLists'; // Adjust path
import { MarketingList } from '../../../../types/engagement/marketing'; // Adjust path
import useDebounce from '../../../../hooks/useDebounce'; // Adjust path

// Extend MarketingList type to include list_type_display property
interface ExtendedMarketingList extends MarketingList {
  list_type_display?: string;
}


const CampaignStepAudience: React.FC = () => {
  // const { t } = useTranslation();
  const { control, setValue, getValues, formState: { errors } } = useFormContext<CampaignWizardFormData>();

  const [listSearchTerm, setListSearchTerm] = useState('');
  const debouncedListSearchTerm = useDebounce(listSearchTerm, 500);
  const [availableLists, setAvailableLists] = useState<ExtendedMarketingList[]>([]);
  const { tenant } = useParams<{ tenant: string }>();
  const tenantSlug = tenant; // For backward compatibility with the API hooks

  const { data: listsData, isLoading: isLoadingLists } = useGetLists(
    tenantSlug,
    1, // page - fetch a reasonable number of initial options
    debouncedListSearchTerm,
    false // includeInternal = false
    // Consider adding a page_size parameter to getLists if API supports it for Autocomplete
  );

  useEffect(() => {
    if (listsData?.results) {
      setAvailableLists(listsData.results);
      console.log('Lists loaded in CampaignStepAudience:', listsData.results);
    }
  }, [listsData]);

  // Get currently selected list IDs from form state
  const currentTargetListIds = getValues('target_list_ids') || [];
  // Map these IDs to ExtendedMarketingList objects for Autocomplete's value prop
  // This requires having all possible lists available or fetching selected lists by ID if not in initial fetch.
  // For simplicity, assume selected lists for editing will be part of `availableLists` or that this component
  // primarily focuses on selection. A more robust edit would pre-fetch selected list objects.
  // The Autocomplete component will handle matching IDs to options.
  const selectedListObjects = availableLists.filter(list => currentTargetListIds.includes(list.id));

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        {/* t('campaigns.wizard.audience.title', 'Select Target Audience') */}
        Select Target Audience
      </Typography>
      <Controller
        name="target_list_ids"
        control={control}
        render={({ field }) => (
          <Autocomplete
            multiple
            id="target-lists-autocomplete"
            options={availableLists}
            getOptionLabel={(option) => `${option.name}${option.description ? ` - ${option.description}` : ''} (${option.list_type_display || 
              (option.list_type === 'STATIC' ? 'Static' : 
               option.list_type === 'DYNAMIC_SEGMENT' ? 'Dynamic' : 
               option.list_type === 'ACTIVE' ? 'Active' : 
               option.list_type === 'ARCHIVED' ? 'Archived' : 'Unknown')})`}
            value={availableLists.filter(list => field.value?.includes(list.id))} // Ensure value is array of objects
            onChange={(event, newValue) => {
              setValue('target_list_ids', newValue.map(list => list.id), { shouldValidate: true });
            }}
            onInputChange={(event, newInputValue) => {
              setListSearchTerm(newInputValue);
            }}
            loading={isLoadingLists}
            isOptionEqualToValue={(option, value) => option.id === value.id}
            renderInput={(params) => (
              <TextField
                {...params}
                variant="outlined"
                label={"Target Lists / Segments"} // t('campaigns.form.targetLists')
                placeholder="Search and select lists or segments"
                error={!!errors.target_list_ids}
                helperText={errors.target_list_ids ? errors.target_list_ids.message : "Select at least one list or segment."}
                InputProps={{
                  ...params.InputProps,
                  endAdornment: (
                    <>
                      {isLoadingLists ? <CircularProgress color="inherit" size={20} /> : null}
                      {params.InputProps.endAdornment}
                    </>
                  ),
                }}
              />
            )}
            renderTags={(value, getTagProps) =>
              value.map((option, index) => (
                <Chip
                  variant="outlined"
                  label={`${option.name} (${option.list_type === 'STATIC' ? 'S' : 
                    option.list_type === 'DYNAMIC_SEGMENT' ? 'D' : 
                    option.list_type === 'ACTIVE' ? 'A' : 
                    option.list_type === 'ARCHIVED' ? 'AR' : '?'})`}
                  {...getTagProps({ index })}
                  key={option.id}
                />
              ))
            }
            sx={{ mt: 2 }}
          />
        )}
      />
       {errors.target_list_ids && !errors.target_list_ids.message && Array.isArray(errors.target_list_ids) && (
            <FormHelperText error>{/* t('campaigns.form.selectAtLeastOneList') */} Select at least one list.</FormHelperText>
        )}
    </Box>
  );
};

export default CampaignStepAudience;
