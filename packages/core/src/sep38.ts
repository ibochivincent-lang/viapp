/**
 * SEP-0038: Anchor RFQ (Request for Quote) API Client
 * Facilitates standardized pricing and quotes between Stellar assets (e.g. USDC, XLM)
 * and off-chain or tokenized equity equivalents.
 */

export interface Sep38Asset {
  asset: string; // e.g. "stellar:USDC:GA5Z..." or "iso4217:USD" or "equity:NVDA"
  country_codes?: string[];
  sell_delivery_methods?: { name: string; description: string }[];
  buy_delivery_methods?: { name: string; description: string }[];
  decimals?: number;
}

export interface Sep38InfoResponse {
  assets: Sep38Asset[];
}

export interface Sep38PriceResponse {
  total_price: string;
  price: string;
  sell_amount: string;
  buy_amount: string;
  fee: {
    total: string;
    asset: string;
    details?: { name: string; description?: string; amount: string }[];
  };
}

export interface Sep38PricesResponse {
  buy_assets: {
    asset: string;
    price: string;
    decimals: number;
  }[];
}

export interface Sep38QuoteRequest {
  context: "sep6" | "sep24" | "sep31";
  sell_asset: string;
  buy_asset: string;
  sell_amount?: string;
  buy_amount?: string;
  expire_after?: string;
}

export interface Sep38QuoteResponse {
  id: string;
  expires_at: string;
  total_price: string;
  price: string;
  sell_asset: string;
  sell_amount: string;
  buy_asset: string;
  buy_amount: string;
  fee: {
    total: string;
    asset: string;
  };
}

export class Sep38Client {
  readonly quoteServerUrl: string;

  constructor(quoteServerUrl: string) {
    this.quoteServerUrl = quoteServerUrl.replace(/\/+$/, "");
  }

  /**
   * Fetches deliverable and receivable assets supported by the anchor.
   */
  async getInfo(): Promise<Sep38InfoResponse> {
    const res = await fetch(`${this.quoteServerUrl}/info`);
    if (!res.ok) {
      throw new Error(`SEP-38 /info request failed with status ${res.status}`);
    }
    return (await res.json()) as Sep38InfoResponse;
  }

  /**
   * Gets indicative prices for all available buy assets given a sell asset.
   */
  async getPrices(params: {
    sellAsset: string;
    sellAmount?: string;
    sellDeliveryMethod?: string;
    countryCode?: string;
  }): Promise<Sep38PricesResponse> {
    const url = new URL(`${this.quoteServerUrl}/prices`);
    url.searchParams.set("sell_asset", params.sellAsset);
    if (params.sellAmount) url.searchParams.set("sell_amount", params.sellAmount);
    if (params.sellDeliveryMethod) url.searchParams.set("sell_delivery_method", params.sellDeliveryMethod);
    if (params.countryCode) url.searchParams.set("country_code", params.countryCode);

    const res = await fetch(url.toString());
    if (!res.ok) {
      throw new Error(`SEP-38 /prices request failed with status ${res.status}`);
    }
    return (await res.json()) as Sep38PricesResponse;
  }

  /**
   * Gets an indicative price for a specific asset conversion pair.
   */
  async getPrice(params: {
    context: "sep6" | "sep24" | "sep31";
    sellAsset: string;
    buyAsset: string;
    sellAmount?: string;
    buyAmount?: string;
  }): Promise<Sep38PriceResponse> {
    const url = new URL(`${this.quoteServerUrl}/price`);
    url.searchParams.set("context", params.context);
    url.searchParams.set("sell_asset", params.sellAsset);
    url.searchParams.set("buy_asset", params.buyAsset);
    if (params.sellAmount) url.searchParams.set("sell_amount", params.sellAmount);
    if (params.buyAmount) url.searchParams.set("buy_amount", params.buyAmount);

    const res = await fetch(url.toString());
    if (!res.ok) {
      throw new Error(`SEP-38 /price request failed with status ${res.status}`);
    }
    return (await res.json()) as Sep38PriceResponse;
  }

  /**
   * Requests a firm, time-bounded quote (authenticated with SEP-10 JWT).
   */
  async requestQuote(
    request: Sep38QuoteRequest,
    jwtToken?: string,
  ): Promise<Sep38QuoteResponse> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (jwtToken) {
      headers["Authorization"] = `Bearer ${jwtToken}`;
    }

    const res = await fetch(`${this.quoteServerUrl}/quote`, {
      method: "POST",
      headers,
      body: JSON.stringify(request),
    });

    if (!res.ok) {
      throw new Error(`SEP-38 /quote request failed with status ${res.status}`);
    }
    return (await res.json()) as Sep38QuoteResponse;
  }
}

