import { Badge } from './Badge';
import type { Requirement, RequirementStatus } from '@/common/types';

const statusColors: Record<RequirementStatus, string> = {
  'Match':    '#16a34a',
  'Unmatch':  '#dc2626',
  'Mismatch': '#dc2626',
};

interface MissingChangesProps {
  requirements?: Requirement[];
}

export function MissingChanges({ requirements }: MissingChangesProps) {
  const reqs = requirements ?? [];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm uppercase tracking-wide font-bold text-gray-700">
          Requirements Summary
        </h3>
        <div className="flex items-center gap-3 text-xs">
          <span className="px-2 py-1 bg-gray-100 text-gray-600 font-semibold">
            {reqs.length} Requirements
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-300 overflow-hidden print-table-flow">
        <table
          className="w-full border-collapse text-sm"
          style={{ tableLayout: 'fixed' }}
        >
          <colgroup>
            <col style={{ width: '5%' }} />
            <col style={{ width: '10%' }} />
            <col style={{ width: '15%' }} />
            <col style={{ width: '22%' }} />
            <col style={{ width: '18%' }} />
            <col style={{ width: '18%' }} />
            <col style={{ width: '12%' }} />
          </colgroup>
          <thead>
            <tr className="bg-gray-100 border-b border-gray-300">
              <th className="px-2 py-2 text-left text-xs uppercase text-gray-900 font-bold border-r border-gray-200 overflow-hidden">#</th>
              <th className="px-2 py-2 text-left text-xs uppercase text-gray-900 font-bold border-r border-gray-200 overflow-hidden">Element</th>
              <th className="px-2 py-2 text-left text-xs uppercase text-gray-900 font-bold border-r border-gray-200 overflow-hidden">Change Type</th>
              <th className="px-2 py-2 text-left text-xs uppercase text-gray-900 font-bold border-r border-gray-200 overflow-hidden">Requirement</th>
              <th className="px-2 py-2 text-left text-xs uppercase text-gray-900 font-bold border-r border-gray-200 overflow-hidden">Expected Value</th>
              <th className="px-2 py-2 text-left text-xs uppercase text-gray-900 font-bold border-r border-gray-200 overflow-hidden">Actual Value</th>
              <th className="px-2 py-2 text-left text-xs uppercase text-gray-900 font-bold overflow-hidden">Status</th>
            </tr>
          </thead>
          <tbody>
            {reqs.map((req) => (
              <tr key={req.id} className="border-b border-gray-200 last:border-0 hover:bg-gray-50 text-xs">
                <td className="px-2 py-1.5 text-left text-gray-900 border-r border-gray-200 whitespace-nowrap">{req.id}</td>
                <td className="px-2 py-1.5 text-left border-r border-gray-200" style={{ wordBreak: 'break-word' }}>
                  <span className="text-gray-900">{req.elementType}</span>
                </td>
                <td className="px-2 py-1.5 text-left border-r border-gray-200" style={{ wordBreak: 'break-word' }}>
                  <Badge type={req.changeType as 'Modified' | 'Added' | 'Deleted'} />
                </td>
                <td className="px-2 py-1.5 text-left text-gray-900 border-r border-gray-200" style={{ wordBreak: 'break-word' }}>{req.description}</td>
                <td className="px-2 py-1.5 text-left text-gray-900 border-r border-gray-200" style={{ wordBreak: 'break-word' }}>{req.expectedValue}</td>
                <td className="px-2 py-1.5 text-left text-gray-900 border-r border-gray-200" style={{ wordBreak: 'break-word' }}>{req.actualValue}</td>
                <td className="px-2 py-1.5 text-left">
                  <span className="text-xs font-semibold" style={{ color: statusColors[req.status] }}>
                    {req.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
