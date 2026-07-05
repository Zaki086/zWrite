import { memo, useRef } from 'react';
import { Upload } from 'lucide-react';
import { motion } from 'framer-motion';
import { parseDocx } from '@/utils/docxImport';
import type { Editor } from '@tiptap/react';

interface Props {
  editor: Editor | null;
}

export const ImportDocxButton = memo(function ImportDocxButton({ editor }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editor) return;

    try {
      const content = await parseDocx(file);
      editor.commands.setContent(content);
    } catch (err) {
      console.error('Failed to parse docx:', err);
      alert('Failed to parse DOCX file. See console for details.');
    } finally {
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <>
      <input
        type="file"
        ref={fileInputRef}
        accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        className="hidden"
        onChange={handleFileChange}
      />
      <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={() => fileInputRef.current?.click()}
        className="flex items-center justify-center w-8 h-8 rounded-md hover:bg-accent text-muted-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
        aria-label="Import DOCX"
        type="button"
        title="Import DOCX"
      >
        <Upload className="w-4 h-4" />
      </motion.button>
    </>
  );
});
