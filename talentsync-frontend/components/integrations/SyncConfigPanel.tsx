import { useState } from 'react';
import { Integration } from '@/types/integrations';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { HelpCircle, Loader2, Download, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import * as integrationsApi from '@/lib/api/integrations';

interface SyncConfigPanelProps {
  integration: Integration;
  onSave: (config: Integration['config']) => void;
}

type ImportMode = 'manual' | 'scheduled';
type ImportFrequency = 'hourly' | 'daily';

export function SyncConfigPanel({ integration, onSave }: SyncConfigPanelProps) {
  const [config, setConfig] = useState({
    // Import scope (which CRM records to import)
    zohoModule: (integration.config?.zohoModule || 'leads') as 'leads' | 'contacts' | 'both',
    salesforceModule: (integration.config?.salesforceModule || 'all') as 'leads' | 'contacts' | 'all',
    // Import mode
    importMode: (integration.config?.importMode || 'manual') as ImportMode,
    importFrequency: (integration.config?.importFrequency || 'daily') as ImportFrequency,
    // Optional: Send interview events back to CRM (activity notes only)
    sendInterviewEvents: integration.config?.sendInterviewEvents || false,
  });
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await integrationsApi.updateConfig(integration.provider, config);
      onSave(config);
      toast.success('Import settings saved');
    } catch (error) {
      toast.error('Failed to save settings');
      console.error('Save config failed:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const isZoho = integration.provider === 'zoho';
  const isSalesforce = integration.provider === 'salesforce';
  const isHubspot = integration.provider === 'hubspot';
  const isWorkday = integration.provider === 'workday';
  const isLever = integration.provider === 'lever';
  const isGreenhouse = integration.provider === 'greenhouse';
  const isBambooHR = integration.provider === 'bamboohr';
  const isCRM = isZoho || isSalesforce || isHubspot || isWorkday || isLever || isGreenhouse;
  const isHRIS = isBambooHR;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-semibold text-foreground">Import Settings</h3>
        <p className="text-sm text-muted-foreground">Configure how candidates are imported from your CRM</p>
      </div>

      {/* Import Candidates From - Zoho */}
      {isZoho && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Label>Import Candidates From</Label>
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p>Select which CRM records should be imported into TalentSync as candidates.</p>
              </TooltipContent>
            </Tooltip>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <button
              onClick={() => setConfig({ ...config, zohoModule: 'leads' })}
              className={`p-4 rounded-lg border text-left transition-all ${config.zohoModule === 'leads'
                ? 'border-primary bg-primary/5 text-primary'
                : 'border-border hover:border-primary/50'
                }`}
            >
              <span className="text-base font-semibold block">Leads</span>
              <span className="text-xs text-muted-foreground">Prospects & applicants</span>
            </button>
            <button
              onClick={() => setConfig({ ...config, zohoModule: 'contacts' })}
              className={`p-4 rounded-lg border text-left transition-all ${config.zohoModule === 'contacts'
                ? 'border-primary bg-primary/5 text-primary'
                : 'border-border hover:border-primary/50'
                }`}
            >
              <span className="text-base font-semibold block">Contacts</span>
              <span className="text-xs text-muted-foreground">Existing people</span>
            </button>
            <button
              onClick={() => setConfig({ ...config, zohoModule: 'both' })}
              className={`p-4 rounded-lg border text-left transition-all ${config.zohoModule === 'both'
                ? 'border-primary bg-primary/5 text-primary'
                : 'border-border hover:border-primary/50'
                }`}
            >
              <span className="text-base font-semibold block">Leads + Contacts</span>
              <span className="text-xs text-muted-foreground">Import all</span>
            </button>
          </div>
        </div>
      )}

      {/* Import Candidates From - Salesforce */}
      {isSalesforce && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Label>Import Candidates From</Label>
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p>Select which Salesforce objects should be imported into TalentSync as candidates.</p>
              </TooltipContent>
            </Tooltip>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <button
              onClick={() => setConfig({ ...config, salesforceModule: 'leads' })}
              className={`p-4 rounded-lg border text-left transition-all ${config.salesforceModule === 'leads'
                ? 'border-primary bg-primary/5 text-primary'
                : 'border-border hover:border-primary/50'
                }`}
            >
              <span className="text-base font-semibold block">Leads</span>
              <span className="text-xs text-muted-foreground">Prospects & applicants</span>
            </button>
            <button
              onClick={() => setConfig({ ...config, salesforceModule: 'contacts' })}
              className={`p-4 rounded-lg border text-left transition-all ${config.salesforceModule === 'contacts'
                ? 'border-primary bg-primary/5 text-primary'
                : 'border-border hover:border-primary/50'
                }`}
            >
              <span className="text-base font-semibold block">Contacts</span>
              <span className="text-xs text-muted-foreground">Existing people</span>
            </button>
            <button
              onClick={() => setConfig({ ...config, salesforceModule: 'all' })}
              className={`p-4 rounded-lg border text-left transition-all ${config.salesforceModule === 'all'
                ? 'border-primary bg-primary/5 text-primary'
                : 'border-border hover:border-primary/50'
                }`}
            >
              <span className="text-base font-semibold block">Leads + Contacts</span>
              <span className="text-xs text-muted-foreground">Import all</span>
            </button>
          </div>
        </div>
      )}

      {/* Import Candidates From - HubSpot (Contacts only) */}
      {isHubspot && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Label>Import Candidates From</Label>
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p>HubSpot Contacts will be imported into TalentSync as candidates.</p>
              </TooltipContent>
            </Tooltip>
          </div>
          <div className="p-4 rounded-lg border border-primary bg-primary/5 text-primary">
            <span className="text-base font-semibold block">Contacts</span>
            <span className="text-xs text-muted-foreground">HubSpot contacts become candidates in TalentSync</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Note: HubSpot uses Contacts as the primary people object. All contacts are imported.
          </p>
        </div>
      )}

      {/* Import Candidates From - Workday */}
      {isWorkday && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Label>Import Candidates From</Label>
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p>Workday Applicants are imported as candidates. Requisitions are stored as hiring context.</p>
              </TooltipContent>
            </Tooltip>
          </div>
          <div className="p-4 rounded-lg border border-primary bg-primary/5 text-primary">
            <span className="text-base font-semibold block">Applicants</span>
            <span className="text-xs text-muted-foreground">Workday applicants become candidates in TalentSync</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Job Requisitions are imported as read-only hiring context, not as candidates.
          </p>
        </div>
      )}

      {/* Import Candidates From - Lever */}
      {isLever && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Label>Import Candidates From</Label>
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p>Lever Candidates are imported. Job Postings are stored as hiring context.</p>
              </TooltipContent>
            </Tooltip>
          </div>
          <div className="p-4 rounded-lg border border-primary bg-primary/5 text-primary">
            <span className="text-base font-semibold block">Candidates</span>
            <span className="text-xs text-muted-foreground">Lever candidates become candidates in TalentSync</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Job Postings are imported as read-only hiring context. Interview events can optionally be posted back to Lever.
          </p>
        </div>
      )}

      {/* Import Candidates From - Greenhouse */}
      {isGreenhouse && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Label>Import Candidates From</Label>
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p>Greenhouse Candidates are imported. Job Requisitions are stored as hiring context. Historical feedback is imported as read-only reference.</p>
              </TooltipContent>
            </Tooltip>
          </div>
          <div className="p-4 rounded-lg border border-primary bg-primary/5 text-primary">
            <span className="text-base font-semibold block">Candidates</span>
            <span className="text-xs text-muted-foreground">Greenhouse candidates become candidates in TalentSync</span>
          </div>
          <div className="p-4 rounded-lg border border-muted bg-muted/20">
            <span className="text-base font-semibold block">Historical Feedback</span>
            <span className="text-xs text-muted-foreground">Greenhouse interview scorecards imported as read-only reference</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Job Requisitions and interview feedback are imported as read-only context. TalentSync feedback remains primary.
          </p>
        </div>
      )}

      {/* BambooHR Employee Creation Settings */}
      {isHRIS && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Label>Employee Handoff</Label>
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p>When a candidate is hired, TalentSync creates an employee record in BambooHR. This is a one-way handoff.</p>
              </TooltipContent>
            </Tooltip>
          </div>

          <div className="p-4 rounded-lg border border-primary bg-primary/5 text-primary">
            <span className="text-base font-semibold block">Create Employee on Hire</span>
            <span className="text-xs text-muted-foreground">When a candidate is marked as hired, an employee record is created in BambooHR</span>
          </div>

          <div className="p-3 rounded-lg border border-muted bg-muted/20">
            <span className="text-sm font-medium block text-muted-foreground">Triggers:</span>
            <ul className="text-xs text-muted-foreground mt-1 space-y-1">
              <li>• Offer Accepted</li>
              <li>• Mark as Hired (manual)</li>
            </ul>
          </div>

          <p className="text-xs text-muted-foreground">
            Employee records are created once. BambooHR manages employees after handoff.
          </p>
        </div>
      )}

      {/* Import Mode */}
      {isCRM && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Label>Import Mode</Label>
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p>Controls how often TalentSync pulls candidate data from your CRM.</p>
              </TooltipContent>
            </Tooltip>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setConfig({ ...config, importMode: 'manual' })}
              className={`p-4 rounded-lg border text-left transition-all ${config.importMode === 'manual'
                ? 'border-primary bg-primary/5 text-primary'
                : 'border-border hover:border-primary/50'
                }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <Download className="h-4 w-4" />
                <span className="text-base font-semibold">Manual Import</span>
              </div>
              <span className="text-xs text-muted-foreground">Import when you click "Sync Now"</span>
            </button>
            <button
              onClick={() => setConfig({ ...config, importMode: 'scheduled' })}
              className={`p-4 rounded-lg border text-left transition-all ${config.importMode === 'scheduled'
                ? 'border-primary bg-primary/5 text-primary'
                : 'border-border hover:border-primary/50'
                }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <Calendar className="h-4 w-4" />
                <span className="text-base font-semibold">Scheduled Import</span>
              </div>
              <span className="text-xs text-muted-foreground">Automatically import on a schedule</span>
            </button>
          </div>
        </div>
      )}

      {/* Import Frequency - only shown when scheduled */}
      {isCRM && config.importMode === 'scheduled' && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Label>Import Frequency</Label>
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p>How often to automatically import new candidates from your CRM.</p>
              </TooltipContent>
            </Tooltip>
          </div>
          <Select
            value={config.importFrequency}
            onValueChange={(v) => setConfig({ ...config, importFrequency: v as ImportFrequency })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="hourly">Every hour</SelectItem>
              <SelectItem value="daily">Once daily</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Optional: Interview Events (separate section) */}
      {isCRM && (
        <div className="space-y-3 pt-4 border-t border-border">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <Label>Send Interview Updates to CRM</Label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p>Optionally send interview events (scheduled, completed) back to the CRM as activity notes. Candidate records are never modified.</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <p className="text-xs text-muted-foreground">
                Posts interview events as notes — does not modify candidate data
              </p>
            </div>
            <Switch
              checked={config.sendInterviewEvents}
              onCheckedChange={(checked) => setConfig({ ...config, sendInterviewEvents: checked })}
            />
          </div>
        </div>
      )}

      <div className="flex justify-end pt-4 border-t border-border">
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            'Save Settings'
          )}
        </Button>
      </div>
    </div>
  );
}
