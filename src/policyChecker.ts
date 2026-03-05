import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";
import YAML from "yaml";
import { PolicyFinding } from "./diagnostics";
import { GovernanceTier } from "./tierResolver";

const secretPattern = /(API_KEY|SECRET|password|token)\s*=/i;
const architectureKeywords = ["kubernetes", "microservices", "kafka", "elasticsearch", "service mesh"];

interface DependencyRules {
  deny?: Record<string, string[]>;
  warn?: Record<string, string[]>;
}

interface CheckResult {
  findings: PolicyFinding[];
}

function scanFiles(root: string): string[] {
  const ignored = new Set([".git", "node_modules", "out", "dist", ".next"]);
  const allowedExtensions = new Set([
    ".ts",
    ".tsx",
    ".js",
    ".jsx",
    ".json",
    ".yaml",
    ".yml",
    ".env",
    ".md",
    ".txt",
    ".py",
  ]);

  const files: string[] = [];
  const walk = (dir: string): void => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (ignored.has(entry.name)) {
        continue;
      }
      const absolutePath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(absolutePath);
        continue;
      }

      const ext = path.extname(entry.name).toLowerCase();
      if (allowedExtensions.has(ext) || entry.name === ".env") {
        files.push(absolutePath);
      }
    }
  };

  walk(root);
  return files;
}

function architectureSeverity(tier: GovernanceTier): "WARN" | "DENY" {
  return tier === "3" ? "DENY" : "WARN";
}

function dependencySeverity(tier: GovernanceTier): "WARN" | "DENY" {
  return tier === "1" ? "WARN" : "DENY";
}

function readDependencyRules(rootPath: string): DependencyRules {
  const rulesPath = path.join(rootPath, "ai-governance", "policies", "dependency-rules.yaml");
  if (!fs.existsSync(rulesPath)) {
    return {};
  }

  try {
    const parsed = YAML.parse(fs.readFileSync(rulesPath, "utf8")) as DependencyRules;
    return parsed ?? {};
  } catch {
    return {};
  }
}

function checkDependencies(rootPath: string, tier: GovernanceTier, findings: PolicyFinding[]): void {
  const packageJsonPath = path.join(rootPath, "package.json");
  if (!fs.existsSync(packageJsonPath)) {
    return;
  }

  const rules = readDependencyRules(rootPath);

  let pkg: Record<string, unknown>;
  try {
    pkg = JSON.parse(fs.readFileSync(packageJsonPath, "utf8")) as Record<string, unknown>;
  } catch {
    return;
  }

  const dependencies = {
    ...(pkg.dependencies as Record<string, string> | undefined),
    ...(pkg.devDependencies as Record<string, string> | undefined),
  };

  const deny = new Set([...(rules.deny?.[tier] ?? [])]);
  const warn = new Set([...(rules.warn?.[tier] ?? [])]);

  for (const depName of Object.keys(dependencies)) {
    if (deny.has(depName)) {
      findings.push({
        filePath: packageJsonPath,
        line: 0,
        severity: dependencySeverity(tier),
        message: `[Dependencias] La dependencia \"${depName}\" esta denegada para Tier ${tier}.`,
      });
      continue;
    }

    if (warn.has(depName)) {
      findings.push({
        filePath: packageJsonPath,
        line: 0,
        severity: "WARN",
        message: `[Dependencias] La dependencia \"${depName}\" esta en lista de advertencia para Tier ${tier}.`,
      });
    }
  }
}

export async function runPolicyCheck(
  workspaceFolder: vscode.WorkspaceFolder,
  tier: GovernanceTier
): Promise<CheckResult> {
  const rootPath = workspaceFolder.uri.fsPath;
  const files = scanFiles(rootPath);
  const findings: PolicyFinding[] = [];

  for (const filePath of files) {
    let content = "";
    try {
      content = fs.readFileSync(filePath, "utf8");
    } catch {
      continue;
    }

    const lines = content.split(/\r?\n/);
    lines.forEach((line, index) => {
      if (secretPattern.test(line)) {
        findings.push({
          filePath,
          line: index,
          severity: "DENY",
          message: "[Seguridad] Posible secreto hardcodeado detectado.",
        });
      }

      const lowerLine = line.toLowerCase();
      for (const keyword of architectureKeywords) {
        if (lowerLine.includes(keyword)) {
          findings.push({
            filePath,
            line: index,
            severity: architectureSeverity(tier),
            message: `[Arquitectura] Keyword de posible sobreingenieria detectado: ${keyword}.`,
          });
        }
      }
    });
  }

  checkDependencies(rootPath, tier, findings);

  return { findings };
}
