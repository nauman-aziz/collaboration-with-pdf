// app/editor/page.tsx
'use client';

// ─── PDF.js worker setup ───────────────────────────────
import workerSrc from 'pdfjs-dist/build/pdf.worker.entry';
import { GlobalWorkerOptions } from 'pdfjs-dist/legacy/build/pdf';
if (typeof window !== 'undefined') {
  GlobalWorkerOptions.workerSrc = workerSrc;
}

import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
} from 'react';
import { useRouter } from 'next/navigation';
import html2canvas from 'html2canvas';
import EditablePDFPage, { TextItem } from '@/components/EditablePDFPage';
import { PDFDocument } from 'pdf-lib';

export default function EditorPage() {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);

  // raw bytes & page count
  const [bytes, setBytes]     = useState<Uint8Array|null>(null);
  const [numPages, setNumPages] = useState(0);
  const [pageIndex, setPageIndex] = useState(0);

  // edits store
  const [editsByPage, setEditsByPage] = useState<
    Record<number, { item: TextItem; newStr: string }[]>
  >({});

  // 1) Load the PDF bytes from sessionStorage once
  useEffect(() => {
    const stored = sessionStorage.getItem('pdfFile');
    if (!stored) {
      router.push('/');
      return;
    }
    try {
      const { data } = JSON.parse(stored) as { data: number[] };
      const u8 = new Uint8Array(data);
      setBytes(u8);
      // count pages
      import('pdf-lib').then(({ PDFDocument }) =>
        PDFDocument.load(u8).then(pdf => setNumPages(pdf.getPageCount()))
      );
    } catch {
      router.push('/');
    }
  }, [router]);

  // 2) Handler from the in-place editor
  const handlePageChange = useCallback(
    (pg: number, arr: { item: TextItem; newStr: string }[]) => {
      setEditsByPage(prev => ({ ...prev, [pg]: arr }));
    },
    []
  );

  // 3) On Download, snapshot the entire editor container
  const downloadEdited = useCallback(async () => {
    if (!bytes || !containerRef.current) return;

    // draw the container (PDF + overlays) to a canvas
    const snap = await html2canvas(containerRef.current, {
      scale: window.devicePixelRatio,
      backgroundColor: '#ffffff',
    });

    // embed that image into a fresh PDF
    const pdfDoc = await PDFDocument.create();
    const pngUrl = snap.toDataURL('image/png');
    const img    = await pdfDoc.embedPng(pngUrl);
    const { width, height } = img.scale(1);
    const page   = pdfDoc.addPage([width, height]);
    page.drawImage(img, { x: 0, y: 0, width, height });

    // trigger download
    const pdfBytes = await pdfDoc.save();
    const blob     = new Blob([pdfBytes], { type: 'application/pdf' });
    const url      = URL.createObjectURL(blob);
    const link     = document.createElement('a');
    link.href      = url;
    link.download  = 'edited-page.pdf';
    link.click();
    URL.revokeObjectURL(url);
  }, [bytes]);

  if (!bytes) {
    return <div className="p-8 text-center">Loading PDF…</div>;
  }

  return (
    <div className="flex h-screen">
      {/* ── LEFT: Editor preview ───────────────────────── */}
      <div className="flex-1 overflow-auto p-4" ref={containerRef}>
        <div className="mb-4 flex items-center gap-2">
          <label className="font-medium">Page:</label>
          <select
            value={pageIndex}
            onChange={e => setPageIndex(Number(e.target.value))}
            className="border px-2 py-1"
          >
            {Array.from({ length: numPages }).map((_, i) => (
              <option key={i} value={i}>{i + 1}</option>
            ))}
          </select>
        </div>

        <EditablePDFPage
          data={bytes}
          pageIndex={pageIndex}
          zoom={1}
          onChange={handlePageChange}
        />
      </div>

      {/* ── RIGHT: Download ──────────────────────────────── */}
      <div className="w-1/3 p-4 flex flex-col">
        <h2 className="text-xl font-semibold mb-4">Download</h2>
        <button
          onClick={downloadEdited}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
        >
          Download Edited Page
        </button>
        <p className="mt-4 text-gray-600 text-sm">
          This will capture exactly what you see—your edited page—
          and embed it as an image in the final PDF, fully replacing
          the original content.
        </p>
      </div>
    </div>
  );
}
