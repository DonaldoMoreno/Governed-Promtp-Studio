import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";
import YAML from "yaml";

export type GovernanceTier = "1" | "2" | "3";
export type TierSelection = "auto" | GovernanceTier;

export interface TierResolution {
  tier: GovernanceTier;
  source: "AI_PROJECT_PROFILE.yaml" | "workspace-setting" | "auto-detection";
  profileSummary: string;
}

function normalizeTier(value: unknown): GovernanceTier | undefined {
  if (value === 1 || value === "1") {
    return "1";
  }
  if (value === 2 || value === "2") {
    return "2";
  }
  if (value === 3 || value === "3") {
    return "3";
  }
  return undefined;
}

function listProjectFiles(root: string): string[] {
  const ignored = new Set([".git", "node_modules", "out", "dist", ".next"]);
  const files: string[] = [];

  const walk = (dir: string): void => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (ignored.has(entry.name)) {
        continue;
      }
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else {
        files.push(fullPath);
      }
    }
  };

  walk(root);
  return files;
}

function autoDetectTier(rootPath: string): GovernanceTier {
  const files = listProjectFiles(rootPath);
  const fileCount = files.length;
  const lowerPaths = files.map((f) => f.toLowerCase());

  let tier: GovernanceTier = "1";
  if (fileCount >= 40) {
    tier = "2";
  }
  if (fileCount >= 180) {
    tier = "3";
  }

  const enterpriseSignals = [
    "kubernetes",
    "helm",
    "terraform",
    "service-mesh",
    "docker-compose",
    "observability",
    "compliance",
  ];

  if (enterpriseSignals.some((signal) => lowerPaths.some((f) => f.includes(signal)))) {
    tier = tier === "1" ? "2" : tier;
  }

  if (lowerPaths.some((f) => f.includes("soc2") || f.includes("pci") || f.includes("iso27001"))) {
    tier = "3";
  }

  return tier;
}

function profileSummaryForTier(tier: GovernanceTier): string {
  if (tier === "1") {
    return "Tier 1: Prototipo o proyecto pequeno con foco en velocidad de iteracion.";
  }
  if (tier === "2") {
    return "Tier 2: Proyecto productivo con controles de calidad y seguridad formales.";
  }
  return "Tier 3: Sistema critico o empresarial con controles estrictos y auditoria.";
}

export async function resolveTier(workspaceFolder: vscode.WorkspaceFolder): Promise<TierResolution> {
  const rootPath = workspaceFolder.uri.fsPath;
  const projectProfilePath = path.join(rootPath, "AI_PROJECT_PROFILE.yaml");

  if (fs.existsSync(projectProfilePath)) {
    try {
      const raw = fs.readFileSync(projectProfilePath, "utf8");
      const parsed = YAML.parse(raw) as Record<string, unknown>;
      const tier =
        normalizeTier(parsed.tier) ||
        normalizeTier(parsed.governanceTier) ||
        normalizeTier((parsed.profile as Record<string, unknown> | undefined)?.tier);

      if (tier) {
        return {
          tier,
          source: "AI_PROJECT_PROFILE.yaml",
          profileSummary: profileSummaryForTier(tier),
        };
      }
    } catch {
      // Si el YAML esta malformado, continuar con la siguiente prioridad.
    }
  }

  const configured = vscode.workspace.getConfiguration("aiGovernance").get<string>("tier", "auto");
  const configuredTier = normalizeTier(configured);
  if (configuredTier) {
    return {
      tier: configuredTier,
      source: "workspace-setting",
      profileSummary: profileSummaryForTier(configuredTier),
    };
  }

  const detectedTier = autoDetectTier(rootPath);
  return {
    tier: detectedTier,
    source: "auto-detection",
    profileSummary: profileSummaryForTier(detectedTier),
  };
}
