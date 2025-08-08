import { Box, Checkbox, FormControlLabel, ListItem, Typography } from '@mui/material';
import { FC, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { truncateText } from './utils';

interface StatesVirtualListProps {
  states: string[];
  selectedStates: Record<string, boolean>;
  disabledStates?: Record<string, boolean>;
  setSelectedStates: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
}

/**
 * Virtualized list component to display states with checkboxes in a grid layout
 */
const StatesVirtualList: FC<StatesVirtualListProps> = ({ states, selectedStates, disabledStates = {}, setSelectedStates }) => {
  const parentRef = useRef<HTMLDivElement>(null);
  const itemsPerRow = 4;
  const rowsCount = Math.ceil(states.length / itemsPerRow);
  
  const virtualizer = useVirtualizer({
    count: rowsCount,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 40, // Approximate height of each row
    overscan: 5,
  });

  // truncateText imported from utils.ts

  return (
    <div 
      ref={parentRef} 
      style={{ overflow: 'auto', padding: 0 }}
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const rowStartIndex = virtualRow.index * itemsPerRow;
          const rowStates = states.slice(rowStartIndex, rowStartIndex + itemsPerRow);
          
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
              {rowStates.map(state => (
                <Box 
                  key={state} 
                  sx={{ 
                    flex: '1 0 25%', 
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
                          checked={!!selectedStates[state]}
                          disabled={!!disabledStates[state]}
                          title={disabledStates[state] ? "All districts in this state are already assigned to zones" : undefined}
                          onChange={(e) => 
                            setSelectedStates(prev => ({
                              ...prev,
                              [state]: e.target.checked
                            }))
                          }
                        />
                      }
                      label={
                        <Typography 
                          variant="body2" 
                          noWrap 
                          title={state} // Show full text on hover
                        >
                          {truncateText(state)}
                        </Typography>
                      }
                    />
                  </ListItem>
                </Box>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default StatesVirtualList;
