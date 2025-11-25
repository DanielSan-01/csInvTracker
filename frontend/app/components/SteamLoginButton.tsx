'use client';

import { useState, useEffect } from 'react';
import { getSteamIdFromUrl, storeSteamId, getStoredSteamId, clearSteamId } from '@/lib/steamAuth';

export default function SteamLoginButton() {
  const [steamId, setSteamId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualSteamId, setManualSteamId] = useState('');

  useEffect(() => {
    // Check for Steam ID in URL (after authentication)
    const urlSteamId = getSteamIdFromUrl();
    if (urlSteamId) {
      storeSteamId(urlSteamId);
      setSteamId(urlSteamId);
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname);
    } else {
      // Check stored Steam ID
      const stored = getStoredSteamId();
      if (stored) {
        setSteamId(stored);
      }
    }
  }, []);

  const handleLogin = () => {
    setShowManualInput(true);
  };

  const handleManualSubmit = () => {
    if (manualSteamId.trim()) {
      // Validate Steam ID format (should be 17 digits)
      if (/^\d{17}$/.test(manualSteamId.trim())) {
        storeSteamId(manualSteamId.trim());
        setSteamId(manualSteamId.trim());
        setShowManualInput(false);
        setManualSteamId('');
      } else {
        alert('Invalid Steam ID. Steam IDs are 17-digit numbers.');
      }
    }
  };

  const handleLogout = () => {
    clearSteamId();
    setSteamId(null);
  };

  if (steamId) {
    return (
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
          </svg>
          <span>Steam ID: {steamId}</span>
        </div>
        <button
          onClick={handleLogout}
          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors text-sm"
        >
          Logout
        </button>
      </div>
    );
  }

  if (showManualInput) {
    return (
      <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 shadow-lg min-w-[300px]">
        <p className="text-sm text-gray-300 mb-3">
          Steam OpenID doesn't work with localhost. Enter your Steam ID manually:
        </p>
        <div className="flex gap-2 mb-2">
          <input
            type="text"
            value={manualSteamId}
            onChange={(e) => setManualSteamId(e.target.value)}
            placeholder="76561197996404463"
            className="flex-1 px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:outline-none focus:border-blue-500 text-sm"
            onKeyPress={(e) => e.key === 'Enter' && handleManualSubmit()}
          />
          <button
            onClick={handleManualSubmit}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors text-sm"
          >
            Submit
          </button>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowManualInput(false)}
            className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors text-xs"
          >
            Cancel
          </button>
          <p className="text-xs text-gray-500 flex-1 text-right">
            Find your Steam ID at <a href="https://steamid.io" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">steamid.io</a>
          </p>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={handleLogin}
      disabled={isLoading}
      className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg transition-colors"
    >
      {isLoading ? (
        <>
          <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span>Loading...</span>
        </>
      ) : (
        <>
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
          </svg>
          <span>Login with Steam</span>
        </>
      )}
    </button>
  );
}

