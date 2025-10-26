import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ChatPanel } from '../components/ChatPanel';
import { PreviewPanel } from '../components/PreviewPanel';
import { EditorLayout } from '../components/layout/EditorLayout';
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
  const [isChatVisible, setIsChatVisible] = useState(true);

  const {
    data: page,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['page', pageId],
    queryFn: () => fetchPage(pageId!),
    enabled: !!pageId,
  });

  const handleToggleChat = () => {
    setIsChatVisible(prev => !prev);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-black">
        <div className="text-lg text-white">Loading page...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-black">
        <div className="text-red-400">Error loading page: {error.message}</div>
      </div>
    );
  }

  if (!page || !pageId) {
    return (
      <div className="flex items-center justify-center h-screen bg-black">
        <div className="text-gray-400">Page not found</div>
      </div>
    );
  }

  return (
    <EditorLayout
      isChatVisible={isChatVisible}
      chatPanel={
        <Card className="h-full bg-black/40 backdrop-blur-sm border-gray-800">
          <div className="flex items-center justify-between border-b border-gray-800 px-4 h-12">
            <h2 className="text-sm font-medium text-white">Chat</h2>
          </div>
          <div className="h-[calc(100%-3rem)]">
            <ChatPanel pageId={pageId} />
          </div>
        </Card>
      }
      previewPanel={
        <Card className="h-full bg-black/40 backdrop-blur-sm border-gray-800">
          <div className="h-full">
            <PreviewPanel
              pageId={pageId}
              currentVersion={page.currentVersion}
              onToggleChat={handleToggleChat}
              isChatVisible={isChatVisible}
            />
          </div>
        </Card>
      }
    />
  );
}
