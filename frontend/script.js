const socket = io('http://localhost:3000');
let localStream;

// Elements
const localVideo = document.getElementById('localVideo');
const createCallBtn = document.getElementById('createCallBtn');
const joinCallBtn = document.getElementById('joinCallBtn');

// Request camera permissions
async function getCameraAccess() {
    try {
        localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        localVideo.srcObject = localStream;
        console.log('Camera access granted.');
    } catch (err) {
        alert('Camera access is required to create or join a call.');
        console.error('Camera access denied:', err);
    }
}

// Event handlers for buttons
createCallBtn.addEventListener('click', () => {
    if (!localStream) {
        alert('Camera access is required.');
        return;
    }
    socket.emit('createCall');
});

joinCallBtn.addEventListener('click', () => {
    if (!localStream) {
        alert('Camera access is required.');
        return;
    }
    socket.emit('joinCall');
});

// Handle socket events
socket.on('callCreated', () => {
    alert('Call created successfully.');
    socket.emit('startRecording', localStream);
});

socket.on('callJoined', () => {
    alert('Joined the call successfully.');
    socket.emit('startRecording', localStream);
});

socket.on('error', (msg) => {
    alert(msg);
    console.error('Error:', msg);
});

// Initialize camera access on load
getCameraAccess();
