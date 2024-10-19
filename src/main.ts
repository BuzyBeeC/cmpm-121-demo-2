import "./style.css";

const APP_NAME = "Brian's Sticker Sketchpad";
const app = document.querySelector<HTMLDivElement>("#app")!;

document.title = APP_NAME;

const gameTitle = document.createElement("h1");
gameTitle.innerText = APP_NAME;
app.appendChild(gameTitle);

const canvas = document.createElement("canvas");
canvas.width = 256;
canvas.height = 256;
app.appendChild(canvas);

const ctx = canvas.getContext("2d");
if (!ctx) { throw new Error("Cannot get canvas context!"); }
ctx.fillStyle = "white";
ctx.fillRect(0, 0, canvas.width, canvas.height);


