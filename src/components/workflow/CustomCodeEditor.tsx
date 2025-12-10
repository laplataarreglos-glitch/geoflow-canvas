import { useState } from 'react';
import { Play, AlertCircle, Check, Code2, FileCode } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface CustomCodeEditorProps {
  code: string;
  language: 'javascript' | 'python-like';
  onCodeChange: (code: string) => void;
  onLanguageChange: (language: 'javascript' | 'python-like') => void;
  onTest?: () => void;
  error?: string | null;
  isValid?: boolean;
}

const JAVASCRIPT_TEMPLATE = `// Transform features using turf.js
// Available: features (array), turf (library), input (FeatureCollection)

// Example: Buffer all features by 100 meters
const result = features.map(f => turf.buffer(f, 100, { units: 'meters' }));

return { type: 'FeatureCollection', features: result };`;

const PYTHON_TEMPLATE = `# Python-like syntax (transpiled to JS)
# Available: features, turf, input

# Example: Filter features with area > 1000
filtered = []
for f in features:
    area = turf.area(f)
    if area > 1000:
        filtered.append(f)

return filtered`;

export const CustomCodeEditor = ({
  code,
  language,
  onCodeChange,
  onLanguageChange,
  onTest,
  error,
  isValid,
}: CustomCodeEditorProps) => {
  const handleInsertTemplate = () => {
    onCodeChange(language === 'javascript' ? JAVASCRIPT_TEMPLATE : PYTHON_TEMPLATE);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1">
          <Label className="text-xs text-muted-foreground mb-1 block">Language</Label>
          <Select value={language} onValueChange={(v) => onLanguageChange(v as 'javascript' | 'python-like')}>
            <SelectTrigger className="h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="javascript">
                <div className="flex items-center gap-2">
                  <Code2 className="w-4 h-4" />
                  JavaScript
                </div>
              </SelectItem>
              <SelectItem value="python-like">
                <div className="flex items-center gap-2">
                  <FileCode className="w-4 h-4" />
                  Python-like
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleInsertTemplate}
          className="h-8 text-xs"
        >
          Insert Template
        </Button>
      </div>

      <div className="relative">
        <Textarea
          value={code}
          onChange={(e) => onCodeChange(e.target.value)}
          placeholder={language === 'javascript' ? '// Write your JavaScript code...' : '# Write your Python-like code...'}
          className={cn(
            'min-h-[200px] font-mono text-xs resize-none',
            'bg-background/50 border-border',
            error && 'border-destructive/50',
            isValid && 'border-geo-input/50'
          )}
          spellCheck={false}
        />

        {(error || isValid) && (
          <div className={cn(
            'absolute bottom-2 right-2 flex items-center gap-1 px-2 py-1 rounded text-xs',
            error ? 'bg-destructive/20 text-destructive' : 'bg-geo-input/20 text-geo-input'
          )}>
            {error ? (
              <>
                <AlertCircle className="w-3 h-3" />
                Error
              </>
            ) : (
              <>
                <Check className="w-3 h-3" />
                Valid
              </>
            )}
          </div>
        )}
      </div>

      {error && (
        <div className="p-2 rounded bg-destructive/10 border border-destructive/30">
          <p className="text-xs text-destructive font-mono">{error}</p>
        </div>
      )}

      <div className="text-xs text-muted-foreground space-y-1">
        <p className="font-medium">Available variables:</p>
        <ul className="list-disc list-inside pl-2 space-y-0.5">
          <li><code className="text-primary">features</code> - Array of GeoJSON features</li>
          <li><code className="text-primary">turf</code> - Turf.js library for spatial operations</li>
          <li><code className="text-primary">input</code> - Full FeatureCollection</li>
        </ul>
      </div>

      {onTest && (
        <Button onClick={onTest} className="w-full gap-2" size="sm">
          <Play className="w-4 h-4" />
          Test Code
        </Button>
      )}
    </div>
  );
};
