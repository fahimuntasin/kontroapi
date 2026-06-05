import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';

interface Props {
  title: string;
  value: number;
  max?: number;
  icon: LucideIcon;
}

export function StatCard({ title, value, max, icon: Icon }: Props) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-mono uppercase tracking-wider text-[#7A8088]">{title}</span>
        <Icon className="h-4 w-4 text-[#7A8088]" />
      </div>
      <div className="mt-3 text-2xl font-mono font-medium text-[#E8EAEC]">
        {max !== undefined ? `${value}/${max}` : value}
      </div>
    </Card>
  );
}
