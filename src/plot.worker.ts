import { plotChunk } from "./plot";

self.addEventListener("message", (e: MessageEvent) => {
    if(!e || !e.data) return
    switch(e.data.type) {
        case "plot":
            const { buffer, bounds, chunkSize, options, chunkId } = e.data.payload;
            plotChunk(buffer, bounds, chunkSize, options);
            self.postMessage({ type: "chunk-done", buffer, chunkId }, [ buffer.buffer ])
            break;
    }
});

self.postMessage({ type: "ready" });

export default null;