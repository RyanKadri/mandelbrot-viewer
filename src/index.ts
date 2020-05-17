import { PlotBounds, PlotOptions, plotSet, ViewportBounds, shiftPlot } from "./plot";
import { setupPlotListeners } from "./controls";

const canvas = document.getElementById("plot") as HTMLCanvasElement;
const minRealInput = document.getElementById("min-real") as HTMLInputElement;
const maxRealInput = document.getElementById("max-real") as HTMLInputElement;
const minImagInput = document.getElementById("min-imag") as HTMLInputElement;
const maxImagInput = document.getElementById("max-imag") as HTMLInputElement;
const viewportForm = document.getElementById("viewport-form") as HTMLFormElement;

const ctx = canvas.getContext("2d")!;

const plotOptions: PlotOptions = {
    maxIterations: 200,
    divergenceBound: 2
}

const viewport: ViewportBounds = {
    height: 640,
    width: 640
}

canvas.height = viewport.height;
canvas.width = viewport.width;

let plotBounds: PlotBounds = {
    minReal: -1,
    maxReal: -0.5,
    minImag: 0,
    maxImag: 0.5
};

viewportForm.addEventListener("submit", (e) => {
    e.preventDefault();
    plotBounds = {
        minReal: parseFloat(minRealInput.value),
        maxReal: parseFloat(maxRealInput.value),
        minImag: parseFloat(minImagInput.value),
        maxImag: parseFloat(maxImagInput.value)
    };
    refreshPlot()
});

function refreshPlot() {
    plotSet(ctx, plotBounds, viewport, plotOptions);
}

function updateBoundsInputs() {
    minRealInput.value = "" + plotBounds.minReal;
    maxRealInput.value = "" + plotBounds.maxReal;
    minImagInput.value = "" + plotBounds.minImag;
    maxImagInput.value = "" + plotBounds.maxImag;
}

updateBoundsInputs();
refreshPlot();
setupPlotListeners(canvas, {
    onDragUpdate(moveReal, moveImag) {
        const realRange = plotBounds.maxReal - plotBounds.minReal;
        const imagRange = plotBounds.maxImag - plotBounds.minImag;
        const realMoveProp = (moveReal / viewport.width) * realRange;
        const imagMoveProp = (moveImag / viewport.height) * imagRange;
        plotBounds = {
            minReal: plotBounds.minReal - realMoveProp,
            maxReal: plotBounds.maxReal - realMoveProp,
            minImag: plotBounds.minImag + imagMoveProp,
            maxImag: plotBounds.maxImag + imagMoveProp
        }
        updateBoundsInputs();
        shiftPlot(ctx, moveReal, moveImag);
        plotSet(ctx, plotBounds, {
            ...viewport, 
            startReal: moveReal > 0 ? 0 : viewport.width + moveReal,
            endReal: moveReal > 0 ? moveReal : viewport.width
        }, plotOptions);

        plotSet(ctx, plotBounds, {
            ...viewport, 
            startImag: moveImag > 0 ? 0 : viewport.height + moveImag,
            endImag: moveImag > 0 ? moveImag : viewport.height
        }, plotOptions)
    },
    onDragComplete() {
        refreshPlot();
    },
    onZoom(diff, center) {
        const oldRealRange = plotBounds.maxReal - plotBounds.minReal;
        const oldImagRange = plotBounds.maxImag - plotBounds.minImag;
        const currRealRange = oldRealRange * diff;
        const currImagRange = oldImagRange * diff;
        const oldCenterReal = center.x / viewport.width * oldRealRange + plotBounds.minReal;
        const oldCenterImag = (viewport.height - center.y) / viewport.height * oldImagRange + plotBounds.minImag;
        const newRealMin = oldCenterReal - currRealRange * (center.x / viewport.width);
        const newRealMax = newRealMin + currRealRange;
        const newImagMin = oldCenterImag - currImagRange * (viewport.height - center.y) / viewport.height;
        const newImagMax = newImagMin + currImagRange;
        plotBounds = {
            minReal: newRealMin,
            maxReal: newRealMax,
            minImag: newImagMin,
            maxImag: newImagMax
        };
        updateBoundsInputs();
        refreshPlot();
    }
});