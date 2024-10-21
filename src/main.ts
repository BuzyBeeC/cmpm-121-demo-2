import "./style.css";

const APP_NAME = "Brian's Sticker Sketchpad";
const app = document.querySelector<HTMLDivElement>("#app")!;

document.title = APP_NAME;
const gameTitle = document.createElement("h1");
gameTitle.innerText = APP_NAME;

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

interface Point {
    x: number;
    y: number;
}

// Tool command pattern
interface Tool {
    name: string;
    activate: () => void;
}
const tools: Tool[] = [
    { name: "thin", activate: () => ctx.lineWidth = 1 },
    { name: "thick", activate: () => ctx.lineWidth = 5 }
];
let currentToolIndex = 0;
function getCurrentTool() {
    return tools[currentToolIndex];
}
function setCurrentTool(name: string) {
    currentToolIndex = tools.findIndex(tool => tool.name === name);
    if (currentToolIndex === -1) {
        currentToolIndex = 0;
    }
    getCurrentTool().activate();
}
function getLastStroke() {
    return (strokes.length > 0) ? strokes[strokes.length - 1] : null;
}

// Stroke command pattern
interface Stroke {
    points: Point[];
    display: (context: CanvasRenderingContext2D) => void;
    drag: (x: number, y: number) => void;
    tool: Tool;
}
let strokes: Stroke[] = [];
function createStroke(startX: number, startY: number): Stroke {
    return {
        points: [{
            x: startX,
            y: startY
        }],
        display: function (context) {
            const lastTool = getCurrentTool().name;
            setCurrentTool(this.tool.name);
            context.beginPath();
            this.points.forEach(point => {
                context.lineTo(point.x, point.y);
                context.stroke();
            });
            setCurrentTool(lastTool);
        },
        drag: function (x, y) {
            this.points.push({ x, y });
        },
        tool: getCurrentTool()
    };
}

// Drawing observer pattern
const drawEvent = new Event("drawing-changed");
canvas.addEventListener("drawing-changed", () => {
    clearCanvas();
    strokes.forEach(stroke => stroke.display(ctx));
});

// Button factory
type ButtonMap = Map<string, HTMLButtonElement>;
function createButton(text: string, onClick: () => void) {
    const button = document.createElement("button");
    button.innerText = text;
    button.addEventListener("click", onClick);
    return button;
}
function appendButtonDiv(parent: Node, buttons: ButtonMap) {
    const div = document.createElement("div");
    for (const [_, button] of buttons) {
        div.appendChild(button);
    }
    parent.appendChild(div);
}

// Tools buttons
const toolsButtons: ButtonMap = new Map();
function updateToolButtonStates() {
    toolsButtons.forEach((button, name) => {
        button.disabled = name === getCurrentTool().name;
        if (button.disabled) {
            button.classList.add("selectedTool");
        } else {
            button.classList.remove("selectedTool");
        }
    });
}
toolsButtons.set("thin", createButton("Thin", function (this: HTMLButtonElement) {
    setCurrentTool("thin");
    updateToolButtonStates();
}));
toolsButtons.set("thick", createButton("Thick", function () {
    setCurrentTool("thick");
    updateToolButtonStates();
}));

// History logic
let redoStack: Stroke[] = [];
const historyButtons: ButtonMap = new Map();
historyButtons.set("undo", createButton("Undo ↩", () => {
    const undoStroke = strokes.pop();
    if (undoStroke) {
        redoStack.push(undoStroke);
        canvas.dispatchEvent(drawEvent);
    }
}));
historyButtons.set("redo", createButton("Redo ↪", () => {
    const redoStroke = redoStack.pop();
    if (redoStroke) {
        strokes.push(redoStroke);
        canvas.dispatchEvent(drawEvent);
    }
}));
historyButtons.set("clear", createButton("Clear ✖", () => {
    clearCanvas();
    strokes = [];
    redoStack = [];
}));

// Drawing logic
ctx.strokeStyle = "#792de6";
let isPainting = false;
canvas.addEventListener("mousedown", (e) => {
    strokes.push(createStroke(e.offsetX, e.offsetY));
    isPainting = true;
    redoStack = [];
    canvas.dispatchEvent(drawEvent);
});
canvas.addEventListener("mousemove", (e) => {
    if (isPainting) {
        getLastStroke()?.drag(e.offsetX, e.offsetY);
        canvas.dispatchEvent(drawEvent);
    }
});
canvas.addEventListener("mouseup", () => {
    isPainting = false;
});
canvas.addEventListener("mouseout", () => {
    isPainting = false;
});

// Append elements
app.appendChild(gameTitle);
clearCanvas();
app.appendChild(canvas);
appendButtonDiv(app, historyButtons);
updateToolButtonStates();
appendButtonDiv(app, toolsButtons);
