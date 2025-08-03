'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf';
import workerSrc from 'pdfjs-dist/build/pdf.worker.entry';
import html2canvas from 'html2canvas';

pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;

export interface TextItem {
  str: string;
  transform: number[];
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

  useEffect(() => {
    (async () => {
      const dpr = window.devicePixelRatio || 1;
      const pdf = await pdfjs.getDocument({ data }).promise;
      const page = await pdf.getPage(pageIndex + 1);
      const vp = page.getViewport({ scale: zoom });

      // size the canvas
      const cnv = canvasRef.current!;
      cnv.width  = vp.width * dpr;
      cnv.height = vp.height * dpr;
      cnv.style.width  = `${vp.width}px`;
      cnv.style.height = `${vp.height}px`;
      const ctx = cnv.getContext('2d')!;
      ctx.scale(dpr, dpr);

      // render
      await page.render({ canvasContext: ctx, viewport: vp }).promise;

      // extract text runs
      const txt = await page.getTextContent();
      const its: TextItem[] = txt.items.map((t: any) => ({
        str:       t.str,
        transform: t.transform,
        width:     t.width,
        height:    t.height,
      }));
      setItems(its);

      // init edits
      const m = new Map<number,string>();
      its.forEach((_, i) => m.set(i, its[i].str));
      setEdits(m);

      // snapshot after paint, with extra 10% height padding
      requestAnimationFrame(() => {
        if (containerRef.current) {
          const W = containerRef.current.scrollWidth;
          const H = containerRef.current.scrollHeight * dpr * 1.1; // +10%
          html2canvas(containerRef.current, {
            scale: dpr,
            backgroundColor: null,
            width: W * dpr,
            height: H,
          }).then(c => onSnapshot(pageIndex, c.toDataURL('image/png')));
        }
      });
    })();
  }, [data, pageIndex, zoom, onSnapshot]);

  const handleInput = (idx: number, txt: string) => {
    // debugger;
    setEdits(prev => {
      const copy = new Map(prev);
      copy.set(idx, txt);

      // re-snapshot
      requestAnimationFrame(() => {
        if (containerRef.current) {
          const dpr = window.devicePixelRatio || 1;
          const W = containerRef.current.scrollWidth;
          const H = containerRef.current.scrollHeight * dpr * 1.1;
          html2canvas(containerRef.current, {
            scale: dpr,
            backgroundColor: null,
            width: W * dpr,
            height: H,
          }).then(cnv => onSnapshot(pageIndex, cnv.toDataURL('image/png')));
        }
      });

      return copy;
    });
  };

  return (
    <div ref={containerRef} className="relative inline-block" >
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
            contentEditable
            suppressContentEditableWarning
            onInput={(e) => handleInput(i, e.currentTarget.innerText)}
            className="absolute"
            style={{
              left,
              top,
              width: it.width * zoom,
              height: it.height * zoom * 1.9, // +10%
              fontSize: `${it.height * zoom * 0.9}px`,
              lineHeight: 1,
              whiteSpace: "pre",
              overflow: "hidden",
              backgroundColor: "#fff",
              pointerEvents: "all",
              userSelect: "text",
              zIndex: 10,
              border: "none",
            }}
          >
            {edits.get(i)}
          </div>
        );
      })}
    </div>
  );
}
