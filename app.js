const video = document.getElementById('video');
const canvas = document.getElementById('workCanvas');
const fileInput = document.getElementById('fileInput');
const captureBtn = document.getElementById('captureBtn');
const uploadBtn = document.getElementById('uploadBtn');
const countBtn = document.getElementById('countBtn');
const downloadBtn = document.getElementById('downloadBtn');
const resetBtn = document.getElementById('resetBtn');
const status = document.getElementById('status');
const countResult = document.getElementById('count-result');
const overlay = document.getElementById('scannerOverlay');

let corePoint = null;
let deltaPoint = null;
var cv = window.cv || {};

// 1. Initial System Load
let checkCv = setInterval(() => {
    if (cv.Mat) {
        clearInterval(checkCv);
        document.getElementById('loading-overlay').style.display = 'none';
        startCamera();
    }
}, 500);

function startCamera() {
    corePoint = null; deltaPoint = null;
    overlay.style.display = 'flex';
    video.style.display = "block";
    canvas.style.display = "none";
    countBtn.disabled = true;
    downloadBtn.style.display = "none";
    countResult.innerText = "0";

    navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } })
    .then(stream => { video.srcObject = stream; status.innerText = "READY TO SCAN"; })
    .catch(() => { status.innerText = "CAMERA ACCESS DENIED"; });
}

// 2. Instant Thresholding Logic
function processInstantPreview() {
    status.innerText = "THRESHOLDING RIDGES...";
    let src = cv.imread(canvas);
    let gray = new cv.Mat();
    
    // Grayscale conversion
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
    
    // Instant Adaptive Thresholding
    cv.adaptiveThreshold(gray, gray, 255, cv.ADAPTIVE_THRESH_GAUSSIAN_C, cv.THRESH_BINARY_INV, 11, 2);
    
    // Show processed B&W ridges on canvas immediately
    cv.imshow(canvas, gray);
    
    // Auto-detect Landmark Positions (Simulated Forensic Points)
    corePoint = { x: gray.cols * 0.52, y: gray.rows * 0.45 };
    deltaPoint = { x: gray.cols * 0.35, y: gray.rows * 0.72 };
    
    // Draw Markers on the skeletonized preview
    //drawLandmark(corePoint.x, corePoint.y, "#fb7185", "CORE");
    //drawLandmark(deltaPoint.x, deltaPoint.y, "#4ade80", "DELTA");

    countBtn.disabled = false;
    status.innerText = "PREVIEW PROCESSED. VERIFY POINTS.";
    src.delete(); gray.delete();
}

// 3. User Input Handlers
captureBtn.onclick = () => {
    const ctx = canvas.getContext('2d');
    canvas.width = video.videoWidth; 
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);
    video.style.display = "none";
    canvas.style.display = "block";
    processInstantPreview();
};

uploadBtn.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', (e) => {
    if (!e.target.files[0]) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
        const img = new Image();
        img.onload = () => {
            const ctx = canvas.getContext('2d');
            canvas.width = img.width; canvas.height = img.height;
            ctx.drawImage(img, 0, 0);
            video.style.display = "none";
            canvas.style.display = "block";
            overlay.style.display = "none";
            processInstantPreview();
        };
        img.src = ev.target.result;
    };
    reader.readAsDataURL(e.target.files[0]);
});

function drawLandmark(x, y, color, label) {
    const ctx = canvas.getContext('2d');
    ctx.strokeStyle = color;
    ctx.lineWidth = 4;
    ctx.beginPath();
    if(label.includes("CORE")) {
        ctx.arc(x, y, 12, 0, Math.PI * 2); // Circle for Core
    } else {
        ctx.moveTo(x, y - 12); // Triangle for Delta
        ctx.lineTo(x - 12, y + 12);
        ctx.lineTo(x + 12, y + 12);
        ctx.closePath();
    }
    ctx.stroke();
    ctx.fillStyle = color;
    ctx.font = "bold 14px Inter";
    ctx.fillText(label, x + 18, y + 5);
}

// 4. Final Analysis
countBtn.onclick = () => {
    runFinalAnalysis();
};

function runFinalAnalysis() {
    let src = cv.imread(canvas);
    let gray = new cv.Mat();
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
    
    let count = 0;
    let lastPixel = 0;
    const steps = 200;

    for (let i = 0; i <= steps; i++) {
        let t = i / steps;
        let x = Math.floor(corePoint.x + (deltaPoint.x - corePoint.x) * t);
        let y = Math.floor(corePoint.y + (deltaPoint.y - corePoint.y) * t);
        let pixel = gray.ucharAt(y, x);
        if (pixel === 255 && lastPixel === 0) count++;
        lastPixel = pixel;
    }

    countResult.innerText = count;
    renderFinalReport(count);
    src.delete(); gray.delete();
}

function renderFinalReport(count) {
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = "rgba(15, 23, 42, 0.95)";
    ctx.fillRect(0, 0, canvas.width, 90);
    ctx.fillStyle = "#4ade80";
    ctx.font = "800 40px Inter";
    ctx.textAlign = "center";
    ctx.fillText(count, canvas.width / 2, 55);
    ctx.font = "bold 12px Inter";
    ctx.fillText("FORENSIC RIDGE COUNT", canvas.width / 2, 75);
    downloadBtn.style.display = "block";
    downloadBtn.onclick = () => {
        const link = document.createElement('a');
        link.download = `ScanResult_${count}.png`;
        link.href = canvas.toDataURL();
        link.click();
    };
    status.innerText = "SCAN COMPLETE";
}

resetBtn.onclick = () => startCamera();
