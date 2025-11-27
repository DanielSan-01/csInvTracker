import { getDefaultSlotSkin } from '../defaultSkins';
import { getFallbackImageForSkin } from '../loadoutUtils';
import type { LoadoutSection, LoadoutSelections, LoadoutSlot, Team } from '../types';

type LoadoutGridViewProps = {
  sections: LoadoutSection[];
  activeTeam: Team;
  selections: LoadoutSelections;
  onSlotClick: (slot: LoadoutSlot) => void;
};

export default function LoadoutGridView({
  sections,
  activeTeam,
  selections,
  onSlotClick,
}: LoadoutGridViewProps) {
  const teamFilteredSections = sections
    .map((section) => ({
      ...section,
      slots: section.slots.filter((slot) => {
        if (!slot.teamHint || slot.teamHint === 'Both') return true;
        return slot.teamHint === activeTeam;
      }),
    }))
    .filter((section) => section.slots.length > 0);

  const teamKey = activeTeam === 'CT' ? 'ct' : 't';
  const fallbackKey = teamKey === 'ct' ? 't' : 'ct';

  return (
    <div className="overflow-x-auto">
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {teamFilteredSections.map((section) => (
          <div key={section.title} className="flex flex-col gap-4">
            <div className="rounded-full border border-gray-800 bg-gray-900/80 px-4 py-2 text-center text-sm font-semibold uppercase tracking-wide text-purple-200 shadow-inner shadow-purple-900/20">
              {section.title}
            </div>
            <div className="grid gap-3">
              {section.slots.map((slot) => {
                const slotSelection = selections[slot.key];
                const activeEntry = slotSelection?.[teamKey];
                const fallbackEntry = slotSelection?.[fallbackKey];
                const selectedSkin = activeEntry?.skin ?? fallbackEntry?.skin ?? null;
                const teamStrict = activeTeam === 'CT' ? 'CT' : 'T';
                const defaultSkin =
                  selectedSkin != null
                    ? null
                    : getDefaultSlotSkin(slot.key, teamStrict) ??
                      getDefaultSlotSkin(slot.key, teamStrict === 'CT' ? 'T' : 'CT');
                const displaySkin = selectedSkin ?? defaultSkin ?? null;
                const displayImageUrl = displaySkin ? getFallbackImageForSkin(displaySkin) : null;
                const isDefault = !selectedSkin && !!defaultSkin;

                return (
                  <button
                    key={slot.key}
                    onClick={() => onSlotClick(slot)}
                    className={`group relative flex h-32 items-center justify-center overflow-hidden rounded-2xl border ${
                      isDefault
                        ? 'border-dashed border-purple-500/30'
                        : selectedSkin
                        ? 'border-purple-500/40'
                        : 'border-dashed border-gray-800'
                    } bg-gray-950/70 p-4 text-gray-500 transition hover:border-purple-400/60 hover:text-purple-100`}
                  >
                    <div className="pointer-events-none absolute inset-0 rounded-2xl bg-[radial-gradient(circle_at_top,_rgba(147,51,234,0.15),_transparent_65%)] opacity-80" />
                    <span className="pointer-events-none absolute left-4 top-3 text-xs font-semibold uppercase tracking-wide text-purple-200/80">
                      {slot.label}
                    </span>
                    {isDefault && (
                      <span className="pointer-events-none absolute right-4 top-3 rounded-full border border-purple-500/40 bg-purple-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-purple-200/90">
                        Default
                      </span>
                    )}
                    {displaySkin ? (
                      displayImageUrl ? (
                        <img
                          src={displayImageUrl}
                          alt={displaySkin.name}
                          className="relative z-[1] h-full w-full object-contain"
                        />
                      ) : (
                        <span className="relative z-[1] text-xs text-purple-200">
                          {displaySkin.name}
                        </span>
                      )
                    ) : (
                      <span className="relative z-[1] text-xs font-medium uppercase tracking-wide text-gray-700">
                        Select skin
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

