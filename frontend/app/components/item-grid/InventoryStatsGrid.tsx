import StatCard from '../StatCard';

type InventoryStatsGridProps = {
  totalItems: string;
  marketValue: string;
  acquisitionCost: string;
  netProfit: string;
  netProfitPositive: boolean | null;
  avgProfitPercent: string;
};

export default function InventoryStatsGrid({
  totalItems,
  marketValue,
  acquisitionCost,
  netProfit,
  netProfitPositive,
  avgProfitPercent,
}: InventoryStatsGridProps) {
  return (
    <div className="mb-8 grid grid-cols-1 gap-4 text-sm text-gray-400 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard label="Total Items" value={totalItems} valueClassName="type-heading-xl" />
      <StatCard label="Market Value" value={marketValue} valueClassName="type-heading-xl" />
      <StatCard label="Acquisition Cost" value={acquisitionCost} valueClassName="type-heading-xl" />
      <StatCard
        label="Net Profit"
        value={netProfit}
        valueClassName={`type-heading-xl ${
          netProfitPositive == null ? '' : netProfitPositive ? 'text-green-400' : 'text-red-400'
        }`}
        secondaryValue={avgProfitPercent}
      />
    </div>
  );
}

