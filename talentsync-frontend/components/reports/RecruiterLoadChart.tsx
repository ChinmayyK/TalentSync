import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { RecruiterLoadData } from '@/types/reports';
import { Skeleton } from '@/components/ui/skeleton';

interface RecruiterLoadChartProps {
  data: RecruiterLoadData[];
  isLoading?: boolean;
}

export function RecruiterLoadChart({ data, isLoading }: RecruiterLoadChartProps) {
  if (isLoading) {
    return (
      <div className="bg-card rounded-lg border border-border p-4 sm:p-6">
        <Skeleton className="h-5 w-44 mb-4" />
        <Skeleton className="h-[200px] sm:h-[250px] w-full" />
      </div>
    );
  }

  // Truncate long names for mobile
  const chartData = data.map(item => ({
    ...item,
    displayName: item.recruiter.length > 10
      ? item.recruiter.slice(0, 10) + '...'
      : item.recruiter
  }));

  return (
    <div className="bg-card rounded-lg border border-border p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-4">
        <h3 className="text-sm font-semibold text-foreground">Interview Load by Recruiter</h3>
        <span className="text-xs text-muted-foreground">Total interviews</span>
      </div>

      <div className="h-[200px] sm:h-[250px] -mx-2 sm:mx-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis
              dataKey="displayName"
              tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }}
              tickLine={false}
              axisLine={{ stroke: 'hsl(var(--border))' }}
              interval={0}
              angle={-30}
              textAnchor="end"
              height={50}
            />
            <YAxis
              tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
              tickLine={false}
              axisLine={{ stroke: 'hsl(var(--border))' }}
              width={30}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                fontSize: '12px',
              }}
              labelFormatter={(label) => {
                const item = data.find(d => d.recruiter.startsWith(String(label).replace('...', '')));
                return item?.recruiter || label;
              }}
            />
            <Legend
              wrapperStyle={{ fontSize: '10px' }}
              iconType="circle"
              iconSize={6}
            />
            <Bar
              dataKey="completed"
              name="Completed"
              fill="hsl(var(--primary))"
              radius={[4, 4, 0, 0]}
              stackId="a"
              maxBarSize={30}
            />
            <Bar
              dataKey="pending"
              name="Pending"
              fill="hsl(var(--primary) / 0.4)"
              radius={[4, 4, 0, 0]}
              stackId="a"
              maxBarSize={30}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
