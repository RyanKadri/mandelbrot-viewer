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
    private renderWorkers: Worker[] = [];
    private pendingChunks: PlotChunk[] = [];

    constructor(
        private viewport: ViewportBounds,
        private plotBounds: PlotBounds,
        private options: PlotOptions,
        private ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
        private onRenderingChange: (rendering: boolean) => void
    ) { 
        this.nChunksHoriz = Math.ceil((viewport.width + 2 * viewport.renderDistBuffer) / viewport.chunkSize) + 1;
        this.nChunksVert = Math.ceil((viewport.height + 2 * viewport.renderDistBuffer) / viewport.chunkSize) + 1;
        this.viewXOffset = Math.round(((this.nChunksHoriz - 1) * viewport.chunkSize - viewport.width) / 2)
        this.viewYOffset = Math.round(((this.nChunksVert - 1) * viewport.chunkSize - viewport.height) / 2)

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
                    id: "" + ind,
                    calculating: false
                })
                ind ++;
            }
        }
        this.chunkSize = { height: this.viewport.chunkSize, width: this.viewport.chunkSize }
    }

    async initialize() {
        let newWorkers: Promise<void>[] = []
        for(let i = 0; i < this.options.numWorkers; i++) {
            const worker = new Worker(new URL("./plot.worker.ts", import.meta.url), { type: "module"});
            const initPromise = new Promise<void>((res) => {
                worker.addEventListener("message", function listenReady(e: MessageEvent) {
                    switch(e.data.type) {
                        case "ready":
                            worker.removeEventListener("message", listenReady);
                            res();
                            break;
                    }
                });
            })
            this.renderWorkers.push(worker)
            newWorkers.push(initPromise)
        }
        await Promise.all(newWorkers)
    }

    async updateParams(plotBounds: PlotBounds, options: PlotOptions) {
        this.plotBounds = plotBounds;
        this.options = options;
        this.plotChunks.forEach(row => {
            row.forEach(chunk => {
                chunk.dirty = true;
            })
        });
        await this.regenerateDirty();
    }

    async shiftPlot(moveX: number, moveY: number, moveReal: number, moveImag: number) {
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
        await this.regenerateDirty();
    }

    async plotSet() {
        for(let rowInd = 0; rowInd < this.plotChunks.length; rowInd ++) {
            const row = this.plotChunks[rowInd];
            for(let colInd = 0; colInd < row.length; colInd ++) {
                const chunk = row[colInd];
                this.pendingChunks.push(chunk);
            }
        }
        await this.drainChunkQueue();
    }

    close() {
        (this.renderWorkers || []).forEach(worker => worker.terminate());
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
                const lastCol = row[row.length - 1]
                lastCol.left -= this.nChunksHoriz * this.viewport.chunkSize
                lastCol.dirty = true;
            }
            this.viewXOffset += this.viewport.chunkSize;
        } else if(this.viewXOffset > this.chunkSize.width + this.viewport.renderDistBuffer) {
            for(const row of this.plotChunks) {
                const firstCol = row[0]
                firstCol.left += this.nChunksHoriz * this.viewport.chunkSize
                firstCol.dirty = true;
            }
            this.viewXOffset -= this.viewport.chunkSize;
        }
        this.plotChunks = this.plotChunks.sort((a, b) => a[0].top - b[0].top);
        this.plotChunks = this.plotChunks.map(row => row.sort((a, b) => a.left - b.left));
    }

    private async regenerateDirty() {
        for(const row of this.plotChunks) {
            for(const chunk of row) {
                if(chunk.dirty && !chunk.calculating && !this.pendingChunks.some(pending => pending.id === chunk.id)) {
                    this.pendingChunks.push(chunk);
                }
            }
        }
        await this.drainChunkQueue();
    }

    private refreshChunkPlacement() {
        for(const row of this.plotChunks) {
            for(const chunk of row) {
                if(chunk.image.data.length > 0) {
                    this.ctx.putImageData(chunk.image, chunk.left, chunk.top);
                }
                if(this.options.showRenderChunks) {
                    this.ctx.strokeStyle = "green";
                    this.ctx.strokeRect(chunk.left, chunk.top, this.viewport.chunkSize, this.viewport.chunkSize);
                    this.ctx.strokeText(chunk.id, chunk.left + this.viewport.chunkSize / 2, chunk.top + this.viewport.chunkSize / 2)
                }
            }
        }
        this.drawAxes()
    }

    private async drainChunkQueue() {
        this.onRenderingChange(true);
        const drainingWork = this.renderWorkers.map(worker => this.checkQueue(worker));
        await Promise.all(drainingWork);
        this.refreshChunkPlacement();
        this.onRenderingChange(false);
    }

    private checkQueue = async (worker: Worker): Promise<void> => {
        const nextChunk = this.pendingChunks.shift();
        if(nextChunk) {
            nextChunk.calculating = true;
            await this.plotChunk(nextChunk, worker)
            nextChunk.calculating = false;
            nextChunk.dirty = false;
            return this.checkQueue(worker)
        } else {
            return Promise.resolve()
        }
    }

    private async plotChunk(chunk: PlotChunk, worker: Worker) {
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
            plotChunk(chunk.image.data, bounds, this.chunkSize, this.options);
            this.ctx.putImageData(chunk.image, chunk.left, chunk.top);
        } else {
            const buffer = chunk.image.data;
            worker.postMessage({ type: "plot", payload: {
                buffer,
                bounds,
                chunkSize: this.chunkSize,
                options: this.options,
                chunkId: chunk.id
            }}, [buffer.buffer]);
            await new Promise((res) => {
                const chunkListener = (e: MessageEvent) => {
                    if(e.data?.type === "chunk-done") {
                        for(const row of this.plotChunks) {
                            for(const chunk of row) {
                                if(chunk.id === e.data.chunkId) {
                                    chunk.image = new ImageData(e.data.buffer, this.chunkSize.width, this.chunkSize.height);
                                    this.ctx.putImageData(chunk.image, chunk.left, chunk.top);
                                }
                            }
                        }
                        // worker.removeEventListener("message", chunkListener);
                        res()
                    }
                }
                worker.addEventListener("message", chunkListener)
            })
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

    clearPlot() {
        this.ctx.fillStyle = "#000086"
        this.ctx.fillRect(0, 0, this.viewport.width, this.viewport.height)
    }
}


interface PlotChunk {
    image: ImageData;
    top: number;
    left: number;
    dirty: boolean;
    calculating: boolean;
    id: string;
}