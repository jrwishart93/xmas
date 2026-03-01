import { type ReactNode } from 'react';

export default function PageContainer({ children }: { children: ReactNode }) {
  return <main className="mx-auto flex min-h-screen w-full max-w-4xl items-center justify-center p-6">{children}</main>;
}
