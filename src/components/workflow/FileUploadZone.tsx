import { useState, useCallback } from 'react';
import { Upload, FileJson, X, Check, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { parseGeoFile, ProcessingResult } from '@/lib/geoProcessing';

interface FileUploadZoneProps {
  onFileLoaded: (result: ProcessingResult, fileName: string) => void;
  currentFile?: string;
  className?: string;
}

export const FileUploadZone = ({ onFileLoaded, currentFile, className }: FileUploadZoneProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = useCallback(async (file: File) => {
    setIsLoading(true);
    setError(null);

    const result = await parseGeoFile(file);

    if (result.success) {
      onFileLoaded(result, file.name);
    } else {
      setError(result.error || 'Failed to load file');
    }

    setIsLoading(false);
  }, [onFileLoaded]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFile(files[0]);
    }
  }, [handleFile]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  };

  return (
    <div className={cn('space-y-3', className)}>
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={cn(
          'relative border-2 border-dashed rounded-lg p-6 transition-all cursor-pointer',
          'hover:border-primary/50 hover:bg-primary/5',
          isDragging && 'border-primary bg-primary/10',
          error && 'border-destructive/50',
          currentFile && !error && 'border-geo-input/50 bg-geo-input/10'
        )}
      >
        <input
          type="file"
          accept=".geojson,.json,.csv,.wkt,.txt"
          onChange={handleInputChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />

        <div className="flex flex-col items-center gap-2 text-center">
          {isLoading ? (
            <>
              <div className="w-10 h-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
              <span className="text-sm text-muted-foreground">Processing...</span>
            </>
          ) : currentFile && !error ? (
            <>
              <div className="w-10 h-10 rounded-full bg-geo-input/20 flex items-center justify-center">
                <Check className="w-5 h-5 text-geo-input" />
              </div>
              <div className="flex items-center gap-2">
                <FileJson className="w-4 h-4 text-geo-input" />
                <span className="text-sm font-medium text-foreground">{currentFile}</span>
              </div>
              <span className="text-xs text-muted-foreground">Drop another file to replace</span>
            </>
          ) : error ? (
            <>
              <div className="w-10 h-10 rounded-full bg-destructive/20 flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-destructive" />
              </div>
              <span className="text-sm text-destructive">{error}</span>
              <span className="text-xs text-muted-foreground">Try another file</span>
            </>
          ) : (
            <>
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                <Upload className="w-5 h-5 text-muted-foreground" />
              </div>
              <div>
                <span className="text-sm font-medium text-foreground">Drop file here</span>
                <span className="text-sm text-muted-foreground"> or click to browse</span>
              </div>
              <span className="text-xs text-muted-foreground">
                GeoJSON, CSV, WKT supported
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
