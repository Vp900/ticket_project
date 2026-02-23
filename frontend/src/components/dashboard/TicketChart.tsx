import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { MonthlyTicketData } from '@/types';

interface TicketChartProps {
  data: MonthlyTicketData[];
}

export function TicketChart({ data }: TicketChartProps) {
  return (
    <div className="bg-card rounded-lg p-6 border border-border">
      <h3 className="text-lg font-heading font-semibold mb-4">
        Monthly Ticket Overview
      </h3>
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis
              dataKey="month"
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
            />
            <YAxis
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '6px',
              }}
            />
            <Legend />
            <Bar
              dataKey="open"
              name="Open"
              fill="hsl(var(--info))"
              radius={[4, 4, 0, 0]}
            />
            <Bar
              dataKey="closed"
              name="Closed"
              fill="hsl(var(--success))"
              radius={[4, 4, 0, 0]}
            />
            <Bar
              dataKey="reopened"
              name="Reopened"
              fill="hsl(var(--warning))"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
