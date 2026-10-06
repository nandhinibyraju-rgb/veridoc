import React, { useState } from 'react';
import Navbar from './Navbar';
import LeftSidebar from './LeftSidebar';
import RightSidebar from './RightSidebar';
import Footer from './Footer';
import HistoryDrawer from './HistoryDrawer';
import { useAuth } from '../context/AuthContext';

export default function AppLayout({ children, hideRightSidebar = false, workspaceMode = false }) {
  const { studentMode, toggleStudentMode } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isHistoryDrawerOpen, setIsHistoryDrawerOpen] = useState(false);

  return (
    <div className={`min-h-screen flex flex-col antialiased transition-colors duration-400 ${
      studentMode ? 'bg-[#FAF5FF]' : 'bg-[#F8FAFC]'
    }`}>
      {/* Sticky Top Navbar */}
      <Navbar
        onToggleMobileMenu={() => setIsMobileMenuOpen((prev) => !prev)}
        onToggleHistoryDrawer={() => setIsHistoryDrawerOpen(true)}
        studentMode={studentMode}
        onToggleStudentMode={toggleStudentMode}
      />

      {/* Slide-in History Drawer */}
      <HistoryDrawer
        isOpen={isHistoryDrawerOpen}
        onClose={() => setIsHistoryDrawerOpen(false)}
        onNewQuestion={() => {
          window.dispatchEvent(new CustomEvent('veridoc-new-question'));
        }}
      />

      {/* Main Container */}
      {workspaceMode ? (
        <main className="flex-1 w-full max-w-[1600px] mx-auto px-2 sm:px-4 lg:px-6 py-4 flex flex-col">
          {children}
        </main>
      ) : (
        <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 flex">
          {/* Left Sidebar (Desktop + Mobile Drawer) */}
          <LeftSidebar
            isOpen={isMobileMenuOpen}
            onClose={() => setIsMobileMenuOpen(false)}
          />

          {/* Center Content Column */}
          <main className="flex-1 min-w-0 px-0 sm:px-4 lg:px-6 py-6">
            {children}
          </main>

          {/* Right Sidebar (Trending & Alerts) */}
          {!hideRightSidebar && (
            <div className="py-6">
              <RightSidebar />
            </div>
          )}
        </div>
      )}

      {/* Teal Gradient Footer */}
      <Footer />
    </div>
  );
}
