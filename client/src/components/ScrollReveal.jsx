import React from 'react';
import { motion } from 'framer-motion';

export function ScrollReveal({ children, delay = 0, y = 20, className = '' }) {
  return (
    <motion.div
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.45, delay, ease: 'easeOut' }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function SplitTextReveal({ text, className = '' }) {
  const words = text.split(' ');
  return (
    <motion.span
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.2 }}
      variants={{
        visible: {
          transition: {
            staggerChildren: 0.05,
          },
        },
      }}
      className={`inline-block ${className}`}
    >
      {words.map((word, i) => (
        <motion.span
          key={i}
          variants={{
            hidden: { opacity: 0, y: 12 },
            visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } },
          }}
          className="inline-block mr-1.5"
        >
          {word}
        </motion.span>
      ))}
    </motion.span>
  );
}

export default ScrollReveal;
