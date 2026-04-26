import { useState, useEffect } from 'react';
import { FieldMapping, IntegrationField } from '@/types/integrations';
import { getFieldSchemas } from '@/lib/api/integrations';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { ArrowRight, Plus, Trash2, HelpCircle, CheckCircle, AlertTriangle, Loader2, Wand2, Sparkles, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

interface FieldMappingPanelProps {
  integrationId: string;
  provider: string;
}

export function FieldMappingPanel({ integrationId, provider }: FieldMappingPanelProps) {
  const [mappings, setMappings] = useState<FieldMapping[]>([]);
  const [sourceFields, setSourceFields] = useState<IntegrationField[]>([]);
  const [targetFields, setTargetFields] = useState<IntegrationField[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<{ valid: boolean; errors: string[] } | null>(null);

  useEffect(() => {
    const loadFields = async () => {
      setIsLoading(true);
      try {
        const data = await getFieldSchemas(provider);
        setSourceFields(data.sourceFields || []);
        setTargetFields(data.targetFields || []);
        setMappings(data.mappings || []);
      } catch (err) {
        console.error('Failed to load field schemas:', err);
      } finally {
        setIsLoading(false);
      }
    };
    loadFields();
  }, [provider]);

  const handleAddMapping = () => {
    const newMapping: FieldMapping = {
      id: `map-${Date.now()}`,
      integrationId,
      sourceField: '',
      sourceType: '',
      targetField: '',
      targetType: '',
      required: false,
      validated: false,
    };
    setMappings([...mappings, newMapping]);
  };

  const handleRemoveMapping = (id: string) => {
    setMappings(mappings.filter((m) => m.id !== id));
  };

  const handleSourceChange = (mappingId: string, fieldName: string) => {
    const field = sourceFields.find((f) => f.name === fieldName);
    setMappings(mappings.map((m) =>
      m.id === mappingId
        ? { ...m, sourceField: fieldName, sourceType: field?.type || '', validated: false }
        : m
    ));
  };

  const handleTargetChange = (mappingId: string, fieldName: string) => {
    const field = targetFields.find((f) => f.name === fieldName);
    setMappings(mappings.map((m) =>
      m.id === mappingId
        ? { ...m, targetField: fieldName, targetType: field?.type || '', validated: false }
        : m
    ));
  };

  const handleTransformChange = (mappingId: string, transform: string) => {
    setMappings(mappings.map((m) =>
      m.id === mappingId ? { ...m, transform, validated: false } : m
    ));
  };

  const handleValidate = async () => {
    setIsValidating(true);
    setValidationResult(null);

    // Simulate validation
    await new Promise((resolve) => setTimeout(resolve, 1500));

    const errors: string[] = [];
    const requiredTargets = targetFields.filter((f) => f.required).map((f) => f.name);
    const mappedTargets = mappings.filter((m) => m.targetField).map((m) => m.targetField);

    requiredTargets.forEach((req) => {
      if (!mappedTargets.includes(req)) {
        const field = targetFields.find((f) => f.name === req);
        errors.push(`Required field "${field?.label}" is not mapped`);
      }
    });

    mappings.forEach((m) => {
      if (m.sourceType && m.targetType && m.sourceType !== m.targetType && !m.transform) {
        errors.push(`Type mismatch: ${m.sourceField} (${m.sourceType}) → ${m.targetField} (${m.targetType}). Add a transform rule.`);
      }
    });

    setValidationResult({ valid: errors.length === 0, errors });
    setMappings(mappings.map((m) => ({ ...m, validated: errors.length === 0 })));
    setIsValidating(false);

    if (errors.length === 0) {
      toast.success('Field mappings validated successfully');
    }
  };

  const handleAutoMap = () => {
    const autoMapped = sourceFields.map((source) => {
      const matchingTarget = targetFields.find(
        (t) => t.name.toLowerCase().replace(/_/g, '') === source.name.toLowerCase().replace(/_/g, '')
          || t.label.toLowerCase() === source.label.toLowerCase()
      );

      if (matchingTarget) {
        return {
          id: `map-auto-${source.name}`,
          integrationId,
          sourceField: source.name,
          sourceType: source.type,
          targetField: matchingTarget.name,
          targetType: matchingTarget.type,
          required: matchingTarget.required,
          validated: false,
        };
      }
      return null;
    }).filter(Boolean) as FieldMapping[];

    setMappings(autoMapped);
    toast.success(`Auto-mapped ${autoMapped.length} fields`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between pb-2">
        <div>
          <h3 className="font-semibold text-foreground text-lg">Field Mapping</h3>
          <p className="text-sm text-muted-foreground">Map source fields to target fields</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleAutoMap} className="hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 transition-colors">
            <Sparkles className="mr-2 h-3.5 w-3.5" />
            Auto-Map
          </Button>
          <Button size="sm" onClick={handleAddMapping}>
            <Plus className="mr-2 h-4 w-4" />
            Add Mapping
          </Button>
        </div>
      </div>

      <AnimatePresence>
        {validationResult && !validationResult.valid && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Mapping Issues</AlertTitle>
              <AlertDescription>
                <ul className="list-disc list-inside space-y-1 mt-1">
                  {validationResult.errors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          </motion.div>
        )}

        {validationResult?.valid && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <Alert className="mb-4 border-emerald-200 bg-emerald-50 text-emerald-800 dark:bg-emerald-900/20 dark:border-emerald-900">
              <CheckCircle className="h-4 w-4 text-emerald-600" />
              <AlertTitle>All Good!</AlertTitle>
              <AlertDescription>All field mappings are valid and ready for sync.</AlertDescription>
            </Alert>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-4">
        {/* Header */}
        <div className="grid grid-cols-[1fr,32px,1fr,120px,32px] gap-3 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          <span>Source Field</span>
          <span></span>
          <span>Target Field</span>
          <span>Transform</span>
          <span></span>
        </div>

        {/* Mappings */}
        <AnimatePresence initial={false}>
          {mappings.map((mapping) => (
            <motion.div
              key={mapping.id}
              layout
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={cn(
                "group grid grid-cols-[1fr,32px,1fr,120px,32px] gap-3 items-center p-3 rounded-xl border bg-card hover:shadow-sm transition-all",
                mapping.validated ? "border-emerald-200/50 bg-emerald-50/30 dark:bg-emerald-900/10" : "border-border/50"
              )}
            >
              <div>
                <Select value={mapping.sourceField} onValueChange={(v) => handleSourceChange(mapping.id, v)}>
                  <SelectTrigger className="h-10 border-transparent bg-muted/30 group-hover:bg-muted/50 focus:bg-background transition-colors">
                    <SelectValue placeholder="Select source..." />
                  </SelectTrigger>
                  <SelectContent>
                    {sourceFields.map((field) => (
                      <SelectItem key={field.name} value={field.name}>
                        <div className="flex items-center gap-2">
                          <span>{field.label}</span>
                          <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4 font-mono">{field.type}</Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-center">
                <ArrowRight className="h-4 w-4 text-muted-foreground/50" />
              </div>

              <div>
                <Select value={mapping.targetField} onValueChange={(v) => handleTargetChange(mapping.id, v)}>
                  <SelectTrigger className="h-10 border-transparent bg-muted/30 group-hover:bg-muted/50 focus:bg-background transition-colors">
                    <SelectValue placeholder="Select target..." />
                  </SelectTrigger>
                  <SelectContent>
                    {targetFields.map((field) => (
                      <SelectItem key={field.name} value={field.name}>
                        <div className="flex items-center gap-2">
                          <span>{field.label}</span>
                          {field.required && <span className="text-red-500 font-bold">*</span>}
                          <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4 font-mono">{field.type}</Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="relative">
                <Input
                  placeholder="None"
                  value={mapping.transform || ''}
                  onChange={(e) => handleTransformChange(mapping.id, e.target.value)}
                  className="h-10 text-sm pr-7 border-transparent bg-muted/30 group-hover:bg-muted/50 focus:bg-background transition-colors text-center font-mono"
                />
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/50 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p>Optional transform rule (e.g., UPPERCASE, DATE_FORMAT)</p>
                  </TooltipContent>
                </Tooltip>
              </div>

              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-red-50 dark:hover:bg-red-900/20 opacity-0 group-hover:opacity-100 transition-all rounded-lg"
                onClick={() => handleRemoveMapping(mapping.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </motion.div>
          ))}
        </AnimatePresence>

        {mappings.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed border-border/50 rounded-xl bg-muted/5"
          >
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
              <Wand2 className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium">No fields mapped yet</p>
            <p className="text-xs text-muted-foreground max-w-xs mt-1 mb-4">
              Map your data fields manually or let AI auto-discover matching fields.
            </p>
            <Button variant="secondary" size="sm" onClick={handleAutoMap}>
              <Sparkles className="mr-2 h-3.5 w-3.5" />
              Auto-Map Fields
            </Button>
          </motion.div>
        )}
      </div>

      <div className="flex justify-end gap-3 pt-6 border-t border-border mt-8">
        <Button variant="outline" onClick={handleValidate} disabled={isValidating}>
          {isValidating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Validating...
            </>
          ) : (
            <>
              <CheckCircle className="mr-2 h-4 w-4" />
              Validate Mappings
            </>
          )}
        </Button>
        <Button disabled={!validationResult?.valid}>
          Save Settings
        </Button>
      </div>
    </div>
  );
}
