let dragStart: Point | null = null;
let lastPoint: Point | null = null;

export function setupPlotListeners(canvas: HTMLCanvasElement, cbs: PlotCallbacks) {
    canvas.addEventListener("mousedown", e => {
        dragStart = {
            x: e.clientX,
            y: e.clientY
        };
    });
    canvas.addEventListener("mouseup", _ => {
        dragStart = null;
        lastPoint = null;
        cbs.onDragComplete();
    });
    canvas.addEventListener("mousemove", e => {
        if(dragStart !== null) {
            if(lastPoint !== null) {
                cbs.onDragUpdate(e.clientX - lastPoint.x, e.clientY - lastPoint.y);
            }
            lastPoint = {
                x: e.clientX,
                y: e.clientY
            }
        }
    });
    canvas.addEventListener("wheel", e => {
        e.preventDefault();
        // Scrolling up is a negative deltaY. It should correspond to zooming in (higher percent)
        // each 100 ticks should correspond to an additional zoom in or out of 5%/*  */
        const zoomFactor = -e.deltaY / 100;
        const zoomPercent = 1.05 ** zoomFactor 
        cbs.onZoom(zoomPercent, { x: e.offsetX, y: e.offsetY });
    });
}

interface Point {
    x: number;
    y: number;
}

export interface PlotCallbacks {
    onDragUpdate(moveX: number, moveY: number): void;
    onDragComplete(): void;
    onZoom(zoomAmount: number, zoomCenter: Point): void;
}