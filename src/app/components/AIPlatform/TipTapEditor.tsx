// // components/TipTapEditor/index.tsx
// import React, { useEffect, ReactNode } from 'react';
// import { useEditor, EditorContent, Editor } from '@tiptap/react';
// import StarterKit from '@tiptap/starter-kit';
// import Typography from '@tiptap/extension-typography';
// import Underline from '@tiptap/extension-underline';
// import TextAlign from '@tiptap/extension-text-align';
// import Link from '@tiptap/extension-link';
// import Image from '@tiptap/extension-image';
// import { Box } from '@mui/material';
// import MenuBar from './MenuBar';

// interface TipTapEditorProps {
//   initialContent?: string | ReactNode;
//   onChange?: (html: string) => void;
//   editable?: boolean;
// }

// const TipTapEditor: React.FC<TipTapEditorProps> = ({ 
//   initialContent = '', 
//   onChange,
//   editable = true 
// }) => {
//   const editor = useEditor({
//     extensions: [
//       StarterKit,
//       Typography,
//       Underline,
//       TextAlign.configure({
//         types: ['heading', 'paragraph'],
//       }),
//       Link.configure({
//         openOnClick: false,
//       }),
//       Image,
//     ],
//     content: initialContent,
//     editable,
//     onUpdate: ({ editor }) => {
//       if (onChange) {
//         onChange(editor.getHTML());
//       }
//     },
//   });

//   useEffect(() => {
//     if (editor && initialContent !== undefined) {
//       editor.commands.setContent(initialContent);
//     }
//   }, [editor, initialContent]);

//   // If the content is already a React node (like our formatted JSON with copy button),
//   // render it directly without the TipTap editor
//   if (React.isValidElement(initialContent) || (initialContent && typeof initialContent !== 'string')) {
//     return (
//       <Box 
//         component="div"
//         sx={{ 
//           border: '1px solid', 
//           borderColor: 'divider', 
//           borderRadius: 1,
//           overflow: 'hidden',
//           position: 'relative',
//           minHeight: '200px',
//           maxHeight: '400px',
//           overflowY: 'auto',
//           padding: 2,
//           '& pre': {
//             margin: 0,
//             whiteSpace: 'pre-wrap',
//             wordBreak: 'break-word',
//             fontFamily: 'monospace',
//             fontSize: '0.9em',
//             lineHeight: 1.5,
//           },
//           '& code': {
//             fontFamily: 'monospace',
//           },
//         }}
//       >
//         {initialContent as ReactNode}
//       </Box>
//     );
//   }

//   // Otherwise, use the TipTap editor
//   return (
//     <Box sx={{ 
//       border: '1px solid', 
//       borderColor: 'divider', 
//       borderRadius: 1,
//       overflow: 'hidden',
//       '& .ProseMirror': {
//         minHeight: '200px',
//         maxHeight: '400px',
//         overflowY: 'auto',
//         padding: 2,
//         '&:focus': {
//           outline: 'none',
//         },
//         '& h1, & h2, & h3': {
//           margin: '1em 0 0.5em 0',
//         },
//         '& p': {
//           margin: '1em 0',
//         },
//         '& ul, & ol': {
//           paddingLeft: '1.5em',
//           margin: '0.5em 0',
//         },
//         '& pre': {
//           backgroundColor: '#f5f5f5',
//           padding: '1em',
//           borderRadius: '0.5em',
//           overflowX: 'auto',
//           fontSize: '0.9em',
//           lineHeight: 1.5,
//           margin: '1em 0',
//           '& code': {
//             backgroundColor: 'transparent',
//             padding: 0,
//             borderRadius: 0,
//             color: '#333',
//             fontFamily: 'monospace',
//             whiteSpace: 'pre',
//             display: 'block',
//           },
//         },
//         '&:not(pre) > code': {
//           backgroundColor: '#f5f5f5',
//           padding: '0.2em 0.4em',
//           borderRadius: '0.25em',
//           fontSize: '0.9em',
//           fontFamily: 'monospace',
//         },
//         '& blockquote': {
//           borderLeft: '4px solid #ddd',
//           paddingLeft: '1em',
//           margin: '1em 0',
//           color: '#666',
//         },
//       },
//     }}>
//       {editable && <MenuBar editor={editor} />}
//       <EditorContent editor={editor} />
//     </Box>
//   );
// };

// export default TipTapEditor;




'use client';

import React, { useEffect } from 'react';
import { useEditor, EditorContent, EditorEvents } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Typography from '@tiptap/extension-typography';
import TextAlign from '@tiptap/extension-text-align';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import { Box, SxProps, Theme } from '@mui/material';
import MenuBar from './MenuBar';

interface TipTapEditorProps {
  initialContent?: string;
  onUpdate?: (props: EditorEvents['update']) => void;
  editable?: boolean;
  sx?: SxProps<Theme>;
}

const TipTapEditor: React.FC<TipTapEditorProps> = ({ 
  initialContent = '', 
  onUpdate,
  editable = true,
  sx = {}
}) => {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Typography,
      Underline,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Link.configure({ openOnClick: false }),
      Image,
    ],
    content: initialContent,
    editable,
    onUpdate,
  });

  useEffect(() => {
    if (editor && initialContent !== editor.getHTML()) {
      editor.commands.setContent(initialContent, false);
    }
  }, [initialContent, editor]);

  return (
    // This Box is the main container with the border
    <Box sx={{ 
      border: '1px solid', 
      borderColor: 'divider', 
      borderRadius: 1,
      overflow: 'hidden',
      // The styles for the editor area are now defined here for better control
      '& .ProseMirror': {
        minHeight: '150px', // Ensures a minimum height
        maxHeight: '400px',
        overflowY: 'auto',
        padding: (theme) => theme.spacing(2), // Use theme spacing for consistency
        // This removes the unwanted focus outline on the editable area itself
        '&:focus': {
          outline: 'none',
        },
        // --- Optional: Reset margins for elements inside the editor ---
        '& p': {
          margin: 0,
        },
        '& h1, & h2, & h3': {
          margin: '0.5em 0',
        }
      },
      ...sx // Merge with any custom styles passed in props
    }}>
      {editable && <MenuBar editor={editor} />}
      <EditorContent editor={editor} />
    </Box>
  );
};

export default TipTapEditor;