'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf';
import workerSrc from 'pdfjs-dist/build/pdf.worker.entry';

pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;

export interface TextItem {
  str: string;
  transform: number[]; // [a,b,c,d,tx,ty]
  width: number;
  height: number;
}

interface EditablePDFPageProps {
  data: Uint8Array;
  pageIndex: number;
  zoom?: number;
  /**
   * Called on *every* text change.
   * pageIdx: which zero‐based page
   * edits:  array of { item, newStr }
   */
  onChange: (pageIdx: number, edits: { item: TextItem; newStr: string }[]) => void;
}

export default function EditablePDFPage({
  data,
  pageIndex,
  zoom = 1,
  onChange,
}: EditablePDFPageProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [items, setItems] = useState<TextItem[]>([]);
  const [edits, setEdits] = useState<Map<number,string>>(new Map());

  useEffect(() => {
    (async () => {
      const pdf  = await pdfjs.getDocument({ data }).promise;
      const page = await pdf.getPage(pageIndex + 1);
      const vp   = page.getViewport({ scale: zoom });

      // render PDF page
      const cnv = canvasRef.current!;
      cnv.width = vp.width;
      cnv.height = vp.height;
      const ctx = cnv.getContext('2d')!;
      await page.render({ canvasContext: ctx, viewport: vp }).promise;

      // extract text runs
      const txt = await page.getTextContent();
      const its = txt.items.map((t: any) => ({
        str:       t.str,
        transform: t.transform,
        width:     t.width,
        height:    t.height,
      }));
      setItems(its);

      // init edits map
      const m = new Map<number,string>();
      its.forEach((_, i) => m.set(i, its[i].str));
      setEdits(m);

      // fire initial onChange
      const arr = its.map((item, i) => ({ item, newStr: its[i].str }));
      onChange(pageIndex, arr);
    })();
  }, [data, pageIndex, zoom, onChange]);

  // whenever a run is edited
  const handleInput = (idx: number, newText: string) => {
    setEdits(prev => {
      const copy = new Map(prev);
      copy.set(idx, newText);

      const arr = Array.from(copy.entries()).map(([i, str]) => ({
        item:   items[i],
        newStr: str,
      }));
      onChange(pageIndex, arr);
      return copy;
    });
  };

  return (
    <div className="relative inline-block">
      <canvas
        ref={canvasRef}
        className="block"
        style={{ pointerEvents: 'none' }}
      />

      {items.map((it, i) => {
        const [, , , , tx, ty] = it.transform;
        const left = tx * zoom;
        const top  = canvasRef.current
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
              width:           it.width * zoom,
              height:          it.height * zoom,
              fontSize:        `${it.height * zoom}px`,
              lineHeight:      1,
              whiteSpace:      'pre',
              overflow:        'hidden',
              backgroundColor: '#fff',
              pointerEvents:   'all',
              userSelect:      'text',
              zIndex:          10,
            }}
            onInput={e =>
              handleInput(i, (e.target as HTMLDivElement).innerText)
            }
          >
            {edits.get(i)}
          </div>
        );
      })}
    </div>
  );
}
