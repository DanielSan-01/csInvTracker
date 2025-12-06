import { TEAM_ICONS } from '../loadoutUtils';
import type { Team } from '../types';

type TeamIconProps = {
  team: Team | 'Both';
  className?: string;
  size?: string;
};

export default function TeamIcon({ team, className = '', size = 'h-6 w-6' }: TeamIconProps) {
  if (team === 'Both') {
    return (
      <span className={`flex items-center gap-1 ${className}`}>
        <img
          src={TEAM_ICONS.CT}
          alt="CT emblem"
          className={`${size} rounded-full border border-purple-500/40 bg-black/40 p-0.5`}
        />
        <img
          src={TEAM_ICONS.T}
          alt="T emblem"
          className={`${size} rounded-full border border-purple-500/40 bg-black/40 p-0.5`}
        />
      </span>
    );
  }

  const src = team === 'CT' ? TEAM_ICONS.CT : team === 'T' ? TEAM_ICONS.T : undefined;
  if (!src) return null;

  return (
    <img
      src={src}
      alt={`${team} emblem`}
      className={`${size} rounded-full border border-purple-500/40 bg-black/40 p-0.5 ${className}`}
    />
  );
}


