import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, Filter } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface IntegrationsHeaderProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  statusFilter: string;
  onStatusFilterChange: (status: string) => void;
  categoryFilter: string;
  onCategoryFilterChange: (category: string) => void;
  onAddNew: () => void;
}

export function IntegrationsHeader({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  categoryFilter,
  onCategoryFilterChange,
  onAddNew,
}: IntegrationsHeaderProps) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between pb-2">
        <div className="space-y-1">
          <h1 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight">Integrations</h1>
          <p className="text-muted-foreground text-base max-w-xl leading-relaxed">
            Supercharge your workflow by connecting your favorite tools.
            Sync data effortlessly across your entire stack.
          </p>
        </div>
        <Button size="lg" onClick={onAddNew} className="w-full sm:w-auto shadow-md hover:shadow-lg transition-all bg-foreground text-background hover:bg-foreground/90">
          <Plus className="mr-2 h-5 w-5" />
          Add Integration
        </Button>
      </div>

      <div className="space-y-4">
        <Tabs value={categoryFilter} onValueChange={onCategoryFilterChange} className="w-full">
          <TabsList className="bg-transparent p-0 w-full justify-start overflow-x-auto h-auto gap-2 scrollbar-none">
            <TabsTrigger value="all" className="rounded-full px-4 py-2 border border-border/50 bg-background data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:border-primary/20 hover:bg-muted/50 transition-all shadow-sm">All Apps</TabsTrigger>
            <TabsTrigger value="crm" className="rounded-full px-4 py-2 border border-border/50 bg-background data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 data-[state=active]:border-blue-200 hover:bg-muted/50 transition-all shadow-sm">CRM</TabsTrigger>
            <TabsTrigger value="ats" className="rounded-full px-4 py-2 border border-border/50 bg-background data-[state=active]:bg-emerald-50 data-[state=active]:text-emerald-700 data-[state=active]:border-emerald-200 hover:bg-muted/50 transition-all shadow-sm">ATS</TabsTrigger>
            <TabsTrigger value="hris" className="rounded-full px-4 py-2 border border-border/50 bg-background data-[state=active]:bg-orange-50 data-[state=active]:text-orange-700 data-[state=active]:border-orange-200 hover:bg-muted/50 transition-all shadow-sm">HRIS</TabsTrigger>
            <TabsTrigger value="calendar" className="rounded-full px-4 py-2 border border-border/50 bg-background data-[state=active]:bg-violet-50 data-[state=active]:text-violet-700 data-[state=active]:border-violet-200 hover:bg-muted/50 transition-all shadow-sm">Calendar</TabsTrigger>
            <TabsTrigger value="hcm" className="rounded-full px-4 py-2 border border-border/50 bg-background data-[state=active]:bg-pink-50 data-[state=active]:text-pink-700 data-[state=active]:border-pink-200 hover:bg-muted/50 transition-all shadow-sm">HCM</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex flex-col sm:flex-row items-center gap-3 p-1">
          <div className="relative w-full sm:flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search integrations..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-9 h-10 w-full bg-background"
            />
          </div>

          <Select value={statusFilter} onValueChange={onStatusFilterChange}>
            <SelectTrigger className="w-full sm:w-[180px] h-10 bg-background">
              <Filter className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="connected">Connected</SelectItem>
              <SelectItem value="disconnected">Disconnected</SelectItem>
              <SelectItem value="error">Error</SelectItem>
              <SelectItem value="pending_auth">Pending Auth</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}

