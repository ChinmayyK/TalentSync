import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { StageDurationData } from '@/types/reports';
import { Skeleton } from '@/components/ui/skeleton';

interface StageDurationChartProps {
  data: StageDurationData[];
  isLoading?: boolean;
}

export function StageDurationChart({ data, isLoading }: StageDurationChartProps) {
  if (isLoading) {
    return (
      <div className="bg-card rounded-lg border border-border p-4 sm:p-6">
        <Skeleton className="h-5 w-36 mb-4" />
        <Skeleton className="h-[200px] sm:h-[250px] w-full" />
      </div>
    );
  }

  // Truncate long stage names for mobile
  const chartData = data.map(item => ({
    ...item,
    displayStage: item.stage.length > 12
      ? item.stage.slice(0, 12) + '...'
      : item.stage
  }));

  return (
    <div className="bg-card rounded-lg border border-border p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-4">
        <h3 className="text-sm font-semibold text-foreground">Stage Duration</h3>
        <span className="text-xs text-muted-foreground">Avg days per stage</span>
      </div>

      <div className="h-[200px] sm:h-[250px] -mx-2 sm:mx-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={true} vertical={false} />
            <XAxis
              type="number"
              tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
              tickLine={false}
              axisLine={{ stroke: 'hsl(var(--border))' }}
            />
            <YAxis
              dataKey="displayStage"
              type="category"
              tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
              tickLine={false}
              axisLine={{ stroke: 'hsl(var(--border))' }}
              width={70}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                fontSize: '12px',
              }}
              labelFormatter={(label) => {
                const item = data.find(d => d.stage.startsWith(String(label).replace('...', '')));
                return item?.stage || label;
              }}
              formatter={(value: number) => [`${value} days`, 'Avg Duration']}
            />
            <Bar
              dataKey="avgDays"
              fill="hsl(var(--primary))"
              radius={[0, 4, 4, 0]}
              maxBarSize={20}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
