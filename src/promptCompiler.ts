import * as path from "path";
import * as vscode from "vscode";
import { GovernanceScope } from "./governanceLoader";
import { GovernanceTier } from "./tierResolver";

export type GovernancePreset = "Fast" | "Safe" | "Strict";

export interface PromptCompileInput {
  workspaceFolder: vscode.WorkspaceFolder;
  tier: GovernanceTier;
  preset: GovernancePreset;
  scopes: GovernanceScope[];
  governanceFiles: string[];
  userTask: string;
  profileSummary: string;
}

function outputContractByTier(tier: GovernanceTier): string {
  if (tier === "1") {
    return [
      "1. Respuesta breve y enfocada en entregar una solucion funcional.",
      "2. Incluir riesgos minimos de seguridad detectados.",
      "3. Proponer el siguiente paso inmediato.",
    ].join("\n");
  }

  if (tier === "2") {
    return [
      "1. Respuesta estructurada por: Diseno, Implementacion, Riesgos, Pruebas.",
      "2. Explicar impacto en dependencias y arquitectura.",
      "3. Incluir checklist de validacion antes de merge.",
    ].join("\n");
  }

  return [
    "1. Respuesta formal con secciones: Decision, Controles, Cumplimiento, Operacion.",
    "2. Incluir mitigaciones, observabilidad y costo operativo.",
    "3. Incluir supuestos, riesgos residuales y estrategia de rollback.",
  ].join("\n");
}

function presetDescription(preset: GovernancePreset): string {
  if (preset === "Fast") {
    return "Fast: prioriza velocidad con controles minimos obligatorios.";
  }
  if (preset === "Safe") {
    return "Safe: equilibrio entre velocidad, calidad y seguridad.";
  }
  return "Strict: maximo apego a gobernanza y validaciones.";
}

export function compileGovernedPrompt(input: PromptCompileInput): string {
  const relativeFiles = input.governanceFiles.map((filePath) => path.relative(input.workspaceFolder.uri.fsPath, filePath));

  const sections = [
    "ROLE",
    "Eres un asistente de desarrollo que debe cumplir estrictamente la gobernanza del repositorio. No ignores reglas.",
    "",
    "PROJECT PROFILE",
    input.profileSummary,
    "",
    "ACTIVE GOVERNANCE",
    `Tier: ${input.tier}`,
    `Scopes: ${input.scopes.join(", ")}`,
    `Preset: ${input.preset} (${presetDescription(input.preset)})`,
    "",
    "GOVERNANCE DOCUMENTS",
    "Lee y aplica estos archivos del repositorio antes de responder:",
    ...relativeFiles.map((rel) => `- ${rel}`),
    "",
    "OUTPUT CONTRACT",
    outputContractByTier(input.tier),
    "",
    "USER TASK",
    input.userTask.trim() || "Sin tarea especificada.",
  ];

  return sections.join("\n");
}
