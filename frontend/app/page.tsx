import ItemGrid from './components/ItemGrid';
import SteamLoginButton from './components/SteamLoginButton';
import Link from 'next/link';

export default function Home() {
  return (
    <div>
      <div className="fixed top-4 right-4 z-50 flex gap-2">
        <Link 
          href="/csfloat-test"
          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition-colors"
        >
          🧪 CSFloat Test
        </Link>
        <SteamLoginButton />
      </div>
      <ItemGrid />
    </div>
  );
}
