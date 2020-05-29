import { setupPlotListeners } from "./controls";
import { plotSet, initialize, shiftPlot } from "./plot";
import { PlotBounds, PlotOptions, ViewportBounds } from "./plot.types";

let plotOptions: PlotOptions = {
    maxIterations: 100,
    divergenceBound: 4,
    calcMethod: "vanilla-js",
    useWebWorker: true,
};

const viewport: ViewportBounds = {
    height: 640,
    width: 640,
    chunkSize: 320,
    renderDistBuffer: 160,
};

let plotBounds: PlotBounds = {
    minReal: -1,
    maxReal: -0.5,
    minImag: 0,
    maxImag: 0.5
};

// Some of these names could be better but I noticed they were all the same width too late to stop.
const mainThCanvas = document.getElementById("plot") as HTMLCanvasElement;
const workerCanvas = document.getElementById("worker-plot") as HTMLCanvasElement;
const canvasBounds = document.getElementById("plot-bounds") as HTMLCanvasElement;
const minRealInput = document.getElementById("min-real") as HTMLInputElement;
const maxRealInput = document.getElementById("max-real") as HTMLInputElement;
const minImagInput = document.getElementById("min-imag") as HTMLInputElement;
const maxImagInput = document.getElementById("max-imag") as HTMLInputElement;
const useWorkerBox = document.getElementById("main-thread") as HTMLInputElement;
const divergeInput = document.getElementById("divergence-bound") as HTMLInputElement;
const calcSelector = document.getElementById("calculation-type") as HTMLInputElement;
const numIterInput = document.getElementById("iteration-count") as HTMLInputElement;
const viewportForm = document.getElementById("viewport-form") as HTMLFormElement;

mainThCanvas.height = workerCanvas.height = viewport.height;
mainThCanvas.width = workerCanvas.width = viewport.width;
canvasBounds.style.height = `${viewport.height}px`;
canvasBounds.style.width = `${viewport.width}px`;

const renderWorker = new Worker("./bootstrap.worker.ts", { type: 'module', name: "plot-worker" });

let offscreenCanvas: OffscreenCanvas;
try {
    offscreenCanvas = workerCanvas.transferControlToOffscreen();
} catch(e) {
    console.warn("This browser does not support web worker canvas control.")
    plotOptions.useWebWorker = false;
    useWorkerBox.disabled = true;
}

const mainThreadContext = mainThCanvas.getContext("2d");

updatePlotOptions();
updateBoundsInputs();

function refreshPlot() {
    if(!plotOptions.useWebWorker) {
        mainThCanvas.style.display = "";
        workerCanvas.style.display = "none";
        initialize(viewport)
        plotSet(mainThreadContext!, plotBounds, viewport, plotOptions);
    } else {
        mainThCanvas.style.display = "none";
        workerCanvas.style.display = "";

        renderWorker.postMessage({ 
            type: "plot", 
            plotBounds, 
            viewport, 
            plotOptions
        });
    }
}

function handleShift(moveReal: number, moveImag: number) {
    if(!plotOptions.useWebWorker) {
        shiftPlot(mainThreadContext!, moveReal, moveImag)
    } else {
        renderWorker.postMessage({
            type: "shift",
            shiftX: moveReal,
            shiftY: moveImag
        })
    }
}

function updateBoundsInputs() {
    minRealInput.value = "" + plotBounds.minReal;
    maxRealInput.value = "" + plotBounds.maxReal;
    minImagInput.value = "" + plotBounds.minImag;
    maxImagInput.value = "" + plotBounds.maxImag;
}

function updatePlotOptions() {
    useWorkerBox.checked = plotOptions.useWebWorker;
    divergeInput.value = "" + plotOptions.divergenceBound;
    numIterInput.value = "" + plotOptions.maxIterations;
    calcSelector.value = plotOptions.calcMethod
}

[mainThCanvas, workerCanvas].forEach(canvas => setupPlotListeners(canvas, {
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
        handleShift(moveReal, moveImag);
    },
    onDragComplete() {
        // refreshPlot();
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
}));

viewportForm.addEventListener("submit", (e) => {
    e.preventDefault();
    plotBounds = {
        minReal: parseFloat(minRealInput.value),
        maxReal: parseFloat(maxRealInput.value),
        minImag: parseFloat(minImagInput.value),
        maxImag: parseFloat(maxImagInput.value)
    };
    plotOptions = {
        useWebWorker: useWorkerBox.checked,
        divergenceBound: parseInt(divergeInput.value),
        calcMethod: calcSelector.value as PlotOptions["calcMethod"],
        maxIterations: parseInt(numIterInput.value)
    }
    refreshPlot()
});

renderWorker.addEventListener("message", e => {
    switch(e.data.type) {
        case "ready":
            if(offscreenCanvas) {
                renderWorker.postMessage({
                    type: "initialize",
                    canvas: offscreenCanvas
                }, [ offscreenCanvas ]);
                refreshPlot();
                break;            
            }
    }
})