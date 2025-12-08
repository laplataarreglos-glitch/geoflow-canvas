import { Button } from '@/components/ui/button';
import { Play, Trash2, Save, FolderOpen, Zap, HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface WorkflowToolbarProps {
  onRun: () => void;
  onClear: () => void;
  nodeCount: number;
}

export const WorkflowToolbar = ({ onRun, onClear, nodeCount }: WorkflowToolbarProps) => {
  return (
    <div
      className={cn(
        'flex items-center gap-2 px-4 py-2 rounded-lg',
        'bg-card/90 backdrop-blur-sm border border-border shadow-node'
      )}
    >
      {/* Logo/Title */}
      <div className="flex items-center gap-2 pr-4 border-r border-border">
        <div className="p-1.5 rounded-md bg-primary">
          <Zap className="w-4 h-4 text-primary-foreground" />
        </div>
        <span className="font-semibold text-foreground">GeoFlow</span>
      </div>

      {/* Stats */}
      <div className="px-3 text-sm text-muted-foreground">
        <span className="font-mono text-foreground">{nodeCount}</span> nodes
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <FolderOpen className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Open workflow</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Save className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Save workflow</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClear}>
              <Trash2 className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Clear canvas</TooltipContent>
        </Tooltip>
      </div>

      {/* Divider */}
      <div className="w-px h-6 bg-border" />

      {/* Run button */}
      <Button onClick={onRun} size="sm" className="gap-2">
        <Play className="w-4 h-4" />
        Run Workflow
      </Button>

      {/* Help */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <HelpCircle className="w-4 h-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p className="max-w-xs text-sm">
            Drag nodes from the left panel onto the canvas. Connect them by dragging from output to input handles.
          </p>
        </TooltipContent>
      </Tooltip>
    </div>
  );
};
