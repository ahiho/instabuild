import { useState, useEffect } from 'react';
import { LandingPageVersion } from '@instabuild/shared';

interface PreviewPanelProps {
  pageId: string;
  currentVersion?: LandingPageVersion;
}

export function PreviewPanel({ currentVersion }: PreviewPanelProps) {
  const [previewContent, setPreviewContent] = useState<string>('');

  useEffect(() => {
    if (currentVersion?.sourceCode) {
      // Convert React component to HTML for preview
      const htmlContent = convertReactToHtml(currentVersion.sourceCode);
      setPreviewContent(htmlContent);
    }
  }, [currentVersion]);

  const convertReactToHtml = (reactCode: string): string => {
    // Simple conversion for MVP - in production, use proper React rendering
    const html = reactCode
      .replace(/import.*from.*['"].*['"];?\n?/g, '') // Remove imports
      .replace(/export default function \w+\(\) \{/, '') // Remove function declaration
      .replace(/return \(/, '') // Remove return statement
      .replace(/\);?\s*\}?\s*$/, '') // Remove closing
      .replace(/className=/g, 'class=') // Convert className to class
      .replace(/\{`([^`]*)`\}/g, '$1') // Convert template literals
      .replace(/\{([^}]*)\}/g, '$1'); // Convert simple expressions

    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Preview</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <style>
          body { margin: 0; padding: 0; }
        </style>
      </head>
      <body>
        ${html}
        <script>
          // Enable element selection communication
          document.addEventListener('click', function(e) {
            e.preventDefault();
            const element = e.target;
            if (element.id) {
              window.parent.postMessage({
                type: 'elementSelected',
                elementId: element.id,
                tagName: element.tagName,
                className: element.className,
                textContent: element.textContent
              }, '*');
            }
          });
        </script>
      </body>
      </html>
    `;
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4">
        <h2 className="text-lg font-semibold text-gray-900">Live Preview</h2>
        <p className="text-sm text-gray-600">
          Click on elements to select them for editing
        </p>
      </div>

      {/* Preview */}
      <div className="flex-1 bg-white">
        {previewContent ? (
          <iframe
            srcDoc={previewContent}
            className="w-full h-full border-0"
            title="Landing Page Preview"
          />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500">
            <div className="text-center">
              <div className="text-4xl mb-4">📄</div>
              <p>No preview available</p>
              <p className="text-sm">Create a page to see the preview</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
