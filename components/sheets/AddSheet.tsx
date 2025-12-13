import React, { useState, useEffect, useRef } from 'react';
import { Search, Camera, Check, Trash2, Edit2, AlertCircle, Plus, ArrowLeft, ScanBarcode, Keyboard, Sparkles, RotateCcw, Minus, Calculator } from 'lucide-react';
import { SegmentedControl } from '../SegmentedControl';
import { Card } from '../Card';
import { Input } from '../Input';
import { Button } from '../Button';
import { ValueTrigger } from '../ValueTrigger';
import { BottomSheet } from '../BottomSheet';
import { UniversalPicker } from '../UniversalPicker';
import { api } from '../../services/api';
import { MealType, Product, SearchResult } from '../../types';

interface AddSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  isOffline?: boolean;
  initialMealType?: string;
}

const PhotoModal = ({ onClose, onCapture, mode = 'food' }: { onClose: () => void, onCapture: () => void, mode?: 'food' | 'label' }) => (
    <div className="fixed inset-0 z-[60] bg-black flex flex-col items-center justify-center text-white">
        <button onClick={onClose} className="absolute top-4 right-4 p-4">Close</button>
        <div onClick={onCapture} className="w-20 h-20 bg-white rounded-full cursor-pointer" />
        <p className="mt-4">Tap to Capture (Mock)</p>
    </div>
);


