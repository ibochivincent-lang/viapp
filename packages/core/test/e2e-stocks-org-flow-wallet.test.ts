import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

describe("E2E Verification: GitHub Org Migration, 'Buy stocks >> Send stocks' Flow, and Active Wallet", () => {
  const rootDir = path.resolve(__dirname, "../../..");
  const webDir = path.resolve(rootDir, "packages/web");

  describe("1. GitHub Organization Migration (viappToken/viapp)", () => {
    it("git remote origin is configured to viappToken/viapp", () => {
      const remote = execSync("git remote get-url origin", { cwd: rootDir, encoding: "utf8" }).trim();
      expect(remote).toBe("https://github.com/viappToken/viapp.git");
    });

    it("README.md points to viappToken/viapp repository", () => {
      const readme = fs.readFileSync(path.join(rootDir, "README.md"), "utf8");
      expect(readme).toContain("https://github.com/viappToken/viapp");
      expect(readme).not.toContain("https://github.com/ibochivincent-lang/viapp");
    });

    it("docs/GRANT_PROPOSAL.md points to viappToken/viapp", () => {
      const proposal = fs.readFileSync(path.join(rootDir, "docs/GRANT_PROPOSAL.md"), "utf8");
      expect(proposal).toContain("https://github.com/viappToken/viapp");
      expect(proposal).not.toContain("https://github.com/ibochivincent-lang/viapp");
    });

    it("Web package links point to viappToken/viapp", () => {
      const layout = fs.readFileSync(path.join(webDir, "app/docs/layout.tsx"), "utf8");
      expect(layout).toContain("https://github.com/viappToken/viapp");

      const editLink = fs.readFileSync(path.join(webDir, "components/docs/EditLink.tsx"), "utf8");
      expect(editLink).toContain("https://github.com/viappToken/viapp");

      const credits = fs.readFileSync(path.join(webDir, "components/sections/Credits.tsx"), "utf8");
      expect(credits).toContain("https://github.com/viappToken/viapp");
    });
  });

  describe("2. Clean 'Stocks' Taxonomy (No split Equities / Direct Assets)", () => {
    it("StockPicker presents a single unified 'Stocks' header", () => {
      const pickerFile = fs.readFileSync(path.join(webDir, "components/send/StockPicker.tsx"), "utf8");
      expect(pickerFile).toContain('<h2 className="send-picker-title">Stocks</h2>');
      expect(pickerFile).not.toContain("Equities (16)");
      expect(pickerFile).not.toContain("Direct Assets (9)");
      expect(pickerFile).not.toContain("Direct Assets");
    });

    it("StockPicker search placeholder is updated for stocks", () => {
      const pickerFile = fs.readFileSync(path.join(webDir, "components/send/StockPicker.tsx"), "utf8");
      expect(pickerFile).toContain("Search 9 leading stocks");
    });
  });

  describe("3. Flow Stepper: 'Buy stocks >> Send stocks'", () => {
    it("SendPage header includes the 'Buy stocks >> Send stocks' stepper", () => {
      const sendPage = fs.readFileSync(path.join(webDir, "components/send/SendPage.tsx"), "utf8");
      expect(sendPage).toContain("Buy stocks");
      expect(sendPage).toContain("Send stocks");
      expect(sendPage).toContain("send-flow-stepper");
      expect(sendPage).toContain("&gt;&gt;");
    });

    it("send.css includes styles for .send-flow-stepper and steps", () => {
      const css = fs.readFileSync(path.join(webDir, "components/send/send.css"), "utf8");
      expect(css).toContain(".send-flow-stepper");
      expect(css).toContain(".send-flow-step");
      expect(css).toContain(".send-flow-step-active");
      expect(css).toContain(".send-flow-arrow");
    });
  });

  describe("4. Always-Active Wallet Connection", () => {
    it("Connect button in ConnectRow is always active and enabled", () => {
      const formFile = fs.readFileSync(path.join(webDir, "components/send/SendForm.tsx"), "utf8");
      expect(formFile).toContain("disabled={false}");
      expect(formFile).not.toContain("Wallet connection is not available right now");
    });

    it("SendPage integrates WalletModal supporting Freighter, Ethereum, Privy, and Tester", () => {
      const sendPage = fs.readFileSync(path.join(webDir, "components/send/SendPage.tsx"), "utf8");
      expect(sendPage).toContain("WalletModal");
      expect(sendPage).toContain("showWalletModal");

      const modalFile = fs.readFileSync(path.join(webDir, "components/send/WalletModal.tsx"), "utf8");
      expect(modalFile).toContain("Freighter Wallet");
      expect(modalFile).toContain("Browser Wallet");
      expect(modalFile).toContain("1-Click Tester Stellar Wallet");
    });
  });

  describe("5. Strict Git Author Attribution Invariant", () => {
    it("Author attribution strictly preserves user identity", () => {
      const email = execSync("git config user.email", { cwd: rootDir, encoding: "utf8" }).trim();
      const name = execSync("git config user.name", { cwd: rootDir, encoding: "utf8" }).trim();
      expect(name).toBe("ibochivincent.lang");
      expect(email).toBe("290086463+ibochivincent-lang@users.noreply.github.com");
    });
  });
});

