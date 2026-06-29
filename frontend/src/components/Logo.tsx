import { Link } from 'react-router-dom';

type Props = { compact?: boolean };

export function Logo({ compact = false }: Props) {
  /** Renders the ProfileForge logo variant used by header/sidebar layouts. */
  return (
    <Link to="/" className="group flex items-center gap-3 text-white" aria-label="ProfileForge — главная">
      <span className="relative grid h-10 w-10 place-items-center overflow-hidden rounded-xl border border-cyan-300/35 bg-cyan-300/10 shadow-aqua">
        <span className="absolute inset-1 rounded-lg border border-cyan-200/25" />
        <span className="relative text-sm font-black tracking-tight text-cyan-200">PF</span>
      </span>
      {!compact && (
        <span className="text-lg font-semibold tracking-[-0.04em] text-white">
          Profile<span className="text-cyan-300">Forge</span>
        </span>
      )}
    </Link>
  );
}
