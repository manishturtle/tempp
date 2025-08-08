import React from "react";
import {
  Box,
  Typography,
  TextField,
  List,
  ListItem,
  ListItemText,
} from "@mui/material";
import {
  Search as SearchIcon,
  DescriptionOutlined as FormIcon,
} from "@mui/icons-material";
import { BLOCK_TYPES } from "./workflowBlocks";

interface ToolboxProps {
  onDragStart: (
    event: React.DragEvent<HTMLDivElement>,
    nodeType: string
  ) => void;
}

const Toolbox: React.FC<ToolboxProps> = ({ onDragStart }) => {
  return (
    <Box>
      <Typography variant="h6" sx={{ mb: 1 }}>
        Toolbox
      </Typography>
      <Typography variant="body2" sx={{ mb: 2 }}>
        Click and drag a block to the canvas to build a workflow.
      </Typography>

      <TextField
        placeholder="Search..."
        size="small"
        fullWidth
        InputProps={{
          startAdornment: <SearchIcon fontSize="small" />,
        }}
        sx={{ mb: 3 }}
      />

      <Typography variant="subtitle1" sx={{ mb: 1 }}>
        Available Blocks:
      </Typography>
      <List>
        <ListItem
          component="div"
          onDragStart={(event: React.DragEvent<HTMLDivElement>) => {
            onDragStart(event, BLOCK_TYPES.FORM);
          }}
          draggable
          sx={{
            border: "1px solid #e0e0e0",
            borderRadius: 1,
            mb: 1, 
            bgcolor: '#f5f5f5',
            cursor: "grab",
            '&:hover': {
              bgcolor: '#e3f2fd',
            },
          }}
        >
          <FormIcon sx={{ mr: 2 }} />
          <ListItemText primary="Form" />
        </ListItem>

        {/* <ListItem
          component="div"
          onDragStart={(event: React.DragEvent<HTMLDivElement>) => onDragStart(event, BLOCK_TYPES.SEND_EMAIL)}
          draggable
          sx={{ border: '1px solid #e0e0e0', borderRadius: 1, cursor: 'grab' }}
        >
          <EmailIcon sx={{ mr: 2 }} />
          <ListItemText primary="Send Email" />
        </ListItem> */}
      </List>
    </Box>
  );
};

export default Toolbox;
