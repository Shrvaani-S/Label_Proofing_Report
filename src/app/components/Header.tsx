import { useTheme } from '../contexts/ThemeContext';
import { ThemeSwitcher } from './ThemeSwitcher';

interface HeaderProps {
  activeScenario: 'A' | 'B' | 'C';
  onScenarioChange: (scenario: 'A' | 'B' | 'C') => void;
  onEdit?: () => void;
  reportId?: string;
}

function DownloadIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="square" strokeLinejoin="miter" d="M12 3v13M7 11l5 5 5-5M3 21h18" />
    </svg>
  );
}

function getISTDateParts() {
  const now = new Date();
  const ist = new Date(now.getTime() + (5 * 60 + 30) * 60 * 1000);
  const yyyy = ist.getUTCFullYear();
  const mm   = String(ist.getUTCMonth() + 1).padStart(2, '0');
  const dd   = String(ist.getUTCDate()).padStart(2, '0');
  const hh   = String(ist.getUTCHours()).padStart(2, '0');
  const min  = String(ist.getUTCMinutes()).padStart(2, '0');
  return { yyyy, mm, dd, hh, min };
}

export function Header({ activeScenario, onScenarioChange, onEdit, reportId: propReportId }: HeaderProps) {
  const { theme } = useTheme();

  const { yyyy, mm, dd } = getISTDateParts();
  const reportId = propReportId ?? `${yyyy}${mm}${dd}0001`;

  const scenarios = [
    { id: 'A' as const, label: 'Existing + Master' },
    { id: 'B' as const, label: 'Supportive + Master' },
    { id: 'C' as const, label: 'Full Comparison' },
  ];

  const handleDownloadPDF = () => {
    const { yyyy, mm, dd, hh, min } = getISTDateParts();
    const lprNumber = reportId;
    const dateStr   = `${yyyy}-${mm}-${dd}`;
    const timeStr   = `${hh}:${min} IST`;

    const style = document.createElement('style');
    style.id = '__print-footer__';
    style.textContent = `
      @page {
        @bottom-left   { content: "LPR: ${lprNumber}"; font-size: 7pt; color: #666; font-family: sans-serif; }
        @bottom-center { content: "Page " counter(page); font-size: 7pt; color: #666; font-family: sans-serif; }
        @bottom-right  { content: "${dateStr} ${timeStr}"; font-size: 7pt; color: #666; font-family: sans-serif; }
      }
    `;
    document.head.appendChild(style);

    const prevTitle = document.title;
    document.title = lprNumber;
    window.print();
    document.title = prevTitle;
    document.head.removeChild(style);
  };

  return (
    <header className="w-full px-8 py-5" style={{ backgroundColor: theme.primary }}>
      <div className="max-w-[1600px] mx-auto flex items-start justify-between">

        {/* Left: title + report ID */}
        <div className="space-y-2">
          <h1 className="text-white text-2xl leading-tight">Label Proofing Report</h1>
          <div className="text-white text-xs">
            Report ID: {reportId}
          </div>
        </div>

        {/* Right: logo + controls */}
        <div className="flex flex-col items-end gap-3">
          <img src="/novintix-logo.png" alt="Novintix" className="h-7 w-auto" />
          <div className="print:hidden flex gap-2 items-center">
            <div className="text-gray-400 text-xs mr-1">
              Generated: August 22, 2025 13:27 UTC
            </div>
            {scenarios.map((scenario) => (
              <button
                key={scenario.id}
                onClick={() => onScenarioChange(scenario.id)}
                className={`px-3 py-1.5 border-2 border-white text-xs transition-colors ${
                  activeScenario === scenario.id
                    ? 'bg-white text-sm'
                    : 'bg-transparent text-white hover:bg-white/10'
                }`}
                style={activeScenario === scenario.id ? { color: theme.primary } : {}}
              >
                {scenario.label}
              </button>
            ))}
            {onEdit && (
              <button
                onClick={onEdit}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold transition-colors border-2 border-white text-white hover:bg-white/10"
                title="Edit report data"
              >
                Edit
              </button>
            )}
            <button
              onClick={handleDownloadPDF}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold transition-colors border-2"
              style={{
                backgroundColor: theme.accent,
                borderColor: theme.accent,
                color: '#fff',
              }}
              title="Download as PDF"
            >
              <DownloadIcon />
              PDF
            </button>
            <ThemeSwitcher />
          </div>
        </div>

      </div>
    </header>
  );
}
