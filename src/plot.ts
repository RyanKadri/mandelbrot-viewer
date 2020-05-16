import { z, Complex, mult, absSq, add } from "./complex";

export function plotSet(ctx: CanvasRenderingContext2D, plot: PlotBounds, viewport: ViewportBounds, options: PlotOptions) {
    const { minReal, maxReal, minImag, maxImag } = plot;
    const { height, width } = viewport;

    const realInc = (maxReal - minReal) / width;
    const imagInc = (maxImag - minImag) / height;
    const img = ctx.createImageData(width, height);
    for(let imagStep = 0; imagStep < height; imagStep ++) {
        for(let realStep = 0; realStep < width; realStep ++) {
            const imagComp = maxImag - imagStep * imagInc;
            const realComp = minReal + realStep * realInc;
            const zInit = z(realComp, imagComp);
            const iterations = iterateMandlebrot(zInit, options);
            drawPixel(img, realStep, imagStep, iterations, viewport, options);
        }
    }
    ctx.putImageData(img, 0, 0);
    drawAxes(ctx, plot, viewport, options)
    
}

function iterateMandlebrot(coord: Complex, options: PlotOptions): number {
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

const axisWidth = 1;
function drawAxes(ctx: CanvasRenderingContext2D, plot: PlotBounds, viewport: ViewportBounds, options: PlotOptions) {
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

export interface PlotBounds {
    minReal: number;
    maxReal: number;
    minImag: number;
    maxImag: number;
}

export interface ViewportBounds {
    height: number;
    width: number;
}

export interface PlotOptions {
    maxIterations: number;
    divergenceBound: number;
}