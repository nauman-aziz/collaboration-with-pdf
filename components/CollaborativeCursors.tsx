'use client';

import React from 'react';
import { Cursor } from '@/types/pdf-editor';

interface CollaborativeCursorsProps {
  cursors: Map<string, Cursor>;
  zoom: number;
}

export default function CollaborativeCursors({ cursors, zoom }: CollaborativeCursorsProps) {
  return (
    <>
      {Array.from(cursors.values()).map((cursor) => (
        <div
          key={cursor.userId}
          className="absolute pointer-events-none z-50"
          style={{
            left: cursor.x * zoom,
            top: cursor.y * zoom,
            transform: 'translate(-2px, -2px)',
          }}
        >
          {/* Cursor */}
          <div
            className="w-4 h-4 transform rotate-45"
            style={{
              backgroundColor: cursor.color,
              clipPath: 'polygon(0 0, 100% 100%, 0 100%)',
            }}
          />
          
          {/* User label */}
          <div
            className="absolute top-4 left-2 px-2 py-1 rounded text-xs text-white font-medium whitespace-nowrap"
            style={{ backgroundColor: cursor.color }}
          >
            {cursor.userName}
          </div>
        </div>
      ))}
    </>
  );
}