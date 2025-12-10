import * as turf from '@turf/turf';
import type { FeatureCollection, Feature, Geometry, GeoJsonProperties } from 'geojson';

export type GeoData = FeatureCollection | Feature | null;

export interface ProcessingResult {
  success: boolean;
  data?: FeatureCollection;
  error?: string;
  stats?: {
    featureCount: number;
    geometryType: string;
    bbox?: [number, number, number, number];
    properties?: string[];
  };
}

// Parse uploaded file to GeoJSON
export const parseGeoFile = async (file: File): Promise<ProcessingResult> => {
  try {
    const text = await file.text();
    const extension = file.name.split('.').pop()?.toLowerCase();

    if (extension === 'geojson' || extension === 'json') {
      const geojson = JSON.parse(text);
      const fc = normalizeToFeatureCollection(geojson);
      return createSuccessResult(fc);
    }

    if (extension === 'csv') {
      const fc = parseCSVWithGeometry(text);
      return createSuccessResult(fc);
    }

    // For WKT files
    if (extension === 'wkt' || extension === 'txt') {
      const fc = parseWKT(text);
      return createSuccessResult(fc);
    }

    return { success: false, error: `Unsupported format: ${extension}. Use GeoJSON, CSV, or WKT.` };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to parse file' };
  }
};

// Normalize any GeoJSON to FeatureCollection
export const normalizeToFeatureCollection = (geojson: unknown): FeatureCollection => {
  if (!geojson || typeof geojson !== 'object') {
    throw new Error('Invalid GeoJSON');
  }

  const obj = geojson as { type: string; features?: Feature[]; geometry?: Geometry; properties?: GeoJsonProperties };

  if (obj.type === 'FeatureCollection') {
    return obj as FeatureCollection;
  }

  if (obj.type === 'Feature') {
    return { type: 'FeatureCollection', features: [obj as Feature] };
  }

  // It's a geometry
  return {
    type: 'FeatureCollection',
    features: [{ type: 'Feature', properties: {}, geometry: obj as Geometry }],
  };
};

// Parse CSV with geometry column (WKT or lat/lng)
const parseCSVWithGeometry = (text: string): FeatureCollection => {
  const lines = text.trim().split('\n');
  if (lines.length < 2) throw new Error('CSV must have header and data rows');

  const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
  const features: Feature[] = [];

  // Find geometry column
  const geomIndex = headers.findIndex((h) => ['geometry', 'geom', 'wkt', 'the_geom'].includes(h));
  const latIndex = headers.findIndex((h) => ['lat', 'latitude', 'y'].includes(h));
  const lngIndex = headers.findIndex((h) => ['lng', 'lon', 'longitude', 'x'].includes(h));

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const properties: GeoJsonProperties = {};

    headers.forEach((header, idx) => {
      if (idx !== geomIndex && idx !== latIndex && idx !== lngIndex) {
        properties[header] = values[idx];
      }
    });

    let geometry: Geometry | null = null;

    if (geomIndex >= 0 && values[geomIndex]) {
      geometry = wktToGeometry(values[geomIndex]);
    } else if (latIndex >= 0 && lngIndex >= 0) {
      const lat = parseFloat(values[latIndex]);
      const lng = parseFloat(values[lngIndex]);
      if (!isNaN(lat) && !isNaN(lng)) {
        geometry = { type: 'Point', coordinates: [lng, lat] };
      }
    }

    if (geometry) {
      features.push({ type: 'Feature', properties, geometry });
    }
  }

  return { type: 'FeatureCollection', features };
};

// Simple CSV line parser handling quotes
const parseCSVLine = (line: string): string[] => {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (const char of line) {
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
};

// Parse WKT string to geometry
const wktToGeometry = (wkt: string): Geometry | null => {
  try {
    const trimmed = wkt.trim().toUpperCase();

    if (trimmed.startsWith('POINT')) {
      const coords = trimmed.match(/POINT\s*\(\s*([^\)]+)\s*\)/);
      if (coords) {
        const [x, y] = coords[1].split(/\s+/).map(Number);
        return { type: 'Point', coordinates: [x, y] };
      }
    }

    if (trimmed.startsWith('LINESTRING')) {
      const coords = trimmed.match(/LINESTRING\s*\(\s*([^\)]+)\s*\)/);
      if (coords) {
        const points = coords[1].split(',').map((p) => p.trim().split(/\s+/).map(Number));
        return { type: 'LineString', coordinates: points };
      }
    }

    if (trimmed.startsWith('POLYGON')) {
      const match = trimmed.match(/POLYGON\s*\(\s*\(([^\)]+)\)\s*\)/);
      if (match) {
        const points = match[1].split(',').map((p) => p.trim().split(/\s+/).map(Number));
        return { type: 'Polygon', coordinates: [points] };
      }
    }

    return null;
  } catch {
    return null;
  }
};

