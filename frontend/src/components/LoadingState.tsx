export function LoadingState({ text = 'Загружаем данные...' }: { text?: string }) {
  /** Displays a reusable loading state for async pages. */
  return <div className="glass-panel grid min-h-48 place-items-center p-8 text-sm text-slate-300">{text}</div>;
}

export function ErrorState({ text = 'Не удалось получить данные. Проверьте API Gateway и повторите попытку.' }: { text?: string }) {
  /** Displays a reusable error state for failed API queries. */
  return <div className="rounded-2xl border border-rose-300/20 bg-rose-500/10 p-5 text-sm leading-6 text-rose-100">{text}</div>;
}
