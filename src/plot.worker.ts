import { PlotBounds, ViewportBounds, PlotOptions } from "./plot";
import { Plot } from "../pkg/mandelbrot_calculator";
import { memory } from "../pkg/mandelbrot_calculator_bg";

let plot: Plot;
let plotImage: ImageData;
let ctx: OffscreenCanvasRenderingContext2D;

globalThis.addEventListener("message", e => {
    if(!e || !e.data) return
    switch(e.data.type) {
        case "initialize":
            const canvas: OffscreenCanvas = e.data.canvas;
            ctx = canvas.getContext("2d")!;
            break;
        case "plot":
            const { plotBounds, viewport, plotOptions } = e.data;
            plotSet(plotBounds, viewport, plotOptions)
            break;
        case "shift":
            const { moveReal, moveImag } = e.data;
            shiftPlot(moveReal, moveImag);
            break;
    }
});

export function plotSetJs(ctx: CanvasRenderingContext2D, plot: PlotBounds, viewport: ViewportBounds, options: PlotOptions) {
    const { minReal, maxReal, minImag, maxImag } = plot;
    const { height, width, startImag = 0, endImag = height, startReal = 0, endReal = width } = viewport;

    const realInc = (maxReal - minReal) / width;
    const imagInc = (maxImag - minImag) / height;
    if(!plotImage || plotImage.height !== viewport.height || plotImage.width !== viewport.width) {
        plotImage = ctx.createImageData(width, height);
    }
    for(let imagStep = startImag; imagStep < endImag; imagStep ++) {
        for(let realStep = startReal; realStep < endReal; realStep ++) {
            const imagComp = maxImag - imagStep * imagInc;
            const realComp = minReal + realStep * realInc;
            const iterations = iterateMandlebrot(realComp, imagComp, options);
            drawPixel(plotImage, realStep, imagStep, iterations, viewport, options);
        }
    }
    ctx.putImageData(plotImage, 0, 0);
    drawAxes(plot, viewport, options)
}

function plotSet(plotBounds: PlotBounds, viewport: ViewportBounds, options: PlotOptions) {
    plot = Plot.new(viewport.width, viewport.height, plotBounds.minReal, plotBounds.maxReal, plotBounds.minImag, plotBounds.maxImag, options.maxIterations, options.divergenceBound);
    const start = performance.now()
    plot.calc_pixels();
    const end = performance.now();
    console.log(end - start)
    const cellsPtr = plot.pixels();
    const pixelArray = new Uint8ClampedArray(memory.buffer, cellsPtr, viewport.width * viewport.height * 4);
    plotImage = new ImageData(pixelArray, viewport.width, viewport.height)
    ctx.putImageData(plotImage, 0, 0);
    drawAxes(plotBounds, viewport, options)
}

function shiftPlot(moveReal: number, moveImag: number) {
    const height = plotImage.height;
    const width = plotImage.width;
    const newPlot = ctx.createImageData(width, height);
    const maxInd = width * height * 4;
    for(let imagStep = 0; imagStep < height; imagStep++) {
        for(let realStep = 0; realStep < width; realStep++) {
            const ind = (realStep + imagStep * width) * 4;
            const oldInd = ind - moveReal * 4 - width * moveImag * 4;
            if(oldInd < 0 || oldInd > maxInd) continue;
            for(let i = 0; i < 4; i++) {
                newPlot.data[ind + i] = plotImage.data[oldInd + i];
            }
        }
    }
    ctx.putImageData(newPlot, 0, 0);
    
    plotImage = newPlot;
    postMessage({ type: "shift-done" })
}

function iterateMandlebrot(realComp: number, imagComp: number, options: PlotOptions): number {
    const { maxIterations, divergenceBound } = options;
    const div2 = divergenceBound ** 2;
    let real = 0, imag = 0;
    for(let n = 0; n < maxIterations; n++) {
        let newReal = real * real - imag * imag + realComp
        imag = 2 * imag * real + imagComp;
        real = newReal;
        if(real ** 2 + imag ** 2 > div2) {
            return n;
        }
    }
    return maxIterations
}

const axisWidth = 1;
function drawAxes(plot: PlotBounds, viewport: ViewportBounds, options: PlotOptions) {
    const { minReal, maxReal, minImag, maxImag } = plot;
    const { height, width } = viewport;
    
    ctx.fillStyle = "red"
    if(maxReal > 0 && minReal < 0) {
        const yAxisHoriz = -minReal / (maxReal - minReal) * width;
        ctx.fillRect(yAxisHoriz, 0, axisWidth, height);
    }
    if(maxImag > 0 && minImag < 0) {
        const xAxisVert = maxImag / (maxImag - minImag) * height;
        ctx.fillRect(0, xAxisVert, width, axisWidth);
    }
}

function drawPixel(img: ImageData, realComp: number, imagComp: number, iterations: number, viewport: ViewportBounds, options: PlotOptions) {
    const ind = (imagComp * viewport.width + realComp) * 4;
    if(iterations < options.maxIterations) {
        img.data[ind] = 0;
        img.data[ind + 1] = 0;
        img.data[ind + 2] = Math.min(128 + iterations, 255);
        img.data[ind + 3] = 255;
    } else {
        img.data[ind] = 0;
        img.data[ind + 1] = 0;
        img.data[ind + 2] = 0;
        img.data[ind + 3] = 255;
    }
}
self.postMessage({ type: "ready" })
