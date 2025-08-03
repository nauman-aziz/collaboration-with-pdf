// components/EditablePDFPage.tsx
'use client';

import React, { useEffect, useRef, useState, useLayoutEffect } from 'react';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf';
import workerSrc from 'pdfjs-dist/build/pdf.worker.entry';
import html2canvas from 'html2canvas';

pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;

export interface TextItem {
  str: string;
  transform: number[]; // [a, b, c, d, tx, ty]
  width: number;
  height: number;
}

interface Props {
  data: Uint8Array;
  pageIndex: number;
  zoom?: number;
  onSnapshot: (pageIdx: number, dataUrl: string) => void;
}

export default function EditablePDFPage({
  data,
  pageIndex,
  zoom = 1,
  onSnapshot,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef    = useRef<HTMLCanvasElement>(null);

  const [items, setItems] = useState<TextItem[]>([]);
  const [edits, setEdits] = useState<Map<number,string>>(new Map());

  // store where caret should be restored
  const caretRef = useRef<{ idx: number; offset: number } | null>(null);

  // 1) Render PDF + extract text runs + init edits + initial snapshot
  useEffect(() => {
    (async () => {
      const dpr = window.devicePixelRatio || 1;
      const pdf = await pdfjs.getDocument({ data }).promise;
      const page = await pdf.getPage(pageIndex + 1);
      const vp = page.getViewport({ scale: zoom });

      // set up HiDPI canvas
      const cnv = canvasRef.current!;
      cnv.width  = vp.width * dpr;
      cnv.height = vp.height * dpr;
      cnv.style.width  = `${vp.width}px`;
      cnv.style.height = `${vp.height}px`;
      const ctx = cnv.getContext('2d')!;
      ctx.scale(dpr, dpr);

      await page.render({ canvasContext: ctx, viewport: vp }).promise;

      // pull text items
      const txt = await page.getTextContent();
      const its: TextItem[] = txt.items.map((t: any) => ({
        str:       t.str,
        transform: t.transform,
        width:     t.width,
        height:    t.height,
      }));
      setItems(its);

      // init edits to original
      const m = new Map<number,string>();
      its.forEach((_, i) => m.set(i, its[i].str));
      setEdits(m);

      // snapshot
      requestAnimationFrame(() => {
        if (!containerRef.current) return;
        const W = containerRef.current.scrollWidth;
        const H = containerRef.current.scrollHeight * dpr * 1.1;
        html2canvas(containerRef.current, {
          scale: dpr,
          backgroundColor: null,
          width:  W * dpr,
          height: H,
        }).then(cnv => onSnapshot(pageIndex, cnv.toDataURL('image/png')));
      });
    })();
  }, [data, pageIndex, zoom, onSnapshot]);

  // 2) Restore caret right after edits cause a re-render
  useLayoutEffect(() => {
    const info = caretRef.current;
    if (!info) return;
    const sel = window.getSelection();
    sel?.removeAllRanges();

    const div = containerRef.current?.querySelector<HTMLElement>(`[data-idx="${info.idx}"]`);
    if (div && div.firstChild) {
      const range = document.createRange();
      range.setStart(div.firstChild, Math.min(info.offset, div.innerText.length));
      range.collapse(true);
      sel?.addRange(range);
      div.focus();
    }
    caretRef.current = null;
  }, [edits]);

  // 3) Handle edits & trigger snapshot
  const handleInput = (idx: number, newText: string) => {
    // capture current caret position
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      const range = sel.getRangeAt(0);
      caretRef.current = {
        idx,
        offset: range.startOffset,
      };
    }

    // update state
    setEdits(prev => {
      const copy = new Map(prev);
      copy.set(idx, newText);
      return copy;
    });

    // snapshot next frame
    requestAnimationFrame(() => {
      if (!containerRef.current) return;
      const dpr = window.devicePixelRatio || 1;
      const W   = containerRef.current.scrollWidth;
      const H   = containerRef.current.scrollHeight * dpr * 1.1;
      html2canvas(containerRef.current, {
        scale: dpr,
        backgroundColor: null,
        width:  W * dpr,
        height: H,
      }).then(cnv => onSnapshot(pageIndex, cnv.toDataURL('image/png')));
    });
  };

  return (
    <div ref={containerRef} className="relative inline-block" style={{ paddingBottom: '10%' }}>
      <canvas ref={canvasRef} className="block" style={{ pointerEvents: 'none' }} />

      {items.map((it, i) => {
        const [, , , , tx, ty] = it.transform;
        const left = tx * zoom;
        const top  = (canvasRef.current!.height / (window.devicePixelRatio||1))
                   - ty * zoom
                   - it.height * zoom;

        return (
          <div
            key={i}
            data-idx={i}
            contentEditable
            suppressContentEditableWarning
            dir="ltr"
            onInput={e => handleInput(i, e.currentTarget.innerText)}
            className="absolute"
            style={{
              left,
              top,
              width:           it.width * zoom,
              height:          it.height * zoom * 1.9,
              fontSize:        `${it.height * zoom}px`,
              lineHeight:      1,
              whiteSpace:      'pre',
              overflow:        'visible',
              backgroundColor: '#fff',
              pointerEvents:   'all',
              userSelect:      'text',
              unicodeBidi:     'plaintext',
              outline:         'none',
              zIndex:          10,
            }}
          >
            {edits.get(i)}
          </div>
        );
      })}
    </div>
  );
}
