import React, { useState, useEffect } from 'react';
import { AlertCircle, Check } from 'lucide-react';
import { SegmentedControl } from '../SegmentedControl';
import { Card } from '../Card';
import { Stepper } from '../Stepper';
import { Button } from '../Button';
import { BottomSheet } from '../BottomSheet';
import { api } from '../../services/api';

interface SettingsSheetProps {
  isOpen: boolean;
  onClose: () => void;
  isOffline?: boolean;
}

export const SettingsSheet: React.FC<SettingsSheetProps> = ({ isOpen, onClose, isOffline = false }) => {
  const [calorieTarget, setCalorieTarget] = useState('2000');
  const [tolerance, setTolerance] = useState(100);
  const [macroMode, setMacroMode] = useState<'percent' | 'grams'>('percent');
  const [macros, setMacros] = useState({ p: '30', f: '35', c: '35' });

  // Load Settings
  useEffect(() => {
    if (isOpen) {
      api.settings.get().then(settings => {
        setCalorieTarget(settings.calorieTarget.toString());
        setTolerance(settings.tolerance);
        setMacroMode(settings.macroMode);
        setMacros(settings.macros);
      });
    }
  }, [isOpen]);

  const targetVal = parseInt(calorieTarget) || 0;
  const pVal = parseFloat(macros.p) || 0;
  const fVal = parseFloat(macros.f) || 0;
  const cVal = parseFloat(macros.c) || 0;

  let validationError: string | null = null;
  if (targetVal < 500) {
      validationError = "Daily target must be at least 500 kcal";
  } else if (macroMode === 'percent') {
      const totalPct = pVal + fVal + cVal;
      if (Math.abs(totalPct - 100) > 0.1) validationError = `Total matches ${totalPct.toFixed(1)}% (must be 100%)`;
  } else {
      const derivedKcal = (pVal * 4) + (fVal * 9) + (cVal * 4);
      if (derivedKcal > targetVal) validationError = `Macros (${Math.round(derivedKcal)} kcal) exceed daily limit`;
  }

  const handleSave = async () => {
    if (!validationError && !isOffline) {
      await api.settings.save({
        calorieTarget: targetVal,
        tolerance,
        macroMode,
        macros
      });
      onClose();
    }
  };

  const handleMacroChange = (key: 'p' | 'f' | 'c', value: string) => setMacros(prev => ({ ...prev, [key]: value }));
  const derivedKcalForGrams = (pVal * 4) + (fVal * 9) + (cVal * 4);
  const derivedKcalPct = Math.min((derivedKcalForGrams / targetVal) * 100, 100);

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title="Settings"
      className="bg-gray-50/50"
      footer={
        <Button variant="primary" onClick={handleSave} disabled={!!validationError || isOffline} className="w-full" icon={<Check size={20} />}>
            Save Changes
        </Button>
      }
    >
        <div className={`space-y-6 pb-4 ${isOffline ? 'opacity-70' : ''}`}>
          
          <Card variant="regular" className="space-y-4">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest block pl-1">Daily Calorie Target</label>
            <Stepper 
                value={parseInt(calorieTarget) || 0}
                onChange={(v) => setCalorieTarget(v.toString())}
                step={50}
                min={500}
                max={10000}
                unit="kcal"
                disabled={isOffline}
            />
          </Card>

          <Card variant="regular" className="space-y-6">
            <div className="flex justify-between items-center px-1">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Tolerance Range</label>
              <div className={`bg-blue-50 text-blue-600 px-2.5 py-1 rounded-lg text-xs font-bold font-mono ${isOffline ? 'opacity-50' : ''}`}>
                  ±{tolerance} kcal
              </div>
            </div>
            
            <div className={`relative h-12 flex items-center px-1 ${isOffline ? 'pointer-events-none' : ''}`}>
                {/* Track */}
                <div className="absolute left-1 right-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-50 w-full" />
                </div>
                {/* Ticks */}
                <div className="absolute left-1 right-1 flex justify-between px-1">
                    {[50, 100, 150, 200, 250].map(val => (
                        <div key={val} className={`w-1 h-1 rounded-full transition-colors duration-300 ${tolerance >= val ? 'bg-blue-300' : 'bg-gray-300'}`} />
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
                    className="absolute h-6 w-6 bg-white rounded-full shadow-md border border-gray-100 pointer-events-none transition-all flex items-center justify-center"
                    style={{ left: `${((tolerance - 50) / 200) * 100}%`, transform: 'translateX(-50%)' }}
                >
                    <div className={`w-2 h-2 rounded-full ${isOffline ? 'bg-gray-400' : 'bg-blue-600'}`} />
                </div>
            </div>
            <p className="text-[10px] text-gray-400 font-medium px-1">
                Used to determine if you are "On Track" or "Over Limit".
            </p>
          </Card>

          <Card variant="regular" className="space-y-5">
            <div className="flex justify-between items-center px-1">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Macro Goals</label>
            </div>
            <SegmentedControl 
                value={macroMode} 
                onChange={(v) => { 
                    setMacroMode(v as 'percent' | 'grams'); 
                    // Reset defaults when switching modes to prevent weird values
                    setMacros(v === 'percent' ? { p: '30', f: '35', c: '35' } : { p: '150', f: '60', c: '200' }); 
                }} 
                disabled={isOffline} 
                options={[
                    { label: 'Percent %', value: 'percent' }, 
                    { label: 'Grams g', value: 'grams' }
                ]} 
            />
            
            <div className="grid grid-cols-3 gap-3">
                {['p', 'f', 'c'].map((key) => (
                    <div key={key} className="space-y-2">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1 block text-center">
                            {key === 'p' ? 'Protein' : key === 'f' ? 'Fats' : 'Carbs'}
                        </label>
                        <Stepper
                            value={parseInt(macros[key as 'p'|'f'|'c']) || 0}
                            onChange={(v) => handleMacroChange(key as 'p'|'f'|'c', v.toString())}
                            disabled={isOffline}
                            unit={macroMode === 'percent' ? '%' : 'g'}
                            step={macroMode === 'percent' ? 1 : 5}
                            min={0}
                            max={macroMode === 'percent' ? 100 : 1000}
                            error={!!validationError}
                        />
                    </div>
                ))}
            </div>

            {macroMode === 'grams' && (
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-semibold text-gray-500">Calculated Energy</span>
                        <span className={`text-xs font-bold ${derivedKcalForGrams > targetVal ? 'text-rose-500' : 'text-gray-900'}`}>
                            {Math.round(derivedKcalForGrams)} / {targetVal} kcal
                        </span>
                    </div>
                    <div className="h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
                        <div 
                            className={`h-full rounded-full transition-all ${derivedKcalForGrams > targetVal ? 'bg-rose-500' : 'bg-blue-500'}`} 
                            style={{ width: `${derivedKcalPct}%` }} 
                        />
                    </div>
                </div>
            )}
            
            {validationError && (
                <div className="flex items-start gap-3 text-rose-600 bg-rose-50 p-4 rounded-xl border border-rose-100 animate-[fadeIn_0.2s_ease-out]">
                    <AlertCircle size={18} className="mt-0.5 flex-shrink-0" />
                    <span className="text-xs font-semibold leading-relaxed">{validationError}</span>
                </div>
            )}
          </Card>
        </div>
    </BottomSheet>
  );
};
