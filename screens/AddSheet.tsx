import React, { useState, useEffect, useRef } from 'react';
import { X, Search, Camera, Check, Trash2, Edit2, AlertCircle, Plus, ScanLine, ArrowLeft, ScanBarcode, Keyboard, Sparkles, RotateCcw, Minus, ChevronRight, Calculator, Loader2 } from 'lucide-react';

interface AddSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  isOffline?: boolean;
  initialMealType?: string;
}

// Mock Data Structure:
// grams: current amount
// base: nutrition per 100g { k: kcal, p: protein, f: fat, c: carbs }
const SEARCH_DB = [
  { id: 201, name: 'Apple', brand: 'Generic', grams: 150, base: { k: 52, p: 0.3, f: 0.2, c: 14 } },
  { id: 202, name: 'Apple Juice', brand: 'Tropicana', grams: 250, base: { k: 46, p: 0.1, f: 0.1, c: 11 } },
  { id: 203, name: 'Apricot', brand: 'Generic', grams: 35, base: { k: 48, p: 1.4, f: 0.4, c: 11 } },
  { id: 204, name: 'Banana', brand: 'Chiquita', grams: 118, base: { k: 89, p: 1.1, f: 0.3, c: 23 } },
  { id: 205, name: 'Bagel', brand: 'Store Brand', grams: 95, base: { k: 250, p: 10, f: 1.5, c: 49 } },
  { id: 206, name: 'Greek Yogurt', brand: 'Chobani', grams: 150, base: { k: 59, p: 10, f: 0.4, c: 3.6 } },
  { id: 207, name: 'Oatmeal', brand: 'Quaker', grams: 40, base: { k: 379, p: 13, f: 6.5, c: 67 } },
];

const INITIAL_PRODUCTS = [
  { id: 101, name: 'Banana', brand: 'Generic', grams: 118, base: { k: 89, p: 1.1, f: 0.3, c: 23 }, kcal: 105 },
];

const MEAL_TYPES = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];

const getTimeBasedMealType = () => {
  const hour = new Date().getHours();
  if (hour >= 4 && hour < 11) return 'Breakfast';
  if (hour >= 11 && hour < 16) return 'Lunch';
  if (hour >= 16 && hour < 22) return 'Dinner';
  return 'Snack';
};

// Mock Photo Modal Component
const PhotoModal = ({ onClose, onCapture, mode = 'food' }: { onClose: () => void, onCapture: () => void, mode?: 'food' | 'label' }) => (
  <div className="fixed inset-0 z-[60] bg-black flex flex-col animate-[fadeIn_0.2s_ease-out]">
    <div className="absolute top-0 left-0 right-0 p-4 flex justify-end z-10">
      <button onClick={onClose} className="p-2 bg-gray-900/50 backdrop-blur-md rounded-full text-white">
        <X size={24} />
      </button>
    </div>
    <div className="flex-1 flex flex-col items-center justify-center gap-4">
        <div className="w-64 h-64 border-2 border-white/30 rounded-3xl flex items-center justify-center relative overflow-hidden">
            {mode === 'label' ? <ScanBarcode size={48} className="text-white/50 animate-pulse" /> : <ScanLine size={48} className="text-white/50 animate-pulse" />}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/5 to-transparent animate-[scan_2s_infinite]"></div>
        </div>
        <p className="text-white/70 font-medium">{mode === 'label' ? 'Align nutrition label' : 'Point at your food'}</p>
    </div>
    <div className="p-10 pb-16 flex justify-center bg-gradient-to-t from-black/80 to-transparent">
      <button 
        onClick={onCapture} 
        className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center hover:scale-105 active:scale-95 transition-all"
      >
        <div className="w-16 h-16 bg-white rounded-full" />
      </button>
    </div>
  </div>
);

