import { useState } from 'react';
import { nodeRegistry, categoryLabels } from '@/lib/nodeRegistry';
import { NodeCategory } from '@/types/nodes';
import { cn } from '@/lib/utils';
import * as Icons from 'lucide-react';
import { LucideIcon } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Search, ChevronDown, ChevronRight } from 'lucide-react';

interface NodePaletteProps {
  onDragStart: (event: React.DragEvent, nodeType: string) => void;
}

const categoryIcons: Record<NodeCategory, LucideIcon> = {
  input: Icons.Upload,
  transform: Icons.Wand2,
  geoprocess: Icons.Layers,
  output: Icons.Download,
  data: Icons.Table,
  calculation: Icons.Calculator,
};

const categoryOrder: NodeCategory[] = ['input', 'transform', 'geoprocess', 'data', 'calculation', 'output'];

export const NodePalette = ({ onDragStart }: NodePaletteProps) => {
  const [search, setSearch] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Set<NodeCategory>>(
    new Set(categoryOrder)
  );

  const toggleCategory = (category: NodeCategory) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  const filteredNodes = nodeRegistry.filter(
    (node) =>
      node.label.toLowerCase().includes(search.toLowerCase()) ||
      node.description.toLowerCase().includes(search.toLowerCase())
  );

  const groupedNodes = categoryOrder.reduce((acc, category) => {
    acc[category] = filteredNodes.filter((node) => node.category === category);
    return acc;
  }, {} as Record<NodeCategory, typeof nodeRegistry>);

  return (
    <div className="w-64 bg-sidebar border-r border-sidebar-border flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-sidebar-border">
        <h2 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
          <Icons.Boxes className="w-5 h-5 text-primary" />
          Nodes
        </h2>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search nodes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-sidebar-accent border-sidebar-border text-sm"
          />
        </div>
      </div>

      {/* Node list */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {categoryOrder.map((category) => {
            const nodes = groupedNodes[category];
            if (nodes.length === 0) return null;

            const CategoryIcon = categoryIcons[category];
            const isExpanded = expandedCategories.has(category);

            return (
              <div key={category} className="space-y-1">
                <button
                  onClick={() => toggleCategory(category)}
                  className={cn(
                    'w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium',
                    'text-sidebar-foreground hover:bg-sidebar-accent transition-colors'
                  )}
                >
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                  <CategoryIcon className="w-4 h-4 text-primary" />
                  <span>{categoryLabels[category]}</span>
                  <span className="ml-auto text-xs text-muted-foreground">
                    {nodes.length}
                  </span>
                </button>

                {isExpanded && (
                  <div className="ml-4 space-y-1">
                    {nodes.map((node) => {
                      const NodeIcon = (Icons[node.icon as keyof typeof Icons] as LucideIcon) || Icons.Box;
                      return (
                        <div
                          key={node.type}
                          draggable
                          onDragStart={(e) => onDragStart(e, node.type)}
                          className={cn(
                            'flex items-center gap-2 px-3 py-2 rounded-md text-sm cursor-grab',
                            'bg-sidebar-accent/50 hover:bg-sidebar-accent border border-transparent',
                            'hover:border-primary/30 transition-all duration-150',
                            'active:cursor-grabbing active:scale-[0.98]'
                          )}
                        >
                          <NodeIcon className="w-4 h-4 text-muted-foreground" />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-foreground truncate">{node.label}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="p-4 border-t border-sidebar-border">
        <p className="text-xs text-muted-foreground text-center">
          Drag nodes to canvas to build workflow
        </p>
      </div>
    </div>
  );
};
