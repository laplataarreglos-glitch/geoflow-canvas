import { useCallback, useRef, useState } from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Node,
  ReactFlowProvider,
  Panel,
  ReactFlowInstance,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { GeoNode, GeoNodeData, GeoEdge } from '@/types/nodes';
import { getNodeDefinition } from '@/lib/nodeRegistry';
import GeoNodeComponent from './GeoNode';
import { NodePalette } from './NodePalette';
import { NodeInspector } from './NodeInspector';
import { WorkflowToolbar } from './WorkflowToolbar';
import { toast } from 'sonner';

const nodeTypes = {
  geoNode: GeoNodeComponent,
};

// Sample workflow for demonstration
const initialNodes: GeoNode[] = [
  {
    id: 'input-1',
    type: 'geoNode',
    position: { x: 100, y: 150 },
    data: {
      label: 'File Input',
      category: 'input',
      icon: 'Upload',
      description: 'Load GeoJSON, Shapefile, GeoPackage, CSV with geometry',
      inputs: [],
      outputs: ['features'],
      preview: {
        type: 'geojson',
        featureCount: 1247,
        geometryType: 'Polygon',
        crs: 'EPSG:4326',
      },
      status: 'success',
    },
  },
  {
    id: 'buffer-1',
    type: 'geoNode',
    position: { x: 400, y: 100 },
    data: {
      label: 'Buffer',
      category: 'geoprocess',
      icon: 'Circle',
      description: 'Create buffer zone around geometries',
      inputs: ['features'],
      outputs: ['features'],
      config: { distance: 500, units: 'meters' },
      preview: {
        type: 'geojson',
        featureCount: 1247,
        geometryType: 'Polygon',
      },
      status: 'success',
    },
  },
  {
    id: 'simplify-1',
    type: 'geoNode',
    position: { x: 400, y: 280 },
    data: {
      label: 'Simplify',
      category: 'transform',
      icon: 'Minimize2',
      description: 'Reduce geometry complexity with tolerance',
      inputs: ['features'],
      outputs: ['features'],
      config: { tolerance: 0.001 },
    },
  },
  {
    id: 'output-1',
    type: 'geoNode',
    position: { x: 700, y: 180 },
    data: {
      label: 'Export File',
      category: 'output',
      icon: 'Download',
      description: 'Export to GeoJSON, Shapefile, GeoPackage',
      inputs: ['features'],
      outputs: [],
      config: { format: 'geojson', filename: 'processed_data' },
    },
  },
];

const initialEdges: GeoEdge[] = [
  { id: 'e1-2', source: 'input-1', target: 'buffer-1', sourceHandle: 'features', targetHandle: 'features' },
  { id: 'e1-3', source: 'input-1', target: 'simplify-1', sourceHandle: 'features', targetHandle: 'features' },
  { id: 'e2-4', source: 'buffer-1', target: 'output-1', sourceHandle: 'features', targetHandle: 'features' },
];

const WorkflowCanvasInner = () => {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNode, setSelectedNode] = useState<GeoNode | null>(null);
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);

  const onConnect = useCallback(
    (params: Connection) => {
      setEdges((eds) => addEdge({ ...params, animated: true }, eds));
    },
    [setEdges]
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const nodeType = event.dataTransfer.getData('application/reactflow');
      if (!nodeType || !reactFlowInstance || !reactFlowWrapper.current) return;

      const definition = getNodeDefinition(nodeType);
      if (!definition) return;

      const bounds = reactFlowWrapper.current.getBoundingClientRect();
      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX - bounds.left,
        y: event.clientY - bounds.top,
      });

      const newNode: GeoNode = {
        id: `${nodeType}-${Date.now()}`,
        type: 'geoNode',
        position,
        data: {
          label: definition.label,
          category: definition.category,
          icon: definition.icon,
          description: definition.description,
          inputs: definition.inputs,
          outputs: definition.outputs,
          config: { ...definition.defaultConfig },
          status: 'idle',
        },
      };

      setNodes((nds) => [...nds, newNode]);
      toast.success(`Added ${definition.label} node`);
    },
    [reactFlowInstance, setNodes]
  );

  const onDragStart = (event: React.DragEvent, nodeType: string) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNode(node as GeoNode);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
  }, []);

  const handleUpdateConfig = useCallback(
    (nodeId: string, config: Record<string, unknown>) => {
      setNodes((nds) =>
        nds.map((node) =>
          node.id === nodeId ? { ...node, data: { ...node.data, config } } : node
        )
      );
    },
    [setNodes]
  );

  const handleRunNode = useCallback(
    (nodeId: string) => {
      setNodes((nds) =>
        nds.map((node) =>
          node.id === nodeId ? { ...node, data: { ...node.data, status: 'running' } } : node
        )
      );

      // Simulate processing
      setTimeout(() => {
        setNodes((nds) =>
          nds.map((node) =>
            node.id === nodeId
              ? {
                  ...node,
                  data: {
                    ...node.data,
                    status: 'success',
                    preview: {
                      type: 'geojson',
                      featureCount: Math.floor(Math.random() * 1000) + 100,
                      geometryType: 'Polygon',
                    },
                  },
                }
              : node
          )
        );
        toast.success('Node processing complete');
      }, 1500);
    },
    [setNodes]
  );

  const handleRunWorkflow = () => {
    toast.info('Running full workflow...');
    nodes.forEach((node, index) => {
      setTimeout(() => {
        handleRunNode(node.id);
      }, index * 500);
    });
  };

  const handleClearCanvas = () => {
    setNodes([]);
    setEdges([]);
    setSelectedNode(null);
    toast.success('Canvas cleared');
  };

  return (
    <div className="flex h-screen w-full bg-background">
      <NodePalette onDragStart={onDragStart} />

      <div ref={reactFlowWrapper} className="flex-1 relative">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onInit={setReactFlowInstance}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onNodeClick={onNodeClick}
          onPaneClick={onPaneClick}
          nodeTypes={nodeTypes}
          fitView
          defaultEdgeOptions={{
            animated: true,
            style: { stroke: 'hsl(174, 72%, 46%)', strokeWidth: 2 },
          }}
          proOptions={{ hideAttribution: true }}
        >
          <Background
            variant={BackgroundVariant.Dots}
            gap={24}
            size={1}
            color="hsl(222, 30%, 20%)"
          />
          <Controls className="!bg-card !border-border !shadow-node" />

          <Panel position="top-center">
            <WorkflowToolbar
              onRun={handleRunWorkflow}
              onClear={handleClearCanvas}
              nodeCount={nodes.length}
            />
          </Panel>
        </ReactFlow>
      </div>

      {selectedNode && (
        <NodeInspector
          node={selectedNode}
          onClose={() => setSelectedNode(null)}
          onUpdateConfig={handleUpdateConfig}
          onRunNode={handleRunNode}
        />
      )}
    </div>
  );
};

export const WorkflowCanvas = () => (
  <ReactFlowProvider>
    <WorkflowCanvasInner />
  </ReactFlowProvider>
);
