import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ThreeDBackground from './ThreeDBackground';

export default function OpeningSplash({ onComplete }) {
  const [visible, setVisible] = useState(() => {
    // Check if splash has already run in this browser session
    return !sessionStorage.getItem('veridoc_splash_shown');
  });

  useEffect(() => {
    if (!visible) {
      if (onComplete) onComplete();
      return;
    }

    // Auto-dismiss after 1.8 seconds
    const timer = setTimeout(() => {
      handleClose();
    }, 1800);

    return () => clearTimeout(timer);
  }, [visible]);

  const handleClose = () => {
    sessionStorage.setItem('veridoc_splash_shown', 'true');
    setVisible(false);
    if (onComplete) onComplete();
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="opening-splash"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          transition={{ duration: 0.45, ease: 'easeInOut' }}
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-gradient-to-br from-[#0A2540] via-[#091E33] to-[#0F766E] overflow-hidden select-none"
        >
          {/* 3D Interactive WebGL Starfield / Particle Helix Canvas */}
          <ThreeDBackground isSplash={true} className="opacity-90" />

          {/* Top-right Skip Button */}
          <div className="absolute top-6 right-6 z-20">
            <button
              type="button"
              onClick={handleClose}
              className="px-3 py-1.5 rounded-full text-xs font-semibold text-white/70 hover:text-white bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 transition-all cursor-pointer shadow-xs active:scale-95"
            >
              Skip
            </button>
          </div>

          {/* Centered Medical Logo Mark with Draw-On Stroke Animation */}
          <div className="relative z-10 flex flex-col items-center text-center px-4">
            {/* 3D Glowing Ambient Halo */}
            <div className="relative mb-6">
              <div className="absolute -inset-4 bg-gradient-to-r from-cyan-500/30 to-teal-400/30 rounded-3xl blur-xl animate-pulse" />

              <motion.div
                initial={{ scale: 0.85, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
                className="relative w-24 h-24 rounded-3xl bg-slate-900/80 border border-cyan-400/40 backdrop-blur-xl shadow-2xl shadow-cyan-500/20 flex items-center justify-center p-3"
              >
                {/* SVG with Draw-on Stroke Animation */}
                <svg
                  viewBox="0 0 100 100"
                  className="w-full h-full text-cyan-300 drop-shadow-[0_0_12px_rgba(34,211,238,0.8)]"
                  fill="none"
                >
                  {/* Medical Cross Background Silhouette */}
                  <path
                    d="M 38 20 L 62 20 L 62 38 L 80 38 L 80 62 L 62 62 L 62 80 L 38 80 L 38 62 L 20 62 L 20 38 L 38 38 Z"
                    stroke="rgba(34, 211, 238, 0.25)"
                    strokeWidth="2"
                    strokeLinejoin="round"
                  />

                  {/* Dynamic Heartbeat Pulse Line with Stroke-Dashoffset Draw Animation */}
                  <motion.path
                    d="M 16 50 L 35 50 L 42 28 L 50 72 L 58 38 L 65 50 L 84 50"
                    stroke="#22D3EE"
                    strokeWidth="4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: 1 }}
                    transition={{
                      pathLength: { duration: 1.1, ease: 'easeInOut' },
                      opacity: { duration: 0.2 },
                    }}
                  />
                </svg>
              </motion.div>
            </div>

            {/* Brand Title with Tracking Letter-Spacing Expansion */}
            <motion.h1
              initial={{ opacity: 0, y: 12, letterSpacing: '-0.05em' }}
              animate={{ opacity: 1, y: 0, letterSpacing: '0.04em' }}
              transition={{ duration: 0.65, delay: 0.35, ease: 'easeOut' }}
              className="text-4xl sm:text-5xl font-extrabold text-white tracking-wider"
            >
              Veridoc
            </motion.h1>

            {/* Tagline Fade-In */}
            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.65, ease: 'easeOut' }}
              className="mt-2 text-sm sm:text-base font-medium text-cyan-200/90 tracking-wide"
            >
              Clinical Evidence Assistant
            </motion.p>

            {/* Verification Subtitle */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.95 }}
              className="mt-4 px-3 py-1 rounded-full bg-cyan-950/60 border border-cyan-400/30 text-[11px] font-semibold text-cyan-300"
            >
              The latest clinical evidence, graded and verified, in seconds.
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
