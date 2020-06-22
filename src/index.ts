import { setupPlotListeners } from "./controls";
import { PlotBounds, PlotOptions, ViewportBounds } from "./plot.types";
import { PlotManager } from "./plot-manager";

let plotOptions: PlotOptions = {
    maxIterations: 200,
    divergenceBound: 4,
    calcMethod: "vanilla-js",
    useWebWorker: true,
    showRenderChunks: true,
    numWorkers: 4
}; 

const viewport: ViewportBounds = {
    height: window.innerHeight,
    width: window.innerWidth,
    chunkSize: 320,
    renderDistBuffer: 100,
};

let plotBounds: PlotBounds = {
    minReal: -1,
    realRange: 0.5,
    minImag: 0,
    imagRange: 0.5 * window.innerHeight / window.innerWidth
};

let showParams = true;

// Some of these names could be better but I noticed they were all the same width too late to stop.
const mainThCanvas = document.getElementById("plot") as HTMLCanvasElement;
const workerCanvas = document.getElementById("worker-plot") as HTMLCanvasElement;
const canvasBounds = document.getElementById("plot-bounds") as HTMLCanvasElement;
const minRealInput = document.getElementById("min-real") as HTMLInputElement;
const realRngInput = document.getElementById("real-range") as HTMLInputElement;
const minImagInput = document.getElementById("min-imag") as HTMLInputElement;
const imagRngInput = document.getElementById("imag-range") as HTMLInputElement;
const useWorkerBox = document.getElementById("main-thread") as HTMLInputElement;
const showRenderBx = document.getElementById("show-render-chunks") as HTMLInputElement;
const divergeInput = document.getElementById("divergence-bound") as HTMLInputElement;
const calcSelector = document.getElementById("calculation-type") as HTMLInputElement;
const numIterInput = document.getElementById("iteration-count") as HTMLInputElement;
const viewportForm = document.getElementById("viewport-form") as HTMLFormElement;
const redrawButton = document.getElementById("redraw-button") as HTMLButtonElement;
const renderingDot = document.getElementById("render-indicator") as HTMLDivElement;
const showParamBtn = document.getElementById("toggle-params") as HTMLButtonElement;
const plotControls = document.getElementById("plot-params") as HTMLDivElement;

mainThCanvas.height = workerCanvas.height = viewport.height;
mainThCanvas.width = workerCanvas.width = viewport.width;
canvasBounds.style.height = `${viewport.height}px`;
canvasBounds.style.width = `${viewport.width}px`;

const mainThreadContext = mainThCanvas.getContext("2d")!;
const plotManager = new PlotManager(viewport, plotBounds, plotOptions, mainThreadContext, (rendering) => {
    renderingDot.className = rendering ? "rendering" : "done"
});

// let targetZoom = 1;

function refreshPlot() {
    mainThCanvas.style.display = "";
    workerCanvas.style.display = "none";
    plotManager.updateParams(plotBounds, plotOptions);
}

function handleShift(shiftX: number, shiftY: number) {
    const shiftReal = (shiftX / viewport.width) * plotBounds.realRange;
    const shiftImag = (shiftY / viewport.height) * plotBounds.imagRange;
    plotBounds = {
        ...plotBounds,
        minReal: plotBounds.minReal - shiftReal,
        minImag: plotBounds.minImag + shiftImag,
    }
    plotManager.shiftPlot(shiftX, shiftY, shiftReal, shiftImag)
}

function updateBoundsInputs() {
    minRealInput.value = "" + plotBounds.minReal;
    realRngInput.value = "" + plotBounds.realRange;
    minImagInput.value = "" + plotBounds.minImag;
    imagRngInput.value = "" + plotBounds.imagRange;
    showParamBtn.innerText = showParams ? "Hide" : "Show";
    plotControls.style.display = showParams ? "block" : "none"
}

function updatePlotOptions() {
    useWorkerBox.checked = plotOptions.useWebWorker;
    showRenderBx.checked = plotOptions.showRenderChunks;
    divergeInput.value = "" + plotOptions.divergenceBound;
    numIterInput.value = "" + plotOptions.maxIterations;
    calcSelector.value = plotOptions.calcMethod;

}

[mainThCanvas, workerCanvas].forEach(canvas => setupPlotListeners(canvas, {
    onDragUpdate(moveX, moveY) {
        updateBoundsInputs();
        handleShift(moveX, moveY);
    },
    onDragComplete() {
        // refreshPlot();
    },
    onZoom(diff, center) {
        // targetZoom *= diff;
        const oldRealRange = plotBounds.realRange;
        const oldImagRange = plotBounds.imagRange;
        const currRealRange = oldRealRange / diff;
        const currImagRange = oldImagRange / diff;
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
        refreshPlot()
        
        // if(targetZoom > 2) {
        //     refreshPlot();
        //     targetZoom = 1;
        //     mainThCanvas.style.transform = ""
        // } else {
        //     mainThCanvas.style.transform = `scale(${targetZoom})`
        // }
    }
}));

viewportForm.addEventListener("change", () => {
    // e.preventDefault();
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
        maxIterations: parseInt(numIterInput.value),
        showRenderChunks: showRenderBx.checked,
        numWorkers: plotOptions.numWorkers
    }
    refreshPlot()
});

document.addEventListener("keydown", e => {
    switch(e.key) {
        case "ArrowDown":
            handleShift(0, -5);
            break;
        case "ArrowUp":
            handleShift(0, 5);
            break;
        case "ArrowLeft":
            handleShift(5, 0);
            break;
        case "ArrowRight":
            handleShift(-5, 0);
            break;
    }
})

redrawButton.addEventListener("click", () => {
    refreshPlot()
});

showParamBtn.addEventListener("click", () => {
    showParams = !showParams;
    updateBoundsInputs();
});

(async function () {
    updatePlotOptions();
    updateBoundsInputs();
    await plotManager.initialize();
    refreshPlot()
})()
