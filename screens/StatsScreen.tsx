
import React, { useState, useEffect } from 'react';
import { SegmentedControl } from '../components/SegmentedControl';
import { Card } from '../components/Card';
import { PageHeader } from '../components/layout/PageHeader';
import { api } from '../services/api';

interface StatsDay {
  kcal: number;
  p: number;
  f: number;
  c: number;
  label?: string;
  status?: string;
}

interface StatsScreenProps {
  onSettingsClick: () => void;
  isOffline: boolean;
}

const StatsScreen: React.FC<StatsScreenProps> = ({ onSettingsClick, isOffline }) => {
  const [period, setPeriod] = useState<7 | 14 | 30>(7);
  const [data, setData] = useState<StatsDay[]>([]);
  const [localLoading, setLocalLoading] = useState(false);

  useEffect(() => {
    if (isOffline) {
      setLocalLoading(false);
      return;
    }
    setLocalLoading(true);
    const rangeMap: Record<7 | 14 | 30, '7d' | '14d' | '30d'> = { 7: '7d', 14: '14d', 30: '30d' };
    api.stats
      .get(rangeMap[period])
      .then((res: { history?: StatsDay[] }) => {
        setData(res.history ?? []);
        setLocalLoading(false);
      })
      .catch((e: unknown) => {
        console.error('Failed to fetch stats', e);
        setLocalLoading(false);
      });
  }, [period, isOffline]);

  const isLoading = localLoading;
  const isDataEmpty = data.length === 0;

  const targetKcal = 2000;
  const tolerance = 200;
  const upperLimit = targetKcal + tolerance;
  const lowerLimit = targetKcal - tolerance;
  const maxScale = 3000;
  const targetPct = (targetKcal / maxScale) * 100;

  const daysOnTrack = data.filter((d: StatsDay) => d.kcal >= lowerLimit && d.kcal <= upperLimit).length;
  const daysOver = data.filter((d: StatsDay) => d.kcal > upperLimit).length;
  const daysUnder = data.filter((d: StatsDay) => d.kcal < lowerLimit).length;
  
  const avgKcal = data.length
    ? Math.round(data.reduce((acc: number, c: StatsDay) => acc + c.kcal, 0) / data.length)
    : 0;
  const avgProtein = data.length
    ? Math.round(data.reduce((acc: number, c: StatsDay) => acc + c.p, 0) / data.length)
    : 0;
  const avgFats = data.length
    ? Math.round(data.reduce((acc: number, c: StatsDay) => acc + c.f, 0) / data.length)
    : 0;
  const avgCarbs = data.length
    ? Math.round(data.reduce((acc: number, c: StatsDay) => acc + c.c, 0) / data.length)
    : 0;

  const getBarColor = (kcal: number) => {
    if (kcal > upperLimit) return 'bg-rose-400';
    if (kcal < lowerLimit) return 'bg-amber-300';
    return 'bg-emerald-500';
  };

  const SegmentedSelector = (
      <div className="py-1">
        <SegmentedControl 
            value={period}
            onChange={(v) => setPeriod(v as 7 | 14 | 30)}
            disabled={isLoading}
            options={[
                { label: '7 Days', value: 7 },
                { label: '14 Days', value: 14 },
                { label: '30 Days', value: 30 },
            ]}
        />
      </div>
  );

  return (
    <div className="flex flex-col h-full overflow-y-auto no-scrollbar bg-gray-50 font-sans text-gray-900">
      
      <PageHeader 
        title="Statistics"
        subtitle="Trends & Analysis"
        onSettingsClick={onSettingsClick}
        bottomContent={SegmentedSelector}
      />

      {/* Content Area */}
      <div className="p-4 space-y-5 pb-28 pt-3">

        {isLoading ? (
            <div className="space-y-6 animate-pulse">
                <div className="h-64 bg-white rounded-2xl w-full"></div>
                <div className="h-32 bg-white rounded-2xl w-full"></div>
            </div>
        ) : isDataEmpty ? (
            <div className="flex-1 flex flex-col items-center justify-center py-24 opacity-40">
                <div className="w-16 h-16 bg-gray-200 rounded-full mb-4"></div>
                <p className="font-semibold text-gray-400">No data for this period</p>
            </div>
        ) : (
            <>
                <Card variant="regular" className="pt-6 pb-6">
                    <div className="flex justify-between items-baseline px-1 mb-6">
                        <h2 className="text-sm font-bold text-gray-900 tracking-tight">Calories</h2>
                        <span className="text-xs font-semibold text-gray-400">Avg: <span className="text-gray-900">{avgKcal}</span></span>
                    </div>
                    
                    <div className="relative h-48 w-full mt-2 mb-2">
                        <div 
                            className="absolute left-0 right-0 border-t border-dashed border-gray-200 z-0 flex items-end justify-end pr-1 opacity-80"
                            style={{ bottom: `${targetPct}%` }}
                        >
                            <span className="text-[9px] font-bold text-gray-400 -mb-3.5 bg-white pl-1 rounded">Target</span>
                        </div>

                        <div className="absolute inset-0 flex items-end justify-between gap-1 z-10">
                            {data.map((day, i) => {
                                const heightPct = Math.min((day.kcal / maxScale) * 100, 100);
                                return (
                                    <div key={i} className="flex-1 flex flex-col justify-end h-full group">
                                        <div className="w-full relative flex items-end bg-transparent rounded-t-sm overflow-hidden h-full">
                                            <div 
                                                className={`w-full rounded-t-[3px] transition-all duration-500 ${getBarColor(day.kcal)} opacity-80 group-hover:opacity-100`}
                                                style={{ height: `${heightPct}%` }}
                                            />
                                        </div>
                                        <span className="text-[9px] font-bold text-gray-300 text-center mt-2 h-3 uppercase tracking-wider group-hover:text-gray-500 transition-colors">
                                            {day.label || i}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </Card>

                <Card variant="regular">
                    <h2 className="text-sm font-bold text-gray-900 px-1 mb-5 tracking-tight">Macro Trends</h2>
                    <div className="space-y-6">
                        {[
                            { label: 'Protein', avg: avgProtein, data: data.map((d: StatsDay) => d.p), max: 200, color: 'bg-blue-500' },
                            { label: 'Fats', avg: avgFats, data: data.map((d: StatsDay) => d.f), max: 100, color: 'bg-amber-400' },
                            { label: 'Carbs', avg: avgCarbs, data: data.map((d: StatsDay) => d.c), max: 300, color: 'bg-orange-400' }
                        ].map((macro, idx) => (
                            <div key={idx} className="flex flex-col gap-2">
                                <div className="flex justify-between items-baseline px-1">
                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{macro.label}</span>
                                    <span className="text-xs font-bold text-gray-900">{macro.avg}g <span className="text-gray-300 font-normal">avg</span></span>
                                </div>
                                
                                <div className="h-10 w-full flex items-end justify-between gap-px bg-white rounded-lg overflow-hidden p-0 border border-transparent">
                                    {macro.data.map((val: number, i: number) => (
                                        <div key={i} className="flex-1 h-full flex items-end relative group bg-gray-50/50">
                                            <div 
                                                className={`w-full rounded-t-[1px] ${macro.color} opacity-80 group-hover:opacity-100 transition-opacity`} 
                                                style={{ height: `${Math.min((val / macro.max)*100, 100)}%` }}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>
            </>
        )}
      </div>
    </div>
  );
};

export default StatsScreen;
