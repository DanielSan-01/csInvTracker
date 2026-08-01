'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useUser } from '@/contexts/UserContext';
import { fetchGoals, GoalData } from '@/lib/goalStorage';
import { formatCurrency } from '@/lib/utils';
import TargetSkinCard from './TargetSkinCard';

export default function SavedGoalCard() {
  const { user } = useUser();
  const [goal, setGoal] = useState<GoalData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    fetchGoals(user.id)
      .then((goals) => {
        if (!cancelled) setGoal(goals[0] ?? null);
      })
      .catch((error) => console.error('Failed to load saved goal', error))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  if (loading || !goal) return null;

  return (
    <TargetSkinCard
      badge="Goal saved"
      name={goal.skinName}
      subtitle={goal.skinWeapon ?? goal.skinType ?? ''}
      imageUrl={goal.skinImageUrl ?? goal.skinAltImageUrl ?? undefined}
      rarity={goal.skinRarity ?? undefined}
      type={goal.skinType ?? undefined}
      tags={[goal.skinWeapon ?? undefined].filter(Boolean)}
      priceLabel="Target price"
      priceValue={formatCurrency(goal.targetPrice)}
      meta={`Created ${new Date(goal.createdAt).toLocaleString()}`}
      trailingContent={
        <Link
          href="/goal"
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-purple-500/40 px-4 py-2 text-sm font-medium text-purple-100 transition-colors hover:border-purple-400/60 hover:bg-purple-500/10"
        >
          View goal
        </Link>
      }
    />
  );
}
