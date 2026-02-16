const video = document.getElementById('video');
const canvas = document.getElementById('workCanvas');
const fileInput = document.getElementById('fileInput');
const captureBtn = document.getElementById('captureBtn');
const uploadBtn = document.getElementById('uploadBtn');
const countBtn = document.getElementById('countBtn');
const resetBtn = document.getElementById('resetBtn');
const status = document.getElementById('status');
const countResult = document.getElementById('count-result');

let videoTrack = null;
var cv = window.cv || {};

// 1. Initialize OpenCV and Camera
let checkCv = setInterval(() => {
    if (cv.Mat) {
        clearInterval(checkCv);
        document.getElementById('loading-overlay').style.display = 'none';
        startCamera();
    }
}, 500);

function startCamera() {
    navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: "environment", width: { ideal: 1280 } } 
    })
    .then(stream => {
        video.srcObject = stream;
        video.style.display = "block";
        canvas.style.display = "none";
        videoTrack = stream.getVideoTracks()[0];
        status.innerText = "CAMERA ACTIVE";
    })
    .catch(err => {
        status.innerText = "CAMERA ERROR: USE HTTPS";
    });
}

// 2. FIXED UPLOAD LOGIC
uploadBtn.onclick = () => fileInput.click();

fileInput.onchange = (e) => {
    if (e.target.files.length === 0) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
            const ctx = canvas.getContext('2d');
            // Ensure canvas matches image size
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);
            
            // UI Switch
            video.style.display = "none";
            canvas.style.display = "block";
            countBtn.disabled = false;
            status.innerText = "IMAGE LOADED - READY TO COUNT";
        };
        img.src = event.target.result;
    };
    reader.readAsDataURL(e.target.files[0]);
};

// 3. CAPTURE LOGIC
captureBtn.onclick = () => {
    const ctx = canvas.getContext('2d');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);
    
    video.style.display = "none";
    canvas.style.display = "block";
    countBtn.disabled = false;
    status.innerText = "CAPTURED - READY TO COUNT";
};

// 4. MAIN AI SCANNER
countBtn.onclick = () => {
    status.innerText = "SCANNING RIDGES...";
    
    try {
        // Create Matrices
        let src = cv.imread(canvas);
        let dst = new cv.Mat();
        
        // Step A: Convert to Gray
        cv.cvtColor(src, dst, cv.COLOR_RGBA2GRAY);
        
        // Step B: Adaptive Threshold (This makes the ridges pop)
        cv.adaptiveThreshold(dst, dst, 255, cv.ADAPTIVE_THRESH_GAUSSIAN_C, cv.THRESH_BINARY_INV, 11, 2);
        
        // Step C: Line Detection
        let lines = new cv.Mat();
        cv.HoughLinesP(dst, lines, 1, Math.PI / 180, 20, 15, 5);
        
        // Update Count
        countResult.innerText = lines.rows;
        
        // Show the processed result on canvas
        cv.imshow(canvas, dst);
        
        status.innerText = "SCAN COMPLETE";
        
        // Cleanup memory
        src.delete(); dst.delete(); lines.delete();
    } catch (err) {
        console.error(err);
        status.innerText = "AI ERROR: TRY AGAIN";
    }
};

resetBtn.onclick = () => {
    countResult.innerText = "0";
    startCamera();
};
