import { Plot, memory } from "../pkg/mandelbrot_calculator";
import { PlotBounds, PlotOptions, ViewportBounds } from "./plot.types";
import { z, Complex, add, mult, absSq } from "./complex";

export function plotChunk(data: Uint8ClampedArray, bounds: PlotBounds, chunkSize: ChunkSize, options: PlotOptions) {
    if(options.calcMethod === "optimized-js") {
        plotChunkJs(data, bounds, chunkSize, options);
    } else if(options.calcMethod === "wasm"){
        plotChunkWasm(data, bounds, chunkSize, options);
    } else {
        plotChunkNaiveJS(data, bounds, chunkSize, options)
    }
}

function plotChunkWasm(buffer: Uint8ClampedArray, plotBounds: PlotBounds, chunkSize: ChunkSize, options: PlotOptions) {
    const plot = Plot.new(chunkSize.width, chunkSize.height, plotBounds.minReal, plotBounds.realRange, plotBounds.minImag, plotBounds.imagRange, options.maxIterations, options.divergenceBound);
    plot.calc_pixels();
    const cellsPtr = plot.pixels();
    const pixelArray = new Uint8ClampedArray(memory.buffer, cellsPtr, chunkSize.width * chunkSize.height * 4);
    buffer.set(pixelArray);
}

function plotChunkJs(buffer: Uint8ClampedArray, plot: PlotBounds, chunkSize: ChunkSize, options: PlotOptions) {
    const { minReal, realRange, minImag, imagRange } = plot;
    const { height, width } = chunkSize;

    const realInc = realRange / width;
    const imagInc = imagRange / height;
    for(let imagStep = 0; imagStep < height; imagStep ++) {
        const imagComp = (minImag + imagRange) - imagStep * imagInc;
        for(let realStep = 0; realStep < width; realStep ++) {
            const realComp = minReal + realStep * realInc;
            const iterations = iterateMandelbrot(realComp, imagComp, options);
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
            const iterations = iterateMandelbrotNaive(zInit, options);
            drawPixel(buffer, realStep, imagStep, iterations, chunkSize, options);
        }
    }
}

function iterateMandelbrotNaive(coord: Complex, options: PlotOptions): number {
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

function iterateMandelbrot(realComp: number, imagComp: number, options: PlotOptions): number {
    const { maxIterations, divergenceBound } = options;
    const div2 = divergenceBound ** 2;
    let real = 0, imag = 0;
    for(let n = 0; n < maxIterations; n++) {
        let newReal = real * real - imag * imag + realComp
        imag = 2 * imag * real + imagComp;
        real = newReal;
        const magnitudeSq = real ** 2 + imag ** 2;
        if(magnitudeSq > div2) {
            // Smooth iteration count using continuous coloring
            // This adds a fractional part based on how far past the escape radius we went
            const smoothN = n + 1 - Math.log2(Math.log2(magnitudeSq) / 2);
            return smoothN;
        }
    }
    return maxIterations
}

function drawPixel(img: Uint8ClampedArray, realComp: number, imagComp: number, iterations: number, chunkSize: ChunkSize, options: PlotOptions) {
    const ind = (imagComp * chunkSize.width + realComp) * 4;
    if(iterations < options.maxIterations) {
        // Use smooth iteration count for gradient coloring
        // Apply logarithmic scaling to spread out colors more evenly
        const t = Math.log(iterations + 1) / Math.log(options.maxIterations + 1);

        // Create a smooth color gradient using sinusoidal functions
        // This creates smooth bands that blend into each other
        const hue = t * 360 + 180;
        const saturation = 0.5;
        const lightness = t < 0.5 ? 0.4 + t * 0.4 : 0.6 - (t - 0.5) * 0.4;

        const [r, g, b] = hslToRgb(hue, saturation, lightness);
        img[ind + 0] = r;
        img[ind + 1] = g;
        img[ind + 2] = b;
        img[ind + 3] = 255;
    } else {
        img[ind] = 0;
        img[ind + 1] = 0;
        img[ind + 2] = 0;
        img[ind + 3] = 255;
    }
}

// Uses some trig hacks that I don't understand apparently
function hslToRgb(h: number, s: number, l: number): [number, number, number] {
    h = h / 360;
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;

    const hueToRgb = (t: number) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1/6) return p + (q - p) * 6 * t;
        if (t < 1/2) return q;
        if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
        return p;
    };

    return [
        Math.round(hueToRgb(h + 1/3) * 255),
        Math.round(hueToRgb(h) * 255),
        Math.round(hueToRgb(h - 1/3) * 255)
    ];
}

export type ChunkSize = Pick<ViewportBounds, "height" | "width">