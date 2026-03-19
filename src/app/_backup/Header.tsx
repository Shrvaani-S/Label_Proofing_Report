import { useTheme } from '../contexts/ThemeContext';
import { ThemeSwitcher } from './ThemeSwitcher';

interface HeaderProps {
  activeScenario: 'A' | 'B' | 'C';
  onScenarioChange: (scenario: 'A' | 'B' | 'C') => void;
}

function DownloadIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="square" strokeLinejoin="miter" d="M12 3v13M7 11l5 5 5-5M3 21h18" />
    </svg>
  );
}


export function Header({ activeScenario, onScenarioChange }: HeaderProps) {
  const { theme } = useTheme();

  const scenarios = [
    { id: 'A' as const, label: 'Existing + Master' },
    { id: 'B' as const, label: 'Supportive + Master' },
    { id: 'C' as const, label: 'Full Comparison' },
  ];

  const handleDownloadPDF = () => {
    // Compute current date/time in IST (UTC+5:30)
    const now = new Date();
    const istOffset = (5 * 60 + 30) * 60 * 1000;
    const ist = new Date(now.getTime() + istOffset);
    const yyyy = ist.getUTCFullYear();
    const mm   = String(ist.getUTCMonth() + 1).padStart(2, '0');
    const dd   = String(ist.getUTCDate()).padStart(2, '0');
    const hh   = String(ist.getUTCHours()).padStart(2, '0');
    const min  = String(ist.getUTCMinutes()).padStart(2, '0');
    const lcrNumber  = `${yyyy}${mm}${dd}0001`;
    const dateStr    = `${yyyy}-${mm}-${dd}`;
    const timeStr    = `${hh}:${min} IST`;

    // Inject dynamic @page footer content
    const style = document.createElement('style');
    style.id = '__print-footer__';
    style.textContent = `
      @page {
        @bottom-left   { content: "LCR: ${lcrNumber}"; font-size: 7pt; color: #666; font-family: sans-serif; }
        @bottom-center { content: "Page " counter(page); font-size: 7pt; color: #666; font-family: sans-serif; }
        @bottom-right  { content: "${dateStr} ${timeStr}"; font-size: 7pt; color: #666; font-family: sans-serif; }
      }
    `;
    document.head.appendChild(style);

    const prevTitle = document.title;
    document.title = lcrNumber;
    window.print();
    document.title = prevTitle;
    document.head.removeChild(style);
  };

  return (
    <header className="w-full px-8 py-6" style={{ backgroundColor: theme.primary }}>
      <div className="max-w-[1600px] mx-auto flex items-start justify-between">
        <h1 className="text-white text-2xl self-center">Label Proofing Report</h1>
        <div>
          <img src="/novintix-logo.png" alt="Novintix" className="h-10 w-auto" />
        </div>
        <div className="text-right space-y-3 print:hidden">
          <div className="text-gray-400 text-xs">
            Generated: August 22, 2025 13:27 UTC
          </div>
          <div className="flex gap-2 justify-end items-center">
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
