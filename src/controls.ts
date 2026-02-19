let dragStart: Point | null = null;
let lastPoint: Point | null = null;
let zoomBoxStart: Point | null = null;

// Touch state
let touchLastPoint: Point | null = null;
let pinchState: { startDist: number; startCenter: Point; currentScale: number } | null = null;

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

    // Touch support
    canvas.addEventListener("touchstart", e => {
        e.preventDefault();
        if (e.touches.length === 1) {
            // Single finger - prepare for pan
            touchLastPoint = { x: e.touches[0].clientX, y: e.touches[0].clientY };
            pinchState = null;
        } else if (e.touches.length === 2) {
            // Two fingers - prepare for pinch zoom
            const dist = getTouchDistance(e.touches[0], e.touches[1]);
            const center = getTouchCanvasPoint(e.touches[0], e.touches[1], canvas);
            pinchState = { startDist: dist, startCenter: center, currentScale: 1 };
            touchLastPoint = null;
        }
    }, { passive: false });

    canvas.addEventListener("touchmove", e => {
        e.preventDefault();
        if (e.touches.length === 1 && touchLastPoint !== null && pinchState === null) {
            // Single finger pan - update position without re-rendering
            const touch = e.touches[0];
            cbs.onDragUpdate(
                touch.clientX - touchLastPoint.x,
                touch.clientY - touchLastPoint.y
            );
            touchLastPoint = { x: touch.clientX, y: touch.clientY };
        } else if (e.touches.length === 2 && pinchState !== null) {
            // Two finger pinch - update CSS transform for visual feedback only (no re-render)
            const dist = getTouchDistance(e.touches[0], e.touches[1]);
            const scale = dist / pinchState.startDist;
            pinchState = { ...pinchState, currentScale: scale };
            if (cbs.onTouchZoomUpdate) {
                cbs.onTouchZoomUpdate(scale, pinchState.startCenter);
            }
        }
    }, { passive: false });

    canvas.addEventListener("touchend", e => {
        e.preventDefault();
        if (e.touches.length === 0) {
            if (pinchState !== null) {
                // Pinch complete - commit zoom with a single re-render
                cbs.onZoom(pinchState.currentScale, pinchState.startCenter);
                pinchState = null;
            } else {
                cbs.onDragComplete();
            }
            touchLastPoint = null;
        } else if (e.touches.length === 1) {
            // Transitioned from pinch back to single finger - commit zoom, resume pan
            if (pinchState !== null) {
                cbs.onZoom(pinchState.currentScale, pinchState.startCenter);
                pinchState = null;
            }
            touchLastPoint = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        }
    }, { passive: false });
}

function getTouchDistance(t1: Touch, t2: Touch): number {
    const dx = t1.clientX - t2.clientX;
    const dy = t1.clientY - t2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
}

function getTouchCanvasPoint(t1: Touch, t2: Touch, canvas: HTMLCanvasElement): Point {
    const rect = canvas.getBoundingClientRect();
    return {
        x: (t1.clientX + t2.clientX) / 2 - rect.left,
        y: (t1.clientY + t2.clientY) / 2 - rect.top,
    };
}

interface Point {
    x: number;
    y: number;
}

export interface PlotCallbacks {
    onDragUpdate(moveX: number, moveY: number): void;
    onDragComplete(): void;
    onZoom(zoomAmount: number, zoomCenter: Point): void;
    onTouchZoomUpdate?(scale: number, center: Point): void;
    onMouseMove?(offsetX: number, offsetY: number, clientX: number, clientY: number): void;
    onMouseLeave?(): void;
    onMouseEnter?(): void;
    onZoomBoxStart?(startX: number, startY: number): void;
    onZoomBoxUpdate?(currentX: number, currentY: number): void;
    onZoomBoxEnd?(endX: number, endY: number): void;
}
