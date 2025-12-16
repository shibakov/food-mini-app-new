import React, {
  useState,
  useRef,
  useEffect,
  useMemo,
  useCallback,
} from "react";
import { Minus, Plus, Edit2 } from "lucide-react";
import { Button } from "../components/Button";
import { BottomSheet } from "../components/BottomSheet";
import { PageHeader } from "../components/layout/PageHeader";
import { DaySwipeLayer } from "../components/layout/DaySwipeLayer";
import { DailyView } from "../components/DailyView";
import { UniversalPicker } from "../components/UniversalPicker";
import { ValueTrigger } from "../components/ValueTrigger";
import { api } from "../services/api";
import { AddSheetContext, DailyStats, Meal } from "../types";

interface MainScreenProps {
  onAddClick: (context?: AddSheetContext) => void;
  onEditMeal: (context: AddSheetContext) => void;
  onSettingsClick: () => void;
  isOffline: boolean;
  isEmpty: boolean;
  onDeleteMeal: () => void;
  setIsEmpty: (val: boolean) => void;
  setIsLoading: (val: boolean) => void;
  isLoading: boolean;
  dataVersion?: number;
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
  setIsLoading,
  dataVersion = 0,
}) => {
  // Data State - NOW USING STATS AS TRUTH
  const [stats, setStats] = useState<DailyStats | null>(null);
  const [goalKcal, setGoalKcal] = useState(2000);
  const [selectedMealId, setSelectedMealId] = useState<string | number | null>(
    null
  );
  const [selectedMeal, setSelectedMeal] = useState<Meal | null>(null);
  const [isMealLoading, setIsMealLoading] = useState(false);
  const [selectedDateIndex, setSelectedDateIndex] = useState(3);

  // Picker State
  const [pickerConfig, setPickerConfig] = useState<{
    isOpen: boolean;
    title: string;
    value: number;
    min: number;
    max: number;
    step: number;
    unit: string;
    onConfirm: (val: number) => void;
  }>({
    isOpen: false,
    title: "",
    value: 0,
    min: 0,
    max: 0,
    step: 1,
    unit: "",
    onConfirm: () => {},
  });

  const openPicker = (
    title: string,
    val: number,
    min: number,
    max: number,
    step: number,
    unit: string,
    onConfirm: (v: number) => void
  ) => {
    setPickerConfig({
      isOpen: true,
      title,
      value: val,
      min,
      max,
      step,
      unit,
      onConfirm,
    });
  };

  // Transition State
  const currentViewRef = useRef<HTMLDivElement>(null);
  const incomingViewRef = useRef<HTMLDivElement>(null);
  const [incomingDateIndex, setIncomingDateIndex] = useState<number | null>(
    null
  );
  const [isAnimating, setIsAnimating] = useState(false);

  const meals = stats?.meals || [];
  const selectedMealSummary =
    meals.find((m) => m.id === selectedMealId) || null;

  // Generate dates
  const calendarDates = useMemo(() => {
    const dates = [];
    const today = new Date();
    for (let i = -3; i <= 3; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      dates.push({
        day: d.toLocaleDateString("en-US", { weekday: "short" }),
        date: d.getDate(),
        isToday: i === 0,
        isFuture: i > 0,
        fullDate: d,
      });
    }
    return dates;
  }, []);

  const fetchData = useCallback(async () => {
    if (isOffline) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const targetDate = calendarDates[selectedDateIndex].fullDate;

      // Fetch Settings for Goal (Single source of truth)
      api.settings
        .get()
        .then((s) => setGoalKcal(s.calorieTarget))
        .catch(console.error);

      // Use gateway day endpoint as single source of truth
      const summary = await api.day.get(targetDate);
      setStats(summary);
      setIsEmpty(!summary.meals || summary.meals.length === 0);
    } catch (err) {
      console.error("Failed to fetch daily summary", err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedDateIndex, isOffline, setIsEmpty, setIsLoading, calendarDates]);

  // Fetch Data on Mount/Change or when dataVersion changes
  useEffect(() => {
    fetchData();
  }, [fetchData, dataVersion]);

  // Calculations (FROM BACKEND)
  // We strictly use values from `stats`.
  const totalKcal = stats?.totalKcal || 0;

  // Progress Calculation (UI Logic only)
  const percentage = Math.min((totalKcal / goalKcal) * 100, 100);

  // Macros from backend
  const macros = {
    p: stats?.protein || 0,
    f: stats?.fats || 0,
    c: stats?.carbs || 0,
  };

  let statusBadgeClass = "bg-emerald-50 text-emerald-700 border-emerald-100";
  let progressBarColor = "bg-emerald-500";
  let statusText = "On track";
  let insightText = "Daily calorie intake is within the target range.";

  if (stats?.status) {
    statusText = stats.status.label;
    insightText = stats.status.insight;
    if (stats.status.code === "over") {
      statusBadgeClass = "bg-rose-50 text-rose-700 border-rose-100";
      progressBarColor = "bg-rose-500";
    } else if (stats.status.code === "under") {
      statusBadgeClass = "bg-amber-50 text-amber-700 border-amber-100";
      progressBarColor = "bg-amber-400";
    }
  } else if (totalKcal > goalKcal + 50) {
    statusBadgeClass = "bg-rose-50 text-rose-700 border-rose-100";
    progressBarColor = "bg-rose-500";
    statusText = "Over limit";
    insightText = "Calories exceeded the upper tolerance range.";
  } else if (totalKcal < goalKcal - 400 && !isEmpty) {
    statusBadgeClass = "bg-amber-50 text-amber-700 border-amber-100";
    progressBarColor = "bg-amber-400";
    statusText = "Under target";
    insightText = "Calorie intake is below the daily target.";
  }

  // Handlers
  const handleMealClick = async (id: string | number) => {
    if (isOffline) return;
    setSelectedMealId(id);
    setIsMealLoading(true);
    setSelectedMeal(null);
    try {
      const full = await api.meals.get(id);
      setSelectedMeal(full);
    } catch (e) {
      console.error("Failed to load meal details", e);
    } finally {
      setIsMealLoading(false);
    }
  };

  const handleUpdateItemGrams = async (
    mealId: string | number,
    itemId: string | number,
    newGrams: number
  ) => {
    try {
      await api.meals.updateItem(mealId, itemId, { grams: newGrams });
      await fetchData(); // Refresh summary from backend

      // If the details sheet for this meal is open, refresh its data too
      if (selectedMealId === mealId) {
        try {
          const full = await api.meals.get(mealId);
          setSelectedMeal(full);
        } catch (err) {
          console.error("Failed to refresh meal details after update", err);
        }
      }
    } catch (e) {
      console.error("Failed to update grams", e);
    }
  };

  const handleMealDelete = async (id: string | number) => {
    try {
      await api.meals.delete(id);
      await fetchData(); // Refresh summary from backend
      if (selectedMealId === id) {
        setSelectedMealId(null);
        setSelectedMeal(null);
        setIsMealLoading(false);
      }
      onDeleteMeal();
    } catch (e) {
      console.error("Failed to delete meal", e);
    }
  };

  // --- TRANSITION LOGIC ---
  const handleSwipeStart = () => {
    if (currentViewRef.current)
      currentViewRef.current.style.transition = "none";
    if (incomingViewRef.current)
      incomingViewRef.current.style.transition = "none";
    setIsAnimating(true);
  };

  const handleSwipeProgress = (dx: number) => {
    if (!currentViewRef.current) return;
    currentViewRef.current.style.transform = `translateX(${dx}px)`;
    const direction = dx < 0 ? 1 : -1;
    const nextIndex = selectedDateIndex + direction;

    if (
      nextIndex < 0 ||
      nextIndex >= calendarDates.length ||
      calendarDates[nextIndex].isFuture
    ) {
      currentViewRef.current.style.transform = `translateX(${dx * 0.3}px)`;
      if (incomingViewRef.current) incomingViewRef.current.style.opacity = "0";
      return;
    }
    setIncomingDateIndex(nextIndex);
    if (incomingViewRef.current) {
      incomingViewRef.current.style.opacity = "1";
      const startX = direction === 1 ? "100%" : "-100%";
      incomingViewRef.current.style.transform = `translateX(calc(${startX} + ${dx}px))`;
    }
  };

  const handleSwipeEnd = (
    shouldSwitch: boolean,
    direction: "left" | "right"
  ) => {
    if (!currentViewRef.current) {
      setIsAnimating(false);
      return;
    }
    const transition = "transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)";
    currentViewRef.current.style.transition = transition;
    if (incomingViewRef.current)
      incomingViewRef.current.style.transition = transition;
    const targetIndex =
      incomingDateIndex !== null ? incomingDateIndex : selectedDateIndex;
    const isOutOfBounds =
      targetIndex < 0 ||
      targetIndex >= calendarDates.length ||
      calendarDates[targetIndex].isFuture;

    if (shouldSwitch && !isOutOfBounds && incomingDateIndex !== null) {
      const exitX = direction === "left" ? "-100%" : "100%";
      currentViewRef.current.style.transform = `translateX(${exitX})`;
      if (incomingViewRef.current) {
        incomingViewRef.current.style.transform = `translateX(0)`;
      }
      setTimeout(() => {
        setSelectedDateIndex(targetIndex);
        setIsAnimating(false);
        setIncomingDateIndex(null);
        if (currentViewRef.current) {
          currentViewRef.current.style.transition = "none";
          currentViewRef.current.style.transform = "";
        }
      }, 300);
    } else {
      currentViewRef.current.style.transform = `translateX(0)`;
      if (incomingViewRef.current) {
        const resetX = direction === "left" ? "100%" : "-100%";
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
                ? "bg-gray-900 text-white border-gray-900 shadow-md shadow-gray-900/10"
                : isDisabled
                ? "bg-transparent text-gray-300 border-transparent cursor-not-allowed"
                : "bg-white text-gray-400 border-gray-100 hover:border-gray-200"
            }`}
          >
            <span
              className={`text-[9px] font-bold uppercase tracking-wider mb-0.5 ${
                isSelected ? "text-gray-400" : ""
              }`}
            >
              {item.day}
            </span>
            <span className="text-lg font-bold tracking-tight leading-none">
              {item.date}
            </span>
            {item.isToday && !isSelected && (
              <div className="w-1 h-1 rounded-full bg-blue-500 mt-1" />
            )}
          </button>
        );
      })}
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-gray-50 font-sans text-gray-900 overflow-hidden">
      <PageHeader
        title={
          calendarDates[selectedDateIndex].isToday
            ? "Today"
            : calendarDates[selectedDateIndex].fullDate.toLocaleDateString(
                "en-US",
                { month: "short", day: "numeric" }
              )
        }
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
        disabled={selectedMealId !== null}
      >
        <div className="relative w-full h-full">
          <div
            ref={currentViewRef}
            className="absolute inset-0 overflow-y-auto no-scrollbar w-full h-full bg-gray-50"
            style={{ willChange: "transform" }}
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
              onAddClick={() =>
                onAddClick({ date: calendarDates[selectedDateIndex].fullDate })
              }
              onDeleteMeal={handleMealDelete}
              onMealClick={handleMealClick}
              macros={macros}
            />
          </div>
          {isAnimating && (
            <div
              ref={incomingViewRef}
              className="absolute inset-0 overflow-y-auto no-scrollbar w-full h-full bg-gray-50 z-10"
              style={{ transform: "translateX(100%)", willChange: "transform" }}
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
                macros={{ p: 0, f: 0, c: 0 }}
              />
            </div>
          )}
        </div>
      </DaySwipeLayer>

      {/* Details Sheet */}
      <BottomSheet
        isOpen={selectedMealId !== null}
        onClose={() => {
          setSelectedMealId(null);
          setSelectedMeal(null);
          setIsMealLoading(false);
        }}
        title={
          selectedMealSummary ? (
            <div className="flex flex-col">
              <div className="text-xl font-bold text-gray-900 tracking-tight">
                {selectedMealSummary.title}
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  {selectedMealSummary.time}
                </span>
                <span className="w-0.5 h-0.5 rounded-full bg-gray-300" />
                <span className="text-xs font-bold text-gray-900">
                  {selectedMealSummary.kcal} kcal
                </span>
              </div>
            </div>
          ) : undefined
        }
        footer={
          <Button
            variant="primary"
            onClick={() =>
              selectedMeal &&
              onEditMeal({
                date: calendarDates[selectedDateIndex].fullDate,
                meal: selectedMeal,
                defaultMealType: selectedMeal.type,
                defaultTime: selectedMeal.time,
              })
            }
            disabled={isOffline || isMealLoading || !selectedMeal}
            className="w-full"
            icon={<Plus size={20} />}
          >
            Add products
          </Button>
        }
      >
        {isMealLoading && (
          <div className="py-6 text-center text-xs text-gray-400">
            Loading meal...
          </div>
        )}
        {!isMealLoading && selectedMeal && (
          <div className="space-y-2">
            {selectedMeal.items.map((item) => {
              return (
                <div
                  key={item.id}
                  className="flex justify-between items-center p-4 rounded-2xl border border-gray-50 bg-white"
                >
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-gray-900">
                      {item.name}
                    </div>
                    <div className="mt-1">
                      <ValueTrigger
                        variant="inline"
                        value={item.grams}
                        unit="g"
                        onClick={() =>
                          openPicker(
                            item.name,
                            item.grams,
                            0,
                            5000,
                            5,
                            "g",
                            (v) =>
                              handleUpdateItemGrams(
                                selectedMeal.id,
                                item.item_id || item.id,
                                v
                              )
                          )
                        }
                        disabled={isOffline}
                      />
                    </div>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-sm font-bold text-gray-900">
                      {item.kcal}
                    </span>
                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">
                      kcal
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </BottomSheet>

      <UniversalPicker
        isOpen={pickerConfig.isOpen}
        onClose={() => setPickerConfig((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={pickerConfig.onConfirm}
        title={pickerConfig.title}
        value={pickerConfig.value}
        min={pickerConfig.min}
        max={pickerConfig.max}
        step={pickerConfig.step}
        unit={pickerConfig.unit}
      />
    </div>
  );
};

export default MainScreen;
