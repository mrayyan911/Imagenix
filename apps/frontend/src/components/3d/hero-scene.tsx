'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ─── Photo scene (dog in a park) ────────────────────────────────────────────
function ScenePhoto({ filter }: { filter?: string }) {
  return (
    <div className="relative w-full h-full overflow-hidden" style={{ filter }}>
      {/* Sky */}
      <div className="absolute inset-0 bg-gradient-to-b from-sky-400 to-sky-200" />
      {/* Sun */}
      <div className="absolute top-4 right-5 w-8 h-8 rounded-full bg-yellow-300 shadow-lg shadow-yellow-300/60" />
      {/* Clouds */}
      <div className="absolute top-5 left-5 flex items-end">
        <div className="w-12 h-6 bg-white rounded-full opacity-90" />
        <div className="w-9 h-6 bg-white rounded-full -ml-3 opacity-90 -mt-1" />
      </div>
      <div className="absolute top-8 right-14 flex items-end">
        <div className="w-9 h-5 bg-white rounded-full opacity-80" />
        <div className="w-7 h-5 bg-white rounded-full -ml-2 opacity-80 -mt-1" />
      </div>
      {/* Grass */}
      <div className="absolute bottom-0 left-0 right-0 h-[38%] bg-gradient-to-t from-emerald-700 to-emerald-500" />
      {/* Dog body */}
      <div className="absolute bottom-[29%] left-[36%] w-[30%] h-[24%] bg-amber-700 rounded-full" />
      {/* Dog head */}
      <div className="absolute bottom-[46%] left-[50%] w-[18%] h-[22%] bg-amber-700 rounded-full" />
      {/* Ears */}
      <div className="absolute bottom-[60%] left-[47%] w-[6%] h-[13%] bg-amber-800 rounded-full -rotate-12" />
      <div className="absolute bottom-[60%] left-[62%] w-[6%] h-[13%] bg-amber-800 rounded-full rotate-12" />
      {/* Eyes */}
      <div className="absolute bottom-[55%] left-[52%] w-[4%] h-[5%] bg-stone-900 rounded-full" />
      <div className="absolute bottom-[55%] left-[62%] w-[4%] h-[5%] bg-stone-900 rounded-full" />
      {/* Nose */}
      <div className="absolute bottom-[50%] left-[57%] w-[4%] h-[3%] bg-stone-900 rounded-full" />
      {/* Legs */}
      <div className="absolute bottom-[11%] left-[38%] w-[5%] h-[20%] bg-amber-700 rounded-full" />
      <div className="absolute bottom-[11%] left-[45%] w-[5%] h-[20%] bg-amber-700 rounded-full" />
      <div className="absolute bottom-[11%] left-[54%] w-[5%] h-[20%] bg-amber-700 rounded-full" />
      <div className="absolute bottom-[11%] left-[61%] w-[5%] h-[20%] bg-amber-700 rounded-full" />
      {/* Tail */}
      <div className="absolute bottom-[38%] left-[32%] w-[4%] h-[16%] bg-amber-700 rounded-full rotate-[40deg] origin-bottom" />
    </div>
  );
}

// ─── Augmentation cards that fan out on hover ────────────────────────────────
const AUG_CARDS = [
  {
    filter: 'hue-rotate(125deg) saturate(1.6)',
    label: 'Hue Shift',
    badgeClass: 'bg-violet-500',
    x: -148,
    y: 12,
    rotate: -11,
    scale: 0.87,
    delay: 0.05,
  },
  {
    filter: 'brightness(1.5) contrast(1.1)',
    label: 'Brightness +',
    badgeClass: 'bg-amber-500',
    x: 148,
    y: 12,
    rotate: 11,
    scale: 0.87,
    delay: 0.1,
  },
  {
    filter: 'grayscale(1) contrast(1.15)',
    label: 'Grayscale',
    badgeClass: 'bg-neutral-500',
    x: 0,
    y: 116,
    rotate: -2,
    scale: 0.82,
    delay: 0.15,
  },
];

// Dimensions
const MAIN_W = 260;
const MAIN_H = 195;
const AUG_W = 192;
const AUG_H = 144;
const AUG_LEFT = (MAIN_W - AUG_W) / 2; // center within main card footprint
const AUG_TOP = (MAIN_H - AUG_H) / 2;

