import React, { useState } from 'react';
import {
  Film,
  Compass,
  Sparkles,
  Bookmark,
  User,
  BarChart3,
  BookOpen,
  Home,
  UserCheck,
  Plus,
  Check,
} from 'lucide-react';
import { getActiveProfileId, setActiveProfileId } from '../api/client';

export type NavigationTab =
  | 'home'
  | 'discover'
  | 'recommendations'
  | 'watchlist'
  | 'profile'
  | 'analytics'
  | 'docs';

interface NavbarProps {
  activeTab: NavigationTab;
  onTabChange: (tab: NavigationTab) => void;
  watchlistCount: number;
  ratingsCount: number;
  onProfileChange: () => void;
  onOpenAuth: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onTabChange,
  watchlistCount,
  ratingsCount,
  onProfileChange,
  onOpenAuth,
}) => {
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [newProfileName, setNewProfileName] = useState('');
  const activeProfile = getActiveProfileId();

  const handleSwitchProfile = (pId: string) => {
    setActiveProfileId(pId);
    setShowProfileMenu(false);
    onProfileChange();
  };

  const handleCreateProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProfileName.trim()) return;
    const cleanId = newProfileName.toLowerCase().replace(/[^a-z0-9_]/g, '_');
    setActiveProfileId(cleanId);
    setNewProfileName('');
    setShowProfileMenu(false);
    onProfileChange();
  };

  const navItems: { id: NavigationTab; label: string; icon: React.FC<{ className?: string }>; badge?: number }[] = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'discover', label: 'Discover', icon: Compass },
    { id: 'recommendations', label: 'Recommendations', icon: Sparkles },
    { id: 'watchlist', label: 'Watchlist', icon: Bookmark, badge: watchlistCount },
    { id: 'profile', label: 'Ratings', icon: User, badge: ratingsCount },
    { id: 'analytics', label: 'Dashboard', icon: BarChart3 },
    { id: 'docs', label: 'Algorithm Docs', icon: BookOpen },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/10 bg-[#0B0C10]/90 backdrop-blur-xl transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-20 flex items-center justify-between gap-4">
        {/* Brand Logo */}
        <div
          onClick={() => onTabChange('home')}
          className="flex items-center gap-3 cursor-pointer select-none group"
        >
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-amber-600 to-amber-400 flex items-center justify-center shadow-lg shadow-amber-500/20 group-hover:scale-105 transition-transform duration-200">
            <Film className="w-6 h-6 text-zinc-950 stroke-[2.5]" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="text-xl font-extrabold tracking-tight text-white font-['Space_Grotesk']">
                CineMatch<span className="text-amber-400">.AI</span>
              </span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-amber-400/20 text-amber-300 border border-amber-400/30">
                ML-Engine
              </span>
            </div>
            <span className="text-[11px] text-zinc-400 hidden sm:block">
              Your Next Favorite Movie Starts Here
            </span>
          </div>
        </div>

        {/* Navigation Tabs (Desktop) */}
        <nav className="hidden lg:flex items-center gap-1 bg-white/[0.03] p-1.5 rounded-2xl border border-white/5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`relative px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${
                  isActive
                    ? 'bg-amber-500 text-zinc-950 shadow-md shadow-amber-500/20 font-bold'
                    : 'text-zinc-300 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'stroke-[2.5]' : ''}`} />
                <span>{item.label}</span>
                {item.badge !== undefined && item.badge > 0 && (
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                      isActive ? 'bg-zinc-950 text-amber-400' : 'bg-amber-400/20 text-amber-300'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Profile Switcher & Sign In Button */}
        <div className="flex items-center gap-2">
          {activeProfile === 'guest_default' ? (
            <button
              onClick={onOpenAuth}
              className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-zinc-950 font-bold text-xs flex items-center gap-1.5 shadow-md shadow-amber-500/20 transition-all cursor-pointer"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign In</span>
            </button>
          ) : (
            <div className="relative">
              <button
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-xs font-bold text-amber-300 transition-colors"
                title="Current Account"
              >
                <div className="w-5 h-5 rounded-full bg-amber-500 text-zinc-950 flex items-center justify-center text-[10px] font-black uppercase">
                  {activeProfile.charAt(0)}
                </div>
                <span className="max-w-[120px] truncate capitalize">
                  {activeProfile.replace('_', ' ')}
                </span>
              </button>

              {/* Profile Dropdown */}
              {showProfileMenu && (
                <div
                  className="absolute right-0 mt-2 w-64 rounded-2xl bg-[#141620] border border-white/10 shadow-2xl p-3 z-50 text-zinc-100"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="pb-2 mb-2 border-b border-white/5 flex items-center justify-between">
                    <div>
                      <span className="text-[11px] font-bold uppercase text-amber-400 tracking-wider">
                        Signed In User
                      </span>
                      <p className="text-xs text-white font-semibold capitalize mt-0.5">
                        {activeProfile.replace('_', ' ')}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        api.logout();
                        setShowProfileMenu(false);
                        onProfileChange();
                      }}
                      className="text-[11px] text-red-400 hover:text-red-300 font-medium px-2 py-1 rounded bg-red-500/10 hover:bg-red-500/20 transition-colors"
                    >
                      Log Out
                    </button>
                  </div>

                  <div className="space-y-1 mb-2">
                    <button
                      onClick={() => {
                        onOpenAuth();
                        setShowProfileMenu(false);
                      }}
                      className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium text-zinc-300 hover:bg-white/5 flex items-center gap-2"
                    >
                      <User className="w-3.5 h-3.5 text-amber-400" />
                      <span>Switch or Create Account</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeProfile === 'guest_default' && (
            <div className="relative">
              <button
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.08] border border-white/10 text-xs font-medium text-zinc-300 transition-colors"
                title="Browse as Guest Profiles"
              >
                <UserCheck className="w-3.5 h-3.5 text-zinc-400" />
                <span className="hidden sm:inline text-zinc-400">Guest</span>
              </button>

              {/* Guest Profile Menu */}
              {showProfileMenu && (
                <div
                  className="absolute right-0 mt-2 w-64 rounded-2xl bg-[#141620] border border-white/10 shadow-2xl p-3 z-50 text-zinc-100"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="pb-2 mb-2 border-b border-white/5">
                    <span className="text-[11px] font-bold uppercase text-zinc-400 tracking-wider">
                      Guest Profiles
                    </span>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      Or sign in to preserve your account across devices.
                    </p>
                  </div>

                  <div className="space-y-1 mb-3">
                    {['guest_default', 'guest_cinephile', 'movie_night'].map((pid) => (
                      <button
                        key={pid}
                        onClick={() => handleSwitchProfile(pid)}
                        className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center justify-between transition-colors ${
                          activeProfile === pid
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : 'text-zinc-300 hover:bg-white/5'
                        }`}
                      >
                        <span className="capitalize">{pid.replace('_', ' ')}</span>
                        {activeProfile === pid && <Check className="w-3.5 h-3.5 text-amber-400" />}
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={() => {
                      setShowProfileMenu(false);
                      onOpenAuth();
                    }}
                    className="w-full py-1.5 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-300 font-bold text-xs flex items-center justify-center gap-1.5 hover:bg-amber-500/25 transition-colors"
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    <span>Sign In or Register</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

                {/* Create custom profile form */}
                <form onSubmit={handleCreateProfile} className="pt-2 border-t border-white/5 flex gap-1.5">
                  <input
                    type="text"
                    value={newProfileName}
                    onChange={(e) => setNewProfileName(e.target.value)}
                    placeholder="New profile name..."
                    className="flex-1 bg-black/40 border border-white/10 rounded-lg px-2.5 py-1 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-400"
                  />
                  <button
                    type="submit"
                    className="px-2.5 py-1 rounded-lg bg-amber-500 text-zinc-950 font-bold text-xs hover:bg-amber-400 transition-colors flex items-center"
                    title="Add profile"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Navigation Bar */}
      <div className="lg:hidden border-t border-white/5 px-2 py-2 flex items-center justify-around overflow-x-auto gap-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl text-[10px] font-semibold whitespace-nowrap ${
                isActive ? 'text-amber-400 bg-amber-500/10' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <div className="relative">
                <Icon className="w-4 h-4" />
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="absolute -top-1 -right-2 px-1 py-0.2 rounded-full text-[8px] font-bold bg-amber-500 text-zinc-950">
                    {item.badge}
                  </span>
                )}
              </div>
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </header>
  );
};
