export interface PlotBounds {
    minReal: number;
    maxReal: number;
    minImag: number;
    maxImag: number;
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
    calcMethod: "wasm-single" | "vanilla-js";
    useWebWorker: boolean;
}

export interface PlotCommand {
    viewport: ViewportBounds;
    plotBounds: PlotBounds;
    plotOptions: PlotOptions;
}