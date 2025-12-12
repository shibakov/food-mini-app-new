import React, { useState, useRef, useEffect } from 'react';
import { Settings, Trash2, Plus, X, Minus } from 'lucide-react';

interface MainScreenProps {
  onAddClick: () => void;
  onEditMeal: (mealType: string) => void;
  onSettingsClick: () => void;
  isLoading: boolean;
  isOffline: boolean;
  isEmpty: boolean;
  onDeleteMeal: () => void;
}

// Enhanced Mock Data
const MOCK_MEALS = [
  { 
    id: 1, 
    time: '08:00', 
    title: 'Breakfast', 
    kcal: 450, 
    items: [
        { id: 101, name: 'Oatmeal', grams: 50, kcal: 189 },
        { id: 102, name: 'Banana', grams: 120, kcal: 105 },
        { id: 103, name: 'Black Coffee', grams: 250, kcal: 5 }
    ] 
  },
  { 
    id: 2, 
    time: '13:30', 
    title: 'Lunch', 
    kcal: 820, 
    items: [
        { id: 201, name: 'Grilled Chicken Breast', grams: 200, kcal: 330 },
        { id: 202, name: 'Quinoa', grams: 150, kcal: 180 },
        { id: 203, name: 'Avocado', grams: 80, kcal: 128 },
        { id: 204, name: 'Olive Oil', grams: 10, kcal: 88 }
    ] 
  },
  { 
    id: 3, 
    time: '19:00', 
    title: 'Dinner', 
    kcal: 650, 
    items: [
        { id: 301, name: 'Salmon Fillet', grams: 180, kcal: 370 },
        { id: 302, name: 'Steamed Broccoli', grams: 150, kcal: 50 },
        { id: 303, name: 'White Rice', grams: 150, kcal: 195 }
    ] 
  },
];

