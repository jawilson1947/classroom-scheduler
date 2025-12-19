'use client';

import React, { useEffect, useRef } from 'react';
import Quill from 'quill';
import 'quill/dist/quill.snow.css';

interface QuillEditorProps {
    value: string;
    onChange: (value: string) => void;
}

export default function QuillEditor({ value, onChange }: QuillEditorProps) {
    const editorRef = useRef<HTMLDivElement>(null);
    const quillRef = useRef<Quill | null>(null);

    useEffect(() => {
        if (editorRef.current && !quillRef.current) {
            quillRef.current = new Quill(editorRef.current, {
                theme: 'snow',
                modules: {
                    toolbar: [
                        ['bold', 'italic', 'underline', 'strike'],
                        [{ 'list': 'ordered' }, { 'list': 'bullet' }],
                        ['clean']
                    ]
                }
            });

            quillRef.current.on('text-change', () => {
                const html = editorRef.current?.querySelector('.ql-editor')?.innerHTML || '';
                onChange(html);
            });
        }
    }, []); // Empty dependency array ensures initialization only happens once

    // Update editor content when value prop changes externally
    useEffect(() => {
        if (quillRef.current && value !== quillRef.current.root.innerHTML) {
            // Only update if content is different to avoid cursor jumping
            // Note: simple check, might need more robust comparison for complex HTML
            if (editorRef.current?.querySelector('.ql-editor')) {
                const currentContent = editorRef.current.querySelector('.ql-editor')!.innerHTML;
                if (value !== currentContent) {
                    // Check if empty values match (Quill often has <p><br></p> for empty)
                    const isValueEmpty = !value || value === '<p><br></p>';
                    const isCurrentEmpty = currentContent === '<p><br></p>' || !currentContent;

                    if (!isValueEmpty || !isCurrentEmpty) {
                        quillRef.current.clipboard.dangerouslyPasteHTML(value);
                    }
                }
            }
        }
    }, [value]);

    return (
        <div className="bg-white text-slate-900">
            <div ref={editorRef} className="min-h-[150px]" />
        </div>
    );
}
