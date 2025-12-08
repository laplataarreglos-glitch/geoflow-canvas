import { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { GeoNodeData, NodeCategory } from '@/types/nodes';
import { cn } from '@/lib/utils';
import * as Icons from 'lucide-react';
import { LucideIcon } from 'lucide-react';

const categoryStyles: Record<NodeCategory, { border: string; bg: string; accent: string }> = {
  input: {
    border: 'border-geo-input/50',
    bg: 'bg-geo-input/10',
    accent: 'bg-geo-input',
  },
  transform: {
    border: 'border-geo-transform/50',
    bg: 'bg-geo-transform/10',
    accent: 'bg-geo-transform',
  },
  geoprocess: {
    border: 'border-geo-geoprocess/50',
    bg: 'bg-geo-geoprocess/10',
    accent: 'bg-geo-geoprocess',
  },
  output: {
    border: 'border-geo-output/50',
    bg: 'bg-geo-output/10',
    accent: 'bg-geo-output',
  },
  data: {
    border: 'border-geo-data/50',
    bg: 'bg-geo-data/10',
    accent: 'bg-geo-data',
  },
  calculation: {
    border: 'border-geo-calculation/50',
    bg: 'bg-geo-calculation/10',
    accent: 'bg-geo-calculation',
  },
};

const GeoNode = ({ data, selected }: NodeProps) => {
  const nodeData = data as GeoNodeData;
  const styles = categoryStyles[nodeData.category];
  const IconComponent = (Icons[nodeData.icon as keyof typeof Icons] as LucideIcon) || Icons.Box;

  return (
    <div
      className={cn(
        'min-w-[180px] rounded-lg border-2 shadow-node transition-all duration-200',
        'bg-card hover:shadow-node-hover',
        styles.border,
        selected && 'ring-2 ring-primary ring-offset-2 ring-offset-background'
      )}
    >
      {/* Input handles */}
      {nodeData.inputs && nodeData.inputs.length > 0 && (
        <>
          {nodeData.inputs.map((input, index) => (
            <Handle
              key={`input-${input}`}
              type="target"
              position={Position.Left}
              id={input}
              className={cn(
                'w-3 h-3 border-2 border-background',
                styles.accent
              )}
              style={{
                top: `${((index + 1) / (nodeData.inputs!.length + 1)) * 100}%`,
              }}
            />
          ))}
        </>
      )}

      {/* Header */}
      <div className={cn('flex items-center gap-2 p-3 rounded-t-md', styles.bg)}>
        <div className={cn('p-1.5 rounded-md', styles.accent)}>
          <IconComponent className="w-4 h-4 text-background" />
        </div>
        <span className="font-medium text-sm text-foreground">{nodeData.label}</span>
      </div>

      {/* Body */}
      <div className="p-3 space-y-2">
        <p className="text-xs text-muted-foreground line-clamp-2">{nodeData.description}</p>

        {/* Preview indicator */}
        {nodeData.preview && nodeData.preview.featureCount !== undefined && (
          <div className="flex items-center gap-2 text-xs">
            <div className={cn('w-2 h-2 rounded-full animate-pulse', styles.accent)} />
            <span className="text-muted-foreground font-mono">
              {nodeData.preview.featureCount} features
            </span>
            {nodeData.preview.geometryType && (
              <span className="text-muted-foreground/70">
                ({nodeData.preview.geometryType})
              </span>
            )}
          </div>
        )}

        {/* Status */}
        {nodeData.status && nodeData.status !== 'idle' && (
          <div className="flex items-center gap-2 text-xs">
            {nodeData.status === 'running' && (
              <>
                <Icons.Loader2 className="w-3 h-3 animate-spin text-primary" />
                <span className="text-primary">Processing...</span>
              </>
            )}
            {nodeData.status === 'success' && (
              <>
                <Icons.CheckCircle className="w-3 h-3 text-geo-input" />
                <span className="text-geo-input">Complete</span>
              </>
            )}
            {nodeData.status === 'error' && (
              <>
                <Icons.AlertCircle className="w-3 h-3 text-destructive" />
                <span className="text-destructive truncate">{nodeData.error || 'Error'}</span>
              </>
            )}
          </div>
        )}
      </div>

      {/* Output handles */}
      {nodeData.outputs && nodeData.outputs.length > 0 && (
        <>
          {nodeData.outputs.map((output, index) => (
            <Handle
              key={`output-${output}`}
              type="source"
              position={Position.Right}
              id={output}
              className={cn(
                'w-3 h-3 border-2 border-background',
                styles.accent
              )}
              style={{
                top: `${((index + 1) / (nodeData.outputs!.length + 1)) * 100}%`,
              }}
            />
          ))}
        </>
      )}
    </div>
  );
};

export default memo(GeoNode);
