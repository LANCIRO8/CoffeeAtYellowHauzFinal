import React from 'react';

/**
 * Botanical Ivy and Hanging Leaf vines for the Red Brick Wall Hero
 */
export const HangingVinesOverlay: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div className={`pointer-events-none select-none overflow-hidden ${className}`} aria-hidden="true">
      <svg
        viewBox="0 0 1200 160"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-auto drop-shadow-md opacity-90"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="leafGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#4D7C0F" />
            <stop offset="100%" stopColor="#1E3A0F" />
          </linearGradient>
          <linearGradient id="leafGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#65A30D" />
            <stop offset="100%" stopColor="#2E5516" />
          </linearGradient>
          <linearGradient id="leafGrad3" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#84CC16" />
            <stop offset="100%" stopColor="#3F6212" />
          </linearGradient>
        </defs>

        {/* Stem 1 - Left cluster */}
        <path d="M-20 -10 Q 60 45, 120 75 T 190 115" stroke="#365314" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M40 30 Q 30 75, 55 110" stroke="#365314" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M100 60 Q 95 105, 120 135" stroke="#365314" strokeWidth="1.6" strokeLinecap="round" />
        
        {/* Leaves Left */}
        <path d="M35 25 C 20 20, 5 35, 15 50 C 25 60, 45 40, 35 25 Z" fill="url(#leafGrad1)" />
        <path d="M55 42 C 40 40, 30 55, 45 70 C 60 75, 70 55, 55 42 Z" fill="url(#leafGrad2)" />
        <path d="M28 80 C 15 80, 10 95, 25 110 C 40 115, 45 95, 28 80 Z" fill="url(#leafGrad3)" />
        <path d="M52 105 C 45 115, 50 130, 65 130 C 75 125, 75 110, 52 105 Z" fill="url(#leafGrad1)" />
        <path d="M90 55 C 75 50, 70 70, 85 85 C 100 85, 105 65, 90 55 Z" fill="url(#leafGrad2)" />
        <path d="M115 70 C 105 85, 115 100, 130 95 C 140 85, 135 70, 115 70 Z" fill="url(#leafGrad3)" />
        <path d="M118 128 C 110 140, 125 152, 135 145 C 145 135, 135 120, 118 128 Z" fill="url(#leafGrad1)" />
        <path d="M165 95 C 150 95, 150 115, 168 125 C 185 120, 185 100, 165 95 Z" fill="url(#leafGrad2)" />
        <path d="M188 112 C 180 125, 195 138, 205 130 C 215 120, 205 105, 188 112 Z" fill="url(#leafGrad3)" />

        {/* Stem 2 - Mid left gentle droop */}
        <path d="M280 -10 Q 330 35, 370 65 T 415 100" stroke="#365314" strokeWidth="2.2" strokeLinecap="round" />
        <path d="M330 35 Q 315 70, 330 95" stroke="#365314" strokeWidth="1.5" strokeLinecap="round" />
        
        {/* Leaves Mid-Left */}
        <path d="M305 15 C 290 15, 285 30, 300 45 C 315 45, 320 30, 305 15 Z" fill="url(#leafGrad1)" />
        <path d="M335 30 C 320 35, 320 55, 335 65 C 350 60, 350 40, 335 30 Z" fill="url(#leafGrad3)" />
        <path d="M315 75 C 305 85, 315 100, 330 95 C 340 85, 335 75, 315 75 Z" fill="url(#leafGrad2)" />
        <path d="M370 60 C 355 60, 355 80, 375 90 C 390 85, 390 68, 370 60 Z" fill="url(#leafGrad1)" />
        <path d="M410 95 C 400 110, 418 122, 430 112 C 438 102, 425 90, 410 95 Z" fill="url(#leafGrad3)" />

        {/* Stem 3 - Center subtle leafy arch */}
        <path d="M550 -10 Q 590 30, 640 45 T 700 70" stroke="#365314" strokeWidth="2" strokeLinecap="round" />
        <path d="M570 15 C 555 15, 550 30, 568 42 C 582 40, 585 25, 570 15 Z" fill="url(#leafGrad2)" />
        <path d="M615 35 C 600 40, 605 60, 622 65 C 635 60, 635 40, 615 35 Z" fill="url(#leafGrad1)" />
        <path d="M665 48 C 655 60, 668 75, 680 70 C 690 60, 682 48, 665 48 Z" fill="url(#leafGrad3)" />

        {/* Stem 4 - Mid Right lush drop */}
        <path d="M820 -10 Q 860 40, 910 70 T 960 110" stroke="#365314" strokeWidth="2.4" strokeLinecap="round" />
        <path d="M870 45 Q 860 85, 885 118" stroke="#365314" strokeWidth="1.7" strokeLinecap="round" />
        <path d="M840 20 C 825 20, 820 38, 838 50 C 852 50, 855 32, 840 20 Z" fill="url(#leafGrad3)" />
        <path d="M875 40 C 860 45, 858 68, 878 78 C 895 72, 895 50, 875 40 Z" fill="url(#leafGrad1)" />
        <path d="M860 90 C 848 100, 858 118, 872 115 C 885 105, 878 90, 860 90 Z" fill="url(#leafGrad2)" />
        <path d="M915 65 C 900 68, 905 90, 925 95 C 940 88, 938 70, 915 65 Z" fill="url(#leafGrad3)" />
        <path d="M955 105 C 945 120, 965 132, 978 122 C 985 110, 972 98, 955 105 Z" fill="url(#leafGrad1)" />

        {/* Stem 5 - Far Right hanging draping vines */}
        <path d="M1040 -10 Q 1090 35, 1130 75 T 1180 120" stroke="#365314" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M1090 35 Q 1075 80, 1100 115" stroke="#365314" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M1065 18 C 1050 18, 1045 35, 1062 48 C 1078 48, 1080 30, 1065 18 Z" fill="url(#leafGrad1)" />
        <path d="M1098 32 C 1085 40, 1082 60, 1102 70 C 1118 65, 1118 45, 1098 32 Z" fill="url(#leafGrad2)" />
        <path d="M1080 85 C 1068 95, 1078 112, 1092 110 C 1105 100, 1100 85, 1080 85 Z" fill="url(#leafGrad3)" />
        <path d="M1135 70 C 1120 72, 1125 92, 1145 98 C 1160 92, 1158 75, 1135 70 Z" fill="url(#leafGrad1)" />
        <path d="M1175 115 C 1165 130, 1185 142, 1198 132 C 1205 120, 1192 108, 1175 115 Z" fill="url(#leafGrad2)" />
      </svg>
    </div>
  );
};

