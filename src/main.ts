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
let _color = "rgb(0, 0, 0)";
const getColor = () => _color;
const setColor = (r: number, g: number, b: number) => {
    _color = `rgb(${r}, ${g}, ${b})`;
}

// Stroke command pattern
interface Point {
    x: number;
    y: number;
}
interface Stroke {
    points: Point[];
    color: string;
    display: (context: CanvasRenderingContext2D) => void;
    drag: (x: number, y: number) => void;
    tool: Tool;
}

// Tool Preview and Tool command patterns
interface ToolPreview {
    x: number;
    y: number;
    draw: () => void;
}
let toolPreview: ToolPreview | null = null;
interface Tool {
    name: string;
    activate: (context: CanvasRenderingContext2D) => void;
    createToolPreview: (x: number, y: number) => ToolPreview;
    createStroke: (startX: number, startY: number) => Stroke;
}
const tools: Tool[] = [];
let currentToolIndex = 0;
const getCurrentTool = () => {
    return tools[currentToolIndex];
}
const setCurrentTool = (name: string) => {
    currentToolIndex = tools.findIndex(tool => tool.name === name);
    if (currentToolIndex === -1) {
        currentToolIndex = 0;
    }
    if (ctx) { getCurrentTool().activate(ctx); }
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
const createMarkerTool = function (marker: Marker): Tool {
    return {
        name: marker.name,
        activate: function (context) {
            context.strokeStyle = getColor();
            context.lineWidth = marker.size;
        },
        createToolPreview: function (x, y) {
            return {
                x, y,
                draw: function () {
                    ctx.fillStyle = getColor();
                    ctx.fillRect(
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
                color: getColor(),
                display: function (context) {
                    const lastTool = getCurrentTool();
                    this.tool.activate(context);
                    context.strokeStyle = this.color;
                    context.beginPath();
                    this.points.forEach(point => {
                        context.lineTo(point.x, point.y);
                        context.stroke();
                    });
                    // Restore last tool & current color
                    lastTool.activate(context);
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
    { name: "Thin", size: 2 },
    { name: "Thick", size: 5 },
]
for (const marker of markers) {
    tools.push(createMarkerTool(marker));
}

// Sticker tools
interface Sticker {
    name: string;
    sticker: string;
}
const createStickerTool = function (sticker: Sticker): Tool {
    return {
        name: sticker.name,
        activate: function (context) {
            context.fillStyle = getColor();
            context.font = "16px sans-serif";
        },
        createToolPreview: function (x, y) {
            return {
                x, y,
                draw: function () {
                    ctx.fillStyle = getColor();
                    ctx.font = "16px sans-serif";
                    ctx.fillText(sticker.sticker, x, y);
                }
            };
        },
        createStroke: function (startX, startY) {
            return {
                points: [{
                    x: startX,
                    y: startY
                }],
                color: getColor(),
                display: function (context) {
                    const lastTool = getCurrentTool();
                    this.tool.activate(context);
                    context.fillStyle = this.color;
                    context.fillText(sticker.sticker, this.points[0].x, this.points[0].y);
                    // Restore last tool & current color
                    lastTool.activate(context);
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
    { name: "Smiley", sticker: "🙂" },
    { name: "Sunglasses", sticker: "😎" },
    { name: "Thumbs-up", sticker: "👍" },
];
for (const sticker of stickers) {
    tools.push(createStickerTool(sticker));
}

// Observer patterns for Drawing and Tool icon render
function clearCanvas(context: CanvasRenderingContext2D) {
    context.fillStyle = "white";
    context.fillRect(0, 0, canvas.width, canvas.height);
}
const render = function (context: CanvasRenderingContext2D) {
    clearCanvas(context);
    strokes.forEach(stroke => {
        stroke.tool.activate(context);
        stroke.display(context)
    });
    if (toolPreview) {
        toolPreview.draw();
    }
}
canvas.addEventListener("drawing-changed", () => render(ctx));
canvas.addEventListener("tool-moved", () => render(ctx));

// Drawing logic
let strokes: Stroke[] = [];
const getLastStroke = function () {
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
    clearCanvas(ctx);
    strokes = [];
    redoStack = [];
}));
for (const [_, button] of historyButtons) {
    historyButtonDiv.appendChild(button);
}

// Color sliders
const colorSliders: HTMLInputElement[] = [];
const colorSliderDiv = document.createElement("div");
for (let i = 0; i < 3; i++) {
    const slider = document.createElement("input");
    slider.type = "range";
    slider.min = "0";
    slider.max = "255";
    slider.value = "0";
    colorSliders.push(slider);
}
const colorDisplay = document.createElement("p");
function updateColor() {
    const r = parseInt(colorSliders[0].value);
    const g = parseInt(colorSliders[1].value);
    const b = parseInt(colorSliders[2].value);
    setColor(r, g, b);
    colorDisplay.innerText = getColor();
    colorDisplay.style.color = getColor();
}
colorSliderDiv.addEventListener("input", updateColor);
for (const slider of colorSliders) {
    colorSliderDiv.appendChild(slider);
}
colorSliderDiv.appendChild(colorDisplay);

// Tool buttons
const toolButtons: ButtonMap = new Map();
const toolButtonDiv: HTMLDivElement = document.createElement("div");
const addToolButton = function (tool: Tool) {
    toolButtons.set(tool.name, createButton(tool.name, function () {
        setCurrentTool(tool.name);
        updateToolButtonStates();
        canvas.dispatchEvent(new Event("tool-moved"));
    }));
    toolButtonDiv.appendChild(toolButtons.get(tool.name)!);
}
const updateToolButtonStates = function () {
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
    const stickerName = prompt("Enter sticker name:", "Heart");
    if (!stickerName || (tools.findIndex(tool => tool.name === stickerName) !== -1)) {
        return;
    }

    const sticker = prompt("Enter text/emoji for sticker:", "♥");
    if (sticker) {
        stickers.push({ name: stickerName, sticker });
        tools.push(createStickerTool(stickers[stickers.length - 1]));
        addToolButton(tools[tools.length - 1]);
    }
});

// Export logic
const exportButton = createButton("Export 📥", () => {
    const exportCanvas = document.createElement("canvas");
    exportCanvas.width = 1024;
    exportCanvas.height = 1024;
    const exportCtx = exportCanvas.getContext("2d");
    if (!exportCtx) { throw new Error("Cannot get export canvas context!"); }
    toolPreview = null;
    render(exportCtx);
    const exportLink = document.createElement("a");
    exportLink.href = exportCanvas.toDataURL("image/png");
    exportLink.download = "sketchpad.png";
    exportLink.click();
})

// Append elements
app.appendChild(gameTitle);
clearCanvas(ctx);
app.appendChild(canvas);
app.appendChild(historyButtonDiv);
updateColor();
app.appendChild(colorSliderDiv);
updateToolButtonStates();
app.appendChild(toolButtonDiv);
app.appendChild(customStickerButton);
app.appendChild(exportButton);
