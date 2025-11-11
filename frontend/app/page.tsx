import ItemGrid from './components/ItemGrid';
import SteamLoginButton from './components/SteamLoginButton';

export default function Home() {
  return (
    <div>
      <div className="fixed top-4 right-4 z-[100]">
        <SteamLoginButton />
      </div>
      <ItemGrid />
    </div>
  );
}
