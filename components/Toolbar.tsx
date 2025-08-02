'use client';

import React from 'react';
import { 
  MousePointer, 
  Type, 
  Image, 
  Download, 
  ZoomIn, 
  ZoomOut, 
  Undo, 
  Redo,
  Users,
  Save
} from 'lucide-react';

interface ToolbarProps {
  currentTool: 'select' | 'text' | 'image';
  onToolChange: (tool: 'select' | 'text' | 'image') => void;
  zoom: number;
  onZoomChange: (zoom: number) => void;
  onDownload: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  connectedUsers: number;
  canUndo?: boolean;
  canRedo?: boolean;
}

export default function Toolbar({
  currentTool,
  onToolChange,
  zoom,
  onZoomChange,
  onDownload,
  onUndo,
  onRedo,
  connectedUsers,
  canUndo = false,
  canRedo = false,
}: ToolbarProps) {
  const tools = [
    { id: 'select' as const, icon: MousePointer, label: 'Select' },
    { id: 'text' as const, icon: Type, label: 'Add Text' },
    { id: 'image' as const, icon: Image, label: 'Add Image' },
  ];

  return (
    <div className="bg-white border-b border-gray-200 px-4 py-2 flex items-center justify-between shadow-sm">
      {/* Left side - Tools */}
      <div className="flex items-center gap-1">
        {tools.map((tool) => (
          <button
            key={tool.id}
            onClick={() => onToolChange(tool.id)}
            className={`p-2 rounded-md transition-colors ${
              currentTool === tool.id
                ? 'bg-blue-500 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
            title={tool.label}
          >
            <tool.icon size={20} />
          </button>
        ))}

        <div className="w-px h-6 bg-gray-300 mx-2" />

        {/* Undo/Redo */}
        <button
          onClick={onUndo}
          disabled={!canUndo}
          className={`p-2 rounded-md transition-colors ${
            canUndo
              ? 'text-gray-600 hover:bg-gray-100'
              : 'text-gray-300 cursor-not-allowed'
          }`}
          title="Undo"
        >
          <Undo size={20} />
        </button>

        <button
          onClick={onRedo}
          disabled={!canRedo}
          className={`p-2 rounded-md transition-colors ${
            canRedo
              ? 'text-gray-600 hover:bg-gray-100'
              : 'text-gray-300 cursor-not-allowed'
          }`}
          title="Redo"
        >
          <Redo size={20} />
        </button>
      </div>

      {/* Center - Zoom Controls */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => onZoomChange(Math.max(0.25, zoom - 0.25))}
          className="p-2 text-gray-600 hover:bg-gray-100 rounded-md"
          title="Zoom Out"
        >
          <ZoomOut size={20} />
        </button>

        <div className="px-3 py-1 bg-gray-100 rounded-md text-sm font-medium min-w-[80px] text-center">
          {Math.round(zoom * 100)}%
        </div>

        <button
          onClick={() => onZoomChange(Math.min(3, zoom + 0.25))}
          className="p-2 text-gray-600 hover:bg-gray-100 rounded-md"
          title="Zoom In"
        >
          <ZoomIn size={20} />
        </button>
      </div>

      {/* Right side - Actions */}
      <div className="flex items-center gap-2">
        {/* Connected Users */}
        <div className="flex items-center gap-2 px-3 py-1 bg-green-50 rounded-md">
          <Users size={16} className="text-green-600" />
          <span className="text-sm font-medium text-green-800">
            {connectedUsers} connected
          </span>
        </div>

        <button
          onClick={onDownload}
          className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
        >
          <Download size={16} />
          Download PDF
        </button>
      </div>
    </div>
  );
}