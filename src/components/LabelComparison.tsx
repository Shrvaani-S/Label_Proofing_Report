import { useTheme } from '@/common/ThemeContext';
import type { DrawnBox } from '@/common/types';


interface LabelComparisonProps {
  show?: 'both' | 'master';
  // Dynamic props — when provided, override the static defaults
  currentLabelUrl?: string;
  currentLabelName?: string;
  newLabelUrl?: string;
  newLabelName?: string;
  currentBoxes?: DrawnBox[];
  newBoxes?: DrawnBox[];
}



function LabelBox({
  src, title, subtitle, drawnBoxes,
}: {
  src: string;
  title: string;
  subtitle?: string;
  drawnBoxes?: DrawnBox[];
}) {
  const { theme } = useTheme();
  const typeColorMap: Record<BoundingBox['type'], string> = {
    Modified:  theme.statusColors.modified,
    Added:     theme.statusColors.added,
    Deleted:   theme.statusColors.deleted,
    Misplaced: theme.statusColors.repositioned,
  };

  return (
    <div className="bg-white border border-gray-300">
      <div className="bg-gray-100 border-b border-gray-300 px-4 py-2">
        <div className="text-[10px] uppercase tracking-wide text-gray-500 font-bold">{title}</div>
        {subtitle && <div className="text-[10px] text-gray-400 mt-0.5">{subtitle}</div>}
      </div>
      <div className="p-4">
        <div className="relative w-full">
          <img src={src} alt={title} className="w-full h-auto block" />

          {/* Drawn boxes: label + colored rectangle */}
          {drawnBoxes?.map(box => {
            const color = typeColorMap[box.type];
            return (
              <div key={box.id}>
                {/* Rectangle outline */}
                <div
                  className="bb-box absolute pointer-events-none"
                  style={{
                    top:             `${box.top}%`,
                    left:            `${box.left}%`,
                    width:           `${box.width}%`,
                    height:          `${box.height}%`,
                    border:          `2px solid ${typeColorMap[box.type]}`,
                    backgroundColor: 'transparent',
                  }}
                />
                {/* Label above box */}
                <div
                  className="bb-label-wrap absolute pointer-events-none inline-block"
                  style={{
                    top:       `${box.top}%`,
                    left:      `${box.left}%`,
                    transform: 'translateY(calc(-100% - 2px))',
                  }}
                >
                  <span
                    className="bb-label font-semibold whitespace-nowrap block"
                    style={{ color, fontSize: '9px', lineHeight: 1 }}
                  >
                    {box.text || box.type}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function EmptyLabelBox({ title }: { title: string }) {
  return (
    <div className="bg-white border border-gray-300">
      <div className="bg-gray-100 border-b border-gray-300 px-4 py-2">
        <div className="text-[10px] uppercase tracking-wide text-gray-500 font-bold">{title}</div>
      </div>
      <div className="p-4 flex items-center justify-center h-32 text-xs text-gray-400 border border-dashed border-gray-200">
        No label uploaded
      </div>
    </div>
  );
}

export function LabelComparison({
  show = 'both',
  currentLabelUrl,
  currentLabelName,
  newLabelUrl,
  newLabelName,
  currentBoxes: drawnCurrentBoxes,
  newBoxes: drawnNewBoxes,
}: LabelComparisonProps) {
  const showCurrent = show === 'both' && !!currentLabelUrl;
  const showNew = !!newLabelUrl;

  return (
    <div className={showCurrent && showNew ? 'grid grid-cols-2 gap-6' : 'grid grid-cols-1'}>
      {showCurrent && (
        <LabelBox src={currentLabelUrl!} title="Current Version Label" subtitle={currentLabelName} drawnBoxes={drawnCurrentBoxes} />
      )}
      {showNew
        ? <LabelBox src={newLabelUrl!} title="New Version Label" subtitle={newLabelName} drawnBoxes={drawnNewBoxes} />
        : <EmptyLabelBox title="New Version Label" />
      }
    </div>
  );
}
