import path from "node:path";
import readline from "node:readline";
import { ChildProcess, fork } from "node:child_process";
import { clearInterval } from "node:timers";
import { estimateTime, estimateVanity, VanityEstimate, VanityTimeEstimate } from "./wg.js";
import { getSystemInfoCached } from "./system.js";
import { SETTINGS } from "./settings.js";
import { WorkerMsg } from "./wg_slave.js";

function progressLineRenderBegin(line: string): void {
    if (process.stderr.isTTY) {
        readline.clearLine(process.stderr, 0);
        readline.cursorTo(process.stderr, 0);
        process.stderr.write(line);
    } else {
        process.stderr.write(line + "\n");
    }
}

function progressLineRenderEnd(): void {
    if (process.stderr.isTTY) {
        process.stderr.write("\n");
    }
}

export interface MTSearchOptions {
    jobs?: number;
    reportIntervalMs?: number;
    reportEveryAttempts?: number;
    ignoreCase?: boolean;
}

export interface MTSearchResult {
    prefix: string;
    jobs: number;
    attemptsTotal: number;
    elapsedMs: number;
    publicKey: string;
    privateKey: string;
}

export async function findVanityWireguardPairMT(
    prefix: string,
    options: MTSearchOptions = {},
): Promise<MTSearchResult> {
    const jobs: number = Math.max(1, options.jobs ?? getSystemInfoCached().cpu.threads - 1);
    const reportEveryAttempts: number = SETTINGS.report.everyAttempts;
    const reportIntervalMs: number = SETTINGS.report.intervalMs;
    const ignoreCase: boolean = !!options.ignoreCase;
    const est: VanityEstimate = estimateVanity(prefix);
    const worker: string = path.resolve("dist", "./wg_slave.js");
    const started: number = Date.now();
    const attemptsByPid = new Map<number, number>();
    const slaves: ChildProcess[] = Array.from({ length: jobs }, (): ChildProcess => {
        const slave: ChildProcess = fork(worker, [], {
            env: {
                ...process.env,
                WG_PREFIX: prefix,
                WG_REPORT_EVERY: String(reportEveryAttempts),
                WG_IGNORE_CASE: ignoreCase ? "1" : "0",
            },
        });
        attemptsByPid.set(slave.pid ?? Math.random(), 0);
        return slave;
    });
    const killOther = (winnerPid?: number): void => {
        for (const slave of slaves) {
            if (!slave.killed && slave.pid !== winnerPid) {
                slave.kill("SIGTERM");
            }
        }
    };
    const reporter = setInterval(() => {
        let attemptsTotal: number = 0;
        for (const v of attemptsByPid.values()) attemptsTotal += v;
        const elapsedMs: number = Date.now() - started;
        const aps: number = elapsedMs > 0 ? (attemptsTotal / elapsedMs) * 1000 : 0;
        if (aps <= 0) {
            progressLineRenderBegin(
                `Progress: attempts ${attemptsTotal}, rate 0.0 aps, ` +
                    `expected ${est.expectedAttempts} attempts, ETA N/A`,
            );
            return;
        }
        const timeEst: VanityTimeEstimate = estimateTime(prefix, aps);
        progressLineRenderBegin(
            `Progress: attempts ${attemptsTotal}, rate ${aps.toFixed(1)} aps, ` +
                `expected ${est.expectedAttempts} attempts, ETA ~${Math.round(timeEst.expectedSeconds)}s`,
        );
    }, reportIntervalMs);
    return await new Promise<MTSearchResult>((resolve, reject): void => {
        for (const slave of slaves) {
            slave.on("message", (raw: unknown): void => {
                const msg = raw as WorkerMsg;
                if (!slave.pid) return;
                if (msg.type === "progress") {
                    attemptsByPid.set(slave.pid, msg.attempts);
                    return;
                }
                if (msg.type === "found") {
                    attemptsByPid.set(slave.pid, msg.attempts);
                    let attemptsTotal: number = 0;
                    for (const v of attemptsByPid.values()) attemptsTotal += v;
                    clearInterval(reporter);
                    progressLineRenderEnd();
                    killOther(slave.pid);
                    resolve({
                        prefix,
                        jobs,
                        attemptsTotal,
                        elapsedMs: Date.now() - started,
                        publicKey: msg.publicKey,
                        privateKey: msg.privateKey,
                    });
                    return;
                }
                if (msg.type === "error") {
                    clearInterval(reporter);
                    progressLineRenderEnd();
                    killOther();
                    reject(new Error(msg.message));
                }
            });
            slave.on("exit", (code: number | null): void => {
                void code;
            });
        }
    });
}
