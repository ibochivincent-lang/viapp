import { StellarToml } from "@stellar/stellar-sdk";

export interface StellarCurrency {
  code: string;
  issuer?: string;
  status?: string;
  display_decimals?: number;
  name?: string;
  desc?: string;
  conditions?: string;
  anchor_asset_type?: string;
  anchor_asset?: string;
}

export interface StellarTomlData {
  VERSION?: string;
  NETWORK_PASSPHRASE?: string;
  FEDERATION_SERVER?: string;
  AUTH_SERVER?: string;
  TRANSFER_SERVER?: string;
  TRANSFER_SERVER_0024?: string;
  KYC_SERVER?: string;
  WEB_AUTH_ENDPOINT?: string;
  ANCHOR_QUOTE_SERVER?: string;
  SIGNING_KEY?: string;
  HORIZON_URL?: string;
  ACCOUNTS?: string[];
  CURRENCIES?: StellarCurrency[];
  DOCUMENTATION?: Record<string, string>;
  PRINCIPALS?: Record<string, string>[];
}

/**
 * Resolves stellar.toml from a domain using SEP-0001 specifications.
 */
export async function resolveStellarToml(
  domain: string,
  options?: { allowHttp?: boolean; timeout?: number },
): Promise<StellarTomlData> {
  const result = await StellarToml.Resolver.resolve(domain, {
    allowHttp: options?.allowHttp ?? false,
    timeout: options?.timeout ?? 10_000,
  });
  return result as StellarTomlData;
}

/**
 * Parses raw stellar.toml text content into structured key-value pairs.
 */
export function parseStellarTomlText(content: string): StellarTomlData {
  const lines = content.split("\n");
  const data: Record<string, any> = {};
  let currentSection: string | null = null;
  let currentArraySection: string | null = null;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    if (line.startsWith("[[") && line.endsWith("]]")) {
      const arrayName = line.slice(2, -2).trim();
      currentArraySection = arrayName;
      currentSection = null;
      if (!data[arrayName]) data[arrayName] = [];
      data[arrayName].push({});
      continue;
    }

    if (line.startsWith("[") && line.endsWith("]")) {
      currentSection = line.slice(1, -1).trim();
      currentArraySection = null;
      if (!data[currentSection]) data[currentSection] = {};
      continue;
    }

    const eqIdx = line.indexOf("=");
    if (eqIdx === -1) continue;

    const key = line.slice(0, eqIdx).trim();
    let val: any = line.slice(eqIdx + 1).trim();

    // Strip inline comments if not inside quotes
    if (val.startsWith('"') && val.endsWith('"')) {
      val = val.slice(1, -1);
    } else if (val.startsWith("'") && val.endsWith("'")) {
      val = val.slice(1, -1);
    } else {
      const commentIdx = val.indexOf("#");
      if (commentIdx !== -1) val = val.slice(0, commentIdx).trim();
      if (val === "true") val = true;
      else if (val === "false") val = false;
      else if (!isNaN(Number(val))) val = Number(val);
    }

    if (currentArraySection && Array.isArray(data[currentArraySection])) {
      const arr = data[currentArraySection];
      arr[arr.length - 1][key] = val;
    } else if (currentSection && data[currentSection]) {
      data[currentSection][key] = val;
    } else {
      data[key] = val;
    }
  }

  return data as StellarTomlData;
}

/**
 * Finds a specific currency listing in a parsed stellar.toml object.
 */
export function findTomlCurrency(
  toml: StellarTomlData,
  code: string,
  issuer?: string,
): StellarCurrency | undefined {
  if (!toml.CURRENCIES) return undefined;
  return toml.CURRENCIES.find((c) => {
    if (c.code !== code) return false;
    if (issuer && c.issuer && c.issuer !== issuer) return false;
    return true;
  });
}
