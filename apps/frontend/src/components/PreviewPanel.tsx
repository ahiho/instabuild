import { useState, useEffect } from 'react';
import { LandingPageVersion } from '@instabuild/shared';
import {
  ArrowLeft,
  ArrowRight,
  RefreshCw,
  PanelLeftClose,
  PanelLeft,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { VersionSelector } from './editor/VersionSelector';

interface PreviewPanelProps {
  pageId: string;
  currentVersion?: LandingPageVersion;
  onToggleChat?: () => void;
  isChatVisible?: boolean;
}

export function PreviewPanel({
  pageId,
  currentVersion,
  onToggleChat,
  isChatVisible = true,
}: PreviewPanelProps) {
  const [previewContent, setPreviewContent] = useState<string>('');
  const [previewUrl, setPreviewUrl] = useState<string>(
    'preview://landing-page'
  );
  const [iframeKey, setIframeKey] = useState<number>(0);
  const [navigationHistory] = useState<string[]>(['preview://landing-page']);
  const [historyIndex, setHistoryIndex] = useState<number>(0);

  useEffect(() => {
    if (currentVersion?.sourceCode) {
      // Convert React component to HTML for preview
      const htmlContent = convertReactToHtml(currentVersion.sourceCode);
      setPreviewContent(htmlContent);
    }
  }, [currentVersion]);

  const handleReload = () => {
    setIframeKey(prev => prev + 1);
  };

  const handleBack = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setPreviewUrl(navigationHistory[newIndex]);
    }
  };

  const handleForward = () => {
    if (historyIndex < navigationHistory.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setPreviewUrl(navigationHistory[newIndex]);
    }
  };

  const handleVersionChange = (versionNumber: number) => {
    // TODO: Load the selected version
    console.log('Version changed to:', versionNumber);
  };

  const canGoBack = historyIndex > 0;
  const canGoForward = historyIndex < navigationHistory.length - 1;

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
      {/* Browser Controls */}
      <div className="border-b border-gray-800 px-2 h-12 flex items-center">
        <div className="flex items-center gap-2 w-full">
          {/* Toggle Chat Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleChat}
            className="h-8 w-8 text-gray-400 hover:text-white hover:bg-gray-800"
            aria-label={isChatVisible ? 'Hide chat panel' : 'Show chat panel'}
          >
            {isChatVisible ? (
              <PanelLeftClose className="h-4 w-4" />
            ) : (
              <PanelLeft className="h-4 w-4" />
            )}
          </Button>

          {/* Navigation Buttons */}
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleBack}
              disabled={!canGoBack}
              className="h-8 w-8 text-gray-400 hover:text-white hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed"
              aria-label="Go back"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleForward}
              disabled={!canGoForward}
              className="h-8 w-8 text-gray-400 hover:text-white hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed"
              aria-label="Go forward"
            >
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleReload}
              className="h-8 w-8 text-gray-400 hover:text-white hover:bg-gray-800"
              aria-label="Reload"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>

          {/* URL Bar */}
          <div className="flex-1">
            <input
              type="text"
              value={previewUrl}
              onChange={e => setPreviewUrl(e.target.value)}
              className="w-full bg-gray-800/50 border border-gray-700 text-gray-300 text-sm rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-gray-600"
              readOnly
            />
          </div>

          {/* Version Selector */}
          <VersionSelector
            pageId={pageId}
            currentVersionNumber={currentVersion?.versionNumber || 1}
            onVersionChange={handleVersionChange}
          />
        </div>
      </div>

      {/* Preview */}
      <div className="flex-1 bg-gray-900">
        {previewContent ? (
          <iframe
            key={iframeKey}
            srcDoc={previewContent}
            className="w-full h-full border-0"
            title="Landing Page Preview"
          />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500">
            <div className="text-center">
              <div className="text-4xl mb-4">📄</div>
              <p className="text-gray-400">No preview available</p>
              <p className="text-sm text-gray-500">
                Create a page to see the preview
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
