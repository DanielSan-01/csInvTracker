'use client';

import { useState } from 'react';
import { initiateSteamLogin } from '@/lib/steamAuth';
import { useUser } from '@/contexts/UserContext';
import { authApi } from '@/lib/api';

export default function SteamLoginButton() {
  const { user, refreshUser } = useUser();
  const [isLoading, setIsLoading] = useState(false);
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualSteamId, setManualSteamId] = useState('');

  const handleLogin = () => {
    // Check if we're on localhost - if so, show manual input
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      setShowManualInput(true);
    } else {
      // Use proper Steam OpenID
      initiateSteamLogin(window.location.pathname);
    }
  };

  const handleManualSubmit = async () => {
    if (manualSteamId.trim()) {
      // Validate Steam ID format (should be 17 digits)
      if (/^\d{17}$/.test(manualSteamId.trim())) {
        setIsLoading(true);
        try {
          // For localhost, we'll still use the old endpoint but create a session
          const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5027/api';
          const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ steamId: manualSteamId.trim() }),
          });
          
          if (response.ok) {
            setShowManualInput(false);
            setManualSteamId('');
            await refreshUser();
          } else {
            alert('Failed to login. Please try again.');
          }
        } catch (error) {
          console.error('Login error:', error);
          alert('An error occurred during login.');
        } finally {
          setIsLoading(false);
        }
      } else {
        alert('Invalid Steam ID. Steam IDs are 17-digit numbers.');
      }
    }
  };

  const handleLogout = async () => {
    setIsLoading(true);
    try {
      await authApi.logout();
      await refreshUser();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Show user profile when logged in
  if (user) {
    return (
      <div className="flex items-center gap-3">
        {user.avatarMediumUrl && (
          <img
            src={user.avatarMediumUrl}
            alt={user.displayName || user.username || 'User'}
            className="h-10 w-10 rounded-full border-2 border-gray-600"
          />
        )}
        <div className="flex flex-col">
          <span className="text-sm font-medium text-white">
            {user.displayName || user.username || `User ${user.steamId.slice(-6)}`}
          </span>
          {user.profileUrl && (
            <a
              href={user.profileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-gray-400 hover:text-gray-300"
            >
              View Profile
            </a>
          )}
        </div>
        <button
          onClick={handleLogout}
          className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors text-sm"
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
      className="relative inline-block transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
      style={{ border: 'none', background: 'none', padding: 0 }}
    >
      {isLoading ? (
        <div className="flex items-center gap-2 px-4 py-2 bg-[#171a21] rounded">
          <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span className="text-white">Loading...</span>
        </div>
      ) : (
        <img
          src="/photos/sits_01.png"
          alt="Sign in through Steam"
          className="h-auto w-auto max-h-12 cursor-pointer"
          style={{ imageRendering: 'auto' }}
        />
      )}
    </button>
  );
}