/**
 * Botanical Fern / Monstera Leaf for Corners and Accents
 */
export const MonsteraPlantCorner: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div className={`pointer-events-none select-none opacity-80 ${className}`} aria-hidden="true">
      <svg viewBox="0 0 160 160" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
        <defs>
          <linearGradient id="monsteraGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#3F6212" />
            <stop offset="50%" stopColor="#2E5516" />
            <stop offset="100%" stopColor="#1B3A0E" />
          </linearGradient>
          <linearGradient id="monsteraHighlight" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#65A30D" />
            <stop offset="100%" stopColor="#365314" />
          </linearGradient>
        </defs>

        {/* Stem */}
        <path d="M10 150 Q 60 110, 120 40" stroke="#224010" strokeWidth="4" strokeLinecap="round" />

        {/* Leaf Blades with natural Monstera Fenestrations */}
        <path
          d="M120 40 C 90 20, 45 40, 30 75 C 20 100, 35 135, 60 140 C 85 145, 120 120, 135 90 C 145 70, 140 50, 120 40 Z"
          fill="url(#monsteraGrad)"
        />
        {/* Cuts / details */}
        <path d="M60 70 Q 75 80, 95 75" stroke="#1A330B" strokeWidth="3" strokeLinecap="round" />
        <path d="M50 95 Q 70 102, 90 95" stroke="#1A330B" strokeWidth="3" strokeLinecap="round" />
        <path d="M70 120 Q 85 122, 105 110" stroke="#1A330B" strokeWidth="2.5" strokeLinecap="round" />
        
        {/* Midrib highlight */}
        <path d="M25 145 Q 65 115, 122 42" stroke="url(#monsteraHighlight)" strokeWidth="2" strokeLinecap="round" />
      </svg>
    </div>
  );
};

/**
 * Botanical Coffee Tree Leaves with Ripe Coffee Cherries
 */
export const CoffeePlantBranch: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div className={`pointer-events-none select-none ${className}`} aria-hidden="true">
      <svg viewBox="0 0 120 80" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
        <defs>
          <linearGradient id="coffeeLeafGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#4D7C0F" />
            <stop offset="100%" stopColor="#1E3A0F" />
          </linearGradient>
        </defs>
        {/* Main stem */}
        <path d="M5 40 Q 55 35, 115 42" stroke="#4A3423" strokeWidth="2.5" strokeLinecap="round" />
        
        {/* Leaves paired along stem */}
        {/* Leaf 1 left top */}
        <path d="M25 38 C 20 20, 40 10, 50 25 C 45 35, 35 38, 25 38 Z" fill="url(#coffeeLeafGrad)" />
        <path d="M27 36 Q 38 23, 49 25" stroke="#84CC16" strokeWidth="1" />
        
        {/* Leaf 2 left bottom */}
        <path d="M28 42 C 22 60, 42 70, 52 55 C 48 45, 38 42, 28 42 Z" fill="url(#coffeeLeafGrad)" />
        <path d="M30 44 Q 40 57, 51 55" stroke="#84CC16" strokeWidth="1" />

        {/* Leaf 3 right top */}
        <path d="M68 38 C 65 18, 88 12, 98 28 C 90 38, 78 40, 68 38 Z" fill="url(#coffeeLeafGrad)" />
        <path d="M70 36 Q 82 23, 97 28" stroke="#84CC16" strokeWidth="1" />

        {/* Leaf 4 right bottom */}
        <path d="M72 42 C 68 62, 90 68, 100 52 C 92 42, 80 40, 72 42 Z" fill="url(#coffeeLeafGrad)" />
        <path d="M74 44 Q 85 57, 99 52" stroke="#84CC16" strokeWidth="1" />

        {/* Red Coffee Cherries cluster */}
        <circle cx="58" cy="36" r="5.5" fill="#B91C1C" stroke="#7F1D1D" strokeWidth="1" />
        <circle cx="56" cy="34" r="1.5" fill="#FCA5A5" />
        <circle cx="64" cy="40" r="5" fill="#DC2626" stroke="#7F1D1D" strokeWidth="1" />
        <circle cx="62" cy="38" r="1.2" fill="#FCA5A5" />
        <circle cx="60" cy="45" r="4.5" fill="#991B1B" stroke="#7F1D1D" strokeWidth="1" />
      </svg>
    </div>
  );
};
