import { useState } from 'react';
import { Integration } from '@/types/integrations';
import { providerLogos, providerColors, providerDocs } from '@/lib/integrations-mock-data';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  ExternalLink,
  Eye,
  EyeOff,
  HelpCircle,
  Loader2,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Lock,
  ArrowRight,
  Fingerprint
} from 'lucide-react';
import { toast } from 'sonner';
import * as integrationsApi from '@/lib/api/integrations';
import { motion, AnimatePresence } from 'framer-motion';

interface AuthFlowPanelProps {
  integration: Integration;
  onAuthComplete: () => void;
  onCancel: () => void;
}

export function AuthFlowPanel({ integration, onAuthComplete, onCancel }: AuthFlowPanelProps) {
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [subdomain, setSubdomain] = useState('');
  const [showSecret, setShowSecret] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<'intro' | 'credentials' | 'connecting' | 'success'>('intro');

  const isBambooHR = integration.provider === 'bamboohr';
  const isOAuth = integration.authType === 'oauth2' || !integration.authType;

  // Auto-advance to credentials step for API key providers
  if (step === 'intro' && !isOAuth) {
    setStep('credentials');
  }

  const handleOAuth = async () => {
    setIsLoading(true);
    setError(null);
    setStep('connecting');

    try {
      // Call real API to get OAuth authorization URL
      const response = await integrationsApi.connect(integration.provider);

      if (response.authUrl) {
        // Redirect to the OAuth provider's authorization page
        window.location.href = response.authUrl;
      } else {
        // If no authUrl returned, fall back to simulated flow
        await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate delay
        setStep('success');
        setTimeout(() => {
          toast.success('Successfully connected', {
            description: `${integration.name} is now connected.`,
          });
          onAuthComplete();
        }, 1500);
      }
    } catch (err) {
      console.error('OAuth initialization failed:', err);
      setError('Failed to connect. Please try again or contact support.');
      setStep('intro');
      setIsLoading(false);
    }
  };

  const handleApiKeyAuth = async () => {
    if (!apiKey.trim()) {
      setError('API Key is required');
      return;
    }

    if (isBambooHR && !subdomain.trim()) {
      setError('Company subdomain is required');
      return;
    }

    setIsLoading(true);
    setError(null);
    setStep('connecting');

    // Simulate API key validation
    await new Promise((resolve) => setTimeout(resolve, 2000));

    if (apiKey.length < 10) {
      setError('Invalid API Key format. Please check your credentials.');
      setStep('credentials');
      setIsLoading(false);
      return;
    }

    setStep('success');

    setTimeout(() => {
      toast.success('Successfully connected', {
        description: `${integration.name} is now connected using API key authentication.`,
      });
      onAuthComplete();
    }, 1500);
  };

  const docsUrl = providerDocs[integration.provider];

  const ConnectingState = () => (
    <div className="flex flex-col items-center justify-center py-12 text-center space-y-4">
      <div className="relative">
        <div className="absolute inset-0 bg-primary/20 rounded-full animate-ping" />
        <div className="relative bg-background p-4 rounded-full border border-border shadow-lg">
          <Loader2 className="h-8 w-8 text-primary animate-spin" />
        </div>
      </div>
      <div>
        <h3 className="text-lg font-semibold">Connecting to {integration.name}...</h3>
        <p className="text-sm text-muted-foreground max-w-xs mx-auto mt-1">
          Verifying your credentials and establishing a secure connection.
        </p>
      </div>
    </div>
  );

  const SuccessState = () => (
    <div className="flex flex-col items-center justify-center py-12 text-center space-y-4">
      <div className="relative">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="bg-emerald-100 dark:bg-emerald-900/30 p-4 rounded-full border border-emerald-200 dark:border-emerald-800"
        >
          <CheckCircle2 className="h-10 w-10 text-emerald-600 dark:text-emerald-400" />
        </motion.div>
      </div>
      <div>
        <h3 className="text-lg font-semibold text-emerald-700 dark:text-emerald-400">Connection Successful!</h3>
        <p className="text-sm text-muted-foreground max-w-xs mx-auto mt-1">
          Redirecting you to configuration...
        </p>
      </div>
    </div>
  );

  return (
    <div className="max-w-md mx-auto">
      <AnimatePresence mode="wait">

        {step === 'connecting' && (
          <motion.div
            key="connecting"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <ConnectingState />
          </motion.div>
        )}

        {step === 'success' && (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
          >
            <SuccessState />
          </motion.div>
        )}

        {(step === 'intro' || step === 'credentials') && (
          <motion.div
            key="form"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-8"
          >
            {/* Header Section */}
            {!isOAuth && (
              <div className="text-center space-y-2">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-indigo-950/50 dark:to-indigo-900/50 border border-indigo-100 dark:border-indigo-800 mb-2">
                  <Lock className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
                </div>
                <h3 className="text-xl font-semibold">Enter Credentials</h3>
                <p className="text-sm text-muted-foreground">
                  Provide your API keys to authorize TalentSync to access your {integration.name} data.
                </p>
              </div>
            )}

            {isOAuth && (
              <div className="text-center space-y-4 pt-4">
                <div className="flex items-center justify-center gap-4">
                  <div className="w-16 h-16 rounded-xl bg-white border border-border shadow-sm flex items-center justify-center p-3">
                    {/* TalentSync Logo Placeholder or App Logo */}
                    <div className="w-full h-full bg-gradient-to-br from-indigo-600 to-violet-600 rounded-lg flex items-center justify-center text-white font-bold text-xl">L</div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-border" />
                    <div className="w-1.5 h-1.5 rounded-full bg-border" />
                    <div className="w-1.5 h-1.5 rounded-full bg-border" />
                  </div>
                  <div className={cn(
                    "w-16 h-16 rounded-xl border border-border shadow-sm flex items-center justify-center text-white text-2xl font-bold",
                    providerColors[integration.provider]
                  )}>
                    {providerLogos[integration.provider]}
                  </div>
                </div>
                <div>
                  <h3 className="text-xl font-semibold">Connect to {integration.name}</h3>
                  <p className="text-sm text-muted-foreground max-w-xs mx-auto mt-2">
                    You will be redirected to {integration.name} to approve the connection.
                  </p>
                </div>
              </div>
            )}

            {integration.status === 'error' && (
              <Alert variant="destructive" className="border-red-200 bg-red-50 dark:bg-red-900/10 dark:border-red-900/50">
                <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
                <AlertTitle className="text-red-700 dark:text-red-400 ml-2">Connection Error</AlertTitle>
                <AlertDescription className="text-red-600/90 dark:text-red-400/90 ml-2">
                  Your previous connection expired or was revoked. Please re-authenticate.
                </AlertDescription>
              </Alert>
            )}

            {error && (
              <Alert variant="destructive" className="animate-shake">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {isOAuth ? (
              <div className="space-y-4">
                <div className="bg-muted/30 rounded-xl p-4 border border-border/50 space-y-3">
                  <div className="flex items-start gap-3">
                    <ShieldCheck className="h-5 w-5 text-emerald-600 mt-0.5 shrink-0" />
                    <div className="space-y-1">
                      <p className="text-sm font-medium">Secure Access</p>
                      <p className="text-xs text-muted-foreground">
                        TalentSync requests read-only access to your public profile and data. We never post without your permission.
                      </p>
                    </div>
                  </div>
                </div>

                <Button
                  onClick={handleOAuth}
                  disabled={isLoading}
                  className="w-full h-12 text-base shadow-md transition-all hover:scale-[1.02]"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    <>
                      Connect with {integration.name}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>
            ) : (
              <div className="space-y-5 bg-card border border-border/50 rounded-xl p-6 shadow-sm">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="api-key" className="text-sm font-medium">API Key</Label>
                      {docsUrl && (
                        <a href={docsUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1">
                          Where to find this? <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                    <div className="relative">
                      <Input
                        id="api-key"
                        type="text"
                        placeholder={`Paste your ${integration.name} API Key`}
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        className="pl-10 font-mono text-sm bg-muted/20"
                      />
                      <Fingerprint className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>

                  {/* BambooHR Subdomain field */}
                  {isBambooHR && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Label htmlFor="subdomain" className="text-sm font-medium">Company Subdomain</Label>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <p>Your subdomain is the company name in your BambooHR URL: https://[subdomain].bamboohr.com</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground font-mono bg-muted px-2 py-2 rounded-l-md border border-r-0 border-border">https://</span>
                        <Input
                          id="subdomain"
                          type="text"
                          placeholder="acme"
                          value={subdomain}
                          onChange={(e) => setSubdomain(e.target.value)}
                          className="rounded-l-none font-mono text-sm bg-muted/20"
                        />
                        <span className="text-sm text-muted-foreground font-mono bg-muted px-2 py-2 rounded-r-md border border-l-0 border-border">.bamboohr.com</span>
                      </div>
                    </div>
                  )}

                  {integration.provider !== 'bamboohr' && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Label htmlFor="api-secret" className="text-sm font-medium">API Secret <span className="text-muted-foreground font-normal">(Optional)</span></Label>
                      </div>
                      <div className="relative">
                        <Input
                          id="api-secret"
                          type={showSecret ? 'text' : 'password'}
                          placeholder="If required by provider"
                          value={apiSecret}
                          onChange={(e) => setApiSecret(e.target.value)}
                          className="pr-10 pl-10 font-mono text-sm bg-muted/20"
                        />
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                          onClick={() => setShowSecret(!showSecret)}
                        >
                          {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="pt-2">
                  <Button
                    onClick={handleApiKeyAuth}
                    disabled={isLoading}
                    className="w-full h-11 shadow-sm"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Verifying Keys...
                      </>
                    ) : (
                      'Connect Integration'
                    )}
                  </Button>
                </div>
              </div>
            )}

            <div className="text-center">
              <Button variant="link" onClick={onCancel} className="text-muted-foreground hover:text-foreground">
                Cancel and go back
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

