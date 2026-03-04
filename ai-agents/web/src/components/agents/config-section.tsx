'use client';

import type { ReactNode } from 'react';

interface Props {
  title: string;
  description?: string;
  children: ReactNode;
}

export function ConfigSection({ title, description, children }: Props) {
  return (
    <div className="neon-border">
      <div className="neon-border-inner space-y-4">
        <div>
          <h3 className="text-base font-medium">{title}</h3>
          {description && (
            <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
          )}
        </div>
        {children}
      </div>
    </div>
  );
}
