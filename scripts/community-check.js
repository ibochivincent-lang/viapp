#!/usr/bin/env node
/**
 * ViApp Community Pre-Flight Verification Script
 * Validates repository hygiene, contributor guidelines, and test suites
 * before submitting community Pull Requests.
 */

import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const rootDir = process.cwd();

console.log("🌊 ViApp Community Contributor Verification Starting...\n");

function check(name, fn) {
  try {
    fn();
    console.log(`✅ [PASS] ${name}`);
    return true;
  } catch (err) {
    console.error(`❌ [FAIL] ${name}:`, err.message);
    return false;
  }
}

let passed = true;

passed &&= check("CONTRIBUTING.md exists and contains Contributor Ladder", () => {
  const content = fs.readFileSync(path.join(rootDir, "CONTRIBUTING.md"), "utf8");
  if (!content.includes("Contributor Governance Ladder")) throw new Error("Missing Contributor Ladder");
  if (!content.includes("bounty:100")) throw new Error("Missing Wave points definition");
});

passed &&= check("CONTRIBUTORS.md exists and has active contributors", () => {
  const content = fs.readFileSync(path.join(rootDir, "CONTRIBUTORS.md"), "utf8");
  if (!content.includes("Core Team & Community Maintainers")) throw new Error("Missing community table");
});

passed &&= check("SECURITY.md exists and specifies responsible disclosure SLA", () => {
  const content = fs.readFileSync(path.join(rootDir, "SECURITY.md"), "utf8");
  if (!content.includes("Reporting a Vulnerability")) throw new Error("Missing vulnerability guide");
});

passed &&= check("Wave 10 bounty issue template is configured", () => {
  const templatePath = path.join(rootDir, ".github/ISSUE_TEMPLATE/wave_bounty.yml");
  if (!fs.existsSync(templatePath)) throw new Error("Missing wave_bounty.yml template");
});

passed &&= check("Soroban contracts test suite compiles and passes cargo test", () => {
  const out = execSync("cargo test --manifest-path packages/contracts/stellar/Cargo.toml", { encoding: "utf8" });
  if (!out.includes("test result: ok")) throw new Error("Soroban contract tests failed");
});

console.log("\n------------------------------------------------------------");
if (passed) {
  console.log("🎉 All Community Pre-Flight Checks Passed! Ready to submit PR.\n");
  process.exit(0);
} else {
  console.error("⚠️ Some checks failed. Please fix before submitting.\n");
  process.exit(1);
}
