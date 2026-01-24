export function formatSeconds(seconds: number): string {
    const total: number = Math.floor(seconds);
    const units: { value: number; suffix: string }[] = [
        { value: Math.floor(total / 86400), suffix: "d" },
        { value: Math.floor((total % 86400) / 3600), suffix: "h" },
        { value: Math.floor((total % 3600) / 60), suffix: "m" },
        { value: total % 60, suffix: "s" },
    ];
    const parts: string[] = units
        .filter((unit: { value: number; suffix: string }): boolean => unit.value > 0)
        .map((unit: { value: number; suffix: string }): string => `${unit.value}${unit.suffix}`);
    return parts.length > 0 ? parts.join(" ") : "0s";
}

export function formatBytes(bytes: number): string {
    const units: string[] = ["B", "KB", "MB", "GB", "TB"];
    let value: number = bytes;
    let index: number = 0;
    while (value >= 1024 && index < units.length - 1) {
        value /= 1024;
        index++;
    }
    return `${value.toFixed(2)}${units[index]}`;
}
