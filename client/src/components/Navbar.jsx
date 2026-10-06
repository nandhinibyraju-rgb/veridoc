import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import {
  Activity,
  Search,
  Bell,
  Menu,
  User,
  Settings,
  Shield,
  LogOut,
  ChevronDown,
  BookOpen,
  History as HistoryIcon,
  Home,
  Sparkles,
  ExternalLink,
  PanelLeft,
  GraduationCap,
  Stethoscope
} from 'lucide-react';

export default function Navbar({ onToggleMobileMenu, onToggleHistoryDrawer, studentMode = false, onToggleStudentMode }) {
  const { user, logout, appMode: authAppMode, setAppMode: authSetAppMode } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const appMode = authAppMode || (studentMode ? 'student' : 'doctor');
  const isStudent = appMode === 'student';

  const handleModeChange = (targetMode) => {
    if (authSetAppMode) {
      authSetAppMode(targetMode);
    } else if (onToggleStudentMode) {
      if ((targetMode === 'student' && !studentMode) || (targetMode === 'doctor' && studentMode)) {
        onToggleStudentMode();
      }
    }
  };

  const [searchQuery, setSearchQuery] = useState('');
  const [isAvatarOpen, setIsAvatarOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);

  const avatarRef = useRef(null);
  const notifRef = useRef(null);

  // Close popovers on click outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (avatarRef.current && !avatarRef.current.contains(e.target)) {
        setIsAvatarOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setIsNotifOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    navigate(`/?q=${encodeURIComponent(searchQuery.trim())}`);
    setSearchQuery('');
  };

  const isActive = (path) => {
    if (path === '/' && location.pathname === '/') return true;
    if (path !== '/' && location.pathname.startsWith(path)) return true;
    return false;
  };

  const navItems = [
    { label: 'Home', path: '/', icon: Home },
    { label: 'Library', path: '/library', icon: BookOpen },
    { label: 'Updates', path: '/updates', icon: Sparkles },
    { label: 'History', path: '/history', icon: HistoryIcon },
  ];

  const userName = user?.name || 'Dr. Sarah Chen, MD';
  const userInitials = userName.replace(/^(Dr\.|MD)\s*/i, '').charAt(0) || 'D';

  const notifications = [
    {
      id: 1,
      title: '3 New Meta-Analyses Indexed',
      desc: 'Cardiology & SGLT2i heart failure trials updated in PubMed',
      time: '2h ago'
    },
    {
      id: 2,
      title: 'FDA Safety Alert Issued',
      desc: 'GLP-1 receptor agonist perioperative fasting advisory',
      time: '1d ago'
    },
    {
      id: 3,
      title: 'New Guideline Recommendation',
      desc: 'ACC/AHA 2024 updated hypertension management pathways',
      time: '3d ago'
    }
  ];

  return (
    <motion.header
      initial={{ y: -64, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className={`sticky top-0 z-40 backdrop-blur-md border-b shadow-2xs transition-all duration-400 ${
        isStudent
          ? 'bg-gradient-to-r from-indigo-50/95 via-white/95 to-amber-50/80 border-indigo-100'
          : 'bg-gradient-to-r from-sky-50/95 via-white/95 to-sky-50/80 border-sky-100'
      }`}
    >
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-2 sm:gap-3">
          {/* Left: History Drawer Toggle & Logo */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Slide-in History Drawer Toggle Icon Button */}
            {onToggleHistoryDrawer && (
              <button
                onClick={onToggleHistoryDrawer}
                className="p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 border border-slate-200/60 shadow-2xs transition-colors flex items-center gap-1.5"
                title="Toggle Session History Drawer"
                aria-label="Toggle Session History"
              >
                <PanelLeft className="w-4 h-4 text-[#0F766E]" />
              </button>
            )}

            <button
              onClick={onToggleMobileMenu}
              className="lg:hidden p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 transition-colors"
              aria-label="Toggle mobile menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            <Link to="/" className="flex items-center gap-2 sm:gap-2.5 group shrink-0">
              <div className="w-8.5 h-8.5 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-tr from-[#0F766E] to-teal-500 flex items-center justify-center text-white shadow-xs group-hover:scale-105 transition-transform duration-150">
                <Activity className="w-4.5 h-4.5 sm:w-5 sm:h-5 stroke-[2.3]" />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5 leading-none">
                  <span className="text-base sm:text-lg font-bold tracking-tight text-[#0F172A]">Veridoc</span>
                  <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-cyan-100/70 text-cyan-800 border border-cyan-200/60">
                    Clinical
                  </span>
                </div>
                <span className="text-[10px] text-slate-500 font-medium hidden md:inline leading-tight mt-0.5">
                  Evidence Graded & Verified
                </span>
              </div>
            </Link>
          </div>

          {/* Compact "Find a topic or paper" search input */}
          <div className="hidden lg:flex flex-1 max-w-xs mx-2">
            <form onSubmit={handleSearchSubmit} className="relative w-full">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Find a topic or paper..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8.5 pr-3 py-1.5 rounded-full bg-white/90 border border-slate-200/90 hover:border-slate-300 focus:border-[#0F766E] focus:ring-2 focus:ring-teal-100 text-xs text-slate-800 placeholder-slate-400 outline-none transition-all"
              />
            </form>
          </div>

          {/* Centered Pill Nav */}
          <nav className="flex items-center p-0.5 sm:p-1 bg-slate-100/70 rounded-full border border-slate-200/70 shrink-0">
            {navItems.map((item) => {
              const active = isActive(item.path);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`px-2.5 sm:px-3.5 py-1 rounded-full text-xs font-medium transition-all duration-150 flex items-center gap-1.5 ${
                    active
                      ? isStudent
                        ? 'bg-indigo-600 text-white font-bold shadow-xs'
                        : 'bg-[#22D3EE] text-slate-900 font-bold shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/70'
                  }`}
                >
                  <item.icon className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Right: Segmented Doctor/Student Toggle, Notifications Bell, Avatar */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            {/* Segmented Mode Toggle: Doctor | Student */}
            <div className="flex items-center p-0.5 sm:p-1 bg-slate-100/90 rounded-full border border-slate-200/90 relative shadow-2xs">
              <button
                type="button"
                onClick={() => handleModeChange('doctor')}
                className={`relative z-10 px-2.5 sm:px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-colors duration-200 cursor-pointer ${
                  !isStudent
                    ? 'text-teal-900 font-bold'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
                title="Switch to Doctor Mode (compact clinical summary, evidence grades, patient context)"
                aria-label="Doctor Mode"
              >
                <Stethoscope className={`w-3.5 h-3.5 ${!isStudent ? 'text-[#0F766E]' : 'text-slate-400'}`} />
                <span className="hidden sm:inline">Doctor</span>
                {!isStudent && (
                  <motion.div
                    layoutId="navbar-mode-indicator"
                    transition={{ type: 'spring', stiffness: 450, damping: 35, duration: 0.4 }}
                    className="absolute inset-0 bg-white rounded-full border border-teal-200/90 shadow-xs -z-10"
                  />
                )}
              </button>

              <button
                type="button"
                onClick={() => handleModeChange('student')}
                className={`relative z-10 px-2.5 sm:px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-colors duration-200 cursor-pointer ${
                  isStudent
                    ? 'text-indigo-900 font-bold'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
                title="Switch to Student Mode (plain words, mechanisms, key terms & quiz)"
                aria-label="Student Mode"
              >
                <GraduationCap className={`w-3.5 h-3.5 ${isStudent ? 'text-amber-500' : 'text-slate-400'}`} />
                <span className="hidden sm:inline">Student</span>
                {isStudent && (
                  <motion.div
                    layoutId="navbar-mode-indicator"
                    transition={{ type: 'spring', stiffness: 450, damping: 35, duration: 0.4 }}
                    className="absolute inset-0 bg-white rounded-full border border-indigo-200/90 shadow-xs -z-10"
                  />
                )}
              </button>
            </div>

            {/* Notifications Bell */}
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => setIsNotifOpen((prev) => !prev)}
                className="relative p-2 rounded-full text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 transition-colors"
                title="Evidence updates for your specialties"
                aria-label="Notifications"
              >
                <Bell className="w-4.5 h-4.5" />
                <span className={`absolute top-1 right-1 w-4 h-4 rounded-full text-white text-[9px] font-bold flex items-center justify-center border-2 border-white shadow-2xs transition-colors duration-300 ${
                  isStudent ? 'bg-[#4F46E5]' : 'bg-[#0F766E]'
                }`}>
                  3
                </span>
              </button>

              {/* Notifications Popover */}
              {isNotifOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-slate-200/90 py-3 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="px-4 pb-2 border-b border-slate-100 flex items-center justify-between">
                    <div>
                      <h2 className="text-xs font-bold text-slate-800">Specialty Evidence Feed</h2>
                      <p className="text-[10px] text-slate-500 font-medium">New meta-analyses & alerts</p>
                    </div>
                    <span className="text-[10px] font-semibold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-200">
                      3 new
                    </span>
                  </div>

                  <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
                    {notifications.map((n) => (
                      <div key={n.id} className="p-3 hover:bg-slate-50 transition-colors cursor-pointer">
                        <div className="flex items-center justify-between">
                          <h3 className="text-xs font-semibold text-slate-800">{n.title}</h3>
                          <span className="text-[10px] text-slate-600">{n.time}</span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">{n.desc}</p>
                      </div>
                    ))}
                  </div>

                  <div className="px-4 pt-2 border-t border-slate-100 text-center">
                    <Link
                      to="/updates"
                      onClick={() => setIsNotifOpen(false)}
                      className="text-xs font-semibold text-[#0F766E] hover:underline"
                    >
                      View all specialty updates →
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* Avatar Dropdown */}
            <div className="relative" ref={avatarRef}>
              <button
                onClick={() => setIsAvatarOpen((prev) => !prev)}
                className="flex items-center gap-1.5 p-1 rounded-full hover:bg-slate-100/80 transition-colors border border-transparent hover:border-slate-200"
                aria-label="User profile menu"
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#0F766E] to-teal-500 text-white flex items-center justify-center font-bold text-xs shadow-xs border border-white">
                  {userInitials}
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-500 hidden sm:block" />
              </button>

              {/* Avatar Dropdown Menu */}
              {isAvatarOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-200/90 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="px-4 py-2 border-b border-slate-100">
                    <div className="text-xs font-bold text-slate-800 truncate">{userName}</div>
                    <div className="text-[11px] text-slate-500 truncate">{user?.email || 'clinician@veridoc.med'}</div>
                  </div>

                  <div className="py-1">
                    <Link
                      to="/profile"
                      onClick={() => setIsAvatarOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-teal-50 hover:text-[#0F766E] transition-colors"
                    >
                      <User className="w-4 h-4 text-slate-400" />
                      <span>View Profile</span>
                    </Link>

                    <Link
                      to="/settings"
                      onClick={() => setIsAvatarOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-teal-50 hover:text-[#0F766E] transition-colors"
                    >
                      <Settings className="w-4 h-4 text-slate-400" />
                      <span>Settings</span>
                    </Link>

                    <Link
                      to="/privacy"
                      onClick={() => setIsAvatarOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-teal-50 hover:text-[#0F766E] transition-colors"
                    >
                      <Shield className="w-4 h-4 text-slate-400" />
                      <span>Privacy and Safety</span>
                    </Link>
                  </div>

                  <div className="pt-1 border-t border-slate-100">
                    <button
                      onClick={() => {
                        setIsAvatarOpen(false);
                        logout();
                      }}
                      className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors text-left"
                    >
                      <LogOut className="w-4 h-4 text-red-500" />
                      <span>Log Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.header>
  );
}
