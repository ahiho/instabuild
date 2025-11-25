/**
 * Deployment History Sheet - View deployment history timeline
 */

import { History } from 'lucide-react';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '../ui/sheet';
import { useDeployment } from '../../hooks/useDeployment';
import { DeploymentHistoryItem } from './DeploymentHistoryItem';

interface DeploymentHistorySheetProps {
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DeploymentHistorySheet({
  projectId,
  open,
  onOpenChange,
}: DeploymentHistorySheetProps) {
  const { history, historyLoading, refetchHistory } = useDeployment(projectId);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:w-[500px] p-0 flex flex-col border-l border-gray-800"
      >
        <SheetHeader className="px-6 py-4 border-b border-gray-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <History className="h-5 w-5 text-purple-400" />
              <SheetTitle>Deployment History</SheetTitle>
            </div>
          </div>
          <SheetDescription>
            View all deployment attempts and logs
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto">
          {historyLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="text-center">
                <div className="inline-block h-6 w-6 animate-spin rounded-full border-3 border-solid border-purple-600 border-r-transparent mb-2"></div>
                <p className="text-sm text-gray-400">Loading history...</p>
              </div>
            </div>
          ) : history.length === 0 ? (
            <div className="px-6 py-12">
              <Card className="border-gray-800">
                <div className="p-6 text-center">
                  <div className="text-3xl mb-3">📋</div>
                  <h3 className="text-sm font-medium text-white mb-2">
                    No deployments yet
                  </h3>
                  <p className="text-xs text-gray-400 mb-4">
                    Your deployment history will appear here
                  </p>
                  <Button
                    onClick={() => refetchHistory()}
                    variant="outline"
                    size="sm"
                  >
                    Refresh
                  </Button>
                </div>
              </Card>
            </div>
          ) : (
            <div className="px-6 py-4 space-y-4">
              {history.map(deployment => (
                <DeploymentHistoryItem
                  key={deployment.id}
                  deployment={deployment}
                />
              ))}
            </div>
          )}
        </div>

        <div className="border-t border-gray-800 px-6 py-4">
          <Button
            onClick={() => refetchHistory()}
            variant="outline"
            size="sm"
            className="w-full"
          >
            Refresh History
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
