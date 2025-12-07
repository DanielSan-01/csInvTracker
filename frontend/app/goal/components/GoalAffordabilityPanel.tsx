'use client';

type GoalAffordabilityPanelProps = {
  targetSkinName: string;
  targetSkinImageUrl?: string | null;
  targetPrice: number;
  selectedTotal: number;
  parsedBalance: number;
  remainingAmount: number;
  surplusAmount: number;
  formatCurrency: (value: number) => string;
};

export default function GoalAffordabilityPanel({
  targetSkinName,
  targetSkinImageUrl,
  targetPrice,
  selectedTotal,
  parsedBalance,
  remainingAmount,
  surplusAmount,
  formatCurrency,
}: GoalAffordabilityPanelProps) {
  if (targetPrice <= 0 && !targetSkinName.trim()) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-gray-800 bg-gray-900/60 p-4 space-y-4">
      {/* Skin Name and Image */}
      {targetSkinName.trim() && (
        <div className="space-y-3">
          {targetSkinImageUrl && (
            <div className="flex items-center justify-center rounded-xl border border-gray-800 bg-gray-950/60 p-4">
              <img
                src={targetSkinImageUrl}
                alt={targetSkinName}
                className="max-h-32 max-w-full object-contain"
                loading="lazy"
              />
            </div>
          )}
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-1">
              Target Skin
            </p>
            <p className="text-sm font-semibold text-white line-clamp-2">{targetSkinName}</p>
          </div>
        </div>
      )}

      {/* Affordability Breakdown */}
      {targetPrice > 0 && (
        <>
          <div className="border-t border-gray-800 pt-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-gray-400">
              Affordability
            </p>
            
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-gray-300">Target Cost</span>
                <span className="font-semibold text-white">{formatCurrency(targetPrice)}</span>
              </div>
              
              {selectedTotal > 0 && (
                <div className="flex items-center justify-between text-red-300">
                  <span>− Sales</span>
                  <span className="font-semibold">{formatCurrency(selectedTotal)}</span>
                </div>
              )}
              
              {parsedBalance > 0 && (
                <div className="flex items-center justify-between text-red-300">
                  <span>− Balance</span>
                  <span className="font-semibold">{formatCurrency(parsedBalance)}</span>
                </div>
              )}
              
              <div className="pt-2 border-t border-gray-800">
                {remainingAmount > 0 ? (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-300">Still Needed</span>
                    <span className="font-bold text-red-400">{formatCurrency(remainingAmount)}</span>
                  </div>
                ) : surplusAmount > 0 ? (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-300">Surplus</span>
                    <span className="font-bold text-emerald-400">+{formatCurrency(surplusAmount)}</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-300">Status</span>
                    <span className="font-bold text-emerald-400">Covered</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

