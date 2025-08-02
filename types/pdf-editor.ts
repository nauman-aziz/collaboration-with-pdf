export interface TextElement {
  id: string;
  type: 'text';
  content: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  fontFamily: string;
  color: string;
  bold: boolean;
  italic: boolean;
  pageIndex: number;
  userId?: string;
  userName?: string;
}

export interface ImageElement {
  id: string;
  type: 'image';
  src: string;
  x: number;
  y: number;
  width: number;
  height: number;
  pageIndex: number;
  userId?: string;
  userName?: string;
}

export type EditorElement = TextElement | ImageElement;

export interface PDFPage {
  canvas: HTMLCanvasElement;
  viewport: any;
  pageNumber: number;
}

export interface User {
  id: string;
  name: string;
  email: string;
  color: string;
}

export interface Cursor {
  userId: string;
  userName: string;
  x: number;
  y: number;
  color: string;
}

export interface EditorState {
  elements: EditorElement[];
  selectedElementId: string | null;
  currentTool: 'select' | 'text' | 'image';
  zoom: number;
  currentPage: number;
}