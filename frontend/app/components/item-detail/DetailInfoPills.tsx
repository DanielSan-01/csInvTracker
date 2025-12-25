import type { CSItem } from '@/lib/mockData';
import { infoPillBase, resolveDisplayType } from '../ItemCardShared';

type DetailInfoPillsProps = {
  item: CSItem;
};

/**
 * Converts a skin name to a URL-friendly slug for csgoskins.gg
 * Example: "★ M9 Bayonet | Ultraviolet" -> "m9-bayonet-ultraviolet"
 */
function skinNameToSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/★/g, '') // Remove star symbols
    .replace(/\|/g, '-') // Replace pipe with hyphen
    .replace(/[()]/g, '') // Remove parentheses
    .replace(/™/g, '') // Remove trademark symbols
    .replace(/\bstattrak™?\b/gi, '') // Remove StatTrak
    .replace(/\bsouvenir\b/gi, '') // Remove Souvenir
    .replace(/\bphase\s*\d+\b/gi, '') // Remove phase numbers (e.g., "phase 4")
    .replace(/\bph\s*\d+\b/gi, '') // Remove phase abbreviations (e.g., "ph4")
    .trim()
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
    .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
}

export default function DetailInfoPills({ item }: DetailInfoPillsProps) {
  const priceCheckUrl = `https://www.csgoskins.gg/items/${skinNameToSlug(item.name)}`;

  return (
    <div className="grid grid-cols-2 gap-3 text-[11px] text-gray-300">
      <div className={infoPillBase}>
        <svg className="h-4 w-4 text-indigo-300" fill="currentColor" viewBox="0 0 20 20">
          <path d="M10 2a1 1 0 01.894.553l2.382 4.764 5.258.764a1 1 0 01.554 1.706l-3.807 3.71.899 5.239a1 1 0 01-1.451 1.054L10 16.347l-4.729 2.487A1 1 0 013.82 18.5l.899-5.24-3.808-3.707A1 1 0 011.465 8.08l5.258-.765L9.106 2.553A1 1 0 0110 2z" />
        </svg>
        {item.rarity}
      </div>
      <a
        href={priceCheckUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={`${infoPillBase} group transition-colors duration-150 hover:border-orange-400 hover:bg-orange-400/10 cursor-pointer`}
        title="Check price on CSGOSkins.gg"
      >
        <svg className="h-4 w-4 text-orange-300 group-hover:text-orange-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        Price check
      </a>
      <div className={infoPillBase}>
        <svg className="h-4 w-4 text-emerald-300" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M6 3a1 1 0 00-1 1v1H4a2 2 0 00-2 2v7a2 2 0 002 2h12a2 2 0 002-2V7a2 2 0 00-2-2h-1V4a1 1 0 10-2 0v1H7V4a1 1 0 00-1-1zm0 4h8v2H6V7zm0 4h3v2H6v-2zm5 0h3v2h-3v-2z"
            clipRule="evenodd"
          />
        </svg>
        Type: {resolveDisplayType(item)}
      </div>
      {item.paintSeed && (
        <div className={infoPillBase}>
          <svg className="h-4 w-4 text-pink-300" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10 2a1 1 0 01.832.445l4.5 6.5a1 1 0 01.168.555V15a1 1 0 01-1 1h-10a1 1 0 01-1-1V9.5a1 1 0 01.168-.555l4.5-6.5A1 1 0 0110 2zm0 3.236L6.5 9.5V14h7v-4.5L10 5.236z" />
          </svg>
          Paint seed: {item.paintSeed}
        </div>
      )}
      {item.steamListingUrl && (
        <a
          href={item.steamListingUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={`${infoPillBase} group transition-colors duration-150 hover:border-purple-400 hover:bg-purple-400/10`}
        >
          <svg className="h-4 w-4 text-purple-300 group-hover:text-purple-200" fill="currentColor" viewBox="0 0 20 20">
            <path d="M12.293 2.293a1 1 0 011.414 0l3.999 3.999a1 1 0 010 1.414l-6.999 6.999a1 1 0 01-.343.219l-5 2a1 1 0 01-1.316-1.316l2-5a1 1 0 01.219-.343l6.999-6.999zM13 4.414L6.707 10.707l-.646 1.616 1.616-.646L14.586 5.414 13 3.828l-.707.586z" />
          </svg>
          View on Steam
        </a>
      )}
    </div>
  );
}






