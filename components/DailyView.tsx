
import React from 'react';
import { Trash2, Plus, Minus, Sparkles } from 'lucide-react';
import { Card } from './Card';
import { Button } from './Button';
import { Input } from './Input';
import { Meal } from '../types';

interface DailyViewProps {
  isLoading: boolean;
  isEmpty: boolean;
  isOffline: boolean;
  meals: Meal[];
  totalKcal: number;
  goalKcal: number;
  percentage: number;
  statusText: string;
  statusBadgeClass: string;
  progressBarColor: string;
  insightText: string;
  onAddClick: () => void;
  onDeleteMeal: (id: string | number) => void;
  onMealClick: (id: string | number) => void;
  macros: { p: number; f: number; c: number };
}

export const DailyView: React.FC<DailyViewProps> = ({
  isLoading,
  isEmpty,
  isOffline,
  meals,
  totalKcal,
  goalKcal,
  percentage,
  statusText,
  statusBadgeClass,
  progressBarColor,
  insightText,
  onAddClick,
  onDeleteMeal,
  onMealClick,
  macros
}) => {
  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse pt-4 px-4">
        <div className="bg-white rounded-2xl h-56 w-full"></div>
        <div className="h-24 bg-white rounded-2xl w-full"></div>
        <div className="h-24 bg-white rounded-2xl w-full"></div>
      </div>
    );
  }

  return (
    // Added bg-gray-50 to ensure no transparency during slide transitions
    <div className="space-y-5 pb-28 pt-3 min-h-full px-4 bg-gray-50">
      {/* 2) Summary Block */}
      <Card variant="regular" className="pt-6 pb-6">
          <div className="flex justify-between items-start mb-5">
              <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Calories</span>
                  <div className="flex items-baseline gap-2">
                      <span className={`text-4xl font-semibold tracking-tighter ${isEmpty ? 'text-gray-300' : 'text-gray-900'}`}>
                          {isEmpty ? '0' : totalKcal.toLocaleString()}
                      </span>
                      <span className="text-sm font-medium text-gray-400">/ {goalKcal}</span>
                  </div>
              </div>
              {!isEmpty && (
                  <div className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wide border ${statusBadgeClass}`}>
                      {statusText}
                  </div>
              )}
          </div>

          {/* Progress Bar */}
          <div className="h-2 w-full bg-gray-100/80 rounded-full overflow-hidden mb-6">
              <div 
                  className={`h-full rounded-full transition-all duration-700 ease-out ${isEmpty ? 'bg-transparent' : progressBarColor}`} 
                  style={{ width: `${isEmpty ? 0 : percentage}%` }}
              />
          </div>

          {/* Macros */}
          <div className="grid grid-cols-3 gap-4 border-t border-gray-50 pt-5">
               {[
                  { label: 'Protein', val: isEmpty ? '-' : `${Math.round(macros.p)}g`, pct: '30%' }, // Pct placeholders for now
                  { label: 'Fats', val: isEmpty ? '-' : `${Math.round(macros.f)}g`, pct: '25%' },
                  { label: 'Carbs', val: isEmpty ? '-' : `${Math.round(macros.c)}g`, pct: '45%' }
               ].map((m, i) => (
                   <div key={i} className={`flex flex-col ${i === 0 ? 'items-start' : i === 2 ? 'items-end' : 'items-center'}`}>
                       <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">{m.label}</span>
                       <div className="flex items-baseline gap-1.5">
                          <span className="text-sm font-bold text-gray-900">{m.val}</span>
                       </div>
                   </div>
               ))}
          </div>
      </Card>

      {/* 3) Daily Insight Block */}
      {!isEmpty && (
          <div className="flex items-start gap-3.5 bg-blue-50/50 border border-blue-100/80 rounded-xl p-4 transition-colors">
              <Sparkles size={16} className="text-blue-500 mt-0.5 flex-shrink-0 opacity-80" fill="currentColor" fillOpacity={0.1} />
              <p className="text-xs font-medium text-gray-700 leading-relaxed">
                  {insightText}
              </p>
          </div>
      )}

      {/* 4) Meals Block */}
      <section className="space-y-4">
          <div className="flex items-center justify-between px-1 pt-1">
              <h2 className="text-lg font-bold text-gray-900 tracking-tight">Meals</h2>
          </div>

          {isEmpty ? (
             <button 
                onClick={isOffline ? undefined : onAddClick}
                disabled={isOffline}
                className={`w-full py-12 flex flex-col items-center justify-center space-y-3 text-center border border-dashed border-gray-200 rounded-2xl bg-gray-50/50 transition-all group ${isOffline ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-100 hover:border-gray-300 active:scale-[0.99] cursor-pointer'}`}
             >
                <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm text-gray-400 group-hover:text-blue-500 group-hover:scale-110 transition-all duration-300">
                  <Plus size={24} strokeWidth={2.5} />
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900">Log your first meal</p>
                  <p className="text-xs text-gray-400 mt-1">Start tracking today</p>
                </div>
             </button>
          ) : (
             <div className="space-y-4">
                {meals.map((meal) => {
                  const previewText = meal.items.map(i => i.name).slice(0, 3).join(', ') + (meal.items.length > 3 ? ', ...' : '');

                  return (
                    <div key={meal.id} className="relative">
                      <div className={`flex overflow-x-auto no-scrollbar snap-x rounded-2xl ${isOffline ? 'pointer-events-none opacity-80' : ''}`}>
                          
                          <Card 
                            variant="compact"
                            onClick={() => onMealClick(meal.id)}
                            className="w-full flex-shrink-0 snap-center z-10 overflow-hidden py-4 border border-transparent hover:border-gray-100 transition-colors"
                          >
                            <div className="flex justify-between items-center">
                              <div className="flex-1 min-w-0 pr-6">
                                  <div className="flex items-center gap-2 mb-1.5">
                                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{meal.time}</span>
                                      <h3 className="text-base font-bold text-gray-900 truncate tracking-tight">{meal.title}</h3>
                                  </div>
                                  <p className="text-sm text-gray-500 truncate font-medium leading-normal">
                                      {previewText}
                                  </p>
                              </div>
                              <div className="flex flex-col items-end pl-2">
                                  <span className="text-base font-bold text-gray-900">{meal.kcal}</span>
                                  <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">kcal</span>
                              </div>
                            </div>
                          </Card>

                          {/* Swipe Action */}
                          <div 
                            className="w-[5rem] flex-shrink-0 snap-center bg-rose-50 flex flex-col items-center justify-center ml-[-1rem] pl-4 rounded-r-2xl active:bg-rose-100 transition-colors cursor-pointer z-0 group"
                            onClick={() => onDeleteMeal(meal.id)}
                          >
                              <Trash2 className="text-rose-500 mb-1 group-active:scale-90 transition-transform" size={20} />
                              <span className="text-rose-600 text-[9px] font-bold uppercase tracking-wider">Delete</span>
                          </div>
                      </div>
                    </div>
                  );
                })}

                <Button
                   variant="dashed"
                   onClick={onAddClick}
                   disabled={isOffline}
                   className="w-full"
                   icon={<Plus size={18} strokeWidth={2.5} />}
                >
                   Add Meal
                </Button>
             </div>
          )}
      </section>
    </div>
  );
};
