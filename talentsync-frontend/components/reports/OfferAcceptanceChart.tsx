import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { OfferAcceptanceData } from '@/types/reports';
import { Skeleton } from '@/components/ui/skeleton';

interface OfferAcceptanceChartProps {
  data: OfferAcceptanceData[];
  isLoading?: boolean;
}

const COLORS = ['hsl(var(--primary))', 'hsl(0 84% 60%)', 'hsl(var(--muted-foreground))'];

export function OfferAcceptanceChart({ data, isLoading }: OfferAcceptanceChartProps) {
  if (isLoading) {
    return (
      <div className="bg-card rounded-lg border border-border p-6">
        <Skeleton className="h-5 w-44 mb-4" />
        <Skeleton className="h-[250px] w-full rounded-full mx-auto max-w-[200px]" />
      </div>
    );
  }

  const total = data.reduce((acc, item) => acc + item.count, 0);

  return (
    <div className="bg-card rounded-lg border border-border p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-foreground">Offer Acceptance Breakdown</h3>
        <span className="text-xs text-muted-foreground">{total} total offers</span>
      </div>

      <div className="h-[250px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={90}
              paddingAngle={3}
              dataKey="count"
              nameKey="status"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                fontSize: '12px',
              }}
              formatter={(value: number, name: string) => [
                `${value} (${Math.round((value / total) * 100)}%)`,
                name,
              ]}
            />
            <Legend
              wrapperStyle={{ fontSize: '12px' }}
              iconType="circle"
              iconSize={8}
              formatter={(value) => <span className="text-foreground">{value}</span>}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Stats below */}
      <div className="mt-4 pt-4 border-t border-border grid grid-cols-3 gap-4 text-center">
        {data.map((item, index) => (
          <div key={item.status}>
            <p className="text-lg font-bold text-foreground">{item.count}</p>
            <p className="text-xs text-muted-foreground">{item.status}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
