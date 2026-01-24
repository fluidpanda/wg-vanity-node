export type AppSettings = {
    report: {
        everyAttempts: number;
        intervalMs: number;
    };
};

export const SETTINGS = {
    report: {
        everyAttempts: 20_000,
        intervalMs: 1_000,
    },
} as const satisfies AppSettings;
