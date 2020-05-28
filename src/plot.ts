import { PlotBounds, ViewportBounds, PlotOptions } from "./plot.types";
import { Plot } from "../pkg/mandelbrot_calculator";
import { memory } from "../pkg/mandelbrot_calculator_bg";

let plot: Plot;
let plotImage: ImageData;

export function plotSet(ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D, plotBounds: PlotBounds, viewport: ViewportBounds, options: PlotOptions) {
    if(options.calcMethod === "vanilla-js") {
        plotSetJs(ctx, plotBounds, viewport, options);
    } else {
        plotSetWasm(ctx, plotBounds, viewport, options);
    }
}

export function plotSetWasm(ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D, plotBounds: PlotBounds, viewport: ViewportBounds, options: PlotOptions) {
    plot = Plot.new(viewport.width, viewport.height, plotBounds.minReal, plotBounds.maxReal, plotBounds.minImag, plotBounds.maxImag, options.maxIterations, options.divergenceBound);
    console.time("WASM Plot")
    plot.calc_pixels();
    console.timeEnd("WASM Plot")
    const cellsPtr = plot.pixels();
    const pixelArray = new Uint8ClampedArray(memory.buffer, cellsPtr, viewport.width * viewport.height * 4);
    plotImage = new ImageData(pixelArray, viewport.width, viewport.height)
    ctx.putImageData(plotImage, 0, 0);
    drawAxes(ctx, plotBounds, viewport)
}

export function plotSetJs(ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D, plot: PlotBounds, viewport: ViewportBounds, options: PlotOptions) {
    console.time("JS Plot")
    const { minReal, maxReal, minImag, maxImag } = plot;
    const { height, width, startImag = 0, endImag = height, startReal = 0, endReal = width } = viewport;

    const realInc = (maxReal - minReal) / width;
    const imagInc = (maxImag - minImag) / height;
    if(!plotImage || plotImage.height !== viewport.height || plotImage.width !== viewport.width) {
        plotImage = ctx.createImageData(width, height);
    }
    for(let imagStep = startImag; imagStep < endImag; imagStep ++) {
        const imagComp = maxImag - imagStep * imagInc;
        for(let realStep = startReal; realStep < endReal; realStep ++) {
            const realComp = minReal + realStep * realInc;
            const iterations = iterateMandlebrot(realComp, imagComp, options);
            drawPixel(plotImage, realStep, imagStep, iterations, viewport, options);
        }
    }
    console.timeEnd("JS Plot")
    ctx.putImageData(plotImage, 0, 0);
    drawAxes(ctx, plot, viewport)
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
export function drawAxes(ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D, plot: PlotBounds, viewport: ViewportBounds) {
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

export function shiftPlot(ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D, moveReal: number, moveImag: number) {
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