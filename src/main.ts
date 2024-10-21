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
const clearCanvas = () => {
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
}

interface Point {
    x: number;
    y: number;
}

// ToolPreview and Tool command patterns
interface ToolPreview {
    x: number;
    y: number;
    draw: (context: CanvasRenderingContext2D) => void;
}
let toolPreview: ToolPreview | null = null;
interface Tool {
    name: string;
    _size: number;
    activate: () => void;
    createToolPreview: (x: number, y: number) => ToolPreview;
}
const createTool: (name: string, size: number) => Tool = (name, size) => {
    return {
        name,
        _size: size,
        activate: function () { ctx.lineWidth = this._size; },
        createToolPreview: function (x, y) {
            const size = this._size;
            return {
                x, y,
                draw: function (context) {
                    context.fillStyle = "black";
                    context.fillRect(
                        this.x - (size / 2),
                        this.y - (size / 2),
                        size, size
                    );
                }
            };
        }
    };
}
const tools: Tool[] = [
    createTool("thin", 2),
    createTool("thick", 5)
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

// Drawing and Tool icon observer patterns
const redraw = () => {
    clearCanvas();
    strokes.forEach(stroke => stroke.display(ctx));
    if (toolPreview) {
        toolPreview.draw(ctx);
    }
}
canvas.addEventListener("drawing-changed", redraw);
canvas.addEventListener("tool-moved", redraw);

// Drawing logic
let isPainting = false;
canvas.addEventListener("mousedown", (e) => {
    strokes.push(createStroke(e.offsetX, e.offsetY));
    isPainting = true;
    redoStack = [];
    canvas.dispatchEvent(new Event("drawing-changed"));
});
canvas.addEventListener("mousemove", (e) => {
    toolPreview = getCurrentTool().createToolPreview(e.offsetX, e.offsetY);
    canvas.dispatchEvent(new CustomEvent(
        "tool-moved",
        { detail: {x: e.offsetX, y: e.offsetY} }
    ));

    ctx.strokeStyle = "#792de6";
    if (isPainting) {
        getLastStroke()?.drag(e.offsetX, e.offsetY);
        canvas.dispatchEvent(new Event("drawing-changed"));
    }
});
canvas.addEventListener("mouseup", () => {
    isPainting = false;
});
canvas.addEventListener("mouseleave", () => {
    isPainting = false;
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

// Draw history logic
let redoStack: Stroke[] = [];
const historyButtons: ButtonMap = new Map();
historyButtons.set("undo", createButton("Undo ↩", () => {
    const undoStroke = strokes.pop();
    if (undoStroke) {
        redoStack.push(undoStroke);
        canvas.dispatchEvent(new Event("drawing-changed"));
    }
}));
historyButtons.set("redo", createButton("Redo ↪", () => {
    const redoStroke = redoStack.pop();
    if (redoStroke) {
        strokes.push(redoStroke);
        canvas.dispatchEvent(new Event("drawing-changed"));
    }
}));
historyButtons.set("clear", createButton("Clear ✖", () => {
    clearCanvas();
    strokes = [];
    redoStack = [];
}));

// Append elements
app.appendChild(gameTitle);
clearCanvas();
app.appendChild(canvas);
appendButtonDiv(app, historyButtons);
updateToolButtonStates();
appendButtonDiv(app, toolsButtons);
