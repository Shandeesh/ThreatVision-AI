import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { spawn } from 'child_process';

const app = express();
app.use(cors());

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

const PORT = 3001;

io.on('connection', (socket) => {
  console.log('Client connected');

  // Use tshark to capture packets
  // -T json: output in JSON format
  // -e: specify fields to include
  // -l: line buffered
  const tshark = spawn('tshark', [
    '-T', 'json',
    '-e', 'frame.time',
    '-e', 'ip.src',
    '-e', 'ip.dst',
    '-e', '_ws.col.Protocol',
    '-e', 'tcp.srcport',
    '-e', 'tcp.dstport',
    '-e', 'udp.srcport',
    '-e', 'udp.dstport',
    '-e', 'frame.len',
    '-l'
  ]);

  let buffer = '';

  tshark.stdout.on('data', (data) => {
    buffer += data.toString();
    
    // tshark -T json outputs an array of objects.
    // We need to parse individual objects or the whole array when it's closed.
    // However, for real-time, we want to emit as soon as a packet is captured.
    // Tshark outputs [ at start and ] at end, and , between objects.
    
    const lines = buffer.split('\n');
    buffer = lines.pop(); // Keep the last incomplete line

    for (const line of lines) {
      const trimmedLine = line.trim();
      if (trimmedLine === '[' || trimmedLine === ']' || trimmedLine === ',') continue;
      
      try {
        const packetData = JSON.parse(trimmedLine.endsWith(',') ? trimmedLine.slice(0, -1) : trimmedLine);
        const source = packetData._source.layers;
        
        const packet = {
          id: Date.now() + Math.random(),
          source: source['ip.src'] ? source['ip.src'][0] : 'Unknown',
          destination: source['ip.dst'] ? source['ip.dst'][0] : 'Unknown',
          protocol: source['_ws.col.Protocol'] ? source['_ws.col.Protocol'][0] : 'Unknown',
          port: source['tcp.dstport'] ? parseInt(source['tcp.dstport'][0]) : (source['udp.dstport'] ? parseInt(source['udp.dstport'][0]) : 0),
          size: source['frame.len'] ? parseInt(source['frame.len'][0]) : 0,
          timestamp: new Date().toLocaleTimeString("en-US", { hour12: false }),
          isThreat: Math.random() > 0.95, // Still simulating threats for now, but on real traffic
          status: Math.random() > 0.95 ? "blocked" : "allowed",
          country: "US", // Mapping IP to country would require a GeoIP lib, keeping it simple for now
        };

        socket.emit('packet', packet);
      } catch (e) {
        // Incomplete JSON or other error
      }
    }
  });

  tshark.stderr.on('data', (data) => {
    console.error(`tshark stderr: ${data}`);
  });

  tshark.on('close', (code) => {
    console.log(`tshark process exited with code ${code}`);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected');
    tshark.kill();
  });
});

httpServer.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
