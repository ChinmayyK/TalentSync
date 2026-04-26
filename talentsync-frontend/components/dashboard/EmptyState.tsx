import { Calendar, Search } from 'lucide-react';
import { ReactNode } from 'react';

interface EmptyStateProps {
  title?: string;
  description?: string;
  icon?: 'calendar' | 'search';
  action?: ReactNode;
}

export function EmptyState({ 
  title = 'No data found', 
  description = 'There is nothing to display here yet.',
  icon = 'calendar',
  action
}: EmptyStateProps) {
  const IconComponent = icon === 'search' ? Search : Calendar;

  return (
    <div className="py-12 px-4">
      <div className="flex flex-col items-center justify-center text-center">
        <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
          <IconComponent className="h-6 w-6 text-muted-foreground" />
        </div>
        <h3 className="text-base font-medium text-foreground mb-1">{title}</h3>
        <p className="text-sm text-muted-foreground max-w-sm mb-4">{description}</p>
        {action}
      </div>
    </div>
  );
}
