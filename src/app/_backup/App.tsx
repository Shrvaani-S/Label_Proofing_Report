import { useState } from 'react';
import { ThemeProvider } from './contexts/ThemeContext';
import { Header } from './components/Header';
import { MetadataRow } from './components/MetadataRow';
import { FrameA } from './components/FrameA';
import { FrameB } from './components/FrameB';
import { FrameC } from './components/FrameC';

export default function App() {
  const [activeScenario, setActiveScenario] = useState<'A' | 'B' | 'C'>('A');

  return (
    <ThemeProvider>
      <div className="min-h-screen bg-[#f3f4f6]">
        <Header
          activeScenario={activeScenario}
          onScenarioChange={setActiveScenario}
        />
        <div id="report-content" className="max-w-[1600px] mx-auto">
          <MetadataRow />
          <div id="report-body" className="p-8">
            {activeScenario === 'A' && <FrameA />}
            {activeScenario === 'B' && <FrameB />}
            {activeScenario === 'C' && <FrameC />}
          </div>
        </div>
      </div>
    </ThemeProvider>
  );
}