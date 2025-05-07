
document.getElementById("enter-museum").addEventListener("click", function() {
    window.location.href = "Museum/museum.html";
});

const canvasWidth  = 400;
const canvasHeight = 400;
const svgFilePath  = "assets/globe-inverted.svg";

let points    = [];
let startTime = Date.now();

// Define a palette of colors for the points/lines
let colors        = [];
const colorPalette = [
  "#4285f4", "#34A853", "#FBBC05", "#EA4335"
];
function hexToRgb(hex) {
  hex = hex.replace('#', '');
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  return { r, g, b };
}
function generateColors(n) {
  for (let i = 0; i < n; i++) {
    const randomIndex = Math.floor(Math.random() * colorPalette.length);
    colors.push(colorPalette[randomIndex]);
  }
}

async function loadSVG(filePath) {
  try {
      const response = await fetch(filePath);
      if (!response.ok) throw new Error("Failed to load SVG file");        
      const svgText = await response.text();
      points = extractPathsFromSVG(svgText);
      generateColors(points.length);
      drawPoints();
  } catch (error) {
      console.error("Error loading SVG:", error);
  }
}

function extractPathsFromSVG(svgString) {
  const parser = new DOMParser();
  const svgDoc = parser.parseFromString(svgString, "image/svg+xml");
  const paths = svgDoc.querySelectorAll("path");
  let allPoints = [];
  let viewBox = svgDoc.documentElement.getAttribute('viewBox'); // Get viewBox if available
  let svgWidth, svgHeight;

  // Default scaling (in case no viewBox is found)
  if (viewBox) {
    const [minX, minY, width, height] = viewBox.split(' ').map(Number);
    svgWidth = width;
    svgHeight = height;
  } else {
    svgWidth  = canvasWidth;
    svgHeight = canvasHeight;
  }

  paths.forEach(path => {
    const d = path.getAttribute("d");
    if (d) {
      allPoints.push(...parseSVGPath(d));
    }
  });

  // Scale points to fit canvas size
  allPoints = scalePoints(allPoints, svgWidth, svgHeight);
  return allPoints;
}

function scalePoints(points, svgWidth, svgHeight) {
  // Find min and max values for scaling
  const minX = Math.min(...points.map(p => p.x));
  const minY = Math.min(...points.map(p => p.y));
  const maxX = Math.max(...points.map(p => p.x));
  const maxY = Math.max(...points.map(p => p.y));

  const scaleX = canvasWidth / (maxX - minX);
  const scaleY = canvasHeight / (maxY - minY);

  const scale = Math.min(scaleX, scaleY);

  return points.map(p => ({
    x: (p.x - minX) * scale + 20,
    y: (p.y - minY) * scale + 20
  }));
}

function cubicBezier(p0, p1, p2, p3, t) {
  // Cubic Bézier curve formula
  const x = Math.pow(1 - t, 3) * p0.x + 3 * Math.pow(1 - t, 2) * t * p1.x + 3 * (1 - t) * Math.pow(t, 2) * p2.x + Math.pow(t, 3) * p3.x;
  const y = Math.pow(1 - t, 3) * p0.y + 3 * Math.pow(1 - t, 2) * t * p1.y + 3 * (1 - t) * Math.pow(t, 2) * p2.y + Math.pow(t, 3) * p3.y; 
  return { x, y };
}

function parseSVGPath(d) {
  const commands = d.match(/[MLCZmlcz][-0-9.,\s]+/g) || [];
  let points = [];
  let currentX = 0, currentY = 0;

  commands.forEach(cmd => {
    const type = cmd.charAt(0);
    const coords = cmd.slice(1).trim().split(/[\s,]+/).map(Number);

    if (type === 'M' || type === 'L') {  // Absolute Move or Line
      for (let i = 0; i < coords.length; i += 2) {
        currentX = coords[i];
        currentY = coords[i + 1];
        points.push({ x: currentX, y: currentY });
      }
    } else if (type === 'm' || type === 'l') { // Relative Move or Line
      for (let i = 0; i < coords.length; i += 2) {
        currentX += coords[i];
        currentY += coords[i + 1];
        points.push({ x: currentX, y: currentY });
      }
    } else if (type === 'C') { // Absolute Cubic Bézier
      for (let i = 0; i < coords.length; i += 6) {
        const [cx1, cy1, cx2, cy2, x, y] = coords.slice(i, i + 6);
        // Sample more points along the Bézier curve using cubicBezier function
        for (let t = 0; t <= 1; t += 0.1) { // Sample 10 points
          const point = cubicBezier({x: currentX, y: currentY}, {x: cx1, y: cy1}, {x: cx2, y: cy2}, {x, y}, t);
          points.push(point);
        }
        currentX = x;
        currentY = y;
      }
    } else if (type === 'c') { // Relative Cubic Bézier
      for (let i = 0; i < coords.length; i += 6) {
        const [rx1, ry1, rx2, ry2, rx, ry] = coords.slice(i, i + 6);
        const cx1 = currentX + rx1, cy1 = currentY + ry1;
        const cx2 = currentX + rx2, cy2 = currentY + ry2;
        const x = currentX + rx, y = currentY + ry;
        
        // Sample more points along the Bézier curve using cubicBezier function
        for (let t = 0; t <= 1; t += 0.3) { // Sample 10 points
          const point = cubicBezier({x: currentX, y: currentY}, {x: cx1, y: cy1}, {x: cx2, y: cy2}, {x, y}, t);
          points.push(point);
        }

        currentX = x;
        currentY = y;
      }
    } else if (type === 'Z' || type === 'z') { // Close path
      if (points.length > 0) {
        //points.push(points[0]); // Close the path
      }
    }
  });

  return points;
}

