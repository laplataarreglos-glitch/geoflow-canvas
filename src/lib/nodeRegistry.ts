import { NodeDefinition, NodeCategory } from '@/types/nodes';

// Node registry - easily extensible for new node types
export const nodeRegistry: NodeDefinition[] = [
  // Input nodes
  {
    type: 'fileInput',
    label: 'File Input',
    category: 'input',
    icon: 'Upload',
    description: 'Load GeoJSON, Shapefile, GeoPackage, CSV with geometry',
    inputs: [],
    outputs: ['features'],
    defaultConfig: { format: 'auto' },
  },
  {
    type: 'urlInput',
    label: 'URL/API',
    category: 'input',
    icon: 'Link',
    description: 'Fetch data from URL, WMS, WFS, or REST API',
    inputs: [],
    outputs: ['features'],
    defaultConfig: { url: '', method: 'GET' },
  },
  {
    type: 'databaseInput',
    label: 'PostGIS/Supabase',
    category: 'input',
    icon: 'Database',
    description: 'Connect to PostGIS or Supabase database',
    inputs: [],
    outputs: ['features'],
    defaultConfig: { connection: '', query: '' },
  },

  // Transform nodes
  {
    type: 'reproject',
    label: 'Reproject',
    category: 'transform',
    icon: 'Globe',
    description: 'Transform coordinates to target CRS (EPSG)',
    inputs: ['features'],
    outputs: ['features'],
    defaultConfig: { targetCRS: 'EPSG:4326' },
  },
  {
    type: 'simplify',
    label: 'Simplify',
    category: 'transform',
    icon: 'Minimize2',
    description: 'Reduce geometry complexity with tolerance',
    inputs: ['features'],
    outputs: ['features'],
    defaultConfig: { tolerance: 0.001, highQuality: true },
  },
  {
    type: 'makeValid',
    label: 'Make Valid',
    category: 'transform',
    icon: 'CheckCircle',
    description: 'Fix invalid geometries (st_make_valid)',
    inputs: ['features'],
    outputs: ['features'],
    defaultConfig: {},
  },
  {
    type: 'smooth',
    label: 'Smooth',
    category: 'transform',
    icon: 'Waves',
    description: 'Smooth polygon and line geometries',
    inputs: ['features'],
    outputs: ['features'],
    defaultConfig: { iterations: 3 },
  },

  // Geoprocess nodes
  {
    type: 'buffer',
    label: 'Buffer',
    category: 'geoprocess',
    icon: 'Circle',
    description: 'Create buffer zone around geometries',
    inputs: ['features'],
    outputs: ['features'],
    defaultConfig: { distance: 100, units: 'meters' },
  },
  {
    type: 'intersect',
    label: 'Intersect',
    category: 'geoprocess',
    icon: 'Layers',
    description: 'Compute intersection of two layers',
    inputs: ['features', 'overlay'],
    outputs: ['features'],
    defaultConfig: {},
  },
  {
    type: 'union',
    label: 'Union',
    category: 'geoprocess',
    icon: 'Combine',
    description: 'Merge overlapping geometries',
    inputs: ['features', 'overlay'],
    outputs: ['features'],
    defaultConfig: {},
  },
  {
    type: 'dissolve',
    label: 'Dissolve',
    category: 'geoprocess',
    icon: 'Droplets',
    description: 'Merge features by attribute',
    inputs: ['features'],
    outputs: ['features'],
    defaultConfig: { propertyName: '' },
  },
  {
    type: 'clip',
    label: 'Clip',
    category: 'geoprocess',
    icon: 'Scissors',
    description: 'Clip features to boundary',
    inputs: ['features', 'mask'],
    outputs: ['features'],
    defaultConfig: {},
  },
  {
    type: 'centroid',
    label: 'Centroid',
    category: 'geoprocess',
    icon: 'Target',
    description: 'Calculate polygon centroids',
    inputs: ['features'],
    outputs: ['features'],
    defaultConfig: {},
  },
  {
    type: 'bbox',
    label: 'Bounding Box',
    category: 'geoprocess',
    icon: 'Square',
    description: 'Calculate bounding boxes',
    inputs: ['features'],
    outputs: ['features'],
    defaultConfig: {},
  },

  // Data operations
  {
    type: 'filter',
    label: 'Filter',
    category: 'data',
    icon: 'Filter',
    description: 'Filter features by attribute or spatial condition',
    inputs: ['features'],
    outputs: ['features'],
    defaultConfig: { expression: '' },
  },
  {
    type: 'join',
    label: 'Join',
    category: 'data',
    icon: 'GitMerge',
    description: 'Join attributes from another layer',
    inputs: ['features', 'table'],
    outputs: ['features'],
    defaultConfig: { leftKey: '', rightKey: '' },
  },
  {
    type: 'groupBy',
    label: 'Group By',
    category: 'data',
    icon: 'Folder',
    description: 'Aggregate features by attribute',
    inputs: ['features'],
    outputs: ['features'],
    defaultConfig: { groupField: '', aggregations: [] },
  },

  // Calculation nodes
  {
    type: 'distance',
    label: 'Distance',
    category: 'calculation',
    icon: 'Ruler',
    description: 'Calculate euclidean distance matrix',
    inputs: ['features', 'targets'],
    outputs: ['features'],
    defaultConfig: { units: 'kilometers' },
  },
  {
    type: 'area',
    label: 'Area',
    category: 'calculation',
    icon: 'SquareDashed',
    description: 'Calculate polygon areas',
    inputs: ['features'],
    outputs: ['features'],
    defaultConfig: { units: 'square-kilometers' },
  },

  // Output nodes
  {
    type: 'fileOutput',
    label: 'Export File',
    category: 'output',
    icon: 'Download',
    description: 'Export to GeoJSON, Shapefile, GeoPackage',
    inputs: ['features'],
    outputs: [],
    defaultConfig: { format: 'geojson', filename: 'output' },
  },
  {
    type: 'databaseOutput',
    label: 'Save to DB',
    category: 'output',
    icon: 'DatabaseZap',
    description: 'Write to PostGIS or Supabase',
    inputs: ['features'],
    outputs: [],
    defaultConfig: { connection: '', tableName: '' },
  },
  {
    type: 'preview',
    label: 'Map Preview',
    category: 'output',
    icon: 'Map',
    description: 'Visualize on interactive map',
    inputs: ['features'],
    outputs: [],
    defaultConfig: {},
  },
];

export const getNodesByCategory = (category: NodeCategory): NodeDefinition[] => {
  return nodeRegistry.filter((node) => node.category === category);
};

export const getNodeDefinition = (type: string): NodeDefinition | undefined => {
  return nodeRegistry.find((node) => node.type === type);
};

export const categoryColors: Record<NodeCategory, string> = {
  input: 'geo-input',
  transform: 'geo-transform',
  geoprocess: 'geo-geoprocess',
  output: 'geo-output',
  data: 'geo-data',
  calculation: 'geo-calculation',
};

export const categoryLabels: Record<NodeCategory, string> = {
  input: 'Input',
  transform: 'Transform',
  geoprocess: 'Geoprocess',
  output: 'Output',
  data: 'Data Ops',
  calculation: 'Calculate',
};
