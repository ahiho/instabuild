import { History } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { VersionHistorySheetProps } from '@/types/editor';

/**
 * VersionHistorySheet component - Slide-out panel for browsing version history
 *
 * Features:
 * - Slides in from the right side
 * - Displays current version number
 * - Dark theme styling
 * - Accessible via keyboard (ESC to close)
 */
export function VersionHistorySheet({
  pageId: _pageId, // eslint-disable-line @typescript-eslint/no-unused-vars -- Will be used when react-query is implemented
  currentVersionNumber,
  children,
}: VersionHistorySheetProps) {
  // TODO: Fetch version history using react-query
  // const { data: versions } = useQuery({
  //   queryKey: ['versions', _pageId],
  //   queryFn: () => fetchVersions(_pageId),
  // });

  return (
    <Sheet>
      <SheetTrigger asChild>
        {children || (
          <Button
            variant="ghost"
            size="icon"
            className="text-gray-400 hover:text-purple-300"
            aria-label="Open version history"
          >
            <History className="h-4 w-4" />
          </Button>
        )}
      </SheetTrigger>
      <SheetContent
        side="right"
        className="w-[400px] bg-black/95 border-gray-800 text-white"
      >
        <SheetHeader>
          <SheetTitle className="text-white">Version History</SheetTitle>
        </SheetHeader>
        <div className="mt-4 space-y-2">
          <div className="text-sm text-gray-400">
            Current: v{currentVersionNumber}
          </div>
          {/* TODO: Render version list */}
          <p className="text-gray-500 text-sm mt-4">
            Version history will be displayed here once the backend API is available.
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}
