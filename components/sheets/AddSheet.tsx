import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Search, Camera, Check, Trash2, ArrowLeft, Calculator } from 'lucide-react';
import { SegmentedControl } from '../SegmentedControl';
import { Card } from '../Card';
import { Input } from '../Input';
import { Button } from '../Button';
import { ValueTrigger } from '../ValueTrigger';
import { BottomSheet } from '../BottomSheet';
import { UniversalPicker } from '../UniversalPicker';
import { api } from '../../services/api';
import { AddSheetContext, MealType, NutritionBase, SearchResult } from '../../types';

interface AddSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  isOffline?: boolean;
  context: AddSheetContext | null;
}

type DraftItem = {
  draftId: string;
  productId?: string | number;
  itemId?: string | number;
  name: string;
  brand?: string;
  grams: number;
  base: NutritionBase;
  kcal: number;
};

const MEAL_OPTIONS: MealType[] = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];

const mealOptionsForUi = MEAL_OPTIONS.map(type => ({ label: type, value: type }));

function formatTime(date: Date): string {
  const h = date.getHours().toString().padStart(2, '0');
  const m = date.getMinutes().toString().padStart(2, '0');
  return `${h}:${m}`;
}

function mapMealTypeToBackend(type: MealType): 'breakfast' | 'lunch' | 'dinner' | 'snack' {
  return type.toLowerCase() as 'breakfast' | 'lunch' | 'dinner' | 'snack';
}

