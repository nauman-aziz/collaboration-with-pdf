// app/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const [file, setFile] = useState<File|null>(null);
  const router = useRouter();

  const openEditor = async () => {
    if (!file) {
      alert('Please select a PDF first');
      return;
    }
    const buf = await file.arrayBuffer();
    sessionStorage.setItem('pdfFile', JSON.stringify({
      name: file.name,
      type: file.type,
      data: Array.from(new Uint8Array(buf)),
    }));
    router.push('/editor');
  };

  return (
    <div className="p-8 space-y-4">
      <h1 className="text-2xl font-bold">PDF Overlay Editor</h1>
      <input
        type="file"
        accept="application/pdf"
        onChange={e => setFile(e.target.files?.[0]||null)}
      />
      <button
        onClick={openEditor}
        className="mt-2 px-4 py-2 bg-blue-600 text-white rounded"
      >
        Open in Editor
      </button>
    </div>
  );
}
