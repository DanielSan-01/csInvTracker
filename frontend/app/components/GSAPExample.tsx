'use client';

import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';

export default function GSAPExample() {
  const boxRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    // Example GSAP animation
    if (boxRef.current && titleRef.current) {
      gsap.fromTo(
        boxRef.current,
        { opacity: 0, y: 50 },
        { opacity: 1, y: 0, duration: 1, ease: 'power2.out' }
      );

      gsap.fromTo(
        titleRef.current,
        { opacity: 0, scale: 0.8 },
        { opacity: 1, scale: 1, duration: 0.8, delay: 0.2, ease: 'back.out(1.7)' }
      );
    }
  }, []);

  const handleHover = () => {
    if (boxRef.current) {
      gsap.to(boxRef.current, {
        scale: 1.05,
        duration: 0.3,
        ease: 'power2.out',
      });
    }
  };

  const handleLeave = () => {
    if (boxRef.current) {
      gsap.to(boxRef.current, {
        scale: 1,
        duration: 0.3,
        ease: 'power2.out',
      });
    }
  };

  return (
    <div className="flex flex-col items-center gap-6 p-8">
      <h2
        ref={titleRef}
        className="text-2xl font-bold text-gray-800 dark:text-gray-200"
      >
        GSAP Animation Example
      </h2>
      <div
        ref={boxRef}
        onMouseEnter={handleHover}
        onMouseLeave={handleLeave}
        className="w-64 h-64 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg shadow-lg flex items-center justify-center cursor-pointer"
      >
        <p className="text-white font-semibold">Hover me!</p>
      </div>
    </div>
  );
}

