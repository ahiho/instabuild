import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ChatPanel } from '../components/ChatPanel';
import { PreviewPanel } from '../components/PreviewPanel';
import { ThreeColumnLayout } from '../components/layout/ThreeColumnLayout';
import { CollapsibleSidebar } from '../components/layout/CollapsibleSidebar';
import { ResizablePreview } from '../components/layout/ResizablePreview';
import { Card } from '../components/ui/card';

async function fetchPage(pageId: string) {
  const response = await fetch(
    `${import.meta.env.VITE_API_BASE_URL}/pages/${pageId}`
  );
  if (!response.ok) {
    throw new Error('Failed to fetch page');
  }
  return response.json();
}

export function EditorPage() {
  const { pageId } = useParams<{ pageId: string }>();

  const {
    data: page,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['page', pageId],
    queryFn: () => fetchPage(pageId!),
    enabled: !!pageId,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg">Loading page...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-red-600">Error loading page: {error.message}</div>
      </div>
    );
  }

  if (!page || !pageId) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-gray-600">Page not found</div>
      </div>
    );
  }

  return (
    <ThreeColumnLayout
      sidebar={
        <CollapsibleSidebar>
          <Card className="h-full">
            <div className="p-4">
              <h2 className="text-lg font-semibold mb-4">Version History</h2>
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">
                  Current: v{page.currentVersion}
                </div>
                {/* Version history content will be added later */}
              </div>
            </div>
          </Card>
        </CollapsibleSidebar>
      }
      chat={
        <div className="h-full">
          <ChatPanel pageId={pageId} />
        </div>
      }
      preview={
        <ResizablePreview>
          <PreviewPanel pageId={pageId} currentVersion={page.currentVersion} />
        </ResizablePreview>
      }
    />
  );
}
