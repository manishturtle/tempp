import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Button, 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  Typography, 
  Box,
  ToggleButtonGroup,
  ToggleButton,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Checkbox,
  Paper,
  IconButton,
  Chip
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import { useShippingZones } from '@/app/hooks/api/admin/useShippingZones';
import { RestrictionModeType } from '../forms/ProductForm.schema';

interface ShippingZone {
  id: number;
  zone_name: string;
  description?: string;
  is_active: boolean;
}

interface ShippingZoneListResponse {
  results: ShippingZone[];
  count: number;
  total_pages: number;
  current_page: number;
  page_size: number;
  next: string | null;
  previous: string | null;
}

interface ShippingZoneRestriction {
  zone: number;
  restriction_mode: RestrictionModeType;
}

interface ShippingZoneRestrictionsProps {
  value: ShippingZoneRestriction[];
  onChange: (restrictions: ShippingZoneRestriction[]) => void;
}

export function ShippingZoneRestrictions({ value, onChange }: ShippingZoneRestrictionsProps): React.ReactElement {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [restrictionMode, setRestrictionMode] = useState<RestrictionModeType>('INCLUDE');
  const [selectedZoneIds, setSelectedZoneIds] = useState<number[]>([]);
  const { data: shippingZones, isLoading } = useShippingZones() as { data: ShippingZoneListResponse | undefined; isLoading: boolean };

  // Filter out zones that already have restrictions
  const availableZones = useMemo(() => {
    if (!shippingZones?.results) return [];
    const existingZoneIds = value.map((restriction) => restriction.zone);
    return shippingZones.results.filter((zone: ShippingZone) => !existingZoneIds.includes(zone.id));
  }, [shippingZones, value]);

  const handleOpenDialog = (): void => {
    setOpen(true);
    setSelectedZoneIds([]);
  };

  const handleCloseDialog = (): void => {
    setOpen(false);
  };

  const handleSaveRestrictions = (): void => {
    const newRestrictions = selectedZoneIds.map((zoneId) => ({
      zone: zoneId,
      restriction_mode: restrictionMode
    }));
    
    onChange([...value, ...newRestrictions]);
    setOpen(false);
  };

  const handleRestrictionModeChange = (
    _: React.MouseEvent<HTMLElement>,
    newMode: RestrictionModeType | null
  ): void => {
    if (newMode !== null) {
      setRestrictionMode(newMode);
    }
  };

  const handleZoneToggle = (zoneId: number): void => {
    setSelectedZoneIds((prev) => {
      if (prev.includes(zoneId)) {
        return prev.filter((id) => id !== zoneId);
      } else {
        return [...prev, zoneId];
      }
    });
  };

  const handleRemoveRestriction = (zoneId: number): void => {
    onChange(value.filter((restriction) => restriction.zone !== zoneId));
  };

  // Find zone name by id
  const getZoneName = (zoneId: number): string => {
    if (!shippingZones?.results) return `Zone ${zoneId}`;
    const zone = shippingZones.results.find((zone: ShippingZone) => zone.id === zoneId);
    return zone?.zone_name || `Zone ${zoneId}`;
  };

  return (
    <Box sx={{ mt: 3 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="subtitle1" fontWeight="bold">
          {t('product.shippingZoneRestrictions')}
        </Typography>
        <Button 
          variant="outlined" 
          startIcon={<AddIcon />}
          onClick={handleOpenDialog}
        >
          {t('common.add')}
        </Button>
      </Box>
      <Box sx={{ mb: 2 }}>
        <Typography variant="subtitle1" gutterBottom>
          {t('product.existingRestrictions', 'Existing Restrictions')}
        </Typography>
        {value.length > 0 ? (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>{t('shippingZone.name', 'Zone Name')}</TableCell>
                <TableCell>{t('product.restrictionMode', 'Mode')}</TableCell>
                <TableCell padding="checkbox">{t('Actions', 'Actions')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {value.map((restriction) => (
                <TableRow key={restriction.zone}>
                  <TableCell>{getZoneName(restriction.zone)}</TableCell>
                  <TableCell>
                    <Chip 
                      label={restriction.restriction_mode}
                      color={restriction.restriction_mode === 'INCLUDE' ? 'primary' : 'error'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell padding="checkbox">
                    <IconButton 
                      size="small" 
                      color="error"
                      onClick={() => handleRemoveRestriction(restriction.zone)}
                      aria-label={t('common.remove', 'Remove')}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <Typography color="text.secondary">
            {t('product.noRestrictions', 'No shipping restrictions set for this product.')}
          </Typography>
        )}
      </Box>

      <Dialog open={open} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>{t('product.addShippingZoneRestrictions')}</DialogTitle>
        <DialogContent>
      
            <ToggleButtonGroup
              value={restrictionMode}
              exclusive
              onChange={handleRestrictionModeChange}
              aria-label={t('shippingZone.restrictionMode')}
              size="small"
              sx={{ mb: 1 }}
            >
              <ToggleButton value="INCLUDE" aria-label={t('shippingZone.include')}>
                {t('shippingZone.include')}
              </ToggleButton>
              <ToggleButton value="EXCLUDE" aria-label={t('shippingZone.exclude')}>
                {t('shippingZone.exclude')}
              </ToggleButton>
            </ToggleButtonGroup>

          {isLoading ? (
            <Typography>{t('common.loading')}</Typography>
          ) : availableZones.length > 0 ? (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell padding="checkbox">
                    <Checkbox
                      color="primary"
                      indeterminate={selectedZoneIds.length > 0 && selectedZoneIds.length < availableZones.length}
                      checked={selectedZoneIds.length > 0 && selectedZoneIds.length === availableZones.length}
                      onChange={() => {
                        if (selectedZoneIds.length === availableZones.length) {
                          setSelectedZoneIds([]);
                        } else {
                          setSelectedZoneIds(availableZones.map(zone => zone.id));
                        }
                      }}
                      inputProps={{
                        'aria-label': 'select all zones',
                      }}
                    />
                  </TableCell>
                  <TableCell>{t('shippingZone.name', 'Zone Name')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {availableZones.map((zone: ShippingZone) => (
                  <TableRow 
                    key={zone.id}
                    hover
                    onClick={() => handleZoneToggle(zone.id)}
                  >
                    <TableCell padding="checkbox">
                      <Checkbox
                        color="primary"
                        checked={selectedZoneIds.includes(zone.id)}
                        inputProps={{
                          'aria-labelledby': `zone-${zone.id}-name`,
                        }}
                      />
                    </TableCell>
                    <TableCell>{zone.zone_name}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <Typography variant="body2" color="text.secondary">
              {t('product.noAvailableShippingZones')}
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>{t('common.cancel')}</Button>
          <Button 
            onClick={handleSaveRestrictions} 
            variant="contained" 
            disabled={selectedZoneIds.length === 0}
          >
            {t('common.save')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
