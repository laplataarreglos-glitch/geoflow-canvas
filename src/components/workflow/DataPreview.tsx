import { useState } from 'react';
import { FeatureCollection } from 'geojson';
import { Table, Map, Code, ChevronDown, ChevronRight, Copy, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface DataPreviewProps {
  data: FeatureCollection | null;
  title?: string;
  maxRows?: number;
}

export const DataPreview = ({ data, title = 'Data Preview', maxRows = 10 }: DataPreviewProps) => {
  const [copied, setCopied] = useState(false);
  const [expandedRow, setExpandedRow] = useState<number | null>(null);

  if (!data || !data.features || data.features.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-muted/30 p-4 text-center text-sm text-muted-foreground">
        No data available
      </div>
    );
  }

  const features = data.features.slice(0, maxRows);
  const allProperties = Array.from(
    new Set(features.flatMap((f) => Object.keys(f.properties || {})))
  );

  const handleCopyGeoJSON = () => {
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-foreground">{title}</h4>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCopyGeoJSON}
          className="h-7 text-xs gap-1"
        >
          {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
          {copied ? 'Copied!' : 'Copy GeoJSON'}
        </Button>
      </div>

      <Tabs defaultValue="table" className="w-full">
        <TabsList className="grid w-full grid-cols-2 h-8">
          <TabsTrigger value="table" className="text-xs gap-1">
            <Table className="w-3 h-3" />
            Table
          </TabsTrigger>
          <TabsTrigger value="json" className="text-xs gap-1">
            <Code className="w-3 h-3" />
            JSON
          </TabsTrigger>
        </TabsList>

        <TabsContent value="table" className="mt-2">
          <ScrollArea className="h-48 rounded-lg border border-border">
            <table className="w-full text-xs">
              <thead className="bg-muted/50 sticky top-0">
                <tr>
                  <th className="p-2 text-left font-medium text-muted-foreground w-8">#</th>
                  <th className="p-2 text-left font-medium text-muted-foreground">Type</th>
                  {allProperties.slice(0, 4).map((prop) => (
                    <th key={prop} className="p-2 text-left font-medium text-muted-foreground truncate max-w-[100px]">
                      {prop}
                    </th>
                  ))}
                  {allProperties.length > 4 && (
                    <th className="p-2 text-left font-medium text-muted-foreground">...</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {features.map((feature, idx) => (
                  <>
                    <tr
                      key={idx}
                      className={cn(
                        'border-t border-border/50 hover:bg-muted/30 cursor-pointer transition-colors',
                        expandedRow === idx && 'bg-muted/50'
                      )}
                      onClick={() => setExpandedRow(expandedRow === idx ? null : idx)}
                    >
                      <td className="p-2 text-muted-foreground">
                        <div className="flex items-center gap-1">
                          {expandedRow === idx ? (
                            <ChevronDown className="w-3 h-3" />
                          ) : (
                            <ChevronRight className="w-3 h-3" />
                          )}
                          {idx + 1}
                        </div>
                      </td>
                      <td className="p-2 font-mono text-primary">{feature.geometry?.type}</td>
                      {allProperties.slice(0, 4).map((prop) => (
                        <td key={prop} className="p-2 truncate max-w-[100px]">
                          {String(feature.properties?.[prop] ?? '')}
                        </td>
                      ))}
                      {allProperties.length > 4 && (
                        <td className="p-2 text-muted-foreground">+{allProperties.length - 4}</td>
                      )}
                    </tr>
                    {expandedRow === idx && (
                      <tr className="bg-muted/30">
                        <td colSpan={6 + Math.min(allProperties.length, 4)} className="p-2">
                          <pre className="text-xs font-mono overflow-x-auto whitespace-pre-wrap">
                            {JSON.stringify(feature, null, 2)}
                          </pre>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
            {data.features.length > maxRows && (
              <div className="p-2 text-center text-xs text-muted-foreground border-t border-border/50">
                Showing {maxRows} of {data.features.length} features
              </div>
            )}
          </ScrollArea>
        </TabsContent>

        <TabsContent value="json" className="mt-2">
          <ScrollArea className="h-48 rounded-lg border border-border bg-muted/30 p-3">
            <pre className="text-xs font-mono whitespace-pre-wrap">
              {JSON.stringify(
                {
                  type: 'FeatureCollection',
                  features: features.map((f) => ({
                    type: 'Feature',
                    geometry: { type: f.geometry?.type, coordinates: '...' },
                    properties: f.properties,
                  })),
                  _total: data.features.length,
                },
                null,
                2
              )}
            </pre>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
};
