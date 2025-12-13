import React, { useState, useEffect } from 'react';
import { Home, Plus, BarChart2, WifiOff, RotateCcw } from 'lucide-react';
import MainScreen from './screens/MainScreen';
import StatsScreen from './screens/StatsScreen';
import { AddSheet } from './components/sheets/AddSheet';
import { SettingsSheet } from './components/sheets/SettingsSheet';

type Tab = 'main' | 'stats';

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('main');
  
  // Sheet Management
  const [isAddSheetOpen, setIsAddSheetOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [addSheetInitialType, setAddSheetInitialType] = useState<string | undefined>(undefined);

  // Global UI State
  const [isLoading, setIsLoading] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [isEmpty, setIsEmpty] = useState(false);
  const [toast, setToast] = useState<{ message: string; onUndo?: () => void } | null>(null);

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

  const openGenericAddSheet = () => {
    setAddSheetInitialType(undefined);
    setIsAddSheetOpen(true);
  };

  const openEditMealSheet = (mealType: string) => {
    setAddSheetInitialType(mealType);
    setIsAddSheetOpen(true);
  };

  const handleAddSheetSave = () => {
    setIsAddSheetOpen(false);
    setActiveTab('main');
    setIsEmpty(false); // Assume adding a meal makes it not empty
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
            isLoading={isLoading}
            isOffline={isOffline}
            isEmpty={isEmpty}
            onDeleteMeal={showUndoToast}
            setIsEmpty={setIsEmpty}
            setIsLoading={setIsLoading}
          />
        );
      case 'stats':
        return (
          <StatsScreen 
            onSettingsClick={() => setIsSettingsOpen(true)} 
            isLoading={isLoading}
            isEmpty={isEmpty}
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

      {/* Main Content Area - Fixed: Removed overflow-y-auto to allow screens to handle it */}
      <main className="flex-1 relative overflow-hidden bg-gray-50">
        {renderContent()}
      </main>

      {/* Overlays */}
      <AddSheet 
        isOpen={isAddSheetOpen} 
        onClose={() => setIsAddSheetOpen(false)} 
        onSave={handleAddSheetSave}
        initialMealType={addSheetInitialType}
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

      {/* DEV TOOLS */}
      <div className="fixed top-20 right-0 p-2 flex flex-col gap-1 z-[100] opacity-0 hover:opacity-100 transition-opacity bg-white/80 backdrop-blur rounded-l-lg border border-r-0 border-gray-200 shadow-sm pointer-events-none hover:pointer-events-auto">
        <button onClick={() => setIsLoading(!isLoading)} className="text-[10px] bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded font-mono text-gray-600">
          {isLoading ? 'Stop Load' : 'Load'}
        </button>
        <button onClick={() => setIsEmpty(!isEmpty)} className="text-[10px] bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded font-mono text-gray-600">
          {isEmpty ? 'Fill' : 'Empty'}
        </button>
        <button onClick={() => setIsOffline(!isOffline)} className="text-[10px] bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded font-mono text-gray-600">
          {isOffline ? 'Online' : 'Offline'}
        </button>
      </div>

    </div>
  );
}