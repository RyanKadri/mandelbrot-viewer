import { Plot } from "../pkg/mandelbrot_calculator";
import { PlotBounds, PlotOptions, ViewportBounds } from "./plot.types";
// import { memory } from "../pkg/mandelbrot_calculator";
import { z, Complex, add, mult, absSq } from "./complex";

export function plotChunk(data: Uint8ClampedArray, bounds: PlotBounds, chunkSize: ChunkSize, options: PlotOptions) {
    if(options.calcMethod === "optimized-js") {
        plotChunkJs(data, bounds, chunkSize, options);
    } else if(options.calcMethod === "wasm"){
        // plotChunkWasm(data, bounds, chunkSize, options);
    } else {
        plotChunkNaiveJS(data, bounds, chunkSize, options)
    }
}

// function plotChunkWasm(buffer: Uint8ClampedArray, plotBounds: PlotBounds, chunkSize: ChunkSize, options: PlotOptions) {
//     const plot = Plot.new(chunkSize.width, chunkSize.height, plotBounds.minReal, plotBounds.realRange, plotBounds.minImag, plotBounds.imagRange, options.maxIterations, options.divergenceBound);
//     plot.calc_pixels();
//     const cellsPtr = plot.pixels();
//     const pixelArray = new Uint8ClampedArray(memory.buffer, cellsPtr, chunkSize.width * chunkSize.height * 4);
//     buffer.set(pixelArray);
// }

function plotChunkJs(buffer: Uint8ClampedArray, plot: PlotBounds, chunkSize: ChunkSize, options: PlotOptions) {
    const { minReal, realRange, minImag, imagRange } = plot;
    const { height, width } = chunkSize;

    const realInc = realRange / width;
    const imagInc = imagRange / height;
    for(let imagStep = 0; imagStep < height; imagStep ++) {
        const imagComp = (minImag + imagRange) - imagStep * imagInc;
        for(let realStep = 0; realStep < width; realStep ++) {
            const realComp = minReal + realStep * realInc;
            const iterations = iterateMandlebrot(realComp, imagComp, options);
            drawPixel(buffer, realStep, imagStep, iterations, chunkSize, options);
        }
    }
}

function plotChunkNaiveJS(buffer: Uint8ClampedArray, plot: PlotBounds, chunkSize: ChunkSize, options: PlotOptions) {
    const { minReal, realRange, minImag, imagRange } = plot;
    const { height, width } = chunkSize;

    const realInc = realRange / width;
    const imagInc = imagRange / height;
    for(let imagStep = 0; imagStep < height; imagStep ++) {
        const imagComp = minImag + imagRange - imagStep * imagInc;
        for(let realStep = 0; realStep < width; realStep ++) {
            const realComp = minReal + realStep * realInc;
            const zInit = z(realComp, imagComp);
            const iterations = iterateMandlebrotNaive(zInit, options);
            drawPixel(buffer, realStep, imagStep, iterations, chunkSize, options);
        }
    }
}

function iterateMandlebrotNaive(coord: Complex, options: PlotOptions): number {
    let zn = z(0,0);
    const { maxIterations, divergenceBound } = options;
    for(let n = 0; n < maxIterations; n++) {
        zn = add(mult(zn,zn), coord);
        if(absSq(zn) > divergenceBound) {
            return n;
        }
    }
    return maxIterations
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

function drawPixel(img: Uint8ClampedArray, realComp: number, imagComp: number, iterations: number, chunkSize: ChunkSize, options: PlotOptions) {
    const ind = (imagComp * chunkSize.width + realComp) * 4;
    if(iterations < options.maxIterations) {
        img[ind] = 0;
        img[ind + 1] = 0;
        img[ind + 2] = Math.min(128 + iterations, 255);
        img[ind + 3] = 255;
    } else {
        img[ind] = 0;
        img[ind + 1] = 0;
        img[ind + 2] = 0;
        img[ind + 3] = 255;
    }
}

export type ChunkSize = Pick<ViewportBounds, "height" | "width">