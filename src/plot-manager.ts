import { ChunkSize, plotChunk } from "./plot";
import { PlotBounds, PlotOptions, ViewportBounds } from "./plot.types";

export class PlotManager {

    private readonly axisWidth = 1;

    private nChunksHoriz: number;
    private nChunksVert: number;
    private plotChunks: PlotChunk[][];
    private viewXOffset: number;
    private viewYOffset: number;
    private chunkSize: ChunkSize;
    private renderWorker: Worker;
    private pendingChunks: PlotChunk[] = [];

    constructor(
        private viewport: ViewportBounds,
        private plotBounds: PlotBounds,
        private options: PlotOptions,
        private ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
        private onReady: () => void
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
                    image: new ImageData(viewport.chunkSize, viewport.chunkSize),
                    top: -this.viewYOffset + row * viewport.chunkSize,
                    left: -this.viewXOffset + col * viewport.chunkSize,
                    dirty: false,
                    id: "" + ind
                })
                ind ++;
            }
        }
        this.chunkSize = { height: this.viewport.chunkSize, width: this.viewport.chunkSize }
        this.renderWorker = new Worker("./bootstrap.worker.ts", { type: 'module', name: "plot-worker" });
        this.renderWorker.addEventListener("message", (e) => {
            switch(e.data.type) {
                case "chunk-done":
                    for(const row of this.plotChunks) {
                        for(const chunk of row) {
                            if(chunk.id === e.data.chunkId) {
                                chunk.image = new ImageData(e.data.buffer, this.chunkSize.width, this.chunkSize.height);
                                ctx.putImageData(chunk.image, chunk.left, chunk.top);
                            }
                        }
                    }
                    break;
                case "ready":
                    this.onReady()
                    break;
            }
        })
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

    close() {
        if(this.renderWorker) {
            this.renderWorker.terminate();
        }
    }

    private recenterIfNeeded() {
        if(this.viewYOffset < this.viewport.renderDistBuffer) {
            const lastRow = this.plotChunks[this.plotChunks.length - 1];
            lastRow.forEach(chunk => { 
                chunk.dirty = true;
                chunk.top -= this.nChunksVert * this.viewport.chunkSize
            });
            this.viewYOffset += this.viewport.chunkSize
        } else if(this.viewYOffset > this.chunkSize.height + this.viewport.renderDistBuffer) {
            const firstRow = this.plotChunks[0];
            firstRow.forEach(chunk => { 
                chunk.dirty = true;
                chunk.top += this.nChunksVert * this.viewport.chunkSize
            });
            this.viewYOffset -= this.viewport.chunkSize
        }
        if(this.viewXOffset < this.viewport.renderDistBuffer) {
            for(const row of this.plotChunks) {
                const lastRow = row[row.length - 1]
                lastRow.left -= this.nChunksVert * this.viewport.chunkSize
                lastRow.dirty = true;
            }
            this.viewXOffset += this.viewport.chunkSize;
        } else if(this.viewXOffset > this.chunkSize.width + this.viewport.renderDistBuffer) {
            for(const row of this.plotChunks) {
                const firstCol = row[0]
                firstCol.left += this.nChunksVert * this.viewport.chunkSize
                firstCol.dirty = true;
            }
            this.viewXOffset -= this.viewport.chunkSize;
        }
        this.plotChunks = this.plotChunks.sort((a, b) => a[0].top - b[0].top);
        this.plotChunks = this.plotChunks.map(row => row.sort((a, b) => a.left - b.left));
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
                if(chunk.image.data.length > 0) {
                    ctx.putImageData(chunk.image, chunk.left, chunk.top);
                }
                if(this.options.showRenderChunks) {
                    ctx.strokeStyle = "green";
                    ctx.strokeRect(chunk.left, chunk.top, this.viewport.chunkSize, this.viewport.chunkSize);
                    ctx.strokeText(chunk.id, chunk.left + this.viewport.chunkSize / 2, chunk.top + this.viewport.chunkSize / 2)
                }
            }
        }
        this.drawAxes()
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
        if(!this.options.useWebWorker) {
            plotChunk(chunk.image.data, this.plotBounds, this.chunkSize, this.options);
            this.ctx.putImageData(chunk.image, chunk.left, chunk.top);
        } else {
            const buffer = chunk.image.data;
            this.renderWorker.postMessage({ type: "plot", payload: {
                buffer,
                bounds,
                chunkSize: this.chunkSize,
                options: this.options,
                chunkId: chunk.id
            }}, [buffer.buffer]);
        }
    }
    
    private drawAxes() {
        const { minReal, realRange, minImag, imagRange } = this.plotBounds;
        const { height, width } = this.viewport;
        
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
}


interface PlotChunk {
    image: ImageData;
    top: number;
    left: number;
    dirty: boolean;
    id: string;
}