'use client';

type StatCardProps = {
  label: string;
  value: string;
  valueClassName?: string;
  secondaryValue?: string;
};

export default function StatCard({ label, value, valueClassName, secondaryValue }: StatCardProps) {
  const valueTypographyClass = valueClassName ?? 'type-heading-md';

  return (
    <div className="rounded-2xl border border-gray-800 bg-gray-950/70 px-5 py-4 shadow-lg shadow-black/30">
      <p className="type-label text-gray-500">{label}</p>
      <p className={`mt-2 ${valueTypographyClass} text-white`}>{value}</p>
      {secondaryValue && <p className="mt-1 type-body-sm text-gray-400">{secondaryValue}</p>}
    </div>
  );
}

