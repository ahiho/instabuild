export interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

export interface RequestAssetTool {
  type: 'image' | 'logo' | 'icon';
  description: string;
  suggestedFilename?: string;
}

export interface ModifyElementTool {
  elementId: string;
  changes: {
    style?: Record<string, string>;
    content?: string;
    attributes?: Record<string, string>;
  };
}
