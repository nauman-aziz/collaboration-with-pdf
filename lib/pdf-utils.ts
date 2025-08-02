import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { EditorElement, TextElement, ImageElement } from '@/types/pdf-editor';

export async function generateModifiedPDF(
  originalPdfBytes: Uint8Array,
  elements: EditorElement[],
  pageCount: number
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(originalPdfBytes);
  const pages = pdfDoc.getPages();
  
  // Group elements by page
  const elementsByPage = new Map<number, EditorElement[]>();
  elements.forEach(element => {
    if (!elementsByPage.has(element.pageIndex)) {
      elementsByPage.set(element.pageIndex, []);
    }
    elementsByPage.get(element.pageIndex)!.push(element);
  });

  // Process each page
  for (let pageIndex = 0; pageIndex < pageCount; pageIndex++) {
    const page = pages[pageIndex];
    const pageElements = elementsByPage.get(pageIndex) || [];
    
    for (const element of pageElements) {
      if (element.type === 'text') {
        await addTextToPage(pdfDoc, page, element as TextElement);
      } else if (element.type === 'image') {
        await addImageToPage(pdfDoc, page, element as ImageElement);
      }
    }
  }

  return await pdfDoc.save();
}

async function addTextToPage(pdfDoc: PDFDocument, page: any, textElement: TextElement) {
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const { height: pageHeight } = page.getSize();
  
  // Convert from top-left to bottom-left coordinates
  const y = pageHeight - textElement.y - textElement.fontSize;
  
  // Parse color (assuming hex format)
  const color = hexToRgb(textElement.color);
  
  page.drawText(textElement.content, {
    x: textElement.x,
    y: y,
    size: textElement.fontSize,
    font: font,
    color: rgb(color.r / 255, color.g / 255, color.b / 255),
  });
}

async function addImageToPage(pdfDoc: PDFDocument, page: any, imageElement: ImageElement) {
  try {
    // Convert data URL to bytes
    const imageBytes = dataURLToBytes(imageElement.src);
    const { height: pageHeight } = page.getSize();
    
    // Determine image type and embed
    let image;
    if (imageElement.src.includes('data:image/png')) {
      image = await pdfDoc.embedPng(imageBytes);
    } else {
      image = await pdfDoc.embedJpg(imageBytes);
    }
    
    // Convert from top-left to bottom-left coordinates
    const y = pageHeight - imageElement.y - imageElement.height;
    
    page.drawImage(image, {
      x: imageElement.x,
      y: y,
      width: imageElement.width,
      height: imageElement.height,
    });
  } catch (error) {
    console.error('Error adding image to PDF:', error);
  }
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : { r: 0, g: 0, b: 0 };
}

function dataURLToBytes(dataURL: string): Uint8Array {
  const base64 = dataURL.split(',')[1];
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export function downloadPDF(pdfBytes: Uint8Array, filename: string = 'edited-document.pdf') {
  const blob = new Blob([pdfBytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}