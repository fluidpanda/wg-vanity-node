import os from "node:os";
import { formatBytes } from "./format.js";

export interface SystemInfo {
    cpu: {
        threads: number;
    };
    memory: {
        rss: string;
        heapUsed: string;
    };
}

export function getSystemInfo(): SystemInfo {
    const mem = process.memoryUsage();
    return {
        cpu: {
            threads: os.cpus().length,
        },
        memory: {
            rss: formatBytes(mem.rss),
            heapUsed: formatBytes(mem.heapUsed),
        },
    };
}

let cached: SystemInfo | null = null;

export function getSystemInfoCached(): SystemInfo {
    if (!cached) {
        cached = getSystemInfo();
    }
    return cached;
}
