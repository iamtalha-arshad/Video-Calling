const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { spawn } = require('child_process');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = 3000;
app.use(express.static('../frontend')); // Serve frontend files

let callActive = false;
let ffmpegProcess = null;

// Socket.IO signaling and recording logic
io.on('connection', (socket) => {
    console.log(`Client connected: ${socket.id}`);

    // Handle creating/joining a call
    socket.on('createCall', () => {
        if (callActive) {
            socket.emit('error', 'A call is already active.');
        } else {
            callActive = true;
            socket.emit('callCreated');
            console.log('Call created');
        }
    });

    socket.on('joinCall', () => {
        if (callActive) {
            socket.emit('callJoined');
            console.log(`Client joined the call: ${socket.id}`);
        } else {
            socket.emit('error', 'No active call to join.');
        }
    });

    // Start recording when the call begins
    socket.on('startRecording', (streamData) => {
        const outputPath = `./recordings/${Date.now()}_call.mp4`;

        ffmpegProcess = spawn('ffmpeg', [
            '-y', // Overwrite output files
            '-i', 'pipe:0', // Input from stdin (stream data)
            '-c:v', 'libx264', // Video codec
            '-preset', 'ultrafast', // Encoding speed
            outputPath,
        ]);

        ffmpegProcess.stdin.on('error', (err) => {
            console.error('FFmpeg stdin error:', err);
        });

        ffmpegProcess.stderr.on('data', (data) => {
            console.log('FFmpeg log:', data.toString());
        });

        console.log(`Recording started: ${outputPath}`);
    });

    // Stop recording and close FFmpeg process
    socket.on('stopRecording', () => {
        if (ffmpegProcess) {
            ffmpegProcess.stdin.end();
            ffmpegProcess.kill();
            console.log('Recording stopped.');
        }
    });

    // Handle disconnections
    socket.on('disconnect', () => {
        console.log(`Client disconnected: ${socket.id}`);
    });
});

server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
