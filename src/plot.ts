let plotImage: ImageData;

export function plotSet(ctx: CanvasRenderingContext2D, plot: PlotBounds, viewport: ViewportBounds, options: PlotOptions) {
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
    drawAxes(ctx, plot, viewport, options)
}

export function shiftPlot(ctx: CanvasRenderingContext2D, moveReal: number, moveImag: number) {
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
    startReal?: number;
    endReal?: number;
    startImag?: number;
    endImag?: number;
}

export interface PlotOptions {
    maxIterations: number;
    divergenceBound: number;
}