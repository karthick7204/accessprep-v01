import React, { useState } from 'react';
import {
  Home,
  Compass,
  Mic,
  Clock,
  Brain,
  Calendar,
  History,
  BarChart2,
  Settings,
  HelpCircle,
  LogOut,
  ChevronLeft,
  ChevronRight,
  User as UserIcon,
  ShieldCheck,
  Cpu,
  Database,
  X,
  LogIn,
  ClipboardCheck,
  Award,
  Sliders,
  Headphones
} from 'lucide-react';
import { useAccessibility } from '../context/AccessibilityContext.tsx';
import { SCREEN_REGISTRY, ScreenId } from '../types/screens.ts';
import { getPageHelp } from '../data/pageHelpRegistry.ts';

interface NavigationProps {
  onOpenHelp?: () => void;
}

export function Navigation({ onOpenHelp }: NavigationProps) {
  const {
    currentScreen,
    navigateTo,
    user,
    logout,
    isSidebarCollapsed,
    toggleSidebar,
    isMobileNavOpen,
    setIsMobileNavOpen,
    setShowKeyboardShortcutsModal,
    speakText,
    announce
  } = useAccessibility();

  const [showHelpDialog, setShowHelpDialog] = useState(false);

  const isAdmin = user?.role === 'admin';

  // Practice & Examination section
  const practiceExamItems: { id: ScreenId; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: 'Overview', icon: <Home className="w-4 h-4 shrink-0" /> },
    { id: 'topics', label: 'Explore Subjects', icon: <Compass className="w-4 h-4 shrink-0" /> },
    { id: 'voice_practice', label: 'Voice Practice', icon: <Mic className="w-4 h-4 shrink-0" /> },
    { id: 'pilot_demo', label: 'Pilot Demo Diagnostic', icon: <ClipboardCheck className="w-4 h-4 shrink-0" /> },
    { id: 'mock_exam', label: 'Mock Examination', icon: <Clock className="w-4 h-4 shrink-0" /> },
    { id: 'results', label: 'Results', icon: <Award className="w-4 h-4 shrink-0" /> }
  ];

  // Learning & Mastery section
  const learningMasteryItems: { id: ScreenId; label: string; icon: React.ReactNode }[] = [
    { id: 'ai_tutor', label: 'AI Tutor', icon: <Brain className="w-4 h-4 shrink-0" /> },
    { id: 'revision_planner', label: 'Revision Planner', icon: <Calendar className="w-4 h-4 shrink-0" /> },
    { id: 'learning_history', label: 'Transcript Workspace', icon: <History className="w-4 h-4 shrink-0" /> },
    { id: 'progress', label: 'Progress Analytics', icon: <BarChart2 className="w-4 h-4 shrink-0" /> }
  ];

  // Admin items
  const adminNavItems: { id: ScreenId; label: string; icon: React.ReactNode }[] = [
    { id: 'model_evaluation', label: 'ML Evaluation', icon: <Cpu className="w-4 h-4 shrink-0" /> },
    { id: 'model_training', label: 'Dataset & Training', icon: <Database className="w-4 h-4 shrink-0" /> }
  ];

  const handleNavClick = (screenId: ScreenId) => {
    navigateTo(screenId);
    if (isMobileNavOpen) {
      setIsMobileNavOpen(false);
    }
  };

  const handleHelpClick = () => {
    if (onOpenHelp) {
      onOpenHelp();
    } else {
      window.dispatchEvent(new CustomEvent('accessprep:show-inline-keyboard-help'));
      const bannerEl = document.getElementById('page-help-banner-heading');
      if (bannerEl) {
        bannerEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      const rec = getPageHelp(currentScreen);
      const textToSpeak = `${rec.spokenKeyboardHelp} Press R to replay, press V for voice commands, or press S to continue.`;
      announce(textToSpeak, 'polite');
      speakText(textToSpeak);
    }
    if (isMobileNavOpen) {
      setIsMobileNavOpen(false);
    }
  };

  const renderNavList = (isMobile: boolean = false) => {
    const collapsed = !isMobile && isSidebarCollapsed;

    return (
      <div className="flex flex-col h-full justify-between">
        {/* Main Links */}
        <div className="space-y-4">
          {/* Group 1: Practice & Examination */}
          <div>
            {!collapsed && (
              <p className="px-3 mb-1.5 text-[10px] font-bold uppercase tracking-wider text-[#38BDF8]">
                Practice &amp; Examination
              </p>
            )}
            <ul className="space-y-1" role="list">
              {practiceExamItems.map((item) => {
                const isActive = currentScreen === item.id;
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => handleNavClick(item.id)}
                      aria-current={isActive ? 'page' : undefined}
                      aria-label={item.label}
                      title={collapsed ? item.label : undefined}
                      className={`w-full flex items-center transition-colors group relative rounded-lg text-left ${
                        collapsed
                          ? 'justify-center p-2.5'
                          : 'gap-3 px-3 py-2 text-xs font-semibold'
                      } ${
                        isActive
                          ? 'bg-[#2455E8] text-white font-bold shadow-xs ring-1 ring-[#38BDF8]/40'
                          : 'text-[#E0E7FF] hover:text-white hover:bg-white/10'
                      }`}
                    >
                      {isActive && (
                        <span
                          className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-[#38BDF8] rounded-r"
                          aria-hidden="true"
                        />
                      )}
                      <span className={isActive ? 'text-[#38BDF8]' : 'text-[#93C5FD] group-hover:text-white'}>
                        {item.icon}
                      </span>
                      {!collapsed && <span className="truncate">{item.label}</span>}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Group 2: Learning & Mastery */}
          <div>
            {!collapsed && (
              <p className="px-3 mb-1.5 text-[10px] font-bold uppercase tracking-wider text-[#38BDF8]">
                Learning &amp; Mastery
              </p>
            )}
            <ul className="space-y-1" role="list">
              {learningMasteryItems.map((item) => {
                const isActive = currentScreen === item.id;
                const isTranscript = item.id === 'learning_history';
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => handleNavClick(item.id)}
                      aria-current={isActive ? 'page' : undefined}
                      aria-label={
                        isTranscript
                          ? "Transcript Workspace. Say 'Open Transcript Workspace' or 'Transcript Workspace' to navigate by voice."
                          : item.label
                      }
                      title={
                        isTranscript
                          ? 'Voice command: Say "Open Transcript Workspace"'
                          : collapsed
                          ? item.label
                          : undefined
                      }
                      className={`w-full flex items-center transition-colors group relative rounded-lg text-left ${
                        collapsed
                          ? 'justify-center p-2.5'
                          : 'gap-3 px-3 py-2 text-xs font-semibold'
                      } ${
                        isActive
                          ? 'bg-[#2455E8] text-white font-bold shadow-xs ring-1 ring-[#38BDF8]/40'
                          : 'text-[#E0E7FF] hover:text-white hover:bg-white/10'
                      }`}
                    >
                      {isActive && (
                        <span
                          className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-[#38BDF8] rounded-r"
                          aria-hidden="true"
                        />
                      )}
                      <span className={isActive ? 'text-[#38BDF8]' : 'text-[#93C5FD] group-hover:text-white'}>
                        {item.icon}
                      </span>
                      {!collapsed && <span className="truncate">{item.label}</span>}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Admin Navigation */}
          {isAdmin && (
            <div>
              {!collapsed && (
                <p className="px-3 mb-1.5 text-[10px] font-bold uppercase tracking-wider text-[#7045E8] bg-white/10 py-0.5 rounded">
                  Academic Review
                </p>
              )}
              <ul className="space-y-1" role="list">
                {adminNavItems.map((item) => {
                  const isActive = currentScreen === item.id;
                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        onClick={() => handleNavClick(item.id)}
                        aria-current={isActive ? 'page' : undefined}
                        aria-label={item.label}
                        title={collapsed ? item.label : undefined}
                        className={`w-full flex items-center transition-colors group relative rounded-lg text-left ${
                          collapsed
                            ? 'justify-center p-2.5'
                            : 'gap-3 px-3 py-2 text-xs font-semibold'
                        } ${
                          isActive
                            ? 'bg-[#2455E8] text-white font-bold shadow-xs ring-1 ring-[#38BDF8]/40'
                            : 'text-[#E0E7FF] hover:text-white hover:bg-white/10'
                        }`}
                      >
                        {isActive && (
                          <span
                            className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-[#38BDF8] rounded-r"
                            aria-hidden="true"
                          />
                        )}
                        <span className={isActive ? 'text-[#38BDF8]' : 'text-[#93C5FD] group-hover:text-white'}>
                          {item.icon}
                        </span>
                        {!collapsed && <span className="truncate">{item.label}</span>}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>

        {/* Bottom Navigation: Settings & Support, Profile, Logout */}
        <div className="pt-3 border-t border-white/10 space-y-1">
          {!collapsed && (
            <p className="px-3 mb-1.5 text-[10px] font-bold uppercase tracking-wider text-[#38BDF8]">
              Settings &amp; Support
            </p>
          )}

          {/* Accessibility Settings */}
          <button
            type="button"
            onClick={() => handleNavClick('accessibility_settings')}
            aria-current={currentScreen === 'accessibility_settings' ? 'page' : undefined}
            aria-label="Accessibility Settings. Say 'Open Accessibility Settings' or 'Accessibility Settings' to navigate by voice."
            title={collapsed ? 'Accessibility Settings (Voice: "Accessibility Settings")' : 'Voice command: Say "Accessibility Settings"'}
            className={`w-full flex items-center transition-colors group relative rounded-lg text-left ${
              collapsed ? 'justify-center p-2.5' : 'gap-3 px-3 py-2 text-xs font-semibold'
            } ${
              currentScreen === 'accessibility_settings'
                ? 'bg-[#2455E8] text-white font-bold shadow-xs ring-1 ring-[#38BDF8]/40'
                : 'text-[#E0E7FF] hover:text-white hover:bg-white/10'
            }`}
          >
            {currentScreen === 'accessibility_settings' && (
              <span className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-[#38BDF8] rounded-r" aria-hidden="true" />
            )}
            <Sliders className={`w-4 h-4 shrink-0 ${currentScreen === 'accessibility_settings' ? 'text-[#38BDF8]' : 'text-[#93C5FD] group-hover:text-white'}`} />
            {!collapsed && (
              <div className="flex flex-col min-w-0">
                <span className="truncate font-semibold">Accessibility Settings</span>
                <span className="text-[10px] text-[#BAE6FD] font-mono tracking-tight opacity-90 truncate">Say: &ldquo;Accessibility Settings&rdquo;</span>
              </div>
            )}
          </button>

          {/* Screen Reader Settings (Dedicated Screen) */}
          <button
            type="button"
            onClick={() => handleNavClick('screen_reader_settings')}
            aria-current={currentScreen === 'screen_reader_settings' ? 'page' : undefined}
            aria-label="Screen Reader Settings. Say 'Open Screen Reader Settings' or 'Screen Reader Settings' to navigate by voice."
            title={collapsed ? 'Screen Reader Settings (Voice: "Screen Reader Settings")' : 'Voice command: Say "Screen Reader Settings"'}
            className={`w-full flex items-center transition-colors group relative rounded-lg text-left ${
              collapsed ? 'justify-center p-2.5' : 'gap-3 px-3 py-2 text-xs font-semibold'
            } ${
              currentScreen === 'screen_reader_settings'
                ? 'bg-[#2455E8] text-white font-bold shadow-xs ring-1 ring-[#38BDF8]/40'
                : 'text-[#E0E7FF] hover:text-white hover:bg-white/10'
            }`}
          >
            {currentScreen === 'screen_reader_settings' && (
              <span className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-[#38BDF8] rounded-r" aria-hidden="true" />
            )}
            <Headphones className={`w-4 h-4 shrink-0 ${currentScreen === 'screen_reader_settings' ? 'text-[#38BDF8]' : 'text-[#93C5FD] group-hover:text-white'}`} />
            {!collapsed && (
              <div className="flex flex-col min-w-0">
                <span className="truncate font-semibold">Screen Reader Settings</span>
                <span className="text-[10px] text-[#BAE6FD] font-mono tracking-tight opacity-90 truncate">Say: &ldquo;Screen Reader Settings&rdquo;</span>
              </div>
            )}
          </button>

          {/* Help & Support */}
          <button
            type="button"
            onClick={handleHelpClick}
            title={collapsed ? 'Help & Shortcuts' : undefined}
            className={`w-full flex items-center transition-colors group relative rounded-lg text-left ${
              collapsed ? 'justify-center p-2.5' : 'gap-3 px-3 py-2 text-xs font-semibold'
            } text-[#E0E7FF] hover:text-white hover:bg-white/10`}
          >
            <HelpCircle className="w-4 h-4 shrink-0 text-[#93C5FD] group-hover:text-white" />
            {!collapsed && <span className="truncate">Help &amp; Support</span>}
          </button>

          {/* User Profile info */}
          {user && (
            <div className={`mt-2 pt-2 border-t border-white/10 flex items-center ${collapsed ? 'flex-col gap-2' : 'justify-between gap-2'} px-1 bg-white/5 rounded-lg p-1.5`}>
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-7 h-7 rounded-full bg-[#38BDF8] flex items-center justify-center font-bold text-xs text-[#173FAE] shrink-0">
                  {user.name.charAt(0)}
                </div>
                {!collapsed && (
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-white truncate">{user.name}</p>
                    <p className="text-[10px] text-[#BAE6FD] truncate">{user.rollNumber}</p>
                  </div>
                )}
              </div>

              {/* Logout button */}
              <button
                type="button"
                onClick={logout}
                aria-label="Log Out of candidate session"
                title="Log Out (Sign out)"
                className="p-1.5 rounded-md text-[#BAE6FD] hover:text-white hover:bg-red-600 transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      {/* 1. Desktop Sidebar (Deep blue background: #173FAE to #1E48C4) */}
      <aside
        id="navigation-sidebar"
        aria-label="Application Sidebar Navigation"
        className={`hidden lg:flex flex-col shrink-0 bg-gradient-to-b from-[#173FAE] via-[#1E48C4] to-[#173FAE] text-white border-r border-[#2455E8]/40 shadow-md transition-all duration-200 select-none ${
          isSidebarCollapsed ? 'w-16' : 'w-64'
        }`}
      >
        {/* Sidebar Header / Brand / Collapse Toggle */}
        <div className="h-14 px-3 flex items-center justify-between border-b border-white/10 bg-[#122E82]/50">
          {!isSidebarCollapsed ? (
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-[#38BDF8] flex items-center justify-center font-black text-xs text-[#173FAE] shrink-0 shadow-xs">
                APX
              </div>
              <div className="min-w-0">
                <span className="font-extrabold text-xs tracking-tight text-white block truncate">
                  ACCESSPREP-X
                </span>
                <span className="text-[10px] text-[#BAE6FD] block truncate">
                  Accessible SSC MTS
                </span>
              </div>
            </div>
          ) : (
            <div className="w-full flex justify-center">
              <div className="w-7 h-7 rounded-lg bg-[#38BDF8] flex items-center justify-center font-black text-xs text-[#173FAE] shadow-xs">
                A
              </div>
            </div>
          )}

          {/* Collapse/Expand toggle button */}
          <button
            type="button"
            onClick={toggleSidebar}
            aria-label={isSidebarCollapsed ? 'Expand sidebar navigation' : 'Collapse sidebar navigation'}
            aria-expanded={!isSidebarCollapsed}
            title={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="p-1 rounded-md text-[#BAE6FD] hover:text-white hover:bg-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-[#38BDF8]"
          >
            {isSidebarCollapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <ChevronLeft className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Scrollable Navigation Menu */}
        <nav className="flex-1 overflow-y-auto p-2.5" aria-label="Main Navigation">
          {renderNavList(false)}
        </nav>
      </aside>

      {/* 2. Mobile Responsive Drawer (< lg screens) */}
      {isMobileNavOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Mobile Navigation Menu"
          className="lg:hidden fixed inset-0 z-50 flex"
        >
          {/* Backdrop overlay */}
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
            onClick={() => setIsMobileNavOpen(false)}
            aria-hidden="true"
          />

          {/* Drawer content */}
          <div className="relative w-64 max-w-[85vw] bg-gradient-to-b from-[#173FAE] via-[#1E48C4] to-[#173FAE] text-white h-full flex flex-col z-10 shadow-2xl border-r border-[#2455E8]/40">
            {/* Header */}
            <div className="h-14 px-4 flex items-center justify-between border-b border-white/10 bg-[#122E82]/50">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-[#38BDF8] flex items-center justify-center font-black text-xs text-[#173FAE]">
                  APX
                </div>
                <div>
                  <span className="font-extrabold text-xs text-white block">
                    ACCESSPREP-X
                  </span>
                  <span className="text-[10px] text-[#BAE6FD] block">
                    SSC MTS Portal
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsMobileNavOpen(false)}
                aria-label="Close navigation drawer"
                className="p-1.5 rounded-md text-[#BAE6FD] hover:text-white hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Nav list */}
            <nav className="flex-1 overflow-y-auto p-3" aria-label="Mobile Navigation">
              {renderNavList(true)}
            </nav>
          </div>
        </div>
      )}

      {/* Fallback Help Dialog */}
      {showHelpDialog && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="help-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50"
        >
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h2 id="help-title" className="text-lg font-bold text-slate-900 mb-2">
              Voice Navigation &amp; Help
            </h2>
            <p className="text-xs text-slate-600 mb-4">
              Say &ldquo;Hey Vision&rdquo; followed by a screen name or command.
            </p>
            <div className="space-y-2 text-xs text-slate-700">
              <p>• <strong>Hey Vision, Open Subjects:</strong> Explore all 4 SSC MTS sections.</p>
              <p>• <strong>Hey Vision, Open Practice:</strong> Hands-free voice question solving.</p>
              <p>• <strong>Hey Vision, Open Mock Exam:</strong> Full timed exam simulation.</p>
              <p>• <strong>Hey Vision, Screen Reader Settings:</strong> Adjust speech rate and voice.</p>
              <p>• <strong>Alt + Space:</strong> Toggle Vision Assistant on or off.</p>
            </div>
            <button
              type="button"
              onClick={() => setShowHelpDialog(false)}
              className="mt-6 w-full py-2 bg-[#1749E8] text-white rounded-lg text-xs font-bold"
            >
              Close Help
            </button>
          </div>
        </div>
      )}
    </>
  );
}
