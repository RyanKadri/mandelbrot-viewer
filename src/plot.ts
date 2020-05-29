import { PlotBounds, ViewportBounds, PlotOptions } from "./plot.types";
import { Plot } from "../pkg/mandelbrot_calculator";
import { memory } from "../pkg/mandelbrot_calculator_bg";

let plot: Plot;
let nChunksHoriz: number;
let nChunksVert: number;
let plotChunks: PlotChunk[][];
// let viewingRow: number;
// let viewingCol: number;
let viewXOffset: number;
let viewYOffset: number;

export function initialize(viewport: ViewportBounds) {
    nChunksHoriz = Math.ceil((viewport.width + 2 * viewport.renderDistBuffer) / viewport.chunkSize);
    nChunksVert = Math.ceil((viewport.width + 2 * viewport.renderDistBuffer) / viewport.chunkSize);
    viewXOffset = Math.round((nChunksHoriz * viewport.chunkSize - viewport.width) / 2)
    viewYOffset = Math.round((nChunksHoriz * viewport.chunkSize - viewport.height) / 2)

    plotChunks = [];
    for(let row = 0; row < nChunksVert + 1; row++) {
        plotChunks.push([]);
        for(let col = 0; col < nChunksHoriz + 1; col++) {
            plotChunks[row].push({
                data: new ImageData(viewport.chunkSize, viewport.chunkSize),
                top: -viewYOffset + row * viewport.chunkSize,
                left: -viewXOffset + col * viewport.chunkSize,
            })
        }
    }
}

export function shiftPlot(ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D, moveX: number, moveY: number) {
    for(const row of plotChunks) {
        for(const chunk of row) {
            chunk.top += moveY;
            chunk.left += moveX;
        }
    }
    refreshChunkPlacement(ctx);
}

function refreshChunkPlacement(ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D) {
    for(const row of plotChunks) {
        for(const chunk of row) {
            ctx.putImageData(chunk.data, chunk.left, chunk.top);
        }
    }
}

export function plotSet(ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D, plotBounds: PlotBounds, viewport: ViewportBounds, options: PlotOptions) {
    const realRange = plotBounds.maxReal - plotBounds.minReal;
    const imagRange = plotBounds.maxImag - plotBounds.minImag;
    const realStep = realRange / viewport.width;
    const imagStep = imagRange / viewport.height;
    const chunkMinReal = plotBounds.minReal - viewXOffset * realStep;
    const chunkMinImag = plotBounds.minImag - viewYOffset * imagStep;
    const chunkView = { height: viewport.chunkSize, width: viewport.chunkSize }
    for(let rowInd = 0; rowInd < plotChunks.length; rowInd ++) {
        const row = plotChunks[rowInd];
        for(let colInd = 0; colInd < row.length; colInd ++) {
            const chunk = row[colInd];
            const colStartPos = (colInd * viewport.chunkSize);
            const colEndPos = (colInd  + 1) * viewport.chunkSize
            const rowStartPos = viewport.height - (rowInd + 1) * viewport.chunkSize
            const rowEndPos = viewport.height - rowInd * viewport.chunkSize;
            const bounds: PlotBounds = { 
                minReal: chunkMinReal + colStartPos * realStep,
                maxReal: chunkMinReal + colEndPos * realStep,
                minImag: chunkMinImag + rowStartPos * imagStep,
                maxImag: chunkMinImag + rowEndPos * imagStep
            }
            if(options.calcMethod === "vanilla-js") {
                plotSetJs(chunk.data, bounds, chunkView, options);
            } else {
                plotSetWasm(chunk.data, bounds, chunkView, options);
            }
        }
    }
    refreshChunkPlacement(ctx);
}

function plotSetWasm(plotImage: ImageData, plotBounds: PlotBounds, viewport: Pick<ViewportBounds, "height" | "width">, options: PlotOptions) {
    plot = Plot.new(viewport.width, viewport.height, plotBounds.minReal, plotBounds.maxReal, plotBounds.minImag, plotBounds.maxImag, options.maxIterations, options.divergenceBound);
    console.time("WASM Plot")
    plot.calc_pixels();
    console.timeEnd("WASM Plot")
    const cellsPtr = plot.pixels();
    const pixelArray = new Uint8ClampedArray(memory.buffer, cellsPtr, viewport.width * viewport.height * 4);
    plotImage.data.set(pixelArray);
}

function plotSetJs(plotImage: ImageData, plot: PlotBounds, viewport: Pick<ViewportBounds, "height" | "width">, options: PlotOptions) {
    console.time("JS Plot")
    const { minReal, maxReal, minImag, maxImag } = plot;
    const { height, width } = viewport;

    const realInc = (maxReal - minReal) / width;
    const imagInc = (maxImag - minImag) / height;
    for(let imagStep = 0; imagStep < height; imagStep ++) {
        const imagComp = maxImag - imagStep * imagInc;
        for(let realStep = 0; realStep < width; realStep ++) {
            const realComp = minReal + realStep * realInc;
            const iterations = iterateMandlebrot(realComp, imagComp, options);
            drawPixel(plotImage, realStep, imagStep, iterations, viewport, options);
        }
    }
    console.timeEnd("JS Plot")
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

function drawPixel(img: ImageData, realComp: number, imagComp: number, iterations: number, viewport: Pick<ViewportBounds, "height" | "width">, options: PlotOptions) {
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

interface PlotChunk {
    data: ImageData;
    top: number;
    left: number;
}