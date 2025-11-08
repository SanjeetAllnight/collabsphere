'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

export default function LoadingScreen() {
  const [show, setShow] = useState(false);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    setMounted(true);
    
    // Check if user has seen the landing screen this session
    const hasSeenLanding = typeof window !== 'undefined' 
      ? sessionStorage.getItem('seenLanding') === 'true'
      : false;

    // Only show on initial load (root path or dashboard)
    const isInitialLoad = pathname === '/' || pathname === '/dashboard';

    if (!hasSeenLanding && isInitialLoad) {
      setShow(true);
      
      // Mark as seen immediately
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('seenLanding', 'true');
      }

      // Auto-route after 2.5 seconds
      const timer = setTimeout(() => {
        setShow(false);
        // Small delay before routing to allow fade-out animation
        setTimeout(() => {
          if (pathname === '/') {
            router.push('/dashboard');
          }
        }, 500);
      }, 2500);

      return () => clearTimeout(timer);
    }
  }, [router, pathname]);

  if (!mounted || !show) {
    return null;
  }

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, #6A00F4 0%, #A955F7 100%)',
          }}
        >
          {/* Animated Background Particles */}
          <div className="absolute inset-0 overflow-hidden">
            {/* Floating Circles */}
            {[...Array(8)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute rounded-full bg-white/10 backdrop-blur-sm"
                style={{
                  width: `${20 + Math.random() * 40}px`,
                  height: `${20 + Math.random() * 40}px`,
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                }}
                animate={{
                  y: [0, -30, 0],
                  x: [0, 20, 0],
                  scale: [1, 1.2, 1],
                  opacity: [0.1, 0.3, 0.1],
                }}
                transition={{
                  duration: 3 + Math.random() * 2,
                  repeat: Infinity,
                  delay: Math.random() * 2,
                  ease: 'easeInOut',
                }}
              />
            ))}

            {/* Glowing Blobs */}
            {[...Array(3)].map((_, i) => (
              <motion.div
                key={`blob-${i}`}
                className="absolute rounded-full blur-3xl"
                style={{
                  width: `${150 + Math.random() * 100}px`,
                  height: `${150 + Math.random() * 100}px`,
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  background: `rgba(255, 255, 255, ${0.1 + Math.random() * 0.1})`,
                }}
                animate={{
                  x: [0, 50, -50, 0],
                  y: [0, 50, -50, 0],
                  scale: [1, 1.3, 0.8, 1],
                }}
                transition={{
                  duration: 8 + Math.random() * 4,
                  repeat: Infinity,
                  delay: Math.random() * 2,
                  ease: 'easeInOut',
                }}
              />
            ))}
          </div>

          {/* Main Content */}
          <div className="relative z-10 text-center px-4">
            <motion.h1
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{
                duration: 0.8,
                ease: [0.34, 1.56, 0.64, 1], // Bounce ease
              }}
              className="text-6xl md:text-8xl font-bold text-white mb-4 tracking-tight"
              style={{
                fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
                fontWeight: 700,
                textShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
              }}
            >
              CollabSphere
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 0.7, y: 0 }}
              transition={{
                duration: 0.8,
                delay: 0.3,
                ease: 'easeOut',
              }}
              className="text-lg md:text-xl text-white/70 font-medium tracking-wide"
              style={{
                fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
              }}
            >
              Connect • Collaborate • Create
            </motion.p>

            {/* Subtle Loading Indicator */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="mt-8 flex justify-center gap-2"
            >
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="w-2 h-2 rounded-full bg-white/50"
                  animate={{
                    scale: [1, 1.5, 1],
                    opacity: [0.5, 1, 0.5],
                  }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    delay: i * 0.2,
                    ease: 'easeInOut',
                  }}
                />
              ))}
            </motion.div>
          </div>

          {/* Animated Wave Effect (Optional) */}
          <div className="absolute bottom-0 left-0 right-0 h-32 overflow-hidden">
            <motion.svg
              className="absolute bottom-0 w-full"
              viewBox="0 0 1440 320"
              preserveAspectRatio="none"
              style={{ height: '100%' }}
            >
              <motion.path
                d="M0,96L48,112C96,128,192,160,288,160C384,160,480,128,576,122.7C672,117,768,139,864,154.7C960,171,1056,181,1152,165.3C1248,149,1344,107,1392,85.3L1440,64L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"
                fill="rgba(255, 255, 255, 0.1)"
                animate={{
                  d: [
                    'M0,96L48,112C96,128,192,160,288,160C384,160,480,128,576,122.7C672,117,768,139,864,154.7C960,171,1056,181,1152,165.3C1248,149,1344,107,1392,85.3L1440,64L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z',
                    'M0,128L48,138.7C96,149,192,171,288,181.3C384,192,480,192,576,181.3C672,171,768,149,864,138.7C960,128,1056,128,1152,133.3C1248,139,1344,149,1392,154.7L1440,160L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z',
                    'M0,96L48,112C96,128,192,160,288,160C384,160,480,128,576,122.7C672,117,768,139,864,154.7C960,171,1056,181,1152,165.3C1248,149,1344,107,1392,85.3L1440,64L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z',
                  ],
                }}
                transition={{
                  duration: 8,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              />
            </motion.svg>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

