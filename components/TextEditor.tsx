'use client';

import React, { useState, useRef, useEffect } from 'react';
import { TextElement } from '@/types/pdf-editor';
import { Bold, Italic, Type, Palette } from 'lucide-react';

interface TextEditorProps {
  element: TextElement;
  onUpdate: (updates: Partial<TextElement>) => void;
  onComplete: () => void;
  zoom: number;
}

export default function TextEditor({ element, onUpdate, onComplete, zoom }: TextEditorProps) {
  const [content, setContent] = useState(element.content);
  const [fontSize, setFontSize] = useState(element.fontSize);
  const [color, setColor] = useState(element.color);
  const [bold, setBold] = useState(element.bold);
  const [italic, setItalic] = useState(element.italic);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
    }
  }, []);

  const handleSave = () => {
    onUpdate({
      content,
      fontSize,
      color,
      bold,
      italic,
    });
    onComplete();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      handleSave();
    } else if (e.key === 'Escape') {
      onComplete();
    }
  };

  return (
    <div
      className="absolute bg-white border-2 border-blue-500 rounded-lg shadow-lg p-2 min-w-48"
      style={{
        left: element.x * zoom,
        top: element.y * zoom,
        transform: 'translate(0, -100%)',
        zIndex: 1000,
      }}
    >
      {/* Toolbar */}
      <div className="flex items-center gap-2 mb-2 pb-2 border-b">
        <select
          value={fontSize}
          onChange={(e) => setFontSize(Number(e.target.value))}
          className="text-xs border rounded px-1 py-1"
        >
          <option value={8}>8px</option>
          <option value={10}>10px</option>
          <option value={12}>12px</option>
          <option value={14}>14px</option>
          <option value={16}>16px</option>
          <option value={18}>18px</option>
          <option value={20}>20px</option>
          <option value={24}>24px</option>
          <option value={28}>28px</option>
          <option value={32}>32px</option>
        </select>

        <button
          onClick={() => setBold(!bold)}
          className={`p-1 rounded text-xs ${bold ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
        >
          <Bold size={12} />
        </button>

        <button
          onClick={() => setItalic(!italic)}
          className={`p-1 rounded text-xs ${italic ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
        >
          <Italic size={12} />
        </button>

        <input
          type="color"
          value={color}
          onChange={(e) => setColor(e.target.value)}
          className="w-6 h-6 border rounded cursor-pointer"
        />

        <button
          onClick={handleSave}
          className="px-2 py-1 bg-green-500 text-white rounded text-xs font-medium hover:bg-green-600"
        >
          Save
        </button>
      </div>

      {/* Text Input */}
      <textarea
        ref={textareaRef}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onKeyDown={handleKeyDown}
        className="w-full min-h-[80px] p-2 border rounded resize-none text-sm"
        style={{
          fontSize: `${fontSize}px`,
          color: color,
          fontWeight: bold ? 'bold' : 'normal',
          fontStyle: italic ? 'italic' : 'normal',
        }}
        placeholder="Enter text..."
      />

      <div className="text-xs text-gray-500 mt-1">
        Ctrl+Enter to save, Esc to cancel
      </div>
    </div>
  );
}