// ─── Main export ─────────────────────────────────────────────────────────────
export function HeroScene() {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className="relative w-full h-full flex items-center justify-center"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Soft ambient glow behind everything */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <motion.div
          className="w-72 h-72 rounded-full bg-primary-500/20 blur-3xl"
          animate={{ scale: hovered ? 1.2 : 1, opacity: hovered ? 0.5 : 0.25 }}
          transition={{ duration: 0.5 }}
        />
      </div>

      {/* Coordinate origin: centered on main card */}
      <div className="relative" style={{ width: MAIN_W, height: MAIN_H }}>

        {/* ── Augmented fan cards (z behind main) ─────────────────────────── */}
        {AUG_CARDS.map((aug) => (
          <motion.div
            key={aug.label}
            className="absolute rounded-xl overflow-hidden border border-white/20 shadow-2xl"
            style={{ width: AUG_W, height: AUG_H, left: AUG_LEFT, top: AUG_TOP, zIndex: 10 }}
            initial={false}
            animate={
              hovered
                ? { x: aug.x, y: aug.y, rotate: aug.rotate, scale: aug.scale, opacity: 1 }
                : { x: 0, y: 0, rotate: 0, scale: 0.65, opacity: 0 }
            }
            transition={{ type: 'spring', stiffness: 220, damping: 24, delay: aug.delay }}
          >
            <ScenePhoto filter={aug.filter} />
            {/* Augmentation badge */}
            <div
              className={`absolute bottom-2 left-2 px-2 py-0.5 rounded-full text-white text-[10px] font-semibold shadow ${aug.badgeClass}`}
            >
              {aug.label}
            </div>
            {/* Thin bounding box on each variant */}
            <div className="absolute border border-lime-400/70 rounded pointer-events-none" style={{ left: '29%', top: '26%', right: '28%', bottom: '9%' }} />
          </motion.div>
        ))}

        {/* ── Main image card (z on top) ────────────────────────────────── */}
        <motion.div
          className="absolute inset-0 rounded-2xl overflow-hidden shadow-2xl border-2 cursor-pointer"
          style={{ zIndex: 20 }}
          animate={{
            borderColor: hovered ? 'rgba(163,230,53,0.8)' : 'rgba(255,255,255,0.15)',
            boxShadow: hovered
              ? '0 0 0 1px rgba(163,230,53,0.25), 0 30px 60px -12px rgba(0,0,0,0.85)'
              : '0 25px 50px -12px rgba(0,0,0,0.8)',
          }}
          transition={{ duration: 0.2 }}
        >
          <ScenePhoto />

          {/* ── Annotation overlay ──────────────────────────────────────── */}
          <AnimatePresence>
            {hovered && (
              <motion.div
                className="absolute inset-0 pointer-events-none"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
              >
                {/* Bounding box */}
                <motion.div
                  className="absolute border-2 border-lime-400 rounded"
                  style={{ left: '29%', top: '25%', right: '28%', bottom: '8%' }}
                  initial={{ scale: 0.78, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 280, damping: 22, delay: 0.06 }}
                >
                  {/* Label chip */}
                  <motion.div
                    className="absolute -top-6 left-0 flex items-center gap-1 bg-lime-400 text-neutral-900 text-[11px] font-bold px-2 py-0.5 rounded whitespace-nowrap"
                    initial={{ y: 4, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.14 }}
                  >
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-neutral-900/50" />
                    dog · 0.96
                  </motion.div>
                  {/* Corner handles */}
                  <div className="absolute -top-1 -left-1 w-2.5 h-2.5 bg-lime-400 rounded-sm" />
                  <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-lime-400 rounded-sm" />
                  <div className="absolute -bottom-1 -left-1 w-2.5 h-2.5 bg-lime-400 rounded-sm" />
                  <div className="absolute -bottom-1 -right-1 w-2.5 h-2.5 bg-lime-400 rounded-sm" />
                </motion.div>

                {/* Scan line */}
                <motion.div
                  className="absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-lime-400/70 to-transparent"
                  initial={{ top: '0%' }}
                  animate={{ top: '100%' }}
                  transition={{ duration: 1.4, repeat: Infinity, ease: 'linear', delay: 0.1 }}
                />

                {/* "Original" label */}
                <div className="absolute top-2 right-2 bg-lime-400 text-neutral-900 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  Original
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      {/* Hover hint */}
      <AnimatePresence>
        {!hovered && (
          <motion.p
            className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-1.5 text-xs text-neutral-400 pointer-events-none whitespace-nowrap"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ delay: 1.2, duration: 0.4 }}
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-lime-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-lime-500" />
            </span>
            Hover to see augmentation
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}
