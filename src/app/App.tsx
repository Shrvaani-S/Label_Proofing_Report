import { useState } from 'react';
import { ThemeProvider } from './contexts/ThemeContext';
import { Header } from './components/Header';
import { MetadataRow } from './components/MetadataRow';
import { FrameA } from './components/FrameA';
import { FrameB } from './components/FrameB';
import { FrameC } from './components/FrameC';
import { SetupForm } from './components/SetupForm';
import type { ReportData } from './types';

export default function App() {
  const [activeScenario, setActiveScenario] = useState<'A' | 'B' | 'C'>('A');
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [editing, setEditing] = useState(false);

  if (!reportData || editing) {
    return (
      <ThemeProvider>
        <SetupForm
          initialData={reportData ?? undefined}
          onSubmit={(data) => { setReportData(data); setEditing(false); }}
        />
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider>
      <div className="min-h-screen bg-[#f3f4f6]">
        <Header
          activeScenario={activeScenario}
          onScenarioChange={setActiveScenario}
          onEdit={() => setEditing(true)}
          reportId={reportData.reportId}
        />
        <div id="report-content" className="max-w-[1600px] mx-auto">
          <MetadataRow data={reportData} />
          <div id="report-body" className="p-8">
            {activeScenario === 'A' && <FrameA data={reportData} />}
            {activeScenario === 'B' && <FrameB />}
            {activeScenario === 'C' && <FrameC />}
          </div>
        </div>
      </div>
    </ThemeProvider>
  );
}
