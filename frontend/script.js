const socket = io('http://localhost:3000');
let localStream;
let mediaRecorder;

// DOM elements
const localVideo = document.getElementById('localVideo');
const createCallBtn = document.getElementById('createCallBtn');
const joinCallBtn = document.getElementById('joinCallBtn');
const endCallBtn = document.getElementById('endCallBtn');

// Functions
async function getCameraAccess() {
    try {
        localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        localVideo.srcObject = localStream;
        console.log('Camera access granted.');
    } catch (err) {
        alert('Camera access is required to proceed.');
        console.error('Camera access denied:', err);
    }
}

function stopCamera() {
    if (localStream) {
        localStream.getTracks().forEach((track) => track.stop());
        localStream = null;
        console.log('Camera stopped.');
    }
}

function startRecording() {
    if (!localStream) {
        console.error('No local stream available to record.');
        return;
    }

    mediaRecorder = new MediaRecorder(localStream, { mimeType: 'video/webm' });

    mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
            console.log('Sending video chunk to backend, size:', event.data.size);
            socket.emit('videoData', event.data);
        }
    };

    mediaRecorder.start(100); // Send data every 100ms
    console.log('Recording started.');
    socket.emit('startRecording'); // Notify the backend to start FFmpeg
}
function stopRecording() {
    if (mediaRecorder) {
        mediaRecorder.stop();
        console.log('Recording stopped.');
    }
}

// Button event listeners
createCallBtn.addEventListener('click', async () => {
    if (!localStream) await getCameraAccess();
    socket.emit('createCall');
});

joinCallBtn.addEventListener('click', async () => {
    if (!localStream) await getCameraAccess();
    socket.emit('joinCall');
});

endCallBtn.addEventListener('click', () => {
    socket.emit('endCall');
    stopRecording();
    stopCamera();
});

// Socket.IO event handlers
socket.on('callCreated', (hostId) => {
    alert(`Meeting created by ${hostId}`);
    createCallBtn.style.display = 'none';
    joinCallBtn.style.display = 'none';
    endCallBtn.style.display = 'inline-block';
    startRecording();
});

socket.on('callJoined', (participantId) => {
    alert(`Participant ${participantId} joined the meeting.`);
    createCallBtn.style.display = 'none';
    joinCallBtn.style.display = 'none';
    endCallBtn.style.display = 'inline-block';
    startRecording();
});

socket.on('callEnded', () => {
    alert('The meeting has ended.');
    stopRecording();
    stopCamera();
    createCallBtn.style.display = 'inline-block';
    joinCallBtn.style.display = 'inline-block';
    endCallBtn.style.display = 'none';
});

socket.on('error', (msg) => {
    alert(msg);
    console.error('Error:', msg);
});
