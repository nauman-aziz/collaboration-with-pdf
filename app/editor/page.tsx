// app/editor/page.tsx
'use client';

// 1) Bundle & point PDF.js at its worker
import workerSrc from 'pdfjs-dist/build/pdf.worker.entry';
import { GlobalWorkerOptions } from 'pdfjs-dist/legacy/build/pdf';
if (typeof window !== 'undefined') {
  GlobalWorkerOptions.workerSrc = workerSrc;
}

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import EditablePDFPage, { TextItem } from '@/components/EditablePDFPage';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

export default function EditorPage() {
  const router = useRouter();

  // Raw bytes loaded from sessionStorage
  const [bytes, setBytes] = useState<Uint8Array|null>(null);
  // Number of pages in the PDF
  const [numPages, setNumPages] = useState(0);
  // Which page we're editing right now
  const [pageIndex, setPageIndex] = useState(0);
  // Accumulated edits: for each pageIndex, an array of { item, newStr }
  const [editsByPage, setEditsByPage] = useState<
    Record<number, { item: TextItem; newStr: string }[]>
  >({});

  // 1️⃣ Load PDF bytes and page count on mount
  useEffect(() => {
    const s = sessionStorage.getItem('pdfFile');
    if (!s) {
      router.push('/');
      return;
    }
    try {
      const { data } = JSON.parse(s) as { data: number[] };
      const u8 = new Uint8Array(data);
      setBytes(u8);

      // Use pdf-lib to quickly get pageCount
      PDFDocument.load(u8).then(pdf => {
        setNumPages(pdf.getPageCount());
      });
    } catch {
      router.push('/');
    }
  }, [router]);

  // 2️⃣ Called by the child when you “Save Page X”
  const handleSavePage = (pg: number, pageEdits: { item: TextItem; newStr: string }[]) => {
    setEditsByPage(prev => ({ ...prev, [pg]: pageEdits }));
  };

  // 3️⃣ When the user is done, flatten all edits & download
  const downloadAll = async () => {
    if (!bytes) return;
    const pdfDoc = await PDFDocument.load(bytes);
    const helv   = await pdfDoc.embedFont(StandardFonts.Helvetica);

    Object.entries(editsByPage).forEach(([pgStr, pageEdits]) => {
      const pgNum = Number(pgStr);
      const page  = pdfDoc.getPages()[pgNum];
      const { height } = page.getSize();

      pageEdits.forEach(({ item, newStr }) => {
        const [, , , , tx, ty] = item.transform;
        // white-out
        page.drawRectangle({
          x: tx,
          y: height - ty - item.height,
          width: item.width,
          height: item.height,
          color: rgb(1,1,1),
        });
        // draw replacement
        page.drawText(newStr, {
          x: tx + 1,
          y: height - ty - item.height + 1,
          size: item.height * 0.8,
          font: helv,
          color: rgb(0,0,0),
        });
      });
    });

    const modified = await pdfDoc.save();
    const blob = new Blob([modified], { type: 'application/pdf' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = 'edited.pdf';
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!bytes) {
    return <div className="p-8 text-center">Loading PDF…</div>;
  }

  return (
    <div className="flex h-screen">
      {/* ◀️ LEFT: page selector + editable page overlay */}
      <div className="flex-1 border-r overflow-auto p-4">
        <div className="mb-4 flex items-center gap-2">
          <label className="font-medium">Page:</label>
          <select
            value={pageIndex}
            onChange={e => setPageIndex(Number(e.target.value))}
            className="border px-2 py-1"
          >
            {Array.from({ length: numPages }).map((_, i) => (
              <option key={i} value={i}>
                {i + 1}
              </option>
            ))}
          </select>
        </div>

        <EditablePDFPage
          data={bytes}
          pageIndex={pageIndex}
          zoom={1}
          onSaveText={edits => handleSavePage(pageIndex, edits)}
        />
      </div>

      {/* ▶️ RIGHT: Download button */}
      <div className="w-1/3 p-4 flex flex-col">
        <h2 className="text-xl font-semibold mb-4">Your Edits</h2>
        <button
          onClick={downloadAll}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
        >
          Download Edited PDF
        </button>
        <p className="mt-4 text-gray-600 text-sm">
          After you click “Save” on a page, those edits are stored. When you’re ready,
          click “Download Edited PDF” to bake all your changes into the final file.
        </p>
      </div>
    </div>
  );
}
