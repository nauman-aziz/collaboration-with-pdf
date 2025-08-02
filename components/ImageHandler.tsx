'use client';

import React, { useState, useRef } from 'react';
import { ImageElement } from '@/types/pdf-editor';
import { Upload, X, RotateCw, Move } from 'lucide-react';

interface ImageHandlerProps {
  onImageAdd: (imageData: string, x: number, y: number, pageIndex: number) => void;
  onImageUpdate: (id: string, updates: Partial<ImageElement>) => void;
  selectedImage: ImageElement | null;
  zoom: number;
}

export default function ImageHandler({ 
  onImageAdd, 
  onImageUpdate, 
  selectedImage,
  zoom 
}: ImageHandlerProps) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const imageData = event.target?.result as string;
        // Default position - center of first page
        onImageAdd(imageData, 100, 100, 0);
      };
      reader.readAsDataURL(file);
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  if (selectedImage) {
    return (
      <div
        className="absolute bg-white border-2 border-green-500 rounded-lg shadow-lg p-2"
        style={{
          left: (selectedImage.x + selectedImage.width) * zoom + 10,
          top: selectedImage.y * zoom,
          zIndex: 1000,
        }}
      >
        <div className="text-sm font-medium mb-2">Image Properties</div>
        
        <div className="space-y-2">
          <div>
            <label className="text-xs text-gray-600">Width:</label>
            <input
              type="number"
              value={Math.round(selectedImage.width)}
              onChange={(e) => onImageUpdate(selectedImage.id, { width: Number(e.target.value) })}
              className="w-full text-xs border rounded px-1 py-1"
            />
          </div>
          
          <div>
            <label className="text-xs text-gray-600">Height:</label>
            <input
              type="number"
              value={Math.round(selectedImage.height)}
              onChange={(e) => onImageUpdate(selectedImage.id, { height: Number(e.target.value) })}
              className="w-full text-xs border rounded px-1 py-1"
            />
          </div>

          <div className="flex gap-1">
            <button
              onClick={() => onImageUpdate(selectedImage.id, { 
                width: selectedImage.height, 
                height: selectedImage.width 
              })}
              className="flex-1 p-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600"
              title="Rotate 90°"
            >
              <RotateCw size={12} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />
      
      <button
        onClick={triggerFileSelect}
        className="fixed bottom-4 right-4 bg-green-500 text-white p-3 rounded-full shadow-lg hover:bg-green-600 transition-colors z-50"
        title="Add Image"
      >
        <Upload size={20} />
      </button>
    </>
  );
}