import { PlotOptions, PlotBounds, ViewportBounds } from "./plot.types";
import { defaultViewport, defaultPlotBounds, defaultPlotOptions } from "./defaults";

export function parseUrl(): [PlotBounds, PlotOptions, ViewportBounds] {
    const params = new URLSearchParams(location.search.substr(1));
    const plotBounds: PlotBounds = {
        minReal: parseFloat(params.get("minReal") ?? "" + defaultPlotBounds.minReal),
        realRange: parseFloat(params.get("realRange") ?? "" + defaultPlotBounds.realRange),
        minImag: parseFloat(params.get("minImag") ?? "" + defaultPlotBounds.minImag),
        imagRange: parseFloat(params.get("imagRange") ?? ("" + defaultPlotBounds.imagRange))
    };

    const plotOptions: PlotOptions = {
        calcMethod: (params.get("calcMethod") ?? defaultPlotOptions.calcMethod) as PlotOptions["calcMethod"],
        divergenceBound: parseFloat(params.get("divergenceBound") ?? "" + defaultPlotOptions.divergenceBound),
        maxIterations: parseInt(params.get("maxIterations") ?? "" + defaultPlotOptions.maxIterations, 10),
        numWorkers: defaultPlotOptions.numWorkers,
        showRenderChunks: params.get("showRenderChunks") === "true",
        useWebWorker: params.get("useWebWorker") !== "false",
        useAntialiasing: params.get("useAntialiasing") === "true"
    }

    return [
        plotBounds,
        plotOptions,
        defaultViewport
    ]

}

const ignoreProps: (keyof PlotBounds | keyof PlotOptions)[] = [
    "numWorkers"
];

export function updateUrl(plotBounds: PlotBounds, plotOptions: PlotOptions, pushState = false) {
    const params = new URLSearchParams();
    [
        ...Object.entries(plotBounds),
        ...Object.entries(plotOptions)
    ].forEach(([key, val]) => {
        if(!ignoreProps.includes(key as any)) {
            params.set(key, "" + val)
        }
    });
    if(pushState) {
      history.pushState({}, document.title, "?" + params.toString());
    } else {
      history.replaceState({}, document.title, "?" + params.toString());
    }
}