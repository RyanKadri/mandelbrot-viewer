import { Plot } from "../pkg/mandelbrot_calculator";
import { memory } from "../pkg/mandelbrot_calculator_bg";
import { PlotBounds, PlotOptions, ViewportBounds } from "./plot.types";

export class PlotManager {

    private readonly axisWidth = 1;

    private nChunksHoriz: number;
    private nChunksVert: number;
    private plotChunks: PlotChunk[][];
    private viewXOffset: number;
    private viewYOffset: number;
    private chunkSize: ChunkSize;

    constructor(
        private viewport: ViewportBounds,
        private plotBounds: PlotBounds,
        private options: PlotOptions,
        private ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D
    ) { 
        this.nChunksHoriz = Math.ceil((viewport.width + 2 * viewport.renderDistBuffer) / viewport.chunkSize) + 1;
        this.nChunksVert = Math.ceil((viewport.width + 2 * viewport.renderDistBuffer) / viewport.chunkSize) + 1;
        this.viewXOffset = Math.round(((this.nChunksHoriz - 1) * viewport.chunkSize - viewport.width) / 2)
        this.viewYOffset = Math.round(((this.nChunksHoriz - 1) * viewport.chunkSize - viewport.height) / 2)

        this.plotChunks = [];
        let ind = 0;
        for(let row = 0; row < this.nChunksVert; row++) {
            const rowChunks: PlotChunk[] = [];
            this.plotChunks.push(rowChunks);
            for(let col = 0; col < this.nChunksHoriz; col++) {
                rowChunks.push({
                    data: new ImageData(viewport.chunkSize, viewport.chunkSize),
                    top: -this.viewYOffset + row * viewport.chunkSize,
                    left: -this.viewXOffset + col * viewport.chunkSize,
                    dirty: false,
                    id: "" + ind
                })
                ind ++;
            }
        }
        this.chunkSize = { height: this.viewport.chunkSize, width: this.viewport.chunkSize }
    }

    shiftPlot(moveX: number, moveY: number, moveReal: number, moveImag: number) {
        this.viewXOffset -= moveX;
        this.viewYOffset -= moveY;
        this.plotBounds.minReal -= moveReal;
        this.plotBounds.minImag += moveImag;
        for(const row of this.plotChunks) {
            for(const chunk of row) {
                chunk.top += moveY;
                chunk.left += moveX;
            }
        }
        this.recenterIfNeeded();
        this.regenerateDirty();
        this.refreshChunkPlacement(this.ctx);
    }

    plotSet() {
        for(let rowInd = 0; rowInd < this.plotChunks.length; rowInd ++) {
            const row = this.plotChunks[rowInd];
            for(let colInd = 0; colInd < row.length; colInd ++) {
                const chunk = row[colInd];
                this.plotChunk(chunk)
            }
        }
        this.refreshChunkPlacement(this.ctx);
    }

    private recenterIfNeeded() {
        const newPlotChunks: PlotChunk[][] = []
        if(this.viewYOffset < this.viewport.renderDistBuffer) {
            const lastRow = this.plotChunks[this.plotChunks.length - 1];
            lastRow.forEach(chunk => { 
                chunk.dirty = true;
                chunk.top -= this.nChunksVert * (this.viewport.chunkSize)
            });
            newPlotChunks.push(lastRow);
            for(let i = 0; i < this.plotChunks.length - 1; i++) {
                const row = this.plotChunks[i];
                newPlotChunks.push(row);
            }
            this.plotChunks = newPlotChunks;
            this.viewYOffset += this.viewport.chunkSize
        } else if(this.viewYOffset > this.chunkSize.height + this.viewport.renderDistBuffer) {
            for(let i = 1; i < this.plotChunks.length; i++) {
                const row = this.plotChunks[i];
                newPlotChunks.push(row);
            }
            const firstRow = this.plotChunks[0];
            firstRow.forEach(chunk => { 
                chunk.dirty = true;
                chunk.top += this.nChunksVert * (this.viewport.chunkSize)
            });
            newPlotChunks.push(firstRow);
            this.plotChunks = newPlotChunks;
            this.viewYOffset -= this.viewport.chunkSize
        }
    }

