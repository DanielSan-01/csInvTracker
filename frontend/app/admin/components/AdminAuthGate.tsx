type AdminAuthGateProps = {
  password: string;
  onPasswordChange: (value: string) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  error: string | null;
};

export default function AdminAuthGate({
  password,
  onPasswordChange,
  onSubmit,
  error,
}: AdminAuthGateProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 px-4">
      <div className="w-full max-w-md rounded-2xl border border-gray-700 bg-gray-900/80 p-8 shadow-2xl backdrop-blur-xl">
        <h1 className="mb-2 text-center text-3xl font-bold text-white">Admin Access</h1>
        <p className="mb-6 text-center text-gray-400">
          Enter the admin password to manage users and skins.
        </p>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-300">Password</label>
            <input
              type="password"
              value={password}
              onChange={(event) => onPasswordChange(event.target.value)}
              placeholder="Enter admin password"
              className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          {error && (
            <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-400">
              {error}
            </div>
          )}
          <button
            type="submit"
            className="w-full rounded-lg bg-blue-600 py-2 font-semibold transition-all hover:bg-blue-500"
          >
            Unlock Admin Panel
          </button>
        </form>
      </div>
    </div>
  );
}











