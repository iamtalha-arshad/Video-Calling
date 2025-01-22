const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { spawn } = require('child_process');
const fs = require('fs');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = 3000;

// Enable CORS
app.use(cors());

// Serve frontend
app.use(express.static('../frontend'));

let meetingActive = false;
let ffmpegProcess = null;

// Socket.IO signaling and recording logic
io.on('connection', (socket) => {
    console.log(`Client connected: ${socket.id}`);

    // Handle creating a call
    socket.on('createCall', () => {
        if (meetingActive) {
            socket.emit('error', 'A meeting is already active.');
        } else {
            meetingActive = true;
            socket.join('meeting'); // Join the "meeting" room
            io.to('meeting').emit('callCreated', socket.id);
            console.log(`Meeting created by ${socket.id}`);
        }
    });

    // Handle joining a call
    socket.on('joinCall', () => {
        if (meetingActive) {
            socket.join('meeting');
            io.to('meeting').emit('callJoined', socket.id);
            console.log(`Client ${socket.id} joined the meeting`);
        } else {
            socket.emit('error', 'No active meeting to join.');
        }
    });

    // Start recording
    socket.on('startRecording', () => {
        if (!meetingActive) {
            console.error('No active meeting. Cannot start recording.');
            return;
        }

        const outputPath = `./recordings/${Date.now()}_meeting.mp4`;
        console.log('Starting FFmpeg process for recording...');

        // Start FFmpeg process
        ffmpegProcess = spawn('ffmpeg', [
            '-y', // Overwrite output files
            '-f', 'webm', // Input format for WebRTC video
            '-i', 'pipe:0', // Input from stdin
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

        ffmpegProcess.on('close', (code) => {
            console.log(`FFmpeg process exited with code ${code}`);
        });

        console.log(`Recording started: ${outputPath}`);
    });

    // Receive video data from the client
    socket.on('videoData', (chunk) => {
        console.log('Received video data chunk of size:', chunk.byteLength); // Debug log
        if (ffmpegProcess) {
            ffmpegProcess.stdin.write(Buffer.from(chunk));
        } else {
            console.error('FFmpeg process is not running.');
        }
    });

    // End the meeting
    socket.on('endCall', () => {
        if (ffmpegProcess) {
            ffmpegProcess.stdin.end();
            ffmpegProcess.kill();
            ffmpegProcess = null;
            console.log('Recording stopped.');
        }
        meetingActive = false;
        io.to('meeting').emit('callEnded');
        console.log('Meeting ended.');
    });

    // Handle disconnection
    socket.on('disconnect', () => {
        console.log(`Client disconnected: ${socket.id}`);
        if (!io.sockets.adapter.rooms.get('meeting')) {
            meetingActive = false;
            if (ffmpegProcess) {
                ffmpegProcess.stdin.end();
                ffmpegProcess.kill();
                ffmpegProcess = null;
            }
            console.log('Meeting automatically ended due to no participants.');
        }
    });
});

server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
