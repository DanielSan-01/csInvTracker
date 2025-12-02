import LoadoutSlotCard from '@/app/components/LoadoutSlotCard';
import { getDefaultSlotSkin } from '../defaultSkins';
import { getFallbackImageForSkin } from '../loadoutUtils';
import type { LoadoutSection, LoadoutSelections, LoadoutSlot, Team } from '../types';

type LoadoutSectionsListProps = {
  sections: LoadoutSection[];
  activeTeam: Team;
  selections: LoadoutSelections;
  onSlotClick: (slot: LoadoutSlot) => void;
};

export default function LoadoutSectionsList({
  sections,
  activeTeam,
  selections,
  onSlotClick,
}: LoadoutSectionsListProps) {
  return (
    <div className="space-y-6">
      {sections.map((section) => (
        <div key={section.title} className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-purple-200">{section.title}</h2>
            <span className="text-xs text-gray-500">{section.slots.length} slots</span>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {section.slots
              .filter((slot) => {
                if (!slot.teamHint || slot.teamHint === 'Both') return true;
                return slot.teamHint === activeTeam;
              })
              .map((slot) => {
                const slotSelection = selections[slot.key];
                const teamKey = activeTeam === 'CT' ? 'ct' : activeTeam === 'T' ? 't' : 'ct';
                const fallbackKey = teamKey === 'ct' ? 't' : 'ct';
                const activeEntry = slotSelection?.[teamKey];
                const fallbackEntry = slotSelection?.[fallbackKey];
                const selectedSkin = activeEntry?.skin ?? fallbackEntry?.skin ?? null;
                // Convert activeTeam to 'CT' | 'T' for getDefaultSlotSkin (defaults to 'CT' if 'Both')
                const teamForDefault = activeTeam === 'Both' ? 'CT' : activeTeam;
                const defaultSkin =
                  selectedSkin != null
                    ? null
                    : getDefaultSlotSkin(slot.key, teamForDefault) ??
                      getDefaultSlotSkin(slot.key, teamForDefault === 'CT' ? 'T' : 'CT');
                const displaySkin = selectedSkin ?? defaultSkin ?? null;
                const displayImageUrl = displaySkin ? getFallbackImageForSkin(displaySkin) : null;

                return (
                  <LoadoutSlotCard
                    key={slot.key}
                    label={slot.label}
                    description={slot.description}
                    selectedSkin={
                      selectedSkin
                        ? {
                            ...selectedSkin,
                            imageUrl:
                              getFallbackImageForSkin(selectedSkin) ??
                              selectedSkin.imageUrl ??
                              undefined,
                          }
                        : null
                    }
                    fallbackSkin={
                      selectedSkin
                        ? null
                        : defaultSkin
                        ? {
                            ...defaultSkin,
                            imageUrl: displayImageUrl ?? undefined,
                          }
                        : null
                    }
                    onClick={() => onSlotClick(slot)}
                  />
                );
              })}
            {section.slots.every(
              (slot) => slot.teamHint && slot.teamHint !== 'Both' && slot.teamHint !== activeTeam
            ) && (
              <p className="col-span-full rounded-xl border border-gray-800 bg-gray-900/60 p-4 text-sm text-gray-500">
                No slots available for the {activeTeam} team in this section.
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}


