// components/EditablePDFPage.tsx
'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf';
import workerSrc from 'pdfjs-dist/build/pdf.worker.entry';

// Point PDF.js at the bundled worker
pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;

export interface TextItem {
  str: string;
  transform: number[]; // [a, b, c, d, tx, ty]
  width: number;
  height: number;
}

interface EditablePDFPageProps {
  data: Uint8Array;
  pageIndex: number;
  zoom?: number;
  onSaveText: (page: number, edits: { item: TextItem; newStr: string }[]) => void;
}

export default function EditablePDFPage({
  data,
  pageIndex,
  zoom = 1,
  onSaveText,
}: EditablePDFPageProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [items, setItems] = useState<TextItem[]>([]);
  const [edits, setEdits] = useState<Map<number, string>>(new Map());

  useEffect(() => {
    (async () => {
      const pdf = await pdfjs.getDocument({ data }).promise;
      const page = await pdf.getPage(pageIndex + 1);
      const viewport = page.getViewport({ scale: zoom });

      // render into canvas
      const cnv = canvasRef.current!;
      cnv.width = viewport.width;
      cnv.height = viewport.height;
      const ctx = cnv.getContext('2d')!;
      await page.render({ canvasContext: ctx, viewport }).promise;

      // extract text runs
      const txt = await page.getTextContent();
      const its = txt.items.map((t: any) => ({
        str: t.str,
        transform: t.transform,
        width: t.width,
        height: t.height,
      }));
      setItems(its);
      setEdits(new Map(its.map((_, i) => [i, its[i].str])));
    })();
  }, [data, pageIndex, zoom]);

  const handleSave = () => {
    const arr = Array.from(edits.entries()).map(([i, newStr]) => ({
      item: items[i],
      newStr,
    }));
    onSaveText(pageIndex, arr);
  };

  return (
    <div className="relative inline-block">
      {/* Underlying PDF image */}
      <canvas
        ref={canvasRef}
        className="block"
        style={{ pointerEvents: 'none' }}
      />

      {/* One contentEditable div per text run, with white background */}
      {items.map((it, i) => {
        const [, , , , tx, ty] = it.transform;
        const left = tx * zoom;
        const top = canvasRef.current
          ? canvasRef.current.height - ty * zoom - it.height * zoom
          : 0;

        return (
          <div
            key={i}
            contentEditable
            suppressContentEditableWarning
            className="absolute"
            style={{
              left,
              top,
              width: it.width * zoom,
              height: it.height * zoom,
              fontSize: `${it.height * zoom}px`,
              lineHeight: 1,
              whiteSpace: 'pre',
              overflow: 'hidden',

              /* 👇 hide the original PDF text underneath */
              backgroundColor: '#ffffff',

              /* ensure you can click & select */
              pointerEvents: 'all',
              userSelect: 'text',
              zIndex: 10,
            }}
            onInput={e => {
              const v = (e.target as HTMLDivElement).innerText;
              setEdits(m => new Map(m).set(i, v));
            }}
          >
            {edits.get(i)}
          </div>
        );
      })}

      <button
        onClick={handleSave}
        className="mt-2 px-3 py-1 bg-blue-600 text-white rounded text-sm"
      >
        Save Page {pageIndex + 1}
      </button>
    </div>
  );
}