const AddSheet: React.FC<AddSheetProps> = ({ 
  isOpen, 
  onClose, 
  onSave, 
  isOffline = false,
  initialMealType
}) => {
  // Views: 'main' | 'custom' (new product) | 'edit_nutrition' (existing product advanced edit)
  const [sheetView, setSheetView] = useState<'main' | 'custom' | 'edit_nutrition'>('main');
  
  // Main View States
  const [mealType, setMealType] = useState('Breakfast');
  const [inputMethod, setInputMethod] = useState<'search' | 'photo'>('search');
  const [products, setProducts] = useState(INITIAL_PRODUCTS);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<typeof SEARCH_DB>([]);
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
  const [photoMode, setPhotoMode] = useState<'food' | 'label'>('food');

  // Review List States (Editing & Undo)
  const [editingId, setEditingId] = useState<number | null>(null);
  const [toast, setToast] = useState<{ id: number; item: any; index: number } | null>(null);
  const editInputRef = useRef<HTMLInputElement>(null);

  // Advanced Edit States (For existing items)
  const [advancedEditId, setAdvancedEditId] = useState<number | null>(null);
  const [advancedForm, setAdvancedForm] = useState({ k: '', p: '', f: '', c: '' });

  // Photo Recognition States (Staging Area)
  const [detectedItems, setDetectedItems] = useState<any[]>([]);
  const [recognitionState, setRecognitionState] = useState<'idle' | 'success' | 'empty'>('idle');

  // Custom Product View States (New Item)
  const [customMethod, setCustomMethod] = useState<'manual' | 'label'>('manual');
  const [customForm, setCustomForm] = useState({ name: '', brand: '', kcal: '', p: '', f: '', c: '' });

  // Save / Confirm Logic States
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Reset states when opened
  useEffect(() => {
    if (isOpen) {
      setSheetView('main');
      setSearchQuery('');
      setSearchResults([]);
      setInputMethod('search');
      setDetectedItems([]);
      setRecognitionState('idle');
      setEditingId(null);
      setAdvancedEditId(null);
      setToast(null);
      setCustomForm({ name: '', brand: '', kcal: '', p: '', f: '', c: '' });
      setIsSaving(false);
      setSaveError(null);
      
      if (initialMealType) {
        setMealType(initialMealType);
      } else {
        setMealType(getTimeBasedMealType());
      }
    }
  }, [isOpen, initialMealType]);

  // Search Logic
  useEffect(() => {
    if (searchQuery.trim().length > 0) {
      const results = SEARCH_DB.filter(item => 
        item.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setSearchResults(results);
    } else {
      setSearchResults([]);
    }
  }, [searchQuery]);

  // Auto-focus logic for search
  useEffect(() => {
    if (isOpen && inputMethod === 'search' && sheetView === 'main' && !editingId) {
      const timer = setTimeout(() => {
        searchInputRef.current?.focus();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen, inputMethod, sheetView, editingId]);

  // Auto-focus logic for inline edit
  useEffect(() => {
    if (editingId && editInputRef.current) {
        editInputRef.current.select();
    }
  }, [editingId]);

  if (!isOpen) return null;

  // -- Helper: Calculate total kcal from grams and base --
  const calculateKcal = (grams: number, baseKcal: number) => Math.round((grams / 100) * baseKcal);

  // -- Handlers --

  const handleAddProduct = (item: typeof SEARCH_DB[0]) => {
    const totalKcal = calculateKcal(item.grams, item.base.k);
    const newProduct = { 
        ...item, 
        id: Date.now(),
        kcal: totalKcal // Store current total
    };
    setProducts(prev => [...prev, newProduct]);
    setSearchQuery('');
    setSearchResults([]);
  };

  const openFoodScanner = () => {
    setPhotoMode('food');
    setIsPhotoModalOpen(true);
  };

  const handlePhotoCapture = () => {
      setIsPhotoModalOpen(false);
      
      if (photoMode === 'food') {
          // Simulate detected items with base values
          const mockDetected = [
              { id: Date.now() + 1, name: 'Grilled Chicken', grams: 150, base: { k: 165, p: 31, f: 3.6, c: 0 }, kcal: 248, confidence: 'High' },
              { id: Date.now() + 2, name: 'Steamed Broccoli', grams: 80, base: { k: 34, p: 2.8, f: 0.4, c: 7 }, kcal: 27, confidence: 'High' },
          ];
          
          if (mockDetected.length > 0) {
              setDetectedItems(mockDetected);
              setRecognitionState('success');
          } else {
              setRecognitionState('empty');
          }
      } else {
          // Custom flow: Pre-fill form from label
          setCustomForm(prev => ({ ...prev, kcal: '120', p: '12', f: '0', c: '14' }));
      }
  };

  const handleAddDetectedItems = () => {
      const itemsToAdd = detectedItems.map(item => ({
          ...item,
          id: Date.now() + Math.random()
      }));
      setProducts(prev => [...prev, ...itemsToAdd]);
      setDetectedItems([]);
      setRecognitionState('idle');
  };

  const removeDetectedItem = (id: number) => {
      setDetectedItems(prev => prev.filter(i => i.id !== id));
      if (detectedItems.length <= 1) setRecognitionState('idle');
  };

  const saveCustomProduct = () => {
      if (!customForm.name) return;
      const baseK = parseInt(customForm.kcal) || 0;
      const baseP = parseFloat(customForm.p) || 0;
      const baseF = parseFloat(customForm.f) || 0;
      const baseC = parseFloat(customForm.c) || 0;
      
      const newProduct = {
          id: Date.now(),
          name: customForm.name,
          brand: customForm.brand || 'Custom',
          grams: 100, // Default 100g for custom
          base: { k: baseK, p: baseP, f: baseF, c: baseC },
          kcal: baseK
      };
      
      setProducts(prev => [...prev, newProduct]);
      setSheetView('main');
      setCustomForm({ name: '', brand: '', kcal: '', p: '', f: '', c: '' });
  };

  // Review List & Inline Edit Handlers
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

  const updateGrams = (id: number, newGrams: number) => {
    if (newGrams < 0) newGrams = 0;
    setProducts(prev => prev.map(p => {
        if (p.id !== id) return p;
        return {
            ...p,
            grams: newGrams,
            kcal: calculateKcal(newGrams, p.base.k)
        };
    }));
  };

  const openAdvancedEdit = (product: any) => {
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
          k: parseInt(advancedForm.k) || 0,
          p: parseFloat(advancedForm.p) || 0,
          f: parseFloat(advancedForm.f) || 0,
          c: parseFloat(advancedForm.c) || 0
      };

      setProducts(prev => prev.map(p => {
          if (p.id !== advancedEditId) return p;
          return {
              ...p,
              base: newBase,
              kcal: calculateKcal(p.grams, newBase.k)
          };
      }));
      
      setSheetView('main');
      setAdvancedEditId(null);
  };

  // -- Confirm & Exit Handlers --

  const handleConfirm = async () => {
      // 1. Validation Logic
      if (products.length === 0) return;
      const hasInvalidItems = products.some(p => !p.grams || p.grams <= 0);
      if (hasInvalidItems) return;

      // 2. Offline check
      if (isOffline) {
          setSaveError("No connection");
          setTimeout(() => setSaveError(null), 3000);
          return;
      }

      // 3. Backend atomic save simulation
      setIsSaving(true);
      setSaveError(null);

      try {
          // Simulate network latency (1.2s)
          await new Promise(resolve => setTimeout(resolve, 1200));
          
          // 4. Success behavior: Close immediately, return to context
          onSave(); 
      } catch (e) {
          setIsSaving(false);
          setSaveError("Failed to save. Please try again.");
      }
  };

  // -- Render Helpers --
  const shouldShowMealSelector = !initialMealType;
  const isSearchEmpty = searchQuery.length > 0 && searchResults.length === 0;
  
  // Confirm Button Enabled State:
  // Enabled ONLY if: List > 0 AND All grams > 0
  // Note: Offline does NOT disable the button (visual), it blocks the action with a toast.
  const isConfirmDisabled = products.length === 0 || products.some(p => !p.grams || p.grams <= 0) || isSaving;

  return (
    <>
      {/* Photo Modal */}
      {isPhotoModalOpen && (
          <PhotoModal 
            mode={photoMode}
            onClose={() => setIsPhotoModalOpen(false)} 
            onCapture={handlePhotoCapture} 
          />
      )}

      {/* Backdrop - Cancels Flow */}
      <div 
        className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-50 transition-opacity"
        onClick={onClose}
      />
      
      {/* Sheet */}
      <div className="fixed bottom-0 left-0 right-0 bg-white rounded-t-[2rem] z-50 p-6 pb-10 max-w-md mx-auto shadow-2xl animate-[slideUp_0.3s_cubic-bezier(0.16,1,0.3,1)] flex flex-col max-h-[92vh]">
        
        {/* Handle */}
        <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-6" />

        {/* --- VIEW 1: MAIN ADD FLOW --- */}
        {sheetView === 'main' && (
            <>
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold text-gray-900 tracking-tight">
                        {initialMealType ? `Add to ${initialMealType}` : 'Add Meal'}
                    </h2>
                    <button 
                        onClick={onClose} 
                        className="p-2 bg-gray-100 rounded-full text-gray-500 hover:bg-gray-200 transition-colors"
                        disabled={isSaving}
                    >
                        <X size={20} />
                    </button>
                </div>

                {shouldShowMealSelector && (
                <div className={`grid grid-cols-4 gap-2 mb-6 ${isOffline ? 'opacity-50 pointer-events-none' : ''}`}>
                    {MEAL_TYPES.map((type) => (
                        <button 
                            key={type}
                            onClick={() => setMealType(type)}
                            className={`py-2.5 rounded-xl text-xs font-bold transition-all ${mealType === type ? 'bg-blue-600 text-white shadow-md scale-[1.02]' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                        >
                        {type}
                        </button>
                    ))}
                </div>
                )}

                <div className={`bg-gray-100 p-1 rounded-xl flex mb-6 ${isOffline ? 'opacity-50 pointer-events-none' : ''}`}>
                    <button onClick={() => setInputMethod('search')} className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all ${inputMethod === 'search' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}>
                        <Search size={16} /> Search
                    </button>
                    <button onClick={() => setInputMethod('photo')} className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all ${inputMethod === 'photo' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}>
                        <Camera size={16} /> Photo
                    </button>
                </div>

                {/* Input Area */}
                <div className="mb-6 relative">
                    {inputMethod === 'search' ? (
                        <div className={`space-y-3 ${isOffline ? 'opacity-50 pointer-events-none' : ''}`}>
                            <div className="flex-1 h-14 border border-gray-200 bg-gray-50 rounded-2xl flex items-center px-4 gap-3 focus-within:bg-white focus-within:border-blue-600 focus-within:ring-4 focus-within:ring-blue-500/10 transition-all">
                                <Search size={20} className="text-gray-400" />
                                <input 
                                    ref={searchInputRef}
                                    className="flex-1 bg-transparent outline-none text-base font-medium text-gray-900 placeholder-gray-400"
                                    placeholder="Type food name..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    disabled={isOffline}
                                />
                            </div>

                            {searchResults.length > 0 && (
                                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-20 max-h-60 overflow-y-auto">
                                    {searchResults.map((item) => (
                                        <button key={item.id} onClick={() => handleAddProduct(item)} className="w-full text-left p-3.5 hover:bg-gray-50 border-b border-gray-50 last:border-0 flex justify-between items-center group">
                                            <div>
                                                <div className="font-semibold text-gray-900 text-sm">{item.name}</div>
                                                <div className="text-xs text-gray-500">{item.brand} • {item.grams}g</div>
                                            </div>
                                            <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 group-hover:bg-blue-100 group-hover:text-blue-600">
                                                <Plus size={14} />
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                            
                            {isSearchEmpty && (
                                <div className="flex items-center justify-between p-3 bg-gray-50 border border-gray-100 rounded-xl">
                                    <span className="text-xs font-medium text-gray-500 pl-1">No results for "{searchQuery}"</span>
                                    <button className="text-xs font-bold text-blue-600 bg-white px-3 py-1.5 rounded-lg shadow-sm border border-blue-100 active:scale-95" onClick={() => { setSheetView('custom'); setCustomForm(prev => ({ ...prev, name: searchQuery })); }}>
                                        + Add Custom
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="h-32 rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50 flex flex-col items-center justify-center gap-3">
                            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm text-blue-600"><Camera size={24} /></div>
                            <button onClick={openFoodScanner} className="text-sm font-semibold text-blue-600 hover:text-blue-700">Tap to take photo</button>
                        </div>
                    )}
                </div>

                {/* Detected Items */}
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
                                <div key={item.id} className="flex overflow-x-auto snap-x no-scrollbar rounded-2xl shadow-sm ring-1 ring-blue-100">
                                    <div className="w-full flex-shrink-0 snap-center bg-blue-50/30 rounded-2xl p-3.5 flex items-center justify-between pr-4 z-10">
                                        <div className="flex gap-4 items-center">
                                             <div className="w-10 h-10 bg-white rounded-xl flex-shrink-0 flex items-center justify-center text-xl shadow-sm">✨</div>
                                             <div>
                                                  <div className="font-semibold text-gray-900 text-sm mb-0.5">{item.name}</div>
                                                  <div className="text-xs text-blue-500 font-medium">{item.grams}g • {item.kcal} kcal</div>
                                              </div>
                                        </div>
                                         <div className="flex flex-col items-end">
                                            <span className="text-[10px] bg-white text-blue-600 px-1.5 py-0.5 rounded border border-blue-100 font-bold">{item.confidence === 'High' ? 'High Conf.' : 'Detected'}</span>
                                        </div>
                                    </div>
                                     <div className="w-[4.5rem] flex-shrink-0 snap-center bg-red-100 flex items-center justify-center text-red-500 cursor-pointer ml-[-1rem] pl-4 rounded-r-2xl" onClick={() => removeDetectedItem(item.id)}>
                                        <Trash2 size={18} />
                                    </div>
                                </div>
                            ))}
                        </div>
                        <button onClick={handleAddDetectedItems} className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm shadow-md flex items-center justify-center gap-2">
                            <Plus size={16} strokeWidth={3} /> <span>Add Selected Items</span>
                        </button>
                    </div>
                )}

                {/* Inline Empty State */}
                {recognitionState === 'empty' && inputMethod === 'photo' && (
                    <div className="mb-6 p-4 bg-gray-50 border border-gray-100 rounded-2xl flex flex-col items-center text-center gap-2">
                        <p className="text-sm font-semibold text-gray-900">No food detected</p>
                        <p className="text-xs text-gray-500">Try adjusting the angle or switch to Search.</p>
                    </div>
                )}

                {/* Review List */}
                <div className={`flex-1 overflow-y-auto mb-6 space-y-4 min-h-[150px] relative ${isOffline ? 'opacity-50' : ''}`}>
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Review List</span>
                        <span className="text-xs font-medium text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{products.length}</span>
                    </div>
                    
                    {products.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-10 text-gray-400 text-sm border-2 border-dashed border-gray-100 rounded-2xl bg-gray-50/50">
                            <span className="font-medium">No items added yet</span>
                            <span className="text-xs text-gray-300 mt-1">{inputMethod === 'search' ? 'Search to add' : 'Take a photo to add'}</span>
                        </div>
                    ) : (
                        products.map((product) => {
                            const isEditing = editingId === product.id;
                            
                            return (
                                <div key={product.id} className="flex overflow-x-auto snap-x no-scrollbar rounded-2xl shadow-sm group">
                                    <div 
                                        className={`w-full flex-shrink-0 snap-center bg-white border rounded-2xl p-3.5 flex flex-col justify-center z-10 transition-colors ${isEditing ? 'border-blue-500 ring-4 ring-blue-500/5' : 'border-gray-100 active:bg-gray-50'}`}
                                        onClick={() => !isEditing && !isSaving && setEditingId(product.id)}
                                    >
                                        <div className="flex justify-between items-start w-full mb-1">
                                            <div className="flex gap-4 items-center">
                                                <div className="w-12 h-12 bg-gray-100 rounded-xl flex-shrink-0 flex items-center justify-center text-2xl">🍎</div>
                                                <div>
                                                    <div className="font-semibold text-gray-900 text-base mb-0.5">{product.name}</div>
                                                    
                                                    {/* INLINE EDITOR */}
                                                    {isEditing ? (
                                                        <div className="flex items-center gap-1 mt-1" onClick={e => e.stopPropagation()}>
                                                            <button 
                                                                className="w-7 h-7 flex items-center justify-center bg-gray-100 rounded-lg text-gray-600 active:bg-gray-200"
                                                                onClick={() => updateGrams(product.id, product.grams - 5)}
                                                            >
                                                                <Minus size={14} strokeWidth={3} />
                                                            </button>
                                                            <div className="relative">
                                                                <input 
                                                                    ref={editInputRef}
                                                                    className="w-14 text-center font-bold text-gray-900 border-b-2 border-blue-500 outline-none p-0 mx-1 bg-transparent"
                                                                    type="number"
                                                                    value={product.grams === 0 ? '' : product.grams}
                                                                    onChange={(e) => updateGrams(product.id, parseInt(e.target.value) || 0)}
                                                                    onBlur={() => setEditingId(null)}
                                                                    onKeyDown={(e) => e.key === 'Enter' && setEditingId(null)}
                                                                />
                                                                <span className="text-xs font-bold text-gray-400 absolute right-1.5 pointer-events-none">g</span>
                                                            </div>
                                                            <button 
                                                                className="w-7 h-7 flex items-center justify-center bg-gray-100 rounded-lg text-gray-600 active:bg-gray-200"
                                                                onClick={() => updateGrams(product.id, product.grams + 5)}
                                                            >
                                                                <Plus size={14} strokeWidth={3} />
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <div className="text-xs text-gray-500 font-medium flex items-center gap-1.5 bg-gray-50 px-2 py-1 rounded-md w-fit transition-colors group-hover:bg-gray-100">
                                                            {product.grams}g <Edit2 size={10} className="text-gray-400" />
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex flex-col items-end">
                                                <span className="font-bold text-gray-900 text-base">{product.kcal}</span>
                                                <span className="text-[10px] text-gray-400 font-medium uppercase">kcal</span>
                                            </div>
                                        </div>

                                        {/* Advanced Edit Entry */}
                                        {isEditing && (
                                            <div className="pl-[4rem] mt-2 animate-[fadeIn_0.2s_ease-out]">
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); openAdvancedEdit(product); }}
                                                    className="flex items-center gap-1 text-[11px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-md hover:bg-blue-100 transition-colors"
                                                >
                                                    <Calculator size={12} />
                                                    Edit nutrition per 100g
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                    {!isOffline && !isSaving && (
                                        <div 
                                            className="w-[4.5rem] flex-shrink-0 snap-center bg-red-500 flex items-center justify-center text-white cursor-pointer ml-[-1rem] pl-4 rounded-r-2xl"
                                            onClick={() => handleDelete(product.id)}
                                        >
                                            <Trash2 size={20} />
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}

                    {toast && (
                        <div className="absolute bottom-2 left-2 right-2 bg-gray-900/90 backdrop-blur-md text-white px-4 py-3 rounded-xl shadow-xl flex items-center justify-between z-20 animate-[slideUp_0.2s_ease-out]">
                             <span className="text-sm font-medium">Item deleted</span>
                             <button onClick={handleUndo} className="text-blue-400 text-sm font-bold flex items-center gap-1.5 active:opacity-70 px-2 py-1 rounded hover:bg-white/10">
                               <RotateCcw size={14} /> Undo
                             </button>
                        </div>
                    )}
                </div>

                {saveError && (
                    <div className="mb-3 flex items-center justify-center gap-2 text-red-500 text-xs font-semibold animate-pulse">
                        <AlertCircle size={14} />
                        <span>{saveError}</span>
                    </div>
                )}

                <button 
                    disabled={isConfirmDisabled}
                    className={`w-full h-14 rounded-2xl font-bold text-lg flex items-center justify-center gap-2.5 transition-all shadow-xl shadow-blue-500/10 ${!isConfirmDisabled ? 'bg-blue-600 text-white active:scale-[0.98] active:bg-blue-700' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}
                    onClick={handleConfirm}
                >
                    {isSaving ? (
                        <>
                            <Loader2 size={22} className="animate-spin" />
                            <span>Saving...</span>
                        </>
                    ) : (
                        <>
                            <Check size={22} strokeWidth={3} />
                            <span>Save Meal</span>
                        </>
                    )}
                </button>
            </>
        )}

        {/* --- VIEW 2: CUSTOM PRODUCT FLOW --- */}
        {sheetView === 'custom' && (
            <div className="flex flex-col h-full animate-[fadeIn_0.2s_ease-out]">
                <div className="flex items-center gap-3 mb-6">
                    <button onClick={() => setSheetView('main')} className="p-2 -ml-2 rounded-full hover:bg-gray-100 text-gray-600 transition-colors">
                        <ArrowLeft size={24} />
                    </button>
                    <h2 className="text-xl font-bold text-gray-900">New Product</h2>
                </div>

                <div className="bg-gray-100 p-1 rounded-xl flex mb-6">
                    <button onClick={() => setCustomMethod('manual')} className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold uppercase tracking-wide rounded-lg transition-all ${customMethod === 'manual' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400'}`}>
                        <Keyboard size={14} /> Manual
                    </button>
                    <button onClick={() => setCustomMethod('label')} className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold uppercase tracking-wide rounded-lg transition-all ${customMethod === 'label' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400'}`}>
                        <ScanBarcode size={14} /> Scan Label
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto no-scrollbar pb-4">
                    {customMethod === 'manual' ? (
                        <div className="space-y-4">
                             <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-500 uppercase">Product Name</label>
                                <input className="w-full h-12 bg-gray-50 border border-gray-200 rounded-xl px-4 font-semibold text-gray-900 focus:outline-none focus:border-blue-500" placeholder="e.g. Grandma's Cookie" value={customForm.name} onChange={(e) => setCustomForm({...customForm, name: e.target.value})} autoFocus />
                             </div>
                             <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-500 uppercase">Brand (Optional)</label>
                                <input className="w-full h-12 bg-gray-50 border border-gray-200 rounded-xl px-4 font-medium text-gray-900 focus:outline-none focus:border-blue-500" placeholder="e.g. Homemade" value={customForm.brand} onChange={(e) => setCustomForm({...customForm, brand: e.target.value})} />
                             </div>
                             <div className="pt-2 grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-500 uppercase">Calories (per 100g)</label>
                                    <div className="relative">
                                        <input type="number" className="w-full h-12 bg-gray-50 border border-gray-200 rounded-xl pl-4 pr-8 font-bold text-gray-900 focus:outline-none focus:border-blue-500" placeholder="0" value={customForm.kcal} onChange={(e) => setCustomForm({...customForm, kcal: e.target.value})} />
                                        <span className="absolute right-3 top-4 text-xs font-bold text-gray-400">kcal</span>
                                    </div>
                                </div>
                             </div>
                             <div className="pt-2 grid grid-cols-3 gap-3">
                                {['p', 'f', 'c'].map((macro) => (
                                    <div key={macro} className="space-y-2">
                                        <label className="text-xs font-bold text-gray-400 uppercase text-center block">{macro === 'p' ? 'Protein' : macro === 'f' ? 'Fats' : 'Carbs'}</label>
                                        <div className="relative">
                                            <input type="number" className="w-full h-10 bg-gray-50 border border-gray-200 rounded-xl pl-2 pr-6 text-center font-medium text-gray-900 focus:outline-none focus:border-blue-500 text-sm" placeholder="0" value={customForm[macro as keyof typeof customForm]} onChange={(e) => setCustomForm({...customForm, [macro]: e.target.value})} />
                                            <span className="absolute right-2 top-3 text-[10px] font-bold text-gray-400">g</span>
                                        </div>
                                    </div>
                                ))}
                             </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-10 space-y-6">
                             <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center text-blue-600 animate-pulse"><ScanBarcode size={40} /></div>
                             <button className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg">Open Camera</button>
                        </div>
                    )}
                </div>
                <div className="pt-4 border-t border-gray-100">
                    <button disabled={!customForm.name} onClick={saveCustomProduct} className={`w-full h-14 rounded-2xl font-bold text-lg flex items-center justify-center gap-2 transition-all ${customForm.name ? 'bg-gray-900 text-white shadow-xl' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}>Add Product</button>
                </div>
            </div>
        )}

        {/* --- VIEW 3: ADVANCED EDIT (PER 100g) --- */}
        {sheetView === 'edit_nutrition' && (
            <div className="flex flex-col h-full animate-[fadeIn_0.2s_ease-out]">
                <div className="flex items-center gap-3 mb-6">
                    <button onClick={() => setSheetView('main')} className="p-2 -ml-2 rounded-full hover:bg-gray-100 text-gray-600 transition-colors">
                        <ArrowLeft size={24} />
                    </button>
                    <div className="flex flex-col">
                        <h2 className="text-xl font-bold text-gray-900">Edit Nutrition</h2>
                        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Values per 100g</span>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto no-scrollbar space-y-6">
                     <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100">
                        <p className="text-sm text-blue-800 leading-relaxed">
                            Changes affect only this item. Values will be used to calculate total nutrition based on the grams entered.
                        </p>
                     </div>

                     <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-500 uppercase">Calories (kcal)</label>
                        <div className="relative">
                            <input 
                                type="number" 
                                className="w-full h-14 bg-gray-50 border border-gray-200 rounded-xl px-4 text-xl font-bold text-gray-900 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 transition-all" 
                                value={advancedForm.k} 
                                onChange={(e) => setAdvancedForm({...advancedForm, k: e.target.value})} 
                                autoFocus
                            />
                            <span className="absolute right-4 top-4 text-sm font-bold text-gray-400">per 100g</span>
                        </div>
                     </div>

                     <div className="grid grid-cols-3 gap-3">
                        {['p', 'f', 'c'].map((macro) => (
                            <div key={macro} className="space-y-2">
                                <label className="text-xs font-bold text-gray-500 uppercase text-center block">{macro === 'p' ? 'Protein' : macro === 'f' ? 'Fats' : 'Carbs'}</label>
                                <div className="relative">
                                    <input 
                                        type="number" 
                                        className="w-full h-12 bg-gray-50 border border-gray-200 rounded-xl pl-3 pr-6 text-center font-bold text-gray-900 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 transition-all" 
                                        value={advancedForm[macro as keyof typeof advancedForm]} 
                                        onChange={(e) => setAdvancedForm({...advancedForm, [macro]: e.target.value})} 
                                    />
                                    <span className="absolute right-3 top-4 text-xs font-bold text-gray-400">g</span>
                                </div>
                            </div>
                        ))}
                     </div>
                </div>

                <div className="pt-4 border-t border-gray-100">
                    <button 
                        onClick={saveAdvancedEdit} 
                        className="w-full h-14 rounded-2xl font-bold text-lg bg-gray-900 text-white shadow-xl shadow-gray-900/10 active:scale-[0.98] transition-all"
                    >
                        Save Changes
                    </button>
                </div>
            </div>
        )}

      </div>
    </>
  );
};

export default AddSheet;