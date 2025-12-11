import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { InfoPopupData } from '../types';

interface InfoPopupProps {
  data: InfoPopupData;
}

export const InfoPopup: React.FC<InfoPopupProps> = ({ data }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [style, setStyle] = useState<React.CSSProperties>({});
  const buttonRef = useRef<HTMLButtonElement>(null);

  const togglePopup = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    
    if (isOpen) {
      setIsOpen(false);
      return;
    }

    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const tooltipWidth = 256; // w-64 is 16rem = 256px
      const viewportWidth = window.innerWidth;
      
      // Horizontal Positioning: Center relative to button
      let left = rect.left + (rect.width / 2) - (tooltipWidth / 2);
      
      // Clamp to edges (padding 10px)
      if (left < 10) left = 10;
      if (left + tooltipWidth > viewportWidth - 10) {
        left = viewportWidth - tooltipWidth - 10;
      }

      const calculatedStyle: React.CSSProperties = {
        left: `${left}px`,
        position: 'fixed',
        zIndex: 10000, // Ensure it sits on top of everything
      };

      // Vertical Positioning: Smart flip
      // Check space above (assuming tooltip height approx 100-150px)
      if (rect.top > 180) {
        // Place above
        calculatedStyle.top = `${rect.top - 8}px`;
        calculatedStyle.transform = 'translateY(-100%)';
      } else {
        // Place below
        calculatedStyle.top = `${rect.bottom + 8}px`;
      }

      setStyle(calculatedStyle);
      setIsOpen(true);
    }
  };

  // Close on scroll or resize to avoid detached floating elements
  useEffect(() => {
    const handleDismiss = () => {
      if (isOpen) setIsOpen(false);
    };
    
    window.addEventListener('resize', handleDismiss);
    window.addEventListener('scroll', handleDismiss, true); // Capture phase for nested scrolls
    
    return () => {
      window.removeEventListener('resize', handleDismiss);
      window.removeEventListener('scroll', handleDismiss, true);
    };
  }, [isOpen]);

  return (
    <>
      <button
        ref={buttonRef}
        onClick={togglePopup}
        className="inline-flex items-center justify-center w-4 h-4 ml-1.5 text-[10px] font-bold text-gray-400 border border-gray-600 rounded-full hover:text-white hover:border-crypto-accent hover:bg-crypto-accent/20 transition-all cursor-pointer"
        aria-label="Info"
      >
        i
      </button>

      {isOpen && createPortal(
        <div className="fixed inset-0 z-[9999] isolate font-sans">
           {/* Invisible backdrop to handle closing when clicking outside */}
           <div className="absolute inset-0 bg-transparent" onClick={() => setIsOpen(false)} />
           
           {/* Popup Content */}
           <div 
             className="absolute bg-crypto-card border border-gray-600 text-left p-3 rounded-lg shadow-2xl w-64 pointer-events-auto"
             style={style}
             onClick={(e) => e.stopPropagation()} // Prevent closing if clicking text inside
           >
             <h4 className="font-bold text-xs text-white mb-1 flex items-center gap-2">
                <span className="w-1 h-3 bg-crypto-accent rounded-full"></span>
                {data.title}
             </h4>
             <p className="text-[11px] text-gray-300 leading-relaxed opacity-90">{data.content}</p>
             
             {/* Decorative Arrow (visual only, simplified) */}
             <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 w-0 h-0" />
           </div>
        </div>,
        document.body
      )}
    </>
  );
};