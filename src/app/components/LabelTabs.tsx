import { useRef, useState, useEffect } from 'react';

interface LabelTabsProps {
  labels: string[];
  activeLabel: string;
  onLabelChange: (label: string) => void;
}

export function LabelTabs({ labels, activeLabel, onLabelChange }: LabelTabsProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showFade, setShowFade] = useState(false);

  useEffect(() => {
    const checkScroll = () => {
      if (scrollRef.current) {
        const { scrollWidth, clientWidth } = scrollRef.current;
        setShowFade(scrollWidth > clientWidth);
      }
    };

    checkScroll();
    window.addEventListener('resize', checkScroll);
    return () => window.removeEventListener('resize', checkScroll);
  }, [labels]);

  return (
    <div className="relative bg-white border-b border-gray-300">
      <div
        ref={scrollRef}
        className="flex overflow-x-auto scrollbar-hide"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {labels.map((label) => (
          <button
            key={label}
            onClick={() => onLabelChange(label)}
            className={`px-6 py-3 text-sm whitespace-nowrap border-r border-gray-300 transition-colors ${
              activeLabel === label
                ? 'bg-gray-800 text-white'
                : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      {showFade && (
        <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-white to-transparent pointer-events-none" />
      )}
    </div>
  );
}
