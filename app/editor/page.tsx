'use client';

import workerSrc from 'pdfjs-dist/build/pdf.worker.entry';
import { GlobalWorkerOptions } from 'pdfjs-dist/legacy/build/pdf';
if (typeof window !== 'undefined') {
  GlobalWorkerOptions.workerSrc = workerSrc;
}

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { PDFDocument } from 'pdf-lib';
import EditablePDFPage from '@/components/EditablePDFPage';

// shadcn/ui components
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';

export default function EditorPage() {
  const router = useRouter();
  const [bytes, setBytes] = useState<Uint8Array | null>(null);
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

  if (!bytes) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <p className="text-lg font-medium text-gray-700">Loading your PDF…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-4 px-6">
          <h1 className="text-2xl font-bold text-gray-800">PDF Editor</h1>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6 grid grid-cols-3 gap-6">
        {/* PDF Viewer & Controls */}
        <Card className="col-span-2 flex flex-col h-[80vh]">
          <CardHeader>
            <CardTitle>Page {pageIndex + 1} of {numPages}</CardTitle>
            <div className="mt-2">
              <Select value={String(pageIndex)} onValueChange={value => setPageIndex(Number(value))}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Select page..." />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: numPages }).map((_, i) => (
                    <SelectItem key={i} value={String(i)}>{i + 1}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <Separator />
          <CardContent className="overflow-auto flex-1">
            <EditablePDFPage
              data={bytes}
              pageIndex={pageIndex}
              zoom={1}
              onSnapshot={handleSnapshot}
            />
          </CardContent>
        </Card>

        {/* Download Panel */}
        <Card className="h-[80vh] flex flex-col justify-between">
          <div>
            <CardHeader>
              <CardTitle>Download Edited PDF</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">
                Each page you edit is converted to a high-fidelity PNG, ensuring pixel-perfect output with no clipping.
              </p>
            </CardContent>
          </div>
          <div className="p-6">
            <Button className="w-full py-3 hover:bg-green-500" onClick={handleDownload}>
              Download Now
            </Button>
          </div>
        </Card>
      </main>
    </div>
  );
}