    private regenerateDirty() {
        for(const row of this.plotChunks) {
            for(const chunk of row) {
                if(chunk.dirty) {
                    this.plotChunk(chunk);
                    chunk.dirty = false;
                }
            }
        }
    }

    private refreshChunkPlacement(ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D) {
        for(const row of this.plotChunks) {
            for(const chunk of row) {
                ctx.putImageData(chunk.data, chunk.left, chunk.top);
                ctx.strokeStyle = "red";
                ctx.strokeRect(chunk.left, chunk.top, this.viewport.chunkSize, this.viewport.chunkSize);
                ctx.strokeText(chunk.id, chunk.left + this.viewport.chunkSize / 2, chunk.top + this.viewport.chunkSize / 2)
            }
        }
    }

    private plotChunk(chunk: PlotChunk) {
        const realStep = this.plotBounds.realRange / this.viewport.width;
        const imagStep = this.plotBounds.imagRange / this.viewport.height;
        
        const chunkMaxImag = this.plotBounds.minImag + this.plotBounds.imagRange;

        const bounds: PlotBounds = {
            minReal: this.plotBounds.minReal + chunk.left * realStep,
            realRange: this.plotBounds.realRange / this.viewport.width * this.chunkSize.width,
            minImag: chunkMaxImag - ((chunk.top + this.chunkSize.height) * imagStep),
            imagRange: this.plotBounds.imagRange / this.viewport.height * this.chunkSize.height
        }
        if(this.options.calcMethod === "vanilla-js") {
            this.plotChunkJs(chunk.data, bounds);
        } else {
            this.plotChunkWasm(chunk.data, bounds);
        }
    }

    private plotChunkWasm(plotImage: ImageData, plotBounds: PlotBounds) {
        const plot = Plot.new(this.chunkSize.width, this.chunkSize.height, plotBounds.minReal, plotBounds.realRange, plotBounds.minImag, plotBounds.imagRange, this.options.maxIterations, this.options.divergenceBound);
        console.time("WASM Plot")
        plot.calc_pixels();
        console.timeEnd("WASM Plot")
        const cellsPtr = plot.pixels();
        const pixelArray = new Uint8ClampedArray(memory.buffer, cellsPtr, this.chunkSize.width * this.chunkSize.height * 4);
        plotImage.data.set(pixelArray);
    }
    
    private plotChunkJs(plotImage: ImageData, plot: PlotBounds) {
        console.time("JS Plot")
        const { minReal, realRange, minImag, imagRange } = plot;
        const { height, width } = this.chunkSize;
    
        const realInc = realRange / width;
        const imagInc = imagRange / height;
        for(let imagStep = 0; imagStep < height; imagStep ++) {
            const imagComp = (minImag + imagRange) - imagStep * imagInc;
            for(let realStep = 0; realStep < width; realStep ++) {
                const realComp = minReal + realStep * realInc;
                const iterations = this.iterateMandlebrot(realComp, imagComp, this.options);
                this.drawPixel(plotImage, realStep, imagStep, iterations, this.options);
            }
        }
        console.timeEnd("JS Plot")
    }
    
    private iterateMandlebrot(realComp: number, imagComp: number, options: PlotOptions): number {
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
    
    drawAxes(plot: PlotBounds, viewport: ViewportBounds) {
        const { minReal, realRange, minImag, imagRange } = plot;
        const { height, width } = viewport;
        
        this.ctx.fillStyle = "red";
        const maxReal = minReal + realRange;
        const maxImag = minImag + imagRange;
        if(maxReal > 0 && minReal < 0) {
            const yAxisHoriz = -minReal / (maxReal - minReal) * width;
            this.ctx.fillRect(yAxisHoriz, 0, this.axisWidth, height);
        }
        if(maxImag > 0 && minImag < 0) {
            const xAxisVert = maxImag / (maxImag - minImag) * height;
            this.ctx.fillRect(0, xAxisVert, width, this.axisWidth);
        }
    }
    
    private drawPixel(img: ImageData, realComp: number, imagComp: number, iterations: number, options: PlotOptions) {
        const ind = (imagComp * this.chunkSize.width + realComp) * 4;
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
}


interface PlotChunk {
    data: ImageData;
    top: number;
    left: number;
    dirty: boolean;
    id: string;
}

type ChunkSize = Pick<ViewportBounds, "height" | "width">