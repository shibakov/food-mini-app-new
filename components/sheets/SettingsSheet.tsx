
import React, { useState, useEffect } from 'react';
import { AlertCircle, Check } from 'lucide-react';
import { SegmentedControl } from '../SegmentedControl';
import { Card } from '../Card';
import { ValueTrigger } from '../ValueTrigger';
import { Button } from '../Button';
import { BottomSheet } from '../BottomSheet';
import { UniversalPicker } from '../UniversalPicker';
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
  const [loading, setLoading] = useState(false);
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

  // Load Settings
  useEffect(() => {
    if (isOpen && !isOffline) {
      setLoading(true);
      setSaveError(null);
      api.settings
        .get()
        .then(settings => {
          setCalorieTarget(settings.calorieTarget.toString());
          setTolerance(settings.tolerance);
          setMacroMode(settings.macroMode);
          setMacros(settings.macros);
          setLoading(false);
        })
        .catch((e: unknown) => {
          console.error('Failed to load settings', e);
          setSaveError('Failed to load settings from server');
          setLoading(false);
        });
    }
  }, [isOpen, isOffline]);

  const openPicker = (title: string, val: number, min: number, max: number, step: number, unit: string, onConfirm: (v: number) => void) => {
      setPickerConfig({ isOpen: true, title, value: val, min, max, step, unit, onConfirm });
  };

  const targetVal = parseInt(calorieTarget) || 0;
  const pVal = parseFloat(macros.p) || 0;
  const fVal = parseFloat(macros.f) || 0;
  const cVal = parseFloat(macros.c) || 0;

  // Validation
  let validationError: string | null = null;
  if (targetVal < 500) {
      validationError = "Daily target must be at least 500 kcal";
  } else if (macroMode === 'percent') {
      const totalPct = pVal + fVal + cVal;
      if (Math.abs(totalPct - 100) > 0.1) validationError = `Total matches ${totalPct.toFixed(0)}% (must be 100%)`;
  } else {
      const derivedKcal = (pVal * 4) + (fVal * 9) + (cVal * 4);
      if (derivedKcal > targetVal) validationError = `Macros (${Math.round(derivedKcal)} kcal) exceed daily limit`;
  }

  const handleSave = async () => {
    if (validationError || isOffline) return;
    setLoading(true);
    setSaveError(null);
    try {
      await api.settings.save({
        calorieTarget: targetVal,
        tolerance,
        macroMode,
        macros,
      });
      onClose();
    } catch (e: any) {
      console.error('Failed to save settings', e);
      const message =
        (e && typeof e.message === 'string' && e.message) ||
        'Failed to save settings. Please check your values and try again.';
      setSaveError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleMacroChange = (key: 'p' | 'f' | 'c', newVal: number) => {
    const max = macroMode === 'percent' ? 100 : 1000;
    if (newVal < 0) newVal = 0;
    if (newVal > max) newVal = max;

    if (macroMode === 'grams') {
        setMacros(prev => ({ ...prev, [key]: newVal.toString() }));
        return;
    }

    const currentVal = parseInt(macros[key]) || 0;
    const diff = newVal - currentVal;
    if (diff === 0) return;

    const next = { ...macros, [key]: newVal.toString() };
    let remainder = -diff; 
    
    const others = ['p', 'f', 'c'].filter(k => k !== key) as ('p'|'f'|'c')[];
    
    for (let i = 0; i < 2; i++) { 
         for (const otherKey of others) {
             if (remainder === 0) break;
             const val = parseInt(next[otherKey]) || 0;
             let change = remainder;
             if (val + change < 0) change = -val;
             if (val + change > 100) change = 100 - val;
             
             next[otherKey] = (val + change).toString();
             remainder -= change;
         }
    }

    // Финальная нормализация до 100%
    const total = ['p','f','c'].reduce((sum, k) => sum + (parseInt(next[k as 'p'|'f'|'c']) || 0), 0);
    if (total !== 100) {
      const factor = 100 / (total || 1);
      let acc = 0;
      const normalized: { p: string; f: string; c: string } = { p: '0', f: '0', c: '0' };
      (['p','f','c'] as ('p'|'f'|'c')[]).forEach((k, idx) => {
        const raw = (parseInt(next[k]) || 0) * factor;
        let rounded = Math.round(raw);
        if (idx === 2) {
          rounded = 100 - acc; // последнему отдаём остаток
        }
        acc += rounded;
        normalized[k] = String(Math.max(0, Math.min(100, rounded)));
      });
      setMacros(normalized);
    } else {
      setMacros(next);
    }
  };

  const derivedKcalForGrams = (pVal * 4) + (fVal * 9) + (cVal * 4);
  const derivedKcalPct = Math.min((derivedKcalForGrams / targetVal) * 100, 100);

  return (
    <>
        <BottomSheet
        isOpen={isOpen}
        onClose={onClose}
        title="Settings"
        className="bg-gray-50/50"
        footer={
            <div className="space-y-2">
              <Button
                variant="primary"
                onClick={handleSave}
                disabled={!!validationError || isOffline || loading}
                isLoading={loading}
                className="w-full"
                icon={<Check size={20} />}
              >
                Save Changes
              </Button>
              {saveError && (
                <div className="text-[11px] text-rose-600 font-semibold text-center px-1">
                  {saveError}
                </div>
              )}
            </div>
        }
        >
            <div className={`space-y-6 pb-4 ${isOffline ? 'opacity-70' : ''}`}>
            
            <Card variant="regular" className="space-y-4">
                <ValueTrigger 
                    label="Daily Calorie Target"
                    value={targetVal}
                    unit="kcal"
                    disabled={isOffline || loading}
                    onClick={() => openPicker("Daily Target", targetVal, 500, 10000, 50, "kcal", (v) => setCalorieTarget(v.toString()))}
                />
            </Card>

            <Card variant="regular" className="space-y-4">
                <ValueTrigger 
                    label="Tolerance Range"
                    value={tolerance}
                    unit="± kcal"
                    disabled={isOffline || loading}
                    onClick={() => openPicker("Tolerance", tolerance, 0, 500, 50, "kcal", setTolerance)}
                />
            </Card>

            <Card variant="regular" className="space-y-5">
                <div className="flex justify-between items-center px-1">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Macro Goals</label>
                </div>
                <SegmentedControl 
                    value={macroMode} 
                    onChange={(v) => { 
                        setMacroMode(v as 'percent' | 'grams'); 
                        setMacros(v === 'percent' ? { p: '30', f: '35', c: '35' } : { p: '150', f: '60', c: '200' }); 
                    }} 
                    disabled={isOffline || loading} 
                    options={[
                        { label: 'Percent %', value: 'percent' }, 
                        { label: 'Grams g', value: 'grams' }
                    ]} 
                />
                
                <div className="flex flex-col space-y-3">
                    {['p', 'f', 'c'].map((key) => {
                        const k = key as 'p'|'f'|'c';
                        const label = k === 'p' ? 'Protein' : k === 'f' ? 'Fats' : 'Carbs';
                        const color = k === 'p' ? 'bg-blue-500' : k === 'f' ? 'bg-amber-400' : 'bg-orange-400';
                        const val = parseInt(macros[k]) || 0;
                        const unit = macroMode === 'percent' ? '%' : 'g';
                        const step = 5; 
                        
                        return (
                            <div 
                                key={k}
                                onClick={() => !isOffline && !loading && openPicker(label, val, 0, macroMode === 'percent' ? 100 : 1000, step, unit, (v) => handleMacroChange(k, v))}
                                className={`
                                    relative flex items-center justify-between p-1 pl-4 pr-1 h-[4.5rem] rounded-2xl border bg-white border-gray-100 hover:border-gray-200 active:scale-[0.99] cursor-pointer transition-all
                                    ${(isOffline || loading) ? 'opacity-50 pointer-events-none' : ''}
                                `}
                            >
                                <div className="flex flex-col justify-center gap-1.5">
                                    <span className="text-xs font-bold uppercase tracking-widest text-gray-400">
                                        {label}
                                    </span>
                                    <div className="h-1.5 w-8 rounded-full bg-gray-100 overflow-hidden">
                                            <div className={`h-full ${color}`} style={{ width: `${Math.min(val, 100)}%` }} />
                                    </div>
                                </div>
                                <div className="px-4 text-xl font-bold text-gray-900 tabular-nums tracking-tight">
                                    {val}<span className="text-sm text-gray-400 font-semibold ml-0.5">{unit}</span>
                                </div>
                            </div>
                        );
                    })}
                </div>
                
                {validationError && (
                    <div className="flex items-start gap-3 text-rose-600 bg-rose-50 p-4 rounded-xl border border-rose-100 animate-[fadeIn_0.2s_ease-out]">
                        <AlertCircle size={18} className="mt-0.5 flex-shrink-0" />
                        <span className="text-xs font-semibold leading-relaxed">{validationError}</span>
                    </div>
                )}
            </Card>
            </div>
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
