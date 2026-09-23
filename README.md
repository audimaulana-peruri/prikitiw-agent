# 🎤 PRIKITIW AI

PRIKITIW is a lightweight autonomous coding-agent CLI inspired by tools such as Codex.

It runs inside the **current working directory**, can inspect and modify project files, run terminal commands with approval, inspect Git changes, and call the INAdigital AI gateway through the OpenAI-compatible API.

> **Important:** PRIKITIW requires a valid INAdigital API token.

## ✨ Features

- 🤖 AI coding agent with tool/function calling
- 📂 Current directory becomes the workspace
- 🔍 List, read, and search project files
- ✍️ Create/modify files
- 🖥️ Run terminal commands with `y/N` approval
- 📝 `/diff` for Git changes
- 💬 Interactive CLI
- 🎤 PRIKITIW/Sule-style CLI personality
- 🔒 Masked API-token input
- 💾 Token is saved locally after successful validation
- ♻️ `401/403` triggers token refresh
- 🛑 Clean `Ctrl+C` handling
- 📦 Installable as an npm CLI

## 🧰 Requirements

- Node.js 20+
- npm
- Access to the INAdigital AI gateway
- Valid INAdigital API token

Check:

```powershell
node --version
npm --version
```

## 🚀 Installation

### Install from GitHub

After publishing the repository:

```powershell
npm install -g github:<GITHUB_USERNAME>/<REPOSITORY_NAME>
```

Then:

```powershell
cd "C:\your-project"
prikitiw
```

No manual PATH setup or launcher creation is required.

### Development / local install

```powershell
git clone https://github.com/<GITHUB_USERNAME>/<REPOSITORY_NAME>.git
cd <REPOSITORY_NAME>
npm install
npm link
```

Then:

```powershell
cd "C:\your-project"
prikitiw
```

## 🔑 API Token

On the first run:

```text
🔑 API Token: ****************
🔌 Mengecek token... ✓ Token valid.
```

The token is validated **before the PRIKITIW banner appears**.

After successful validation, the token is saved locally. Future runs reuse the saved token automatically.

### Where is the token stored?

```text
~/.prikitiw/config.json
```

On Windows this normally becomes:

```text
C:\Users\<USERNAME>\.prikitiw\config.json
```

The token is stored locally in that user's profile. Do **not** commit, upload, or share the file.

The repository does not contain an API token.

### Token expired / revoked

If the gateway returns `401` or `403` during normal operation, PRIKITIW:

1. Detects the authentication failure.
2. Removes the saved local token.
3. Asks for a new token.
4. Validates the new token.
5. Retries the request.

Example:

```text
🎤 WADUH... TOKENNYA KAYAKNYA SUDAH EXPIRED 😂
   PRIKITIW bakal minta token baru.

🔑 API Token: ****************
🔌 Mengecek token... ✓ Token valid.
```

### Manual logout

Run:

```text
/logout
```

This removes the saved local token and exits PRIKITIW.

## 🎮 CLI Commands

| Command | Description |
|---|---|
| `/help` | Show available commands |
| `/BisaNgapain` | Show PRIKITIW capabilities |
| `/status` | Show agent/workspace/token status |
| `/files` | List workspace files |
| `/diff` | Show Git diff |
| `/clear` | Clear terminal |
| `/logout` | Remove saved token and exit |
| `/exit` | Exit |
| `/quit` | Alias for `/exit` |

Normal text is sent to the AI agent:

```text
> analisis project ini dan jelaskan stack yang digunakan
```

## 🛠️ AI Tools

### `list_files`
Lists files/directories in the current workspace.

### `read_file`
Reads a file inside the workspace.

### `search_files`
Searches source files while excluding common generated/dependency directories such as `node_modules`, `.git`, `dist`, `build`, `.next`, `target`, `coverage`, `bin`, and `obj`.

### `write_file`
Creates or modifies files inside the workspace.

### `run_command`
Runs a terminal command after explicit user approval.

```text
┌─ COMMAND ─────────────────────────────
│ npm test
└───────────────────────────────────────

Run this command? [y/N]
```

## 📁 Workspace

PRIKITIW uses:

```js
process.cwd()
```

So:

```powershell
cd C:\project-a
prikitiw
```

works on `C:\project-a`.

Likewise:

```powershell
cd C:\project-b
prikitiw
```

works on `C:\project-b`.

The npm installation location is **not** used as the coding workspace.

## 🔒 Security

File tools are restricted to the current workspace.

`run_command` can execute arbitrary terminal commands after the user approves them. Review commands before pressing `y`.

Never commit:

```text
.prikitiw/
.env
.env.*
```

or any API token.

> Current implementation stores the token in the user's local profile. A future version can move this to Windows Credential Manager / macOS Keychain / Linux Secret Service for stronger OS-native secret storage.

## 🧪 Development

```powershell
git clone https://github.com/<GITHUB_USERNAME>/<REPOSITORY_NAME>.git
cd <REPOSITORY_NAME>
npm install
npm start
```

Or:

```powershell
node agent.mjs
```

For global local testing:

```powershell
npm link
```

## 📦 Project Structure

```text
prikitiw-agent/
├── agent.mjs
├── package.json
├── README.md
├── LICENSE
└── .gitignore
```

`package.json` exposes the CLI:

```json
"bin": {
  "prikitiw": "./agent.mjs"
}
```

Therefore npm creates the `prikitiw` command automatically.

## 👥 Team Usage

After the repository is on GitHub, teammates only need:

```powershell
npm install -g github:<GITHUB_USERNAME>/<REPOSITORY_NAME>
```

Then, inside any project:

```powershell
prikitiw
```

On first use they enter their own token. The token is saved only in their own user profile.

No shared token needs to be committed to GitHub.

## 🧭 Roadmap

- Streaming AI responses
- Better context management
- Conversation/history support
- Patch-based editing
- `/plan`
- `/review`
- `/test`
- `/search`
- `/read`
- `/undo`
- Better Git integration
- Automatic error recovery
- Granular command approval
- OS-native secure credential storage

## License

MIT
