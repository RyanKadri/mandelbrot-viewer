import { PlotManager } from "./plot-manager";

let ctx: OffscreenCanvasRenderingContext2D;
let plotManager: PlotManager;

globalThis.addEventListener("message", e => {
    if(!e || !e.data) return
    switch(e.data.type) {
        case "initialize":
            const canvas: OffscreenCanvas = e.data.canvas;
            ctx = canvas.getContext("2d")!;
            break;
        case "plot":
            const { plotBounds, viewport, plotOptions } = e.data;
            plotManager = new PlotManager(viewport, plotBounds, plotOptions, ctx);
            plotManager.plotSet()
            break;
        case "shift":
            const { shiftX, shiftY, shiftReal, shiftImag } = e.data;
            plotManager.shiftPlot(shiftX, shiftY, shiftReal, shiftImag);
    }
});

self.postMessage({ type: "ready" })
