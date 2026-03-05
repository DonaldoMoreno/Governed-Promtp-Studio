import * as vscode from "vscode";
import { GovernanceScope } from "../governanceLoader";
import { GovernancePreset } from "../promptCompiler";
import { TierSelection } from "../tierResolver";

type WebviewMessage =
  | {
      command: "generatePreview";
      userTask: string;
      tier: TierSelection;
      preset: GovernancePreset;
      scopes: GovernanceScope[];
    }
  | {
      command: "copyPrompt";
      userTask: string;
      tier: TierSelection;
      preset: GovernancePreset;
      scopes: GovernanceScope[];
    }
  | {
      command: "runPolicyCheck";
      tier: TierSelection;
      preset: GovernancePreset;
      scopes: GovernanceScope[];
    };

export interface PromptStudioState {
  tier: TierSelection;
  preset: GovernancePreset;
  scopes: GovernanceScope[];
  contextFiles: string[];
  previewPrompt: string;
  policyState: "OK" | "WARN" | "DENY";
}

export interface PromptStudioHandlers {
  onGeneratePreview: (message: Extract<WebviewMessage, { command: "generatePreview" }>) => Promise<void>;
  onCopyPrompt: (message: Extract<WebviewMessage, { command: "copyPrompt" }>) => Promise<void>;
  onRunPolicyCheck: (message: Extract<WebviewMessage, { command: "runPolicyCheck" }>) => Promise<void>;
}

export class PromptStudioWebview {
  private static currentPanel: PromptStudioWebview | undefined;
  private readonly panel: vscode.WebviewPanel;

  private constructor(
    panel: vscode.WebviewPanel,
    private readonly handlers: PromptStudioHandlers,
    initialState: PromptStudioState
  ) {
    this.panel = panel;
    this.panel.webview.html = this.getHtml(this.panel.webview, initialState);

    this.panel.webview.onDidReceiveMessage(async (message: WebviewMessage) => {
      if (message.command === "generatePreview") {
        await this.handlers.onGeneratePreview(message);
      } else if (message.command === "copyPrompt") {
        await this.handlers.onCopyPrompt(message);
      } else if (message.command === "runPolicyCheck") {
        await this.handlers.onRunPolicyCheck(message);
      }
    });

    this.panel.onDidDispose(() => {
      PromptStudioWebview.currentPanel = undefined;
    });
  }

  public static createOrShow(
    context: vscode.ExtensionContext,
    handlers: PromptStudioHandlers,
    initialState: PromptStudioState
  ): PromptStudioWebview {
    const column = vscode.window.activeTextEditor?.viewColumn;

    if (PromptStudioWebview.currentPanel) {
      PromptStudioWebview.currentPanel.panel.reveal(column);
      PromptStudioWebview.currentPanel.updateState(initialState);
      return PromptStudioWebview.currentPanel;
    }

    const panel = vscode.window.createWebviewPanel(
      "promptStudio",
      "Prompt Studio",
      column ?? vscode.ViewColumn.One,
      {
        enableScripts: true,
      }
    );

    PromptStudioWebview.currentPanel = new PromptStudioWebview(panel, handlers, initialState);
    context.subscriptions.push(panel);
    return PromptStudioWebview.currentPanel;
  }

  public updateState(state: PromptStudioState): void {
    this.panel.webview.postMessage({
      command: "stateUpdate",
      state,
    });
  }

