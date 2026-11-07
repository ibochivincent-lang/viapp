/**
 * SEP-0024: Hosted Deposit and Withdrawal
 * https://github.com/stellar/stellar-protocol/blob/master/ecosystem/sep-0024.md
 *
 * Implements interactive anchor deposit and withdrawal flows authenticated via SEP-0010 JWT.
 */

export interface Sep24AssetInfo {
  enabled: boolean;
  min_amount?: number;
  max_amount?: number;
  fee_fixed?: number;
  fee_percent?: number;
}

export interface Sep24InfoResponse {
  deposit: Record<string, Sep24AssetInfo>;
  withdraw: Record<string, Sep24AssetInfo>;
  fee?: {
    enabled: boolean;
  };
  features?: {
    account_creation?: boolean;
    claimable_balances?: boolean;
  };
}

export interface Sep24InteractiveParams {
  assetCode: string;
  assetIssuer?: string;
  account: string;
  amount?: string;
  memo?: string;
  memoType?: "text" | "id" | "hash";
  walletName?: string;
  walletUrl?: string;
  lang?: string;
}

export interface Sep24InteractiveResponse {
  type: "interactive_customer_info_needed";
  url: string;
  id: string;
}

export interface Sep24Transaction {
  id: string;
  kind: "deposit" | "withdrawal";
  status:
    | "incomplete"
    | "pending_user_transfer_start"
    | "pending_usr_transfer_complete"
    | "pending_external"
    | "pending_anchor"
    | "pending_stellar"
    | "pending_trust"
    | "pending_user"
    | "completed"
    | "refunded"
    | "expired"
    | "no_market"
    | "too_small"
    | "too_large"
    | "error";
  status_eta?: number;
  more_info_url?: string;
  amount_in?: string;
  amount_out?: string;
  amount_fee?: string;
  started_at?: string;
  completed_at?: string;
  stellar_transaction_id?: string;
  external_transaction_id?: string;
  message?: string;
  refunded?: boolean;
}

export interface Sep24TransactionResponse {
  transaction: Sep24Transaction;
}

export interface Sep24TransactionsResponse {
  transactions: Sep24Transaction[];
}

export class Sep24Client {
  private transferServerUrl: string;

  constructor(transferServerUrl: string) {
    this.transferServerUrl = transferServerUrl.replace(/\/+$/, "");
  }

  /**
   * Queries the Anchor's /info endpoint for deposit & withdrawal asset parameters.
   */
  async getInfo(lang?: string): Promise<Sep24InfoResponse> {
    const url = new URL(`${this.transferServerUrl}/info`);
    if (lang) {
      url.searchParams.set("lang", lang);
    }

    const res = await fetch(url.toString(), {
      method: "GET",
      headers: { Accept: "application/json" },
    });

    if (!res.ok) {
      throw new Error(`SEP-24 /info failed with HTTP ${res.status}: ${res.statusText}`);
    }

    return (await res.json()) as Sep24InfoResponse;
  }

  /**
   * Initiates an interactive deposit transaction.
   * Returns an interactive URL to load inside an iframe, modal, or webview.
   */
  async initiateDeposit(
    jwtToken: string,
    params: Sep24InteractiveParams,
  ): Promise<Sep24InteractiveResponse> {
    const url = `${this.transferServerUrl}/transactions/deposit/interactive`;
    const formData = new FormData();
    formData.append("asset_code", params.assetCode);
    if (params.assetIssuer) formData.append("asset_issuer", params.assetIssuer);
    formData.append("account", params.account);
    if (params.amount) formData.append("amount", params.amount);
    if (params.memo) formData.append("memo", params.memo);
    if (params.memoType) formData.append("memo_type", params.memoType);
    if (params.walletName) formData.append("wallet_name", params.walletName);
    if (params.walletUrl) formData.append("wallet_url", params.walletUrl);
    if (params.lang) formData.append("lang", params.lang);

    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${jwtToken}`,
      },
      body: formData,
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`SEP-24 deposit initiation failed (${res.status}): ${errorText}`);
    }

    return (await res.json()) as Sep24InteractiveResponse;
  }

  /**
   * Initiates an interactive withdrawal transaction.
   */
  async initiateWithdraw(
    jwtToken: string,
    params: Sep24InteractiveParams,
  ): Promise<Sep24InteractiveResponse> {
    const url = `${this.transferServerUrl}/transactions/withdraw/interactive`;
    const formData = new FormData();
    formData.append("asset_code", params.assetCode);
    if (params.assetIssuer) formData.append("asset_issuer", params.assetIssuer);
    formData.append("account", params.account);
    if (params.amount) formData.append("amount", params.amount);
    if (params.memo) formData.append("memo", params.memo);
    if (params.memoType) formData.append("memo_type", params.memoType);
    if (params.walletName) formData.append("wallet_name", params.walletName);
    if (params.walletUrl) formData.append("wallet_url", params.walletUrl);
    if (params.lang) formData.append("lang", params.lang);

    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${jwtToken}`,
      },
      body: formData,
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`SEP-24 withdraw initiation failed (${res.status}): ${errorText}`);
    }

    return (await res.json()) as Sep24InteractiveResponse;
  }

  /**
   * Polls the status of an ongoing SEP-24 transaction.
   */
  async getTransaction(jwtToken: string, id: string): Promise<Sep24Transaction> {
    const url = new URL(`${this.transferServerUrl}/transaction`);
    url.searchParams.set("id", id);

    const res = await fetch(url.toString(), {
      method: "GET",
      headers: {
        Authorization: `Bearer ${jwtToken}`,
        Accept: "application/json",
      },
    });

    if (!res.ok) {
      throw new Error(`SEP-24 /transaction failed (${res.status}): ${res.statusText}`);
    }

    const data = (await res.json()) as Sep24TransactionResponse;
    return data.transaction;
  }
}

