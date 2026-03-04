'use client';

export function RoboticEyes() {
  return (
    <div className="fixed inset-0 pointer-events-none z-0 flex items-center justify-center opacity-[0.07]">
      <svg
        viewBox="0 0 600 240"
        className="w-[70vw] max-w-[900px]"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Left eye socket */}
        <ellipse
          cx="170"
          cy="120"
          rx="120"
          ry="90"
          stroke="currentColor"
          strokeWidth="3"
          className="text-accent"
        />
        {/* Left eye inner ring */}
        <circle
          cx="170"
          cy="120"
          r="55"
          stroke="currentColor"
          strokeWidth="2"
          className="text-accent"
        />
        {/* Left iris */}
        <circle
          cx="170"
          cy="120"
          r="30"
          fill="currentColor"
          className="text-accent"
          opacity="0.6"
        />
        {/* Left pupil */}
        <circle cx="170" cy="120" r="12" fill="currentColor" className="text-foreground" />
        {/* Left pupil highlight */}
        <circle cx="178" cy="112" r="5" fill="currentColor" className="text-accent" opacity="0.9" />

        {/* Right eye socket */}
        <ellipse
          cx="430"
          cy="120"
          rx="120"
          ry="90"
          stroke="currentColor"
          strokeWidth="3"
          className="text-accent"
        />
        {/* Right eye inner ring */}
        <circle
          cx="430"
          cy="120"
          r="55"
          stroke="currentColor"
          strokeWidth="2"
          className="text-accent"
        />
        {/* Right iris */}
        <circle
          cx="430"
          cy="120"
          r="30"
          fill="currentColor"
          className="text-accent"
          opacity="0.6"
        />
        {/* Right pupil */}
        <circle cx="430" cy="120" r="12" fill="currentColor" className="text-foreground" />
        {/* Right pupil highlight */}
        <circle cx="438" cy="112" r="5" fill="currentColor" className="text-accent" opacity="0.9" />

        {/* Bridge between eyes */}
        <path
          d="M 250 130 Q 300 155 350 130"
          stroke="currentColor"
          strokeWidth="2"
          className="text-accent"
          opacity="0.5"
        />

        {/* Mechanical detail lines — left */}
        <line x1="55" y1="80" x2="80" y2="80" stroke="currentColor" strokeWidth="1.5" className="text-accent" opacity="0.3" />
        <line x1="55" y1="160" x2="80" y2="160" stroke="currentColor" strokeWidth="1.5" className="text-accent" opacity="0.3" />
        <line x1="60" y1="120" x2="50" y2="120" stroke="currentColor" strokeWidth="1.5" className="text-accent" opacity="0.3" />

        {/* Mechanical detail lines — right */}
        <line x1="520" y1="80" x2="545" y2="80" stroke="currentColor" strokeWidth="1.5" className="text-accent" opacity="0.3" />
        <line x1="520" y1="160" x2="545" y2="160" stroke="currentColor" strokeWidth="1.5" className="text-accent" opacity="0.3" />
        <line x1="540" y1="120" x2="550" y2="120" stroke="currentColor" strokeWidth="1.5" className="text-accent" opacity="0.3" />

        {/* Scan lines */}
        <line x1="170" y1="35" x2="170" y2="15" stroke="currentColor" strokeWidth="1" className="text-accent" opacity="0.2" />
        <line x1="430" y1="35" x2="430" y2="15" stroke="currentColor" strokeWidth="1" className="text-accent" opacity="0.2" />
      </svg>
    </div>
  );
}
