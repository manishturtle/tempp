import React, { useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Typography from '@tiptap/extension-typography';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import { Box, Paper } from '@mui/material';
import MenuBar from './MenuBar';

interface TipTapEditorProps {
  initialContent?: string;
  onChange?: (html: string) => void;
  editable?: boolean;
}

const TipTapEditor: React.FC<TipTapEditorProps> = ({ 
  initialContent = '', 
  onChange,
  editable = true
}) => {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Typography,
      Underline,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
        alignments: ['left', 'center', 'right', 'justify'],
        defaultAlignment: 'left',
      }),
    ],
    content: initialContent,
    editable,
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      if (onChange) {
        onChange(editor.getHTML());
      }
    },
  });
  
  // Update editor content when initialContent prop changes
  useEffect(() => {
    if (editor && initialContent && editor.getHTML() !== initialContent) {
      console.log('Updating editor content from prop change');
      editor.commands.setContent(initialContent);
    }
  }, [editor, initialContent]);

  return (
    <Paper 
      variant="outlined" 
      sx={{ 
        overflow: 'hidden',
        '& .ProseMirror': {
          p: 2,
          minHeight: '300px',
          outline: 'none',
          '&:focus': {
            outline: 'none',
          },
          '& p': {
            my: 1,
          },
          '& h1, & h2, & h3, & h4, & h5, & h6': {
            mt: 2,
            mb: 1,
          },
          '& ul, & ol': {
            pl: 3,
          },
          '& blockquote': {
            borderLeft: '3px solid #ddd',
            pl: 2,
            my: 2,
            color: 'text.secondary',
          },
          '& pre': {
            backgroundColor: '#f5f5f5',
            p: 1,
            borderRadius: 1,
            overflowX: 'auto',
          },
          '& code': {
            backgroundColor: '#f5f5f5',
            p: 0.5,
            borderRadius: 0.5,
            fontFamily: 'monospace',
          },
          '& u': {
            textDecoration: 'underline',
          },
          '& .text-left': {
            textAlign: 'left',
          },
          '& .text-center': {
            textAlign: 'center',
          },
          '& .text-right': {
            textAlign: 'right',
          },
          '& .text-justify': {
            textAlign: 'justify',
          },
          '& hr': {
            my: 2,
            border: 'none',
            height: '1px',
            backgroundColor: '#ddd',
          },
        }
      }}
    >
      <MenuBar editor={editor} />
      <Box sx={{ p: 2, border: '1px solid #ddd', borderTop: 'none', borderRadius: '0 0 4px 4px' }}>
        <EditorContent editor={editor} />
      </Box>
    </Paper>
  );
};

export default TipTapEditor;