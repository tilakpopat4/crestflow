import React from 'react';
import { ResponsiveContainer, BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip } from 'recharts';
import { Button } from '../ui/button';

interface DashboardClientRevenueProps {
  activeClientRevenueData: { name: string; value: number }[];
  clientRevenueTimeframe: 'all' | 'month';
  setClientRevenueTimeframe: (timeframe: 'all' | 'month') => void;
  allTimeDataCount: number;
  onNavigateToClients?: () => void;
}

export const DashboardClientRevenue: React.FC<DashboardClientRevenueProps> = ({
  activeClientRevenueData,
  clientRevenueTimeframe,
  setClientRevenueTimeframe,
  allTimeDataCount,
  onNavigateToClients,
}) => {
  return (
    <div className="bg-surface-700 border border-surface-400 p-4 sm:p-6 rounded-xl shadow-2xs flex flex-col min-w-0">
      <div className="flex items-center justify-between gap-2 mb-4 sm:mb-6">
        <div>
          <h3 className="text-xs sm:text-sm font-semibold text-text-primary uppercase tracking-wider">
            Client Revenue
          </h3>
          <p className="text-[11px] text-text-secondary mt-0.5">
            {clientRevenueTimeframe === 'month' ? 'Paid revenue this month' : 'Total all-time paid'}
          </p>
        </div>
        <div className="inline-flex rounded-lg bg-surface-800 border border-surface-400 p-0.5 text-xs font-medium shrink-0">
          <button
            type="button"
            onClick={() => setClientRevenueTimeframe('all')}
            className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer border-0 ${
              clientRevenueTimeframe === 'all'
                ? 'bg-surface-600 text-text-primary shadow-xs font-semibold'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            All Time
          </button>
          <button
            type="button"
            onClick={() => setClientRevenueTimeframe('month')}
            className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer border-0 ${
              clientRevenueTimeframe === 'month'
                ? 'bg-surface-600 text-text-primary shadow-xs font-semibold'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            This Month
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-[240px] sm:min-h-[280px]">
        {activeClientRevenueData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={activeClientRevenueData}
              layout="vertical"
              margin={{ top: 0, right: 10, left: 10, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#333333" />
              <XAxis type="number" hide />
              <YAxis
                dataKey="name"
                type="category"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: '#aaaaaa' }}
                width={100}
              />
              <Tooltip
                cursor={{ fill: 'rgba(255, 255, 255, 0.04)' }}
                formatter={(value: number) => [`₹${value.toLocaleString('en-IN')}`, 'Revenue']}
                contentStyle={{
                  borderRadius: '8px',
                  border: '1px solid #333333',
                  backgroundColor: '#212121',
                  color: '#f1f1f1',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.4)',
                  fontSize: '12px',
                }}
                itemStyle={{ color: '#f1f1f1', fontFamily: 'monospace' }}
                labelStyle={{ color: '#aaaaaa', fontWeight: 600, marginBottom: '4px' }}
              />
              <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={22} fill="#f1f1f1" />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-xs text-text-secondary text-center py-12 space-y-2.5">
            {clientRevenueTimeframe === 'month' && allTimeDataCount > 0 ? (
              <>
                <p>No invoices paid this month yet.</p>
                <button
                  type="button"
                  onClick={() => setClientRevenueTimeframe('all')}
                  className="text-xs font-semibold text-text-primary hover:underline cursor-pointer border-0 bg-transparent"
                >
                  View All-Time Client Revenue ({allTimeDataCount} client{allTimeDataCount > 1 ? 's' : ''}) &rarr;
                </button>
              </>
            ) : (
              <>
                <p>No client revenue recorded yet.<br />Generate invoices to see client distribution.</p>
                {onNavigateToClients && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={onNavigateToClients}
                    className="mt-1"
                  >
                    Manage Clients &rarr;
                  </Button>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardClientRevenue;