  private getHtml(webview: vscode.Webview, initialState: PromptStudioState): string {
    const nonce = Date.now().toString();
    const initialJson = JSON.stringify(initialState).replace(/</g, "\\u003c");

    return `<!DOCTYPE html>
<html lang="es-MX">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}';" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Prompt Studio</title>
  <style>
    :root {
      --bg: #f7f7f2;
      --card: #ffffff;
      --ink: #183a37;
      --accent: #d95d39;
      --accent-soft: #f4b860;
      --border: #d9d9cf;
    }
    body {
      font-family: "IBM Plex Sans", "Segoe UI", sans-serif;
      margin: 0;
      background: linear-gradient(140deg, #f7f7f2 0%, #efe9dc 100%);
      color: var(--ink);
      padding: 16px;
    }
    .grid {
      display: grid;
      gap: 12px;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    }
    .card {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 12px;
      box-shadow: 0 6px 16px rgba(24, 58, 55, 0.08);
    }
    h1 {
      margin: 0 0 10px;
      font-size: 1.3rem;
    }
    h2 {
      margin: 0 0 8px;
      font-size: 1rem;
    }
    textarea, select {
      width: 100%;
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 8px;
      box-sizing: border-box;
      font-size: 0.95rem;
      background: #fffef9;
      color: var(--ink);
    }
    textarea {
      min-height: 120px;
      resize: vertical;
    }
    .scopes {
      display: grid;
      grid-template-columns: repeat(2, minmax(110px, 1fr));
      gap: 6px;
    }
    .actions {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    button {
      border: none;
      border-radius: 10px;
      padding: 8px 12px;
      font-weight: 600;
      cursor: pointer;
      color: #fff;
      background: var(--accent);
      transition: transform 120ms ease, opacity 120ms ease;
    }
    button.secondary {
      background: #33658a;
    }
    button.ghost {
      background: #758e4f;
    }
    button:hover {
      transform: translateY(-1px);
      opacity: 0.92;
    }
    ul {
      margin: 0;
      padding-left: 18px;
    }
    .badge {
      display: inline-block;
      border-radius: 999px;
      background: var(--accent-soft);
      padding: 4px 10px;
      font-size: 0.85rem;
      font-weight: 600;
    }
  </style>
</head>
<body>
  <h1>Prompt Studio</h1>
  <div class="badge" id="policyBadge">Policy: ${initialState.policyState}</div>
  <div class="grid" style="margin-top: 12px;">
    <section class="card" style="grid-column: 1 / -1;">
      <h2>Prompt Editor</h2>
      <textarea id="userTask" placeholder="Escribe la tarea para Copilot..."></textarea>
    </section>

    <section class="card">
      <h2>Configuracion de Gobierno</h2>
      <label for="tier">Tier</label>
      <select id="tier">
        <option value="auto">Auto</option>
        <option value="1">1</option>
        <option value="2">2</option>
        <option value="3">3</option>
      </select>
      <label for="preset" style="margin-top:8px; display:block;">Preset</label>
      <select id="preset">
        <option value="Fast">Fast</option>
        <option value="Safe">Safe</option>
        <option value="Strict">Strict</option>
      </select>
      <div style="margin-top:10px;">
        <div style="font-weight:600; margin-bottom:6px;">Scopes</div>
        <div class="scopes">
          <label><input type="checkbox" value="Security" checked /> Security</label>
          <label><input type="checkbox" value="Architecture" checked /> Architecture</label>
          <label><input type="checkbox" value="Dependencies" checked /> Dependencies</label>
          <label><input type="checkbox" value="Workflow" checked /> Workflow</label>
          <label><input type="checkbox" value="Compliance" checked /> Compliance</label>
          <label><input type="checkbox" value="Observability" checked /> Observability</label>
          <label><input type="checkbox" value="Cost" checked /> Cost</label>
        </div>
      </div>
    </section>

    <section class="card">
      <h2>Context Preview</h2>
      <ul id="contextFiles"></ul>
    </section>

    <section class="card" style="grid-column: 1 / -1;">
      <h2>Acciones</h2>
      <div class="actions">
        <button id="btnGenerate" class="secondary">Generate Preview</button>
        <button id="btnCopy">Copy Governed Prompt to Clipboard</button>
        <button id="btnPolicy" class="ghost">Run Policy Check</button>
      </div>
    </section>

    <section class="card" style="grid-column: 1 / -1;">
      <h2>Prompt Governado (Preview)</h2>
      <textarea id="preview" readonly></textarea>
    </section>
  </div>

  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();
    const initialState = ${initialJson};

    const elements = {
      userTask: document.getElementById("userTask"),
      tier: document.getElementById("tier"),
      preset: document.getElementById("preset"),
      contextFiles: document.getElementById("contextFiles"),
      preview: document.getElementById("preview"),
      policyBadge: document.getElementById("policyBadge"),
    };

    function selectedScopes() {
      return Array.from(document.querySelectorAll('input[type="checkbox"]:checked')).map((x) => x.value);
    }

    function updateContext(files) {
      elements.contextFiles.innerHTML = "";
      for (const file of files) {
        const li = document.createElement("li");
        li.textContent = file;
        elements.contextFiles.appendChild(li);
      }
      if (!files.length) {
        const li = document.createElement("li");
        li.textContent = "No se encontraron archivos de gobernanza.";
        elements.contextFiles.appendChild(li);
      }
    }

    function payload(command) {
      return {
        command,
        userTask: elements.userTask.value,
        tier: elements.tier.value,
        preset: elements.preset.value,
        scopes: selectedScopes(),
      };
    }

    function applyState(state) {
      elements.tier.value = state.tier;
      elements.preset.value = state.preset;
      elements.preview.value = state.previewPrompt;
      elements.policyBadge.textContent = "Policy: " + state.policyState;
      updateContext(state.contextFiles);

      const checkboxes = document.querySelectorAll('input[type="checkbox"]');
      checkboxes.forEach((box) => {
        box.checked = state.scopes.includes(box.value);
      });
    }

    document.getElementById("btnGenerate").addEventListener("click", () => {
      vscode.postMessage(payload("generatePreview"));
    });

    document.getElementById("btnCopy").addEventListener("click", () => {
      vscode.postMessage(payload("copyPrompt"));
    });

    document.getElementById("btnPolicy").addEventListener("click", () => {
      vscode.postMessage(payload("runPolicyCheck"));
    });

    window.addEventListener("message", (event) => {
      const { command, state } = event.data;
      if (command === "stateUpdate") {
        applyState(state);
      }
    });

    applyState(initialState);
  </script>
</body>
</html>`;
  }
}
