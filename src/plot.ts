export interface PlotBounds {
    minReal: number;
    maxReal: number;
    minImag: number;
    maxImag: number;
}

export interface ViewportBounds {
    height: number;
    width: number;
    startReal?: number;
    endReal?: number;
    startImag?: number;
    endImag?: number;
}

export interface PlotOptions {
    maxIterations: number;
    divergenceBound: number;
}

export interface PlotCommand {
    viewport: ViewportBounds;
    plotBounds: PlotBounds;
    plotOptions: PlotOptions;
}