import { Badge } from './Badge';
import type { Requirement, RequirementStatus } from '../types';

const statusColors: Record<RequirementStatus, string> = {
  'Match':   '#16a34a',
  'Unmatch': '#dc2626',
};

interface MissingChangesProps {
  requirements?: Requirement[];
}

const staticRequirements: Requirement[] = [
  { id: 1, elementType: 'Text',   changeType: 'Modified', description: 'Trademark ® change to ™',                               expectedValue: '™',                             actualValue: '™',                             status: 'Match' },
  { id: 2, elementType: 'Symbol', changeType: 'Deleted',  description: 'Remove CE mark',                                         expectedValue: 'CE mark removed',                actualValue: 'CE mark removed',                status: 'Match' },
  { id: 3, elementType: 'Text',   changeType: 'Modified', description: 'All Revisions change to the next consecutive character',  expectedValue: 'Next consecutive character',     actualValue: 'Next consecutive character',     status: 'Match' },
  { id: 4, elementType: 'Symbol', changeType: 'Deleted',  description: 'Remove EC REP symbol from labels where applicable',       expectedValue: 'EC REP symbol removed',          actualValue: 'EC REP symbol removed',          status: 'Match' },
  { id: 5, elementType: 'Symbol', changeType: 'Deleted',  description: 'Remove EC REP address from labels where applicable',      expectedValue: 'EC REP address removed',         actualValue: 'EC REP address removed',         status: 'Match' },
  { id: 6, elementType: 'Symbol', changeType: 'Added',    description: 'Add MR Conditional symbol',                              expectedValue: 'MR Conditional symbol present',  actualValue: 'MR Conditional symbol present',  status: 'Match' },
  { id: 7, elementType: 'Text',   changeType: 'Modified', description: 'Change e-IFU symbol to e-IFU for US/Canada only',         expectedValue: 'e-IFU for US/Canada only',       actualValue: 'e-IFU for US/Canada only',       status: 'Match' },
  { id: 8, elementType: 'Text',   changeType: 'Modified', description: 'Change the manufacturing date',                          expectedValue: 'Updated manufacturing date',     actualValue: 'Updated manufacturing date',     status: 'Match' },
  { id: 9, elementType: 'Image',  changeType: 'Modified', description: 'Add background in the size of the implant (11mm, 7)',     expectedValue: 'Background added (11mm, 7)',     actualValue: 'Background added (11mm, 7)',      status: 'Match' },
];

export function MissingChanges({ requirements }: MissingChangesProps) {
  const reqs = requirements ?? staticRequirements;

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
      <div className="bg-white border border-gray-300 overflow-hidden">
        <table
          className="w-full border-collapse text-sm"
          style={{ tableLayout: 'fixed' }}
        >
          <colgroup>
            <col style={{ width: '3%' }} />
            <col style={{ width: '11%' }} />
            <col style={{ width: '15%' }} />
            <col style={{ width: '26%' }} />
            <col style={{ width: '19%' }} />
            <col style={{ width: '18%' }} />
            <col style={{ width: '8%' }} />
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
                <td className="px-2 py-1.5 text-left text-gray-900 border-r border-gray-200" style={{ wordBreak: 'break-word' }}>{req.id}</td>
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
