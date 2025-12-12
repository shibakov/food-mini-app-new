import React, { useState, useEffect } from 'react';
import { X, Check, AlertCircle, Info } from 'lucide-react';
import { SegmentedControl } from '../components/SegmentedControl';

interface SettingsSheetProps {
  isOpen: boolean;
  onClose: () => void;
  isOffline?: boolean;
}

const SettingsSheet: React.FC<SettingsSheetProps> = ({ isOpen, onClose, isOffline = false }) => {
  // Form State
  const [calorieTarget, setCalorieTarget] = useState('2000');
  const [tolerance, setTolerance] = useState(100); // 50, 100, 150, 200, 250
  const [macroMode, setMacroMode] = useState<'percent' | 'grams'>('percent');
  
  // Macros (stored as strings to handle input nicely)
  const [macros, setMacros] = useState({ p: '30', f: '35', c: '35' });

  // Reset state when opened
  useEffect(() => {
    if (isOpen) {
      // In a real app, this would load from a context or prop
      setCalorieTarget('2000');
      setTolerance(100);
      setMacroMode('percent');
      setMacros({ p: '30', f: '35', c: '35' });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // -- Derived Values & Validation --
  const targetVal = parseInt(calorieTarget) || 0;
  const pVal = parseFloat(macros.p) || 0;
  const fVal = parseFloat(macros.f) || 0;
  const cVal = parseFloat(macros.c) || 0;

  let validationError: string | null = null;

  if (targetVal < 500) {
      validationError = "Daily target must be at least 500 kcal";
  } else if (macroMode === 'percent') {
      const totalPct = pVal + fVal + cVal;
      if (Math.abs(totalPct - 100) > 0.1) {
          validationError = `Total matches ${totalPct.toFixed(1)}% (must be 100%)`;
      }
  } else {
      // Grams mode validation
      const derivedKcal = (pVal * 4) + (fVal * 9) + (cVal * 4);
      if (derivedKcal > targetVal) {
          validationError = `Macros (${Math.round(derivedKcal)} kcal) exceed daily limit`;
      }
  }

  const handleSave = () => {
    if (!validationError && !isOffline) {
        // Logic to apply settings would go here
        onClose();
    }
  };

  const handleMacroChange = (key: 'p' | 'f' | 'c', value: string) => {
      setMacros(prev => ({ ...prev, [key]: value }));
  };

  const derivedKcalForGrams = (pVal * 4) + (fVal * 9) + (cVal * 4);
  const derivedKcalPct = Math.min((derivedKcalForGrams / targetVal) * 100, 100);

  return (
    <>
      <div 
        className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-50 transition-opacity"
        onClick={onClose}
      />
      <div className="fixed bottom-0 left-0 right-0 bg-white rounded-t-[2rem] z-50 p-6 pb-8 max-w-md mx-auto shadow-2xl animate-[slideUp_0.3s_cubic-bezier(0.16,1,0.3,1)] flex flex-col max-h-[90vh]">
        
        {/* Handle */}
        <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-6" />

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Settings</h2>
          <button 
            onClick={onClose} 
            className="p-2 bg-gray-100 rounded-full text-gray-500 hover:bg-gray-200 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className={`space-y-8 overflow-y-auto no-scrollbar pb-4 ${isOffline ? 'opacity-70' : ''}`}>
          
          {/* 1) Calorie Target */}
          <div className="space-y-3">
            <label className="text-sm font-semibold text-gray-900">Daily Calorie Target</label>
            <div className={`flex items-center border rounded-2xl px-5 h-14 bg-gray-50 transition-all shadow-sm ${isOffline ? 'border-gray-200' : 'border-gray-200 focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500'}`}>
              <input 
                type="number" 
                disabled={isOffline}
                className="flex-1 bg-transparent outline-none text-xl font-bold text-gray-900 placeholder-gray-400 disabled:text-gray-400"
                value={calorieTarget}
                onChange={(e) => setCalorieTarget(e.target.value)}
                placeholder="2000"
              />
              <span className="text-gray-400 font-bold text-sm">kcal</span>
            </div>
          </div>

          {/* 2) Tolerance (Stepped Slider) */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <label className="text-sm font-semibold text-gray-900">Tolerance Range</label>
              <div className={`bg-blue-50 text-blue-700 px-2 py-1 rounded-md text-xs font-mono font-bold ${isOffline ? 'opacity-50' : ''}`}>
                  ±{tolerance} kcal
              </div>
            </div>
            
            <div className={`relative h-10 flex items-center ${isOffline ? 'pointer-events-none' : ''}`}>
                {/* Track */}
                <div className="absolute left-0 right-0 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-100 w-full" />
                </div>
                {/* Steps ticks */}
                <div className="absolute left-0 right-0 flex justify-between px-1">
                    {[50, 100, 150, 200, 250].map(val => (
                        <div key={val} className={`w-1 h-1 rounded-full ${tolerance >= val ? 'bg-blue-300' : 'bg-gray-300'}`} />
                    ))}
                </div>
                {/* Input */}
                <input 
                    type="range" 
                    min="50" 
                    max="250" 
                    step="50"
                    disabled={isOffline}
                    value={tolerance}
                    onChange={(e) => setTolerance(Number(e.target.value))}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                {/* Custom Thumb */}
                <div 
                    className="absolute h-5 w-5 bg-blue-600 rounded-full shadow border-2 border-white pointer-events-none transition-all"
                    style={{ left: `${((tolerance - 50) / 200) * 100}%`, transform: 'translateX(-50%)', backgroundColor: isOffline ? '#9ca3af' : '' }}
                />
            </div>
            <p className="text-[11px] text-gray-400 font-medium">
                Used to determine if you are "On Track" or "Over Limit".
            </p>
          </div>

          {/* 3) Macro Targets */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
                <label className="text-sm font-semibold text-gray-900">Macro Goals</label>
            </div>
            <SegmentedControl
                value={macroMode}
                onChange={(v) => {
                    setMacroMode(v as 'percent' | 'grams');
                    setMacros(v === 'percent' ? { p: '30', f: '35', c: '35' } : { p: '150', f: '60', c: '200' });
                }}
                disabled={isOffline}
                options={[
                    { label: 'Percent %', value: 'percent' },
                    { label: 'Grams g', value: 'grams' }
                ]}
            />

            {/* Macro Inputs */}
            <div className="grid grid-cols-3 gap-3">
                {['p', 'f', 'c'].map((key) => (
                    <div key={key} className="space-y-1.5">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">
                            {key === 'p' ? 'Protein' : key === 'f' ? 'Fats' : 'Carbs'}
                        </label>
                        <div className={`flex items-center border rounded-xl px-3 h-12 bg-gray-50 transition-all ${validationError ? 'border-red-200 focus-within:border-red-500' : 'border-gray-200 focus-within:border-blue-500'}`}>
                            <input 
                                type="number" 
                                disabled={isOffline}
                                className="flex-1 bg-transparent outline-none text-lg font-bold text-gray-900 min-w-0 disabled:text-gray-400"
                                value={macros[key as 'p'|'f'|'c']}
                                onChange={(e) => handleMacroChange(key as 'p'|'f'|'c', e.target.value)}
                            />
                            <span className="text-xs text-gray-400 font-medium ml-1">{macroMode === 'percent' ? '%' : 'g'}</span>
                        </div>
                    </div>
                ))}
            </div>

            {/* Validation / Summary Feedback */}
            {macroMode === 'grams' && (
                <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                    <div className="flex justify-between items-center mb-1">
                        <span className="text-xs font-semibold text-gray-500">Calculated Energy</span>
                        <span className={`text-xs font-bold ${derivedKcalForGrams > targetVal ? 'text-red-500' : 'text-gray-900'}`}>
                            {Math.round(derivedKcalForGrams)} / {targetVal} kcal
                        </span>
                    </div>
                    <div className="h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
                        <div 
                            className={`h-full rounded-full transition-all ${derivedKcalForGrams > targetVal ? 'bg-red-500' : 'bg-blue-500'}`}
                            style={{ width: `${derivedKcalPct}%` }}
                        />
                    </div>
                </div>
            )}
            
            {validationError && (
                <div className="flex items-start gap-2 text-red-500 bg-red-50 p-3 rounded-xl">
                    <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                    <span className="text-xs font-semibold leading-relaxed">{validationError}</span>
                </div>
            )}
          </div>
        </div>

        {/* Action Footer */}
        <div className="mt-auto pt-4 border-t border-gray-100">
            <button 
                onClick={handleSave}
                disabled={!!validationError || isOffline}
                className={`w-full h-14 rounded-2xl font-bold text-lg flex items-center justify-center gap-2 transition-all shadow-xl shadow-gray-900/5 ${
                    !!validationError || isOffline 
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                    : 'bg-gray-900 text-white active:scale-[0.98]'
                }`}
            >
                <Check size={20} />
                Save Changes
            </button>
        </div>

      </div>
    </>
  );
};

export default SettingsSheet;