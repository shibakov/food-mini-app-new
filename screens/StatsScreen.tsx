import React, { useState, useMemo } from 'react';
import { Settings } from 'lucide-react';
import { SegmentedControl } from '../components/SegmentedControl';

interface StatsScreenProps {
  onSettingsClick: () => void;
  isLoading: boolean;
  isEmpty: boolean;
}

// Helper to generate consistent mock data based on period
const generateMockData = (days: number) => {
  const data = [];
  const daysOfWeek = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  
  for (let i = 0; i < days; i++) {
    // Deterministic pseudo-random based on index to keep chart stable-ish across renders unless period changes
    const seed = (i * 1337) % 100; 
    let kcal = 0;
    
    // Simulate patterns
    if (seed % 3 === 0) kcal = 2350; // Over
    else if (seed % 3 === 1) kcal = 1600; // Under
    else kcal = 2050; // OK (Target ~2000)

    // Add some noise
    kcal += (Math.random() * 200 - 100);

    data.push({
      id: i,
      label: days === 7 ? daysOfWeek[i % 7] : (i % 5 === 0 ? `${i + 1}` : ''), // Sparse labels for longer periods
      kcal: Math.round(kcal),
      p: Math.round(110 + Math.random() * 40), // Target ~140
      f: Math.round(50 + Math.random() * 30),  // Target ~65
      c: Math.round(180 + Math.random() * 60), // Target ~180
    });
  }
  return data;
};

