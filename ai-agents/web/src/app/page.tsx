'use client';

import { MatrixRain } from '@/components/command-center/matrix-rain';
import { RunningOverlay } from '@/components/command-center/running-overlay';
import { useCycles } from '@/hooks/use-cycles';

export default function CommandCenterPage() {
  const { cycles } = useCycles();

  const TWO_HOURS = 2 * 60 * 60 * 1000;
  const runningCycle = cycles.find(c =>
    c.status === 'running' &&
    c.started_at &&
    (Date.now() - new Date(c.started_at).getTime()) < TWO_HOURS,
  );
  const isRunning = !!runningCycle;

  return (
    <div className="relative min-h-screen">
      <MatrixRain
        opacity={isRunning ? 0.9 : 0.25}
        speed={isRunning ? 1.0 : 0.15}
      />
      {isRunning && <RunningOverlay />}
    </div>
  );
}
