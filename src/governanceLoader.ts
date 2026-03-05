import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";
import { GovernanceTier } from "./tierResolver";

export type GovernanceScope =
  | "Security"
  | "Architecture"
  | "Dependencies"
  | "Workflow"
  | "Compliance"
  | "Observability"
  | "Cost";

const scopePolicyMap: Record<GovernanceScope, string> = {
  Security: "security.md",
  Architecture: "architecture.md",
  Dependencies: "dependencies.md",
  Workflow: "workflow.md",
  Compliance: "compliance.md",
  Observability: "observability.md",
  Cost: "cost.md",
};

const requiredFiles = [
  "tiers/tier1-prototype.md",
  "tiers/tier2-production.md",
  "tiers/tier3-enterprise.md",
  "policies/security.md",
  "policies/architecture.md",
  "policies/dependencies.md",
  "policies/workflow.md",
  "policies/compliance.md",
  "policies/observability.md",
  "policies/cost.md",
  "policies/dependency-rules.yaml",
];

function governanceRoot(workspaceFolder: vscode.WorkspaceFolder): string {
  return path.join(workspaceFolder.uri.fsPath, "ai-governance");
}

function tierFileName(tier: GovernanceTier): string {
  if (tier === "1") {
    return "tier1-prototype.md";
  }
  if (tier === "2") {
    return "tier2-production.md";
  }
  return "tier3-enterprise.md";
}

export function getGovernanceFileReferences(
  workspaceFolder: vscode.WorkspaceFolder,
  tier: GovernanceTier,
  scopes: GovernanceScope[]
): string[] {
  const root = governanceRoot(workspaceFolder);
  const files: string[] = [path.join(root, "tiers", tierFileName(tier))];

  for (const scope of scopes) {
    files.push(path.join(root, "policies", scopePolicyMap[scope]));
  }

  return files.filter((filePath) => fs.existsSync(filePath));
}

export function findMissingGovernanceFiles(workspaceFolder: vscode.WorkspaceFolder): string[] {
  const root = governanceRoot(workspaceFolder);
  return requiredFiles
    .map((rel) => path.join(root, rel))
    .filter((absolutePath) => !fs.existsSync(absolutePath));
}

function ensureParentDir(filePath: string): void {
  const parent = path.dirname(filePath);
  fs.mkdirSync(parent, { recursive: true });
}

function defaultTemplateByPath(relPath: string): string {
  const normalized = relPath.replace(/\\/g, "/");

  const templates: Record<string, string> = {
    "tiers/tier1-prototype.md": "# Tier 1 - Prototipo\n\n- Prioriza velocidad y simplicidad.\n- Evita sobreingenieria innecesaria.\n- Mantener estandares minimos de seguridad.\n",
    "tiers/tier2-production.md": "# Tier 2 - Produccion\n\n- Requiere pruebas automatizadas para cambios criticos.\n- Requiere controles de dependencias y revisiones de arquitectura.\n- Seguridad y estabilidad son obligatorias.\n",
    "tiers/tier3-enterprise.md": "# Tier 3 - Empresarial\n\n- Requiere trazabilidad, auditoria y hardening.\n- Controles estrictos de seguridad, cumplimiento y costos.\n- Cambios de alto impacto deben incluir plan de rollback.\n",
    "policies/security.md": "# Politica de Seguridad\n\n- Nunca exponer secretos en codigo fuente.\n- Aplicar principio de minimo privilegio.\n- Validar entradas y sanitizar salidas.\n",
    "policies/architecture.md": "# Politica de Arquitectura\n\n- Seleccionar arquitectura proporcional al tamano del problema.\n- Evitar complejidad operacional innecesaria.\n- Documentar decisiones tecnicas relevantes.\n",
    "policies/dependencies.md": "# Politica de Dependencias\n\n- Preferir dependencias mantenidas y con licencia compatible.\n- Revisar vulnerabilidades antes de liberar.\n- Evitar librerias duplicadas para el mismo objetivo.\n",
    "policies/workflow.md": "# Politica de Workflow\n\n- Trabajar por cambios pequenos y revisables.\n- Incluir contexto de negocio en cada PR.\n- Ejecutar checks basicos antes de merge.\n",
    "policies/compliance.md": "# Politica de Compliance\n\n- Registrar decisiones que impacten cumplimiento.\n- No almacenar datos sensibles sin proteccion.\n- Seguir normativas internas y externas aplicables.\n",
    "policies/observability.md": "# Politica de Observabilidad\n\n- Definir logs utiles para diagnostico.\n- Incluir metricas minimas de salud en componentes criticos.\n- Evitar logs con informacion sensible.\n",
    "policies/cost.md": "# Politica de Costos\n\n- Justificar tecnologias con costo operativo alto.\n- Optimizar recursos para carga esperada.\n- Preferir soluciones de bajo costo para prototipos.\n",
    "policies/dependency-rules.yaml": "deny:\n  \"2\":\n    - left-pad\n  \"3\":\n    - left-pad\n    - request\nwarn:\n  \"1\":\n    - request\n",
  };

  return templates[normalized] ?? "# Documento de gobernanza\n\nPendiente de definir reglas especificas.\n";
}

export function scaffoldGovernanceTemplates(workspaceFolder: vscode.WorkspaceFolder): string[] {
  const root = governanceRoot(workspaceFolder);
  const created: string[] = [];

  for (const relPath of requiredFiles) {
    const absolutePath = path.join(root, relPath);
    if (!fs.existsSync(absolutePath)) {
      ensureParentDir(absolutePath);
      fs.writeFileSync(absolutePath, defaultTemplateByPath(relPath), "utf8");
      created.push(absolutePath);
    }
  }

  return created;
}