let mouseX = 0, mouseY = 0;
const repulsionRadius = 50;
const repulsionStrength = 20;

document.addEventListener("mousemove", (event) => {
  const rect = canvas.getBoundingClientRect();
  mouseX = event.clientX - rect.left;
  mouseY = event.clientY - rect.top;
});

function drawPoints() {
  const canvas = document.getElementById('canvas');
  const ctx = canvas.getContext('2d');
  canvas.width = canvasWidth + 50;
  canvas.height = canvasHeight + 50;
  const elapsedTime = (Date.now() - startTime) / 1000; // Time in seconds

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  let color_index = 0;
  for (let i = 0; i < points.length - 1; i++) {
    // main color
    const color = colors[i];
    
    // Draw the points with floating effect
    ctx.fillStyle = color; 
    const p1      = points[i];
    let offsetX1 = Math.sin(elapsedTime + p1.x * 0.1) * 5;
    let offsetY1 = Math.cos(elapsedTime + p1.y * 0.1) * 5;

    // Calculate distance to mouse
    let dx = p1.x - mouseX;
    let dy = p1.y - mouseY;
    let distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance < repulsionRadius && distance > 0) {
      let force = (repulsionRadius - distance) / repulsionRadius;
      offsetX1 += (dx / distance) * force * repulsionStrength;
      offsetY1 += (dy / distance) * force * repulsionStrength;
    }

    ctx.beginPath();
    ctx.arc(p1.x + offsetX1, p1.y + offsetY1, 2, 0, Math.PI * 2);
    ctx.fill();

    // Draw lines between consecutive points
    ctx.strokeStyle = color;
    ctx.lineWidth   = 0.5;
    const p2 = points[i + 1];
    const offsetX2 = Math.sin(elapsedTime + p2.x * 0.1) * 5;
    const offsetY2 = Math.cos(elapsedTime + p2.y * 0.1) * 5;

    ctx.beginPath();
    ctx.moveTo(p1.x + offsetX1, p1.y + offsetY1);
    ctx.lineTo(p2.x + offsetX2, p2.y + offsetY2);
    ctx.stroke();
   
    // aux color
    const { r, g, b } = hexToRgb(color);
    const alpha       = 0.2
    const aux_color1  = `rgba(${r}, ${g}, ${b}, ${alpha})`;

    const k1 = 3;
    const k2 = 5;

    // Draw lines to k previous points (if any)
    for (let j = k1; j <= k2; j++) {
      if (i - j >= 0) {
        let prev = points[i - j];
        const offsetX_prev = Math.sin(elapsedTime + prev.x * 0.1) * 5;
        const offsetY_prev = Math.cos(elapsedTime + prev.y * 0.1) * 5;
        
        // Set color with lower alpha (semi-transparent)
        ctx.strokeStyle = aux_color1;
        ctx.beginPath();
        ctx.moveTo(p1.x + offsetX1, p1.y + offsetY1);
        ctx.lineTo(prev.x + offsetX_prev, prev.y + offsetY_prev);
        ctx.stroke();
      }
    }
    // Draw lines to k next points (if any)
    for (let j = k1; j <= k2; j++) {
      if (i + j < points.length) {
        let next = points[i + j];
        const offsetX_next = Math.sin(elapsedTime + next.x * 0.1) * 5;
        const offsetY_next = Math.cos(elapsedTime + next.y * 0.1) * 5;

        // Set color with lower alpha (semi-transparent)
        ctx.strokeStyle = aux_color1;
        ctx.beginPath();
        ctx.moveTo(p1.x + offsetX1, p1.y + offsetY1);
        ctx.lineTo(next.x + offsetX_next, next.y + offsetY_next);
        ctx.stroke();
      }
    }

  }

  // Request next animation frame
  requestAnimationFrame(drawPoints);
}

// Function to split text into individual letters and wrap them in <span> tags
function createLetterSpans(text) {
  const container = document.getElementById('hoverText');
  container.innerHTML = ''; // Clear existing content
  let index = 0;
  text.split('').forEach(char => {
    const span = document.createElement('span');
    span.textContent = char;
    span.style.animationDelay = `${index * 0.1}s`; // Stagger by 0.1s
    container.appendChild(span);
    index += 1;
  });
}

// Initialize the text
createLetterSpans("CONNECTED   EARTH");
loadSVG(svgFilePath); // Load and render SVG file

