'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { PDFPage } from '@/types/pdf-editor';

// Set up PDF.js worker
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
}

interface PDFViewerProps {
  file: File | null;
  zoom: number;
  currentPage: number;
  onPagesLoaded: (pages: PDFPage[]) => void;
  onPageClick: (x: number, y: number, pageIndex: number) => void;
  children?: React.ReactNode;
}

export default function PDFViewer({
  file,
  zoom,
  currentPage,
  onPagesLoaded,
  onPageClick,
  children
}: PDFViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pages, setPages] = useState<PDFPage[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!file) return;

    const loadPDF = async () => {
      setLoading(true);
      try {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        const loadedPages: PDFPage[] = [];

        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const viewport = page.getViewport({ scale: 1.0 });
          
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d')!;
          canvas.width = viewport.width;
          canvas.height = viewport.height;

          await page.render({
            canvasContext: context,
            viewport: viewport,
          }).promise;

          loadedPages.push({
            canvas,
            viewport,
            pageNumber: i,
          });
        }

        setPages(loadedPages);
        onPagesLoaded(loadedPages);
      } catch (error) {
        console.error('Error loading PDF:', error);
      } finally {
        setLoading(false);
      }
    };

    loadPDF();
  }, [file]);

  useEffect(() => {
    if (!containerRef.current) return;

    // Clear container
    containerRef.current.innerHTML = '';

    // Render pages
    pages.forEach((page, index) => {
      const pageContainer = document.createElement('div');
      pageContainer.className = 'relative mb-4 border border-gray-300 shadow-lg';
      pageContainer.style.width = `${page.viewport.width * zoom}px`;
      pageContainer.style.height = `${page.viewport.height * zoom}px`;

      const canvas = page.canvas.cloneNode(true) as HTMLCanvasElement;
      canvas.style.width = '100%';
      canvas.style.height = '100%';
      canvas.style.display = 'block';

      // Add click handler
      canvas.addEventListener('click', (e) => {
        const rect = canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) / zoom;
        const y = (e.clientY - rect.top) / zoom;
        onPageClick(x, y, index);
      });

      pageContainer.appendChild(canvas);
      containerRef.current!.appendChild(pageContainer);
    });
  }, [pages, zoom, onPageClick]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-gray-600">Loading PDF...</div>
      </div>
    );
  }

  if (!file) {
    return (
      <div className="flex items-center justify-center h-64 border-2 border-dashed border-gray-300 rounded-lg">
        <div className="text-lg text-gray-500">No PDF loaded</div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full overflow-auto bg-gray-100">
      <div ref={containerRef} className="flex flex-col items-center py-4" />
      {children}
    </div>
  );
}