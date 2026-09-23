#!/usr/bin/env node
import OpenAI from "openai";
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { exec } from "node:child_process";
import { promisify } from "node:util";

const execAsync = promisify(exec);

// ============================================================
// CONFIG
// ============================================================

let rl;
let client;
let apiKey;
async function askForToken() {
  return new Promise((resolve) => {
    process.stdout.write("\n🔑 API Token: ");

    const stdin = process.stdin;
    const wasRaw = stdin.isRaw;

    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding("utf8");

    let token = "";

    const cleanup = () => {
      stdin.setRawMode(wasRaw);
      stdin.pause();
      stdin.removeListener("data", onData);
    };

    const onData = (char) => {
      if (char === "\r" || char === "\n") {
        cleanup();
        console.log("");

        if (!token.trim()) {
          console.log("🎤 Lah... tokennya kosong 😂");
          console.log("   Gimana mau kerja kalau modal nekat?");
          console.log("");
          process.exit(1);
        }

        resolve(token.trim());
        return;
      }

      if (char === "\u0003") {
        cleanup();
        console.log("\n");
        console.log("🎤 Belum masuk token udah kabur? 😂");
        console.log("   PRIKITIW pamit!");
        console.log("");
        process.exit(0);
      }

      if (char === "\u007f" || char === "\b") {
        if (token.length > 0) {
          token = token.slice(0, -1);
          process.stdout.write("\b \b");
        }
        return;
      }

      token += char;
      process.stdout.write("*");
    };

    stdin.on("data", onData);
  });
}

const workspace = process.cwd();

const MAX_FILE_SIZE = 50000;
const MAX_ITERATIONS = 30;

// ============================================================
// AUTHENTICATION
// ============================================================

const CONFIG_DIR = path.join(os.homedir(), ".prikitiw");
const CONFIG_FILE = path.join(CONFIG_DIR, "config.json");

async function loadSavedToken() {
  try {
    const raw = await fs.readFile(CONFIG_FILE, "utf8");
    const config = JSON.parse(raw);
    return typeof config.apiKey === "string" && config.apiKey.trim()
      ? config.apiKey.trim()
      : null;
  } catch {
    return null;
  }
}

async function saveToken(token) {
  await fs.mkdir(CONFIG_DIR, { recursive: true });

  await fs.writeFile(
    CONFIG_FILE,
    JSON.stringify(
      {
        apiKey: token,
        savedAt: new Date().toISOString(),
      },
      null,
      2
    ),
    "utf8"
  );

  if (process.platform !== "win32") {
    try {
      await fs.chmod(CONFIG_FILE, 0o600);
    } catch {}
  }
}

async function clearSavedToken() {
  try {
    await fs.rm(CONFIG_FILE, { force: true });
  } catch {}
}



async function validateToken(token) {
  const candidateClient = new OpenAI({
    apiKey: token,
    baseURL: "https://apig-ai.inadigital.co.id/v1",
    timeout: 120000,
    maxRetries: 0,
  });

  process.stdout.write("🔌 Mengecek token... ");

  try {
    await candidateClient.chat.completions.create({
      model: "inadigital-pro",
      messages: [{ role: "user", content: "Reply with OK." }],
      max_tokens: 5,
    });

    console.log("✓ Token valid.");
    return candidateClient;
  } catch (error) {
    console.log("✗");
    return { error };
  }
}

async function authenticate({ forcePrompt = false } = {}) {
  if (!forcePrompt) {
    apiKey = process.env.INADIGITAL_API_KEY || await loadSavedToken();
  }

  while (true) {
    if (!apiKey) {
      apiKey = await askForToken();
    }

    const result = await validateToken(apiKey);

    if (!result.error) {
      client = result;
      await saveToken(apiKey);
      return client;
    }

    const error = result.error;

    console.log("");
    console.log("🎤 Waduh... tokennya nggak diterima bosku 😂");
    if (error?.status) {
      console.log(`   HTTP: ${error.status}`);
    }
    console.log(`   ${error?.message || "Unknown API error"}`);
    console.log("");
    console.log("   Token lokal yang tadi disimpan akan dihapus.");
    console.log("   Coba masukin token yang benar lagi.");
    console.log("");

    apiKey = null;
    await clearSavedToken();
  }
}

