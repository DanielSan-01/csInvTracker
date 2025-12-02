type InventoryFilterInputProps = {
  value: string;
  onChange: (value: string) => void;
};

export default function InventoryFilterInput({ value, onChange }: InventoryFilterInputProps) {
  return (
    <div className="relative w-full">
        <label htmlFor="inventory-filter" className="sr-only">
          Filter your inventory
        </label>
        <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-gray-500">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35m1.6-4.15a6.75 6.75 0 11-13.5 0 6.75 6.75 0 0113.5 0z" />
          </svg>
        </span>
        <input
          id="inventory-filter"
          type="text"
          placeholder="Filter your items..."
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="w-full rounded-lg border border-gray-700 bg-gray-800 px-10 py-2 text-white placeholder-gray-400 focus:border-purple-500 focus:outline-none"
        />
    </div>
  );
}

