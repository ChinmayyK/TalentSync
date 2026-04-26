'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Download, CalendarClock, CalendarIcon, FileText, FileSpreadsheet, ChevronDown } from 'lucide-react';
import { ReportFilters } from '@/types/reports';
import { recruiters, stages, sources, roles } from '@/lib/reports-mock-data';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { DateRange } from 'react-day-picker';
import { toast } from 'sonner';
import { exportReportCsv, exportReportPdf, ReportType } from '@/lib/api/reports';
import { ScheduleReportModal } from './ScheduleReportModal';

interface ReportsHeaderProps {
  filters: ReportFilters;
  onFiltersChange: (filters: ReportFilters) => void;
}

export function ReportsHeader({ filters, onFiltersChange }: ReportsHeaderProps) {
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [isExporting, setIsExporting] = useState(false);
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);

  const handleExportCsv = async (reportType: ReportType) => {
    console.log('[ReportsHeader] handleExportCsv called for:', reportType);
    setIsExporting(true);
    toast.loading('Exporting CSV...', { id: 'export' });
    try {
      await exportReportCsv(reportType);
      toast.success('CSV exported successfully', { id: 'export' });
    } catch (error: any) {
      console.error('[ReportsHeader] Export CSV error:', error);
      toast.error(error?.message || 'Failed to export CSV', { id: 'export' });
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportPdf = async (reportType: ReportType) => {
    setIsExporting(true);
    toast.loading('Generating PDF...', { id: 'export' });
    try {
      await exportReportPdf(reportType);
      toast.success('PDF generated - use browser print dialog to save', { id: 'export' });
    } catch (error) {
      toast.error('Failed to generate PDF', { id: 'export' });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <>
      <div className="space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-foreground tracking-tight">Reports & Analytics</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Track hiring performance and insights</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setScheduleModalOpen(true)}>
              <CalendarClock className="mr-2 h-4 w-4" />
              Schedule Report
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" disabled={isExporting}>
                  <Download className="mr-2 h-4 w-4" />
                  Export
                  <ChevronDown className="ml-1 h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem onClick={() => handleExportCsv('overview')}>
                  <FileSpreadsheet className="mr-2 h-4 w-4 text-green-600" />
                  Export Overview as CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExportCsv('funnel')}>
                  <FileSpreadsheet className="mr-2 h-4 w-4 text-green-600" />
                  Export Funnel as CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExportCsv('time-to-hire')}>
                  <FileSpreadsheet className="mr-2 h-4 w-4 text-green-600" />
                  Export Time to Hire as CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExportPdf('overview')}>
                  <FileText className="mr-2 h-4 w-4 text-red-600" />
                  Export Overview as PDF
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExportPdf('funnel')}>
                  <FileText className="mr-2 h-4 w-4 text-red-600" />
                  Export Funnel as PDF
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 p-4 bg-card rounded-lg border border-border">
          {/* Date Range */}
          <div className="col-span-2 sm:w-auto">
            <Select
              value={filters.dateRange}
              onValueChange={(value) => onFiltersChange({ ...filters, dateRange: value as ReportFilters['dateRange'] })}
            >
              <SelectTrigger className="w-full sm:w-[140px] h-9 text-sm">
                <SelectValue placeholder="Date range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="7days">Last 7 days</SelectItem>
                <SelectItem value="30days">Last 30 days</SelectItem>
                <SelectItem value="90days">Last 90 days</SelectItem>
                <SelectItem value="custom">Custom range</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {filters.dateRange === 'custom' && (
            <div className="col-span-2 sm:w-auto">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className={cn(
                      'w-full sm:w-auto justify-start text-left font-normal',
                      !dateRange && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange?.from ? (
                      dateRange.to ? (
                        <>
                          {format(dateRange.from, 'LLL dd')} - {format(dateRange.to, 'LLL dd')}
                        </>
                      ) : (
                        format(dateRange.from, 'LLL dd, y')
                      )
                    ) : (
                      <span>Pick dates</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={dateRange?.from}
                    selected={dateRange}
                    onSelect={setDateRange}
                    numberOfMonths={2}
                  />
                </PopoverContent>
              </Popover>
            </div>
          )}

          <div className="h-6 w-px bg-border hidden sm:block" />

          {/* Recruiter */}
          <Select
            value={filters.recruiterId || 'all'}
            onValueChange={(value) => onFiltersChange({ ...filters, recruiterId: value === 'all' ? undefined : value })}
          >
            <SelectTrigger className="w-full sm:w-[150px] h-9 text-sm">
              <SelectValue placeholder="Recruiter" />
            </SelectTrigger>
            <SelectContent>
              {recruiters.map((r) => (
                <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Stage */}
          <Select
            value={filters.stage || 'all'}
            onValueChange={(value) => onFiltersChange({ ...filters, stage: value === 'all' ? undefined : value })}
          >
            <SelectTrigger className="w-full sm:w-[130px] h-9 text-sm">
              <SelectValue placeholder="Stage" />
            </SelectTrigger>
            <SelectContent>
              {stages.map((s) => (
                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Source */}
          <Select
            value={filters.source || 'all'}
            onValueChange={(value) => onFiltersChange({ ...filters, source: value === 'all' ? undefined : value })}
          >
            <SelectTrigger className="w-full sm:w-[130px] h-9 text-sm">
              <SelectValue placeholder="Source" />
            </SelectTrigger>
            <SelectContent>
              {sources.map((s) => (
                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Role */}
          <Select
            value={filters.role || 'all'}
            onValueChange={(value) => onFiltersChange({ ...filters, role: value === 'all' ? undefined : value })}
          >
            <SelectTrigger className="w-full sm:w-[160px] h-9 text-sm">
              <SelectValue placeholder="Role" />
            </SelectTrigger>
            <SelectContent>
              {roles.map((r) => (
                <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <ScheduleReportModal
        open={scheduleModalOpen}
        onOpenChange={setScheduleModalOpen}
      />
    </>
  );
}
