import React from 'react';
import { Settings } from 'lucide-react';

interface PageHeaderProps {
  title: React.ReactNode;
  subtitle: string;
  onSettingsClick: () => void;
  bottomContent?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({ 
  title, 
  subtitle, 
  onSettingsClick, 
  bottomContent 
}) => {
  return (
    <header className="sticky top-0 z-30 bg-gray-50/90 backdrop-blur-xl border-b border-gray-100 transition-all pt-safe-top">
      {/* Row 1: Identity */}
      <div className="flex items-center justify-between px-6 pt-4 pb-1">
        <div className="flex flex-col">
          <div className="text-2xl font-bold text-gray-900 tracking-tight leading-none mb-1">
             {title}
          </div>
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
            {subtitle}
          </span>
        </div>
        <button 
          onClick={onSettingsClick} 
          className="p-2.5 rounded-full bg-white border border-gray-100 text-gray-400 hover:bg-gray-50 hover:text-gray-600 active:bg-gray-100 transition-all shadow-[0_1px_2px_rgba(0,0,0,0.05)]"
        >
          <Settings size={20} strokeWidth={2} />
        </button>
      </div>
      
      {/* Row 2: Context Selector / Bottom Content */}
      {bottomContent && (
        <div className="w-full px-6 pb-3">
          {bottomContent}
        </div>
      )}
    </header>
  );
};
