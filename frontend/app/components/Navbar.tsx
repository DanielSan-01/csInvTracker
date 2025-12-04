'use client';

import { useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { CSItem } from '@/lib/mockData';
import type { SkinDto } from '@/lib/api';
import NavbarSearch from './NavbarSearch';

type NavbarProps = {
  isAuthenticated?: boolean;
  authControl?: ReactNode;
  userInventory?: CSItem[];
  onQuickAddSkin?: (skin: SkinDto) => void;
  canAdd?: boolean;
};

const baseButtonClasses =
  'inline-flex items-center gap-2 rounded-lg border border-gray-700 px-3 py-2 text-sm font-medium text-slate-100 transition hover:border-purple-400 hover:text-white hover:bg-purple-500/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-400';

const Navbar = ({
  isAuthenticated = false,
  authControl,
  userInventory = [],
  onQuickAddSkin,
  canAdd = false,
}: NavbarProps) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();

  const subtitle = isAuthenticated ? "You're viewing your inventory" : 'Log in with Steam to manage your inventory';

  const isRouteActive = (href: string) => {
    if (href === '/') {
      return pathname === '/';
    }
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  const renderPlanGoalLink = (variant: 'desktop' | 'mobile') => (
    <Link
      href="/goal"
      onClick={() => setMenuOpen(false)}
      className={`${baseButtonClasses} ${
        variant === 'mobile' ? 'w-full justify-between' : ''
      } ${isRouteActive('/goal') ? 'border-purple-400 bg-purple-500/20 text-purple-100' : ''}`}
    >
      Plan Goal
    </Link>
  );

  const renderLoadoutLink = (variant: 'desktop' | 'mobile') => (
    <Link
      href="/loadout-cooker"
      onClick={() => setMenuOpen(false)}
      className={`${baseButtonClasses} ${
        variant === 'mobile' ? 'w-full justify-between' : ''
      } ${isRouteActive('/loadout-cooker') ? 'border-purple-400 bg-purple-500/20 text-purple-100' : ''}`}
    >
      Loadout Cooker
    </Link>
  );

  return (
    <header className="border-b border-gray-800 bg-gray-950/95 text-white">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 py-4 md:px-6">
        <div className="flex-shrink-0">
          <Link href="/" onClick={() => setMenuOpen(false)} className="text-xl font-semibold md:text-2xl">
            CS Inventory Tracker
          </Link>
          <p className="text-xs text-gray-400 md:text-sm">{subtitle}</p>
        </div>

        {/* Search Bar - Desktop */}
        {onQuickAddSkin && (
          <div className="hidden flex-1 max-w-md md:block">
            <NavbarSearch
              userInventory={userInventory}
              onAddSkin={onQuickAddSkin}
              isLoggedIn={canAdd}
            />
          </div>
        )}

        <div className="flex items-center gap-3 md:hidden">
          <button
            type="button"
            aria-label="Toggle navigation"
            onClick={() => setMenuOpen((prev) => !prev)}
            className="rounded-lg border border-gray-700 p-2 text-gray-300 transition hover:border-purple-400 hover:text-white"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>

        <nav className="hidden items-center gap-3 md:flex">
          {renderPlanGoalLink('desktop')}
          {renderLoadoutLink('desktop')}
          {authControl && <div className="flex items-center">{authControl}</div>}
        </nav>
      </div>

      <div className={`${menuOpen ? 'flex' : 'hidden'} flex-col gap-3 border-t border-gray-800 px-4 pb-4 md:hidden`}>
        {/* Search Bar - Mobile */}
        {onQuickAddSkin && (
          <div className="w-full">
            <NavbarSearch
              userInventory={userInventory}
              onAddSkin={onQuickAddSkin}
              isLoggedIn={canAdd}
            />
          </div>
        )}
        {renderPlanGoalLink('mobile')}
        {renderLoadoutLink('mobile')}
        {authControl && <div className="w-full">{authControl}</div>}
      </div>
    </header>
  );
};

export default Navbar;


