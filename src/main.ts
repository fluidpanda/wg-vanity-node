import { CliOptions, parseArgs, printHelp } from "./cli.js";
import { findVanityWireguardPairMT, MTSearchResult } from "./wg_master.js";
import { getSystemInfoCached, SystemInfo } from "./system.js";

async function main(): Promise<void> {
    const options: CliOptions = parseArgs(process.argv.slice(2));
    const vanityOptions = {
        jobs: options.jobs,
        ignoreCase: options.ignoreCase,
    };
    if (options.help) {
        printHelp();
        return;
    }
    if (options.prefix) {
        const res: MTSearchResult = await findVanityWireguardPairMT(options.prefix, vanityOptions);
        console.log(`prefix: ${res.prefix}`);
        console.log(`jobs: ${res.jobs}`);
        console.log(`ignore-case: ${options.ignoreCase ? "on" : "off"}`);
        console.log(`attempts: ${res.attemptsTotal}`);
        console.log(`elapsed: ${res.elapsedMs}ms`);
        console.log(`public key: ${res.publicKey}`);
        console.log(`private key: ${res.privateKey}`);
    }
    const info: SystemInfo = getSystemInfoCached();
    console.log(info.memory);
}

main().catch((err): never => {
    const msg: string = err instanceof Error ? err.message : String(err);
    console.error(`Error: ${msg}`);
    process.exit(1);
});
