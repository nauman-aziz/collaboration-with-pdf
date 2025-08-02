'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { v4 as uuidv4 } from 'uuid';

import PDFViewer from '@/components/PDFViewer';
import Toolbar from '@/components/Toolbar';
import TextEditor from '@/components/TextEditor';
import ImageHandler from '@/components/ImageHandler';
import ElementOverlay from '@/components/ElementOverlay';
import CollaborativeCursors from '@/components/CollaborativeCursors';

import { CollaborationManager } from '@/lib/collaboration';
import { generateModifiedPDF, downloadPDF } from '@/lib/pdf-utils';

import {
  EditorElement,
  TextElement,
  ImageElement,
  PDFPage,
  EditorState,
  User,
  Cursor,
} from '@/types/pdf-editor';

export default function EditorPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // Core state
  const [file, setFile] = useState<File | null>(null);
  const [pages, setPages] = useState<PDFPage[]>([]);
  const [originalPdfBytes, setOriginalPdfBytes] = useState<Uint8Array | null>(null);

  // Editor state
  const [elements, setElements] = useState<EditorElement[]>([]);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [currentTool, setCurrentTool] = useState<'select' | 'text' | 'image'>('select');
  const [zoom, setZoom] = useState(1.0);
  const [editingElement, setEditingElement] = useState<EditorElement | null>(null);

  // Collaboration state
  const [collaboration, setCollaboration] = useState<CollaborationManager | null>(null);
  const [cursors, setCursors] = useState<Map<string, Cursor>>(new Map());
  const [connectedUsers, setConnectedUsers] = useState(1);

  // Initialize collaboration when user and file are ready
  useEffect(() => {
    if (session?.user && file && !collaboration) {
      const user: User = {
        id: session.user.id,
        name: session.user.name || 'Anonymous',
        email: session.user.email || '',
        color: (session.user as any).color || '#3B82F6',
      };

      const documentId = `pdf-${file.name}-${file.size}`;
      
      const manager = new CollaborationManager(
        documentId,
        user,
        setElements,
        setCursors
      );

      setCollaboration(manager);
    }

    return () => {
      if (collaboration) {
        collaboration.destroy();
      }
    };
  }, [session, file]);

  // Authentication check
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth');
    }
  }, [status, router]);

  // Handle file upload
  const handleFileSelect = useCallback(async (selectedFile: File) => {
    setFile(selectedFile);
    const arrayBuffer = await selectedFile.arrayBuffer();
    setOriginalPdfBytes(new Uint8Array(arrayBuffer));
  }, []);

  // Handle PDF pages loaded
  const handlePagesLoaded = useCallback((loadedPages: PDFPage[]) => {
    setPages(loadedPages);
  }, []);

  // Handle page click for adding elements
  const handlePageClick = useCallback((x: number, y: number, pageIndex: number) => {
    if (currentTool === 'text') {
      const textElement: TextElement = {
        id: uuidv4(),
        type: 'text',
        content: 'New text',
        x,
        y,
        width: 200,
        height: 30,
        fontSize: 14,
        fontFamily: 'Helvetica',
        color: '#000000',
        bold: false,
        italic: false,
        pageIndex,
      };

      if (collaboration) {
        collaboration.addElement(textElement);
      } else {
        setElements(prev => [...prev, textElement]);
      }

      setEditingElement(textElement);
      setSelectedElementId(textElement.id);
      setCurrentTool('select');
    }
  }, [currentTool, collaboration]);

  // Handle element selection
  const handleElementSelect = useCallback((id: string) => {
    setSelectedElementId(id);
  }, []);

  // Handle element double-click for editing
  const handleElementDoubleClick = useCallback((element: EditorElement) => {
    setEditingElement(element);
  }, []);

  // Handle text element updates
  const handleTextUpdate = useCallback((updates: Partial<TextElement>) => {
    if (editingElement && editingElement.type === 'text') {
      const updatedElement = { ...editingElement, ...updates };
      
      if (collaboration) {
        collaboration.updateElement(editingElement.id, updates);
      } else {
        setElements(prev => 
          prev.map(el => el.id === editingElement.id ? updatedElement : el)
        );
      }
    }
  }, [editingElement, collaboration]);

  // Handle image addition
  const handleImageAdd = useCallback((imageData: string, x: number, y: number, pageIndex: number) => {
    const img = new Image();
    img.onload = () => {
      const imageElement: ImageElement = {
        id: uuidv4(),
        type: 'image',
        src: imageData,
        x,
        y,
        width: Math.min(img.width, 200),
        height: Math.min(img.height, 200),
        pageIndex,
      };

      if (collaboration) {
        collaboration.addElement(imageElement);
      } else {
        setElements(prev => [...prev, imageElement]);
      }

      setSelectedElementId(imageElement.id);
    };
    img.src = imageData;
  }, [collaboration]);

  // Handle image updates
  const handleImageUpdate = useCallback((id: string, updates: Partial<ImageElement>) => {
    if (collaboration) {
      collaboration.updateElement(id, updates);
    } else {
      setElements(prev => 
        prev.map(el => el.id === id ? { ...el, ...updates } : el)
      );
    }
  }, [collaboration]);

  // Handle PDF download
  const handleDownload = useCallback(async () => {
    if (!originalPdfBytes || pages.length === 0) return;

    try {
      const modifiedPdfBytes = await generateModifiedPDF(
        originalPdfBytes,
        elements,
        pages.length
      );
      downloadPDF(modifiedPdfBytes, `edited-${file?.name || 'document.pdf'}`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Error generating PDF. Please try again.');
    }
  }, [originalPdfBytes, elements, pages.length, file?.name]);

  // Handle mouse move for collaboration cursors
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (collaboration) {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = (e.clientX - rect.left) / zoom;
      const y = (e.clientY - rect.top) / zoom;
      collaboration.updateCursor(x, y);
    }
  }, [collaboration, zoom]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }
  

  if (!session) {
    return null;
  }

  const selectedElement = elements.find(el => el.id === selectedElementId) || null;
  const selectedImage = selectedElement?.type === 'image' ? selectedElement as ImageElement : null;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Toolbar
        currentTool={currentTool}
        onToolChange={setCurrentTool}
        zoom={zoom}
        onZoomChange={setZoom}
        onDownload={handleDownload}
        connectedUsers={connectedUsers}
      />

      <div className="flex-1 relative" onMouseMove={handleMouseMove}>
        <PDFViewer
          file={file}
          zoom={zoom}
          currentPage={0}
          onPagesLoaded={handlePagesLoaded}
          onPageClick={handlePageClick}
        >
          {/* Element Overlay */}
          <ElementOverlay
            elements={elements}
            selectedElementId={selectedElementId}
            onElementSelect={handleElementSelect}
            onElementDoubleClick={handleElementDoubleClick}
            zoom={zoom}
            pageHeight={pages[0]?.viewport.height || 0}
          />

          {/* Collaborative Cursors */}
          <CollaborativeCursors cursors={cursors} zoom={zoom} />

          {/* Text Editor */}
          {editingElement?.type === 'text' && (
            <TextEditor
              element={editingElement as TextElement}
              onUpdate={handleTextUpdate}
              onComplete={() => setEditingElement(null)}
              zoom={zoom}
            />
          )}
        </PDFViewer>

        {/* Image Handler */}
        {currentTool === 'image' && (
          <ImageHandler
            onImageAdd={handleImageAdd}
            onImageUpdate={handleImageUpdate}
            selectedImage={selectedImage}
            zoom={zoom}
          />
        )}
      </div>
    </div>
  );
}