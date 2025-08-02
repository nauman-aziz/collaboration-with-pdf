// components/PDFViewer.tsx
'use client';
// 🔥 Must appear before any call to getDocument()
import workerSrc from 'pdfjs-dist/build/pdf.worker.entry';
import { GlobalWorkerOptions } from 'pdfjs-dist/legacy/build/pdf';

if (typeof window !== 'undefined') {
  GlobalWorkerOptions.workerSrc = workerSrc;
}

import React, { useEffect, useRef, useState, useCallback } from 'react';
// ← Use the legacy build so getDocument() works in Next.js
import { getDocument, PDFDocumentProxy, PDFPageProxy } from 'pdfjs-dist/legacy/build/pdf';
import { PDFPage } from '@/types/pdf-editor';

// Point PDF.js at its worker on the CDN (no manual webpack imports needed)
if (typeof window !== 'undefined') {
  GlobalWorkerOptions.workerSrc =
    `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${(GlobalWorkerOptions as any).version}/pdf.worker.min.js`;
}

interface PDFViewerProps {
  file: File | null;
  zoom: number;
  onPagesLoaded: (pages: PDFPage[]) => void;
  onPageClick: (x: number, y: number, pageIndex: number) => void;
  children?: React.ReactNode;
}

export default function PDFViewer({
  file,
  zoom,
  onPagesLoaded,
  onPageClick,
  children,
}: PDFViewerProps) {
  const [pages, setPages] = useState<PDFPage[]>([]);
  const [loading, setLoading] = useState(false);

  // Load & rasterize offscreen canvases
  useEffect(() => {
    if (!file) {
      setPages([]);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const arrayBuffer = await file.arrayBuffer();
        const pdf: PDFDocumentProxy = await getDocument({ data: arrayBuffer }).promise;
        const loaded: PDFPage[] = [];

        for (let i = 1; i <= pdf.numPages; i++) {
          const pg: PDFPageProxy = await pdf.getPage(i);
          const viewport = pg.getViewport({ scale: 1 });
          const offscreen = document.createElement('canvas');
          offscreen.width = viewport.width;
          offscreen.height = viewport.height;
          const ctx = offscreen.getContext('2d')!;
          await pg.render({ canvasContext: ctx, viewport }).promise;
          loaded.push({ canvas: offscreen, viewport, pageNumber: i - 1 });
        }

        if (!cancelled) {
          setPages(loaded);
          onPagesLoaded(loaded);
        }
      } catch (e) {
        console.error('PDF load error:', e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [file, onPagesLoaded]);

  // Build click‐handlers once per page
  const makeClick = useCallback(
    (pageIndex: number) => (e: React.MouseEvent) => {
      const rect = (e.target as HTMLElement).getBoundingClientRect();
      const x = (e.clientX - rect.left) / zoom;
      const y = (e.clientY - rect.top) / zoom;
      onPageClick(x, y, pageIndex);
    },
    [zoom, onPageClick]
  );

  // Loading / empty states
  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <span className="text-gray-600">Rendering PDF…</span>
      </div>
    );
  }
  if (!file) {
    return (
      <div className="flex items-center justify-center h-full border-2 border-dashed border-gray-300 rounded-lg">
        <span className="text-gray-500">No PDF loaded</span>
      </div>
    );
  }

  return (
    <div className="w-full h-full overflow-auto p-4 bg-gray-100">
      {pages.map((page, idx) => (
        <div
          key={idx}
          className="relative mb-4"
          style={{
            width: page.viewport.width * zoom,
            height: page.viewport.height * zoom,
          }}
        >
          {/* draw the offscreen canvas */}
          <canvas
            width={page.viewport.width}
            height={page.viewport.height}
            style={{
              width: page.viewport.width * zoom,
              height: page.viewport.height * zoom,
            }}
            ref={(cnv) => {
              if (cnv) {
                const ctx = cnv.getContext('2d')!;
                ctx.clearRect(0, 0, cnv.width, cnv.height);
                ctx.drawImage(page.canvas, 0, 0);
              }
            }}
          />

          {/* transparent overlay for clicks & children */}
          <div
            className="absolute top-0 left-0"
            onClick={makeClick(idx)}
            style={{
              width: page.viewport.width * zoom,
              height: page.viewport.height * zoom,
            }}
          >
            {children}
          </div>
        </div>
      ))}
    </div>
  );
}
