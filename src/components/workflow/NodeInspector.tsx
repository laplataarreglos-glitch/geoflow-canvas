import { GeoNode } from '@/types/nodes';
import { getNodeDefinition } from '@/lib/nodeRegistry';
import { cn } from '@/lib/utils';
import * as Icons from 'lucide-react';
import { LucideIcon } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X, Play, Settings2, Eye, Table } from 'lucide-react';

interface NodeInspectorProps {
  node: GeoNode | null;
  onClose: () => void;
  onUpdateConfig: (nodeId: string, config: Record<string, unknown>) => void;
  onRunNode: (nodeId: string) => void;
}

export const NodeInspector = ({ node, onClose, onUpdateConfig, onRunNode }: NodeInspectorProps) => {
  if (!node) return null;

  const definition = getNodeDefinition(node.type as string);
  if (!definition) return null;

  const IconComponent = (Icons[definition.icon as keyof typeof Icons] as LucideIcon) || Icons.Box;

  const renderConfigFields = () => {
    const config = node.data.config || {};

    switch (node.type) {
      case 'buffer':
        return (
          <>
            <div className="space-y-2">
              <Label htmlFor="distance">Distance</Label>
              <Input
                id="distance"
                type="number"
                value={(config.distance as number) || 100}
                onChange={(e) =>
                  onUpdateConfig(node.id, { ...config, distance: parseFloat(e.target.value) })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="units">Units</Label>
              <Select
                value={(config.units as string) || 'meters'}
                onValueChange={(value) => onUpdateConfig(node.id, { ...config, units: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="meters">Meters</SelectItem>
                  <SelectItem value="kilometers">Kilometers</SelectItem>
                  <SelectItem value="miles">Miles</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </>
        );

      case 'simplify':
        return (
          <div className="space-y-2">
            <Label htmlFor="tolerance">Tolerance</Label>
            <Input
              id="tolerance"
              type="number"
              step="0.0001"
              value={(config.tolerance as number) || 0.001}
              onChange={(e) =>
                onUpdateConfig(node.id, { ...config, tolerance: parseFloat(e.target.value) })
              }
            />
          </div>
        );

      case 'reproject':
        return (
          <div className="space-y-2">
            <Label htmlFor="targetCRS">Target CRS</Label>
            <Select
              value={(config.targetCRS as string) || 'EPSG:4326'}
              onValueChange={(value) => onUpdateConfig(node.id, { ...config, targetCRS: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="EPSG:4326">WGS 84 (EPSG:4326)</SelectItem>
                <SelectItem value="EPSG:3857">Web Mercator (EPSG:3857)</SelectItem>
                <SelectItem value="EPSG:32618">UTM Zone 18N (EPSG:32618)</SelectItem>
                <SelectItem value="EPSG:2154">Lambert 93 (EPSG:2154)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        );

      case 'fileOutput':
        return (
          <>
            <div className="space-y-2">
              <Label htmlFor="filename">Filename</Label>
              <Input
                id="filename"
                value={(config.filename as string) || 'output'}
                onChange={(e) => onUpdateConfig(node.id, { ...config, filename: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="format">Format</Label>
              <Select
                value={(config.format as string) || 'geojson'}
                onValueChange={(value) => onUpdateConfig(node.id, { ...config, format: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="geojson">GeoJSON</SelectItem>
                  <SelectItem value="shapefile">Shapefile</SelectItem>
                  <SelectItem value="geopackage">GeoPackage</SelectItem>
                  <SelectItem value="csv">CSV with WKT</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </>
        );

      default:
        return (
          <p className="text-sm text-muted-foreground">
            No configuration options for this node.
          </p>
        );
    }
  };

  return (
    <div className="w-80 bg-sidebar border-l border-sidebar-border flex flex-col h-full animate-slide-in-right">
      {/* Header */}
      <div className="p-4 border-b border-sidebar-border flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-md bg-primary/10">
            <IconComponent className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">{node.data.label}</h3>
            <p className="text-xs text-muted-foreground capitalize">{node.data.category}</p>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {/* Description */}
          <div>
            <p className="text-sm text-muted-foreground">{node.data.description}</p>
          </div>

          {/* Configuration */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Settings2 className="w-4 h-4" />
              Configuration
            </div>
            <div className="space-y-4">{renderConfigFields()}</div>
          </div>

          {/* Preview */}
          {node.data.preview && node.data.preview.type !== 'none' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Eye className="w-4 h-4" />
                Preview
              </div>
              <div className="rounded-lg border border-border bg-muted/50 p-4">
                {node.data.preview.featureCount !== undefined && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Features:</span>
                    <span className="font-mono text-foreground">
                      {node.data.preview.featureCount}
                    </span>
                  </div>
                )}
                {node.data.preview.geometryType && (
                  <div className="flex items-center justify-between text-sm mt-2">
                    <span className="text-muted-foreground">Geometry:</span>
                    <span className="font-mono text-foreground">
                      {node.data.preview.geometryType}
                    </span>
                  </div>
                )}
                {node.data.preview.crs && (
                  <div className="flex items-center justify-between text-sm mt-2">
                    <span className="text-muted-foreground">CRS:</span>
                    <span className="font-mono text-foreground">{node.data.preview.crs}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Inputs/Outputs */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Table className="w-4 h-4" />
              Connections
            </div>
            <div className="space-y-2">
              {definition.inputs.length > 0 && (
                <div className="text-sm">
                  <span className="text-muted-foreground">Inputs: </span>
                  <span className="font-mono text-foreground">
                    {definition.inputs.join(', ')}
                  </span>
                </div>
              )}
              {definition.outputs.length > 0 && (
                <div className="text-sm">
                  <span className="text-muted-foreground">Outputs: </span>
                  <span className="font-mono text-foreground">
                    {definition.outputs.join(', ')}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </ScrollArea>

      {/* Footer actions */}
      <div className="p-4 border-t border-sidebar-border">
        <Button onClick={() => onRunNode(node.id)} className="w-full gap-2">
          <Play className="w-4 h-4" />
          Run Node
        </Button>
      </div>
    </div>
  );
};
