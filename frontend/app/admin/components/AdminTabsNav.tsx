import type { TabType } from '../types';

type AdminTabsNavProps = {
  activeTab: TabType;
  onChange: (tab: TabType) => void;
};

const tabs: { id: TabType; label: string; emoji: string }[] = [
  { id: 'stats', label: 'Statistics', emoji: '📊' },
  { id: 'users', label: 'Users', emoji: '👥' },
  { id: 'skins', label: 'Add Skin', emoji: '🎨' },
];

export default function AdminTabsNav({ activeTab, onChange }: AdminTabsNavProps) {
  return (
    <div className="mb-8 flex gap-4 border-b border-gray-700">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`px-6 py-3 font-semibold transition-all ${
            activeTab === tab.id
              ? 'border-b-2 border-blue-400 text-blue-400'
              : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          {tab.emoji} {tab.label}
        </button>
      ))}
    </div>
  );
}

