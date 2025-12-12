import React, { useState, useEffect } from 'react';
import { Home, Plus, BarChart2, WifiOff, RotateCcw } from 'lucide-react';
import MainScreen from './screens/MainScreen';
import StatsScreen from './screens/StatsScreen';
import AddSheet from './screens/AddSheet';
import SettingsSheet from './screens/SettingsSheet';

// Simple navigation types
type Tab = 'main' | 'stats';

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('main');
  
  // Sheet Management
  const [isAddSheetOpen, setIsAddSheetOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  // Context for Add Sheet (Routing behavior)
  // Keeps track if we are adding to a specific existing meal
  const [addSheetInitialType, setAddSheetInitialType] = useState<string | undefined>(undefined);

  // Wireframe UI States
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

  const showUndoToast = () => {
    setToast({
      message: 'Meal deleted',
      onUndo: () => {
        setToast(null);
        // Logic to restore would go here
      }
    });
  };

  // --- Navigation & Routing Handlers ---

  // Entry Point 1 & 2: Center Nav Button OR Main Screen CTA
  const openGenericAddSheet = () => {
    setAddSheetInitialType(undefined); // No specific type pre-selected
    setIsAddSheetOpen(true);
  };

  // Entry Point 3: Inside existing meal (Edit/Add to specific)
  const openEditMealSheet = (mealType: string) => {
    setAddSheetInitialType(mealType); // Pre-select the meal type
    setIsAddSheetOpen(true);
  };

  // Exit Behavior: Save/Confirm
  const handleAddSheetSave = () => {
    setIsAddSheetOpen(false);
    // Rule: On Confirm, return to Main (same day)
    // If we were on Stats, this switches us back to Main to see the new entry
    setActiveTab('main');
  };

  // Exit Behavior: Cancel/Dismiss
  const handleAddSheetClose = () => {
    setIsAddSheetOpen(false);
    // Rule: On Cancel, return to previous screen/state unchanged
    // No activeTab change needed
  };

  const isOverlayOpen = isAddSheetOpen || isSettingsOpen;

  // Render the active screen content
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
    <div className="relative h-screen w-full max-w-md mx-auto bg-gray-50 overflow-hidden flex flex-col shadow-2xl text-gray-900 font-sans">
      
      {/* Offline Indicator */}
      {isOffline && (
        <div className="bg-gray-800/90 backdrop-blur-sm text-white text-[11px] font-semibold py-1.5 text-center flex items-center justify-center gap-2 z-50 absolute top-0 left-0 right-0">
          <WifiOff size={12} />
          <span>Offline Mode</span>
        </div>
      )}

      {/* Main Content Area - Scrollable */}
      <main className="flex-1 overflow-y-auto no-scrollbar pb-24 relative">
        {renderContent()}
      </main>

      {/* Overlays */}
      <AddSheet 
        isOpen={isAddSheetOpen} 
        onClose={handleAddSheetClose} 
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
        <div className="absolute bottom-24 left-4 right-4 bg-gray-900/90 backdrop-blur-md text-white px-4 py-3.5 rounded-2xl shadow-xl flex items-center justify-between z-50 animate-[slideUp_0.2s_ease-out]">
          <span className="text-sm font-medium">{toast.message}</span>
          {toast.onUndo && (
            <button 
              onClick={toast.onUndo}
              className="text-blue-400 text-sm font-semibold flex items-center gap-1.5 active:opacity-70"
            >
              <RotateCcw size={16} />
              Undo
            </button>
          )}
        </div>
      )}

      {/* Bottom Navigation - Hidden when overlay is open */}
      {!isOverlayOpen && (
        <nav className="absolute bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-t border-gray-200 h-[84px] pb-6 px-8 flex justify-between items-center z-40">
          <button 
            onClick={() => setActiveTab('main')}
            className={`flex flex-col items-center justify-center space-y-1 w-16 transition-colors ${activeTab === 'main' ? 'text-blue-600' : 'text-gray-400'}`}
          >
            <Home size={26} strokeWidth={activeTab === 'main' ? 2.5 : 2} />
            <span className="text-[10px] font-medium tracking-wide">Main</span>
          </button>

          <button 
            onClick={() => !isOffline && openGenericAddSheet()}
            disabled={isOffline}
            className={`flex flex-col items-center justify-center -mt-8 transition-all ${isOffline ? 'opacity-50 cursor-not-allowed' : 'active:scale-95'}`}
          >
            <div className="w-14 h-14 bg-blue-600 rounded-full flex items-center justify-center shadow-lg shadow-blue-600/30">
              <Plus size={30} color="white" strokeWidth={2.5} />
            </div>
          </button>

          <button 
            onClick={() => setActiveTab('stats')}
            className={`flex flex-col items-center justify-center space-y-1 w-16 transition-colors ${activeTab === 'stats' ? 'text-blue-600' : 'text-gray-400'}`}
          >
            <BarChart2 size={26} strokeWidth={activeTab === 'stats' ? 2.5 : 2} />
            <span className="text-[10px] font-medium tracking-wide">Stats</span>
          </button>
        </nav>
      )}

      {/* DEV TOOLS: Toggle States */}
      <div className="fixed top-20 right-0 p-2 flex flex-col gap-1 z-50 opacity-20 hover:opacity-100 transition-opacity bg-white/80 backdrop-blur rounded-l-lg border border-r-0 border-gray-200 shadow-sm">
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