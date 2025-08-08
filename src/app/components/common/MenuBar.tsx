import React from 'react';
import { Editor } from '@tiptap/react';
import {
  Box,
  IconButton,
  Divider,
  Tooltip,
  Select,
  MenuItem,
  SelectChangeEvent,
} from '@mui/material';
import FormatBoldIcon from '@mui/icons-material/FormatBold';
import FormatItalicIcon from '@mui/icons-material/FormatItalic';
import FormatUnderlinedIcon from '@mui/icons-material/FormatUnderlined';
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted';
import FormatListNumberedIcon from '@mui/icons-material/FormatListNumbered';
import FormatQuoteIcon from '@mui/icons-material/FormatQuote';
import FormatAlignLeftIcon from '@mui/icons-material/FormatAlignLeft';
import FormatAlignCenterIcon from '@mui/icons-material/FormatAlignCenter';
import FormatAlignRightIcon from '@mui/icons-material/FormatAlignRight';
import FormatAlignJustifyIcon from '@mui/icons-material/FormatAlignJustify';
import HorizontalRuleIcon from '@mui/icons-material/HorizontalRule';
import UndoIcon from '@mui/icons-material/Undo';
import RedoIcon from '@mui/icons-material/Redo';
import FormatClearIcon from '@mui/icons-material/FormatClear';

interface MenuBarProps {
  editor: Editor | null;
}

const MenuBar: React.FC<MenuBarProps> = ({ editor }) => {
  if (!editor) {
    return null;
  }

  const handleHeadingChange = (event: SelectChangeEvent<string>) => {
    const value = event.target.value;
    
    if (value === 'paragraph') {
      editor.chain().focus().setParagraph().run();
    } else if (value === 'h1') {
      editor.chain().focus().toggleHeading({ level: 1 }).run();
    } else if (value === 'h2') {
      editor.chain().focus().toggleHeading({ level: 2 }).run();
    } else if (value === 'h3') {
      editor.chain().focus().toggleHeading({ level: 3 }).run();
    } else if (value === 'h4') {
      editor.chain().focus().toggleHeading({ level: 4 }).run();
    } else if (value === 'h5') {
      editor.chain().focus().toggleHeading({ level: 5 }).run();
    } else if (value === 'h6') {
      editor.chain().focus().toggleHeading({ level: 6 }).run();
    }
  };

  const getCurrentHeadingValue = () => {
    if (editor.isActive('heading', { level: 1 })) return 'h1';
    if (editor.isActive('heading', { level: 2 })) return 'h2';
    if (editor.isActive('heading', { level: 3 })) return 'h3';
    if (editor.isActive('heading', { level: 4 })) return 'h4';
    if (editor.isActive('heading', { level: 5 })) return 'h5';
    if (editor.isActive('heading', { level: 6 })) return 'h6';
    return 'paragraph';
  };

  return (
    <Box sx={{ 
      display: 'flex', 
      flexWrap: 'wrap', 
      alignItems: 'center', 
      backgroundColor: '#f5f5f5', 
      p: 1, 
      borderRadius: '4px 4px 0 0',
      border: '1px solid #ddd',
      borderBottom: 'none'
    }}>
      {/* History Controls */}
      <Tooltip title="Undo">
        <IconButton 
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
        >
          <UndoIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      
      <Tooltip title="Redo">
        <IconButton 
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
        >
          <RedoIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      
      <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
      
      {/* Heading Dropdown */}
      <Select
        value={getCurrentHeadingValue()}
        onChange={handleHeadingChange}
        size="small"
        sx={{ minWidth: 120, mr: 1, height: 36 }}
      >
        <MenuItem value="paragraph">Paragraph</MenuItem>
        <MenuItem value="h1">Heading 1</MenuItem>
        <MenuItem value="h2">Heading 2</MenuItem>
        <MenuItem value="h3">Heading 3</MenuItem>
        <MenuItem value="h4">Heading 4</MenuItem>
        <MenuItem value="h5">Heading 5</MenuItem>
        <MenuItem value="h6">Heading 6</MenuItem>
      </Select>
      
      <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
      
      {/* Text Formatting */}
      <Tooltip title="Bold">
        <IconButton 
          onClick={() => editor.chain().focus().toggleBold().run()}
          color={editor.isActive('bold') ? 'primary' : 'default'}
        >
          <FormatBoldIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      
      <Tooltip title="Italic">
        <IconButton 
          onClick={() => editor.chain().focus().toggleItalic().run()}
          color={editor.isActive('italic') ? 'primary' : 'default'}
        >
          <FormatItalicIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      
      <Tooltip title="Underline">
        <IconButton 
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          color={editor.isActive('underline') ? 'primary' : 'default'}
        >
          <FormatUnderlinedIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      
      <Tooltip title="Align Left">
        <IconButton 
          onClick={() => editor.chain().focus().setTextAlign('left').run()}
          color={editor.isActive({ textAlign: 'left' }) ? 'primary' : 'default'}
        >
          <FormatAlignLeftIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      
      <Tooltip title="Align Center">
        <IconButton 
          onClick={() => editor.chain().focus().setTextAlign('center').run()}
          color={editor.isActive({ textAlign: 'center' }) ? 'primary' : 'default'}
        >
          <FormatAlignCenterIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      
      <Tooltip title="Align Right">
        <IconButton 
          onClick={() => editor.chain().focus().setTextAlign('right').run()}
          color={editor.isActive({ textAlign: 'right' }) ? 'primary' : 'default'}
        >
          <FormatAlignRightIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      
      <Tooltip title="Justify">
        <IconButton 
          onClick={() => editor.chain().focus().setTextAlign('justify').run()}
          color={editor.isActive({ textAlign: 'justify' }) ? 'primary' : 'default'}
        >
          <FormatAlignJustifyIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      
      <Tooltip title="Clear formatting">
        <IconButton onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()}>
          <FormatClearIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      
      <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
      
      {/* Lists */}
      <Tooltip title="Bullet List">
        <IconButton 
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          color={editor.isActive('bulletList') ? 'primary' : 'default'}
        >
          <FormatListBulletedIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      
      <Tooltip title="Ordered List">
        <IconButton 
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          color={editor.isActive('orderedList') ? 'primary' : 'default'}
        >
          <FormatListNumberedIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      
      <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
      
      {/* Block elements */}
      <Tooltip title="Blockquote">
        <IconButton 
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          color={editor.isActive('blockquote') ? 'primary' : 'default'}
        >
          <FormatQuoteIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      
      <Tooltip title="Horizontal Rule">
        <IconButton onClick={() => editor.chain().focus().setHorizontalRule().run()}>
          <HorizontalRuleIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      
      <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
      
      {/* Link */}

    </Box>
  );
};

export default MenuBar;