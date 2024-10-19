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
const clearCanvas = () => {
    ctx.fillRect(0, 0, canvas.width, canvas.height);
};
ctx.fillStyle = "white";
clearCanvas();
app.appendChild(canvas);

// Sketchpad data
interface Point {
    x: number;
    y: number;
}
const strokes: Point[][] = [];
const drawEvent = new Event("drawing-changed"); // Observer drawing command
canvas.addEventListener("drawing-changed", () => {
    clearCanvas();
    for (const stroke of strokes) {
        ctx.beginPath();
        for (const point of stroke) {
            ctx.lineTo(point.x, point.y);
            ctx.stroke();
        }
    }
});

// Redo button
const redoButton = document.createElement("button");
redoButton.innerText = "Redo ↪";
const redoStack: Point[][] = [];
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

// Drawing logic
ctx.strokeStyle = "#792de6"
let isPainting = false;
canvas.addEventListener("mousedown", () => {
    isPainting = true;
    ctx.beginPath();
    strokes.push([]);
});
canvas.addEventListener("mouseup", () => { isPainting = false; });
canvas.addEventListener("mouseout", () => { isPainting = false; });
canvas.addEventListener("mousemove", (e) => {
    if (isPainting) {
        strokes[strokes.length - 1].push({
            x: e.offsetX,
            y: e.offsetY
        });
        redoStack.length = 0;
        canvas.dispatchEvent(drawEvent);
    }
});

// Controls div
const controls = document.createElement("div");
app.appendChild(controls);
controls.appendChild(undoButton);
controls.appendChild(redoButton);
controls.appendChild(clearButton);
