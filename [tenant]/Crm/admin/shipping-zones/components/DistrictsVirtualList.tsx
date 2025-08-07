import { Box, Checkbox, FormControlLabel, ListItem, Typography } from '@mui/material';
import { FC, useRef, useMemo } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { truncateText } from './utils';

interface DistrictsVirtualListProps {
  districts: string[];
  stateDistrictsMap: Record<string, string[]>;
  selectedDistricts: Record<string, boolean>;
  disabledDistricts?: Record<string, boolean>;
  setSelectedDistricts: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
}

/**
 * Virtualized list component to display districts grouped by state with checkboxes
 */
const DistrictsVirtualList: FC<DistrictsVirtualListProps> = ({ 
  districts, 
  stateDistrictsMap, 
  selectedDistricts, 
  disabledDistricts = {}, 
  setSelectedDistricts 
}) => {
  const parentRef = useRef<HTMLDivElement>(null);
  
  // Create a flat list of state headers and district rows for virtualization
  type VirtualItem = {
    type: 'state' | 'districts';
    state: string;
    districts?: string[];
  };
  
  const virtualItems: VirtualItem[] = useMemo(() => {
    const items: VirtualItem[] = [];
    // Sort states alphabetically
    const states = Object.keys(stateDistrictsMap).sort();
    
    states.forEach(state => {
      // Add state header
      items.push({ type: 'state', state });
      
      // Add district rows (4 districts per row)
      const stateDistricts = stateDistrictsMap[state].sort(); // Sort districts alphabetically
      const itemsPerRow = 4;
      for (let i = 0; i < stateDistricts.length; i += itemsPerRow) {
        items.push({
          type: 'districts',
          state,
          districts: stateDistricts.slice(i, i + itemsPerRow)
        });
      }
    });
    
    return items;
  }, [stateDistrictsMap]);
  
  const virtualizer = useVirtualizer({
    count: virtualItems.length,
    getScrollElement: () => parentRef.current,
    estimateSize: (index) => virtualItems[index]?.type === 'state' ? 48 : 40, // State headers are taller
    overscan: 5,
  });

  // truncateText imported from utils.ts

  return (
    <div 
      ref={parentRef} 
      style={{ height: '600px', overflow: 'auto', padding: 0 }}
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
          
          if (item.type === 'state') {
            // Render state header
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
                  {item.state}
                </Typography>
              </div>
            );
          } else {
            // Render districts row
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
                {item.districts?.map(district => (
                  <Box 
                    key={district} 
                    sx={{ 
                      // Calculate flex-basis based on number of districts in the row
                      width: '25%',
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
                            checked={!!selectedDistricts[district]}
                            disabled={!!disabledDistricts[district]}
                            title={disabledDistricts[district] ? "All pincodes in this district are already assigned to zones" : undefined}
                            onChange={(e) => 
                              setSelectedDistricts(prev => ({
                                ...prev,
                                [district]: e.target.checked
                              }))
                            }
                          />
                        }
                        label={
                          <Typography 
                            variant="body2" 
                            noWrap 
                            title={district} // Show full text on hover
                          >
                            {truncateText(district)}
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

export default DistrictsVirtualList;
