'use client';

import React from 'react';
import { EditorElement, TextElement, ImageElement } from '@/types/pdf-editor';

interface ElementOverlayProps {
  elements: EditorElement[];
  selectedElementId: string | null;
  onElementSelect: (id: string) => void;
  onElementDoubleClick: (element: EditorElement) => void;
  zoom: number;
  pageHeight: number;
}

export default function ElementOverlay({
  elements,
  selectedElementId,
  onElementSelect,
  onElementDoubleClick,
  zoom,
  pageHeight,
}: ElementOverlayProps) {
  return (
    <div className="absolute inset-0 pointer-events-none">
      {elements.map((element) => {
        const isSelected = selectedElementId === element.id;
        
        if (element.type === 'text') {
          const textElement = element as TextElement;
          return (
            <div
              key={element.id}
              className={`absolute pointer-events-auto cursor-pointer border-2 transition-colors ${
                isSelected ? 'border-blue-500 bg-blue-50' : 'border-transparent hover:border-blue-300'
              }`}
              style={{
                left: textElement.x * zoom,
                top: textElement.y * zoom,
                width: textElement.width * zoom,
                height: textElement.height * zoom,
                fontSize: textElement.fontSize * zoom,
                color: textElement.color,
                fontWeight: textElement.bold ? 'bold' : 'normal',
                fontStyle: textElement.italic ? 'italic' : 'normal',
                fontFamily: textElement.fontFamily,
                overflow: 'hidden',
                wordWrap: 'break-word',
              }}
              onClick={() => onElementSelect(element.id)}
              onDoubleClick={() => onElementDoubleClick(element)}
            >
              {textElement.content}
              
              {isSelected && (
                <div className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full" />
              )}
            </div>
          );
        }
        
        if (element.type === 'image') {
          const imageElement = element as ImageElement;
          return (
            <div
              key={element.id}
              className={`absolute pointer-events-auto cursor-pointer border-2 transition-colors ${
                isSelected ? 'border-green-500' : 'border-transparent hover:border-green-300'
              }`}
              style={{
                left: imageElement.x * zoom,
                top: imageElement.y * zoom,
                width: imageElement.width * zoom,
                height: imageElement.height * zoom,
              }}
              onClick={() => onElementSelect(element.id)}
              onDoubleClick={() => onElementDoubleClick(element)}
            >
              <img
                src={imageElement.src}
                alt="Inserted image"
                className="w-full h-full object-contain"
                draggable={false}
              />
              
              {isSelected && (
                <>
                  <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full" />
                  <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-green-500 rounded-full cursor-se-resize" />
                </>
              )}
            </div>
          );
        }
        
        return null;
      })}
    </div>
  );
}