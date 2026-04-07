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

export function ExpectedChanges() {
  const [activeTab, setActiveTab] = useState<'Text' | 'Symbols' | 'Barcodes' | 'Images'>('Text');

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

  const getData = () => {
    switch (activeTab) {
      case 'Text': return textData;
      case 'Symbols': return symbolsData;
      case 'Barcodes': return barcodesData;
      case 'Images': return imagesData;
    }
  };

  const data = getData();

  return (
    <div className="bg-white border border-gray-300">
      {/* Tabs */}
      <div className="flex border-b border-gray-300">
        {(['Text', 'Symbols', 'Barcodes', 'Images'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2 text-sm transition-colors ${
              activeTab === tab
                ? 'bg-[#064b75] text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Two Column Layout */}
      <div className="p-6 space-y-6">
        {data.expected.map((section, sectionIndex) => (
          <div key={section.category}>
            <div className="text-xs uppercase tracking-wide text-gray-500 font-bold mb-3 px-2">
              {section.category}
            </div>
            <table className="w-full border-collapse border border-gray-300 text-sm">
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
                  const actualItem = data.actual[sectionIndex].items[index];
                  return (
                    <tr key={index} className="border-b border-gray-200 last:border-0">
                      <td className="px-4 py-2 text-gray-700 bg-[#eff6ff] border-r border-gray-200">{item.attribute}</td>
                      <td className="px-4 py-2 bg-[#eff6ff] border-r border-gray-200"><Badge type={item.changeType as any} /></td>
                      <td className="px-4 py-2 text-gray-700 font-mono text-xs bg-[#eff6ff] border-r border-r-gray-400">{item.value}</td>
                      <td className="px-4 py-2 text-gray-700 bg-[#f0fdf4] border-r border-gray-200">{actualItem.attribute}</td>
                      <td className="px-4 py-2 bg-[#f0fdf4] border-r border-gray-200"><Badge type={actualItem.changeType as any} /></td>
                      <td className={`px-4 py-2 font-mono text-xs bg-[#f0fdf4] ${actualItem.value === '— NOT FOUND —' ? 'text-red-600 italic' : 'text-gray-700'}`}>
                        {actualItem.value}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    </div>
  );
}
