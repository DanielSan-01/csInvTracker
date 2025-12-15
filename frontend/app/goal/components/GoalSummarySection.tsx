'use client';

import GoalStepSection from './GoalStepSection';

type GoalSummarySectionProps = {
  step: number;
  targetSummaryName: string;
  parsedTargetPrice: number;
  selectedTotal: number;
  selectedItemCount: number;
  parsedBalance: number;
  coverageTotal: number;
  remainingAmount: number;
  surplusAmount: number;
  formatCurrency: (value: number) => string;
};

const GoalSummarySection = ({
  step,
  targetSkinName,
  parsedTargetPrice,
  selectedTotal,
  selectedItemCount,
  parsedBalance,
  coverageTotal,
  remainingAmount,
  surplusAmount,
  formatCurrency,
}: GoalSummarySectionProps) => {
  const summaryCards: SummaryCardProps[] = [
    {
      label: 'Targets',
      value: targetSummaryName ? targetSummaryName : 'Not set yet',
      secondaryValue: parsedTargetPrice > 0 ? formatCurrency(parsedTargetPrice) : '–',
    },
    {
      label: 'From planned sales',
      value: formatCurrency(selectedTotal),
      secondaryValue: `${selectedItemCount} ${selectedItemCount === 1 ? 'item' : 'items'} selected`,
    },
    {
      label: 'Existing balance',
      value: formatCurrency(parsedBalance),
      secondaryValue: 'Cash or site balance you already have',
    },
    {
      label: 'Total coverage',
      value: formatCurrency(coverageTotal),
      secondaryValue: 'Planned sales + balance',
    },
  ];

  return (
    <GoalStepSection
      step={step}
      title="Your affordability dashboard"
      description="See how close you are and what’s still missing."
      className="border-purple-500/30 bg-purple-950/30 shadow-purple-950/30"
    >
      <div className="grid gap-4 md:grid-cols-2">
        {summaryCards.map((card) => (
          <SummaryCard key={card.label} {...card} />
        ))}
      </div>

      <div className="rounded-2xl border border-gray-800 bg-gray-950/60 p-6">
        {parsedTargetPrice <= 0 ? (
          <p className="text-sm text-gray-400">Enter a target price above to see how close you are.</p>
        ) : remainingAmount > 0 ? (
          <div className="flex flex-col gap-2">
            <p className="text-lg font-semibold text-amber-300">
              You still need {formatCurrency(remainingAmount)}.
            </p>
            <p className="text-sm text-gray-300">
              Based on your planned sales and balance, you have covered {formatCurrency(coverageTotal)} out of{' '}
              {formatCurrency(parsedTargetPrice)}. Consider adding more items to sell or saving the remaining amount.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <p className="text-lg font-semibold text-emerald-300">You can afford it!</p>
            <p className="text-sm text-emerald-100">
              Your plan covers {formatCurrency(coverageTotal)}, which is enough for the target skin.{' '}
              {surplusAmount > 0 && <span>You’ll have {formatCurrency(surplusAmount)} left after the purchase.</span>}
            </p>
          </div>
        )}
      </div>
    </GoalStepSection>
  );
};

type SummaryCardProps = {
  label: string;
  value: string;
  secondaryValue?: string;
};

const SummaryCard = ({ label, value, secondaryValue }: SummaryCardProps) => (
  <div className="rounded-2xl border border-gray-800 bg-gray-950/70 px-5 py-4 shadow-lg shadow-black/30">
    <p className="type-label text-gray-500">{label}</p>
    <p className="mt-2 type-heading-md text-white">{value}</p>
    {secondaryValue && <p className="mt-1 type-body-sm text-gray-400">{secondaryValue}</p>}
  </div>
);

export default GoalSummarySection;


