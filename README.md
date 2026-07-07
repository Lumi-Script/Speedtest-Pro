# SpeedTest Pro

SpeedTest Pro is a highly accurate, threaded network benchmark tool built with Next.js 15. It measures your download and upload speeds using highly-optimized Edge API routes that saturate the network connection.

## Features

- **Blazing Fast Edge API**: Download and upload API endpoints run on the Next.js Edge Runtime, bypassing Node.js overhead for maximum network throughput.
- **Threaded Architecture**: Select from 1 to 16 threads for simultaneous transfers, allowing you to accurately test even 10+ Gbps connections.
- **Incompressible Payload**: Generates pure cryptographic random bytes for downloads, completely defeating compression proxies or ISP traffic shaping algorithms.
- **Beautiful UI**: Modern, sleek interface built with Tailwind CSS and Lucide icons.
- **Docker Ready**: Includes a heavily optimized, multi-stage Dockerfile that produces a minimal (~45MB compressed) standalone image with layered caching.

## Getting Started

### Docker Deployment

SpeedTest Pro is designed to run in a Docker container using a highly optimized standalone build.

```bash
docker run -p 3000:3000 ghcr.io/xiliourt/speedjs:latest
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

### Local Development

1. Install dependencies:
```bash
npm install
```

2. Run the development server:
```bash
npm run dev
```

## Built With
- Next.js (App Router)
- React 19
- Tailwind CSS
- Lucide React
