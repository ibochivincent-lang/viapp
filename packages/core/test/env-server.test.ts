// Covers the hosted server's settings (C40): parseServerEnv and loadServerEnv, which never need or
// return the deployer key. loadServerEnv reads a temporary .env written by this file, never the
// real repo-root one. Not covered here: the script settings (env.test.ts, env-optional.test.ts) and
// whether a host's own secret store hands the process exactly these variables.
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { EnvError, loadEnv, loadScriptEnv, loadServerEnv, parseServerEnv } from "../src/env.js";

const DEPLOYER_KEY = `0x${"11".repeat(32)}`;
const server = {
  OC_API_KEY: "test-api-key-123456",
  OC_SECRET_KEY: "test-secret-abcdef",
  RELAYER_PRIVATE_KEY: `0x${"22".repeat(32)}`,
  VIAPP_VAULT_ADDRESS: "0x5fbdb2315678afecb367f032d93f642f64180aa3",
  VIAPP_PAYOUT_ADDRESS: "0x96e854abddc5c618ca843956d1303017b586ab75",
  VIAPP_PUBLIC_ORIGIN: "https://viapp.example/",
};
const SERVER_KEYS = [
  "BSC_RPC_URL",
  "OC_API_KEY",
  "OC_SECRET_KEY",
  "RELAYER_PRIVATE_KEY",
  "UPSTASH_REDIS_REST_TOKEN",
  "UPSTASH_REDIS_REST_URL",
  "VIAPP_JUDGE_CODE",
  "VIAPP_PAYOUT_ADDRESS",
  "VIAPP_PUBLIC_ORIGIN",
  "VIAPP_RELAYER_DAILY_CAP_WEI",
  "VIAPP_RELAYER_MAX_GAS_PRICE_WEI",
  "VIAPP_SPONSOR_ADDRESS",
  "VIAPP_VAULT_ADDRESS",
  "VIAPP_WRAP_PRICE_USD",
];
const TOUCHED = [
  ...Object.keys(server),
  "DEPLOYER_PRIVATE_KEY",
  "BSC_RPC_URL",
  "UPSTASH_REDIS_REST_URL",
  "UPSTASH_REDIS_REST_TOKEN",
  "VIAPP_RELAYER_MAX_GAS_PRICE_WEI",
  "VIAPP_RELAYER_DAILY_CAP_WEI",
  "VIAPP_WRAP_PRICE_USD",
  "VIAPP_SPONSOR_ADDRESS",
  "VIAPP_JUDGE_CODE",
];

const saved = new Map(TOUCHED.map((k) => [k, process.env[k]]));
const dirs: string[] = [];

function envFile(lines: Record<string, string>): string {
  const dir = mkdtempSync(join(tmpdir(), "viapp-env-"));
  dirs.push(dir);
  const file = join(dir, ".env");
  writeFileSync(file, Object.entries(lines).map(([k, v]) => `${k}=${v}`).join("\n"), "utf8");
  return file;
}

function clearEnv(): void {
  for (const k of TOUCHED) delete process.env[k];
}

