import { Box, Checkbox, FormControlLabel, ListItem, Typography } from '@mui/material';
import { FC, useRef, useMemo } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { truncateText } from './utils';

interface PincodesVirtualListProps {
  pincodes: string[];
  districtPincodesMap: Record<string, string[]>;
  selectedPincodes: Record<string, boolean>;
  disabledPincodes?: Record<string, boolean>;
  setSelectedPincodes: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
}

/**
 * Virtualized list component to display pincodes grouped by district with checkboxes
 */
const PincodesVirtualList: FC<PincodesVirtualListProps> = ({ 
  pincodes, 
  districtPincodesMap, 
  selectedPincodes, 
  disabledPincodes = {},
  setSelectedPincodes 
}) => {
  const parentRef = useRef<HTMLDivElement>(null);
  
  // Create a flat list of district headers and pincode rows for virtualization
  type VirtualItem = {
    type: 'district' | 'pincodes';
    district: string;
    pincodes?: string[];
  };
  
  const virtualItems: VirtualItem[] = useMemo(() => {
    const items: VirtualItem[] = [];
    // Sort districts alphabetically
    const districts = Object.keys(districtPincodesMap).sort();
    
    districts.forEach(district => {
      // Add district header
      items.push({ type: 'district', district });
      
      // Add pincode rows (6 pincodes per row)
      const districtPincodes = districtPincodesMap[district].sort(); // Sort pincodes
      const itemsPerRow = 8; // 6 pincodes per row
      for (let i = 0; i < districtPincodes.length; i += itemsPerRow) {
        items.push({
          type: 'pincodes',
          district,
          pincodes: districtPincodes.slice(i, i + itemsPerRow)
        });
      }
    });
    
    return items;
  }, [districtPincodesMap]);
  
  const virtualizer = useVirtualizer({
    count: virtualItems.length,
    getScrollElement: () => parentRef.current,
    estimateSize: (index) => virtualItems[index]?.type === 'district' ? 48 : 40, // District headers are taller
    overscan: 5,
  });

  // truncateText imported from utils.ts

  return (
    <div 
      ref={parentRef} 
      style={{ height: '800px', overflow: 'auto', padding: 0 }}
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const item = virtualItems[virtualRow.index];
          
          if (item.type === 'district') {
            // Render district header
            return (
              <div
                key={virtualRow.key}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                  borderBottom: '1px solid rgba(0,0,0,0.12)',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '0 16px',
                  backgroundColor: '#f5f5f5',                }}
              >
                <Typography 
                  variant="subtitle1" 
                  sx={{ fontWeight: (theme) => theme.typography.fontWeightMedium }}
                >
                  {item.district}
                </Typography>
              </div>
            );
          } else {
            // Render pincodes row
            return (
              <div
                key={virtualRow.key}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                  borderBottom: '1px solid rgba(0,0,0,0.12)',
                  display: 'flex',
                  flexDirection: 'row',
                }}
              >
                {item.pincodes?.map(pincode => (
                  <Box 
                    key={pincode} 
                    sx={{ 
                      width: '12.5%', // 1/6 for 6 items per row
                      borderRight: (theme) => `1px solid ${theme.palette.divider}`,
                      '&:last-child': {
                        borderRight: 'none'
                      }
                    }}
                  >
                    <ListItem dense sx={{ height: '100%', px: 1 }}>
                      <FormControlLabel
                        sx={{ m: 0 }}
                        control={
                          <Checkbox 
                            size="small" 
                            checked={!!selectedPincodes[pincode]}
                            disabled={!!disabledPincodes[pincode]}
                            title={disabledPincodes[pincode] ? "This pincode is already assigned to another zone" : undefined}
                            onChange={(e) => 
                              setSelectedPincodes(prev => ({
                                ...prev,
                                [pincode]: e.target.checked
                              }))
                            }
                          />
                        }
                        label={
                          <Typography 
                            variant="body2" 
                            noWrap 
                            title={pincode} // Show full text on hover
                          >
                            {truncateText(pincode)}
                          </Typography>
                        }
                      />
                    </ListItem>
                  </Box>
                ))}
              </div>
            );
          }
        })}
      </div>
    </div>
  );
};

export default PincodesVirtualList;
