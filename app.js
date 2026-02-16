const video = document.getElementById('video');
const imageSrc = document.getElementById('imageSrc');
const fileInput = document.getElementById('fileInput');
const canvasOutput = document.getElementById('canvasOutput');
const countResult = document.getElementById('count-result');

let mode = 'camera';
let isReady = false;

// 1. Wait for OpenCV to load
var cv = window.cv || {};
let timer = setInterval(() => {
    if (cv.Mat) {
        clearInterval(timer);
        document.getElementById('loading-overlay').style.display = 'none';
        isReady = true;
    }
}, 500);

// --- Camera Setup ---
document.getElementById('cameraBtn').onclick = () => {
    if(!isReady) return;
    mode = 'camera';
    imageSrc.style.display = 'none';
    video.style.display = 'block';
    
    navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } })
        .then(stream => {
            video.srcObject = stream;
            video.oncanplay = () => processLoop();
        })
        .catch(err => alert("Camera blocked. Use HTTPS."));
};

// --- Upload Setup ---
document.getElementById('uploadBtn').onclick = () => fileInput.click();
fileInput.onchange = (e) => {
    mode = 'image';
    const url = URL.createObjectURL(e.target.files[0]);
    imageSrc.src = url;
    imageSrc.onload = () => {
        video.style.display = 'none';
        imageSrc.style.display = 'block';
        processFrame(imageSrc);
    };
};

// --- Core Logic ---
function processFrame(sourceElement) {
    try {
        let src = cv.imread(sourceElement);
        let dst = new cv.Mat();
        
        // Step 1: Grayscale
        cv.cvtColor(src, dst, cv.COLOR_RGBA2GRAY);
        
        // Step 2: Adaptive Threshold (This makes the ridges visible)
        cv.adaptiveThreshold(dst, dst, 255, cv.ADAPTIVE_THRESH_GAUSSIAN_C, cv.THRESH_BINARY_INV, 11, 2);
        
        // Step 3: Count Ridges
        let lines = new cv.Mat();
        cv.HoughLinesP(dst, lines, 1, Math.PI / 180, 20, 10, 5);
        
        countResult.innerText = lines.rows;
        cv.imshow('canvasOutput', dst); // Show AI view on top

        // Cleanup
        src.delete(); dst.delete(); lines.delete();
    } catch (e) {
        console.error("OpenCV Error: ", e);
    }
}

function processLoop() {
    if (mode === 'camera' && !video.paused) {
        processFrame(video);
        requestAnimationFrame(processLoop);
    }
}