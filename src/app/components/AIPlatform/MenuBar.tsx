// components/TipTapEditor/MenuBar.tsx
import React from 'react';
import { Editor } from '@tiptap/react';
import {
  FormatBold,
  FormatItalic,
  FormatUnderlined,
  FormatStrikethrough,
  Code,
  FormatQuote,
  FormatListBulleted,
  FormatListNumbered,
  FormatAlignLeft,
  FormatAlignCenter,
  FormatAlignRight,
  FormatAlignJustify,
  HorizontalRule,
  Link,
  Image as ImageIcon,
} from '@mui/icons-material';
import { ToggleButtonGroup, ToggleButton, Divider, Box, IconButton } from '@mui/material';

interface MenuBarProps {
  editor: Editor | null;
}

const MenuBar: React.FC<MenuBarProps> = ({ editor }) => {
  if (!editor) return null;

  return (
    <Box sx={{ 
      display: 'flex', 
      flexWrap: 'wrap',
      gap: 0.5,
      p: 1,
      borderBottom: '1px solid',
      borderColor: 'divider',
      backgroundColor: 'background.paper',
    }}>
      <ToggleButtonGroup size="small" exclusive>
        <ToggleButton
          value="bold"
          onClick={() => editor.chain().focus().toggleBold().run()}
          selected={editor.isActive('bold')}
          size="small"
        >
          <FormatBold fontSize="small" />
        </ToggleButton>
        <ToggleButton
          value="italic"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          selected={editor.isActive('italic')}
          size="small"
        >
          <FormatItalic fontSize="small" />
        </ToggleButton>
        <ToggleButton
          value="underline"
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          selected={editor.isActive('underline')}
          size="small"
        >
          <FormatUnderlined fontSize="small" />
        </ToggleButton>
        <ToggleButton
          value="strike"
          onClick={() => editor.chain().focus().toggleStrike().run()}
          selected={editor.isActive('strike')}
          size="small"
        >
          <FormatStrikethrough fontSize="small" />
        </ToggleButton>
      </ToggleButtonGroup>

      <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />

      <ToggleButtonGroup size="small" exclusive>
        <ToggleButton
          value="h1"
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          selected={editor.isActive('heading', { level: 1 })}
          size="small"
        >
          H1
        </ToggleButton>
        <ToggleButton
          value="h2"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          selected={editor.isActive('heading', { level: 2 })}
          size="small"
        >
          H2
        </ToggleButton>
        <ToggleButton
          value="h3"
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          selected={editor.isActive('heading', { level: 3 })}
          size="small"
        >
          H3
        </ToggleButton>
      </ToggleButtonGroup>

      <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />

      <ToggleButtonGroup size="small" exclusive>
        <ToggleButton
          value="bullet"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          selected={editor.isActive('bulletList')}
          size="small"
        >
          <FormatListBulleted fontSize="small" />
        </ToggleButton>
        <ToggleButton
          value="ordered"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          selected={editor.isActive('orderedList')}
          size="small"
        >
          <FormatListNumbered fontSize="small" />
        </ToggleButton>
      </ToggleButtonGroup>

      <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />

      <ToggleButtonGroup size="small" exclusive>
        <ToggleButton
          value="left"
          onClick={() => editor.chain().focus().setTextAlign('left').run()}
          selected={editor.isActive({ textAlign: 'left' })}
          size="small"
        >
          <FormatAlignLeft fontSize="small" />
        </ToggleButton>
        <ToggleButton
          value="center"
          onClick={() => editor.chain().focus().setTextAlign('center').run()}
          selected={editor.isActive({ textAlign: 'center' })}
          size="small"
        >
          <FormatAlignCenter fontSize="small" />
        </ToggleButton>
        <ToggleButton
          value="right"
          onClick={() => editor.chain().focus().setTextAlign('right').run()}
          selected={editor.isActive({ textAlign: 'right' })}
          size="small"
        >
          <FormatAlignRight fontSize="small" />
        </ToggleButton>
        <ToggleButton
          value="justify"
          onClick={() => editor.chain().focus().setTextAlign('justify').run()}
          selected={editor.isActive({ textAlign: 'justify' })}
          size="small"
        >
          <FormatAlignJustify fontSize="small" />
        </ToggleButton>
      </ToggleButtonGroup>

      <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />

      <ToggleButtonGroup size="small">
        {/* <ToggleButton
          value="blockquote"
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          selected={editor.isActive('blockquote')}
          size="small"
        >
          <FormatQuote fontSize="small" />
        </ToggleButton> */}
        {/* <ToggleButton
          value="code"
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          selected={editor.isActive('codeBlock')}
          size="small"
        >
          <Code fontSize="small" />
        </ToggleButton>
        <ToggleButton
          value="hr"
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          size="small"
        >
          <HorizontalRule fontSize="small" />
        </ToggleButton> */}
        {/* <ToggleButton
          value="link"
          onClick={() => {
            const previousUrl = editor.getAttributes('link').href;
            const url = window.prompt('URL', previousUrl);

            if (url === null) return;

            if (url === '') {
              editor.chain().focus().extendMarkRange('link').unsetLink().run();
              return;
            }

            editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
          }}
          selected={editor.isActive('link')}
          size="small"
        >
          <Link fontSize="small" />
        </ToggleButton> */}

        {/* <ToggleButton
          value="image"
          onClick={() => {
            const url = window.prompt('URL');

            if (url) {
              editor.chain().focus().setImage({ src: url }).run();
            }
          }}
          size="small"
        >
          <ImageIcon fontSize="small" />
        </ToggleButton> */}
      </ToggleButtonGroup>
    </Box>
  );
};

export default MenuBar;