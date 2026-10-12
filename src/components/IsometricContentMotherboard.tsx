import React, { useEffect, useRef } from 'react';
import { Sparkles, Clapperboard, PenTool, Layers, Radio } from 'lucide-react';

interface IsometricContentMotherboardProps {
  className?: string;
}

export const IsometricContentMotherboard: React.FC<IsometricContentMotherboardProps> = ({ className = '' }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chipContainerRef = useRef<HTMLDivElement | null>(null);

  // Direct element references for 60/120fps continuous mathematical interpolation
  const cardTopRef = useRef<HTMLDivElement | null>(null);
  const cardRightRef = useRef<HTMLDivElement | null>(null);
  const cardLeftRef = useRef<HTMLDivElement | null>(null);
  const cardBottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = canvas.parentElement?.clientWidth || window.innerWidth);
    let height = (canvas.height = canvas.parentElement?.clientHeight || window.innerHeight);

    // Mouse coordinates tracking with deadzone damping to eliminate micro-jitter
    const mouse = {
      targetX: 0,
      targetY: 0,
      currentX: 0,
      currentY: 0,
    };

    const handleMouseMove = (e: MouseEvent) => {
      mouse.targetX = (e.clientX / window.innerWidth - 0.5) * 2;
      mouse.targetY = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    window.addEventListener('mousemove', handleMouseMove, { passive: true });

    // Offscreen Canvas to pre-render static circuit tracks, ICs, pads, vias once
    const staticCanvas = document.createElement('canvas');
    const staticCtx = staticCanvas.getContext('2d');

    const traces: {
      points: { x: number; y: number }[];
      speed: number;
      progress: number;
      color: string;
      rgb: string;
    }[] = [];

    const setupScene = () => {
      width = canvas.width = staticCanvas.width = canvas.parentElement?.clientWidth || window.innerWidth;
      height = canvas.height = staticCanvas.height = canvas.parentElement?.clientHeight || window.innerHeight;

      if (!staticCtx) return;
      staticCtx.clearRect(0, 0, width, height);

      const centerX = width * 0.42;
      const centerY = height * 0.5;

      // 1. Draw decorative static IC microchips
      const chips = [
        { x: centerX - 280, y: centerY - 180, w: 46, h: 32, label: 'LLM-7B' },
        { x: centerX - 320, y: centerY + 120, w: 54, h: 36, label: 'KB-RAG' },
        { x: centerX + 220, y: centerY - 240, w: 42, h: 28, label: 'NPU-01' },
        { x: centerX + 240, y: centerY + 240, w: 50, h: 32, label: 'SYNC-BUS' },
        { x: centerX - 70, y: centerY - 220, w: 38, h: 26, label: 'CACHE' },
        { x: centerX - 100, y: centerY + 300, w: 42, h: 30, label: 'MEDIA' },
      ];

      chips.forEach((chip) => {
        staticCtx.fillStyle = '#cbd5e1';
        staticCtx.beginPath();
        staticCtx.roundRect(chip.x, chip.y, chip.w, chip.h, 4);
        staticCtx.fill();

        staticCtx.fillStyle = '#334155';
        staticCtx.beginPath();
        staticCtx.roundRect(chip.x + 3, chip.y + 3, chip.w - 6, chip.h - 6, 2);
        staticCtx.fill();

        staticCtx.fillStyle = '#94a3b8';
        for (let px = chip.x + 6; px < chip.x + chip.w - 4; px += 8) {
          staticCtx.fillRect(px, chip.y - 2, 4, 3);
          staticCtx.fillRect(px, chip.y + chip.h - 1, 4, 3);
        }

        staticCtx.fillStyle = '#94a3b8';
        staticCtx.font = '700 7px sans-serif';
        staticCtx.textAlign = 'center';
        staticCtx.fillText(chip.label, chip.x + chip.w / 2, chip.y + chip.h / 2 + 2.5);
      });

      // 2. Draw static SMD ceramic components
      const smdComponents = [
        { x: centerX - 190, y: centerY - 170, w: 12, h: 6, c: '#38bdf8' },
        { x: centerX - 170, y: centerY - 170, w: 12, h: 6, c: '#e2e8f0' },
        { x: centerX - 150, y: centerY - 170, w: 12, h: 6, c: '#818cf8' },
        { x: centerX - 210, y: centerY + 160, w: 14, h: 7, c: '#38bdf8' },
        { x: centerX - 180, y: centerY + 160, w: 14, h: 7, c: '#e2e8f0' },
        { x: centerX + 160, y: centerY - 130, w: 12, h: 6, c: '#818cf8' },
        { x: centerX + 140, y: centerY + 130, w: 12, h: 6, c: '#38bdf8' },
      ];

      smdComponents.forEach((smd) => {
        staticCtx.fillStyle = smd.c;
        staticCtx.fillRect(smd.x, smd.y, smd.w, smd.h);
        staticCtx.fillStyle = '#94a3b8';
        staticCtx.fillRect(smd.x, smd.y, 2, smd.h);
        staticCtx.fillRect(smd.x + smd.w - 2, smd.y, 2, smd.h);
      });

      // 3. Define calm geometric circuit traces
      const angles = [
        [
          { x: centerX - 360, y: centerY - 280 },
          { x: centerX - 180, y: centerY - 280 },
          { x: centerX - 120, y: centerY - 160 },
          { x: centerX - 70, y: centerY - 100 },
        ],
        [
          { x: centerX - 420, y: centerY - 120 },
          { x: centerX - 240, y: centerY - 120 },
          { x: centerX - 150, y: centerY - 70 },
          { x: centerX - 80, y: centerY - 50 },
        ],
        [
          { x: centerX - 380, y: centerY + 240 },
          { x: centerX - 200, y: centerY + 240 },
          { x: centerX - 140, y: centerY + 140 },
          { x: centerX - 70, y: centerY + 90 },
        ],
        [
          { x: centerX - 460, y: centerY + 70 },
          { x: centerX - 280, y: centerY + 70 },
          { x: centerX - 160, y: centerY + 40 },
          { x: centerX - 90, y: centerY + 20 },
        ],
        [
          { x: centerX - 30, y: centerY - 280 },
          { x: centerX - 30, y: centerY - 180 },
          { x: centerX - 15, y: centerY - 120 },
          { x: centerX - 5, y: centerY - 90 },
        ],
        [
          { x: centerX + 80, y: centerY - 320 },
          { x: centerX + 80, y: centerY - 190 },
          { x: centerX + 40, y: centerY - 130 },
          { x: centerX + 20, y: centerY - 90 },
        ],
        [
          { x: centerX - 50, y: centerY + 380 },
          { x: centerX - 50, y: centerY + 220 },
          { x: centerX - 20, y: centerY + 140 },
          { x: centerX - 10, y: centerY + 90 },
        ],
        [
          { x: centerX + 70, y: centerY + 360 },
          { x: centerX + 70, y: centerY + 210 },
          { x: centerX + 30, y: centerY + 130 },
          { x: centerX + 20, y: centerY + 90 },
        ],
        [
          { x: centerX + 380, y: centerY - 200 },
          { x: centerX + 220, y: centerY - 200 },
          { x: centerX + 140, y: centerY - 110 },
          { x: centerX + 80, y: centerY - 60 },
        ],
        [
          { x: centerX + 350, y: centerY + 180 },
          { x: centerX + 210, y: centerY + 180 },
          { x: centerX + 130, y: centerY + 100 },
          { x: centerX + 80, y: centerY + 60 },
        ],
      ];

      traces.length = 0;
      angles.forEach((pts, i) => {
        traces.push({
          points: pts,
          speed: 0.0009 + (i % 3) * 0.0003,
          progress: (i * 0.23) % 1,
          color: i % 2 === 0 ? '#1815d8' : '#0284c7',
          rgb: i % 2 === 0 ? '24, 21, 216' : '2, 132, 199',
        });

        staticCtx.strokeStyle = 'rgba(165, 180, 252, 0.45)';
        staticCtx.lineWidth = 2;
        staticCtx.lineCap = 'round';
        staticCtx.lineJoin = 'round';

        staticCtx.beginPath();
        pts.forEach((pt, idx) => {
          if (idx === 0) staticCtx.moveTo(pt.x, pt.y);
          else staticCtx.lineTo(pt.x, pt.y);
        });
        staticCtx.stroke();

        const startPt = pts[0];
        staticCtx.fillStyle = '#ffffff';
        staticCtx.beginPath();
        staticCtx.arc(startPt.x, startPt.y, 3, 0, Math.PI * 2);
        staticCtx.fill();
        staticCtx.strokeStyle = '#6366f1';
        staticCtx.lineWidth = 1.5;
        staticCtx.stroke();
      });
    };

    setupScene();
    const handleResize = () => setupScene();
    window.addEventListener('resize', handleResize, { passive: true });

    // Helper to calculate coordinate along multi-segment polyline
    const getPointAtProgress = (points: { x: number; y: number }[], prog: number) => {
      const totalSegments = points.length - 1;
      const totalProgress = Math.max(0, Math.min(1, prog)) * totalSegments;
      const idx = Math.floor(totalProgress);
      const segProg = totalProgress - idx;
      if (idx >= totalSegments) return points[totalSegments];
      const p1 = points[idx];
      const p2 = points[idx + 1];
      return {
        x: p1.x + (p2.x - p1.x) * segProg,
        y: p1.y + (p2.y - p1.y) * segProg,
      };
    };

    // Mathematical cubic ease-in-out (Zero jerk, zero initial burst, smooth robotic stop)
    const easeInOutCubic = (t: number) => {
      return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    };

    // ── MATHEMATICALLY SMOOTH 60/120 FPS ANIMATION LOOP ──
    const render = () => {
      // 1. Mouse parallax with deadzone threshold (ZERO JITTER)
      const dx = mouse.targetX - mouse.currentX;
      const dy = mouse.targetY - mouse.currentY;
      if (Math.abs(dx) > 0.002) mouse.currentX += dx * 0.035;
      else mouse.currentX = mouse.targetX;
      if (Math.abs(dy) > 0.002) mouse.currentY += dy * 0.035;
      else mouse.currentY = mouse.targetY;

      if (chipContainerRef.current) {
        const tiltX = 56 + mouse.currentY * 1.4;
        const tiltZ = -38 + mouse.currentX * 1.8;
        chipContainerRef.current.style.transform = `rotateX(${tiltX}deg) rotateZ(${tiltZ}deg) translate3d(0, 0, 0)`;
      }

      // 2. Continuous, Slow, Cinematic Shutter Motion (16s cycle with 3.2s slow glide)
      const now = performance.now() / 1000;
      const loopDuration = 16.0;
      const phase = now % loopDuration;

      let progress = 0; // 0 = open, 1 = closed

      if (phase < 5.0) {
        // 0s to 5.0s: fully open
        progress = 0;
      } else if (phase < 8.2) {
        // 5.0s to 8.2s (3.2 seconds): smooth, slow, gentle glide shut
        const t = (phase - 5.0) / 3.2;
        progress = easeInOutCubic(t);
      } else if (phase < 11.4) {
        // 8.2s to 11.4s (3.2 seconds): rests peacefully closed
        progress = 1;
      } else if (phase < 14.6) {
        // 11.4s to 14.6s (3.2 seconds): smooth, slow, gentle glide open
        const t = (phase - 11.4) / 3.2;
        progress = 1 - easeInOutCubic(t);
      } else {
        // 14.6s to 16.0s: rests open
        progress = 0;
      }

      const offsetPercent = (1 - progress) * 105;
      const cardOpacity = Math.max(0, Math.min(1, progress * 1.25));

      if (cardTopRef.current) {
        cardTopRef.current.style.transform = `translate3d(0, ${-offsetPercent}%, 0)`;
        cardTopRef.current.style.opacity = `${cardOpacity}`;
      }
      if (cardRightRef.current) {
        cardRightRef.current.style.transform = `translate3d(${offsetPercent}%, 0, 0)`;
        cardRightRef.current.style.opacity = `${cardOpacity}`;
      }
      if (cardLeftRef.current) {
        cardLeftRef.current.style.transform = `translate3d(${-offsetPercent}%, 0, 0)`;
        cardLeftRef.current.style.opacity = `${cardOpacity}`;
      }
      if (cardBottomRef.current) {
        cardBottomRef.current.style.transform = `translate3d(0, ${offsetPercent}%, 0)`;
        cardBottomRef.current.style.opacity = `${cardOpacity}`;
      }

      // 3. Clear & paint static background from offscreen buffer
      ctx.clearRect(0, 0, width, height);
      ctx.drawImage(staticCanvas, 0, 0);

      // 4. Draw calm glowing stream pulses with smooth in/out alpha fading
      for (let i = 0; i < traces.length; i++) {
        const trace = traces[i];
        trace.progress = (trace.progress + trace.speed) % 1;

        let alpha = 1;
        if (trace.progress < 0.18) {
          alpha = trace.progress / 0.18;
        } else if (trace.progress > 0.82) {
          alpha = (1 - trace.progress) / 0.18;
        }

        if (alpha > 0.01) {
          const headPt = getPointAtProgress(trace.points, trace.progress);
          const tailPt1 = getPointAtProgress(trace.points, Math.max(0, trace.progress - 0.03));
          const tailPt2 = getPointAtProgress(trace.points, Math.max(0, trace.progress - 0.06));

          // Soft light tail
          ctx.beginPath();
          ctx.moveTo(tailPt2.x, tailPt2.y);
          ctx.lineTo(tailPt1.x, tailPt1.y);
          ctx.lineTo(headPt.x, headPt.y);
          ctx.strokeStyle = `rgba(${trace.rgb}, ${alpha * 0.55})`;
          ctx.lineWidth = 3;
          ctx.lineCap = 'round';
          ctx.stroke();

          // Soft glowing head halo
          ctx.fillStyle = `rgba(${trace.rgb}, ${alpha * 0.35})`;
          ctx.beginPath();
          ctx.arc(headPt.x, headPt.y, 6, 0, Math.PI * 2);
          ctx.fill();

          // Bright center bead
          ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.95})`;
          ctx.beginPath();
          ctx.arc(headPt.x, headPt.y, 2.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div className={`relative w-full h-full overflow-hidden select-none ${className}`}>
      {/* Background canvas for PCB circuitry traces & calm light pulses */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none z-0"
      />

      {/* Steady, calming background ambient glow */}
      <div 
        className="absolute top-1/2 left-[42%] -translate-x-1/2 -translate-y-1/2 w-[520px] h-[520px] rounded-full pointer-events-none z-0 chip-underglow"
        style={{
          background: 'radial-gradient(circle, rgba(24, 21, 216, 0.2) 0%, rgba(99, 102, 241, 0.08) 50%, transparent 75%)',
        }}
      />

      {/* ── ISOMETRIC 3D CONTENT ENGINE CHIP (Processor Unit) ── */}
      <div 
        className="absolute top-1/2 left-[42%] -translate-x-1/2 -translate-y-1/2 z-10 pointer-events-none"
        style={{
          perspective: '1300px',
          transformStyle: 'preserve-3d',
        }}
      >
        <div 
          ref={chipContainerRef}
          className="relative"
          style={{
            transform: 'rotateX(56deg) rotateZ(-38deg) translate3d(0, 0, 0)',
            transformStyle: 'preserve-3d',
            willChange: 'transform',
          }}
        >
          {/* Socket Blue Neon Underglow */}
          <div 
            className="absolute -inset-6 rounded-[36px] chip-underglow"
            style={{
              background: 'radial-gradient(circle, rgba(24, 21, 216, 0.85) 0%, rgba(6, 182, 212, 0.4) 60%, transparent 80%)',
              transform: 'translateZ(-24px)',
            }}
          />

          {/* Sub-base PCB socket rim (Extrusion depth layer) */}
          <div 
            className="w-[340px] h-[340px] sm:w-[380px] sm:h-[380px] rounded-[30px] border-2 border-indigo-300/60 shadow-2xl"
            style={{
              background: 'linear-gradient(135deg, #1815d8 0%, #0d0cbd 45%, #050466 100%)',
              boxShadow: '0 28px 50px -10px rgba(5, 4, 102, 0.45), inset 0 2px 4px rgba(255, 255, 255, 0.3)',
              transformStyle: 'preserve-3d',
              padding: '16px',
            }}
          >
            {/* Outer metallic processor border with gold contact pads */}
            <div 
              className="relative w-full h-full rounded-[22px] bg-gradient-to-br from-slate-100 via-slate-50 to-slate-200 p-3 shadow-inner border border-white"
              style={{
                boxShadow: 'inset 0 4px 12px rgba(0, 0, 0, 0.1), 0 2px 6px rgba(0, 0, 0, 0.08)',
                transformStyle: 'preserve-3d',
              }}
            >
              {/* Gold socket pin dots around border */}
              <div className="absolute inset-1 border border-dashed border-amber-300/40 rounded-[18px] pointer-events-none" />

              {/* 4 Content Compartments Grid */}
              <div 
                className="w-full h-full grid grid-cols-2 grid-rows-2 gap-2.5 relative rounded-[16px] overflow-hidden bg-slate-200/80 p-1.5"
                style={{
                  transformStyle: 'preserve-3d',
                }}
              >
                {/* ── BAY 1: VIDEO & MOTION (Top-Left) ── */}
                <div 
                  className="relative rounded-xl overflow-hidden bg-gradient-to-br from-indigo-50 to-blue-100/90 border border-indigo-200/80 p-2.5 flex flex-col items-center justify-center shadow-inner"
                  style={{
                    boxShadow: 'inset 0 3px 8px rgba(24, 21, 216, 0.08)',
                  }}
                >
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white shadow-md shadow-indigo-500/25 mb-1.5">
                    <Clapperboard size={22} />
                  </div>
                  <div className="flex items-center gap-1 text-[10px] font-extrabold text-indigo-900 tracking-wider uppercase">
                    <span>Motion & Reel</span>
                  </div>
                  <span className="text-[8px] font-semibold text-indigo-600/80 tracking-tight">
                    AI Video Engine
                  </span>

                  {/* Smooth Closing Card: Bay 1 */}
                  <div 
                    ref={cardTopRef}
                    className="absolute inset-0 bg-gradient-to-br from-slate-800/95 via-slate-900/95 to-slate-950/95 flex flex-col items-center justify-center border border-cyan-500/30 z-20 rounded-xl overflow-hidden pointer-events-none"
                    style={{
                      boxShadow: '0 4px 16px rgba(0, 0, 0, 0.35), inset 0 0 0 1px rgba(56, 189, 248, 0.2)',
                      transform: 'translate3d(0, -105%, 0)',
                      opacity: 0,
                      willChange: 'transform, opacity',
                    }}
                  >
                    <div className="w-8 h-1 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee] mb-1.5" />
                    <span className="text-[7.5px] font-mono font-bold text-cyan-300 tracking-widest uppercase">MODULE A</span>
                    <span className="text-[6.5px] font-mono text-slate-400 uppercase tracking-tight">VIDEO ENGINE</span>
                  </div>
                </div>

                {/* ── BAY 2: AI COPYWRITING & SCRIPT (Top-Right) ── */}
                <div 
                  className="relative rounded-xl overflow-hidden bg-gradient-to-br from-violet-50 to-indigo-100/90 border border-violet-200/80 p-2.5 flex flex-col items-center justify-center shadow-inner"
                  style={{
                    boxShadow: 'inset 0 3px 8px rgba(139, 92, 246, 0.08)',
                  }}
                >
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-700 flex items-center justify-center text-white shadow-md shadow-violet-500/25 mb-1.5">
                    <PenTool size={22} />
                  </div>
                  <div className="flex items-center gap-1 text-[10px] font-extrabold text-violet-900 tracking-wider uppercase">
                    <span>AI Copy & Prompt</span>
                  </div>
                  <span className="text-[8px] font-semibold text-violet-600/80 tracking-tight">
                    Editorial Core
                  </span>

                  {/* Smooth Closing Card: Bay 2 */}
                  <div 
                    ref={cardRightRef}
                    className="absolute inset-0 bg-gradient-to-br from-slate-800/95 via-slate-900/95 to-slate-950/95 flex flex-col items-center justify-center border border-indigo-500/30 z-20 rounded-xl overflow-hidden pointer-events-none"
                    style={{
                      boxShadow: '0 4px 16px rgba(0, 0, 0, 0.35), inset 0 0 0 1px rgba(129, 140, 248, 0.2)',
                      transform: 'translate3d(105%, 0, 0)',
                      opacity: 0,
                      willChange: 'transform, opacity',
                    }}
                  >
                    <div className="w-8 h-1 rounded-full bg-indigo-400 shadow-[0_0_8px_#818cf8] mb-1.5" />
                    <span className="text-[7.5px] font-mono font-bold text-indigo-300 tracking-widest uppercase">MODULE B</span>
                    <span className="text-[6.5px] font-mono text-slate-400 uppercase tracking-tight">PROMPT CORE</span>
                  </div>
                </div>

                {/* ── BAY 3: VISUAL DESIGN & CANVAS (Bottom-Left) ── */}
                <div 
                  className="relative rounded-xl overflow-hidden bg-gradient-to-br from-sky-50 to-cyan-100/90 border border-sky-200/80 p-2.5 flex flex-col items-center justify-center shadow-inner"
                  style={{
                    boxShadow: 'inset 0 3px 8px rgba(6, 182, 212, 0.08)',
                  }}
                >
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-600 to-blue-700 flex items-center justify-center text-white shadow-md shadow-cyan-500/25 mb-1.5">
                    <Layers size={22} />
                  </div>
                  <div className="flex items-center gap-1 text-[10px] font-extrabold text-sky-900 tracking-wider uppercase">
                    <span>Visual Canvas</span>
                  </div>
                  <span className="text-[8px] font-semibold text-sky-600/80 tracking-tight">
                    Creative Studio
                  </span>

                  {/* Smooth Closing Card: Bay 3 */}
                  <div 
                    ref={cardLeftRef}
                    className="absolute inset-0 bg-gradient-to-br from-slate-800/95 via-slate-900/95 to-slate-950/95 flex flex-col items-center justify-center border border-cyan-500/30 z-20 rounded-xl overflow-hidden pointer-events-none"
                    style={{
                      boxShadow: '0 4px 16px rgba(0, 0, 0, 0.35), inset 0 0 0 1px rgba(56, 189, 248, 0.2)',
                      transform: 'translate3d(-105%, 0, 0)',
                      opacity: 0,
                      willChange: 'transform, opacity',
                    }}
                  >
                    <div className="w-8 h-1 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee] mb-1.5" />
                    <span className="text-[7.5px] font-mono font-bold text-cyan-300 tracking-widest uppercase">MODULE C</span>
                    <span className="text-[6.5px] font-mono text-slate-400 uppercase tracking-tight">GRAPHIC CORE</span>
                  </div>
                </div>

                {/* ── BAY 4: OMNICHANNEL DISTRIBUTION (Bottom-Right) ── */}
                <div 
                  className="relative rounded-xl overflow-hidden bg-gradient-to-br from-blue-50 to-indigo-100/90 border border-blue-200/80 p-2.5 flex flex-col items-center justify-center shadow-inner"
                  style={{
                    boxShadow: 'inset 0 3px 8px rgba(37, 99, 235, 0.08)',
                  }}
                >
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-700 to-indigo-900 flex items-center justify-center text-white shadow-md shadow-blue-500/25 mb-1.5">
                    <Radio size={22} />
                  </div>
                  <div className="flex items-center gap-1 text-[10px] font-extrabold text-blue-950 tracking-wider uppercase">
                    <span>Omni Broadcast</span>
                  </div>
                  <span className="text-[8px] font-semibold text-blue-600/80 tracking-tight">
                    Multi-Platform Reach
                  </span>

                  {/* Smooth Closing Card: Bay 4 */}
                  <div 
                    ref={cardBottomRef}
                    className="absolute inset-0 bg-gradient-to-br from-slate-800/95 via-slate-900/95 to-slate-950/95 flex flex-col items-center justify-center border border-blue-500/30 z-20 rounded-xl overflow-hidden pointer-events-none"
                    style={{
                      boxShadow: '0 4px 16px rgba(0, 0, 0, 0.35), inset 0 0 0 1px rgba(96, 165, 250, 0.2)',
                      transform: 'translate3d(0, 105%, 0)',
                      opacity: 0,
                      willChange: 'transform, opacity',
                    }}
                  >
                    <div className="w-8 h-1 rounded-full bg-blue-400 shadow-[0_0_8px_#60a5fa] mb-1.5" />
                    <span className="text-[7.5px] font-mono font-bold text-blue-300 tracking-widest uppercase">MODULE D</span>
                    <span className="text-[6.5px] font-mono text-slate-400 uppercase tracking-tight">DISTRIB CORE</span>
                  </div>
                </div>

                {/* Center Core Cross Divider with Central Holographic NPU Core */}
                <div 
                  className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-slate-900 border-2 border-cyan-400 flex items-center justify-center shadow-[0_0_15px_rgba(6,182,212,0.5)] z-30"
                  style={{
                    transform: 'translate(-50%, -50%) translateZ(12px)',
                  }}
                >
                  <Sparkles size={16} className="text-cyan-300" />
                </div>
              </div>

              {/* Bottom Chip Identification Badge */}
              <div className="mt-2 flex items-center justify-between px-1 text-[8px] font-mono text-slate-500 tracking-wider font-semibold">
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_#10b981]" />
                  VIBECONTENT-NPU v4.2
                </span>
                <span>STATUS: OPERATIONAL</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
