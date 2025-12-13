import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Minus, Plus } from 'lucide-react';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { BottomSheet } from '../components/BottomSheet';
import { PageHeader } from '../components/layout/PageHeader';
import { DaySwipeLayer } from '../components/layout/DaySwipeLayer';
import { DailyView } from '../components/DailyView';
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
  // Data State
  const [meals, setMeals] = useState<Meal[]>([]);
  const [selectedMealId, setSelectedMealId] = useState<number | null>(null);
  const [selectedDateIndex, setSelectedDateIndex] = useState(3); // 3 is 'Today'
  
  // Edit Meal State
  const [editingItemId, setEditingItemId] = useState<number | null>(null);
  const editInputRef = useRef<HTMLInputElement>(null);
  
  // Transition State
  const currentViewRef = useRef<HTMLDivElement>(null);
  const incomingViewRef = useRef<HTMLDivElement>(null);
  const [incomingDateIndex, setIncomingDateIndex] = useState<number | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);

  const selectedMeal = meals.find(m => m.id === selectedMealId);

  // Generate dates
  const calendarDates = useMemo(() => {
    const dates = [];
    const today = new Date();
    for (let i = -3; i <= 3; i++) {
        const d = new Date(today);
        d.setDate(today.getDate() + i);
        dates.push({ 
            day: d.toLocaleDateString('en-US', { weekday: 'short' }), 
            date: d.getDate(), 
            isToday: i === 0, 
            isFuture: i > 0, 
            fullDate: d 
        });
    }
    return dates;
  }, []);

  // Fetch Data
  useEffect(() => {
    const fetchData = async () => {
      if (isOffline && meals.length === 0) return; 

      setIsLoading(true);
      try {
        const targetDate = calendarDates[selectedDateIndex].fullDate;
        const fetchedMeals = await api.meals.list(targetDate);
        setMeals(fetchedMeals);
        setIsEmpty(fetchedMeals.length === 0);
      } catch (err) {
        console.error("Failed to fetch meals", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [selectedDateIndex, isOffline, setIsEmpty, setIsLoading, calendarDates]);

  // Calculations
  const mealsToShow = isEmpty ? [] : meals;
  const totalKcal = mealsToShow.reduce((acc, curr) => acc + curr.kcal, 0);
  const goalKcal = 2000;
  const percentage = Math.min((totalKcal / goalKcal) * 100, 100);
  
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

  // Meal Handlers
  const updateItemGrams = async (mealId: number, itemId: number, newGrams: number) => {
    if (newGrams < 0) newGrams = 0;
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
  };

  const handleMealDelete = async (id: number) => {
    try {
        await api.meals.delete(id);
        setMeals(prev => prev.filter(m => m.id !== id));
        onDeleteMeal();
        if (meals.length <= 1) setIsEmpty(true);
    } catch (e) { }
  };

  // --- TRANSITION LOGIC ---

  const handleSwipeStart = () => {
    if (currentViewRef.current) currentViewRef.current.style.transition = 'none';
    if (incomingViewRef.current) incomingViewRef.current.style.transition = 'none';
    setIsAnimating(true);
  };

  const handleSwipeProgress = (dx: number) => {
    if (!currentViewRef.current) return;

    currentViewRef.current.style.transform = `translateX(${dx}px)`;

    const direction = dx < 0 ? 1 : -1; 
    const nextIndex = selectedDateIndex + direction;

    if (nextIndex < 0 || nextIndex >= calendarDates.length || (calendarDates[nextIndex].isFuture)) {
       currentViewRef.current.style.transform = `translateX(${dx * 0.3}px)`;
       if (incomingViewRef.current) incomingViewRef.current.style.opacity = '0';
       return;
    }

    setIncomingDateIndex(nextIndex);

    if (incomingViewRef.current) {
        incomingViewRef.current.style.opacity = '1';
        // Place incoming view on the left or right side based on direction
        // If swiping Left (dx < 0), next day comes from Right (100%)
        // If swiping Right (dx > 0), prev day comes from Left (-100%)
        const startX = direction === 1 ? '100%' : '-100%';
        incomingViewRef.current.style.transform = `translateX(calc(${startX} + ${dx}px))`;
    }
  };

  const handleSwipeEnd = (shouldSwitch: boolean, direction: 'left' | 'right') => {
    if (!currentViewRef.current) {
        setIsAnimating(false);
        return;
    }

    const transition = 'transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)';
    currentViewRef.current.style.transition = transition;
    
    if (incomingViewRef.current) incomingViewRef.current.style.transition = transition;

    const targetIndex = incomingDateIndex !== null ? incomingDateIndex : selectedDateIndex;
    const isOutOfBounds = targetIndex < 0 || targetIndex >= calendarDates.length || (calendarDates[targetIndex].isFuture);
    
    if (shouldSwitch && !isOutOfBounds && incomingDateIndex !== null) {
        // Complete Transition
        const exitX = direction === 'left' ? '-100%' : '100%';
        currentViewRef.current.style.transform = `translateX(${exitX})`;
        
        if (incomingViewRef.current) {
           incomingViewRef.current.style.transform = `translateX(0)`;
        }

        setTimeout(() => {
            setSelectedDateIndex(targetIndex);
            setIsAnimating(false);
            setIncomingDateIndex(null);
            
            if (currentViewRef.current) {
                currentViewRef.current.style.transition = 'none';
                currentViewRef.current.style.transform = '';
            }
        }, 300);
    } else {
        // Snap Back
        currentViewRef.current.style.transform = `translateX(0)`;
        
        if (incomingViewRef.current) {
           const resetX = direction === 'left' ? '100%' : '-100%';
           incomingViewRef.current.style.transform = `translateX(${resetX})`;
        }

        setTimeout(() => {
            setIsAnimating(false);
            setIncomingDateIndex(null);
        }, 300);
    }
  };


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
    // Fixed height h-full is critical here for absolute positioning children to work
    <div className="flex flex-col h-full bg-gray-50 font-sans text-gray-900 overflow-hidden">
      <PageHeader 
        title={calendarDates[selectedDateIndex].isToday ? 'Today' : calendarDates[selectedDateIndex].fullDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        subtitle="Daily Overview"
        onSettingsClick={onSettingsClick}
        bottomContent={DateCarousel}
      />

      {/* Swipe Container */}
      <DaySwipeLayer 
        className="flex-1 relative overflow-hidden" 
        onSwipeStart={handleSwipeStart}
        onSwipeProgress={handleSwipeProgress}
        onSwipeEnd={handleSwipeEnd}
        disabled={!!selectedMeal}
      >
        <div className="relative w-full h-full">
            
            {/* CURRENT VIEW */}
            <div 
                ref={currentViewRef}
                className="absolute inset-0 overflow-y-auto no-scrollbar w-full h-full bg-gray-50"
                style={{ willChange: 'transform' }} 
            >
                 <DailyView 
                    isLoading={isLoading}
                    isEmpty={isEmpty}
                    isOffline={isOffline}
                    meals={meals}
                    totalKcal={totalKcal}
                    goalKcal={goalKcal}
                    percentage={percentage}
                    statusText={statusText}
                    statusBadgeClass={statusBadgeClass}
                    progressBarColor={progressBarColor}
                    insightText={insightText}
                    onAddClick={onAddClick}
                    onDeleteMeal={handleMealDelete}
                    onMealClick={setSelectedMealId}
                 />
            </div>

            {/* INCOMING VIEW */}
            {isAnimating && (
                 <div 
                    ref={incomingViewRef}
                    className="absolute inset-0 overflow-y-auto no-scrollbar w-full h-full bg-gray-50 z-10"
                    style={{ 
                        transform: 'translateX(100%)', // Default off-screen
                        willChange: 'transform'
                    }} 
                >
                    <DailyView 
                        isLoading={true} 
                        isEmpty={true}
                        isOffline={isOffline}
                        meals={[]}
                        totalKcal={0}
                        goalKcal={goalKcal}
                        percentage={0}
                        statusText="Loading"
                        statusBadgeClass="bg-gray-50"
                        progressBarColor="bg-gray-200"
                        insightText="..."
                        onAddClick={() => {}}
                        onDeleteMeal={() => {}}
                        onMealClick={() => {}}
                    />
                </div>
            )}
        </div>
      </DaySwipeLayer>

      {/* Details Sheet */}
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