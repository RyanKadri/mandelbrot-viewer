import { plotSet } from "./plot";

let ctx: OffscreenCanvasRenderingContext2D;

globalThis.addEventListener("message", e => {
    if(!e || !e.data) return
    switch(e.data.type) {
        case "initialize":
            const canvas: OffscreenCanvas = e.data.canvas;
            ctx = canvas.getContext("2d")!;
            break;
        case "plot":
            const { plotBounds, viewport, plotOptions } = e.data;
            plotSet(ctx, plotBounds, viewport, plotOptions)
            break;
    }
});

self.postMessage({ type: "ready" })
