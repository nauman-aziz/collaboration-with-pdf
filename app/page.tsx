
// app/page.tsx
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';

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
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-4 px-6">
          <h1 className="text-2xl font-bold text-gray-800">
            PDF Overlay Editor
          </h1>
        </div>
      </header>
      <main className="flex-grow flex items-center justify-center">
        <Card className="w-full max-w-md mx-auto p-6">
          <CardHeader>
            <CardTitle>Select a PDF to Edit</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col space-y-2 cursor-pointer ">
              <Label htmlFor="file">Upload PDF</Label>
              <Input
                id="file"
                type="file"
                accept="application/pdf"
                className="w-full cursor-pointer"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
            </div>
            <Separator className="my-4" />
            <Button
              className={`w-full ${file ? "hover:bg-green-500 cursor-pointer" : "bg-gray-300 cursor-no-drop"} `}
              onClick={openEditor}
              disabled={!file}
            >
              Open in Editor
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}