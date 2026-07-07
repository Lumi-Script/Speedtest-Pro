import { useState, useRef, useCallback } from 'react';

export type SpeedTestState = 'idle' | 'downloading' | 'uploading' | 'complete' | 'error';

export interface UseSpeedTestResult {
  state: SpeedTestState;
  downloadSpeedBps: number;
  uploadSpeedBps: number;
  downloadPeakSpeedBps: number;
  uploadPeakSpeedBps: number;
  progress: number;
  start: (threads: number, downloadSizeMb?: number, uploadSizeMb?: number) => void;
  stop: () => void;
  errorMsg: string | null;
}

const WORKER_CODE = `
let interval = null;
let activeController = null;
let activeXhr = null;

self.onmessage = async (e) => {
  const { type, command, url, id, payload } = e.data;

  if (command === 'cancel') {
    if (activeController) activeController.abort();
    if (activeXhr) activeXhr.abort();
    if (interval) clearInterval(interval);
    return;
  }

  if (type === 'download') {
    activeController = new AbortController();
    let loaded = 0;
    
    interval = setInterval(() => {
      self.postMessage({ id, loaded });
    }, 100);

    try {
      const res = await fetch(url, { signal: activeController.signal });
      if (!res.body) return;
      const reader = res.body.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) loaded += value.length;
      }
      clearInterval(interval);
      self.postMessage({ id, loaded, done: true });
    } catch (err) {
      clearInterval(interval);
      if (err.name !== 'AbortError') {
        self.postMessage({ id, loaded, error: err.message, done: true });
      } else {
        self.postMessage({ id, loaded, done: true });
      }
    }
  } else if (type === 'upload') {
    activeXhr = new XMLHttpRequest();
    let loaded = 0;
    
    interval = setInterval(() => {
      self.postMessage({ id, loaded });
    }, 100);

    activeXhr.open('POST', url, true);
    activeXhr.upload.onprogress = (e) => {
      loaded = e.loaded;
    };
    activeXhr.onload = () => {
      clearInterval(interval);
      self.postMessage({ id, loaded, done: true });
    };
    activeXhr.onerror = () => {
      clearInterval(interval);
      self.postMessage({ id, loaded, error: 'Upload failed', done: true });
    };
    activeXhr.onabort = () => {
       clearInterval(interval);
       self.postMessage({ id, loaded, done: true });
    };
    activeXhr.send(payload);
  }
};
`;