export const AddSheet: React.FC<AddSheetProps> = ({ 
  isOpen, 
  onClose, 
  onSave, 
  isOffline = false,
  initialMealType
}) => {
  const [sheetView, setSheetView] = useState<'main' | 'custom' | 'edit_nutrition'>('main');
  const [mealType, setMealType] = useState<MealType>('Breakfast');
  const [inputMethod, setInputMethod] = useState<'search' | 'photo'>('search');
  const [products, setProducts] = useState<Product[]>([]);
  
  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Photo / Custom State
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
  const [photoMode, setPhotoMode] = useState<'food' | 'label'>('food');
  const [detectedItems, setDetectedItems] = useState<any[]>([]);
  const [customMethod, setCustomMethod] = useState<'manual' | 'label'>('manual');
  const [customForm, setCustomForm] = useState({ name: '', brand: '', kcal: 0, p: 0, f: 0, c: 0 });
  
  // Edit State
  const [advancedEditId, setAdvancedEditId] = useState<number | null>(null);
  const [advancedForm, setAdvancedForm] = useState({ k: 0, p: 0, f: 0, c: 0 });
  
  // Status
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ id: number; item: Product; index: number } | null>(null);

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

  // Reset state on open
  useEffect(() => {
    if (isOpen) {
      setSheetView('main');
      setSearchQuery('');
      setSearchResults([]);
      setInputMethod('search');
      setDetectedItems([]);
      setProducts([]); 
      setAdvancedEditId(null);
      setToast(null);
      setCustomForm({ name: '', brand: '', kcal: 0, p: 0, f: 0, c: 0 });
      setIsSaving(false);
      setSaveError(null);
      // Logic for meal type default omitted
    }
  }, [isOpen, initialMealType]);

  // Handle Search
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (searchQuery.trim().length > 0) {
        const results = await api.products.search(searchQuery);
        setSearchResults(results);
      } else {
        setSearchResults([]);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Logic Helpers
  const calculateKcal = (grams: number, baseKcal: number) => Math.round((grams / 100) * baseKcal);

  const handleAddProduct = (item: SearchResult) => {
    const totalKcal = calculateKcal(item.grams, item.base.k);
    const newProduct: Product = { ...item, id: Date.now(), kcal: totalKcal };
    setProducts(prev => [...prev, newProduct]);
    setSearchQuery('');
    setSearchResults([]);
  };

  const handlePhotoCapture = () => {
    setIsPhotoModalOpen(false);
    if (photoMode === 'food') {
      const mockDetected = [
        { id: Date.now() + 1, name: 'Grilled Chicken', grams: 150, base: { k: 165, p: 31, f: 3.6, c: 0 }, kcal: 248, confidence: 'High' },
      ];
      setDetectedItems(mockDetected);
    }
  };

  const saveCustomProduct = () => {
    if (!customForm.name) return;
    const newProduct: Product = {
        id: Date.now(),
        name: customForm.name,
        brand: customForm.brand || 'Custom',
        grams: 100,
        base: { k: customForm.kcal, p: customForm.p, f: customForm.f, c: customForm.c },
        kcal: customForm.kcal
    };
    setProducts(prev => [...prev, newProduct]);
    setSheetView('main');
    setCustomForm({ name: '', brand: '', kcal: 0, p: 0, f: 0, c: 0 });
  };

  const updateGrams = (id: number, newGrams: number) => {
    setProducts(prev => prev.map(p => {
      if (p.id !== id) return p;
      return { ...p, grams: newGrams, kcal: calculateKcal(newGrams, p.base.k) };
    }));
  };

  const handleDelete = (id: number) => {
    if (isOffline) return;
    const index = products.findIndex(p => p.id === id);
    if (index === -1) return;
    const itemToRemove = products[index];
    setProducts(prev => prev.filter(p => p.id !== id));
    setToast({ id, item: itemToRemove, index });
    setTimeout(() => setToast(current => (current?.id === id ? null : current)), 4000);
  };

  const openAdvancedEdit = (product: Product) => {
    setAdvancedEditId(product.id);
    setAdvancedForm({ 
      k: product.base.k, 
      p: product.base.p, 
      f: product.base.f, 
      c: product.base.c 
    });
    setSheetView('edit_nutrition');
  };

  const saveAdvancedEdit = () => {
    if (advancedEditId === null) return;
    const newBase = { ...advancedForm };
    setProducts(prev => prev.map(p => {
      if (p.id !== advancedEditId) return p;
      return { ...p, base: newBase, kcal: calculateKcal(p.grams, newBase.k) };
    }));
    setSheetView('main');
    setAdvancedEditId(null);
  };

  const handleConfirm = async () => {
    if (products.length === 0) return;
    setIsSaving(true);
    try {
        await api.meals.add({
          time: new Date().toLocaleTimeString('en-US', {hour: '2-digit', minute:'2-digit', hour12: false}),
          title: mealType,
          kcal: products.reduce((acc, p) => acc + p.kcal, 0),
          items: products
        });
        onSave(); 
    } catch (e) {
        setIsSaving(false);
        setSaveError("Failed to save.");
    }
  };

  let titleNode: React.ReactNode = initialMealType ? `Add to ${initialMealType}` : 'Add Meal';
  let leftActionNode: React.ReactNode = undefined;
  let footerNode: React.ReactNode = undefined;

  if (sheetView === 'main') {
      footerNode = (
        <div className="space-y-3">
            <Button
                variant="primary"
                disabled={products.length === 0 || isSaving}
                isLoading={isSaving}
                onClick={handleConfirm}
                className="w-full"
                icon={!isSaving && <Check size={22} strokeWidth={3} />}
            >
                Save Meal
            </Button>
        </div>
      );
  } else if (sheetView === 'custom') {
      titleNode = "New Product";
      leftActionNode = (
          <button onClick={() => setSheetView('main')} className="p-2 -ml-2 rounded-full hover:bg-gray-100 text-gray-600 transition-colors">
              <ArrowLeft size={24} />
          </button>
      );
      footerNode = (
          <Button variant="primary" className="w-full" disabled={!customForm.name} onClick={saveCustomProduct}>
              Add Product
          </Button>
      );
  } else if (sheetView === 'edit_nutrition') {
      titleNode = "Edit Nutrition";
      leftActionNode = (
          <button onClick={() => setSheetView('main')} className="p-2 -ml-2 rounded-full hover:bg-gray-100 text-gray-600 transition-colors">
              <ArrowLeft size={24} />
          </button>
      );
      footerNode = (
          <Button variant="primary" className="w-full" onClick={saveAdvancedEdit}>
              Save Changes
          </Button>
      );
  }

  const MEAL_OPTIONS = ['Breakfast', 'Lunch', 'Dinner', 'Snack'].map(type => ({ label: type, value: type }));

  return (
    <>
      {isPhotoModalOpen && <PhotoModal mode={photoMode} onClose={() => setIsPhotoModalOpen(false)} onCapture={handlePhotoCapture} />}

      <BottomSheet
        isOpen={isOpen}
        onClose={onClose}
        title={titleNode}
        leftAction={leftActionNode}
        footer={footerNode}
      >
        {sheetView === 'main' && (
            <>
                {!initialMealType && (
                    <div className="mb-6">
                        <SegmentedControl
                            value={mealType}
                            onChange={(val) => setMealType(val as MealType)}
                            disabled={isOffline}
                            options={MEAL_OPTIONS}
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

                            {searchResults.length > 0 && (
                                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-20 max-h-60 overflow-y-auto">
                                    {searchResults.map((item) => (
                                        <button key={item.id} onClick={() => handleAddProduct(item)} className="w-full text-left p-3.5 active:bg-gray-50 border-b border-gray-50 last:border-0 flex justify-between items-center group transition-colors">
                                            <div>
                                                <div className="font-semibold text-gray-900 text-sm">{item.name}</div>
                                                <div className="text-xs text-gray-500">{item.brand} • {item.grams}g</div>
                                            </div>
                                            <div className="w-6 h-6 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-blue-600 group-hover:text-white transition-all">
                                                <Plus size={14} />
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="h-32 rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50 flex flex-col items-center justify-center gap-3 transition-colors hover:bg-gray-100 hover:border-gray-300">
                             <span className="text-sm font-semibold text-blue-600">Camera Mock</span>
                        </div>
                    )}
                </div>

                {/* List Review */}
                <div className={`space-y-4 relative ${isOffline ? 'opacity-50' : ''}`}>
                    {products.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-10 text-gray-400 text-sm border-2 border-dashed border-gray-100 rounded-2xl bg-gray-50/30">
                            <span className="font-medium">No items added yet</span>
                        </div>
                    ) : (
                        products.map((product) => (
                            <div key={product.id} className="flex overflow-x-auto snap-x no-scrollbar rounded-2xl shadow-sm group">
                                <Card variant="compact" className={`w-full flex-shrink-0 snap-center z-10 transition-colors`}>
                                    <div className="flex justify-between items-start w-full mb-1">
                                        <div className="flex gap-4 items-center flex-1">
                                            <div className="w-12 h-12 bg-gray-50 rounded-xl flex-shrink-0 flex items-center justify-center text-2xl">🍎</div>
                                            <div className="flex-1">
                                                <div className="font-semibold text-gray-900 text-base mb-1">{product.name}</div>
                                                <ValueTrigger 
                                                    variant="inline"
                                                    value={product.grams}
                                                    unit="g"
                                                    onClick={() => openPicker(product.name, product.grams, 0, 5000, 5, 'g', (v) => updateGrams(product.id, v))}
                                                />
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-end">
                                            <span className="font-bold text-gray-900 text-base">{product.kcal}</span>
                                            <span className="text-[10px] text-gray-400 font-medium uppercase">kcal</span>
                                        </div>
                                    </div>
                                    <div className="pl-[4rem] mt-2">
                                        <button onClick={(e) => { e.stopPropagation(); openAdvancedEdit(product); }} className="flex items-center gap-1 text-[11px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-md hover:bg-blue-100 transition-colors">
                                            <Calculator size={12} /> Edit nutrition
                                        </button>
                                    </div>
                                </Card>
                                <div className="w-[4.5rem] flex-shrink-0 snap-center bg-rose-500 flex items-center justify-center text-white cursor-pointer ml-[-1rem] pl-4 rounded-r-2xl" onClick={() => handleDelete(product.id)}>
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
                            onClick={() => openPicker("Calories / 100g", customForm.kcal, 0, 1000, 50, 'kcal', (v) => setCustomForm({...customForm, kcal: v}))}
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
                    <p className="text-sm text-blue-800 leading-relaxed font-medium">Changes affect only this item.</p>
                 </div>
                 <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider pl-1">Calories (per 100g)</label>
                    <ValueTrigger 
                        value={advancedForm.k}
                        unit="kcal"
                        onClick={() => openPicker("Calories / 100g", advancedForm.k, 0, 1000, 50, 'kcal', (v) => setAdvancedForm({...advancedForm, k: v}))}
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
