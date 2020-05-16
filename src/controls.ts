let dragStart: Point | null = null;
let lastPoint: Point | null = null;

export function setupPlotListeners(canvas: HTMLCanvasElement, cbs: PlotCallbacks) {
    canvas.addEventListener("mousedown", e => {
        dragStart = {
            x: e.clientX,
            y: e.clientY
        };
    });
    canvas.addEventListener("mouseup", e => {
        const end = {
            x: e.clientX,
            y: e.clientY
        };
        console.log(`Dragged from ${ printPoint(dragStart!) } to ${ printPoint(end) }`)
        dragStart = null;
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
    })
}

function printPoint(p: Point) {
    return `(${p.x}, ${p.y})`;
}

interface Point {
    x: number;
    y: number;
}

export interface PlotCallbacks {
    onDragUpdate(moveX: number, moveY: number): void;
    onDragComplete(): void;
}