import React, { useState, useEffect, useRef } from 'react';
import { Search, Camera, Check, Trash2, Edit2, AlertCircle, Plus, ScanLine, ArrowLeft, ScanBarcode, Keyboard, Sparkles, RotateCcw, Minus, ChevronDown, Calculator } from 'lucide-react';
import { SegmentedControl } from '../SegmentedControl';
import { Card } from '../Card';
import { Input } from '../Input';
import { Button } from '../Button';
import { BottomSheet } from '../BottomSheet';
import { api } from '../../services/api';
import { MealType, Product, SearchResult } from '../../types';

interface AddSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  isOffline?: boolean;
  initialMealType?: string;
}

// Helper to determine default meal type
const getTimeBasedMealType = (): MealType => {
  const hour = new Date().getHours();
  if (hour >= 4 && hour < 11) return 'Breakfast';
  if (hour >= 11 && hour < 16) return 'Lunch';
  if (hour >= 16 && hour < 22) return 'Dinner';
  return 'Snack';
};

// --- PHOTO MODAL SUB-COMPONENT ---
const PhotoModal = ({ onClose, onCapture, mode = 'food' }: { onClose: () => void, onCapture: () => void, mode?: 'food' | 'label' }) => (
  <div className="fixed inset-0 z-[60] bg-black flex flex-col animate-[fadeIn_0.2s_ease-out]">
    <div className="absolute top-0 left-0 right-0 p-4 pt-12 flex flex-col items-center justify-start z-20 pointer-events-none">
        <ChevronDown className="text-white/50 animate-bounce mb-1" size={24} />
        <span className="text-[10px] font-bold text-white/50 uppercase tracking-widest">Swipe down to close</span>
    </div>
    <div className="absolute top-4 right-4 z-30">
      <button onClick={onClose} className="p-3 bg-white/10 backdrop-blur-md rounded-full text-white hover:bg-white/20 transition-colors">
        <ArrowLeft size={24} />
      </button>
    </div>
    <div className="flex-1 flex flex-col items-center justify-center gap-6">
        <div className="w-72 h-72 border border-white/20 rounded-3xl flex items-center justify-center relative overflow-hidden bg-white/5">
            {mode === 'label' ? <ScanBarcode size={48} className="text-white/40 animate-pulse" /> : <ScanLine size={48} className="text-white/40 animate-pulse" />}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/5 to-transparent animate-[scan_3s_infinite]"></div>
        </div>
        <p className="text-white/60 font-medium tracking-wide">{mode === 'label' ? 'Align nutrition label' : 'Point at your food'}</p>
    </div>
    <div className="p-10 pb-16 flex justify-center">
      <button onClick={onCapture} className="w-20 h-20 rounded-full border-4 border-white/90 flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-2xl shadow-white/10">
        <div className="w-16 h-16 bg-white rounded-full" />
      </button>
    </div>
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
  const [detectedItems, setDetectedItems] = useState<any[]>([]); // Using 'any' for detected items as they have confidence props
  const [customMethod, setCustomMethod] = useState<'manual' | 'label'>('manual');
  const [customForm, setCustomForm] = useState({ name: '', brand: '', kcal: '', p: '', f: '', c: '' });
  
  // Edit State
  const [editingId, setEditingId] = useState<number | null>(null);
  const [advancedEditId, setAdvancedEditId] = useState<number | null>(null);
  const [advancedForm, setAdvancedForm] = useState({ k: '', p: '', f: '', c: '' });
  const editInputRef = useRef<HTMLInputElement>(null);
  
  // Status
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ id: number; item: Product; index: number } | null>(null);

  // Reset state on open
  useEffect(() => {
    if (isOpen) {
      setSheetView('main');
      setSearchQuery('');
      setSearchResults([]);
      setInputMethod('search');
      setDetectedItems([]);
      setProducts([]); // Start clean or load initials if needed
      setEditingId(null);
      setAdvancedEditId(null);
      setToast(null);
      setCustomForm({ name: '', brand: '', kcal: '', p: '', f: '', c: '' });
      setIsSaving(false);
      setSaveError(null);
      setMealType((initialMealType as MealType) || getTimeBasedMealType());
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

  // Auto-focus search
  useEffect(() => {
    if (isOpen && inputMethod === 'search' && sheetView === 'main' && !editingId) {
      const timer = setTimeout(() => searchInputRef.current?.focus(), 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen, inputMethod, sheetView, editingId]);

  // Auto-focus edit
  useEffect(() => {
    if (editingId && editInputRef.current) editInputRef.current.select();
  }, [editingId]);

  // --- LOGIC HELPERS ---

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
      // Mock detection result
      const mockDetected = [
        { id: Date.now() + 1, name: 'Grilled Chicken', grams: 150, base: { k: 165, p: 31, f: 3.6, c: 0 }, kcal: 248, confidence: 'High' },
        { id: Date.now() + 2, name: 'Steamed Broccoli', grams: 80, base: { k: 34, p: 2.8, f: 0.4, c: 7 }, kcal: 27, confidence: 'High' },
      ];
      setDetectedItems(mockDetected);
    } else {
      setCustomForm(prev => ({ ...prev, kcal: '120', p: '12', f: '0', c: '14' }));
    }
  };

  const handleAddDetectedItems = () => {
    // Transform detected items to Products
    const newProducts: Product[] = detectedItems.map(item => ({
      id: Date.now() + Math.random(),
      name: item.name,
      grams: item.grams,
      base: item.base,
      kcal: item.kcal,
      brand: 'Detected'
    }));
    setProducts(prev => [...prev, ...newProducts]);
    setDetectedItems([]);
  };

  const saveCustomProduct = () => {
    if (!customForm.name) return;
    const baseK = parseInt(customForm.kcal) || 0;
    const newProduct: Product = {
        id: Date.now(),
        name: customForm.name,
        brand: customForm.brand || 'Custom',
        grams: 100,
        base: { k: baseK, p: parseFloat(customForm.p)||0, f: parseFloat(customForm.f)||0, c: parseFloat(customForm.c)||0 },
        kcal: baseK
    };
    setProducts(prev => [...prev, newProduct]);
    setSheetView('main');
    setCustomForm({ name: '', brand: '', kcal: '', p: '', f: '', c: '' });
  };

  const updateGrams = (id: number, newGrams: number) => {
    if (newGrams < 0) newGrams = 0;
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

  const handleUndo = () => {
    if (!toast) return;
    setProducts(prev => {
      const newProducts = [...prev];
      newProducts.splice(toast.index, 0, toast.item);
      return newProducts;
    });
    setToast(null);
  };

  // Advanced Edit Logic
  const openAdvancedEdit = (product: Product) => {
    setAdvancedEditId(product.id);
    setAdvancedForm({ 
      k: product.base.k.toString(), 
      p: product.base.p.toString(), 
      f: product.base.f.toString(), 
      c: product.base.c.toString() 
    });
    setSheetView('edit_nutrition');
  };

  const saveAdvancedEdit = () => {
    if (advancedEditId === null) return;
    const newBase = { 
      k: parseInt(advancedForm.k)||0, 
      p: parseFloat(advancedForm.p)||0, 
      f: parseFloat(advancedForm.f)||0, 
      c: parseFloat(advancedForm.c)||0 
    };
    setProducts(prev => prev.map(p => {
      if (p.id !== advancedEditId) return p;
      return { ...p, base: newBase, kcal: calculateKcal(p.grams, newBase.k) };
    }));
    setSheetView('main');
    setAdvancedEditId(null);
  };

  const handleConfirm = async () => {
    if (products.length === 0 || products.some(p => !p.grams || p.grams <= 0)) return;
    if (isOffline) {
        setSaveError("No connection");
        setTimeout(() => setSaveError(null), 3000);
        return;
    }
    setIsSaving(true);
    setSaveError(null);
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

  // --- RENDER HELPERS ---
  
  let titleNode: React.ReactNode = initialMealType ? `Add to ${initialMealType}` : 'Add Meal';
  let leftActionNode: React.ReactNode = undefined;
  let footerNode: React.ReactNode = undefined;

  const isConfirmDisabled = products.length === 0 || products.some(p => !p.grams || p.grams <= 0) || isSaving;

  // View Routing for Header/Footer
  if (sheetView === 'main') {
      footerNode = (
        <div className="space-y-3">
             {saveError && (
                <div className="flex items-center justify-center gap-2 text-rose-500 text-xs font-semibold animate-pulse">
                    <AlertCircle size={14} />
                    <span>{saveError}</span>
                </div>
            )}
            <Button
                variant="primary"
                disabled={isConfirmDisabled}
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
      titleNode = (
          <div className="flex flex-col">
              <span className="text-xl font-bold text-gray-900">Edit Nutrition</span>
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Values per 100g</span>
          </div>
      );
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
                            
                            {searchQuery.length > 0 && searchResults.length === 0 && (
                                <div className="flex items-center justify-between p-3 bg-gray-50 border border-gray-100 rounded-xl">
                                    <span className="text-xs font-medium text-gray-500 pl-1">No results for "{searchQuery}"</span>
                                    <Button variant="secondary" size="sm" onClick={() => { setSheetView('custom'); setCustomForm(prev => ({ ...prev, name: searchQuery })); }}>
                                        + Add Custom
                                    </Button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="h-32 rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50 flex flex-col items-center justify-center gap-3 transition-colors hover:bg-gray-100 hover:border-gray-300">
                            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm text-blue-600"><Camera size={24} /></div>
                            <button onClick={() => { setPhotoMode('food'); setIsPhotoModalOpen(true); }} className="text-sm font-semibold text-blue-600">Tap to take photo</button>
                        </div>
                    )}
                </div>

                {detectedItems.length > 0 && (
                    <div className="mb-6 animate-[fadeIn_0.3s_ease-out]">
                        <div className="flex items-center justify-between mb-2 px-1">
                            <div className="flex items-center gap-2">
                                <Sparkles size={16} className="text-blue-600" />
                                <span className="text-xs font-bold text-blue-600 uppercase tracking-wide">Detected Items ({detectedItems.length})</span>
                            </div>
                            <span className="text-[10px] text-gray-400 font-medium">Swipe to remove</span>
                        </div>
                        <div className="space-y-3 mb-3">
                            {detectedItems.map(item => (
                                <div key={item.id} className="flex overflow-x-auto snap-x no-scrollbar rounded-2xl shadow-sm ring-1 ring-blue-50">
                                    <div className="w-full flex-shrink-0 snap-center bg-blue-50/50 rounded-2xl p-3.5 flex items-center justify-between pr-4 z-10">
                                        <div className="flex gap-4 items-center">
                                             <div className="w-10 h-10 bg-white rounded-xl flex-shrink-0 flex items-center justify-center text-xl shadow-sm">✨</div>
                                             <div>
                                                  <div className="font-semibold text-gray-900 text-sm mb-0.5">{item.name}</div>
                                                  <div className="text-xs text-blue-600 font-medium">{item.grams}g • {item.kcal} kcal</div>
                                              </div>
                                        </div>
                                         <div className="flex flex-col items-end">
                                            <span className="text-[10px] bg-white text-blue-600 px-1.5 py-0.5 rounded border border-blue-100 font-bold">{item.confidence === 'High' ? 'High Conf.' : 'Detected'}</span>
                                        </div>
                                    </div>
                                     <div className="w-[4.5rem] flex-shrink-0 snap-center bg-rose-500 flex items-center justify-center text-white cursor-pointer ml-[-1rem] pl-4 rounded-r-2xl" onClick={() => setDetectedItems(prev => prev.filter(i => i.id !== item.id))}>
                                        <Trash2 size={18} />
                                    </div>
                                </div>
                            ))}
                        </div>
                        <Button variant="primary" className="w-full" icon={<Plus size={18} strokeWidth={3} />} onClick={handleAddDetectedItems}>
                            Add Selected Items
                        </Button>
                    </div>
                )}

                {/* List Review */}
                <div className={`space-y-4 relative ${isOffline ? 'opacity-50' : ''}`}>
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Review List</span>
                        <span className="text-xs font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-md">{products.length}</span>
                    </div>
                    {products.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-10 text-gray-400 text-sm border-2 border-dashed border-gray-100 rounded-2xl bg-gray-50/30">
                            <span className="font-medium">No items added yet</span>
                        </div>
                    ) : (
                        products.map((product) => (
                            <div key={product.id} className="flex overflow-x-auto snap-x no-scrollbar rounded-2xl shadow-sm group">
                                <Card variant="compact" className={`w-full flex-shrink-0 snap-center z-10 transition-colors ${editingId === product.id ? 'ring-2 ring-blue-500 bg-blue-50/10' : 'active:bg-gray-50'}`} onClick={() => !editingId && !isSaving && setEditingId(product.id)}>
                                    <div className="flex justify-between items-start w-full mb-1">
                                        <div className="flex gap-4 items-center">
                                            <div className="w-12 h-12 bg-gray-50 rounded-xl flex-shrink-0 flex items-center justify-center text-2xl">🍎</div>
                                            <div>
                                                <div className="font-semibold text-gray-900 text-base mb-0.5">{product.name}</div>
                                                {editingId === product.id ? (
                                                    <div className="flex items-center gap-1 mt-1" onClick={e => e.stopPropagation()}>
                                                        <button className="w-7 h-7 flex items-center justify-center bg-gray-100 rounded-lg text-gray-600 active:bg-gray-200" onClick={() => updateGrams(product.id, product.grams - 5)}><Minus size={14} strokeWidth={3} /></button>
                                                        <div className="relative">
                                                            <Input variant="inline" ref={editInputRef} className="w-14" unit="g" type="number" value={product.grams === 0 ? '' : product.grams} onChange={(e) => updateGrams(product.id, parseInt(e.target.value) || 0)} onBlur={() => setEditingId(null)} onKeyDown={(e) => e.key === 'Enter' && setEditingId(null)} />
                                                        </div>
                                                        <button className="w-7 h-7 flex items-center justify-center bg-gray-100 rounded-lg text-gray-600 active:bg-gray-200" onClick={() => updateGrams(product.id, product.grams + 5)}><Plus size={14} strokeWidth={3} /></button>
                                                    </div>
                                                ) : (
                                                    <div className="text-xs text-gray-500 font-medium flex items-center gap-1.5 bg-gray-50 px-2 py-1 rounded-md w-fit transition-colors group-hover:bg-gray-100">{product.grams}g <Edit2 size={10} className="text-gray-400" /></div>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-end">
                                            <span className="font-bold text-gray-900 text-base">{product.kcal}</span>
                                            <span className="text-[10px] text-gray-400 font-medium uppercase">kcal</span>
                                        </div>
                                    </div>
                                    {editingId === product.id && (
                                        <div className="pl-[4rem] mt-2 animate-[fadeIn_0.2s_ease-out]">
                                            <button onClick={(e) => { e.stopPropagation(); openAdvancedEdit(product); }} className="flex items-center gap-1 text-[11px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-md hover:bg-blue-100 transition-colors">
                                                <Calculator size={12} /> Edit nutrition per 100g
                                            </button>
                                        </div>
                                    )}
                                </Card>
                                {!isOffline && !isSaving && (
                                    <div className="w-[4.5rem] flex-shrink-0 snap-center bg-rose-500 flex items-center justify-center text-white cursor-pointer ml-[-1rem] pl-4 rounded-r-2xl" onClick={() => handleDelete(product.id)}>
                                        <Trash2 size={20} />
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                    {toast && (
                        <div className="absolute bottom-2 left-2 right-2 bg-gray-900/95 backdrop-blur-md text-white px-4 py-3 rounded-xl shadow-xl flex items-center justify-between z-20 animate-[slideUp_0.2s_ease-out]">
                             <span className="text-sm font-medium">Item deleted</span>
                             <button onClick={handleUndo} className="text-blue-400 text-sm font-bold flex items-center gap-1.5 active:opacity-70 px-2 py-1 rounded hover:bg-white/10"><RotateCcw size={14} /> Undo</button>
                        </div>
                    )}
                </div>
            </>
        )}

        {sheetView === 'custom' && (
            <div className="space-y-4">
                 <div className="mb-6">
                    <SegmentedControl
                        value={customMethod}
                        onChange={(v) => setCustomMethod(v as 'manual' | 'label')}
                        disabled={isOffline}
                        options={[{ label: 'Manual', value: 'manual', icon: <Keyboard size={14} /> }, { label: 'Scan Label', value: 'label', icon: <ScanBarcode size={14} /> }]}
                    />
                </div>
                {customMethod === 'manual' ? (
                    <div className="space-y-4">
                         <div className="space-y-2">
                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider pl-1">Product Name</label>
                            <Input autoFocus placeholder="e.g. Grandma's Cookie" value={customForm.name} onChange={(e) => setCustomForm({...customForm, name: e.target.value})} />
                         </div>
                         <div className="space-y-2">
                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider pl-1">Brand (Optional)</label>
                            <Input placeholder="e.g. Homemade" value={customForm.brand} onChange={(e) => setCustomForm({...customForm, brand: e.target.value})} />
                         </div>
                         <div className="pt-2 grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider pl-1">Calories (per 100g)</label>
                                <Input type="number" unit="kcal" placeholder="0" value={customForm.kcal} onChange={(e) => setCustomForm({...customForm, kcal: e.target.value})} />
                            </div>
                         </div>
                         <div className="pt-2 grid grid-cols-3 gap-3">
                            {['p', 'f', 'c'].map((macro) => (
                                <div key={macro} className="space-y-2">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider text-center block">{macro === 'p' ? 'Protein' : macro === 'f' ? 'Fats' : 'Carbs'}</label>
                                    <Input type="number" unit="g" className="text-center" placeholder="0" value={customForm[macro as keyof typeof customForm]} onChange={(e) => setCustomForm({...customForm, [macro]: e.target.value})} />
                                </div>
                            ))}
                         </div>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-10 space-y-6">
                         <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center text-blue-600 animate-pulse"><ScanBarcode size={40} /></div>
                         <button className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-600/20">Open Camera</button>
                    </div>
                )}
            </div>
        )}

        {sheetView === 'edit_nutrition' && (
            <div className="space-y-6">
                 <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100">
                    <p className="text-sm text-blue-800 leading-relaxed font-medium">Changes affect only this item.</p>
                 </div>
                 <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider pl-1">Calories (kcal)</label>
                    <Input type="number" autoFocus unit="per 100g" value={advancedForm.k} onChange={(e) => setAdvancedForm({...advancedForm, k: e.target.value})} />
                 </div>
                 <div className="grid grid-cols-3 gap-3">
                    {['p', 'f', 'c'].map((macro) => (
                        <div key={macro} className="space-y-2">
                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider text-center block">{macro === 'p' ? 'Protein' : macro === 'f' ? 'Fats' : 'Carbs'}</label>
                            <Input type="number" unit="g" value={advancedForm[macro as keyof typeof advancedForm]} onChange={(e) => setAdvancedForm({...advancedForm, [macro]: e.target.value})} />
                        </div>
                    ))}
                 </div>
            </div>
        )}
      </BottomSheet>
    </>
  );
};
