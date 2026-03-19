interface BoundingBox {
  label: string;
  type: 'Modified' | 'Added' | 'Deleted' | 'Misplaced';
  top: string;
  left: string;
  width: string;
  labelOffset?: string; // extra downward nudge for this label only
}

interface LabelComparisonProps {
  show?: 'both' | 'master';
}

// Blue box = Modified, Green box = Added, Red box = Deleted
const typeColors: Record<BoundingBox['type'], string> = {
  Modified:  '#2563eb',
  Added:     '#16a34a',
  Deleted:   '#dc2626',
  Misplaced: '#9333ea',
};

// ─── Rev D boxes (812 × 1088 px) ────────────────────────────────────────────
// Band 1, sub-box 1 → rows 48-107 (4.4%-9.8%), cols 116-145 (14.3%-17.9%)  — BENGAL mark
// Band 1, sub-box 2 → rows 48-107 (4.4%-9.8%), cols 656-799 (80.8%-98.4%)  — Date 2022-06-03
// Band 2            → rows 240-277 (22.1%-25.5%), cols 4-163 (0.5%-20.1%)   — 11mm, 7°
// Band 3            → rows 886-969 (81.4%-89.1%), cols 526-727 (64.8%-89.5%)— IFU contact
// Band 4            → rows 1050-1083 (96.5%-99.5%), cols 754-779 (92.9%-95.9%)— REV D
const revDBoxes: BoundingBox[] = [
  {
    label: 'Modified',
    type: 'Modified',
    top: '4.4%',
    left: '14.3%',
    width: '3.6%',
  },
  {
    label: 'Modified',
    type: 'Modified',
    top: '4.4%',
    left: '80.8%',
    width: '17.6%',
    labelOffset: '8px',
  },
  {
    label: 'Deleted',
    type: 'Deleted',
    top: '16.7%',   // CE symbol — RED cluster 1 (rows 182-277, cols 722-811)
    left: '88.9%',
    width: '11.1%',
  },
  {
    label: 'Modified',
    type: 'Modified',
    top: '22.1%',
    left: '0.5%',
    width: '19.6%',
  },
  {
    label: 'Deleted',
    type: 'Deleted',
    top: '66.4%',   // EC REP symbol box (cols 386-477)
    left: '47.5%',
    width: '11%',
  },
  {
    label: 'Deleted',
    type: 'Deleted',
    top: '66.4%',   // EC REP address text box (cols 483-710)
    left: '67%',
    width: '27.9%',
    labelOffset: '4px',
  },
  {
    label: 'Modified',
    type: 'Modified',
    top: '81.4%',
    left: '64.8%',
    width: '24.7%',
  },
  {
    label: 'Modified',
    type: 'Modified',
    top: '96.5%',   // REV.D marker — Band 4 (rows 1050-1083, cols 754-779)
    left: '92.9%',
    width: '3%',
  },
];

// ─── Rev E boxes (874 × 1176 px) ────────────────────────────────────────────
// Band 1, sub-box 1 → rows 50-115 (4.3%-9.8%), cols 126-165 (14.4%-18.9%)  — BENGAL mark
// Band 1, sub-box 2 → rows 50-115 (4.3%-9.8%), cols 698-851 (79.9%-97.4%)  — Date 2025-06-12
// Band 2            → rows 256-309 (21.8%-26.3%), cols 6-483 (0.7%-55.3%)   — 11mm, 7°
// Green band        → rows 760-859 (64.6%-73.0%), cols 424-519 (48.5%-59.4%)— Added symbols
// Band 3            → rows 872-941 (74.1%-80.0%), cols 560-773 (64.1%-88.4%)— IFU contact
// Band 4            → rows 1132-1165 (96.3%-99.1%), cols 804-835 (92.0%-95.5%)— REV E
const revEBoxes: BoundingBox[] = [
  {
    label: 'Modified',
    type: 'Modified',
    top: '4.3%',
    left: '14.4%',
    width: '4.5%',
  },
  {
    label: 'Modified',
    type: 'Modified',
    top: '4.3%',
    left: '79.9%',
    width: '17.5%',
    labelOffset: '8px',
  },
  {
    label: 'Modified',
    type: 'Modified',
    top: '21.8%',
    left: '0.7%',
    width: '54.6%',
  },
  {
    label: 'Added',
    type: 'Added',
    top: '64.6%',
    left: '48.5%',
    width: '11%',
  },
  {
    label: 'Modified',
    type: 'Modified',
    top: '74.1%',
    left: '64.1%',
    width: '24.3%',
  },
  {
    label: 'Modified',
    type: 'Modified',
    top: '96.3%',
    left: '92%',
    width: '3.5%',
  },
];

function LabelBox({
  src,
  title,
  subtitle,
  boxes,
}: {
  src: string;
  title: string;
  subtitle?: string;
  boxes?: BoundingBox[];
}) {
  return (
    <div className="bg-white border border-gray-300">
      <div className="bg-gray-100 border-b border-gray-300 px-4 py-2">
        <div className="text-[10px] uppercase tracking-wide text-gray-500 font-bold">
          {title}
        </div>
        {subtitle && (
          <div className="text-[10px] text-gray-400 mt-0.5">{subtitle}</div>
        )}
      </div>
      <div className="p-4">
        <div className="relative w-full">
          <img src={src} alt={title} className="w-full h-auto block" />
          {boxes?.map((box, i) => {
            const color = typeColors[box.type];
            return (
              /*
               * The outer div is positioned at box.top (the exact top edge of
               * the bounding box) then shifted UP by 100% of its own height via
               * translateY(-100%).  This reliably places the tag's bottom edge
               * flush against the top of the bounding box regardless of
               * container height.
               */
              <div
                key={i}
                className="absolute pointer-events-none inline-block"
                style={{
                  top: box.top,
                  left: box.left,
                  transform: `translateY(calc(-100% - 2px + ${box.labelOffset ?? '0px'}))`,
                }}
              >
                <span
                  className="font-semibold whitespace-nowrap block"
                  style={{
                    color: color,
                    fontSize: '11px',
                    lineHeight: 1,
                  }}
                >
                  {box.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function LabelComparison({ show = 'both' }: LabelComparisonProps) {
  return (
    <div className={show === 'both' ? 'grid grid-cols-2 gap-6' : 'grid grid-cols-1'}>
      {show === 'both' && (
        <LabelBox
          src="/LCN-187301111_1_Rev-D.png"
          title="Current Version Label"
          subtitle="LCN-187301111_1_Rev-D"
          boxes={revDBoxes}
        />
      )}
      <LabelBox
        src="/LCN-187301111_1_Rev-E.png"
        title="New Version Label"
        subtitle="LCN-187301111_1_Rev-E"
        boxes={revEBoxes}
      />
    </div>
  );
}
