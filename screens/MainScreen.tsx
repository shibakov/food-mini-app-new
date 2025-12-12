import React, { useState, useRef, useEffect } from 'react';
import { Trash2, Plus, Minus, Sparkles } from 'lucide-react';
import { Card } from '../components/Card';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { BottomSheet } from '../components/BottomSheet';
import { PageHeader } from '../components/layout/PageHeader';
import { api } from '../services/api';
import { Meal } from '../types';

interface MainScreenProps {
  onAddClick: () => void;
  onEditMeal: (mealType: string) => void;
  onSettingsClick: () => void;
  isOffline: boolean;
  isEmpty: boolean;
  onDeleteMeal: () => void;
  setIsEmpty: (val: boolean) => void;
  setIsLoading: (val: boolean) => void;
  isLoading: boolean;
}

const MainScreen: React.FC<MainScreenProps> = ({ 
  onAddClick,
  onEditMeal,
  onSettingsClick, 
  isLoading, 
  isOffline,
  isEmpty,
  onDeleteMeal,
  setIsEmpty,
  setIsLoading
}) => {
  const [meals, setMeals] = useState<Meal[]>([]);
  const [selectedMealId, setSelectedMealId] = useState<number | null>(null);
  const [selectedDateIndex, setSelectedDateIndex] = useState(3);
  const [editingItemId, setEditingItemId] = useState<number | null>(null);
  const editInputRef = useRef<HTMLInputElement>(null);

  const selectedMeal = meals.find(m => m.id === selectedMealId);

  // Fetch Data on Mount
  useEffect(() => {
    const fetchData = async () => {
      if (isEmpty) {
        setMeals([]);
        return;
      }
      setIsLoading(true);
      try {
        const fetchedMeals = await api.meals.list(new Date());
        setMeals(fetchedMeals);
        setIsEmpty(fetchedMeals.length === 0);
      } catch (err) {
        console.error("Failed to fetch meals", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [isEmpty, setIsLoading, setIsEmpty]);

  useEffect(() => {
    if (editingItemId && editInputRef.current) editInputRef.current.select();
  }, [editingItemId]);

  const generateDates = () => {
    const dates = [];
    const today = new Date();
    for (let i = -3; i <= 3; i++) {
        const d = new Date(today);
        d.setDate(today.getDate() + i);
        dates.push({ day: d.toLocaleDateString('en-US', { weekday: 'short' }), date: d.getDate(), isToday: i === 0, isFuture: i > 0, fullDate: d });
    }
    return dates;
  };
  const calendarDates = generateDates();

  const mealsToShow = isEmpty ? [] : meals;
  const totalKcal = mealsToShow.reduce((acc, curr) => acc + curr.kcal, 0);
  const goalKcal = 2000;
  const percentage = Math.min((totalKcal / goalKcal) * 100, 100);
  
  // Status Logic
  let statusBadgeClass = 'bg-emerald-50 text-emerald-700 border-emerald-100';
  let progressBarColor = 'bg-emerald-500';
  let statusText = 'On track';
  let insightText = 'Daily calorie intake is within the target range.';

  if (totalKcal > goalKcal + 50) {
      statusBadgeClass = 'bg-rose-50 text-rose-700 border-rose-100';
      progressBarColor = 'bg-rose-500';
      statusText = 'Over limit';
      insightText = 'Calories exceeded the upper tolerance range.';
  } else if (totalKcal < goalKcal - 400 && !isEmpty) {
      statusBadgeClass = 'bg-amber-50 text-amber-700 border-amber-100';
      progressBarColor = 'bg-amber-400';
      statusText = 'Under target';
      insightText = 'Calorie intake is below the daily target.';
  }

  const updateItemGrams = async (mealId: number, itemId: number, newGrams: number) => {
    if (newGrams < 0) newGrams = 0;
    
    // Optimistic Update
    setMeals(prev => prev.map(meal => {
        if (meal.id !== mealId) return meal;
        const updatedItems = meal.items.map(item => {
            if (item.id !== itemId) return item;
            const kcalPerGram = item.grams > 0 ? item.kcal / item.grams : 0;
            return { ...item, grams: newGrams, kcal: Math.round(newGrams * kcalPerGram) };
        });
        const newMealTotal = updatedItems.reduce((sum, i) => sum + i.kcal, 0);
        return { ...meal, items: updatedItems, kcal: newMealTotal };
    }));
    
    // In real app, call API here
  };

  const handleMealDelete = async (id: number) => {
    try {
        await api.meals.delete(id);
        setMeals(prev => prev.filter(m => m.id !== id));
        onDeleteMeal();
        if (meals.length <= 1) setIsEmpty(true);
    } catch (e) {
        // Handle error
    }
  };

  // Header bottom content: Date Carousel
  const DateCarousel = (
    <div className="flex space-x-2 overflow-x-auto no-scrollbar snap-x pt-2">
      {calendarDates.map((item, i) => {
          const isSelected = i === selectedDateIndex;
          const isDisabled = item.isFuture;
          return (
              <button 
                  key={i} 
                  disabled={isDisabled}
                  onClick={() => setSelectedDateIndex(i)}
                  className={`flex-shrink-0 snap-center w-[46px] h-[62px] rounded-2xl flex flex-col items-center justify-center border transition-all duration-300 ${
                      isSelected 
                      ? 'bg-gray-900 text-white border-gray-900 shadow-md shadow-gray-900/10' 
                      : isDisabled 
                          ? 'bg-transparent text-gray-300 border-transparent cursor-not-allowed' 
                          : 'bg-white text-gray-400 border-gray-100 hover:border-gray-200'
                  }`}
              >
                  <span className={`text-[9px] font-bold uppercase tracking-wider mb-0.5 ${isSelected ? 'text-gray-400' : ''}`}>{item.day}</span>
                  <span className="text-lg font-bold tracking-tight leading-none">{item.date}</span>
                  {item.isToday && !isSelected && <div className="w-1 h-1 rounded-full bg-blue-500 mt-1" />}
              </button>
          );
      })}
    </div>
  );

  return (
    <div className="flex flex-col min-h-full bg-gray-50 font-sans text-gray-900">
      
      <PageHeader 
        title={calendarDates[selectedDateIndex].isToday ? 'Today' : calendarDates[selectedDateIndex].fullDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        subtitle="Daily Overview"
        onSettingsClick={onSettingsClick}
        bottomContent={DateCarousel}
      />

      {/* Content Area */}
      <div className="p-4 space-y-5 pb-28 pt-3">
        
        {isLoading && (
          <div className="space-y-4 animate-pulse">
            <div className="bg-white rounded-2xl h-56 w-full"></div>
            <div className="h-24 bg-white rounded-2xl w-full"></div>
          </div>
        )}

        {!isLoading && (
          <>
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
                        { label: 'Protein', val: isEmpty ? '-' : '140g', pct: '30%' },
                        { label: 'Fats', val: isEmpty ? '-' : '65g', pct: '25%' },
                        { label: 'Carbs', val: isEmpty ? '-' : '180g', pct: '45%' }
                     ].map((m, i) => (
                         <div key={i} className={`flex flex-col ${i === 0 ? 'items-start' : i === 2 ? 'items-end' : 'items-center'}`}>
                             <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">{m.label}</span>
                             <div className="flex items-baseline gap-1.5">
                                <span className="text-sm font-bold text-gray-900">{m.val}</span>
                                <span className="text-[10px] text-gray-400 font-medium">{m.pct}</span>
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
                      {mealsToShow.map((meal) => {
                        const previewText = meal.items.map(i => i.name).slice(0, 3).join(', ') + (meal.items.length > 3 ? ', ...' : '');

                        return (
                          <div key={meal.id} className="relative">
                            <div className={`flex overflow-x-auto no-scrollbar snap-x rounded-2xl ${isOffline ? 'pointer-events-none opacity-80' : ''}`}>
                                
                                <Card 
                                  variant="compact"
                                  onClick={() => setSelectedMealId(meal.id)}
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
                                  onClick={() => handleMealDelete(meal.id)}
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
          </>
        )}
      </div>

      {/* --- MEAL DETAILS SHEET --- */}
      <BottomSheet
        isOpen={!!selectedMeal}
        onClose={() => setSelectedMealId(null)}
        title={selectedMeal ? (
            <div className="flex flex-col">
                <div className="text-xl font-bold text-gray-900 tracking-tight">{selectedMeal.title}</div>
                <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{selectedMeal.time}</span>
                    <span className="w-0.5 h-0.5 rounded-full bg-gray-300" />
                    <span className="text-xs font-bold text-gray-900">{selectedMeal.kcal} kcal</span>
                </div>
            </div>
        ) : undefined}
        footer={
             <Button variant="primary" onClick={() => selectedMeal && onEditMeal(selectedMeal.title)} disabled={isOffline} className="w-full" icon={<Plus size={20} />}>
                Add products
            </Button>
        }
      >
         {selectedMeal && (
             <div className="space-y-2">
                {selectedMeal.items.map((item) => {
                     const isEditing = editingItemId === item.id;
                     return (
                        <div key={item.id} className={`flex justify-between items-center p-4 rounded-2xl border transition-all duration-200 ${isEditing ? 'border-blue-500 bg-blue-50/10' : 'border-gray-50 bg-white'}`}>
                            <div className="flex-1" onClick={() => !isOffline && setEditingItemId(item.id)}>
                                <div className="text-sm font-semibold text-gray-900">{item.name}</div>
                                
                                {isEditing ? (
                                    <div className="flex items-center gap-1 mt-2" onClick={e => e.stopPropagation()}>
                                        <button 
                                            disabled={isOffline}
                                            className="w-8 h-8 flex items-center justify-center bg-white border border-gray-200 rounded-lg text-gray-600 active:bg-gray-100 disabled:opacity-50 transition-colors shadow-sm"
                                            onClick={() => updateItemGrams(selectedMeal.id, item.id, item.grams - 5)}
                                        >
                                            <Minus size={14} strokeWidth={2.5} />
                                        </button>
                                        <div className="relative mx-1">
                                            <Input 
                                                variant="inline"
                                                ref={editInputRef}
                                                className="w-16"
                                                type="number"
                                                disabled={isOffline}
                                                value={item.grams === 0 ? '' : item.grams}
                                                onChange={(e) => updateItemGrams(selectedMeal.id, item.id, parseInt(e.target.value) || 0)}
                                                onBlur={() => setEditingItemId(null)}
                                                onKeyDown={(e) => e.key === 'Enter' && setEditingItemId(null)}
                                            />
                                        </div>
                                        <button 
                                            disabled={isOffline}
                                            className="w-8 h-8 flex items-center justify-center bg-white border border-gray-200 rounded-lg text-gray-600 active:bg-gray-100 disabled:opacity-50 transition-colors shadow-sm"
                                            onClick={() => updateItemGrams(selectedMeal.id, item.id, item.grams + 5)}
                                        >
                                            <Plus size={14} strokeWidth={2.5} />
                                        </button>
                                    </div>
                                ) : (
                                    <div className="text-xs text-gray-500 font-medium flex items-center gap-2 mt-1">
                                        <span className="bg-gray-50 px-2 py-0.5 rounded text-gray-600 font-semibold text-[10px] uppercase tracking-wide">{item.grams}g</span>
                                        {!isOffline && <span className="text-[10px] text-gray-300 font-medium">Edit</span>}
                                    </div>
                                )}
                            </div>
                            <div className="flex flex-col items-end">
                                 <span className="text-sm font-bold text-gray-900">{item.kcal}</span>
                                 <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">kcal</span>
                            </div>
                        </div>
                     );
                })}
             </div>
         )}
      </BottomSheet>
    </div>
  );
};

export default MainScreen;
