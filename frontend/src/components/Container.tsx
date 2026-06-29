import type { PropsWithChildren } from 'react';

export function Container({ children }: PropsWithChildren) {
  /** Centers page content within the standard responsive max width. */
  return <div className="mx-auto w-full max-w-7xl px-5 sm:px-8">{children}</div>;
}
