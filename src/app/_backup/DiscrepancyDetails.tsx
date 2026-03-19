import { useState } from 'react';
import { Badge } from './Badge';
import { useTheme } from '../contexts/ThemeContext';

type ChangeType = 'Modified' | 'Added' | 'Deleted' | 'Misplaced' | 'Repositioned';

interface DiscrepancyItem {
  changeType: ChangeType;
  value: string;
}

interface Category {
  title: string;
  color: string;
  items: DiscrepancyItem[];
}

// Group items by changeType so same-type items appear together under one badge
function groupByChangeType(items: DiscrepancyItem[]): { changeType: ChangeType; values: string[] }[] {
  const order: ChangeType[] = ['Modified', 'Added', 'Deleted', 'Misplaced', 'Repositioned'];
  const map = new Map<ChangeType, string[]>();
  for (const item of items) {
    if (!map.has(item.changeType)) map.set(item.changeType, []);
    map.get(item.changeType)!.push(item.value);
  }
  return order.filter((ct) => map.has(ct)).map((ct) => ({ changeType: ct, values: map.get(ct)! }));
}

export function DiscrepancyDetails() {
  const { theme } = useTheme();
  const [openSections, setOpenSections] = useState<Set<string>>(new Set(['TEXT']));

  const toggleSection = (title: string) => {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(title)) next.delete(title);
      else next.add(title);
      return next;
    });
  };

  const categories: Category[] = [
    {
      title: 'TEXT',
      color: theme.statusColors.modified,
      items: [
        { changeType: 'Modified', value: 'Tradenames has been changed to ™' },
        { changeType: 'Modified', value: 'Label revised date has been changed' },
        { changeType: 'Modified', value: 'The Revisions was changed to the next consecutive character.' },
        { changeType: 'Modified', value: 'The e-IFU symbol has been changed to e-IFU for US/Canada only.' },
      ],
    },
    {
      title: 'SYMBOLS',
      color: theme.statusColors.repositioned,
      items: [
        { changeType: 'Deleted', value: 'CE mark has been removed' },
        { changeType: 'Deleted', value: 'EC REP symbol from labels has been removed.' },
        { changeType: 'Deleted', value: 'EC REP address from labels has been removed.' },
        { changeType: 'Added',   value: 'MR Conditional symbol has been added' },
      ],
    },
    {
      title: 'IMAGE',
      color: theme.statusColors.modified,
      items: [
        { changeType: 'Modified', value: 'Background has been added in the size of the implant (11mm, 7)' },
      ],
    },
  ];

  return (
    <div className="space-y-4">
      <h3 className="text-sm uppercase tracking-wide font-bold text-gray-700">
        Changes made
      </h3>

      {categories.map((category) => {
        const isOpen = openSections.has(category.title);
        const grouped = groupByChangeType(category.items);

        return (
          <div key={category.title} className="bg-white border border-gray-300">
            {/* Section header */}
            <button
              onClick={() => toggleSection(category.title)}
              className="w-full border-l-4 px-4 py-3 bg-gray-50 flex items-center justify-between hover:bg-gray-100 transition-colors"
              style={{ borderLeftColor: '#111827' }}
            >
              <div className="flex items-center gap-3">
                <span className="text-xs uppercase tracking-wide text-gray-700 font-bold">
                  {category.title}
                </span>
                <span
                  className="text-xs px-2 py-0.5"
                  style={{ backgroundColor: '#f3f4f6', color: '#111827' }}
                >
                  {category.items.length}
                </span>
              </div>
              <svg
                className={`w-5 h-5 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="square" strokeLinejoin="bevel" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {isOpen && (
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-gray-300 bg-gray-100">
                    <th className="px-4 py-2 text-left text-[10px] uppercase tracking-wide text-gray-700 font-bold border-r border-gray-200 w-36">
                      Change Type
                    </th>
                    <th className="px-4 py-2 text-left text-[10px] uppercase tracking-wide text-gray-700 font-bold">
                      Details
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {grouped.map((group) => (
                    group.values.map((val, vi) => (
                      <tr key={`${group.changeType}-${vi}`} className="border-b border-gray-200 last:border-0">
                        {/* Badge only on the first row of each group; blank cell for subsequent rows */}
                        <td className="px-4 py-2 border-r border-gray-200 align-top">
                          <Badge type={group.changeType} />
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-700">{val}</td>
                      </tr>
                    ))
                  ))}
                </tbody>
              </table>
            )}
          </div>
        );
      })}
    </div>
  );
}
