import { useState } from 'react';
import { Badge } from './Badge';

// ─── Exported types so callers can build per-revision data ────────────────────

export interface ExpectedChangesItem {
  attribute: string;
  changeType: string;
  value: string;
}

export interface ExpectedChangesSection {
  category: string;
  items: ExpectedChangesItem[];
}

export interface ExpectedChangesTabData {
  expected: ExpectedChangesSection[];
  actual:   ExpectedChangesSection[];
}

export interface ExpectedChangesData {
  text?:     ExpectedChangesTabData;
  symbols?:  ExpectedChangesTabData;
  barcodes?: ExpectedChangesTabData;
  images?:   ExpectedChangesTabData;
}

export function ExpectedChanges({ data }: { data?: ExpectedChangesData }) {
  const [attributeOverrides, setAttributeOverrides] = useState<Record<string, string>>({});

  function attrKey(tab: string, sectionIndex: number, itemIndex: number) {
    return `${tab}-${sectionIndex}-${itemIndex}`;
  }

  function getAttr(tab: string, sectionIndex: number, itemIndex: number, fallback: string) {
    return attributeOverrides[attrKey(tab, sectionIndex, itemIndex)] ?? fallback;
  }

  function setAttr(tab: string, sectionIndex: number, itemIndex: number, value: string) {
    setAttributeOverrides(prev => ({ ...prev, [attrKey(tab, sectionIndex, itemIndex)]: value }));
  }

  const textData = {
    expected: [
      {
        category: 'Product Identification',
        items: [
          { attribute: 'Reference Number', changeType: 'Modified', value: 'MX-8845-02-R' },
          { attribute: 'Product Name', changeType: 'Modified', value: 'SurgiClip Hemostatic Clip' },
        ],
      },
      {
        category: 'Dates',
        items: [
          { attribute: 'Manufacturing Date', changeType: 'Modified', value: '2026-02' },
          { attribute: 'Expiry Date', changeType: 'Added', value: '2031-02' },
        ],
      },
      {
        category: 'Warnings',
        items: [
          { attribute: 'Caution Statement', changeType: 'Added', value: 'CAUTION: Read instructions before use' },
          { attribute: 'Single Use Statement', changeType: 'Modified', value: 'Single use only • Do not reuse' },
          { attribute: 'Distributor Line', changeType: 'Deleted', value: 'Distributed by MedSupply Corp.' },
        ],
      },
    ],
    actual: [
      {
        category: 'Product Identification',
        items: [
          { attribute: 'Reference Number', changeType: 'Modified', value: 'MX-8845-02-R' },
          { attribute: 'Product Name', changeType: 'Modified', value: 'SurgiClip Hemostatic Clip' },
        ],
      },
      {
        category: 'Dates',
        items: [
          { attribute: 'Manufacturing Date', changeType: 'Modified', value: '2026-02' },
          { attribute: 'Expiry Date', changeType: 'Added', value: '— NOT FOUND —' },
        ],
      },
      {
        category: 'Warnings',
        items: [
          { attribute: 'Caution Statement', changeType: 'Added', value: 'CAUTION: Read instructions before use' },
          { attribute: 'Single Use Statement', changeType: 'Modified', value: 'Single use only' },
          { attribute: 'Distributor Line', changeType: 'Deleted', value: 'Distributed by MedSupply Corp.' },
        ],
      },
    ],
  };

  const symbolsData = {
    expected: [
      {
        category: 'Regulatory Symbols',
        items: [
          { attribute: 'CE Mark', changeType: 'Modified', value: 'Position: (15mm, 85mm)' },
          { attribute: 'Medical Device', changeType: 'Repositioned', value: 'Position: (25mm, 12mm)' },
        ],
      },
    ],
    actual: [
      {
        category: 'Regulatory Symbols',
        items: [
          { attribute: 'CE Mark', changeType: 'Modified', value: 'Position: (15mm, 85mm)' },
          { attribute: 'Medical Device', changeType: 'Repositioned', value: 'Position: (25mm, 8mm)' },
        ],
      },
    ],
  };

  const barcodesData = {
    expected: [
      {
        category: 'Linear Barcodes',
        items: [
          { attribute: 'GS1-128 Primary', changeType: 'Modified', value: '(01)08712345678906(17)310226(10)20260215A' },
          { attribute: 'REF Barcode', changeType: 'Modified', value: 'MX-8845-02-R' },
        ],
      },
    ],
    actual: [
      {
        category: 'Linear Barcodes',
        items: [
          { attribute: 'GS1-128 Primary', changeType: 'Modified', value: '(01)08712345678906(17)310226(10)20260215A' },
          { attribute: 'REF Barcode', changeType: 'Modified', value: 'MX-8845-02-R' },
        ],
      },
    ],
  };

  const imagesData = {
    expected: [
      {
        category: 'Medical Device & Logos',
        items: [
          { attribute: 'Medical Device', changeType: 'Added', value: 'ISO 15223-1 Medical Device' },
          { attribute: 'Company Logo', changeType: 'Modified', value: 'Updated brand guidelines 2026' },
        ],
      },
    ],
    actual: [
      {
        category: 'Medical Device & Logos',
        items: [
          { attribute: 'Medical Device', changeType: 'Added', value: 'ISO 15223-1 Medical Device' },
          { attribute: 'Company Logo', changeType: 'Modified', value: '— NOT FOUND —' },
        ],
      },
    ],
  };

  // Build list of sections that actually have data, in order
  const sections: { label: string; key: string; tabData: ExpectedChangesTabData }[] = [];
  const fallback = data ?? { text: textData, symbols: symbolsData, barcodes: barcodesData, images: imagesData };
  const entries: [string, string, ExpectedChangesTabData | undefined][] = [
    ['Text',     'text',     fallback.text],
    ['Symbols',  'symbols',  fallback.symbols],
    ['Barcodes', 'barcodes', fallback.barcodes],
    ['Images',   'images',   fallback.images],
  ];
  for (const [label, key, td] of entries) {
    if (td && td.expected.some(s => s.items.length > 0)) {
      sections.push({ label, key, tabData: td });
    }
  }

  function renderSection(label: string, key: string, tabData: ExpectedChangesTabData) {
    return (
      <div key={key} className="space-y-4">
        <div className="text-xs uppercase tracking-wide font-bold text-gray-600 border-b border-gray-200 pb-1">{label}</div>
        {tabData.expected.map((section, sectionIndex) => (
          <div key={section.category}>
            {section.category !== 'Requirements' && (
              <div className="text-xs uppercase tracking-wide text-gray-500 font-bold mb-3 px-2">{section.category}</div>
            )}
            <table className="w-full border-collapse border border-gray-300 text-sm" style={{ tableLayout: 'fixed' }}>
              <thead>
                <tr>
                  <th colSpan={3} className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide bg-[#eff6ff] border-t-4 border-t-[#3b82f6] border-b border-b-gray-300 border-r border-r-gray-400" style={{ color: '#2563eb' }}>
                    Expected Changes
                  </th>
                  <th colSpan={3} className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide bg-[#f0fdf4] border-t-4 border-t-[#22c55e] border-b border-b-gray-300" style={{ color: '#16a34a' }}>
                    Changes Done
                  </th>
                </tr>
                <tr className="border-b border-gray-300">
                  <th className="px-4 py-2 text-left text-[10px] uppercase tracking-wide text-gray-500 font-bold bg-[#eff6ff] border-r border-gray-200 w-36">Attribute</th>
                  <th className="px-4 py-2 text-left text-[10px] uppercase tracking-wide text-gray-500 font-bold bg-[#eff6ff] border-r border-gray-200 w-32">Change Type</th>
                  <th className="px-4 py-2 text-left text-[10px] uppercase tracking-wide text-gray-500 font-bold bg-[#eff6ff] border-r border-r-gray-400">Expected Value</th>
                  <th className="px-4 py-2 text-left text-[10px] uppercase tracking-wide text-gray-500 font-bold bg-[#f0fdf4] border-r border-gray-200 w-36">Attribute</th>
                  <th className="px-4 py-2 text-left text-[10px] uppercase tracking-wide text-gray-500 font-bold bg-[#f0fdf4] border-r border-gray-200 w-32">Change Type</th>
                  <th className="px-4 py-2 text-left text-[10px] uppercase tracking-wide text-gray-500 font-bold bg-[#f0fdf4]">Actual Value</th>
                </tr>
              </thead>
              <tbody>
                {section.items.map((item, index) => {
                  const actualItem = tabData.actual[sectionIndex]?.items[index];
                  const attrValue = getAttr(key, sectionIndex, index, item.attribute);
                  return (
                    <tr key={index} className="border-b border-gray-200 last:border-0">
                      <td className="px-2 py-1 bg-[#eff6ff] border-r border-gray-200">
                        <input
                          value={attrValue}
                          onChange={e => setAttr(key, sectionIndex, index, e.target.value)}
                          className="w-full px-2 py-1 text-sm text-gray-700 bg-transparent rounded border border-transparent hover:border-blue-300 focus:border-blue-500 focus:outline-none focus:bg-white transition-colors"
                          title="Click to edit attribute name"
                        />
                      </td>
                      <td className="px-4 py-2 bg-[#eff6ff] border-r border-gray-200"><Badge type={item.changeType as any} /></td>
                      <td className="px-4 py-2 text-gray-700 font-mono text-xs bg-[#eff6ff] border-r border-r-gray-400">{item.value}</td>
                      <td className="px-4 py-2 text-gray-700 bg-[#f0fdf4] border-r border-gray-200">{attrValue}</td>
                      <td className="px-4 py-2 bg-[#f0fdf4] border-r border-gray-200"><Badge type={(actualItem?.changeType ?? item.changeType) as any} /></td>
                      <td className={`px-4 py-2 font-mono text-xs bg-[#f0fdf4] ${!actualItem || actualItem.value === '— NOT FOUND —' ? 'text-red-600 italic' : 'text-gray-700'}`}>
                        {actualItem?.value ?? '— NOT FOUND —'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-300">
      <div className="px-6 pt-6 pb-2 border-b border-gray-200">
        <h3 className="text-sm uppercase tracking-wide font-bold text-gray-700">Expected Changes</h3>
      </div>
      <div className="p-6 space-y-8">
        {sections.length === 0 ? (
          <div className="text-sm text-gray-400 italic text-center py-4">No requirements data.</div>
        ) : (
          sections.map(({ label, key, tabData }) => renderSection(label, key, tabData))
        )}
      </div>
    </div>
  );
}
