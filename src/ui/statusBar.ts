import * as vscode from "vscode";
import { PolicySeverity } from "../diagnostics";
import { GovernancePreset } from "../promptCompiler";
import { TierSelection } from "../tierResolver";

export class GovernanceStatusBar {
  private readonly item: vscode.StatusBarItem;

  constructor() {
    this.item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    this.item.command = "aiGovernance.statusBarAction";
    this.item.tooltip = "Abrir acciones de AI Governance";
  }

  public update(tier: TierSelection, preset: GovernancePreset, policy: PolicySeverity): void {
    this.item.text = `Tier: ${tier === "auto" ? "Auto" : tier} | Preset: ${preset} | Policy: ${policy}`;
    this.item.show();
  }

  public dispose(): void {
    this.item.dispose();
  }
}
