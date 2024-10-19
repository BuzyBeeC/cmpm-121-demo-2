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
ctx.fillStyle = "white";
ctx.fillRect(0, 0, canvas.width, canvas.height);
app.appendChild(canvas);

// Drawing logic
interface Point {
    x: number;
    y: number;
}
const drawEvent = new Event("drawing-changed"); // Custom observer drawing event

ctx.strokeStyle = "#792de6"
let isPainting = false;
const strokes: Point[][] = [];
canvas.addEventListener("mousedown", (e) => {
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
        canvas.dispatchEvent(drawEvent);
    }
});
const clear = () => {
    ctx.fillRect(0, 0, canvas.width, canvas.height);
};
canvas.addEventListener("drawing-changed", () => {
    clear();
    for (const stroke of strokes) {
        ctx.beginPath();
        for (const point of stroke) {
            ctx.lineTo(point.x, point.y);
            ctx.stroke();
        }
    }
});

// Controls div
const controls = document.createElement("div");
app.appendChild(controls);

// Clear button
const clearButton = document.createElement("button");
clearButton.innerText = "Clear ✖";
clearButton.addEventListener("click", () => {
    clear();
    strokes.length = 0;
});
controls.appendChild(clearButton);