afterEach(() => {
  clearEnv();
  for (const [k, v] of saved) if (v !== undefined) process.env[k] = v;
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

describe("parseServerEnv", () => {
  it("succeeds without DEPLOYER_PRIVATE_KEY and returns only the server's settings", () => {
    const env = parseServerEnv(server);
    expect(Object.keys(env).sort()).toEqual(SERVER_KEYS);
    expect(env.VIAPP_VAULT_ADDRESS).toBe("0x5FbDB2315678afecb367f032d93F642f64180aa3");
  });

  it("never returns the deployer key, valid or malformed, when the source has one", () => {
    for (const key of [DEPLOYER_KEY, "not a key"]) {
      const env = parseServerEnv({ ...server, DEPLOYER_PRIVATE_KEY: key });
      expect("DEPLOYER_PRIVATE_KEY" in env).toBe(false);
      expect(JSON.stringify(env, (_k, v) => (typeof v === "bigint" ? v.toString() : v))).not.toContain("1111111111");
    }
  });

  it("defaults the wrap price, leaves the sponsor unset, and normalises the payee and the origin", () => {
    const env = parseServerEnv(server);
    expect(env.VIAPP_WRAP_PRICE_USD).toBe("0.05");
    expect(env.VIAPP_SPONSOR_ADDRESS).toBeUndefined();
    expect(env.VIAPP_PAYOUT_ADDRESS).toBe("0x96E854aBDdc5C618ca843956d1303017b586aB75");
    expect(env.VIAPP_PUBLIC_ORIGIN).toBe("https://viapp.example");
    const set = parseServerEnv({
      ...server,
      VIAPP_WRAP_PRICE_USD: "0.1",
      VIAPP_SPONSOR_ADDRESS: "0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc",
      VIAPP_PUBLIC_ORIGIN: "http://localhost:3000",
    });
    expect(set.VIAPP_WRAP_PRICE_USD).toBe("0.1");
    expect(set.VIAPP_SPONSOR_ADDRESS).toBe("0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC");
    expect(set.VIAPP_PUBLIC_ORIGIN).toBe("http://localhost:3000");
    expect(parseServerEnv({ ...server, VIAPP_WRAP_PRICE_USD: "", VIAPP_SPONSOR_ADDRESS: "" })).toMatchObject({ VIAPP_WRAP_PRICE_USD: "0.05", VIAPP_SPONSOR_ADDRESS: undefined });
  });

  it("refuses a malformed wrap price, payee, sponsor or origin, naming only the variable", () => {
    const bad: [string, string][] = [
      ["VIAPP_WRAP_PRICE_USD", "0"],
      ["VIAPP_WRAP_PRICE_USD", "-0.05"],
      ["VIAPP_WRAP_PRICE_USD", "1.5"],
      ["VIAPP_WRAP_PRICE_USD", "0.0000001"],
      ["VIAPP_WRAP_PRICE_USD", "$0.05"],
      ["VIAPP_PAYOUT_ADDRESS", "0x0000000000000000000000000000000000000000"],
      ["VIAPP_PAYOUT_ADDRESS", "0x1234"],
      ["VIAPP_SPONSOR_ADDRESS", "0x0000000000000000000000000000000000000000"],
      ["VIAPP_SPONSOR_ADDRESS", "not an address"],
      ["VIAPP_PUBLIC_ORIGIN", "http://viapp.example"],
      ["VIAPP_PUBLIC_ORIGIN", "https://viapp.example/app"],
      ["VIAPP_PUBLIC_ORIGIN", "viapp.example"],
    ];
    for (const [name, value] of bad) {
      let err: unknown = null;
      try {
        parseServerEnv({ ...server, [name]: value });
      } catch (e) {
        err = e;
      }
      expect(err).toBeInstanceOf(EnvError);
      expect((err as EnvError).variables).toEqual([name]);
      expect((err as EnvError).message).not.toContain(value);
    }
  });

  it("takes VIAPP_JUDGE_CODE only in its exact form, leaves it unset when absent, and never echoes a bad one", () => {
    expect(parseServerEnv(server).VIAPP_JUDGE_CODE).toBeUndefined();
    expect(parseServerEnv({ ...server, VIAPP_JUDGE_CODE: "" }).VIAPP_JUDGE_CODE).toBeUndefined();
    expect(parseServerEnv({ ...server, VIAPP_JUDGE_CODE: "VIAPP-7K4P-QX9M" }).VIAPP_JUDGE_CODE).toBe("VIAPP-7K4P-QX9M");
    // Lowercase, a space, then I, O, 0 and 1 (the characters a judge could misread), and the wrong shapes.
    for (const value of ["viapp-7k4p-qx9m", " VIAPP-7K4P-QX9M", "VIAPP-7K4I-QX9M", "VIAPP-7K4O-QX9M", "VIAPP-7K40-QX9M", "VIAPP-7K41-QX9M", "VIAPP-7K4PQX9M", "VIAPP-7K4P-QX9", "VIAPP-7K4P-QX9M-AAAA", "ABC-7K4P-QX9M"]) {
      let err: unknown = null;
      try {
        parseServerEnv({ ...server, VIAPP_JUDGE_CODE: value });
      } catch (e) {
        err = e;
      }
      expect(err, value).toBeInstanceOf(EnvError);
      expect((err as EnvError).variables).toEqual(["VIAPP_JUDGE_CODE"]);
      expect((err as EnvError).message).not.toContain(value.trim());
    }
  });

  it("requires the vault address, the relayer key, the payee and the origin, and names each one missing", () => {
    for (const name of ["VIAPP_VAULT_ADDRESS", "RELAYER_PRIVATE_KEY", "OC_API_KEY", "OC_SECRET_KEY", "VIAPP_PAYOUT_ADDRESS", "VIAPP_PUBLIC_ORIGIN"] as const) {
      const err = (() => {
        try {
          parseServerEnv({ ...server, [name]: undefined });
        } catch (e) {
          return e;
        }
        return null;
      })();
      expect(err).toBeInstanceOf(EnvError);
      expect((err as EnvError).variables).toEqual([name]);
    }
  });
});

describe("loadServerEnv", () => {
  it("loads a .env with no deployer key", () => {
    clearEnv();
    const env = loadServerEnv({ envFile: envFile(server) });
    expect(Object.keys(env).sort()).toEqual(SERVER_KEYS);
  });

  it("does not return the deployer key even when the .env and the process environment carry it", () => {
    clearEnv();
    process.env.DEPLOYER_PRIVATE_KEY = DEPLOYER_KEY;
    const env = loadServerEnv({ envFile: envFile({ ...server, DEPLOYER_PRIVATE_KEY: DEPLOYER_KEY }) });
    expect("DEPLOYER_PRIVATE_KEY" in env).toBe(false);
    expect(Object.values(env).map(String)).not.toContain(DEPLOYER_KEY);
  });

  it("works with no .env file when the host sets the variables itself", () => {
    clearEnv();
    Object.assign(process.env, server);
    const missing = join(mkdtempSync(join(tmpdir(), "viapp-env-")), "absent.env");
    dirs.push(join(missing, ".."));
    expect(loadServerEnv({ envFile: missing }).OC_API_KEY).toBe(server.OC_API_KEY);
  });
});

describe("loadEnv", () => {
  it("is the script loader, so existing scripts keep the deployer key", () => {
    expect(loadEnv).toBe(loadScriptEnv);
  });
});
