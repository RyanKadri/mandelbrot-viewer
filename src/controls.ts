let dragStart: Point | null = null;
let lastPoint: Point | null = null;
let zoomBoxStart: Point | null = null;

export function setupPlotListeners(canvas: HTMLCanvasElement, cbs: PlotCallbacks) {
    canvas.addEventListener("mousedown", e => {
        if (e.button === 2) {
            // Right click - start zoom box
            e.preventDefault();
            zoomBoxStart = {
                x: e.offsetX,
                y: e.offsetY
            };
            if (cbs.onZoomBoxStart) {
                cbs.onZoomBoxStart(e.offsetX, e.offsetY);
            }
        } else {
            // Left click - start drag
            dragStart = {
                x: e.clientX,
                y: e.clientY
            };
        }
    });
    canvas.addEventListener("mouseup", e => {
        if (e.button === 2 && zoomBoxStart) {
            // Right click release - complete zoom box
            e.preventDefault();
            if (cbs.onZoomBoxEnd) {
                cbs.onZoomBoxEnd(e.offsetX, e.offsetY);
            }
            zoomBoxStart = null;
        } else {
            dragStart = null;
            lastPoint = null;
            cbs.onDragComplete();
        }
    });
    canvas.addEventListener("mousemove", e => {
        // Update tooltip position and coordinates
        if(cbs.onMouseMove) {
            cbs.onMouseMove(e.offsetX, e.offsetY, e.clientX, e.clientY);
        }

        if (zoomBoxStart) {
            // Drawing zoom box
            if (cbs.onZoomBoxUpdate) {
                cbs.onZoomBoxUpdate(e.offsetX, e.offsetY);
            }
        } else if(dragStart !== null) {
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
    canvas.addEventListener("contextmenu", e => {
        // Prevent context menu on right click
        e.preventDefault();
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
    onZoomBoxStart?(startX: number, startY: number): void;
    onZoomBoxUpdate?(currentX: number, currentY: number): void;
    onZoomBoxEnd?(endX: number, endY: number): void;
}