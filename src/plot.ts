import { Plot } from "../pkg/mandelbrot_calculator";
import { PlotBounds, PlotOptions, ViewportBounds } from "./plot.types";
import { memory } from "../pkg/mandelbrot_calculator_bg";

export function plotChunkWasm(plotImage: ImageData, plotBounds: PlotBounds, chunkSize: ChunkSize, options: PlotOptions) {
    const plot = Plot.new(chunkSize.width, chunkSize.height, plotBounds.minReal, plotBounds.realRange, plotBounds.minImag, plotBounds.imagRange, options.maxIterations, options.divergenceBound);
    console.time("WASM Plot")
    plot.calc_pixels();
    console.timeEnd("WASM Plot")
    const cellsPtr = plot.pixels();
    const pixelArray = new Uint8ClampedArray(memory.buffer, cellsPtr, chunkSize.width * chunkSize.height * 4);
    plotImage.data.set(pixelArray);
}

export function plotChunkJs(plotImage: ImageData, plot: PlotBounds, chunkSize: ChunkSize, options: PlotOptions) {
    console.time("JS Plot")
    const { minReal, realRange, minImag, imagRange } = plot;
    const { height, width } = chunkSize;

    const realInc = realRange / width;
    const imagInc = imagRange / height;
    for(let imagStep = 0; imagStep < height; imagStep ++) {
        const imagComp = (minImag + imagRange) - imagStep * imagInc;
        for(let realStep = 0; realStep < width; realStep ++) {
            const realComp = minReal + realStep * realInc;
            const iterations = iterateMandlebrot(realComp, imagComp, options);
            drawPixel(plotImage, realStep, imagStep, iterations, chunkSize, options);
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

function drawPixel(img: ImageData, realComp: number, imagComp: number, iterations: number, chunkSize: ChunkSize, options: PlotOptions) {
    const ind = (imagComp * chunkSize.width + realComp) * 4;
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

export type ChunkSize = Pick<ViewportBounds, "height" | "width">