const MainScreen: React.FC<MainScreenProps> = ({ 
  onAddClick,
  onEditMeal,
  onSettingsClick, 
  isLoading, 
  isOffline,
  isEmpty,
  onDeleteMeal 
}) => {
  // Local State for Meal Data
  const [meals, setMeals] = useState(MOCK_MEALS);
  
  // Navigation / Sheet State
  const [selectedMealId, setSelectedMealId] = useState<number | null>(null);
  const [selectedDateIndex, setSelectedDateIndex] = useState(3); // 3 is "Today"
  
  // Inline Editing State (inside Meal Details Sheet)
  const [editingItemId, setEditingItemId] = useState<number | null>(null);
  const editInputRef = useRef<HTMLInputElement>(null);

  const selectedMeal = meals.find(m => m.id === selectedMealId);

  // Auto-focus logic for inline edit
  useEffect(() => {
    if (editingItemId && editInputRef.current) {
        editInputRef.current.select();
    }
  }, [editingItemId]);

  // Generate Dates: 3 past, Today, 3 future
  const generateDates = () => {
    const dates = [];
    const today = new Date();
    for (let i = -3; i <= 3; i++) {
        const d = new Date(today);
        d.setDate(today.getDate() + i);
        dates.push({
            day: d.toLocaleDateString('en-US', { weekday: 'short' }), // "Mon"
            date: d.getDate(),
            isToday: i === 0,
            isFuture: i > 0,
            fullDate: d
        });
    }
    return dates;
  };
  const calendarDates = generateDates();

  // Data Logic
  const mealsToShow = isEmpty ? [] : meals;
  const totalKcal = mealsToShow.reduce((acc, curr) => acc + curr.kcal, 0);
  const goalKcal = 2000;
  const percentage = Math.min((totalKcal / goalKcal) * 100, 100);
  
  // Status Logic - Calm & Analytical
  let statusTextColor = 'text-green-600';
  let progressBarColor = 'bg-green-500';
  let statusText = 'On track';

  if (totalKcal > goalKcal + 50) {
      statusTextColor = 'text-orange-600';
      progressBarColor = 'bg-orange-500';
      statusText = 'Over limit';
  } else if (totalKcal < goalKcal - 400 && !isEmpty) {
      statusTextColor = 'text-blue-600';
      progressBarColor = 'bg-blue-500';
      statusText = 'Under target';
  }

  // -- Handlers --

  const updateItemGrams = (mealId: number, itemId: number, newGrams: number) => {
    if (newGrams < 0) newGrams = 0;
    setMeals(prev => prev.map(meal => {
        if (meal.id !== mealId) return meal;
        
        // Update specific item
        const updatedItems = meal.items.map(item => {
            if (item.id !== itemId) return item;
            const kcalPerGram = item.grams > 0 ? item.kcal / item.grams : 0;
            return { ...item, grams: newGrams, kcal: Math.round(newGrams * kcalPerGram) };
        });
        
        // Update meal total
        const newMealTotal = updatedItems.reduce((sum, i) => sum + i.kcal, 0);
        return { ...meal, items: updatedItems, kcal: newMealTotal };
    }));
  };

  return (
    <div className="flex flex-col min-h-full bg-gray-50 font-sans">
      
      {/* 1) Date Navigation (Sticky) */}
      <header className="sticky top-0 bg-white/90 backdrop-blur-xl z-30 border-b border-gray-200/50 shadow-sm transition-all pb-2">
        <div className="flex items-center justify-between px-5 py-3">
          <div className="flex flex-col">
            <span className="text-lg font-bold text-gray-900 tracking-tight">
               {calendarDates[selectedDateIndex].isToday ? 'Today' : calendarDates[selectedDateIndex].fullDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Daily Overview</span>
          </div>
          <button 
            onClick={onSettingsClick} 
            className="p-2 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 active:bg-gray-300 transition-all"
          >
            <Settings size={20} />
          </button>
        </div>
        
        {/* Horizontal Date Carousel */}
        <div className="flex px-5 space-x-2 overflow-x-auto no-scrollbar snap-x pb-1">
            {calendarDates.map((item, i) => {
                const isSelected = i === selectedDateIndex;
                const isDisabled = item.isFuture;
                
                return (
                    <button 
                        key={i} 
                        disabled={isDisabled}
                        onClick={() => setSelectedDateIndex(i)}
                        className={`flex-shrink-0 snap-center w-[46px] h-[64px] rounded-2xl flex flex-col items-center justify-center border transition-all duration-300 ${
                            isSelected 
                            ? 'bg-gray-900 text-white border-gray-900 shadow-lg shadow-gray-900/20 scale-105' 
                            : isDisabled 
                                ? 'bg-transparent text-gray-300 border-transparent cursor-not-allowed' 
                                : 'bg-white text-gray-500 border-gray-100'
                        }`}
                    >
                        <span className={`text-[10px] font-bold uppercase tracking-wider mb-0.5 ${isSelected ? 'text-gray-400' : ''}`}>{item.day}</span>
                        <span className="text-lg font-bold">{item.date}</span>
                        {item.isToday && !isSelected && <div className="w-1 h-1 rounded-full bg-blue-500 mt-1" />}
                    </button>
                );
            })}
        </div>
      </header>

      <div className="p-4 space-y-6 pb-24">
        
        {/* Loading Skeleton */}
        {isLoading && (
          <div className="space-y-4 animate-pulse">
            <div className="bg-white rounded-2xl h-56 w-full"></div>
            <div className="h-24 bg-white rounded-2xl w-full"></div>
          </div>
        )}

        {/* Content */}
        {!isLoading && (
          <>
            {/* 2) Summary Block - Calm & Analytical */}
            <section className="bg-white rounded-2xl p-5 border border-gray-200 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
                <div className="flex justify-between items-end mb-4">
                    <div className="flex flex-col gap-1">
                        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Calories</span>
                        <div className="flex items-baseline gap-1.5">
                            <span className={`text-3xl font-semibold tracking-tight ${isEmpty ? 'text-gray-300' : 'text-gray-900'}`}>
                                {isEmpty ? '0' : totalKcal.toLocaleString()}
                            </span>
                            <span className="text-base font-medium text-gray-400">/ {goalKcal}</span>
                        </div>
                    </div>
                    {!isEmpty && (
                        <span className={`text-sm font-medium mb-1.5 ${statusTextColor}`}>
                            {statusText}
                        </span>
                    )}
                </div>

                {/* Progress Bar */}
                <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden mb-5">
                    <div 
                        className={`h-full rounded-full transition-all duration-700 ease-out ${isEmpty ? 'bg-transparent' : progressBarColor}`} 
                        style={{ width: `${isEmpty ? 0 : percentage}%` }}
                    />
                </div>

                {/* Macros - Grams Primary, Percent Secondary */}
                <div className="flex justify-between pt-1">
                     {[
                        { label: 'Protein', val: isEmpty ? '-' : '140g', pct: '30%' },
                        { label: 'Fats', val: isEmpty ? '-' : '65g', pct: '25%' },
                        { label: 'Carbs', val: isEmpty ? '-' : '180g', pct: '45%' }
                     ].map((m, i) => (
                         <div key={i} className={`flex-1 flex flex-col ${i === 0 ? 'items-start' : i === 2 ? 'items-end' : 'items-center'}`}>
                             <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">{m.label}</span>
                             <div className="flex items-baseline gap-1">
                                <span className="text-sm font-bold text-gray-900">{m.val}</span>
                                <span className="text-[10px] text-gray-400 font-medium">{m.pct}</span>
                             </div>
                         </div>
                     ))}
                </div>
            </section>

            {/* 3) Daily Comment Block - Neutral & Analytical */}
            {!isEmpty && (
                <div className="px-1">
                    <p className="text-sm font-medium text-gray-600 leading-relaxed">
                        Daily protein intake is slightly below the target.
                    </p>
                </div>
            )}

            {/* 4) Meals Block */}
            <section className="space-y-3">
                <div className="flex items-center justify-between px-1">
                    <h2 className="text-lg font-bold text-gray-900 tracking-tight">Meals</h2>
                </div>

                {isEmpty ? (
                   // Empty State CTA
                   <button 
                      onClick={onAddClick}
                      disabled={isOffline}
                      className="w-full py-10 flex flex-col items-center justify-center space-y-3 text-center border-2 border-dashed border-gray-200 rounded-2xl bg-gray-50/50 hover:bg-gray-100 active:scale-[0.99] transition-all group"
                   >
                      <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm text-blue-500 group-hover:scale-110 transition-transform">
                        <Plus size={24} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-900">Log your first meal</p>
                        <p className="text-xs text-gray-400 mt-0.5">Start tracking today</p>
                      </div>
                   </button>
                ) : (
                   <div className="space-y-3">
                      {mealsToShow.map((meal) => {
                        const previewText = meal.items.map(i => i.name).slice(0, 3).join(', ') + (meal.items.length > 3 ? ', ...' : '');

                        return (
                          <div key={meal.id} className="relative">
                            
                            {/* Swipe Container for Delete */}
                            <div className={`flex overflow-x-auto no-scrollbar snap-x rounded-2xl ${isOffline ? 'pointer-events-none opacity-80' : ''}`}>
                                
                                {/* Meal Card - Flat, System-like, No Chevron */}
                                <div 
                                  className="w-full flex-shrink-0 snap-center bg-white border border-gray-200 rounded-2xl transition-all duration-200 z-10 overflow-hidden shadow-[0_1px_2px_rgba(0,0,0,0.02)] active:bg-gray-50"
                                  onClick={() => !isOffline && setSelectedMealId(meal.id)}
                                >
                                  <div className="p-4 flex justify-between items-center">
                                    <div className="flex-1 min-w-0 pr-4">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-xs font-semibold text-gray-500">{meal.time}</span>
                                            <h3 className="text-base font-bold text-gray-900 truncate">{meal.title}</h3>
                                        </div>
                                        <p className="text-sm text-gray-500 truncate">
                                            {previewText}
                                        </p>
                                    </div>
                                    <div className="flex flex-col items-end">
                                        <span className="text-base font-bold text-gray-900">{meal.kcal}</span>
                                        <span className="text-[10px] font-medium text-gray-400 uppercase">kcal</span>
                                    </div>
                                  </div>
                                </div>

                                {/* Swipe Action (Delete) */}
                                <div 
                                  className="w-[5rem] flex-shrink-0 snap-center bg-red-500 flex flex-col items-center justify-center ml-[-1rem] pl-4 rounded-r-2xl shadow-inner active:bg-red-600 transition-colors cursor-pointer z-0"
                                  onClick={onDeleteMeal}
                                >
                                    <Trash2 color="white" size={20} />
                                    <span className="text-white text-[10px] font-bold uppercase tracking-wider mt-1">Delete</span>
                                </div>
                            </div>
                          </div>
                        );
                      })}

                      {/* Contextual Add Meal Row - Subtle */}
                      <button 
                        onClick={onAddClick}
                        disabled={isOffline}
                        className={`w-full py-3.5 flex items-center justify-center gap-2 rounded-2xl border border-dashed border-gray-300 text-gray-500 hover:bg-gray-50 active:bg-gray-100 transition-all ${isOffline ? 'opacity-50' : ''}`}
                      >
                         <Plus size={16} />
                         <span className="text-sm font-semibold">Add Meal</span>
                      </button>
                   </div>
                )}
            </section>
          </>
        )}
      </div>

      {/* --- MEAL DETAILS BOTTOM SHEET --- */}
      {selectedMeal && (
        <>
            <div 
                className="fixed inset-0 bg-gray-900/20 backdrop-blur-sm z-[45] transition-opacity animate-[fadeIn_0.2s_ease-out]"
                onClick={() => setSelectedMealId(null)}
            />
            <div className="fixed bottom-0 left-0 right-0 bg-white rounded-t-[2rem] z-[46] p-6 pb-10 max-w-md mx-auto shadow-2xl animate-[slideUp_0.3s_cubic-bezier(0.16,1,0.3,1)] max-h-[85vh] flex flex-col">
                {/* Header */}
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h3 className="text-2xl font-bold text-gray-900">{selectedMeal.title}</h3>
                        <div className="flex items-center gap-2 mt-1">
                             <span className="text-xs font-bold text-gray-400 font-mono bg-gray-100 px-1.5 py-0.5 rounded">{selectedMeal.time}</span>
                             <span className="text-sm font-bold text-blue-600">{selectedMeal.kcal} kcal</span>
                        </div>
                    </div>
                    <button onClick={() => setSelectedMealId(null)} className="p-2 bg-gray-100 rounded-full text-gray-500 hover:bg-gray-200 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Product List */}
                <div className="flex-1 overflow-y-auto no-scrollbar space-y-3 mb-6">
                    {selectedMeal.items.map((item) => {
                         const isEditing = editingItemId === item.id;
                         return (
                            <div key={item.id} className={`flex justify-between items-center p-3 rounded-xl border transition-all ${isEditing ? 'border-blue-500 bg-blue-50/20' : 'border-gray-100'}`}>
                                <div className="flex-1" onClick={() => setEditingItemId(item.id)}>
                                    <div className="text-sm font-semibold text-gray-900">{item.name}</div>
                                    
                                    {isEditing ? (
                                        <div className="flex items-center gap-1 mt-1.5" onClick={e => e.stopPropagation()}>
                                            <button 
                                                className="w-6 h-6 flex items-center justify-center bg-gray-200 rounded text-gray-600 active:bg-gray-300"
                                                onClick={() => updateItemGrams(selectedMeal.id, item.id, item.grams - 5)}
                                            >
                                                <Minus size={12} />
                                            </button>
                                            <div className="relative">
                                                <input 
                                                    ref={editInputRef}
                                                    className="w-12 text-center font-bold text-gray-900 border-b border-blue-500 outline-none p-0 mx-1 bg-transparent text-sm"
                                                    type="number"
                                                    value={item.grams === 0 ? '' : item.grams}
                                                    onChange={(e) => updateItemGrams(selectedMeal.id, item.id, parseInt(e.target.value) || 0)}
                                                    onBlur={() => setEditingItemId(null)}
                                                    onKeyDown={(e) => e.key === 'Enter' && setEditingItemId(null)}
                                                />
                                            </div>
                                            <button 
                                                className="w-6 h-6 flex items-center justify-center bg-gray-200 rounded text-gray-600 active:bg-gray-300"
                                                onClick={() => updateItemGrams(selectedMeal.id, item.id, item.grams + 5)}
                                            >
                                                <Plus size={12} />
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                                            <span className="bg-gray-100 px-1.5 rounded text-gray-600 font-medium">{item.grams}g</span>
                                            <span className="text-[10px] text-gray-300">Tap to edit</span>
                                        </div>
                                    )}
                                </div>
                                <div className="flex flex-col items-end">
                                     <span className="text-sm font-bold text-gray-900">{item.kcal}</span>
                                     <span className="text-[10px] font-bold text-gray-400 uppercase">kcal</span>
                                </div>
                            </div>
                         );
                    })}
                </div>

                {/* Footer Action */}
                <button 
                    onClick={() => onEditMeal(selectedMeal.title)}
                    className="w-full h-14 bg-gray-900 text-white rounded-2xl font-bold text-lg shadow-xl shadow-gray-900/10 flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
                >
                    <Plus size={20} />
                    <span>Add products</span>
                </button>
            </div>
        </>
      )}

    </div>
  );
};

export default MainScreen;