async function main() {
  rl = readline.createInterface({
    input,
    output,
  });

  await authenticate();
  showBanner();

  // ============================================================
  // BANNER
  // ============================================================

  function showBanner() {
    console.log("");
    console.log("╔════════════════════════════════════════════╗");
    console.log("║              🎤 PRIKITIW AI               ║");
    console.log("╚════════════════════════════════════════════╝");
    console.log("");
    console.log("  🎤 HAAAAA... PRIKITIW DATANG, BOSKU!");
    console.log("");
    console.log("  😎 Tenang...");
    console.log("     Yang ribet kita ribetin bareng.");
    console.log("     Yang error kita cari.");
    console.log("     Yang belum ada kita bikin.");
    console.log("");
    console.log(`  📂 Workspace : ${workspace}`);
    console.log("  🤖 Model     : inadigital-pro");
    console.log("");
    console.log("  📌 Mau tahu gue bisa apa?");
    console.log("     /BisaNgapain");
    console.log("");
    console.log("  📌 Bingung command-nya?");
    console.log("     /help");
    console.log("");
    console.log("  📌 Mau lihat kondisi gue?");
    console.log("     /status");
    console.log("");
    console.log("  🎤 Udah siap?");
    console.log("     Tinggal ngomong...");
    console.log("     Monggo Di Explore...");
    console.log("");

  }

  // ============================================================
  // PATH SECURITY
  // ============================================================

  function resolveWorkspacePath(filePath) {
    const resolved = path.resolve(
      workspace,
      filePath
    );

    const relative = path.relative(
      workspace,
      resolved
    );

    if (
      relative.startsWith("..") ||
      path.isAbsolute(relative)
    ) {
      throw new Error(
        `Access denied: ${filePath} is outside workspace.`
      );
    }

    return resolved;
  }

  // ============================================================
  // TOOLS
  // ============================================================

  const tools = [
    {
      type: "function",

      function: {
        name: "list_files",

        description:
          "List files and directories inside the current workspace.",

        parameters: {
          type: "object",

          properties: {
            path: {
              type: "string",

              description:
                "Relative directory path. Use '.' for workspace root.",
            },
          },

          required: ["path"],
        },
      },
    },

    {
      type: "function",

      function: {
        name: "read_file",

        description:
          "Read the contents of a file inside the workspace.",

        parameters: {
          type: "object",

          properties: {
            path: {
              type: "string",

              description:
                "Relative file path.",
            },
          },

          required: ["path"],
        },
      },
    },

  {
    type: "function",

    function: {
      name: "search_files",

      description:
        "Search for text inside source files in the workspace. Use this to locate relevant files before reading them. Do not use this for broad exhaustive searches.",

      parameters: {
        type: "object",

        properties: {
          query: {
            type: "string",
          },

          path: {
            type: "string",

            description:
              "Relative directory to search.",
          },
        },

        required: ["query", "path"],
      },
    },
  },

    {
      type: "function",

      function: {
        name: "write_file",

        description:
          "Create or modify a file inside the workspace.",

        parameters: {
          type: "object",

          properties: {
            path: {
              type: "string",

              description:
                "Relative file path.",
            },

            content: {
              type: "string",

              description:
                "Complete content of the file.",
            },
          },

          required: ["path", "content"],
        },
      },
    },

    {
      type: "function",

      function: {
        name: "run_command",

        description:
          "Run a terminal command inside the current workspace.",

        parameters: {
          type: "object",

          properties: {
            command: {
              type: "string",

              description:
                "Terminal command to execute.",
            },
          },

          required: ["command"],
        },
      },
    },
  ];

  // ============================================================
  // TOOL: LIST FILES
  // ============================================================

  async function searchFiles(args) {
    const root = resolveWorkspacePath(args.path);

    const query = args.query.replace(/'/g, "''");
    const escapedRoot = root.replace(/'/g, "''");

    const psCommand = `
  $ErrorActionPreference = "SilentlyContinue"

  $root = '${escapedRoot}'
  $query = '${query}'

  $excludeDirs = @(
    "node_modules",
    ".git",
    "dist",
    "build",
    ".next",
    "target",
    "coverage",
    "bin",
    "obj"
  )

  Get-ChildItem -Path $root -Recurse -File |
    Where-Object {
      $excluded = $false

      foreach ($dir in $excludeDirs) {
        if ($_.FullName -like "*\\\\$dir\\\\*") {
          $excluded = $true
          break
        }
      }

      -not $excluded
    } |
    Select-String -Pattern $query -SimpleMatch |
    Select-Object -First 100 |
    ForEach-Object {
      "$($_.Path):$($_.LineNumber): $($_.Line.Trim())"
    }
  `;

    try {
      const { stdout, stderr } =
        await execAsync(
          `powershell.exe -NoProfile -Command "${psCommand
            .replace(/"/g, '\\"')
            .replace(/\r?\n/g, " ")}"`,
          {
            cwd: workspace,
            timeout: 30000,
            maxBuffer: 5 * 1024 * 1024,
          }
        );

      if (stderr && !stdout) {
        return `Search error: ${stderr}`;
      }

      return (
        stdout.trim() ||
        "No matching files found."
      );
    } catch (error) {
      if (error.killed) {
        return "Search timed out after 30 seconds.";
      }

      return `Search failed: ${error.message}`;
    }
  }

  // ============================================================
  // TOOL: WRITE FILE
  // ============================================================

  async function writeFile(args) {
    const file = resolveWorkspacePath(
      args.path
    );

    await fs.mkdir(
      path.dirname(file),
      {
        recursive: true,
      }
    );

    await fs.writeFile(
      file,
      args.content,
      "utf8"
    );

    return `Successfully wrote ${args.path}`;
  }

  // ============================================================
  // TOOL: RUN COMMAND
  // ============================================================

  async function runCommand(args) {
    console.log("");

    console.log(
      "┌─ COMMAND ─────────────────────────────"
    );

    console.log(`│ ${args.command}`);

    console.log(
      "└───────────────────────────────────────"
    );

    const answer =
      await rl.question(
        "Run this command? [y/N] "
      );

    if (
      answer.toLowerCase() !== "y"
    ) {
      return "Command execution cancelled by user.";
    }

    try {
      const {
        stdout,
        stderr,
      } = await execAsync(
        args.command,
        {
          cwd: workspace,

          windowsHide: false,

          maxBuffer:
            10 * 1024 * 1024,
        }
      );

      return [
        stdout
          ? `STDOUT:\n${stdout}`
          : "",

        stderr
          ? `STDERR:\n${stderr}`
          : "",
      ]
        .filter(Boolean)
        .join("\n");
    } catch (error) {
      return [
        "Command failed.",

        `Exit code: ${
          error.code ?? "unknown"
        }`,

        error.stdout
          ? `STDOUT:\n${error.stdout}`
          : "",

        error.stderr
          ? `STDERR:\n${error.stderr}`
          : "",
      ]
        .filter(Boolean)
        .join("\n");
    }
  }

  // ============================================================
  // TOOL DISPATCHER
  // ============================================================

  async function executeTool(
    name,
    args
  ) {
    switch (name) {
      case "list_files":
        return await listFiles(args);

      case "read_file":
        return await readFile(args);

      case "search_files":
        return await searchFiles(args);

      case "write_file":
        return await writeFile(args);

      case "run_command":
        return await runCommand(args);

      default:
        throw new Error(
          `Unknown tool: ${name}`
        );
    }
  }

  // ============================================================
  // AGENT LOOP
  // ============================================================


  async function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async function requestWithModelServingRetry(requestFn) {
    const delays = [3000, 5000, 8000];

    for (let attempt = 0; attempt <= delays.length; attempt++) {
      try {
        return await requestFn();
      } catch (error) {
        const status = error?.status;
        const message = String(
          error?.message || error?.error?.message || ""
        );

        const isModelServing500 =
          status === 500 &&
          /model serving|unexpected error|unknown/i.test(message);

        if (!isModelServing500 || attempt === delays.length) {
          throw error;
        }

        const waitMs = delays[attempt];
        const end = Date.now() + waitMs;
        const frames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
        let frame = 0;

        while (Date.now() < end) {
          const remaining = Math.max(
            1,
            Math.ceil((end - Date.now()) / 1000)
          );

          process.stdout.write(
            `\r⏳ AI lagi error (500 model serving) | Retry ${attempt + 1}/3 dalam ${remaining}s ${frames[frame++ % frames.length]}`
          );

          await sleep(120);
        }

        process.stdout.write("\r" + " ".repeat(110) + "\r");
        console.log(`🔄 Retry ${attempt + 1}/3...`);
      }
    }
  }

  async function runAgent(
    userInput
  ) {
    const messages = [
      {
        role: "system",

        content: `
  You are PRIKITIW, an autonomous coding agent similar to Codex.

  You operate inside a local software project.

  Current workspace:
  ${workspace}

  Your job:

  1. Understand the user's request.
  2. Inspect the project before changing anything.
  3. Use tools instead of guessing.
  4. Read relevant files before modifying them.
  5. Make minimal and targeted changes.
  6. Preserve existing architecture and coding style.
  7. Never unnecessarily rewrite the project.
  8. Run relevant tests after making changes.
  9. If tests fail, investigate and fix them.
  10. Clearly summarize the work when finished.

  Available tools:

  - list_files
  - read_file
  - search_files
  - write_file
  - run_command

  Rules:

  - Never claim a tool was executed if it wasn't.
  - Never claim a file was changed unless write_file succeeded.
  - Never claim tests passed unless they actually passed.
  - Never fabricate command output.
  - Never access files outside the workspace.
  - Avoid destructive operations.
  - Do not expose internal reasoning.
  - Work iteratively.
  - Verify your changes whenever possible.

  When the user asks you to modify code:

  1. Inspect.
  2. Understand.
  3. Modify.
  4. Test.
  5. Fix failures.
  6. Report.
        `,
      },

      {
        role: "user",

        content: userInput,
      },
    ];

    let iterations = 0;

    while (
      iterations < MAX_ITERATIONS
    ) {
      iterations++;

      process.stdout.write(
        "\n🤖 "
      );

      let response;

      try {
        response = await requestWithModelServingRetry(() =>
          client.chat.completions.create({
            model: "inadigital-pro",
            messages,
            tools,
            tool_choice: "auto",
          })
        );
      } catch (error) {
        if (error?.status === 401 || error?.status === 403) {
          console.log("");
          console.log("🎤 WADUH... TOKENNYA KAYAKNYA SUDAH EXPIRED 😂");
          console.log("   PRIKITIW bakal minta token baru.");
          console.log("");

          await clearSavedToken();
          await authenticate({ forcePrompt: true });

          response = await requestWithModelServingRetry(() =>
            client.chat.completions.create({
              model: "inadigital-pro",
              messages,
              tools,
              tool_choice: "auto",
            })
          );
        } else {
          throw error;
        }
      }

      const message =
        response.choices[0].message;

      messages.push(message);

    // Show the model's user-facing progress/message before tool execution.
    // This displays only message.content returned by the model, not hidden reasoning.
    if (message.content?.trim()) {
      console.log("");
      console.log(message.content.trim());
      console.log("");
    }


      // ========================================================
      // TOOL CALL
      // ========================================================

      if (
        message.tool_calls?.length
      ) {
        for (
          const toolCall
          of message.tool_calls
        ) {
          const name =
            toolCall.function.name;

          let args;

          try {
            args = JSON.parse(
              toolCall.function
                .arguments
            );
          } catch {
            args = {};
          }

          console.log("");
  console.log(
    `┌─ TOOL: ${name}`
  );
  console.log(
    `└─ Executing...`
  );

          try {
            const result =
              await executeTool(
                name,
                args
              );

            messages.push({
              role: "tool",

              tool_call_id:
                toolCall.id,

              content: result,
            });

            console.log(
              "✓ Tool completed"
            );
          } catch (
            error
          ) {
            messages.push({
              role: "tool",

              tool_call_id:
                toolCall.id,

              content:
                `Tool error: ${error.message}`,
            });

            console.log(
              `✗ ${error.message}`
            );
          }
        }

        continue;
      }

      // ========================================================
      // FINAL RESPONSE
      // ========================================================

      return (
        message.content ||
        "No response."
      );
    }

    return (
      "PRIKITIW stopped because the maximum iteration limit was reached."
    );
  }

  // ============================================================
  // CLI
  // ============================================================

  function showHelp() {
    console.log("");
    console.log("╔══════════════════════════════════════════╗");
    console.log("║             PRIKITIW COMMANDS            ║");
    console.log("╚══════════════════════════════════════════╝");
    console.log("");
    console.log("  /help          → Tampilkan bantuan");
    console.log("  /BisaNgapain   → PRIKITIW bisa apa?");
    console.log("  /status        → Status agent & workspace");
    console.log("  /files         → Lihat file workspace");
    console.log("  /diff          → Lihat Git diff");
    console.log("  /clear         → Bersihkan terminal");
    console.log("  /exit          → Keluar dari PRIKITIW");
    console.log("  /quit          → Keluar dari PRIKITIW");
    console.log("  /logout        → Hapus token lokal & keluar");
    console.log("");
  }

  function showCapabilities() {
    console.log("");
    console.log("🎤 PRIKITIW BISA APAAN?");
    console.log("");
    console.log("😎 Banyak, bosku...");
    console.log("");
    console.log("  🔍 ANALISIS");
    console.log("     • Baca struktur project");
    console.log("     • Cari file & kode");
    console.log("     • Jelasin architecture");
    console.log("     • Cari penyebab error");
    console.log("");
    console.log("  💻 CODING");
    console.log("     • Buat file");
    console.log("     • Edit file");
    console.log("     • Refactor kode");
    console.log("     • Fix bug");
    console.log("     • Implement feature");
    console.log("");
    console.log("  🧪 TESTING");
    console.log("     • Jalankan test");
    console.log("     • Jalankan npm script");
    console.log("     • Analisis test failure");
    console.log("     • Bantu debugging");
    console.log("");
    console.log("  🛠️ TERMINAL");
    console.log("     • Jalankan command");
    console.log("     • Install dependency");
    console.log("     • Build project");
    console.log("     • Git command");
    console.log("");
    console.log("🎤 Intinya:");
    console.log("   Lo ngomong → gue mikir → gue kerjain → gue cek.");
    console.log("");
  }

  function showStatus() {
    console.log("");
    console.log("🎤 STATUS PRIKITIW");
    console.log("");
    console.log(`  📂 Workspace : ${workspace}`);
    console.log(`  🤖 Model     : inadigital-pro`);
    console.log(`  🔧 Tools     : ${tools.length}`);
    console.log(`  🧠 Max steps : ${MAX_ITERATIONS}`);
    console.log(`  🔐 Token     : ${apiKey ? "Configured locally" : "Not configured"}`);
    console.log(`  💾 Config    : ${CONFIG_FILE}`);
    console.log("");
  }

  while (true) {
    let prompt;

    try {
      prompt = await rl.question("\n> ");
    } catch (error) {
      if (error?.code === "ABORT_ERR") {
        console.log("");
        console.log("🎤 EH EH EH... UDAHAN NIH?");
        console.log("   Yaudah... gue cabut.");
        console.log("   PRIKITIW PAMIT! 👋😂");
        console.log("");
        break;
      }

      throw error;
    }

    const command = prompt.trim();

    if (!command) continue;

    // =========================
    // PRIKITIW COMMANDS
    // =========================

    if (command === "/help") {
      showHelp();
      continue;
    }

    if (
      command.toLowerCase() === "/bisangapain" ||
      command.toLowerCase() === "/bisa-ngapain"
    ) {
      showCapabilities();
      continue;
    }

    if (command === "/status") {
      showStatus();
      continue;
    }

    if (command === "/files") {
      try {
        const result = await listFiles({ path: "." });
        console.log("");
        console.log("📂 ISI WORKSPACE");
        console.log("");
        console.log(result);
        console.log("");
      } catch (error) {
        console.error(`🎤 Waduh, gagal baca workspace: ${error.message}`);
      }
      continue;
    }

    if (command === "/diff") {
      try {
        const { stdout, stderr } = await execAsync("git diff --stat && git diff", {
          cwd: workspace,
          windowsHide: false,
          maxBuffer: 10 * 1024 * 1024,
        });

        console.log("");
        console.log("📝 GIT DIFF");
        console.log("");
        console.log(stdout || "Tidak ada perubahan Git.");
        if (stderr) console.log(`STDERR:\n${stderr}`);
        console.log("");
      } catch (error) {
        console.error("");
        console.error("🎤 Waduh, Git-nya lagi nggak diajak kerja.");
        console.error(`   ${error.stderr || error.message}`);
        console.error("");
      }
      continue;
    }

    if (command === "/clear") {
      console.clear();
      continue;
    }

    if (command === "/logout") {
      await clearSavedToken();
      apiKey = null;
      client = null;
      console.log("");
      console.log("🎤 Token lokal sudah dibuang, bosku.");
      console.log("   Next time PRIKITIW akan minta token lagi.");
      console.log("");
      break;
    }

    if (command === "/exit" || command === "/quit") {
      console.log("");
      console.log("🎤 OKE... GUE CABUT DULU YA!");
      console.log("   Jangan kangen. Kalau ada bug, panggil lagi.");
      console.log("   PRIKITIW PAMIT! 👋😂");
      console.log("");
      break;
    }

    // =========================
    // AI REQUEST
    // =========================

    try {
      const result = await runAgent(command);
      console.log("");
      console.log(result);
    } catch (error) {
      console.error("");
      console.error("🎤 WADUH... INI MAH ADA MASALAH.");
      console.error(`   ERROR: ${error.message}`);
      console.error("");
    }
  }

  rl.close();

  console.log("🎤 PRIKITIW pamit. Sampai ketemu lagi, bosku! 👋😂");

}

main().catch((error) => {
  if (error?.code === "ABORT_ERR") {
    console.log("");
    console.log("🎤 PRIKITIW pamit. Sampai ketemu lagi, bosku! 👋😂");
    return;
  }

  console.error("");
  console.error("🎤 WADUH... PRIKITIW KENA BATU.");
  console.error(`   ERROR: ${error?.message || error}`);
  console.error("");
  process.exitCode = 1;
}).finally(() => {
  if (rl) {
    rl.close();
  }
});
