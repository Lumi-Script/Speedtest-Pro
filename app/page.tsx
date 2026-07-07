'use client';

import { useState, useMemo } from 'react';
import { useSpeedTest } from '@/hooks/use-speed-test';
import { Download, Upload, Settings2, Play, Square, WifiHigh } from 'lucide-react';

function formatSpeed(bps: number) {
  if (bps === 0) return { value: '0.00', unit: 'Mbps' };
  const mbps = bps / 1_000_000;
  if (mbps > 1000) {
    return { value: (mbps / 1000).toFixed(2), unit: 'Gbps' };
  }
  if (mbps < 1) {
    return { value: (bps / 1000).toFixed(2), unit: 'Kbps' };
  }
  return { value: mbps.toFixed(2), unit: 'Mbps' };
}

export default function SpeedTestApp() {
  const { state, downloadSpeedBps, uploadSpeedBps, downloadPeakSpeedBps, uploadPeakSpeedBps, progress, start, stop, errorMsg } = useSpeedTest();
  const [threads, setThreads] = useState<number>(4);
  const [downloadSize, setDownloadSize] = useState<number>(1000);
  const [uploadSize, setUploadSize] = useState<number>(100);

  const dlSpeedFormatted = useMemo(() => formatSpeed(downloadSpeedBps), [downloadSpeedBps]);
  const ulSpeedFormatted = useMemo(() => formatSpeed(uploadSpeedBps), [uploadSpeedBps]);
  const dlPeakFormatted = useMemo(() => formatSpeed(downloadPeakSpeedBps), [downloadPeakSpeedBps]);
  const ulPeakFormatted = useMemo(() => formatSpeed(uploadPeakSpeedBps), [uploadPeakSpeedBps]);

  const isTesting = state === 'downloading' || state === 'uploading';

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6 font-sans">
      <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b from-indigo-900/20 to-slate-950 pointer-events-none" />
      
      <div className="w-full max-w-lg z-10 space-y-10">
        
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center space-x-3 text-indigo-400 mb-4">
            <WifiHigh className="w-8 h-8" />
            <h1 className="text-3xl font-bold tracking-tight text-white">SpeedTest Pro</h1>
          </div>
          <p className="text-slate-400 text-sm">Highly accurate threaded network benchmark</p>
        </div>

        {/* Speed Dials */}
        <div className="grid grid-cols-2 gap-6">
          <div className={`p-6 rounded-3xl bg-slate-900/50 border border-slate-800 transition-colors duration-500 flex flex-col items-center ${state === 'downloading' ? 'border-indigo-500/50 shadow-[0_0_30px_rgba(99,102,241,0.15)] bg-slate-900/80' : ''}`}>
            <div className="flex items-center space-x-2 text-slate-400 mb-6">
              <Download className={`w-5 h-5 ${state === 'downloading' ? 'text-indigo-400 animate-pulse' : ''}`} />
              <span className="text-sm font-medium uppercase tracking-wider">Download</span>
            </div>
            <div className="flex items-baseline space-x-1">
              <span className="text-5xl font-light tracking-tight text-white">{dlSpeedFormatted.value}</span>
              <span className="text-lg text-slate-500 font-medium">{dlSpeedFormatted.unit}</span>
            </div>
            {(state === 'complete' || downloadPeakSpeedBps > 0) && (
              <div className="mt-4 flex items-center justify-center space-x-2 text-xs font-semibold tracking-widest text-slate-500">
                <span>PEAK</span>
                <span className="text-slate-300 font-mono bg-slate-950/50 px-2 py-0.5 rounded border border-slate-800">
                  {dlPeakFormatted.value} {dlPeakFormatted.unit}
                </span>
              </div>
            )}
          </div>

          <div className={`p-6 rounded-3xl bg-slate-900/50 border border-slate-800 transition-colors duration-500 flex flex-col items-center ${state === 'uploading' ? 'border-emerald-500/50 shadow-[0_0_30px_rgba(16,185,129,0.15)] bg-slate-900/80' : ''}`}>
             <div className="flex items-center space-x-2 text-slate-400 mb-6">
              <Upload className={`w-5 h-5 ${state === 'uploading' ? 'text-emerald-400 animate-pulse' : ''}`} />
              <span className="text-sm font-medium uppercase tracking-wider">Upload</span>
            </div>
            <div className="flex items-baseline space-x-1">
              <span className="text-5xl font-light tracking-tight text-white">{ulSpeedFormatted.value}</span>
              <span className="text-lg text-slate-500 font-medium">{ulSpeedFormatted.unit}</span>
            </div>
            {(state === 'complete' || uploadPeakSpeedBps > 0) && (
              <div className="mt-4 flex items-center justify-center space-x-2 text-xs font-semibold tracking-widest text-slate-500">
                <span>PEAK</span>
                <span className="text-slate-300 font-mono bg-slate-950/50 px-2 py-0.5 rounded border border-slate-800">
                  {ulPeakFormatted.value} {ulPeakFormatted.unit}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs font-semibold text-slate-500 uppercase tracking-widest px-1">
            <span>{state === 'idle' ? 'Ready' : state === 'complete' ? 'Completed' : state === 'error' ? 'Error' : `Testing ${state}...`}</span>
            {isTesting && <span>{Math.round(progress)}%</span>}
          </div>
          <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all duration-300 ease-out ${state === 'downloading' ? 'bg-indigo-500' : state === 'uploading' ? 'bg-emerald-500' : state === 'complete' ? 'bg-slate-600' : 'bg-transparent'}`}
              style={{ width: `${isTesting ? progress : state === 'complete' ? 100 : 0}%` }}
            />
          </div>
        </div>

        {errorMsg && (
          <div className="p-4 bg-red-900/20 border border-red-900/50 text-red-400 text-sm rounded-xl text-center">
            {errorMsg}
          </div>
        )}

        {/* Controls */}
        <div className="flex flex-col items-center space-y-6 pt-4">
          {!isTesting ? (
            <button 
              onClick={() => start(threads, downloadSize, uploadSize)}
              className="group relative flex items-center justify-center w-20 h-20 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full transition-all duration-300 hover:scale-105 active:scale-95 hover:shadow-[0_0_40px_rgba(99,102,241,0.4)]"
            >
              <Play className="w-8 h-8 ml-1 fill-current" />
            </button>
          ) : (
            <button 
              onClick={stop}
              className="group relative flex items-center justify-center w-20 h-20 bg-slate-800 hover:bg-red-500/20 text-slate-300 hover:text-red-400 border border-slate-700 hover:border-red-500/50 rounded-full transition-all duration-300 active:scale-95"
            >
              <Square className="w-8 h-8 fill-current" />
            </button>
          )}

          {/* Settings */}
          <div className="flex flex-col items-center justify-center space-y-4 p-4 rounded-2xl bg-slate-900/50 border border-slate-800/80 w-full max-w-sm transition-opacity duration-300" style={{ opacity: isTesting ? 0.3 : 1, pointerEvents: isTesting ? 'none' : 'auto' }}>
            <div className="flex items-center space-x-2 w-full">
               <Settings2 className="w-4 h-4 text-slate-500" />
               <span className="text-sm text-slate-400 font-medium">Threads</span>
               <div className="flex-1" />
               <select 
                 value={threads}
                 onChange={(e) => setThreads(parseInt(e.target.value))}
                 className="bg-slate-950 text-sm font-medium text-slate-300 outline-none cursor-pointer focus:ring-0 appearance-none text-center rounded px-3 py-1.5 border border-slate-800"
               >
                 <option value={1}>1 Thread</option>
                 <option value={4}>4 Threads</option>
                 <option value={8}>8 Threads</option>
                 <option value={16}>16 Threads</option>
               </select>
            </div>
            
            <div className="flex items-center space-x-2 w-full">
               <Download className="w-4 h-4 text-slate-500" />
               <span className="text-sm text-slate-400 font-medium whitespace-nowrap">DL Size (MB)</span>
               <div className="flex-1" />
               <input 
                 type="number"
                 min={1}
                 value={downloadSize}
                 onChange={(e) => setDownloadSize(parseInt(e.target.value) || 1)}
                 className="bg-slate-950 text-sm font-medium text-slate-300 outline-none focus:ring-0 text-center rounded px-3 py-1.5 border border-slate-800 w-28"
               />
            </div>

            <div className="flex items-center space-x-2 w-full">
               <Upload className="w-4 h-4 text-slate-500" />
               <span className="text-sm text-slate-400 font-medium whitespace-nowrap">UL Size (MB)</span>
               <div className="flex-1" />
               <input 
                 type="number"
                 min={1}
                 value={uploadSize}
                 onChange={(e) => setUploadSize(parseInt(e.target.value) || 1)}
                 className="bg-slate-950 text-sm font-medium text-slate-300 outline-none focus:ring-0 text-center rounded px-3 py-1.5 border border-slate-800 w-28"
               />
            </div>
          </div>
        </div>

      </div>
    </main>
  );
}
