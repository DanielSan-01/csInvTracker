'use client';

import GoalStepSection from './GoalStepSection';

type GoalBalanceSectionProps = {
  step: number;
  existingBalance: string;
  onBalanceChange: (value: string) => void;
};

const GoalBalanceSection = ({ step, existingBalance, onBalanceChange }: GoalBalanceSectionProps) => {
  return (
    <GoalStepSection
      step={step}
      title="Add any balance you already have"
      description="Include wallet balances or cash you can use right away."
    >
      <div className="max-w-sm">
        <label className="flex flex-col gap-2">
          <span className="text-sm text-gray-300">Existing balance (USD)</span>
          <input
            type="number"
            min="0"
            step="0.01"
            value={existingBalance}
            onChange={(event) => onBalanceChange(event.target.value)}
            placeholder="0.00"
            className="rounded-xl border border-gray-800 bg-gray-950/60 px-4 py-3 text-sm text-white placeholder:text-gray-500 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/40"
          />
        </label>
      </div>
    </GoalStepSection>
  );
};

export default GoalBalanceSection;