const StatsScreen: React.FC<StatsScreenProps> = ({ onSettingsClick, isLoading, isEmpty }) => {
  const [period, setPeriod] = useState<7 | 14 | 30>(7);

  // Memoize data so it doesn't jitter on every render, only on period change
  const data = useMemo(() => generateMockData(period), [period]);

  // Calculations for Insights
  const targetKcal = 2000;
  const tolerance = 200; // +/- 200
  const upperLimit = targetKcal + tolerance;
  const lowerLimit = targetKcal - tolerance;

  const daysOnTrack = data.filter(d => d.kcal >= lowerLimit && d.kcal <= upperLimit).length;
  const daysOver = data.filter(d => d.kcal > upperLimit).length;
  const daysUnder = data.filter(d => d.kcal < lowerLimit).length;
  
  const avgKcal = Math.round(data.reduce((acc, c) => acc + c.kcal, 0) / data.length);
  const avgProtein = Math.round(data.reduce((acc, c) => acc + c.p, 0) / data.length);

  // Helper for semantic bar colors
  const getBarColor = (kcal: number) => {
    if (kcal > upperLimit) return 'bg-rose-400'; // Warning / Over
    if (kcal < lowerLimit) return 'bg-amber-300'; // Muted / Under
    return 'bg-emerald-400'; // Neutral / Good
  };

  return (
    <div className="p-5 space-y-8 bg-gray-50 min-h-full font-sans text-gray-900">
      
      {/* 1) Header & Entry */}
      <header className="flex items-center justify-between pt-2">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Stats</h1>
        <button 
          onClick={onSettingsClick}
          className="p-2 rounded-full bg-transparent hover:bg-gray-200 active:bg-gray-300 transition-colors text-gray-600"
        >
          <Settings size={22} />
        </button>
      </header>

      {/* 2) Period Selector */}
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

      {isLoading ? (
        // Loading Skeleton
        <div className="space-y-8 animate-pulse">
            <div className="h-64 bg-gray-200 rounded-2xl w-full"></div>
            <div className="h-32 bg-gray-200 rounded-2xl w-full"></div>
            <div className="h-24 bg-gray-200 rounded-2xl w-full"></div>
        </div>
      ) : isEmpty ? (
        // Empty State
        <div className="flex-1 flex flex-col items-center justify-center py-20 opacity-50">
            <div className="w-12 h-12 bg-gray-200 rounded-full mb-4"></div>
            <p className="font-medium text-gray-400">No data for this period</p>
        </div>
      ) : (
        <>
            {/* 3) Calories Over Time (Primary Chart) */}
            <section className="space-y-4">
                <div className="flex justify-between items-baseline px-1">
                    <h2 className="text-sm font-semibold text-gray-900">Calories</h2>
                    <span className="text-xs font-medium text-gray-500">Avg: {avgKcal} kcal</span>
                </div>
                
                <div className="h-56 w-full flex items-end justify-between gap-1 select-none">
                    {data.map((day, i) => {
                        const heightPct = Math.min((day.kcal / 3000) * 100, 100);
                        return (
                            <div key={i} className="flex-1 flex flex-col justify-end h-full gap-2 group">
                                <div className="w-full relative flex-1 flex items-end bg-gray-100 rounded-t-sm overflow-hidden">
                                    {/* The Bar */}
                                    <div 
                                        className={`w-full rounded-t-sm transition-all duration-500 ${getBarColor(day.kcal)}`}
                                        style={{ height: `${heightPct}%` }}
                                    />
                                </div>
                                {/* X-Axis Label */}
                                <span className="text-[9px] font-medium text-gray-400 text-center h-3">
                                    {day.label}
                                </span>
                            </div>
                        );
                    })}
                </div>
                
                {/* Legend / Key */}
                <div className="flex justify-center gap-4 text-[10px] font-medium text-gray-500 pt-2">
                    <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-emerald-400"></div>Within target</div>
                    <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-amber-300"></div>Under</div>
                    <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-rose-400"></div>Over limit</div>
                </div>
            </section>

            {/* 4) Macro Trends */}
            <section className="space-y-4 pt-2">
                <h2 className="text-sm font-semibold text-gray-900 px-1">Macro Trends</h2>
                <div className="grid grid-cols-1 gap-4">
                    {/* Protein Row */}
                    <div className="flex items-center gap-4">
                        <span className="w-12 text-xs font-bold text-gray-400 uppercase">Prot</span>
                        <div className="flex-1 h-8 flex items-end justify-between gap-0.5">
                            {data.map((d, i) => (
                                <div key={i} className="flex-1 bg-blue-100 rounded-sm" style={{ height: `${Math.min((d.p / 200)*100, 100)}%` }}></div>
                            ))}
                        </div>
                    </div>
                    {/* Fats Row */}
                    <div className="flex items-center gap-4">
                        <span className="w-12 text-xs font-bold text-gray-400 uppercase">Fats</span>
                        <div className="flex-1 h-8 flex items-end justify-between gap-0.5">
                            {data.map((d, i) => (
                                <div key={i} className="flex-1 bg-yellow-100 rounded-sm" style={{ height: `${Math.min((d.f / 100)*100, 100)}%` }}></div>
                            ))}
                        </div>
                    </div>
                    {/* Carbs Row */}
                    <div className="flex items-center gap-4">
                        <span className="w-12 text-xs font-bold text-gray-400 uppercase">Carb</span>
                        <div className="flex-1 h-8 flex items-end justify-between gap-0.5">
                            {data.map((d, i) => (
                                <div key={i} className="flex-1 bg-orange-100 rounded-sm" style={{ height: `${Math.min((d.c / 300)*100, 100)}%` }}></div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* 5) Aggregated Insights - Factual & Text-based */}
            <section className="bg-white rounded-2xl p-5 border border-gray-100 space-y-3">
                <h3 className="text-sm font-bold text-gray-900">Insights</h3>
                <ul className="space-y-2.5">
                    <li className="text-xs text-gray-600 flex items-start gap-2">
                        <span className="block w-1 h-1 mt-1.5 rounded-full bg-gray-400 flex-shrink-0" />
                        <span>Calorie target met on <span className="font-semibold text-gray-900">{daysOnTrack} of {data.length} days</span>.</span>
                    </li>
                    {daysOver > 0 && (
                        <li className="text-xs text-gray-600 flex items-start gap-2">
                            <span className="block w-1 h-1 mt-1.5 rounded-full bg-rose-400 flex-shrink-0" />
                            <span>Limit exceeded on <span className="font-semibold text-gray-900">{daysOver} days</span>.</span>
                        </li>
                    )}
                    {daysUnder > 0 && (
                        <li className="text-xs text-gray-600 flex items-start gap-2">
                            <span className="block w-1 h-1 mt-1.5 rounded-full bg-amber-300 flex-shrink-0" />
                            <span>Below target on <span className="font-semibold text-gray-900">{daysUnder} days</span>.</span>
                        </li>
                    )}
                    <li className="text-xs text-gray-600 flex items-start gap-2">
                        <span className="block w-1 h-1 mt-1.5 rounded-full bg-gray-400 flex-shrink-0" />
                        <span>Average protein intake is <span className="font-semibold text-gray-900">{avgProtein}g</span> (Goal: 140g).</span>
                    </li>
                </ul>
            </section>
        </>
      )}
    </div>
  );
};

export default StatsScreen;