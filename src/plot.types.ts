export interface PlotBounds {
    minReal: number;
    realRange: number;
    minImag: number;
    imagRange: number;
}

export interface ViewportBounds {
    height: number;
    width: number;
    chunkSize: number;
    renderDistBuffer: number;
}

export interface PlotOptions {
    maxIterations: number;
    divergenceBound: number;
    calcMethod: "wasm" | "optimized-js" | "naive-js";
    useWebWorker: boolean;
    showRenderChunks: boolean;
    numWorkers: number;
    useAntialiasing: boolean;
}

export interface PlotCommand {
    viewport: ViewportBounds;
    plotBounds: PlotBounds;
    plotOptions: PlotOptions;
}