export interface CliOptions {
    help: boolean;
    prefix?: string;
    jobs?: number;
    ignoreCase: boolean;
}

interface OptionsSpecBase {
    description?: string;
    requires?: string[];
}

interface OptionSpecFlag extends OptionsSpecBase {
    kind: "flag";
    setsHelp?: boolean;
    addsKey?: boolean;
    apply?: (opts: CliOptions) => void;
}

interface OptionsSpecValue<T> extends OptionsSpecBase {
    kind: "value";
    parse: (raw: string) => T;
    apply: (opts: CliOptions, value: T) => void;
}

type OptionSpec = OptionSpecFlag | OptionsSpecValue<unknown>;

function parsePositiveInt(raw: string): number {
    const n: number = Number(raw);
    if (!Number.isInteger(n) || n <= 0) {
        throw new Error("Value must be a positive integer");
    }
    return Math.floor(n);
}

const OPTION_SPECS: Record<string, OptionSpec> = {
    help: {
        kind: "flag",
        description: "Show this help message",
        setsHelp: true,
    },
    prefix: {
        kind: "value",
        description: "Find keypair with public key starting with prefix",
        parse: (raw: string): string => raw,
        apply: (opts: CliOptions, value: unknown): void => {
            opts.prefix = value as string;
        },
    },
    jobs: {
        kind: "value",
        description: "Set number of parallel workers (default: available threads - 1)",
        requires: ["prefix"],
        parse: (raw: string): number => parsePositiveInt(raw),
        apply: (opts: CliOptions, value: unknown): void => {
            opts.jobs = value as number;
        },
    },
    "ignore-case": {
        kind: "flag",
        description: "Ignore letter case when matching prefix",
        requires: ["prefix"],
        apply: (opts: CliOptions): void => {
            opts.ignoreCase = true;
        },
    },
};

export function parseArgs(args: string[]): CliOptions {
    const opts: CliOptions = {
        help: false,
        ignoreCase: false,
    };
    const present = new Set<string>();
    for (let index: number = 0; index < args.length; index++) {
        const token: string = args[index];
        if (!token.startsWith("--")) {
            throw new Error(`Unexpected argument ${token}`);
        }
        const name: string = token.slice(2);
        const spec: OptionSpec = OPTION_SPECS[name];
        if (!spec) {
            throw new Error(`Invalid option ${token}`);
        }
        present.add(name);
        if (spec.kind === "flag") {
            if (spec.setsHelp) opts.help = true;
            spec.apply?.(opts);
            continue;
        }
        const raw: string = args[index + 1];
        if (!raw || raw.startsWith("--")) {
            throw new Error(`${token} requires a value`);
        }
        const parsed: unknown = spec.parse(raw);
        spec.apply(opts, parsed);
        index++;
    }
    for (const name of present) {
        const spec: OptionSpec = OPTION_SPECS[name];
        const requires: string[] = spec.requires ?? [];
        for (const req of requires) {
            if (!present.has(req)) {
                throw new Error(`--${name} can only be used with --${req}`);
            }
        }
    }
    return opts;
}

export function printHelp(): void {
    console.log("Usage:");
    console.log("  node main.js [options]");
    console.log("");
    console.log("Options:");
    for (const [name, spec] of Object.entries(OPTION_SPECS)) {
        const arg: string = spec.kind === "value" ? `--${name} <value>` : `--${name}`;
        const requires: string = spec.requires
            ? ` (requires ${spec.requires?.map((req): string => `--${req}`).join(", ")})`
            : "";
        console.log(`  ${arg.padEnd(24)} ${spec.description}${requires}`);
    }
}
