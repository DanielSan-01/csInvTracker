import Link from 'next/link';

type GoalPlannerHeaderProps = {
  userLoading: boolean;
  username?: string | null;
  steamId?: string | null;
};

export default function GoalPlannerHeader({ userLoading, username, steamId }: GoalPlannerHeaderProps) {
  return (
    <header className="flex flex-col gap-6 rounded-3xl border border-gray-800 bg-gray-900/70 p-6 shadow-2xl shadow-black/30 backdrop-blur">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="type-label text-purple-300/80">Goal Planner</p>
          <h1 className="type-heading-xl text-white">Set a Goal for Your Next Skin</h1>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-lg border border-purple-500/40 px-4 py-2 text-sm font-medium text-purple-100 transition-colors hover:border-purple-400/60 hover:bg-purple-500/10"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7 7-7M3 12h18" />
            </svg>
            Back to dashboard
          </Link>
          <div className="rounded-lg border border-gray-800 bg-gray-900/80 px-4 py-2 text-xs text-gray-300">
            {userLoading ? (
              'Checking Steam account...'
            ) : username || steamId ? (
              <>
                Planning for{' '}
                <span className="font-medium text-purple-300">{username ?? steamId}</span>
              </>
            ) : (
              'You are browsing as a guest. Log in to use your inventory.'
            )}
          </div>
        </div>
      </div>

      <p className="type-body-sm leading-relaxed text-gray-400">
        This planner helps you figure out how close you are to affording a new skin. Add your target skin, choose
        items you plan to sell, and include any balance you already have on trading sites. We’ll crunch the numbers
        and show what you still need (or how much surplus you have).
      </p>
    </header>
  );
}

