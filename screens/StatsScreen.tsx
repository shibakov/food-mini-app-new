import React, { useState, useEffect } from 'react';
import { SegmentedControl } from '../components/SegmentedControl';
import { Card } from '../components/Card';
import { PageHeader } from '../components/layout/PageHeader';
import { api } from '../services/api';

interface StatsScreenProps {
  onSettingsClick: () => void;
  isLoading: boolean;
  isEmpty: boolean;
}

const StatsScreen: React.FC<StatsScreenProps> = ({ onSettingsClick, isLoading, isEmpty }) => {
  const [period, setPeriod] = useState<7 | 14 | 30>(7);
  const [data, setData] = useState<any[]>([]);

  useEffect(() => {
    // In a real app, this would set local loading state if global isn't enough
    api.stats.getHistory(period).then(setData);
  }, [period]);

  const targetKcal = 2000;
  const tolerance = 200;
  const upperLimit = targetKcal + tolerance;
  const lowerLimit = targetKcal - tolerance;
  const maxScale = 3000;
  const targetPct = (targetKcal / maxScale) * 100;

  const daysOnTrack = data.filter(d => d.kcal >= lowerLimit && d.kcal <= upperLimit).length;
  const daysOver = data.filter(d => d.kcal > upperLimit).length;
  const daysUnder = data.filter(d => d.kcal < lowerLimit).length;
  
  const avgKcal = data.length ? Math.round(data.reduce((acc, c) => acc + c.kcal, 0) / data.length) : 0;
  const avgProtein = data.length ? Math.round(data.reduce((acc, c) => acc + c.p, 0) / data.length) : 0;
  const avgFats = data.length ? Math.round(data.reduce((acc, c) => acc + c.f, 0) / data.length) : 0;
  const avgCarbs = data.length ? Math.round(data.reduce((acc, c) => acc + c.c, 0) / data.length) : 0;

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
    // Added overflow-y-auto no-scrollbar to root container
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
        ) : isEmpty ? (
            <div className="flex-1 flex flex-col items-center justify-center py-24 opacity-40">
                <div className="w-16 h-16 bg-gray-200 rounded-full mb-4"></div>
                <p className="font-semibold text-gray-400">No data for this period</p>
            </div>
        ) : (
            <>
                {/* 3) Calories Chart */}
                <Card variant="regular" className="pt-6 pb-6">
                    <div className="flex justify-between items-baseline px-1 mb-6">
                        <h2 className="text-sm font-bold text-gray-900 tracking-tight">Calories</h2>
                        <span className="text-xs font-semibold text-gray-400">Avg: <span className="text-gray-900">{avgKcal}</span></span>
                    </div>
                    
                    {/* Chart Container */}
                    <div className="relative h-48 w-full mt-2 mb-2">
                        {/* Target Line */}
                        <div 
                            className="absolute left-0 right-0 border-t border-dashed border-gray-200 z-0 flex items-end justify-end pr-1 opacity-80"
                            style={{ bottom: `${targetPct}%` }}
                        >
                            <span className="text-[9px] font-bold text-gray-400 -mb-3.5 bg-white pl-1 rounded">Target</span>
                        </div>

                        {/* Bars */}
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
                                            {day.label}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                    
                    {/* Legend */}
                    <div className="flex justify-center gap-6 text-[10px] font-semibold text-gray-400 pt-3">
                        <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-emerald-500"></div>On Track</div>
                        <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-amber-300"></div>Under</div>
                        <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-rose-400"></div>Over</div>
                    </div>
                </Card>

                {/* 4) Macro Trends */}
                <Card variant="regular">
                    <h2 className="text-sm font-bold text-gray-900 px-1 mb-5 tracking-tight">Macro Trends</h2>
                    <div className="space-y-6">
                        {[
                            { label: 'Protein', avg: avgProtein, data: data.map(d => d.p), max: 200, color: 'bg-blue-500' },
                            { label: 'Fats', avg: avgFats, data: data.map(d => d.f), max: 100, color: 'bg-amber-400' },
                            { label: 'Carbs', avg: avgCarbs, data: data.map(d => d.c), max: 300, color: 'bg-orange-400' }
                        ].map((macro, idx) => (
                            <div key={idx} className="flex flex-col gap-2">
                                {/* Header */}
                                <div className="flex justify-between items-baseline px-1">
                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{macro.label}</span>
                                    <span className="text-xs font-bold text-gray-900">{macro.avg}g <span className="text-gray-300 font-normal">avg</span></span>
                                </div>
                                
                                {/* Chart */}
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

                {/* 5) Insights */}
                <Card variant="regular" className="space-y-4">
                    <h3 className="text-sm font-bold text-gray-900 tracking-tight">Insights</h3>
                    <ul className="space-y-3">
                        <li className="text-xs text-gray-500 font-medium leading-relaxed flex items-start gap-3">
                            <span className="flex items-center justify-center w-4 h-4 rounded-full bg-emerald-100 mt-0.5 flex-shrink-0">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            </span>
                            <span>Calorie target met on <span className="font-bold text-gray-900">{daysOnTrack} of {data.length} days</span>.</span>
                        </li>
                        {daysOver > 0 && (
                            <li className="text-xs text-gray-500 font-medium leading-relaxed flex items-start gap-3">
                                <span className="flex items-center justify-center w-4 h-4 rounded-full bg-rose-100 mt-0.5 flex-shrink-0">
                                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                                </span>
                                <span>Limit exceeded on <span className="font-bold text-gray-900">{daysOver} days</span>.</span>
                            </li>
                        )}
                        {daysUnder > 0 && (
                            <li className="text-xs text-gray-500 font-medium leading-relaxed flex items-start gap-3">
                                <span className="flex items-center justify-center w-4 h-4 rounded-full bg-amber-100 mt-0.5 flex-shrink-0">
                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                                </span>
                                <span>Below target on <span className="font-bold text-gray-900">{daysUnder} days</span>.</span>
                            </li>
                        )}
                        <li className="text-xs text-gray-500 font-medium leading-relaxed flex items-start gap-3">
                            <span className="flex items-center justify-center w-4 h-4 rounded-full bg-blue-100 mt-0.5 flex-shrink-0">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                            </span>
                            <span>Average protein intake is <span className="font-bold text-gray-900">{avgProtein}g</span> (Goal: 140g).</span>
                        </li>
                    </ul>
                </Card>
            </>
        )}
      </div>
    </div>
  );
};

export default StatsScreen;