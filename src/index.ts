import { PlotBounds, PlotOptions, ViewportBounds } from "./plot";
import { setupPlotListeners } from "./controls";


const canvas = document.getElementById("plot") as HTMLCanvasElement;
const canvasBounds = document.getElementById("plot-bounds") as HTMLCanvasElement;
const minRealInput = document.getElementById("min-real") as HTMLInputElement;
const maxRealInput = document.getElementById("max-real") as HTMLInputElement;
const minImagInput = document.getElementById("min-imag") as HTMLInputElement;
const maxImagInput = document.getElementById("max-imag") as HTMLInputElement;
const viewportForm = document.getElementById("viewport-form") as HTMLFormElement;

const plotOptions: PlotOptions = {
    maxIterations: 50,
    divergenceBound: 2
}

const viewport: ViewportBounds = {
    height: 960,
    width: 960,
}

canvas.height = viewport.height;
canvas.width = viewport.width;
canvasBounds.style.height = `${viewport.height / 1.5}px`;
canvasBounds.style.width = `${viewport.width / 1.5}px`;

let plotBounds: PlotBounds = {
    minReal: -1,
    maxReal: -0.5,
    minImag: 0,
    maxImag: 0.5
};

const initTranslateX = -viewport.width / 1.5 / 4;
const initTranslateY = -viewport.height / 1.5 / 4;

let transform = {
    translateX: initTranslateX,
    translateY: initTranslateY,
    scale: 1
}

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

const renderWorker = new Worker("./bootstrap.worker.ts", { type: 'module', name: "plot-worker" });
const offscreenCanvas = canvas.transferControlToOffscreen();

function refreshPlot() {
    if(transform.translateX !== initTranslateX || transform.translateY !== initTranslateY) {
        const moveReal = -(transform.translateX - initTranslateX);
        const moveImag = (transform.translateY - initTranslateY);
        renderWorker.postMessage({
            type: "shift",
            moveReal,
            moveImag
        });
    }
    renderWorker.postMessage({ 
        type: "plot", 
        plotBounds, 
        viewport, 
        plotOptions
    });
}

function updateBoundsInputs() {
    minRealInput.value = "" + plotBounds.minReal;
    maxRealInput.value = "" + plotBounds.maxReal;
    minImagInput.value = "" + plotBounds.minImag;
    maxImagInput.value = "" + plotBounds.maxImag;
}

function updateTransform() {
    canvas.style.transform = `translate(${transform.translateX}px, ${transform.translateY}px) scale(${transform.scale})`
}

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
        transform.translateX += moveReal;
        transform.translateY += moveImag;
        updateTransform();

        // renderWorker.postMessage({ type: "shift", moveReal, moveImag });
        // renderWorker.postMessage({ 
        //     type: "plot", 
        //     plotBounds, 
        //     plotOptions, 
        //     viewport: { ...viewport,
        //         startReal: moveReal > 0 ? 0 : viewport.width + moveReal,
        //         endReal: moveReal > 0 ? moveReal : viewport.width
        //     }
        // });
        // renderWorker.postMessage({
        //     type: "plot", 
        //     plotBounds, 
        //     plotOptions, 
        //     viewport: { ...viewport,
        //         startImag: moveImag > 0 ? 0 : viewport.height + moveImag,
        //         endImag: moveImag > 0 ? moveImag : viewport.height
        //     },
        // })
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

renderWorker.addEventListener("message", e => {
    switch(e.data.type) {
        case "shift-done":
            transform.translateX = initTranslateX;
            transform.translateY = initTranslateY;
            updateTransform();
            break;
        case "ready":
            renderWorker.postMessage({
                type: "initialize",
                canvas: offscreenCanvas
            }, [ offscreenCanvas ]);
            updateBoundsInputs();
            updateTransform();
            refreshPlot();
            break;            
    }
})