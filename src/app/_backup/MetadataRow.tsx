export function MetadataRow() {
  const metadata = [
    { label: 'CR Number (Optional)', value: '-', breakAll: false },
    { label: 'SKU', value: '187301111', breakAll: false },
    {
      label: 'Label Revision',
      breakAll: false,
      value: (
        <span className="flex items-center gap-1.5">
          <span>Rev-D</span>
          <span className="text-[#D71500]">→</span>
          <span>Rev-E</span>
        </span>
      )
    },
    { label: 'Current Version Label', value: 'LCN-187301111_1_Rev-D', breakAll: true },
    { label: 'New Version Label', value: 'LCN-187301111_1_Rev-E', breakAll: true },
    { label: 'Inspected By', value: 'Susanne Piche', breakAll: false },
    { label: 'Date', value: '2025-08-22', breakAll: false },
  ];

  return (
    <div className="bg-white border border-gray-300 grid" style={{ gridTemplateColumns: '0.7fr 0.7fr 1fr 1.5fr 1.5fr' }}>
      {metadata.map((item, index) => (
        <div
          key={index}
          className={`px-3 py-1.5 ${index < metadata.length - 1 ? 'border-r border-gray-300' : ''} ${
            item.label === 'Inspected By' || item.label === 'Date' ? 'hidden' : ''
          }`}
        >
          <div className="text-[10px] uppercase tracking-wide text-gray-500 font-bold mb-1">
            {item.label}
          </div>
          <div className={`text-xs text-gray-900 ${item.breakAll ? 'break-all' : ''}`}>
            {item.value}
          </div>
        </div>
      ))}
    </div>
  );
}
