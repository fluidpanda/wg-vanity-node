import { generateWireguardKeyPair, WireguardKeyPair } from "./wg.js";

export type WorkerMsg =
    | { type: "progress"; attempts: number; elapsedMs: number }
    | { type: "found"; attempts: number; elapsedMs: number; publicKey: string; privateKey: string }
    | { type: "error"; message: string };

function send(msg: WorkerMsg): void {
    if (process.send) {
        process.send(msg);
    }
}

function main(): void {
    const prefix: string | undefined = process.env.WG_PREFIX;
    if (!prefix) {
        send({ type: "error", message: "WG_PREFIX is not set" });
        process.exit(2);
    }
    const reportEveryAttempts: number = Number(process.env.WG_REPORT_EVERY);
    const ignoreCase: boolean = process.env.WG_IGNORE_CASE === "1";
    const prefixNorm: string = ignoreCase ? prefix.toLowerCase() : prefix;
    const started: number = Date.now();
    let attempts: number = 0;
    while (true) {
        const pair: WireguardKeyPair = generateWireguardKeyPair();
        const candidate: string = pair.publicKey.slice(0, prefix.length);
        const candidateNorm: string = ignoreCase ? candidate.toLowerCase() : candidate;
        attempts++;
        if (candidateNorm === prefixNorm) {
            send({
                type: "found",
                attempts,
                elapsedMs: Date.now() - started,
                publicKey: pair.publicKey,
                privateKey: pair.privateKey,
            });
            process.exit(0);
        }
        if (attempts % reportEveryAttempts === 0) {
            send({
                type: "progress",
                attempts,
                elapsedMs: Date.now() - started,
            });
        }
    }
}

main();
