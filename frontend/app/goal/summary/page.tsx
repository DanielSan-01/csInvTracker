'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { formatCurrency } from '@/lib/utils';
import { GoalData, fetchGoalById, fetchGoals } from '@/lib/goalStorage';
import TargetSkinCard from '@/app/components/TargetSkinCard';
import { skinsApi } from '@/lib/api';
import InventoryListCard from '@/app/components/InventoryListCard';
import StatCard from '@/app/components/StatCard';
import { useUser } from '@/contexts/UserContext';

export default function GoalSummaryPage() {
  const searchParams = useSearchParams();
  const requestedGoalId = searchParams.get('goalId');
  const { user } = useUser();

  const [goal, setGoal] = useState<GoalData | null>(null);
  const [allGoals, setAllGoals] = useState<GoalData[]>([]);
  const [loading, setLoading] = useState(true);
  const [skinDetails, setSkinDetails] = useState<{
    imageUrl: string | null;
    rarity: string | null;
    type: string | null;
    weapon: string | null;
  }>({
    imageUrl: null,
    rarity: null,
    type: null,
    weapon: null,
  });

  useEffect(() => {
    let cancelled = false;

    const loadGoals = async () => {
      setLoading(true);
      try {
        const storedGoals = await fetchGoals(user?.id);
        if (cancelled) return;

        setAllGoals(storedGoals);

        const fallbackId = storedGoals[0]?.id ?? null;
        const activeId = requestedGoalId ?? fallbackId;

        if (!activeId) {
          setGoal(null);
          setLoading(false);
          return;
        }

        let activeGoal = storedGoals.find((entry) => entry.id === activeId) ?? null;

        if (!activeGoal && user?.id) {
          activeGoal = await fetchGoalById(activeId, user.id);
        }

        if (!cancelled) {
          setGoal(activeGoal ?? null);
          setLoading(false);
        }
      } catch (error) {
        if (!cancelled) {
          console.error('Failed to load goals', error);
          setAllGoals([]);
          setGoal(null);
          setLoading(false);
        }
      }
    };

    loadGoals();

    return () => {
      cancelled = true;
    };
  }, [requestedGoalId, user?.id]);

  useEffect(() => {
    if (!goal) {
      setSkinDetails({
        imageUrl: null,
        rarity: null,
        type: null,
        weapon: null,
      });
      return;
    }

    const initialDetails = {
      imageUrl: goal.skinImageUrl ?? goal.skinAltImageUrl ?? null,
      rarity: goal.skinRarity ?? null,
      type: goal.skinType ?? null,
      weapon: goal.skinWeapon ?? null,
    };

    setSkinDetails(initialDetails);

    if ((initialDetails.imageUrl && initialDetails.rarity && initialDetails.type) || !goal.skinId) {
      return;
    }

    let cancelled = false;

    skinsApi
      .getSkinById(goal.skinId)
      .then((skin) => {
        if (cancelled) return;
        setSkinDetails({
          imageUrl: skin.dopplerPhaseImageUrl ?? skin.imageUrl ?? initialDetails.imageUrl,
          rarity: skin.rarity ?? initialDetails.rarity,
          type: skin.type ?? initialDetails.type,
          weapon: skin.weapon ?? initialDetails.weapon,
        });
      })
      .catch((error) => {
        console.error('Failed to fetch skin details for goal', error);
      });

    return () => {
      cancelled = true;
    };
  }, [goal]);

  const otherGoals = useMemo(() => {
    if (!goal) return allGoals;
    return allGoals.filter((entry) => entry.id !== goal.id);
  }, [allGoals, goal]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-gray-300">
          <svg className="h-8 w-8 animate-spin text-purple-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V2.5A9.5 9.5 0 003.5 12H4zm2 5.291A7.962 7.962 0 014 12H2.5c0 3.31 1.344 6.31 3.52 8.477L6 17.291z" />
          </svg>
          <p className="text-sm">Loading your goal…</p>
        </div>
      </div>
    );
  }

  if (!goal) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center px-6">
        <div className="max-w-lg rounded-3xl border border-gray-800 bg-gray-900/80 p-8 text-center shadow-2xl">
          <h1 className="text-2xl font-semibold text-white">No saved goals yet</h1>
          <p className="mt-3 text-sm text-gray-400">
            We couldn’t find a recent goal on this device. Head back to the planner to create one.
          </p>
          <Link
            href="/goal"
            className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl bg-purple-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-purple-700"
          >
            Plan a goal
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="relative mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 pb-20 pt-16 lg:px-10">
        <header className="rounded-3xl border border-gray-800 bg-gray-900/70 p-6 shadow-2xl shadow-black/30 backdrop-blur">
          <TargetSkinCard
            badge="Goal saved"
            name={goal.skinName}
            subtitle={skinDetails.weapon ?? skinDetails.type}
            imageUrl={skinDetails.imageUrl ?? undefined}
            rarity={skinDetails.rarity ?? undefined}
            type={skinDetails.type ?? undefined}
            tags={[skinDetails.weapon ?? undefined]}
            priceLabel="Target price"
            priceValue={formatCurrency(goal.targetPrice)}
            meta={`Created ${new Date(goal.createdAt).toLocaleString()}`}
            trailingContent={
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
                <Link
                  href="/goal"
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-purple-500/40 px-4 py-2 text-sm font-medium text-purple-100 transition-colors hover:border-purple-400/60 hover:bg-purple-500/10"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7 7-7M3 12h18" />
                  </svg>
                  Plan another goal
                </Link>
                <Link
                  href="/"
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-700 px-4 py-2 text-sm font-medium text-gray-200 transition-colors hover:border-gray-500 hover:bg-gray-800/70"
                >
                  Back to dashboard
                </Link>
              </div>
            }
          />
        </header>

        <section className="space-y-6 rounded-3xl border border-gray-800/60 bg-gray-900/70 p-6 shadow-2xl shadow-black/40 backdrop-blur">
          <h2 className="type-heading-lg text-white">Goal summary</h2>

          <div className="grid gap-4 md:grid-cols-2">
            <StatCard label="Target price" value={formatCurrency(goal.targetPrice)} />
            <StatCard label="Balance & planned sales" value={formatCurrency(goal.coverageTotal)} />
            <StatCard label="From planned sales" value={formatCurrency(goal.selectedTotal)} />
            <StatCard label="Existing balance" value={formatCurrency(goal.balance)} />
            {goal.remainingAmount > 0 ? (
              <StatCard
                label="Still needed"
                value={formatCurrency(goal.remainingAmount)}
                valueClassName="text-amber-300"
              />
            ) : (
              <StatCard
                label="Surplus after purchase"
                value={formatCurrency(goal.surplusAmount)}
                valueClassName="text-emerald-300"
              />
            )}
          </div>

          <div className="rounded-2xl border border-gray-800 bg-gray-950/60 p-6">
            {goal.selectedItems.length === 0 ? (
              <p className="text-sm text-gray-400">You didn’t assign any inventory items to sell for this goal.</p>
            ) : (
              <div className="space-y-4">
                <div>
                  <h3 className="type-heading-sm text-white">Items you plan to sell</h3>
                  <p className="type-body-xs text-gray-500">
                    Total estimated sale value: {formatCurrency(goal.selectedTotal)}
                  </p>
                </div>
                <ul className="grid gap-3 md:grid-cols-2">
                  {goal.selectedItems.map((item) => (
                    <li key={item.id}>
                      <InventoryListCard
                        title={item.skinName}
                        subtitle={item.weapon ?? item.type ?? 'Skin'}
                        imageUrl={item.imageUrl}
                        footerLeft={`Tradable: ${item.tradeProtected ? 'No' : 'Yes'}`}
                        footerRight={formatCurrency(item.price)}
                      />
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </section>

        {otherGoals.length > 0 && (
          <section className="space-y-4 rounded-3xl border border-gray-800/50 bg-gray-900/60 p-6 shadow-2xl shadow-black/30 backdrop-blur">
            <h2 className="type-heading-lg text-white">Saved goals on this device</h2>
            <p className="type-body-xs text-gray-500">
              These goals are stored locally. Select one to review its details.
            </p>
            <div className="grid gap-3 md:grid-cols-2">
              {otherGoals.map((entry) => (
                <Link
                  key={entry.id}
                  href={`/goal/summary?goalId=${encodeURIComponent(entry.id)}`}
                  className="group rounded-xl border border-gray-800 bg-gray-950/60 px-4 py-3 text-sm transition-colors hover:border-purple-400/40 hover:bg-purple-500/10"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium text-white group-hover:text-purple-100">{entry.skinName}</p>
                    <span className="text-xs text-gray-400">{formatCurrency(entry.targetPrice)}</span>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    Created {new Date(entry.createdAt).toLocaleDateString()} • Coverage {formatCurrency(entry.coverageTotal)}
                  </p>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
