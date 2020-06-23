import { PlotOptions, ViewportBounds, PlotBounds } from "./plot.types";

export const defaultPlotOptions: PlotOptions = {
    maxIterations: 200,
    divergenceBound: 4,
    calcMethod: "optimized-js",
    useWebWorker: true,
    showRenderChunks: false,
    numWorkers: 8
}; 

export const defaultViewport: ViewportBounds = {
    height: window.innerHeight,
    width: window.innerWidth,
    chunkSize: 320,
    renderDistBuffer: 100,
};

export const defaultPlotBounds: PlotBounds = {
    minReal: -1,
    realRange: 0.5,
    minImag: 0,
    imagRange: 0.5 * window.innerHeight / window.innerWidth
};