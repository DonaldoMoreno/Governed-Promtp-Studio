# Governed Prompt Studio

`Governed Prompt Studio` es una extension de VS Code para redactar prompts gobernados para GitHub Copilot sin usar integraciones directas de API.

La extension:
- Construye un prompt final con estructura de gobernanza por `Tier` y `Scope`.
- Referencia archivos dentro del repositorio (`ai-governance/*`) en lugar de embeder reglas en duro.
- Ejecuta un `Policy Check` local y publica hallazgos en el panel `Problems`.
- Copia el prompt gobernado al portapapeles para pegarlo en Copilot Chat.

## Caracteristicas principales

- Webview `Prompt Studio` con:
	- Editor multilinea para la tarea del usuario.
	- Selector de Tier (`Auto / 1 / 2 / 3`).
	- Selector de Preset (`Fast / Safe / Strict`).
	- Checklist de scopes de gobernanza.
	- Preview de archivos de contexto de gobernanza.
	- Botones para generar preview, copiar prompt y ejecutar policy check.
- Integracion en Status Bar:
	- `Tier: <Auto|1|2|3> | Preset: <Fast|Safe|Strict> | Policy: <OK|WARN|DENY>`
	- QuickPick con acciones rapidas.
- Resolucion de Tier con prioridad:
	1. `AI_PROJECT_PROFILE.yaml`
	2. Configuracion `aiGovernance.tier`
	3. Deteccion automatica por heuristicas del repositorio
- `Policy Checker` local para detectar:
	- Secretos hardcodeados (`API_KEY=`, `SECRET=`, `password=`, `token=`)
	- Keywords de sobreingenieria (`kubernetes`, `microservices`, `kafka`, `elasticsearch`, `service mesh`)
	- Dependencias restringidas definidas en YAML
- Scaffolding de plantillas `ai-governance` cuando faltan archivos.

## Estructura del proyecto

```text
.
├── .github/workflows/build-vsix.yml
├── ai-governance/
│   ├── tiers/
│   │   ├── tier1-prototype.md
│   │   ├── tier2-production.md
│   │   └── tier3-enterprise.md
│   └── policies/
│       ├── security.md
│       ├── architecture.md
│       ├── dependencies.md
│       ├── workflow.md
│       ├── compliance.md
│       ├── observability.md
│       ├── cost.md
│       └── dependency-rules.yaml
├── src/
│   ├── extension.ts
│   ├── tierResolver.ts
│   ├── promptCompiler.ts
│   ├── policyChecker.ts
│   ├── governanceLoader.ts
│   ├── diagnostics.ts
│   └── ui/
│       ├── statusBar.ts
│       └── promptStudioWebview.ts
├── package.json
├── tsconfig.json
└── README.md
```

## Comandos de Command Palette

- `AI Governance: Open Prompt Studio`
- `AI Governance: Copy Governed Prompt to Clipboard`
- `AI Governance: Run Policy Check`
- `AI Governance: Set Tier`

## Flujo de uso

1. Ejecuta `AI Governance: Open Prompt Studio`.
2. Escribe la tarea en el editor de prompt.
3. Elige `Tier`, `Preset` y `Scopes`.
4. Usa `Generate Preview` para previsualizar el prompt gobernado.
5. Usa `Copy Governed Prompt to Clipboard` para copiarlo.
6. Pega el prompt en Copilot Chat.

## Estructura del prompt compilado

El compilador genera las secciones:
- `ROLE`
- `PROJECT PROFILE`
- `ACTIVE GOVERNANCE`
- `GOVERNANCE DOCUMENTS`
- `OUTPUT CONTRACT`
- `USER TASK`

## Policy Checker

Severidad por tier:
- Tier 1:
	- secretos: `DENY`
	- sobreingenieria: `WARN`
	- dependencias restringidas: `WARN`
- Tier 2:
	- secretos: `DENY`
	- dependencias restringidas: `DENY`
	- sobreingenieria: `WARN`
- Tier 3:
	- la mayoria de violaciones: `DENY`

Los hallazgos se publican en `Problems`.

## Compilar y empaquetar

Instalar dependencias:

```bash
npm install
```

Compilar:

```bash
npm run compile
```

Empaquetar VSIX:

```bash
npm run package
```

## Instalar la extension VSIX

1. Genera el archivo `.vsix` con `npm run package`.
2. En VS Code, abre `Extensions`.
3. Selecciona `Install from VSIX...`.
4. Elige el archivo generado.

## CI para VSIX

El workflow `.github/workflows/build-vsix.yml` ejecuta:
- checkout
- setup node
- npm install
- compile
- vsce package
- upload del artifact VSIX
