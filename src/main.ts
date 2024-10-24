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

// Stroke command pattern
interface Stroke {
    points: Point[];
    display: (context: CanvasRenderingContext2D) => void;
    drag: (x: number, y: number) => void;
    tool: Tool;
}

// Tool Preview and Tool command patterns
interface ToolPreview {
    x: number;
    y: number;
    draw: (context: CanvasRenderingContext2D) => void;
}
let toolPreview: ToolPreview | null = null;
interface Tool {
    name: string;
    activate: () => void;
    createToolPreview: (x: number, y: number) => ToolPreview;
    createStroke: (startX: number, startY: number) => Stroke;
}
const tools: Tool[] = [];
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
    toolPreview = getCurrentTool().createToolPreview(
        toolPreview?.x ?? 0,
        toolPreview?.y ?? 0
    );
}

// Marker tools
interface Marker {
    name: string;
    size: number;
}
const createMarkerTool: (marker: Marker) => Tool = (marker) => {
    return {
        name: marker.name,
        activate: function () {
            ctx.strokeStyle = "#792de6";
            ctx.lineWidth = marker.size;
        },
        createToolPreview: function (x, y) {
            return {
                x, y,
                draw: function (context) {
                    context.fillStyle = "black";
                    context.fillRect(
                        this.x - (marker.size / 2),
                        this.y - (marker.size / 2),
                        marker.size, marker.size
                    );
                }
            };
        },
        createStroke: function (startX, startY) {
            return {
                points: [{
                    x: startX,
                    y: startY
                }],
                display: function (context) {
                    const lastTool = getCurrentTool();
                    this.tool.activate();
                    context.beginPath();
                    this.points.forEach(point => {
                        context.lineTo(point.x, point.y);
                        context.stroke();
                    });
                    lastTool.activate();
                },
                drag: function (x, y) {
                    this.points.push({ x, y });
                },
                tool: this
            };
        }
    };
}
const markers: Marker[] = [
    { name: "thin", size: 2 },
    { name: "thick", size: 5 },
]
for (const marker of markers) {
    tools.push(createMarkerTool(marker));
}

// Sticker tools
interface Sticker {
    name: string;
    sticker: string;
}
const createStickerTool: (sticker: Sticker) => Tool = (sticker) => {
    return {
        name: sticker.name,
        activate: function () {
            ctx.fillStyle = "black";
            ctx.font = "12px sans-serif";
        },
        createToolPreview: function (x, y) {
            return {
                x, y,
                draw: function (context) {
                    ctx.fillStyle = "black";
                    ctx.font = "12px sans-serif";
                    context.fillText(sticker.sticker, x, y);
                }
            };
        },
        createStroke: function (startX, startY) {
            return {
                points: [{
                    x: startX,
                    y: startY
                }],
                display: function (context) {
                    const lastTool = getCurrentTool();
                    this.tool.activate();
                    context.fillText(sticker.sticker, this.points[0].x, this.points[0].y);
                    lastTool.activate();
                },
                drag: function (x, y) {
                    this.points[0] = { x, y };
                },
                tool: this
            };
        }
    };
};
const stickers: Sticker[] = [
    { name: "smiley", sticker: "🙂" },
    { name: "sunglasses", sticker: "😎" },
    { name: "thumbs-up", sticker: "👍" },
];
for (const sticker of stickers) {
    tools.push(createStickerTool(sticker));
}

// Observer patterns for Drawing and Tool icon render
const render = () => {
    clearCanvas();
    strokes.forEach(stroke => {
        stroke.display(ctx)
    });
    if (toolPreview) {
        toolPreview.draw(ctx);
    }
}
canvas.addEventListener("drawing-changed", render);
canvas.addEventListener("tool-moved", render);

// Drawing logic
let strokes: Stroke[] = [];
function getLastStroke() {
    return (strokes.length > 0) ? strokes[strokes.length - 1] : null;
}
let isPainting = false;
canvas.addEventListener("mousedown", (e) => {
    strokes.push(getCurrentTool().createStroke(e.offsetX, e.offsetY));
    isPainting = true;
    redoStack = [];
    canvas.dispatchEvent(new Event("drawing-changed"));
});
canvas.addEventListener("mousemove", (e) => {
    toolPreview = getCurrentTool().createToolPreview(e.offsetX, e.offsetY);
    canvas.dispatchEvent(new Event("tool-moved"));

    if (isPainting) {
        getLastStroke()?.drag(e.offsetX, e.offsetY);
        canvas.dispatchEvent(new Event("drawing-changed"));
    }
});
canvas.addEventListener("mouseup", () => {
    isPainting = false;
});
canvas.addEventListener("mouseleave", () => {
    toolPreview = null;
    canvas.dispatchEvent(new Event("tool-moved"));
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

// Draw history logic
let redoStack: Stroke[] = [];
const historyButtons: ButtonMap = new Map();
const historyButtonDiv = document.createElement("div");
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
for (const [_, button] of historyButtons) {
    historyButtonDiv.appendChild(button);
}

// Tool buttons
const toolButtons: ButtonMap = new Map();
const toolButtonDiv: HTMLDivElement = document.createElement("div");
function addToolButton(tool: Tool) {
    toolButtons.set(tool.name, createButton(tool.name, function () {
        setCurrentTool(tool.name);
        updateToolButtonStates();
        canvas.dispatchEvent(new Event("tool-moved"));
    }));
    toolButtonDiv?.appendChild(toolButtons.get(tool.name)!);
}
function updateToolButtonStates() {
    for (const [name, button] of toolButtons) {
        button.disabled = name === getCurrentTool().name;
        if (button.disabled) {
            button.classList.add("selectedTool");
        } else {
            button.classList.remove("selectedTool");
        }
    }
}
for (const tool of tools) {
    addToolButton(tool);
}
const customStickerButton = createButton("+ Add sticker", () => {
    const sticker = prompt("Enter text/emoji for sticker:", "♥");
    if (sticker && (tools.findIndex(tool => tool.name === sticker) === -1)) {
        stickers.push({ name: sticker, sticker });
        tools.push(createStickerTool(stickers[stickers.length - 1]));
        addToolButton(tools[tools.length - 1]);
    }
});

// Append elements
app.appendChild(gameTitle);
clearCanvas();
app.appendChild(canvas);
app.appendChild(historyButtonDiv);
updateToolButtonStates();
app.appendChild(toolButtonDiv);
app.appendChild(customStickerButton);
