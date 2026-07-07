import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'edge';

// Pre-generate an 8MB buffer of random bytes globally to maximize throughput per request
// Using random bytes defeats compression proxies.
const CHUNK_SIZE = 8 * 1024 * 1024; // 8MB
const chunk = new Uint8Array(CHUNK_SIZE);
for (let i = 0; i < CHUNK_SIZE; i += 65536) {
  crypto.getRandomValues(chunk.subarray(i, i + Math.min(65536, CHUNK_SIZE - i)));
}

export function GET(req: NextRequest) {
  const url = new URL(req.url);
  // Default to 1000MB to allow for longer tests at ultra-high speeds (e.g. 40Gbps)
  const sizeMb = parseInt(url.searchParams.get('size') || '1000', 10);
  const totalBytes = sizeMb * 1024 * 1024;

  let sentBytes = 0;
  
  const stream = new ReadableStream({
    pull(controller) {
      if (sentBytes >= totalBytes) {
        controller.close();
        return;
      }
      
      // Stream in 1MB chunks to the client to balance overhead and streaming pipeline
      // 1MB is large enough to have low overhead but small enough for smooth event loops
      const bytesToSend = Math.min(1024 * 1024, totalBytes - sentBytes);
      controller.enqueue(chunk.subarray(0, bytesToSend));
      sentBytes += bytesToSend;
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'application/octet-stream',
      'Content-Length': totalBytes.toString(),
      'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
      'Content-Encoding': 'identity',
      'Access-Control-Allow-Origin': '*'
    }
  });
}
