import { useTheme } from '../contexts/ThemeContext';

interface LegendProps {
  scenario?: 'A' | 'B' | 'C';
}

export function Legend({ scenario = 'A' }: LegendProps) {
  const { theme } = useTheme();
  
  const items = [
    { label: 'Added', color: theme.statusColors.added, expected: 5, done: 3 },
    { label: 'Deleted', color: theme.statusColors.deleted, expected: 2, done: 2 },
    { label: 'Modified', color: theme.statusColors.modified, expected: 6, done: 4 },
    { label: 'Repositioned', color: theme.statusColors.repositioned, expected: 1, done: 1 },
  ];

  const showCounts = true;

  return (
    <div className="bg-white border border-gray-300 p-4">
      <div className="flex items-center gap-6">
        <span className="text-[10px] uppercase tracking-wide text-gray-500 font-bold">Legend:</span>
        {items.map((item) => (
          <div key={item.label} className="flex items-center gap-2">
            <div 
              className="w-3 h-3 border-2" 
              style={{ borderColor: item.color, backgroundColor: `${item.color}20` }}
            />
            <span className="text-sm text-gray-700">
              {item.label}
              {showCounts && (
                <span className="ml-2">
                  <span className="text-gray-400">{item.expected}</span>
                  <span className="text-gray-400">/</span>
                  <span style={{ color: item.color }}>{item.done}</span>
                </span>
              )}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}