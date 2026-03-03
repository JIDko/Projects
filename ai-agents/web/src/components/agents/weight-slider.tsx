'use client';

interface Props {
  label: string;
  value: number;
  onChange: (value: number) => void;
}

export function WeightSlider({ label, value, onChange }: Props) {
  const percentage = Math.round(value * 100);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm text-foreground capitalize">
          {label.replace(/_/g, ' ')}
        </label>
        <span className="text-sm text-accent font-medium tabular-nums">
          {percentage}%
        </span>
      </div>
      <input
        type="range"
        min={0}
        max={50}
        step={1}
        value={percentage}
        onChange={(e) => onChange(Number(e.target.value) / 100)}
        className="w-full h-1.5 bg-muted rounded-full appearance-none cursor-pointer accent-accent
          [&::-webkit-slider-thumb]:appearance-none
          [&::-webkit-slider-thumb]:h-4
          [&::-webkit-slider-thumb]:w-4
          [&::-webkit-slider-thumb]:rounded-full
          [&::-webkit-slider-thumb]:bg-accent
          [&::-webkit-slider-thumb]:shadow-lg
          [&::-webkit-slider-thumb]:cursor-pointer"
      />
    </div>
  );
}
