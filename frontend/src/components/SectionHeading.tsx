import type { ReactNode } from 'react';

type Props = {
  eyebrow?: string;
  title: ReactNode;
  description?: string;
  action?: ReactNode;
};

export function SectionHeading({ eyebrow, title, description, action }: Props) {
  /** Renders a consistent section heading with optional action content. */
  return (
    <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div className="max-w-2xl">
        {eyebrow && <p className="mb-3 text-xs font-bold uppercase tracking-[0.22em] text-cyan-300">{eyebrow}</p>}
        <h1 className="text-3xl font-semibold tracking-[-0.05em] text-white sm:text-5xl">{title}</h1>
        {description && <p className="mt-4 text-base leading-7 text-slate-300">{description}</p>}
      </div>
      {action}
    </div>
  );
}
