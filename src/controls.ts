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
        // Update tooltip position and coordinates
        if(cbs.onMouseMove) {
            cbs.onMouseMove(e.offsetX, e.offsetY, e.clientX, e.clientY);
        }

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
    canvas.addEventListener("mouseleave", () => {
        if(cbs.onMouseLeave) {
            cbs.onMouseLeave();
        }
    });
    canvas.addEventListener("mouseenter", () => {
        if(cbs.onMouseEnter) {
            cbs.onMouseEnter();
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
    onMouseMove?(offsetX: number, offsetY: number, clientX: number, clientY: number): void;
    onMouseLeave?(): void;
    onMouseEnter?(): void;
}