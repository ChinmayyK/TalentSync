import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { SourcePerformanceRow } from '@/types/reports';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { TrendingUp } from 'lucide-react';

interface SourcePerformanceTableProps {
  data: SourcePerformanceRow[];
  isLoading?: boolean;
}

export function SourcePerformanceTable({ data, isLoading }: SourcePerformanceTableProps) {
  if (isLoading) {
    return (
      <div className="bg-card rounded-lg border border-border">
        <div className="p-4 border-b border-border">
          <Skeleton className="h-5 w-40" />
        </div>
        <div className="p-4 space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      </div>
    );
  }

  const maxConversion = Math.max(...data.map((d) => d.conversionRate));

  return (
    <div className="bg-card rounded-lg border border-border overflow-hidden">
      <div className="p-4 border-b border-border flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Source Performance</h3>
        <span className="text-xs text-muted-foreground">{data.length} sources</span>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="text-xs font-medium">Source</TableHead>
              <TableHead className="text-xs font-medium text-right">Candidates</TableHead>
              <TableHead className="text-xs font-medium text-right">Interviews</TableHead>
              <TableHead className="text-xs font-medium text-right">Offers</TableHead>
              <TableHead className="text-xs font-medium text-right">Acceptances</TableHead>
              <TableHead className="text-xs font-medium text-right">Conversion</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((row) => (
              <TableRow key={row.source} className="hover:bg-muted/50">
                <TableCell className="font-medium">{row.source}</TableCell>
                <TableCell className="text-right tabular-nums">{row.candidatesAdded}</TableCell>
                <TableCell className="text-right tabular-nums">{row.interviewsScheduled}</TableCell>
                <TableCell className="text-right tabular-nums">{row.offers}</TableCell>
                <TableCell className="text-right tabular-nums">{row.acceptances}</TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full"
                        style={{ width: `${(row.conversionRate / maxConversion) * 100}%` }}
                      />
                    </div>
                    <span className={cn(
                      "text-sm font-medium tabular-nums",
                      row.conversionRate === maxConversion && "text-primary"
                    )}>
                      {row.conversionRate.toFixed(1)}%
                    </span>
                    {row.conversionRate === maxConversion && (
                      <TrendingUp className="h-3.5 w-3.5 text-primary" />
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
