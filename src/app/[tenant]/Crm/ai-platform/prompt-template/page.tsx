'use client';

import { useState } from 'react';
import { Card, TextField, IconButton, Box, Typography } from '@mui/material';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';

export default function PromptDefinition() {
  const [systemPrompt, setSystemPrompt] = useState('');
  const [userPrompt, setUserPrompt] = useState('');

  const handleRefinePrompt = (type: 'system' | 'user') => {
    // TODO: Implement prompt refinement logic
    console.log(`Refining ${type} prompt`);
  };

  return (
    <Card sx={{maxWidth: '800px', mx: 'auto', mt: 4 }}>
      <Typography variant="h5" gutterBottom>
        Prompt Definition
      </Typography>

      <Box sx={{ mb: 4, position: 'relative' }}>
        <Typography variant="h6" gutterBottom>
          System Prompt
        </Typography>
        <TextField
          fullWidth
          multiline
          rows={6}
          placeholder="Define system's role, context, instructions..."
          value={systemPrompt}
          onChange={(e) => setSystemPrompt(e.target.value)}
          sx={{ mb: 1 }}
        />
        <IconButton
          sx={{
            position: 'absolute',
            bottom: 8,
            right: 8,
            backgroundColor: 'background.paper',
            '&:hover': { backgroundColor: 'action.hover' },
          }}
          onClick={() => handleRefinePrompt('system')}
          size="small"
        >
          <AutoFixHighIcon />
        </IconButton>
      </Box>

      <Box sx={{ position: 'relative' }}>
        <Typography variant="h6" gutterBottom>
          User Prompt
        </Typography>
        <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
          Use {'{'} {'}'} for placeholders (e.g. {'{{'}variable_name{'}}'}))
        </Typography>
        <TextField
          fullWidth
          multiline
          rows={6}
          placeholder="e.g., Translate: {{user_text}} to {{target_language}}"
          value={userPrompt}
          onChange={(e) => setUserPrompt(e.target.value)}
          sx={{ mb: 1 }}
        />
        <IconButton
          sx={{
            position: 'absolute',
            bottom: 8,
            right: 8,
            backgroundColor: 'background.paper',
            '&:hover': { backgroundColor: 'action.hover' },
          }}
          onClick={() => handleRefinePrompt('user')}
          size="small"
        >
          <AutoFixHighIcon />
        </IconButton>
      </Box>
    </Card>
  );
}
