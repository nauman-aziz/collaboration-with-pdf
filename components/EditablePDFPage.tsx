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
  const caretRef = useRef<{ idx: number; offset: number } | null>(null);

  useEffect(() => {
    (async () => {
      const dpr = window.devicePixelRatio || 1;
      const pdf = await pdfjs.getDocument({ data }).promise;
      const page = await pdf.getPage(pageIndex + 1);
      const vp = page.getViewport({ scale: zoom });

      // 1) Setup HiDPI canvas
      const cnv = canvasRef.current!;
      cnv.width  = vp.width * dpr;
      cnv.height = vp.height * dpr;
      cnv.style.width  = `${vp.width}px`;
      cnv.style.height = `${vp.height}px`;
      const ctx = cnv.getContext('2d')!;
      ctx.scale(dpr, dpr);

      // 2) Prevent PDF.js from drawing text so we don't white-out underlying graphics
      const origFill   = ctx.fillText.bind(ctx);
      const origStroke = ctx.strokeText.bind(ctx);
      ctx.fillText   = () => {};
      ctx.strokeText = () => {};

      // 3) Render the page (graphics only)
      await page.render({ canvasContext: ctx, viewport: vp }).promise;

      // 4) Restore text drawing methods for html2canvas & overlays
      ctx.fillText   = origFill;
      ctx.strokeText = origStroke;

      // 5) Extract text runs
      const txt = await page.getTextContent();
      const its: TextItem[] = txt.items.map((t: any) => ({
        str:       t.str,
        transform: t.transform,
        width:     t.width,
        height:    t.height,
      }));
      setItems(its);

      // 6) Initialize edits to original strings
      const m = new Map<number,string>();
      its.forEach((_, i) => m.set(i, its[i].str));
      setEdits(m);

      // 7) Snapshot for download
      requestAnimationFrame(() => {
        if (!containerRef.current) return;
        const W = containerRef.current.scrollWidth;
        const H = containerRef.current.scrollHeight * dpr * 1.1;
        html2canvas(containerRef.current, {
          scale: dpr,
          backgroundColor: null,
          width:  W * dpr,
          height: H,
        }).then(cnv2 => onSnapshot(pageIndex, cnv2.toDataURL('image/png')));
      });
    })();
  }, [data, pageIndex, zoom, onSnapshot]);

  // Restore caret position after rerender
  useLayoutEffect(() => {
    const info = caretRef.current;
    if (!info) return;
    const sel = window.getSelection();
    sel?.removeAllRanges();
    const div = containerRef.current?.querySelector<HTMLElement>(`[data-idx=\"${info.idx}\"]`);
    if (div && div.firstChild) {
      const range = document.createRange();
      range.setStart(div.firstChild, Math.min(info.offset, div.innerText.length));
      range.collapse(true);
      sel?.addRange(range);
      div.focus();
    }
    caretRef.current = null;
  }, [edits]);

  // Handle text edits
  const handleInput = (idx: number, newText: string) => {
    const sel = window.getSelection();
    if (sel?.rangeCount) {
      const r = sel.getRangeAt(0);
      caretRef.current = { idx, offset: r.startOffset };
    }

    setEdits(prev => {
      const copy = new Map(prev);
      copy.set(idx, newText);
      return copy;
    });

    // Re-snapshot for download
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
      }).then(cnv2 => onSnapshot(pageIndex, cnv2.toDataURL('image/png')));
    });
  };

  return (
    <div ref={containerRef} className="relative inline-block">
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
              width: it.width * zoom,
              height: it.height * zoom * 1.9,
              fontSize: `${it.height * zoom * 0.9}px`,
              lineHeight: 1,
              whiteSpace: "pre",
              overflow: "visible",
              pointerEvents: "all",
              userSelect: "text",
              unicodeBidi: "plaintext",
              zIndex: 10,
            }}
          >
            {edits.get(i)}
          </div>
        );
      })}
    </div>
  );
}