// Parse WKT file (one geometry per line)
const parseWKT = (text: string): FeatureCollection => {
  const lines = text.trim().split('\n');
  const features: Feature[] = [];

  lines.forEach((line, idx) => {
    const geometry = wktToGeometry(line);
    if (geometry) {
      features.push({ type: 'Feature', properties: { id: idx + 1 }, geometry });
    }
  });

  return { type: 'FeatureCollection', features };
};

// Create success result with stats
const createSuccessResult = (fc: FeatureCollection): ProcessingResult => {
  const geometryTypes = new Set(fc.features.map((f) => f.geometry?.type).filter(Boolean));
  const properties = fc.features[0]?.properties ? Object.keys(fc.features[0].properties) : [];

  return {
    success: true,
    data: fc,
    stats: {
      featureCount: fc.features.length,
      geometryType: Array.from(geometryTypes).join(', ') || 'Unknown',
      bbox: fc.features.length > 0 ? turf.bbox(fc) as [number, number, number, number] : undefined,
      properties,
    },
  };
};

// Process operations using turf.js
export const processOperation = (
  operation: string,
  input: FeatureCollection,
  config: Record<string, unknown>,
  secondaryInput?: FeatureCollection
): ProcessingResult => {
  try {
    let result: FeatureCollection;

    switch (operation) {
      case 'buffer': {
        const distance = (config.distance as number) || 100;
        const units = (config.units as turf.Units) || 'meters';
        const buffered = input.features.map((f) => turf.buffer(f, distance, { units }));
        result = { type: 'FeatureCollection', features: buffered.filter(Boolean) as Feature[] };
        break;
      }

      case 'simplify': {
        const tolerance = (config.tolerance as number) || 0.001;
        const highQuality = config.highQuality !== false;
        const simplified = input.features.map((f) =>
          turf.simplify(f, { tolerance, highQuality })
        );
        result = { type: 'FeatureCollection', features: simplified };
        break;
      }

      case 'centroid': {
        const centroids = input.features.map((f) => {
          const centroid = turf.centroid(f);
          centroid.properties = { ...f.properties, ...centroid.properties };
          return centroid;
        });
        result = { type: 'FeatureCollection', features: centroids };
        break;
      }

      case 'bbox': {
        const bboxes = input.features.map((f) => {
          const box = turf.bboxPolygon(turf.bbox(f));
          box.properties = { ...f.properties };
          return box;
        });
        result = { type: 'FeatureCollection', features: bboxes };
        break;
      }

      case 'dissolve': {
        const propertyName = config.propertyName as string;
        if (propertyName) {
          // Filter to only polygon features for dissolve
          const polygonFeatures = input.features.filter(
            (f) => f.geometry?.type === 'Polygon' || f.geometry?.type === 'MultiPolygon'
          );
          if (polygonFeatures.length > 0) {
            const polygonFC = { type: 'FeatureCollection' as const, features: polygonFeatures };
            result = turf.dissolve(polygonFC as any, { propertyName });
          } else {
            result = input;
          }
        } else {
          // Dissolve all - use union
          const polygonFeatures = input.features.filter(
            (f) => f.geometry?.type === 'Polygon' || f.geometry?.type === 'MultiPolygon'
          );
          if (polygonFeatures.length > 1) {
            try {
              const union = turf.union(turf.featureCollection(polygonFeatures) as any);
              result = { type: 'FeatureCollection', features: union ? [union as Feature] : polygonFeatures };
            } catch {
              result = { type: 'FeatureCollection', features: polygonFeatures };
            }
          } else {
            result = input;
          }
        }
        break;
      }

      case 'intersect': {
        if (!secondaryInput) {
          return { success: false, error: 'Intersect requires a secondary input layer' };
        }
        const intersections: Feature[] = [];
        input.features.forEach((f1) => {
          secondaryInput.features.forEach((f2) => {
            try {
              const fc = turf.featureCollection([f1, f2]);
              const intersection = turf.intersect(fc as any);
              if (intersection) {
                (intersection as Feature).properties = { ...f1.properties, ...f2.properties };
                intersections.push(intersection as Feature);
              }
            } catch {
              // Skip invalid intersections
            }
          });
        });
        result = { type: 'FeatureCollection', features: intersections };
        break;
      }

      case 'union': {
        if (!secondaryInput) {
          return { success: false, error: 'Union requires a secondary input layer' };
        }
        const allFeatures = [...input.features, ...secondaryInput.features];
        result = { type: 'FeatureCollection', features: allFeatures };
        break;
      }

      case 'clip': {
        if (!secondaryInput || secondaryInput.features.length === 0) {
          return { success: false, error: 'Clip requires a mask layer' };
        }
        const mask = secondaryInput.features[0];
        const clipped = input.features
          .map((f) => {
            try {
              const fc = turf.featureCollection([f, mask]);
              return turf.intersect(fc as any) as Feature | null;
            } catch {
              return null;
            }
          })
          .filter(Boolean) as Feature[];
        result = { type: 'FeatureCollection', features: clipped };
        break;
      }

      case 'area': {
        const units = (config.units as string) || 'square-kilometers';
        const withArea = input.features.map((f) => {
          const area = turf.area(f);
          let convertedArea = area;
          if (units === 'square-kilometers') convertedArea = area / 1000000;
          if (units === 'square-miles') convertedArea = area / 2589988.11;
          if (units === 'hectares') convertedArea = area / 10000;
          return {
            ...f,
            properties: { ...f.properties, area: convertedArea, area_units: units },
          };
        });
        result = { type: 'FeatureCollection', features: withArea };
        break;
      }

      case 'distance': {
        if (!secondaryInput) {
          return { success: false, error: 'Distance calculation requires target points' };
        }
        const units = (config.units as turf.Units) || 'kilometers';
        const withDistance = input.features.map((f) => {
          const centroid = turf.centroid(f);
          let minDist = Infinity;
          secondaryInput.features.forEach((target) => {
            const targetCentroid = turf.centroid(target);
            const dist = turf.distance(centroid, targetCentroid, { units });
            if (dist < minDist) minDist = dist;
          });
          return {
            ...f,
            properties: { ...f.properties, distance: minDist === Infinity ? null : minDist, distance_units: units },
          };
        });
        result = { type: 'FeatureCollection', features: withDistance };
        break;
      }

      case 'filter': {
        const expression = config.expression as string;
        if (!expression) {
          result = input;
        } else {
          const filtered = input.features.filter((f) => {
            try {
              const func = new Function('properties', `with(properties) { return ${expression}; }`);
              return func(f.properties || {});
            } catch {
              return true;
            }
          });
          result = { type: 'FeatureCollection', features: filtered };
        }
        break;
      }

      case 'smooth': {
        const iterations = (config.iterations as number) || 3;
        const smoothed = input.features.map((f) => {
          try {
            return turf.polygonSmooth(f as any, { iterations }).features[0] || f;
          } catch {
            return f;
          }
        });
        result = { type: 'FeatureCollection', features: smoothed };
        break;
      }

      case 'makeValid': {
        // Turf doesn't have makeValid, but we can try to clean geometries
        const cleaned = input.features.map((f) => {
          try {
            // Try to rewind and clean the geometry
            const rewound = turf.rewind(f, { mutate: false });
            return rewound as Feature;
          } catch {
            return f;
          }
        });
        result = { type: 'FeatureCollection', features: cleaned };
        break;
      }

      case 'reproject': {
        // Note: Turf works in WGS84, so we just pass through
        // In a real app, you'd use proj4js for actual reprojection
        result = input;
        break;
      }

      default:
        return { success: false, error: `Unknown operation: ${operation}` };
    }

    return createSuccessResult(result);
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Processing failed' };
  }
};

