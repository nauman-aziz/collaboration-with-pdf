'use client';

import workerSrc from 'pdfjs-dist/build/pdf.worker.entry';
import { GlobalWorkerOptions } from 'pdfjs-dist/legacy/build/pdf';
if (typeof window !== 'undefined') {
  GlobalWorkerOptions.workerSrc = workerSrc;
}

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import EditablePDFPage from '@/components/EditablePDFPage';
import { PDFDocument } from 'pdf-lib';

export default function EditorPage() {
  const router = useRouter();

  const [bytes, setBytes]     = useState<Uint8Array | null>(null);
  const [numPages, setNumPages] = useState(0);
  const [pageIndex, setPageIndex] = useState(0);
  const [snapshots, setSnapshots] = useState<Record<number,string>>({});

  // load PDF from sessionStorage
  useEffect(() => {
    const raw = sessionStorage.getItem('pdfFile');
    if (!raw) return void router.push('/');
    try {
      const { data } = JSON.parse(raw) as { data: number[] };
      const u8 = new Uint8Array(data);
      setBytes(u8);
      PDFDocument.load(u8).then(pdf => setNumPages(pdf.getPageCount()));
    } catch {
      router.push('/');
    }
  }, [router]);

  // collect per-page PNGs
  const handleSnapshot = useCallback((pg: number, dataUrl: string) => {
    setSnapshots(prev =>
      prev[pg] === dataUrl ? prev : { ...prev, [pg]: dataUrl }
    );
  }, []);

  // build a new PDF with those PNGs and download it
  const handleDownload = useCallback(async () => {
    if (!bytes) return;
    const pdfDoc = await PDFDocument.load(bytes);
    const DPR    = window.devicePixelRatio || 1;

    for (let i = 0; i < numPages; i++) {
      const dataUrl = snapshots[i];
      if (!dataUrl) continue;
      const pngImg = await pdfDoc.embedPng(dataUrl);
      const { width, height } = pngImg.scale(1 / DPR);

      // replace page i with your edited snapshot
      pdfDoc.removePage(i);
      const newPage = pdfDoc.insertPage(i, [width, height]);
      newPage.drawImage(pngImg, { x: 0, y: 0, width, height });
    }

    const modified = await pdfDoc.save();
    const blob     = new Blob([modified], { type: 'application/pdf' });
    const url      = URL.createObjectURL(blob);
    const a        = document.createElement('a');
    a.href         = url;
    a.download     = 'edited.pdf';
    a.click();
    URL.revokeObjectURL(url);
  }, [bytes, numPages, snapshots]);

  if (!bytes) return <div className="p-8 text-center">Loading PDF…</div>;

  return (
    <div className="flex h-screen">
      <div className="flex-1 border-r overflow-auto p-4">
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
          onSnapshot={handleSnapshot}
        />
      </div>

      <div className="w-1/3 p-4 flex flex-col">
        <h2 className="text-xl font-semibold mb-4">Download</h2>
        <button
          onClick={handleDownload}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
        >
          Download Edited PDF
        </button>
        <p className="mt-4 text-gray-600 text-sm">
          Each page is replaced with an exact PNG snapshot of your edits,
          so the output is pixel-perfect with no clipped lines.
        </p>
      </div>
    </div>
  );
}
