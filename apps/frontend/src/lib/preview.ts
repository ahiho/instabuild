export interface ElementSelectionEvent {
  type: 'elementSelected';
  elementId: string;
  tagName: string;
  className?: string;
  textContent?: string;
  boundingRect?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export class PreviewCommunication {
  private listeners: ((event: ElementSelectionEvent) => void)[] = [];

  constructor() {
    this.setupMessageListener();
  }

  private setupMessageListener() {
    window.addEventListener('message', event => {
      if (event.data.type === 'elementSelected') {
        this.listeners.forEach(listener => listener(event.data));
      }
    });
  }

  onElementSelected(callback: (event: ElementSelectionEvent) => void) {
    this.listeners.push(callback);

    // Return cleanup function
    return () => {
      const index = this.listeners.indexOf(callback);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  highlightElement(elementId: string) {
    // Send message to iframe to highlight element
    const iframe = document.querySelector('iframe');
    if (iframe?.contentWindow) {
      iframe.contentWindow.postMessage(
        {
          type: 'highlightElement',
          elementId,
        },
        '*'
      );
    }
  }

  clearHighlight() {
    // Send message to iframe to clear highlights
    const iframe = document.querySelector('iframe');
    if (iframe?.contentWindow) {
      iframe.contentWindow.postMessage(
        {
          type: 'clearHighlight',
        },
        '*'
      );
    }
  }
}

export const previewCommunication = new PreviewCommunication();
