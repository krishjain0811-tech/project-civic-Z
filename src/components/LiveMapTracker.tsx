import React, { useState, useEffect } from "react";
import { Navigation, Compass, MapPin, Truck, AlertTriangle } from "lucide-react";
import { motion } from "motion/react";

interface LiveMapTrackerProps {
  pickupLat?: number;
  pickupLng?: number;
  destLat?: number;
  destLng?: number;
  isActive: boolean;
  onTripCompleted?: () => void;
  distanceKm: number;
}

export function LiveMapTracker({
  pickupLat = 19.0760,
  pickupLng = 72.8777,
  destLat = 18.9322,
  destLng = 72.8354,
  isActive,
  onTripCompleted,
  distanceKm
}: LiveMapTrackerProps) {
  const [progress, setProgress] = useState(0); // 0 to 100
  const [etaSecs, setEtaSecs] = useState(Math.round(distanceKm * 3)); // 3 seconds per km for mock speed
  const [currentLat, setCurrentLat] = useState(pickupLat);
  const [currentLng, setCurrentLng] = useState(pickupLng);

  useEffect(() => {
    if (!isActive) {
      setProgress(0);
      setEtaSecs(Math.round(distanceKm * 3));
      setCurrentLat(pickupLat);
      setCurrentLng(pickupLng);
      return;
    }

    const intervalTime = 1000; // Update every second
    const totalSteps = Math.round(distanceKm * 3); // 3 seconds per km
    let currentStep = 0;

    const timer = setInterval(() => {
      currentStep += 1;
      const currentProgress = (currentStep / totalSteps) * 100;
      setProgress(Math.min(currentProgress, 100));

      // Calculate linear interpolation coordinates
      const ratio = currentStep / totalSteps;
      const interpLat = pickupLat + (destLat - pickupLat) * ratio;
      const interpLng = pickupLng + (destLng - pickupLng) * ratio;
      setCurrentLat(parseFloat(interpLat.toFixed(5)));
      setCurrentLng(parseFloat(interpLng.toFixed(5)));

      setEtaSecs(Math.max(totalSteps - currentStep, 0));

      if (currentStep >= totalSteps) {
        clearInterval(timer);
        if (onTripCompleted) onTripCompleted();
      }
    }, intervalTime);

    return () => clearInterval(timer);
  }, [isActive, pickupLat, pickupLng, destLat, destLng, distanceKm]);

  // Point burn calculation (1 point per km)
  const currentBurnPoints = Math.ceil((distanceKm * progress) / 100);

  return (
    <div className="bg-[#1A1D23] border border-white/5 rounded-3xl overflow-hidden shadow-2xl relative" id="live-map-tracker-container">
      {/* Simulation Grid Stage */}
      <div className="relative w-full h-64 bg-[#0A0A0B] border-b border-white/5 overflow-hidden flex items-center justify-center">
        {/* Custom Grid lines */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#14161B_1px,transparent_1px),linear-gradient(to_bottom,#14161B_1px,transparent_1px)] bg-[size:24px_24px] opacity-60" />

        {/* Mock Roads */}
        <svg className="absolute inset-0 w-full h-full text-slate-800" xmlns="http://www.w3.org/2000/svg">
          {/* Main Highway */}
          <line x1="50" y1="50" x2="350" y2="210" stroke="#1A1D23" strokeWidth="6" strokeLinecap="round" />
          <line x1="50" y1="50" x2="350" y2="210" stroke="#0A0A0B" strokeWidth="1" strokeDasharray="4 4" />

          {/* Sub Roads */}
          <line x1="30" y1="180" x2="380" y2="100" stroke="#1A1D23" strokeWidth="4" strokeLinecap="round" />
          <line x1="200" y1="20" x2="200" y2="240" stroke="#1A1D23" strokeWidth="4" strokeLinecap="round" />

          {/* Location pins SVG representation */}
          {/* Pickup location (orange glow) */}
          <circle cx="70" cy="60" r="14" fill="#7c2d12" fillOpacity="0.3" />
          <circle cx="70" cy="60" r="6" fill="#f97316" />

          {/* Destination location (crimson glow) */}
          <circle cx="330" cy="200" r="14" fill="#9f1239" fillOpacity="0.3" />
          <circle cx="330" cy="200" r="6" fill="#f43f5e" />
        </svg>

        {/* Animated Moving Vehicle */}
        {isActive && (
          <motion.div
            style={{
              position: "absolute",
              left: `${70 + (330 - 70) * (progress / 100)}px`,
              top: `${60 + (200 - 60) * (progress / 100)}px`,
              transform: "translate(-50%, -50%)"
            }}
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
            className="z-20 bg-orange-500 text-[#0A0A0B] p-2 rounded-full shadow-[0_0_15px_#f97316] flex items-center justify-center border border-orange-300"
          >
            <Truck size={14} className="animate-pulse" />
          </motion.div>
        )}

        {/* Text indicators overlays */}
        <div className="absolute top-3 left-3 bg-[#14161B]/90 border border-white/5 px-2.5 py-1 rounded-lg text-[10px] font-mono flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
          <span>REAL-TIME GPS SAT-FEED</span>
        </div>

        {isActive && (
          <div className="absolute bottom-3 right-3 bg-[#14161B]/90 border border-white/5 px-3 py-1.5 rounded-lg text-right font-mono">
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Active Dispatch Burn</p>
            <p className="text-sm font-extrabold text-orange-400 mt-0.5">{currentBurnPoints} / {distanceKm} HP</p>
          </div>
        )}
      </div>

      {/* Stats footer panel */}
      <div className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-4 bg-[#1A1D23]">
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] text-slate-500 uppercase font-bold tracking-widest font-mono">TRANSIT ETAs</span>
          <span className="text-sm font-semibold font-mono text-slate-200">
            {isActive ? `${Math.floor(etaSecs / 60)}m ${etaSecs % 60}s` : "STANDBY READY"}
          </span>
        </div>

        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] text-slate-500 uppercase font-bold tracking-widest font-mono">TOTAL ROUTE DISTANCE</span>
          <span className="text-sm font-semibold font-mono text-slate-200">{distanceKm} KM</span>
        </div>

        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] text-slate-500 uppercase font-bold tracking-widest font-mono">BURN COST</span>
          <span className="text-sm font-semibold font-mono text-slate-200">{distanceKm} Humanity Points</span>
        </div>

        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] text-slate-500 uppercase font-bold tracking-widest font-mono">CURRENT COORDINATES</span>
          <span className="text-xs font-semibold font-mono text-slate-400">
            {currentLat}° N, {currentLng}° E
          </span>
        </div>
      </div>

      {/* Progress status bar */}
      {isActive && (
        <div className="h-1.5 bg-[#0A0A0B] w-full overflow-hidden">
          <div
            className="h-full bg-orange-500 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  );
}
