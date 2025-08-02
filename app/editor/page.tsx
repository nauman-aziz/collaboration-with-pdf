// app/editor/page.tsx
'use client';

// ─── 1) Wire up the PDF.js worker ─────────────────────
import workerSrc from 'pdfjs-dist/build/pdf.worker.entry';
import { GlobalWorkerOptions } from 'pdfjs-dist/legacy/build/pdf';
if (typeof window !== 'undefined') {
  GlobalWorkerOptions.workerSrc = workerSrc;
}

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import EditablePDFPage, { TextItem } from '@/components/EditablePDFPage';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

export default function EditorPage() {
  const router = useRouter();

  // ─── State ───────────────────────────────────────────
  // raw bytes of original PDF
  const [originalBytes, setOriginalBytes] = useState<Uint8Array | null>(null);
  // how many pages in it
  const [numPages, setNumPages]         = useState(0);
  // which page we’re editing
  const [pageIndex, setPageIndex]       = useState(0);

  // store edits per page
  // editsByPage[page] = Array<{ item: TextItem; newStr: string }>
  const [editsByPage, setEditsByPage] = useState<
    Record<number, { item: TextItem; newStr: string }[]>
  >({});

  // ─── Load from sessionStorage ONCE ────────────────────
  useEffect(() => {
    const stored = sessionStorage.getItem('pdfFile');
    if (!stored) return void router.push('/');
    try {
      const { data } = JSON.parse(stored) as { data: number[] };
      const u8 = new Uint8Array(data);
      setOriginalBytes(u8);
      // determine page count
      PDFDocument.load(u8).then(pdf => setNumPages(pdf.getPageCount()));
    } catch {
      router.push('/');
    }
  }, [router]);

  // ─── Called by EditablePDFPage whenever you change text on a page ─
  const handlePageChange = useCallback(
    (pg: number, edits: { item: TextItem; newStr: string }[]) => {
      setEditsByPage(prev => ({ ...prev, [pg]: edits }));
    },
    []
  );

  // ─── When you click “Download Edited PDF” ───────────────
  const downloadEdited = useCallback(async () => {
    if (!originalBytes) return;
    const pdfDoc = await PDFDocument.load(originalBytes);
    const helv   = await pdfDoc.embedFont(StandardFonts.Helvetica);

    // apply every saved edit exactly once
    for (const [pgStr, arr] of Object.entries(editsByPage)) {
      const pgNum = Number(pgStr);
      const page  = pdfDoc.getPages()[pgNum];
      const { height } = page.getSize();

      arr.forEach(({ item, newStr }) => {
        // unpack the exact PDF.js transform
        const [a, b, c, d, tx, ty] = item.transform;
        // flip y for pdf-lib
        const pdfY = height - ty;

        // 1) white-out the original text run
        page.drawRectangle({
          x:      tx,
          y:      pdfY - item.height,
          width:  item.width,
          height: item.height,
          color:  rgb(1, 1, 1),
        });

        // 2) redraw using the *same* matrix for perfect alignment
        page.drawText(newStr, {
          font:   helv,
          color:  rgb(0, 0, 0),
          matrix: [a, b, c, d, tx, pdfY],
        });
      });
    }

    // save & download
    const modified = await pdfDoc.save();
    const blob     = new Blob([modified], { type: 'application/pdf' });
    const url      = URL.createObjectURL(blob);
    const a        = document.createElement('a');
    a.href         = url;
    a.download     = 'edited.pdf';
    a.click();
    URL.revokeObjectURL(url);
  }, [originalBytes, editsByPage]);

  // ─── render states ────────────────────────────────────
  if (!originalBytes) {
    return <div className="p-8 text-center">Loading PDF…</div>;
  }

  return (
    <div className="flex h-screen">
      {/* ◀️ LEFT pane: select page + in-place editor */}
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
          data={originalBytes}
          pageIndex={pageIndex}
          zoom={1}
          onChange={handlePageChange}
        />
      </div>

      {/* ▶️ RIGHT pane: download button */}
      <div className="w-1/3 p-4 flex flex-col">
        <h2 className="text-xl font-semibold mb-4">Download</h2>
        <button
          onClick={downloadEdited}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
        >
          Download Edited PDF
        </button>
        <p className="mt-4 text-gray-600 text-sm">
          All edits are kept in memory and applied exactly once—using the same
          transform matrix you saw on screen—so your downloaded PDF matches
          pixel-perfectly.
        </p>
      </div>
    </div>
  );
}