// Execute custom code (Python/R style expressions)
export const executeCustomCode = (
  code: string,
  language: 'javascript' | 'python-like',
  input: FeatureCollection
): ProcessingResult => {
  try {
    if (language === 'javascript') {
      // Execute JavaScript code with turf available
      const func = new Function('features', 'turf', 'input', code);
      const result = func(input.features, turf, input);

      if (result && result.type === 'FeatureCollection') {
        return createSuccessResult(result);
      }

      if (Array.isArray(result)) {
        return createSuccessResult({ type: 'FeatureCollection', features: result });
      }

      return { success: false, error: 'Custom code must return a FeatureCollection or array of features' };
    }

    // Python-like syntax is complex to fully support - for now just try to execute as JS
    // A full implementation would use a Python runtime like Pyodide
    return { success: false, error: 'Python-like syntax is experimental. Please use JavaScript for now.' };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Code execution failed' };
  }
};

// Export to various formats
export const exportToFormat = (
  data: FeatureCollection,
  format: string,
  filename: string
): void => {
  let content: string;
  let mimeType: string;
  let ext: string;

  switch (format) {
    case 'geojson':
      content = JSON.stringify(data, null, 2);
      mimeType = 'application/geo+json';
      ext = 'geojson';
      break;

    case 'csv': {
      const headers = ['geometry', ...Object.keys(data.features[0]?.properties || {})];
      const rows = data.features.map((f) => {
        const geom = JSON.stringify(f.geometry);
        const props = headers.slice(1).map((h) => f.properties?.[h] ?? '');
        return [geom, ...props].map((v) => `"${v}"`).join(',');
      });
      content = [headers.join(','), ...rows].join('\n');
      mimeType = 'text/csv';
      ext = 'csv';
      break;
    }

    default:
      content = JSON.stringify(data, null, 2);
      mimeType = 'application/json';
      ext = 'json';
  }

  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.${ext}`;
  a.click();
  URL.revokeObjectURL(url);
};
