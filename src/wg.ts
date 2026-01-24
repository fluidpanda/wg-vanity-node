import crypto from "node:crypto";

export interface WireguardKeyPair {
    publicKey: string;
    privateKey: string;
}

export interface VanityEstimate {
    prefixLength: number;
    expectedAttempts: number;
    probabilityPerAttempts: number;
}

export interface VanityTimeEstimate {
    expectedAttempts: number;
    attemptsPerSecond: number;
    expectedSeconds: number;
}

const BASE_PREFIX_REGEX = /^[A-Za-z0-9+/]*$/;

function base64UrlToBase64(string: string) {
    let out: string = string.replace(/-/g, "+").replace(/_/g, "/");
    const mod: number = out.length % 4;
    if (mod === 2) out += "==";
    else if (mod === 3) out += "=";
    else if (mod !== 0) {
        throw new Error("Invalid base64url string length");
    }
    return out;
}

export function estimateVanity(prefix: string): VanityEstimate {
    if (!BASE_PREFIX_REGEX.test(prefix)) {
        throw new Error("Prefix must contain only BASE64 characters: A-Z a-z 0-9 + /");
    }
    const n: number = prefix.length;
    const expectedAttempts: number = Math.pow(64, n);
    return {
        prefixLength: n,
        expectedAttempts,
        probabilityPerAttempts: 1 / expectedAttempts,
    };
}

export function estimateTime(prefix: string, attemptsPerSecond: number): VanityTimeEstimate {
    const est: VanityEstimate = estimateVanity(prefix);
    const aps: number = Math.max(1e-9, attemptsPerSecond);
    return {
        expectedAttempts: est.expectedAttempts,
        attemptsPerSecond: aps,
        expectedSeconds: est.expectedAttempts / aps,
    };
}

export function generateWireguardKeyPair(): WireguardKeyPair {
    const { publicKey, privateKey } = crypto.generateKeyPairSync("x25519");
    const publicJwk = publicKey.export({ format: "jwk" }) as unknown as { x: string };
    const privateJwk = privateKey.export({ format: "jwk" }) as unknown as { d: string };
    const publicB64: string = base64UrlToBase64(publicJwk.x);
    const privateB64: string = base64UrlToBase64(privateJwk.d);
    return { publicKey: publicB64, privateKey: privateB64 };
}
