'use client';

import { type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { PREVIEW_MODE } from '@/lib/config';

type PreviewGateProps = {
  featureName: string;
  children: ReactNode;
};

export default function PreviewGate({ featureName, children }: PreviewGateProps) {
  const router = useRouter();

  if (!PREVIEW_MODE) return <>{children}</>;

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`${featureName} is under construction`}
      onClick={() => router.push('/under-construction')}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          router.push('/under-construction');
        }
      }}
      style={{ cursor: 'pointer', transition: 'transform 180ms ease' }}
      onMouseEnter={(event) => {
        (event.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)';
      }}
      onMouseLeave={(event) => {
        (event.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
      }}
    >
      {children}
    </div>
  );
}
