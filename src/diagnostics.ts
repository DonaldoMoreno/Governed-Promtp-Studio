import * as vscode from "vscode";

export type PolicySeverity = "OK" | "WARN" | "DENY";

export interface PolicyFinding {
  filePath: string;
  line: number;
  message: string;
  severity: Exclude<PolicySeverity, "OK">;
}

function toDiagnosticSeverity(severity: Exclude<PolicySeverity, "OK">): vscode.DiagnosticSeverity {
  if (severity === "DENY") {
    return vscode.DiagnosticSeverity.Error;
  }
  return vscode.DiagnosticSeverity.Warning;
}

export function createDiagnosticsCollection(): vscode.DiagnosticCollection {
  return vscode.languages.createDiagnosticCollection("ai-governance");
}

export function publishDiagnostics(
  collection: vscode.DiagnosticCollection,
  findings: PolicyFinding[]
): void {
  collection.clear();

  const byFile = new Map<string, vscode.Diagnostic[]>();

  for (const finding of findings) {
    const range = new vscode.Range(finding.line, 0, finding.line, Number.MAX_SAFE_INTEGER);
    const diagnostic = new vscode.Diagnostic(range, finding.message, toDiagnosticSeverity(finding.severity));
    diagnostic.source = "AI Governance";

    const list = byFile.get(finding.filePath) ?? [];
    list.push(diagnostic);
    byFile.set(finding.filePath, list);
  }

  for (const [filePath, diagnostics] of byFile.entries()) {
    collection.set(vscode.Uri.file(filePath), diagnostics);
  }
}

export function aggregatePolicy(findings: PolicyFinding[]): PolicySeverity {
  if (findings.some((f) => f.severity === "DENY")) {
    return "DENY";
  }
  if (findings.some((f) => f.severity === "WARN")) {
    return "WARN";
  }
  return "OK";
}
