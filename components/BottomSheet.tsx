import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  leftAction?: React.ReactNode;
  rightAction?: React.ReactNode; // Defaults to Close X if undefined. Pass null to hide.
  footer?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export const BottomSheet: React.FC<BottomSheetProps> = ({
  isOpen,
  onClose,
  title,
  leftAction,
  rightAction,
  footer,
  children,
  className = 'bg-white'
}) => {
  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-50 transition-opacity"
        onClick={onClose}
      />
      
      {/* Sheet Container */}
      <div className={`fixed bottom-0 left-0 right-0 mx-auto max-w-md rounded-t-[2rem] z-50 flex flex-col max-h-[92vh] shadow-2xl animate-[slideUp_0.3s_cubic-bezier(0.16,1,0.3,1)] ${className}`}>

        {/* Grab Handle */}
        <div className="pt-6 pb-2 flex-shrink-0 cursor-grab active:cursor-grabbing" onClick={onClose}>
             <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto" />
        </div>

        {/* Header */}
        {(title || leftAction || rightAction !== null) && (
            <div className="flex items-center justify-between px-6 pb-4 pt-2 flex-shrink-0 min-h-[3rem]">
                <div className="flex items-center gap-3 overflow-hidden">
                    {leftAction}
                    {title && <div className="text-2xl font-bold text-gray-900 tracking-tight truncate">{title}</div>}
                </div>
                {rightAction !== undefined ? rightAction : (
                     <button
                        onClick={onClose}
                        className="p-2 bg-gray-100 rounded-full text-gray-500 hover:bg-gray-200 transition-colors flex-shrink-0"
                    >
                        <X size={20} />
                    </button>
                )}
            </div>
        )}

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto no-scrollbar px-6 pb-6">
            {children}
        </div>

        {/* Sticky Footer */}
        {footer && (
            <div className="p-6 pt-4 border-t border-gray-100 mt-auto bg-inherit flex-shrink-0 safe-area-bottom">
                {footer}
            </div>
        )}
      </div>
    </>
  );
};