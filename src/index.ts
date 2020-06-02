import { setupPlotListeners } from "./controls";
// import { plotSet, initialize, shiftPlot } from "./plot";
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
    renderDistBuffer: 100,
};

let plotBounds: PlotBounds = {
    minReal: -1,
    realRange: 0.5,
    minImag: 0,
    imagRange: 0.5
};

// Some of these names could be better but I noticed they were all the same width too late to stop.
const mainThCanvas = document.getElementById("plot") as HTMLCanvasElement;
const workerCanvas = document.getElementById("worker-plot") as HTMLCanvasElement;
const canvasBounds = document.getElementById("plot-bounds") as HTMLCanvasElement;
const minRealInput = document.getElementById("min-real") as HTMLInputElement;
const realRngInput = document.getElementById("real-range") as HTMLInputElement;
const minImagInput = document.getElementById("min-imag") as HTMLInputElement;
const imagRngInput = document.getElementById("imag-range") as HTMLInputElement;
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

// const mainThreadContext = mainThCanvas.getContext("2d");

updatePlotOptions();
updateBoundsInputs();

function refreshPlot() {
    if(!plotOptions.useWebWorker) {
        mainThCanvas.style.display = "";
        workerCanvas.style.display = "none";
        // initialize(viewport)
        // plotSet(mainThreadContext!, plotBounds, viewport, plotOptions);
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

function handleShift(shiftX: number, shiftY: number, shiftReal: number, shiftImag: number) {
    if(!plotOptions.useWebWorker) {
        // shiftPlot(mainThreadContext!, moveReal, moveImag)
    } else {
        renderWorker.postMessage({
            type: "shift",
            shiftX,
            shiftY,
            shiftReal,
            shiftImag
        })
    }
}

function updateBoundsInputs() {
    minRealInput.value = "" + plotBounds.minReal;
    realRngInput.value = "" + plotBounds.realRange;
    minImagInput.value = "" + plotBounds.minImag;
    imagRngInput.value = "" + plotBounds.imagRange;
}

function updatePlotOptions() {
    useWorkerBox.checked = plotOptions.useWebWorker;
    divergeInput.value = "" + plotOptions.divergenceBound;
    numIterInput.value = "" + plotOptions.maxIterations;
    calcSelector.value = plotOptions.calcMethod
}

[mainThCanvas, workerCanvas].forEach(canvas => setupPlotListeners(canvas, {
    onDragUpdate(moveX, moveY) {
        const moveReal = (moveX / viewport.width) * plotBounds.realRange;
        const moveImag = (moveY / viewport.height) * plotBounds.imagRange;
        plotBounds = {
            ...plotBounds,
            minReal: plotBounds.minReal - moveReal,
            minImag: plotBounds.minImag + moveImag,
        }
        updateBoundsInputs();
        handleShift(moveX, moveY, moveReal, moveImag);
    },
    onDragComplete() {
        // refreshPlot();
    },
    onZoom(diff, center) {
        const oldRealRange = plotBounds.realRange;
        const oldImagRange = plotBounds.imagRange;
        const currRealRange = oldRealRange * diff;
        const currImagRange = oldImagRange * diff;
        const oldCenterReal = center.x / viewport.width * oldRealRange + plotBounds.minReal;
        const oldCenterImag = (viewport.height - center.y) / viewport.height * oldImagRange + plotBounds.minImag;
        const newRealMin = oldCenterReal - currRealRange * (center.x / viewport.width);
        const newImagMin = oldCenterImag - currImagRange * (viewport.height - center.y) / viewport.height;
        plotBounds = {
            minReal: newRealMin,
            realRange: currRealRange,
            minImag: newImagMin,
            imagRange: currImagRange,
        };
        updateBoundsInputs();
        refreshPlot();
    }
}));

viewportForm.addEventListener("submit", (e) => {
    e.preventDefault();
    plotBounds = {
        minReal: parseFloat(minRealInput.value),
        realRange: parseFloat(realRngInput.value),
        minImag: parseFloat(minImagInput.value),
        imagRange: parseFloat(imagRngInput.value)
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