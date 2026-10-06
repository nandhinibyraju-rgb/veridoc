import React, { useState } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import Navbar from './Navbar';
import LeftSidebar from './LeftSidebar';
import RightSidebar from './RightSidebar';
import Footer from './Footer';
import HistoryDrawer from './HistoryDrawer';
import ThreeDBackground from './ThreeDBackground';
import { useAuth } from '../context/AuthContext';

export default function AppLayout({ children, hideRightSidebar = false, workspaceMode = false }) {
  const { studentMode, toggleStudentMode } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isHistoryDrawerOpen, setIsHistoryDrawerOpen] = useState(false);

  const { scrollYProgress } = useScroll();

  const doctorBg = useTransform(
    scrollYProgress,
    [0, 0.5, 1],
    ['#F8FAFC', '#F0FDFA', '#F8FAFC']
  );

  const studentBg = useTransform(
    scrollYProgress,
    [0, 0.5, 1],
    ['#FAF5FF', '#FFFBEB', '#FAF5FF']
  );

  return (
    <motion.div
      style={{ backgroundColor: studentMode ? studentBg : doctorBg }}
      className="min-h-screen flex flex-col antialiased relative"
    >
      {/* 3D WebGL Background Layer */}
      <ThreeDBackground className="opacity-25 pointer-events-none fixed inset-0 z-0" />

      {/* Foreground Content */}
      <div className="relative z-10 flex flex-col min-h-screen">
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
    </motion.div>
  );
}
