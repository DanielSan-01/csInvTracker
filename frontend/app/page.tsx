import Link from 'next/link';
import ItemGrid from './components/ItemGrid';
import SteamLoginButton from './components/SteamLoginButton';

export default function Home() {
  return (
    <div>
      <div className="fixed top-4 right-4 z-[100] flex gap-3">
        <Link
          href="/loadout-cooker"
          className="inline-flex items-center gap-2 rounded-xl border border-purple-500/60 bg-purple-500/10 px-4 py-2 text-sm font-medium text-purple-100 transition hover:border-purple-400/80 hover:bg-purple-500/20"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          Loadout Cooker
        </Link>
        <SteamLoginButton />
      </div>
      <ItemGrid />
    </div>
  );
}
