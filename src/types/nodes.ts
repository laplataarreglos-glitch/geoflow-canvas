import { Node, Edge } from '@xyflow/react';

export type NodeCategory = 'input' | 'transform' | 'geoprocess' | 'output' | 'data' | 'calculation';

export interface GeoNodeData extends Record<string, unknown> {
  label: string;
  category: NodeCategory;
  icon: string;
  description: string;
  inputs?: string[];
  outputs?: string[];
  config?: Record<string, unknown>;
  preview?: GeoPreview;
  status?: 'idle' | 'running' | 'success' | 'error';
  error?: string;
}

export interface GeoPreview {
  type: 'geojson' | 'table' | 'stats' | 'none';
  data?: unknown;
  featureCount?: number;
  geometryType?: string;
  crs?: string;
}

export type GeoNode = Node<GeoNodeData>;
export type GeoEdge = Edge;

export interface NodeDefinition {
  type: string;
  label: string;
  category: NodeCategory;
  icon: string;
  description: string;
  inputs: string[];
  outputs: string[];
  defaultConfig: Record<string, unknown>;
}

export interface WorkflowState {
  nodes: GeoNode[];
  edges: GeoEdge[];
  selectedNode: string | null;
}