export const AddSheet: React.FC<AddSheetProps> = ({ 
  isOpen, 
  onClose, 
  onSave, 
  isOffline = false,
  context,
}) => {
  const [sheetView, setSheetView] = useState<'main' | 'custom' | 'edit_nutrition'>('main');
  const [mealType, setMealType] = useState<MealType>('Breakfast');
  const [inputMethod, setInputMethod] = useState<'search' | 'photo'>('search');
  const [items, setItems] = useState<DraftItem[]>([]);
  const originalItemsRef = useRef<DraftItem[]>([]);
  
  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Custom State
  const [customForm, setCustomForm] = useState({ name: '', brand: '', kcal: 0, p: 0, f: 0, c: 0 });
  
  // Edit State
  const [advancedEditId, setAdvancedEditId] = useState<string | null>(null);
  const [advancedForm, setAdvancedForm] = useState<NutritionBase>({ k: 0, p: 0, f: 0, c: 0 });
  
  // Status
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

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
  }>({ isOpen: false, title: '', value: 0, min: 0, max: 0, step: 1, unit: '', onConfirm: () => {} });

  const openPicker = (title: string, val: number, min: number, max: number, step: number, unit: string, onConfirm: (v: number) => void) => {
      setPickerConfig({ isOpen: true, title, value: val, min, max, step, unit, onConfirm });
  };

  const isEditingExistingMeal = !!context?.meal;
  const effectiveMealType: MealType = useMemo(() => {
    if (context?.defaultMealType) return context.defaultMealType;
    if (context?.meal?.type) return context.meal.type;
    return mealType;
  }, [context, mealType]);

  // Reset state on open / context change
  useEffect(() => {
    if (!isOpen) return;

    setSheetView('main');
    setSearchQuery('');
    setSearchResults([]);
    setInputMethod('search');
    setIsSaving(false);
    setSaveError(null);
    setCustomForm({ name: '', brand: '', kcal: 0, p: 0, f: 0, c: 0 });
    setAdvancedEditId(null);
    setAdvancedForm({ k: 0, p: 0, f: 0, c: 0 });

    const initialMealType: MealType = context?.defaultMealType || context?.meal?.type || 'Breakfast';
    setMealType(initialMealType);

    if (context?.meal) {
      const mappedItems: DraftItem[] = context.meal.items.map(item => ({
        draftId: String(item.item_id ?? item.id),
        productId: item.productId ?? item.id,
        itemId: item.item_id ?? item.id,
        name: item.name,
        brand: item.brand,
        grams: item.grams,
        base: item.base,
        kcal: item.kcal,
      }));
      setItems(mappedItems);
      originalItemsRef.current = mappedItems;
    } else {
      setItems([]);
      originalItemsRef.current = [];
    }
  }, [isOpen, context]);

  // Handle Search
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (searchQuery.trim().length > 0) {
        try {
            const results = await api.products.search(searchQuery);
            setSearchResults(results);
        } catch (e) {
            setSearchResults([]);
        }
      } else {
        setSearchResults([]);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const calculateKcal = (grams: number, baseKcal: number) => Math.round((grams / 100) * baseKcal);

  const handleAddProduct = (item: SearchResult) => {
    const draftId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const totalKcal = calculateKcal(item.grams, item.base.k);
    const newItem: DraftItem = {
      draftId,
      productId: item.id,
      name: item.name,
      brand: item.brand,
      grams: item.grams,
      base: item.base,
      kcal: totalKcal,
    };
    setItems(prev => [...prev, newItem]);
    setSearchQuery('');
    setSearchResults([]);
  };

  const saveCustomProduct = async () => {
    if (!customForm.name) return;
    setIsSaving(true);
    try {
        const res = await api.products.create({
          name: customForm.name,
          brand: customForm.brand || undefined,
          nutrition_per_100g: {
            calories: customForm.kcal,
            protein: customForm.p,
            fat: customForm.f,
            carbs: customForm.c,
          },
        });
        const productId = (res as any).id;

        const draftId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
        const newItem: DraftItem = {
          draftId,
          productId,
          name: customForm.name,
          brand: customForm.brand || 'Custom',
          grams: 100,
          base: { k: customForm.kcal, p: customForm.p, f: customForm.f, c: customForm.c },
          kcal: customForm.kcal,
        };
        setItems(prev => [...prev, newItem]);
        setSheetView('main');
        setCustomForm({ name: '', brand: '', kcal: 0, p: 0, f: 0, c: 0 });
    } catch (e) {
        console.error('Failed to create custom product', e);
    } finally {
        setIsSaving(false);
    }
  };

  const updateGrams = (draftId: string, newGrams: number) => {
    setItems(prev => prev.map(item => {
      if (item.draftId !== draftId) return item;
      return { ...item, grams: newGrams, kcal: calculateKcal(newGrams, item.base.k) };
    }));
  };

  const handleDelete = (draftId: string) => {
    setItems(prev => prev.filter(item => item.draftId !== draftId));
  };

  const openAdvancedEdit = (item: DraftItem) => {
    setAdvancedEditId(item.draftId);
    setAdvancedForm({ 
      k: item.base.k, 
      p: item.base.p, 
      f: item.base.f, 
      c: item.base.c,
    });
    setSheetView('edit_nutrition');
  };

  const saveAdvancedEdit = () => {
    if (!advancedEditId) return;
    const newBase = { ...advancedForm };
    setItems(prev => prev.map(item => {
      if (item.draftId !== advancedEditId) return item;
      return { ...item, base: newBase, kcal: calculateKcal(item.grams, newBase.k) };
    }));
    setSheetView('main');
    setAdvancedEditId(null);
  };

  const handleConfirm = async () => {
    if (items.length === 0 || isOffline) return;
    setIsSaving(true);
    setSaveError(null);

    try {
      const date = context?.date ?? new Date();
      const dateStr = date.toISOString().split('T')[0];
      const backendMealType = mapMealTypeToBackend(effectiveMealType);
      const timeStr = context?.defaultTime || formatTime(new Date());

      if (!isEditingExistingMeal) {
        // Create new meal then add items
        const { meal_id } = await api.meals.create({
          date: dateStr,
          meal_type: backendMealType,
          meal_time: timeStr,
        });

        const promises = items.map(item => {
          if (!item.productId) return Promise.resolve();
          return api.meals.addItem(meal_id, {
            product_id: item.productId,
            grams: item.grams,
          });
        });

        await Promise.all(promises);
      } else if (context?.meal) {
        // Edit existing meal: diff items
        const mealId = context.meal.id;

        const originalById = new Map(
          originalItemsRef.current
            .filter(i => i.itemId != null)
            .map(i => [i.itemId as string | number, i])
        );

        const currentById = new Map(
          items
            .filter(i => i.itemId != null)
            .map(i => [i.itemId as string | number, i])
        );

        const ops: Promise<any>[] = [];

        // Deletes
        for (const [itemId] of originalById) {
          if (!currentById.has(itemId)) {
            ops.push(api.meals.deleteItem(mealId, itemId));
          }
        }

        // Updates
        for (const [itemId, current] of currentById) {
          const original = originalById.get(itemId);
          if (original && original.grams !== current.grams) {
            ops.push(api.meals.updateItem(mealId, itemId, { grams: current.grams }));
          }
        }

        // New items
        for (const item of items) {
          if (!item.itemId && item.productId) {
            ops.push(
              api.meals.addItem(mealId, {
                product_id: item.productId,
                grams: item.grams,
              })
            );
          }
        }

        if (ops.length) {
          await Promise.all(ops);
        }
      }

      onSave();
    } catch (e: any) {
      console.error('Failed to save meal', e);
      setSaveError(e?.message || 'Failed to save.');
      setIsSaving(false);
    }
  };

  const showMealTypeSelector = !context?.defaultMealType && !context?.meal;

  let titleNode: React.ReactNode = isEditingExistingMeal
    ? `Add to ${context?.meal?.title || context?.defaultMealType || 'Meal'}`
    : 'Add Meal';
  let leftActionNode: React.ReactNode = undefined;
  let footerNode: React.ReactNode = undefined;

  if (sheetView === 'main') {
      footerNode = (
        <div className="space-y-3">
            <Button
                variant="primary"
                disabled={items.length === 0 || isSaving || isOffline}
                isLoading={isSaving}
                onClick={handleConfirm}
                className="w-full"
                icon={!isSaving && <Check size={22} strokeWidth={3} />}
            >
                Save Meal
            </Button>
            {saveError && <div className="text-center text-xs text-rose-500 font-bold">{saveError}</div>}
        </div>
      );
  } else if (sheetView === 'custom') {
      titleNode = 'New Product';
      leftActionNode = (
          <button onClick={() => setSheetView('main')} className="p-2 -ml-2 rounded-full hover:bg-gray-100 text-gray-600 transition-colors">
              <ArrowLeft size={24} />
          </button>
      );
      footerNode = (
          <Button variant="primary" className="w-full" disabled={!customForm.name || isSaving} isLoading={isSaving} onClick={saveCustomProduct}>
              Add Product
          </Button>
      );
  } else if (sheetView === 'edit_nutrition') {
      titleNode = 'Edit Nutrition';
      leftActionNode = (
          <button onClick={() => setSheetView('main')} className="p-2 -ml-2 rounded-full hover:bg-gray-100 text-gray-600 transition-colors">
              <ArrowLeft size={24} />
          </button>
      );
      footerNode = (
          <Button variant="primary" className="w-full" onClick={saveAdvancedEdit}>
              Confirm Local Changes
          </Button>
      );
  }

  return (
    <>
      <BottomSheet
        isOpen={isOpen}
        onClose={onClose}
        title={titleNode}
        leftAction={leftActionNode}
        footer={footerNode}
      >
        {sheetView === 'main' && (
            <>
                {showMealTypeSelector && (
                    <div className="mb-6">
                        <SegmentedControl
                            value={mealType}
                            onChange={(val) => setMealType(val as MealType)}
                            disabled={isOffline}
                            options={mealOptionsForUi}
                        />
                    </div>
                )}

                <div className="mb-6">
                    <SegmentedControl
                        value={inputMethod}
                        onChange={(v) => setInputMethod(v as 'search' | 'photo')}
                        disabled={isOffline}
                        options={[
                            { label: 'Search', value: 'search', icon: <Search size={14} /> },
                            { label: 'Photo', value: 'photo', icon: <Camera size={14} /> }
                        ]}
                    />
                </div>

                <div className="mb-6 relative">
                    {inputMethod === 'search' ? (
                        <div className={`space-y-3 ${isOffline ? 'opacity-50 pointer-events-none' : ''}`}>
                            <Input 
                                ref={searchInputRef}
                                icon={<Search size={20} />}
                                placeholder="Type food name..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                disabled={isOffline}
                            />
                            {/* Create Custom Prompt */}
                            {!searchQuery && (
                                <button onClick={() => setSheetView('custom')} className="w-full py-3 text-sm font-semibold text-blue-600 bg-blue-50 rounded-xl hover:bg-blue-100 transition-colors">
                                    + Create Custom Product
                                </button>
                            )}

                            {searchResults.length > 0 && (
                                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-20 max-h-60 overflow-y-auto">
                                    {searchResults.map((item) => (
                                        <button key={item.id} onClick={() => handleAddProduct(item)} className="w-full text-left p-3.5 active:bg-gray-50 border-b border-gray-50 last:border-0 flex justify-between items-center group transition-colors">
                                            <div>
                                                <div className="font-semibold text-gray-900 text-sm">{item.name}</div>
                                                <div className="text-xs text-gray-500">{item.brand} • {item.grams}g</div>
                                            </div>
                                            <div className="w-6 h-6 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-blue-600 group-hover:text-white transition-all">
                                                <Check size={14} />
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="h-32 rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50 flex flex-col items-center justify-center gap-3">
                             <span className="text-sm font-semibold text-gray-400">Photo feature unavailable offline or requires backend support.</span>
                        </div>
                    )}
                </div>

                {/* List Review */}
                <div className={`space-y-4 relative ${isOffline ? 'opacity-50' : ''}`}>
                    {items.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-10 text-gray-400 text-sm border-2 border-dashed border-gray-100 rounded-2xl bg-gray-50/30">
                            <span className="font-medium">No items added yet</span>
                        </div>
                    ) : (
                        items.map((item) => (
                            <div key={item.draftId} className="flex overflow-x-auto snap-x no-scrollbar rounded-2xl shadow-sm group">
                                <Card variant="compact" className={`w-full flex-shrink-0 snap-center z-10 transition-colors`}>
                                    <div className="flex justify-between items-start w-full mb-1">
                                        <div className="flex gap-4 items-center flex-1">
                                            <div className="w-12 h-12 bg-gray-50 rounded-xl flex-shrink-0 flex items-center justify-center text-2xl">🍎</div>
                                            <div className="flex-1">
                                                <div className="font-semibold text-gray-900 text-base mb-1">{item.name}</div>
                                                <ValueTrigger 
                                                    variant="inline"
                                                    value={item.grams}
                                                    unit="g"
                                                    onClick={() => openPicker(item.name, item.grams, 0, 5000, 5, 'g', (v) => updateGrams(item.draftId, v))}
                                                />
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-end">
                                            <span className="font-bold text-gray-900 text-base">{item.kcal}</span>
                                            <span className="text-[10px] text-gray-400 font-medium uppercase">kcal</span>
                                        </div>
                                    </div>
                                    <div className="pl-[4rem] mt-2">
                                        <button onClick={(e) => { e.stopPropagation(); openAdvancedEdit(item); }} className="flex items-center gap-1 text-[11px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-md hover:bg-blue-100 transition-colors">
                                            <Calculator size={12} /> Edit nutrition
                                        </button>
                                    </div>
                                </Card>
                                <div className="w-[4.5rem] flex-shrink-0 snap-center bg-rose-500 flex items-center justify-center text-white cursor-pointer ml-[-1rem] pl-4 rounded-r-2xl" onClick={() => handleDelete(item.draftId)}>
                                    <Trash2 size={20} />
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </>
        )}

        {sheetView === 'custom' && (
            <div className="space-y-4">
                 <div className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider pl-1">Product Name</label>
                        <Input autoFocus placeholder="e.g. Grandma's Cookie" value={customForm.name} onChange={(e) => setCustomForm({...customForm, name: e.target.value})} />
                    </div>
                    
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider pl-1">Calories (per 100g)</label>
                        <ValueTrigger 
                            value={customForm.kcal} 
                            unit="kcal" 
                            onClick={() => openPicker('Calories / 100g', customForm.kcal, 0, 1000, 50, 'kcal', (v) => setCustomForm({...customForm, kcal: v}))}
                        />
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                        {['p', 'f', 'c'].map((macro) => (
                            <div key={macro} className="space-y-2">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider text-center block">{macro === 'p' ? 'Protein' : macro === 'f' ? 'Fats' : 'Carbs'}</label>
                                <ValueTrigger 
                                    variant="compact"
                                    className="justify-center"
                                    value={customForm[macro as 'p'|'f'|'c']}
                                    unit="g"
                                    onClick={() => openPicker(macro.toUpperCase(), customForm[macro as 'p'|'f'|'c'], 0, 100, 5, 'g', (v) => setCustomForm({...customForm, [macro]: v}))}
                                />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        )}

        {sheetView === 'edit_nutrition' && (
            <div className="space-y-6">
                 <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100">
                    <p className="text-sm text-blue-800 leading-relaxed font-medium">Changes affect this item in the draft list only.</p>
                 </div>
                 <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider pl-1">Calories (per 100g)</label>
                    <ValueTrigger 
                        value={advancedForm.k}
                        unit="kcal"
                        onClick={() => openPicker('Calories / 100g', advancedForm.k, 0, 1000, 50, 'kcal', (v) => setAdvancedForm({...advancedForm, k: v}))}
                    />
                 </div>
                 <div className="grid grid-cols-3 gap-3">
                    {['p', 'f', 'c'].map((macro) => (
                        <div key={macro} className="space-y-2">
                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider text-center block">{macro === 'p' ? 'Protein' : macro === 'f' ? 'Fats' : 'Carbs'}</label>
                             <ValueTrigger 
                                    variant="compact"
                                    className="justify-center"
                                    value={advancedForm[macro as 'p'|'f'|'c']}
                                    unit="g"
                                    onClick={() => openPicker(macro.toUpperCase(), advancedForm[macro as 'p'|'f'|'c'], 0, 100, 5, 'g', (v) => setAdvancedForm({...advancedForm, [macro]: v}))}
                                />
                        </div>
                    ))}
                 </div>
            </div>
        )}
      </BottomSheet>

      <UniversalPicker 
        isOpen={pickerConfig.isOpen}
        onClose={() => setPickerConfig(prev => ({ ...prev, isOpen: false }))}
        onConfirm={pickerConfig.onConfirm}
        title={pickerConfig.title}
        value={pickerConfig.value}
        min={pickerConfig.min}
        max={pickerConfig.max}
        step={pickerConfig.step}
        unit={pickerConfig.unit}
      />
    </>
  );
};
