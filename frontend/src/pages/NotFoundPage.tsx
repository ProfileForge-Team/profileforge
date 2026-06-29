import { Link } from 'react-router-dom';
import { Container } from '../components/Container';

export function NotFoundPage() { return <section className="grid min-h-[60vh] place-items-center py-12"><Container><div className="mx-auto max-w-xl text-center"><p className="text-sm font-bold uppercase tracking-[.2em] text-cyan-300">404</p><h1 className="mt-4 text-5xl font-semibold tracking-[-.06em] text-white">Страница не найдена.</h1><p className="mt-5 text-slate-300">Возможно, ссылка устарела или портфолио ещё не опубликовано.</p><Link to="/" className="button-primary mt-8 inline-flex px-5 py-3">На главную</Link></div></Container></section>; }
