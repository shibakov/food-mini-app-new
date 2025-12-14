
import React, { useState, useEffect } from 'react';
import { Home, Plus, BarChart2, WifiOff, RotateCcw } from 'lucide-react';
import MainScreen from './screens/MainScreen';
import StatsScreen from './screens/StatsScreen';
import { AddSheet } from './components/sheets/AddSheet';
import { SettingsSheet } from './components/sheets/SettingsSheet';
import { AddSheetContext } from './types';

type Tab = 'main' | 'stats';

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('main');
  
  // Sheet Management
  const [isAddSheetOpen, setIsAddSheetOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [addSheetContext, setAddSheetContext] = useState<AddSheetContext | null>(null);

  // Global UI State
  const [isMainLoading, setIsMainLoading] = useState(false);
  const [isMainEmpty, setIsMainEmpty] = useState(false);
  const [isOffline, setIsOffline] = useState(() => (typeof navigator !== 'undefined' ? !navigator.onLine : false));
  const [toast, setToast] = useState<{ message: string; onUndo?: () => void } | null>(null);
  
  // Data Consistency
  const [dataVersion, setDataVersion] = useState(0);

  // Online / Offline listeners
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleOnline = () => {
      setIsOffline(false);
      setDataVersion(v => v + 1);
    };
    const handleOffline = () => {
      setIsOffline(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Auto-hide toast
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Actions
  const showUndoToast = () => {
    setToast({
      message: 'Meal deleted',
      onUndo: () => {
        setToast(null);
        // Logic to restore would call Service here
      }
    });
  };

  const openGenericAddSheet = (context?: AddSheetContext) => {
    const fallbackDate = new Date();
    setAddSheetContext(context ?? { date: fallbackDate });
    setIsAddSheetOpen(true);
  };

  const openEditMealSheet = (context: AddSheetContext) => {
    setAddSheetContext(context);
    setIsAddSheetOpen(true);
  };

  const handleAddSheetSave = () => {
    setIsAddSheetOpen(false);
    setAddSheetContext(null);
    setActiveTab('main');
    // Trigger a data refresh in MainScreen
    setDataVersion(v => v + 1);
  };

  const isOverlayOpen = isAddSheetOpen || isSettingsOpen;

  const renderContent = () => {
    switch (activeTab) {
      case 'main':
        return (
          <MainScreen 
            onAddClick={openGenericAddSheet} 
            onEditMeal={openEditMealSheet}
            onSettingsClick={() => setIsSettingsOpen(true)} 
            isLoading={isMainLoading}
            isOffline={isOffline}
            isEmpty={isMainEmpty}
            onDeleteMeal={showUndoToast}
            setIsEmpty={setIsMainEmpty}
            setIsLoading={setIsMainLoading}
            dataVersion={dataVersion}
          />
        );
      case 'stats':
        return (
          <StatsScreen 
            onSettingsClick={() => setIsSettingsOpen(true)}
            isOffline={isOffline}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="relative h-[100dvh] w-full max-w-md mx-auto bg-gray-50 overflow-hidden flex flex-col shadow-2xl text-gray-900 font-sans selection:bg-blue-100 selection:text-blue-900">
      
      {/* Offline Indicator */}
      {isOffline && (
        <div className="bg-gray-900/95 backdrop-blur-sm text-white/90 text-[11px] font-semibold py-2 text-center flex items-center justify-center gap-2 z-50 absolute top-0 left-0 right-0 shadow-sm">
          <WifiOff size={12} />
          <span>Offline Mode</span>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 relative overflow-hidden bg-gray-50">
        {renderContent()}
      </main>

      {/* Overlays */}
      <AddSheet 
        isOpen={isAddSheetOpen} 
        onClose={() => {
          setIsAddSheetOpen(false);
          setAddSheetContext(null);
        }} 
        onSave={handleAddSheetSave}
        context={addSheetContext}
        isOffline={isOffline}
      />
      <SettingsSheet 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
        isOffline={isOffline}
      />

      {/* Toast Notification */}
      {toast && (
        <div className="absolute bottom-24 left-4 right-4 bg-gray-900/95 backdrop-blur-xl text-white px-4 py-3.5 rounded-2xl shadow-xl flex items-center justify-between z-[60] animate-[slideUp_0.2s_cubic-bezier(0.2,0,0,1)] ring-1 ring-white/10">
          <span className="text-sm font-medium tracking-wide">{toast.message}</span>
          {toast.onUndo && (
            <button 
              onClick={toast.onUndo}
              className="text-blue-400 text-sm font-bold flex items-center gap-1.5 active:opacity-70 transition-opacity"
            >
              <RotateCcw size={16} strokeWidth={2.5} />
              Undo
            </button>
          )}
        </div>
      )}

      {/* Bottom Navigation */}
      {!isOverlayOpen && (
        <nav className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-100 h-[88px] pb-6 px-10 flex justify-between items-center z-50 transition-all duration-300">
          <button 
            onClick={() => setActiveTab('main')}
            className={`flex flex-col items-center justify-center space-y-1.5 w-16 transition-all duration-200 group ${activeTab === 'main' ? 'text-gray-900' : 'text-gray-400 hover:text-gray-600'}`}
          >
            <Home size={24} strokeWidth={activeTab === 'main' ? 2.5 : 2} className="group-active:scale-90 transition-transform" />
            <span className="text-[10px] font-semibold tracking-wide">Main</span>
          </button>

          <button 
            onClick={() => !isOffline && openGenericAddSheet()}
            disabled={isOffline}
            className={`flex flex-col items-center justify-center -mt-8 group ${isOffline ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <div className="w-14 h-14 bg-gray-900 rounded-2xl flex items-center justify-center shadow-lg shadow-gray-900/20 group-hover:bg-black group-hover:scale-105 group-active:scale-95 transition-all duration-300 ring-4 ring-gray-50">
              <Plus size={28} color="white" strokeWidth={2.5} />
            </div>
          </button>

          <button 
            onClick={() => setActiveTab('stats')}
            className={`flex flex-col items-center justify-center space-y-1.5 w-16 transition-all duration-200 group ${activeTab === 'stats' ? 'text-gray-900' : 'text-gray-400 hover:text-gray-600'}`}
          >
            <BarChart2 size={24} strokeWidth={activeTab === 'stats' ? 2.5 : 2} className="group-active:scale-90 transition-transform" />
            <span className="text-[10px] font-semibold tracking-wide">Stats</span>
          </button>
        </nav>
      )}
    </div>
  );
}