export function useSpeedTest(): UseSpeedTestResult {
  const [state, setState] = useState<SpeedTestState>('idle');
  const [downloadSpeedBps, setDownloadSpeedBps] = useState(0);
  const [uploadSpeedBps, setUploadSpeedBps] = useState(0);
  const [downloadPeakSpeedBps, setDownloadPeakSpeedBps] = useState(0);
  const [uploadPeakSpeedBps, setUploadPeakSpeedBps] = useState(0);
  const [progress, setProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const workersRef = useRef<Worker[]>([]);

  const stop = useCallback(() => {
    workersRef.current.forEach(w => {
      w.postMessage({ command: 'cancel' });
      w.terminate();
    });
    workersRef.current = [];

    setState('idle');
    setProgress(0);
  }, []);

  const createWorkers = (count: number) => {
    const blob = new Blob([WORKER_CODE], { type: 'application/javascript' });
    const url = URL.createObjectURL(blob);
    for (let i = 0; i < count; i++) {
       workersRef.current.push(new Worker(url));
    }
  };

  const start = useCallback(async (threads: number, downloadSizeMb: number = 1000, uploadSizeMb: number = 100) => {
    stop();
    setErrorMsg(null);
    setDownloadSpeedBps(0);
    setUploadSpeedBps(0);
    setDownloadPeakSpeedBps(0);
    setUploadPeakSpeedBps(0);
    setProgress(0);
    
    createWorkers(threads);

    try {
      // 1. Download Test
      setState('downloading');
      await runTest('download', workersRef.current, downloadSizeMb);
      
      // Reset progress for upload
      setProgress(0);
      
      // 2. Upload Test
      setState('uploading');
      await runTest('upload', workersRef.current, uploadSizeMb);
      
      setState('complete');
      setProgress(100);
    } catch (err: any) {
      if (err.message !== 'cancelled') {
        setState('error');
        setErrorMsg(err.message || 'An error occurred during the test.');
      }
    } finally {
      workersRef.current.forEach(w => w.terminate());
      workersRef.current = [];
    }
  }, [stop]);

  const runTest = (type: 'download' | 'upload', workers: Worker[], totalSizeMb: number) => {
    return new Promise<void>((resolve, reject) => {
      const startTime = performance.now();
      let isDone = false;
      let completedWorkers = 0;
      let peakSpeed = 0;

      const history: { time: number; bytes: number }[] = [];
      const totalBytesByWorker = new Array(workers.length).fill(0);
      const targetSizeMBPerWorker = Math.max(1, Math.ceil(totalSizeMb / workers.length));

      const calcInterval = setInterval(() => {
        if (isDone) return;
        if (workersRef.current.length === 0) {
           isDone = true;
           clearInterval(calcInterval);
           reject(new Error('cancelled'));
           return;
        }
        
        const now = performance.now();
        const elapsed = now - startTime;
        
        let totalBytesAllTime = totalBytesByWorker.reduce((a, b) => a + b, 0);
        
        history.push({ time: now, bytes: totalBytesAllTime });
        if (history.length > 15) history.shift(); // Keep last 15 samples (approx 3s)
        
        let speed = 0;
        const avgSpeed = (totalBytesAllTime / (elapsed / 1000)) * 8;
        
        if (history.length > 1) {
          const first = history[0];
          const last = history[history.length - 1];
          const dt = (last.time - first.time) / 1000;
          const db = last.bytes - first.bytes;
          
          if (dt > 0) {
            const instantSpeed = (db / dt) * 8;
            // Fallback to average speed if instant speed drops to 0 due to bursty progress events
            speed = instantSpeed > 0 ? instantSpeed : avgSpeed;
          } else {
            speed = avgSpeed;
          }
        } else {
          speed = avgSpeed;
        }
        
        peakSpeed = Math.max(peakSpeed, speed);

        if (type === 'download') {
           setDownloadSpeedBps(speed);
           setDownloadPeakSpeedBps(peakSpeed);
        } else {
           setUploadSpeedBps(speed);
           setUploadPeakSpeedBps(peakSpeed);
        }
        
        const expectedTotalBytes = targetSizeMBPerWorker * 1024 * 1024 * workers.length;
        setProgress(Math.min((totalBytesAllTime / expectedTotalBytes) * 100, 100));

        // Fail-safe timeout of 5 minutes
        if (elapsed >= 300000) {
          isDone = true;
          clearInterval(calcInterval);
           workers.forEach(w => w.postMessage({ command: 'cancel' }));
          resolve();
        }
      }, 200);

      // Create dummy payload (only for upload)
      let payload: Blob | undefined;
      if (type === 'upload') {
        const CHUNK_SIZE = 1024 * 1024;
        const chunk = new Uint8Array(CHUNK_SIZE);
        if (window.crypto && window.crypto.getRandomValues) {
          for (let i = 0; i < CHUNK_SIZE; i += 65536) {
            window.crypto.getRandomValues(chunk.subarray(i, i + Math.min(65536, CHUNK_SIZE - i)));
          }
        } else {
          for(let i=0; i<chunk.length; i++) chunk[i] = Math.floor(Math.random()*256);
        }
        const chunks = Array.from({ length: targetSizeMBPerWorker }).map(() => chunk);
        payload = new Blob(chunks, { type: 'application/octet-stream' });
      }

      workers.forEach((worker, i) => {
        const handler = (e: MessageEvent) => {
           if (e.data.id !== i) return;

           if (e.data.error) {
              console.error('Worker error:', e.data.error);
           }
           if (typeof e.data.loaded === 'number') {
              totalBytesByWorker[i] = e.data.loaded;
           }
           if (e.data.done) {
              worker.removeEventListener('message', handler);
              completedWorkers++;
              if (completedWorkers === workers.length && !isDone) {
                 isDone = true;
                 clearInterval(calcInterval);
                 
                 // Calculate final accurate overall speed
                 const finalElapsed = performance.now() - startTime;
                 const finalTotalBytes = totalBytesByWorker.reduce((a, b) => a + b, 0);
                 const finalSpeedBps = (finalTotalBytes / (finalElapsed / 1000)) * 8;
                 
                 if (type === 'download') setDownloadSpeedBps(finalSpeedBps);
                 else setUploadSpeedBps(finalSpeedBps);
                 
                 resolve();
              }
           }
        };
        worker.addEventListener('message', handler);

        const baseUrl = window.location.origin;
        // Start worker download/upload
        if (type === 'download') {
           worker.postMessage({ type: 'download', url: `${baseUrl}/api/download?size=${targetSizeMBPerWorker}&t=${Date.now()}_${i}`, id: i });
        } else {
           worker.postMessage({ type: 'upload', url: `${baseUrl}/api/upload?t=${Date.now()}_${i}`, id: i, payload });
        }
      });
    });
  };

  return {
    state,
    downloadSpeedBps,
    uploadSpeedBps,
    downloadPeakSpeedBps,
    uploadPeakSpeedBps,
    progress,
    start,
    stop,
    errorMsg
  };
}
