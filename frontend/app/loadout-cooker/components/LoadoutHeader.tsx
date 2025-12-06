import TeamIcon from './TeamIcon';
import type { Team } from '../types';

type LoadoutHeaderProps = {
  activeTeam: Team;
  viewMode: 'card' | 'grid';
  onToggleViewMode: () => void;
  onTeamChange: (team: Team) => void;
  onSave: () => void;
  onEquip: () => void;
  inventoryLoading: boolean;
  canEquip: boolean;
};

export default function LoadoutHeader({
  activeTeam,
  viewMode,
  onToggleViewMode,
  onTeamChange,
  onSave,
  onEquip,
  inventoryLoading,
  canEquip,
}: LoadoutHeaderProps) {
  const isGridView = viewMode === 'grid';

  return (
    <header className="flex flex-wrap items-center justify-between gap-4">
      <div>
        <p className="text-sm text-purple-300/80">Loadout Lab</p>
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold text-white">Loadout Cooker</h1>
          <TeamIcon team={activeTeam} size="h-10 w-10" />
        </div>
        <p className="text-sm text-gray-400">
          Build your dream CT & T loadouts by mixing and matching skins from the entire catalog.
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={onToggleViewMode}
          aria-label={isGridView ? 'Switch to card view' : 'Switch to grid view'}
          className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition ${
            isGridView
              ? 'border-purple-500/60 bg-purple-500/20 text-purple-100 hover:border-purple-400/80 hover:bg-purple-500/30'
              : 'border-gray-700 bg-gray-900 text-gray-300 hover:border-purple-400/40 hover:text-purple-100'
          }`}
        >
          {isGridView ? (
            <>
              <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <rect x="2" y="4" width="16" height="4" rx="1" />
                <rect x="2" y="12" width="16" height="4" rx="1" />
              </svg>
              <span className="text-xs uppercase tracking-wide">Card View</span>
            </>
          ) : (
            <>
              <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <rect x="2" y="2" width="6" height="6" rx="1" />
                <rect x="12" y="2" width="6" height="6" rx="1" />
                <rect x="2" y="12" width="6" height="6" rx="1" />
                <rect x="12" y="12" width="6" height="6" rx="1" />
              </svg>
              <span className="text-xs uppercase tracking-wide">Grid View</span>
            </>
          )}
        </button>
        <div className="flex rounded-full border border-purple-500/40 bg-purple-500/10 p-1">
          {(['CT', 'T'] as Team[]).map((team) => (
            <button
              key={team}
              onClick={() => onTeamChange(team)}
              className={`px-4 py-1 text-sm font-semibold transition ${
                activeTeam === team
                  ? 'rounded-full bg-purple-500 text-white shadow-lg shadow-purple-500/30'
                  : 'rounded-full text-purple-200 hover:bg-purple-500/20'
              }`}
            >
              <span className="flex items-center gap-2">
                <TeamIcon team={team} size="h-6 w-6" />
                {team} Loadout
              </span>
            </button>
          ))}
        </div>
        <button
          onClick={onSave}
          className="rounded-xl border border-purple-500/40 bg-purple-500/10 px-4 py-2 text-sm font-medium text-purple-200 transition hover:bg-purple-500/20"
        >
          Save Loadout
        </button>
        <button
          onClick={onEquip}
          disabled={inventoryLoading || !canEquip}
          className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
            inventoryLoading || !canEquip
              ? 'cursor-not-allowed border border-gray-800 bg-gray-900 text-gray-500'
              : 'border border-gray-700 bg-gray-900 text-gray-200 hover:border-purple-400/40 hover:text-purple-200'
          }`}
        >
          {inventoryLoading ? 'Loading Inventory...' : 'Equip Your Inventory'}
        </button>
      </div>
    </header>
  );
}


