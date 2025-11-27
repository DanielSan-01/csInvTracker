'use client';

import type { ReactNode } from 'react';

type GoalStepSectionProps = {
  step: number;
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
};

const baseSectionClasses =
  'space-y-6 rounded-3xl border border-gray-800/60 bg-gray-900/70 p-6 shadow-2xl shadow-black/40 backdrop-blur';

const GoalStepSection = ({ step, title, description, children, className }: GoalStepSectionProps) => {
  return (
    <section className={`${baseSectionClasses} ${className ?? ''}`.trim()}>
      <div className="flex flex-col gap-1">
        <h2 className="type-heading-lg text-white">
          Step {step}: {title}
        </h2>
        {description && <p className="type-body-sm text-gray-400">{description}</p>}
      </div>
      {children}
    </section>
  );
};

export default GoalStepSection;



