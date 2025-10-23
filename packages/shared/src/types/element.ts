export interface ElementSelection {
  elementId: string;
  tagName: string;
  className?: string;
  textContent?: string;
  attributes?: Record<string, string>;
  boundingRect?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}
