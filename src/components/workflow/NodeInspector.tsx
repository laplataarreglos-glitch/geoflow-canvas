import { useState } from 'react';
import { FeatureCollection } from 'geojson';
import { GeoNode } from '@/types/nodes';
import { getNodeDefinition } from '@/lib/nodeRegistry';
import { cn } from '@/lib/utils';
import * as Icons from 'lucide-react';
import { LucideIcon } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { X, Play, Settings2, Eye, Table, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { FileUploadZone } from './FileUploadZone';
import { DataPreview } from './DataPreview';
import { CustomCodeEditor } from './CustomCodeEditor';
import { ProcessingResult } from '@/lib/geoProcessing';

interface NodeInspectorProps {
  node: GeoNode | null;
  onClose: () => void;
  onUpdateConfig: (nodeId: string, config: Record<string, unknown>) => void;
  onUpdateData: (nodeId: string, data: FeatureCollection, stats: ProcessingResult['stats']) => void;
  onRunNode: (nodeId: string) => void;
  nodeData?: FeatureCollection | null;
}

export const NodeInspector = ({ 
  node, 
  onClose, 
  onUpdateConfig, 
  onUpdateData,
  onRunNode,
  nodeData 
}: NodeInspectorProps) => {
  if (!node) return null;

  const definition = getNodeDefinition(node.type as string);
  if (!definition) return null;

  const IconComponent = (Icons[definition.icon as keyof typeof Icons] as LucideIcon) || Icons.Box;
  const config = node.data.config || {};

  const handleFileLoaded = (result: ProcessingResult, fileName: string) => {
    if (result.success && result.data && result.stats) {
      onUpdateConfig(node.id, { ...config, fileName });
      onUpdateData(node.id, result.data, result.stats);
    }
  };

  const renderConfigFields = () => {
    switch (node.type) {
      case 'fileInput':
        return (
          <div className="space-y-4">
            <FileUploadZone
              onFileLoaded={handleFileLoaded}
              currentFile={config.fileName as string}
            />
          </div>
        );

      case 'urlInput':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="url">URL</Label>
              <Input
                id="url"
                placeholder="https://example.com/data.geojson"
                value={(config.url as string) || ''}
                onChange={(e) => onUpdateConfig(node.id, { ...config, url: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="method">Method</Label>
              <Select
                value={(config.method as string) || 'GET'}
                onValueChange={(value) => onUpdateConfig(node.id, { ...config, method: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="GET">GET</SelectItem>
                  <SelectItem value="POST">POST</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );

      case 'databaseInput':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="connection">Connection String</Label>
              <Input
                id="connection"
                placeholder="postgresql://user:pass@host:5432/db"
                value={(config.connection as string) || ''}
                onChange={(e) => onUpdateConfig(node.id, { ...config, connection: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="table">Table Name</Label>
              <Input
                id="table"
                placeholder="my_spatial_table"
                value={(config.table as string) || ''}
                onChange={(e) => onUpdateConfig(node.id, { ...config, table: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="query">Custom Query (optional)</Label>
              <Textarea
                id="query"
                placeholder="SELECT * FROM table WHERE ..."
                value={(config.query as string) || ''}
                onChange={(e) => onUpdateConfig(node.id, { ...config, query: e.target.value })}
                className="font-mono text-xs"
              />
            </div>
          </div>
        );

      case 'buffer':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="distance">Buffer Distance</Label>
              <Input
                id="distance"
                type="number"
                value={(config.distance as number) || 100}
                onChange={(e) => onUpdateConfig(node.id, { ...config, distance: parseFloat(e.target.value) || 0 })}
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
                  <SelectItem value="feet">Feet</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );

      case 'simplify':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="tolerance">Tolerance</Label>
              <Input
                id="tolerance"
                type="number"
                step="0.0001"
                value={(config.tolerance as number) || 0.001}
                onChange={(e) => onUpdateConfig(node.id, { ...config, tolerance: parseFloat(e.target.value) || 0.001 })}
              />
              <p className="text-xs text-muted-foreground">
                Higher values = more simplification (in degrees for WGS84)
              </p>
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="highQuality">High Quality</Label>
              <Switch
                id="highQuality"
                checked={config.highQuality !== false}
                onCheckedChange={(checked) => onUpdateConfig(node.id, { ...config, highQuality: checked })}
              />
            </div>
          </div>
        );

      case 'smooth':
        return (
          <div className="space-y-2">
            <Label htmlFor="iterations">Smoothing Iterations</Label>
            <Input
              id="iterations"
              type="number"
              min="1"
              max="10"
              value={(config.iterations as number) || 3}
              onChange={(e) => onUpdateConfig(node.id, { ...config, iterations: parseInt(e.target.value) || 3 })}
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
                <SelectItem value="EPSG:4269">NAD 83 (EPSG:4269)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Note: Full reprojection requires a PostGIS backend
            </p>
          </div>
        );

      case 'dissolve':
        return (
          <div className="space-y-2">
            <Label htmlFor="propertyName">Dissolve By Property</Label>
            <Input
              id="propertyName"
              placeholder="Leave empty to dissolve all"
              value={(config.propertyName as string) || ''}
              onChange={(e) => onUpdateConfig(node.id, { ...config, propertyName: e.target.value })}
            />
            <p className="text-xs text-muted-foreground">
              Features with the same property value will be merged
            </p>
          </div>
        );

      case 'filter':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="expression">Filter Expression</Label>
              <Textarea
                id="expression"
                placeholder='e.g., population > 1000 && type === "city"'
                value={(config.expression as string) || ''}
                onChange={(e) => onUpdateConfig(node.id, { ...config, expression: e.target.value })}
                className="font-mono text-xs"
              />
              <p className="text-xs text-muted-foreground">
                JavaScript expression using feature properties
              </p>
            </div>
          </div>
        );

      case 'area':
        return (
          <div className="space-y-2">
            <Label htmlFor="units">Area Units</Label>
            <Select
              value={(config.units as string) || 'square-kilometers'}
              onValueChange={(value) => onUpdateConfig(node.id, { ...config, units: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="square-meters">Square Meters</SelectItem>
                <SelectItem value="square-kilometers">Square Kilometers</SelectItem>
                <SelectItem value="square-miles">Square Miles</SelectItem>
                <SelectItem value="hectares">Hectares</SelectItem>
              </SelectContent>
            </Select>
          </div>
        );

      case 'distance':
        return (
          <div className="space-y-2">
            <Label htmlFor="units">Distance Units</Label>
            <Select
              value={(config.units as string) || 'kilometers'}
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
        );

      case 'customCode':
        return (
          <CustomCodeEditor
            code={(config.code as string) || ''}
            language={(config.language as 'javascript' | 'python-like') || 'javascript'}
            onCodeChange={(code) => onUpdateConfig(node.id, { ...config, code })}
            onLanguageChange={(language) => onUpdateConfig(node.id, { ...config, language })}
          />
        );

      case 'fileOutput':
        return (
          <div className="space-y-4">
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
                  <SelectItem value="geojson">GeoJSON (.geojson)</SelectItem>
                  <SelectItem value="csv">CSV with WKT (.csv)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );

      case 'preview':
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="showAttributes">Show Attributes</Label>
              <Switch
                id="showAttributes"
                checked={config.showAttributes !== false}
                onCheckedChange={(checked) => onUpdateConfig(node.id, { ...config, showAttributes: checked })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="style">Map Style</Label>
              <Select
                value={(config.style as string) || 'default'}
                onValueChange={(value) => onUpdateConfig(node.id, { ...config, style: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">Default</SelectItem>
                  <SelectItem value="satellite">Satellite</SelectItem>
                  <SelectItem value="dark">Dark</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );

      case 'join':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="leftKey">Source Key</Label>
              <Input
                id="leftKey"
                placeholder="Property name in source layer"
                value={(config.leftKey as string) || ''}
                onChange={(e) => onUpdateConfig(node.id, { ...config, leftKey: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rightKey">Target Key</Label>
              <Input
                id="rightKey"
                placeholder="Property name in target layer"
                value={(config.rightKey as string) || ''}
                onChange={(e) => onUpdateConfig(node.id, { ...config, rightKey: e.target.value })}
              />
            </div>
          </div>
        );

      case 'groupBy':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="groupField">Group By Field</Label>
              <Input
                id="groupField"
                placeholder="Property name to group by"
                value={(config.groupField as string) || ''}
                onChange={(e) => onUpdateConfig(node.id, { ...config, groupField: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="aggregation">Aggregation</Label>
              <Select
                value={(config.aggregation as string) || 'count'}
                onValueChange={(value) => onUpdateConfig(node.id, { ...config, aggregation: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="count">Count</SelectItem>
                  <SelectItem value="sum">Sum</SelectItem>
                  <SelectItem value="mean">Mean</SelectItem>
                  <SelectItem value="min">Min</SelectItem>
                  <SelectItem value="max">Max</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );

      // Nodes with no configuration
      case 'centroid':
      case 'bbox':
      case 'makeValid':
      case 'intersect':
      case 'union':
      case 'clip':
        return (
          <div className="p-3 rounded-lg bg-muted/50 border border-border">
            <p className="text-sm text-muted-foreground">
              {node.type === 'intersect' || node.type === 'union' || node.type === 'clip'
                ? 'Connect two input layers to perform this operation.'
                : 'This operation has no configuration options.'}
            </p>
          </div>
        );

      default:
        return (
          <p className="text-sm text-muted-foreground">
            No configuration options for this node type.
          </p>
        );
    }
  };

  const StatusBadge = () => {
    const status = node.data.status;
    if (!status || status === 'idle') return null;

    return (
      <div className={cn(
        'flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium',
        status === 'running' && 'bg-yellow-500/20 text-yellow-400',
        status === 'success' && 'bg-geo-input/20 text-geo-input',
        status === 'error' && 'bg-destructive/20 text-destructive'
      )}>
        {status === 'running' && <Loader2 className="w-3 h-3 animate-spin" />}
        {status === 'success' && <CheckCircle2 className="w-3 h-3" />}
        {status === 'error' && <AlertCircle className="w-3 h-3" />}
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </div>
    );
  };

  return (
    <div className="w-96 bg-sidebar border-l border-sidebar-border flex flex-col h-full animate-slide-in-right">
      {/* Header */}
      <div className="p-4 border-b border-sidebar-border">
        <div className="flex items-center justify-between mb-2">
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
        <StatusBadge />
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {/* Description */}
          <p className="text-sm text-muted-foreground">{node.data.description}</p>

          {/* Error display */}
          {node.data.error && (
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-destructive mt-0.5" />
                <p className="text-sm text-destructive">{node.data.error}</p>
              </div>
            </div>
          )}

          {/* Configuration */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Settings2 className="w-4 h-4" />
              Configuration
            </div>
            <div className="space-y-4">{renderConfigFields()}</div>
          </div>

          {/* Preview Stats */}
          {node.data.preview && node.data.preview.type !== 'none' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Eye className="w-4 h-4" />
                Output Info
              </div>
              <div className="rounded-lg border border-border bg-muted/50 p-4 space-y-2">
                {node.data.preview.featureCount !== undefined && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Features:</span>
                    <span className="font-mono text-foreground font-medium">
                      {node.data.preview.featureCount.toLocaleString()}
                    </span>
                  </div>
                )}
                {node.data.preview.geometryType && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Geometry:</span>
                    <span className="font-mono text-foreground">
                      {node.data.preview.geometryType}
                    </span>
                  </div>
                )}
                {node.data.preview.crs && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">CRS:</span>
                    <span className="font-mono text-foreground">{node.data.preview.crs}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Data Preview */}
          {nodeData && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Table className="w-4 h-4" />
                Data Preview
              </div>
              <DataPreview data={nodeData} maxRows={5} />
            </div>
          )}

          {/* Connections info */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Table className="w-4 h-4" />
              Connections
            </div>
            <div className="space-y-1 text-sm">
              {definition.inputs.length > 0 && (
                <div>
                  <span className="text-muted-foreground">Inputs: </span>
                  <span className="font-mono text-primary">{definition.inputs.join(', ')}</span>
                </div>
              )}
              {definition.outputs.length > 0 && (
                <div>
                  <span className="text-muted-foreground">Outputs: </span>
                  <span className="font-mono text-primary">{definition.outputs.join(', ')}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </ScrollArea>

      {/* Footer actions */}
      <div className="p-4 border-t border-sidebar-border">
        <Button 
          onClick={() => onRunNode(node.id)} 
          className="w-full gap-2"
          disabled={node.data.status === 'running'}
        >
          {node.data.status === 'running' ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <Play className="w-4 h-4" />
              Run Node
            </>
          )}
        </Button>
      </div>
    </div>
  );
};
