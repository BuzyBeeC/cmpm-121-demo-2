import "./style.css";

const APP_NAME = "Brian's Sticker Sketchpad";
const app = document.querySelector<HTMLDivElement>("#app")!;

document.title = APP_NAME;

const gameTitle = document.createElement("h1");
gameTitle.innerText = APP_NAME;
app.appendChild(gameTitle);

// Initialize canvas and context
const canvas = document.createElement("canvas");
canvas.width = 256;
canvas.height = 256;
const ctx = canvas.getContext("2d");
if (!ctx) { throw new Error("Cannot get canvas context!"); }

function clearCanvas() {
    ctx?.fillRect(0, 0, canvas.width, canvas.height);
}

ctx.fillStyle = "white";
clearCanvas();
app.appendChild(canvas);

// Sketchpad data
interface Point {
    x: number;
    y: number;
}
interface Stroke {
    points: Point[];
    display: (context: CanvasRenderingContext2D) => void;
    drag: (x: number, y: number) => void;
}
const strokes: Stroke[] = [];
function getLastStroke() {
    return (strokes.length > 0) ? strokes[strokes.length - 1] : null;
}
// Stroke command pattern
function createStroke(startX: number, startY: number): Stroke {
    return {
        points: [{
            x: startX,
            y: startY
        }],
        display: function (context) {
            context.beginPath();
            this.points.forEach(point => {
                context.lineTo(point.x, point.y);
                context.stroke();
            });
        },
        drag: function (x, y) {
            this.points.push({ x, y });
        }
    };
}

// Drawing observer pattern
const drawEvent = new Event("drawing-changed");
canvas.addEventListener("drawing-changed", () => {
    clearCanvas();
    strokes.forEach(stroke => stroke.display(ctx));
});

// Redo button
const redoButton = document.createElement("button");
redoButton.innerText = "Redo ↪";
const redoStack: Stroke[] = [];
redoButton.addEventListener("click", () => {
    const redoStroke = redoStack.pop();
    if (redoStroke) {
        strokes.push(redoStroke);
        canvas.dispatchEvent(drawEvent);
    }
});

// Undo button
const undoButton = document.createElement("button");
undoButton.innerText = "Undo ↩";
undoButton.addEventListener("click", () => {
    const undoStroke = strokes.pop();
    if (undoStroke) {
        redoStack.push(undoStroke);
        canvas.dispatchEvent(drawEvent);
    }
});

// Clear button
const clearButton = document.createElement("button");
clearButton.innerText = "Clear ✖";
clearButton.addEventListener("click", () => {
    clearCanvas();
    strokes.length = 0;
    redoStack.length = 0;
});

// Controls div
const controls = document.createElement("div");
app.appendChild(controls);
controls.appendChild(undoButton);
controls.appendChild(redoButton);
controls.appendChild(clearButton);

// Drawing logic
ctx.strokeStyle = "#792de6";
let isPainting = false;
canvas.addEventListener("mousedown", (e) => {
    isPainting = true;
    strokes.push(createStroke(e.offsetX, e.offsetY));
    redoStack.length = 0;
    canvas.dispatchEvent(drawEvent);
});
canvas.addEventListener("mousemove", (e) => {
    if (isPainting) {
        getLastStroke()?.drag(e.offsetX, e.offsetY);
        canvas.dispatchEvent(drawEvent);
    }
});
canvas.addEventListener("mouseup", () => { isPainting = false; });
canvas.addEventListener("mouseout", () => { isPainting = false; });
