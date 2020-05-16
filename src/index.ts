import { PlotBounds, PlotOptions, plotSet, ViewportBounds } from "./plot";
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
    divergenceBound: 4
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
        minReal: minRealInput.valueAsNumber,
        maxReal: maxRealInput.valueAsNumber,
        minImag: minImagInput.valueAsNumber,
        maxImag: maxImagInput.valueAsNumber
    };
});

function refreshPlot() {
    plotSet(ctx, plotBounds, viewport, plotOptions);
}

function updateBoundsInputs() {
    minRealInput.valueAsNumber = plotBounds.minReal;
    maxRealInput.valueAsNumber = plotBounds.maxReal;
    minImagInput.valueAsNumber = plotBounds.minImag;
    maxImagInput.valueAsNumber = plotBounds.maxImag;
}

let drawing = false;
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
        if(!drawing) {
            requestAnimationFrame(() => {
                drawing = true;
                refreshPlot()
                drawing = false;
            })
        }
    },
    onDragComplete() {
        refreshPlot();
    }
});