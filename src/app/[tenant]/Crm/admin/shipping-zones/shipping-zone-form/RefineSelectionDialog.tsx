import React, { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Checkbox,
  FormControlLabel,
  Divider,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  InputAdornment,
  Grid,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import SearchIcon from '@mui/icons-material/Search';
import { Pincode } from './ShippingZoneForm.types';

interface RefineSelectionDialogProps {
  open: boolean;
  onClose: () => void;
  state: string;
  pincodes: Pincode[];
  onConfirm: (selectedDistricts: string[]) => void;
  onPincodeFilter?: (filteredPincodes: Pincode[]) => void;
}

export const RefineSelectionDialog = ({
  open,
  onClose,
  state,
  pincodes,
  onConfirm,
  onPincodeFilter,
}: RefineSelectionDialogProps): React.ReactElement => {
  // Get unique districts for this state
  const allDistricts = useMemo(() => {
    return Array.from(new Set(pincodes.map(pincode => pincode.district).filter(Boolean))).sort();
  }, [pincodes]);
  
  // State for selected districts
  const [selectedDistricts, setSelectedDistricts] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState<boolean>(true);
  
  // State for pincode editing view
  const [viewMode, setViewMode] = useState<'districts' | 'pincodes'>('districts');
  const [editablePincodes, setEditablePincodes] = useState<Pincode[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Reset selections when dialog opens with new state
  useEffect(() => {
    if (open) {
      console.log(`Dialog opened for state: ${state} with ${allDistricts.length} districts`);
      setSelectedDistricts([...allDistricts]);
      setSelectAll(true);
    }
  }, [open, state, pincodes]);

  // Handle select all toggle
  const handleSelectAllToggle = (event: React.ChangeEvent<HTMLInputElement>): void => {
    const newSelectAll = event.target.checked;
    console.log(`Select All toggle: ${newSelectAll ? 'Selecting' : 'Deselecting'} all districts`);
    
    const newSelection = newSelectAll ? [...allDistricts] : [];
    console.log(`Setting selection to ${newSelection.length} districts`);
    
    // Calculate total pincodes affected
    const affectedPincodes = newSelectAll ? pincodes : [];
    console.log(`Total pincodes affected: ${affectedPincodes.length}`);
    
    setSelectAll(newSelectAll);
    setSelectedDistricts(newSelection);
  };

  // Handle individual district toggle
  const handleDistrictToggle = (event: React.ChangeEvent<HTMLInputElement>, district: string): void => {
    // Get the checked state directly from the event
    const isChecked = event.target.checked;
    
    setSelectedDistricts(prevSelected => {
      console.log(`District toggle: ${district}, checked=${isChecked}`);
      console.log('Currently selected districts:', prevSelected);
      
      // Calculate state pincodes affected by this district
      const districtPincodes = pincodes.filter(p => p.district === district);
      console.log(`Pincodes in district ${district}:`, districtPincodes.length);
      
      let newSelected;
      if (isChecked) {
        // Add district if not already included
        newSelected = prevSelected.includes(district) ? prevSelected : [...prevSelected, district];
        console.log(`Adding district ${district}`);
      } else {
        // Remove district
        newSelected = prevSelected.filter(d => d !== district);
        console.log(`Removing district ${district}`);
      }
      
      // Update selectAll state
      setSelectAll(newSelected.length === allDistricts.length);
      
      // Log selection summary
      console.log('Updated district selection:', newSelected);
      console.log(`Total districts selected: ${newSelected.length} of ${allDistricts.length}`);
      
      // Calculate total pincodes based on district selection
      const selectedPincodes = pincodes.filter(p => newSelected.includes(p.district));
      console.log(`Total pincodes selected: ${selectedPincodes.length} of ${pincodes.length}`);
      
      return newSelected;
    });
  };

  // Handle confirm button click
  const handleConfirm = (): void => {
    // Log final selection before confirming
    console.log('Finalizing district selection:', selectedDistricts);
    console.log(`Confirming selection of ${selectedDistricts.length} districts`);
    
    // Calculate total pincodes based on district selection
    const selectedPincodes = pincodes.filter(p => selectedDistricts.includes(p.district));
    console.log(`Final pincodes count: ${selectedPincodes.length} of ${pincodes.length}`);
    
    onConfirm(selectedDistricts);
    onClose();
  };
  
  // Toggle pincode editing view
  const togglePincodesView = (): void => {
    if (viewMode === 'districts') {
      // When opening the view, filter pincodes based on selected districts
      const filteredPincodes = pincodes.filter(p => selectedDistricts.includes(p.district));
      console.log(`Showing ${filteredPincodes.length} pincodes from ${selectedDistricts.length} selected districts`);
      
      // Group pincodes by district for logging
      const pincodesByDistrict = selectedDistricts.reduce<Record<string, number>>((acc, district) => {
        const count = pincodes.filter(p => p.district === district).length;
        acc[district] = count;
        return acc;
      }, {});
      
      console.log('Pincodes by district:', pincodesByDistrict);
      setEditablePincodes(filteredPincodes);
      setSearchTerm(''); // Reset search when opening dialog
      setViewMode('pincodes');
    } else {
      setViewMode('districts');
    }
  };
  
  // Remove a single pincode from the editable list
  const removePincode = (pincodeToRemove: Pincode): void => {
    console.log(`Removing pincode: ${pincodeToRemove.pincode} from ${pincodeToRemove.district}`);
    
    // Log current count before removal
    const districtPincodeCount = editablePincodes.filter(p => p.district === pincodeToRemove.district).length;
    console.log(`District ${pincodeToRemove.district} had ${districtPincodeCount} pincodes before removal`);
    
    setEditablePincodes(prev => prev.filter(p => p.pincode !== pincodeToRemove.pincode));
    
    // Check if this was the last pincode from this district
    const remainingInDistrict = editablePincodes.filter(p => 
      p.district === pincodeToRemove.district && p.pincode !== pincodeToRemove.pincode
    ).length;
    
    if (remainingInDistrict === 0) {
      console.log(`This was the last pincode in district ${pincodeToRemove.district}`);
    } else {
      console.log(`District ${pincodeToRemove.district} has ${remainingInDistrict} pincodes remaining`);
    }
  };
  
  // Apply pincode changes
  const applyPincodeChanges = (): void => {
    console.log(`Applying changes: ${editablePincodes.length} pincodes remaining`);
    
    // Get all districts with remaining pincodes
    const remainingDistricts = Array.from(new Set(editablePincodes.map(p => p.district)));
    console.log('Districts with remaining pincodes:', remainingDistricts);
    
    // Log the district-wise pincode counts
    const pincodesByDistrict = remainingDistricts.reduce<Record<string, number>>((acc, district) => {
      const count = editablePincodes.filter(p => p.district === district).length;
      acc[district] = count;
      return acc;
    }, {});
    console.log('Pincodes by district after changes:', pincodesByDistrict);
    
    // Log districts removed
    const removedDistricts = selectedDistricts.filter(d => !remainingDistricts.includes(d));
    if (removedDistricts.length > 0) {
      console.log('Districts removed due to all pincodes being removed:', removedDistricts);
    }
    
    // Update selected districts based on remaining pincodes
    setSelectedDistricts(remainingDistricts);
    setSelectAll(remainingDistricts.length === allDistricts.length);
    
    // Pass the filtered pincodes back to parent
    if (onPincodeFilter) {
      console.log('Passing back filtered pincodes to parent:', editablePincodes);
      onPincodeFilter(editablePincodes);
    }
    
    // Close the dialog
    onClose();
  };

  // Split districts into two columns
  const midpoint = Math.ceil(allDistricts.length / 2);
  const leftColumnDistricts = allDistricts.slice(0, midpoint);
  const rightColumnDistricts = allDistricts.slice(midpoint);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 1,
          width: '1000px',
          maxHeight: '80vh'
        }
      }}
    >
      <DialogTitle sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        borderBottom: '1px solid',
        borderColor: 'divider',
        pb: 1
      }}>
        <Typography variant="h6">
          {viewMode === 'districts' ? `Refine Selection for ${state}` : `Edit Pincodes for ${state}`}
        </Typography>
        <IconButton edge="end" color="inherit" onClick={onClose} aria-label="close">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      {viewMode === 'districts' ? (
        <DialogContent sx={{ p: 3 }}>
          {/* Select All Option */}
          <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <FormControlLabel
              control={
                <Checkbox 
                  checked={selectAll} 
                  onChange={handleSelectAllToggle} 
                  sx={{ ml: -1 }}
                />
              }
              label="Select All Districts"
            />
            <Typography variant="body2" color="text.secondary">
              {selectedDistricts.length} of {allDistricts.length} selected
            </Typography>
          </Box>

          <Divider sx={{ my: 2 }} />

          <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 500 }}>
            Refine by District
          </Typography>

          {/* District Checkboxes in Two Column Layout */}
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
            <Box>
              {leftColumnDistricts.map(district => (
                <FormControlLabel
                  key={district}
                  control={
                    <Checkbox 
                      checked={selectedDistricts.includes(district)} 
                      onChange={(e) => handleDistrictToggle(e, district)}
                    />
                  }
                  label={district}
                  sx={{ display: 'block' }}
                />
              ))}
            </Box>
            <Box>
              {rightColumnDistricts.map(district => (
                <FormControlLabel
                  key={district}
                  control={
                    <Checkbox 
                      checked={selectedDistricts.includes(district)} 
                      onChange={(e) => handleDistrictToggle(e, district)}
                    />
                  }
                  label={district}
                  sx={{ display: 'block' }}
                />
              ))}
            </Box>
          </Box>

          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            Selected {selectedDistricts.length} of {allDistricts.length} districts in {state}
          </Typography>
        </DialogContent>
      ) : (
        <DialogContent sx={{ p: 2 }}>
          <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="subtitle1" fontWeight={500}>
              {editablePincodes.length} pincodes in selected districts
            </Typography>
            <TextField
              placeholder="Search pincodes"
              variant="outlined"
              size="small"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
                endAdornment: searchTerm ? (
                  <InputAdornment position="end">
                    <IconButton
                      size="small"
                      onClick={() => setSearchTerm('')}
                      edge="end"
                      aria-label="clear search"
                    >
                      <CloseIcon fontSize="small" />
                    </IconButton>
                  </InputAdornment>
                ) : null,
              }}
              sx={{ width: 200 }}
            />
          </Box>
          
          <Box sx={{ 
            maxHeight: '400px', 
            overflowY: 'auto',
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 1,
            mt: 2
          }}>
            <Table size="small" aria-label="pincodes table">
              <TableHead>
                <TableRow>
                  <TableCell>Pincode</TableCell>
                  <TableCell>City</TableCell>
                  <TableCell>District</TableCell>
                  <TableCell align="right">Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {editablePincodes
                .filter((pincode) => {
                  if (!searchTerm) return true;
                  const search = searchTerm.toLowerCase();
                  return (
                    pincode.pincode.toLowerCase().includes(search) ||
                    pincode.city?.toLowerCase().includes(search) ||
                    pincode.district?.toLowerCase().includes(search)
                  );
                })
                .map((pincode) => (
                  <TableRow key={pincode.pincode} hover>
                    <TableCell>{pincode.pincode}</TableCell>
                    <TableCell>{pincode.city}</TableCell>
                    <TableCell>{pincode.district}</TableCell>
                    <TableCell align="right">
                      <IconButton 
                        size="small" 
                        color="error" 
                        onClick={() => removePincode(pincode)}
                        aria-label="remove pincode"
                      >
                        <DeleteOutlineIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
                {editablePincodes.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} align="center" sx={{ py: 3 }}>
                      <Typography variant="body2" color="text.secondary">
                        No pincodes found in selected districts
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Box>
        </DialogContent>
      )}

      <Divider />
      
      <DialogActions sx={{ p: 2, justifyContent: 'space-between' }}>
        {viewMode === 'districts' ? (
          <>
            <Button 
              variant="outlined" 
              color="primary" 
              onClick={togglePincodesView} 
              startIcon={<ExpandMoreIcon />}
              sx={{ fontWeight: 500 }}
            >
              View/Edit Pincodes for selected districts
            </Button>
            <Box>
              <Button onClick={onClose} sx={{ mr: 1 }}>
                Cancel
              </Button>
              <Button 
                variant="contained" 
                color="primary" 
                onClick={handleConfirm}
                disabled={selectedDistricts.length === 0}
              >
                Confirm Refinement
              </Button>
            </Box>
          </>
        ) : (
          <>
            <Button 
              variant="outlined" 
              onClick={() => setViewMode('districts')} 
              startIcon={<ExpandMoreIcon sx={{ transform: 'rotate(90deg)' }} />}
            >
              Back to Districts
            </Button>
            <Box>
              <Button onClick={togglePincodesView} sx={{ mr: 1 }}>
                Cancel
              </Button>
              <Button 
                variant="contained" 
                color="primary" 
                onClick={applyPincodeChanges}
              >
                Apply Changes
              </Button>
            </Box>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default RefineSelectionDialog;
