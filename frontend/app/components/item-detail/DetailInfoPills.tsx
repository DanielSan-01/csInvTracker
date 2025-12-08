import type { CSItem } from '@/lib/mockData';
import { infoPillBase, resolveDisplayType } from '../ItemCardShared';

type DetailInfoPillsProps = {
  item: CSItem;
};

export default function DetailInfoPills({ item }: DetailInfoPillsProps) {
  return (
    <div className="grid grid-cols-2 gap-3 text-[11px] text-gray-300">
      <div className={infoPillBase}>
        <svg className="h-4 w-4 text-indigo-300" fill="currentColor" viewBox="0 0 20 20">
          <path d="M10 2a1 1 0 01.894.553l2.382 4.764 5.258.764a1 1 0 01.554 1.706l-3.807 3.71.899 5.239a1 1 0 01-1.451 1.054L10 16.347l-4.729 2.487A1 1 0 013.82 18.5l.899-5.24-3.808-3.707A1 1 0 011.465 8.08l5.258-.765L9.106 2.553A1 1 0 0110 2z" />
        </svg>
        {item.rarity}
      </div>
      <div className={infoPillBase}>
        <svg className="h-4 w-4 text-sky-300" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M4 3a2 2 0 00-2 2v2a4 4 0 002 3.465v1.535a2 2 0 002 2h1.055a3 3 0 002.83 2H13a2 2 0 002-2v-3a2 2 0 002-2V5a2 2 0 00-2-2H4zm5 9.917V9a1 1 0 112 0v6a1 1 0 01-1 1h-.945a3 3 0 01-1.055-.183z"
            clipRule="evenodd"
          />
        </svg>
        Exterior: {item.exterior}
      </div>
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
    </div>
  );
}




