import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { EditorElement, Cursor, User } from '@/types/pdf-editor';

export class CollaborationManager {
  private ydoc: Y.Doc;
  private provider: WebsocketProvider | null = null;
  private yElements: Y.Array<EditorElement>;
  private yCursors: Y.Map<Cursor>;
  private currentUser: User;
  private onElementsChange: (elements: EditorElement[]) => void;
  private onCursorsChange: (cursors: Map<string, Cursor>) => void;

  constructor(
    documentId: string,
    user: User,
    onElementsChange: (elements: EditorElement[]) => void,
    onCursorsChange: (cursors: Map<string, Cursor>) => void
  ) {
    this.ydoc = new Y.Doc();
    this.yElements = this.ydoc.getArray('elements');
    this.yCursors = this.ydoc.getMap('cursors');
    this.currentUser = user;
    this.onElementsChange = onElementsChange;
    this.onCursorsChange = onCursorsChange;

    // Set up collaboration provider
    if (typeof window !== 'undefined') {
      const wsUrl = process.env.NODE_ENV === 'development' 
        ? 'ws://localhost:1234' 
        : `wss://${window.location.host}/api/collaboration`;
      
      this.provider = new WebsocketProvider(wsUrl, documentId, this.ydoc);
      
      this.provider.on('status', (event: any) => {
        console.log('Collaboration status:', event.status);
      });
    }

    // Listen for changes
    this.yElements.observe(this.handleElementsChange.bind(this));
    this.yCursors.observe(this.handleCursorsChange.bind(this));
  }

  private handleElementsChange() {
    const elements = this.yElements.toArray();
    this.onElementsChange(elements);
  }

  private handleCursorsChange() {
    const cursors = new Map<string, Cursor>();
    this.yCursors.forEach((cursor, userId) => {
      if (userId !== this.currentUser.id) {
        cursors.set(userId, cursor);
      }
    });
    this.onCursorsChange(cursors);
  }

  addElement(element: EditorElement) {
    this.yElements.push([{ ...element, userId: this.currentUser.id, userName: this.currentUser.name }]);
  }

  updateElement(elementId: string, updates: Partial<EditorElement>) {
    const elements = this.yElements.toArray();
    const index = elements.findIndex(el => el.id === elementId);
    if (index !== -1) {
      const updatedElement = { ...elements[index], ...updates };
      this.yElements.delete(index, 1);
      this.yElements.insert(index, [updatedElement]);
    }
  }

  removeElement(elementId: string) {
    const elements = this.yElements.toArray();
    const index = elements.findIndex(el => el.id === elementId);
    if (index !== -1) {
      this.yElements.delete(index, 1);
    }
  }

  updateCursor(x: number, y: number) {
    this.yCursors.set(this.currentUser.id, {
      userId: this.currentUser.id,
      userName: this.currentUser.name,
      x,
      y,
      color: this.currentUser.color,
    });
  }

  destroy() {
    if (this.provider) {
      this.provider.destroy();
    }
    this.ydoc.destroy();
  }
}