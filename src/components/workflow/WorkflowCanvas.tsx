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
import { FeatureCollection } from 'geojson';

import { GeoNode, GeoNodeData, GeoEdge } from '@/types/nodes';
import { getNodeDefinition } from '@/lib/nodeRegistry';
import { processOperation, executeCustomCode, exportToFormat, ProcessingResult } from '@/lib/geoProcessing';
import GeoNodeComponent from './GeoNode';
import { NodePalette } from './NodePalette';
import { NodeInspector } from './NodeInspector';
import { WorkflowToolbar } from './WorkflowToolbar';
import { toast } from 'sonner';

const nodeTypes = {
  geoNode: GeoNodeComponent,
};

// Store node data separately for processing
type NodeDataStore = Record<string, FeatureCollection>;

const WorkflowCanvasInner = () => {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState<GeoNode>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<GeoEdge>([]);
  const [selectedNode, setSelectedNode] = useState<GeoNode | null>(null);
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);
  const [nodeDataStore, setNodeDataStore] = useState<NodeDataStore>({});

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
      // Update selected node if it's the one being modified
      setSelectedNode((prev) => 
        prev?.id === nodeId ? { ...prev, data: { ...prev.data, config } } : prev
      );
    },
    [setNodes]
  );

  const handleUpdateData = useCallback(
    (nodeId: string, data: FeatureCollection, stats: ProcessingResult['stats']) => {
      // Store the data
      setNodeDataStore((prev) => ({ ...prev, [nodeId]: data }));
      
      // Update node with preview info
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
                    featureCount: stats?.featureCount,
                    geometryType: stats?.geometryType,
                    crs: 'EPSG:4326',
                  },
                },
              }
            : node
        )
      );

      // Update selected node
      setSelectedNode((prev) =>
        prev?.id === nodeId
          ? {
              ...prev,
              data: {
                ...prev.data,
                status: 'success',
                preview: {
                  type: 'geojson',
                  featureCount: stats?.featureCount,
                  geometryType: stats?.geometryType,
                  crs: 'EPSG:4326',
                },
              },
            }
          : prev
      );

      toast.success(`Loaded ${stats?.featureCount} features`);
    },
    [setNodes]
  );

  // Get input data for a node from connected nodes
  const getInputData = useCallback((nodeId: string): FeatureCollection | null => {
    const incomingEdges = edges.filter((e) => e.target === nodeId);
    if (incomingEdges.length === 0) return null;

    // Get data from first connected source
    const sourceId = incomingEdges[0].source;
    return nodeDataStore[sourceId] || null;
  }, [edges, nodeDataStore]);

  // Get secondary input for operations like intersect, union
  const getSecondaryInput = useCallback((nodeId: string): FeatureCollection | null => {
    const incomingEdges = edges.filter((e) => e.target === nodeId);
    if (incomingEdges.length < 2) return null;
    const sourceId = incomingEdges[1].source;
    return nodeDataStore[sourceId] || null;
  }, [edges, nodeDataStore]);

  const handleRunNode = useCallback(
    async (nodeId: string) => {
      const node = nodes.find((n) => n.id === nodeId);
      if (!node) return;

      const nodeType = node.type === 'geoNode' ? (Object.keys(node.data).find(k => k === 'label') ? 
        node.id.split('-')[0] : node.type) : node.type;
      const actualType = node.id.split('-')[0]; // Extract type from id like 'buffer-123456'
      const config = node.data.config || {};

      // Set running status
      setNodes((nds) =>
        nds.map((n) =>
          n.id === nodeId ? { ...n, data: { ...n.data, status: 'running', error: undefined } } : n
        )
      );

      try {
        let result: ProcessingResult;

        // Handle input nodes
        if (actualType === 'fileInput') {
          // File input is handled by the file upload, just check if we have data
          if (nodeDataStore[nodeId]) {
            toast.success('Data already loaded');
            setNodes((nds) =>
              nds.map((n) =>
                n.id === nodeId ? { ...n, data: { ...n.data, status: 'success' } } : n
              )
            );
          } else {
            toast.error('Please upload a file first');
            setNodes((nds) =>
              nds.map((n) =>
                n.id === nodeId ? { ...n, data: { ...n.data, status: 'error', error: 'No file uploaded' } } : n
              )
            );
          }
          return;
        }

        if (actualType === 'urlInput') {
          const url = config.url as string;
          if (!url) {
            throw new Error('Please enter a URL');
          }
          const response = await fetch(url);
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          const data = await response.json();
          
          // Normalize to FeatureCollection
          let fc: FeatureCollection;
          if (data.type === 'FeatureCollection') {
            fc = data;
          } else if (data.type === 'Feature') {
            fc = { type: 'FeatureCollection', features: [data] };
          } else {
            throw new Error('Invalid GeoJSON response');
          }

          handleUpdateData(nodeId, fc, {
            featureCount: fc.features.length,
            geometryType: fc.features[0]?.geometry?.type || 'Unknown',
          });
          return;
        }

        // Handle output nodes
        if (actualType === 'fileOutput') {
          const inputData = getInputData(nodeId);
          if (!inputData) {
            throw new Error('No input data connected');
          }
          const filename = (config.filename as string) || 'output';
          const format = (config.format as string) || 'geojson';
          exportToFormat(inputData, format, filename);
          
          setNodes((nds) =>
            nds.map((n) =>
              n.id === nodeId ? { ...n, data: { ...n.data, status: 'success' } } : n
            )
          );
          toast.success(`Exported ${filename}.${format === 'csv' ? 'csv' : 'geojson'}`);
          return;
        }

        if (actualType === 'preview') {
          const inputData = getInputData(nodeId);
          if (!inputData) {
            throw new Error('No input data connected');
          }
          setNodeDataStore((prev) => ({ ...prev, [nodeId]: inputData }));
          setNodes((nds) =>
            nds.map((n) =>
              n.id === nodeId
                ? {
                    ...n,
                    data: {
                      ...n.data,
                      status: 'success',
                      preview: {
                        type: 'geojson',
                        featureCount: inputData.features.length,
                        geometryType: inputData.features[0]?.geometry?.type,
                      },
                    },
                  }
                : n
            )
          );
          toast.success('Preview ready');
          return;
        }

        // Handle custom code node
        if (actualType === 'customCode') {
          const inputData = getInputData(nodeId);
          if (!inputData) {
            throw new Error('No input data connected');
          }
          const code = config.code as string;
          const language = (config.language as 'javascript' | 'python-like') || 'javascript';
          result = executeCustomCode(code, language, inputData);
        } else {
          // Handle processing nodes
          const inputData = getInputData(nodeId);
          if (!inputData) {
            throw new Error('No input data connected. Connect an input node first.');
          }

          const secondaryInput = getSecondaryInput(nodeId);
          result = processOperation(actualType, inputData, config, secondaryInput || undefined);
        }

        if (result.success && result.data) {
          handleUpdateData(nodeId, result.data, result.stats);
        } else {
          throw new Error(result.error || 'Processing failed');
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Processing failed';
        setNodes((nds) =>
          nds.map((n) =>
            n.id === nodeId ? { ...n, data: { ...n.data, status: 'error', error: errorMessage } } : n
          )
        );
        setSelectedNode((prev) =>
          prev?.id === nodeId ? { ...prev, data: { ...prev.data, status: 'error', error: errorMessage } } : prev
        );
        toast.error(errorMessage);
      }
    },
    [nodes, edges, nodeDataStore, setNodes, getInputData, getSecondaryInput, handleUpdateData]
  );

  // Run entire workflow in topological order
  const handleRunWorkflow = useCallback(async () => {
    toast.info('Running workflow...');

    // Find input nodes (nodes with no incoming edges)
    const inputNodeIds = new Set(
      nodes.filter((n) => !edges.some((e) => e.target === n.id)).map((n) => n.id)
    );

    // Build dependency graph
    const visited = new Set<string>();
    const executionOrder: string[] = [];

    const visit = (nodeId: string) => {
      if (visited.has(nodeId)) return;
      visited.add(nodeId);

      // First process all nodes that this node depends on
      const dependencies = edges.filter((e) => e.target === nodeId).map((e) => e.source);
      dependencies.forEach(visit);

      executionOrder.push(nodeId);
    };

    nodes.forEach((n) => visit(n.id));

    // Execute in order with delays
    for (let i = 0; i < executionOrder.length; i++) {
      await new Promise((resolve) => setTimeout(resolve, 300));
      await handleRunNode(executionOrder[i]);
    }

    toast.success('Workflow complete!');
  }, [nodes, edges, handleRunNode]);

  const handleClearCanvas = () => {
    setNodes([]);
    setEdges([]);
    setSelectedNode(null);
    setNodeDataStore({});
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
          onUpdateData={handleUpdateData}
          onRunNode={handleRunNode}
          nodeData={nodeDataStore[selectedNode.id]}
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
