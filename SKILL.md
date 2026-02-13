---
name: pica
description: Interact with third-party platforms (Gmail, Slack, HubSpot, Stripe, etc.) using the Pica CLI. Use when the user wants to search for available API actions, read API documentation, execute API calls, manage connections, or do anything involving third-party integrations.
triggers:
  - "search actions"
  - "find actions"
  - "execute action"
  - "run action"
  - "list connections"
  - "add connection"
  - "list platforms"
  - "pica"
  - "integration"
---

# Pica CLI

The Pica CLI (`pica`) lets you discover, inspect, and execute actions on 200+ third-party platforms (Gmail, Slack, HubSpot, Stripe, Shopify, etc.) directly from the terminal. It is the CLI equivalent of the Pica MCP toolkit.

## Prerequisites

The CLI must be installed before use. Check if it's available:

```bash
pica --version
```

If the command is not found, install it:

```bash
cd /Users/moe/projects/one/connection-cli
npm install
npm run build
npm link
```

After linking, `pica` will be available globally. If `npm link` fails due to permissions, use `sudo npm link`.

### First-Time Setup

If `pica` has never been configured, run init to set your API key and install the MCP server into your AI agents:

```bash
pica init
```

This stores your API key in `~/.pica/config.json` and configures MCP for Claude Code, Claude Desktop, Cursor, and Windsurf.

## Commands

### List Connections

Show all active connections and their keys:

```bash
pica list
```

Output shows each connection's platform, status, and connection key:

```
  ● gmail      operational
    live::gmail::default::abc123
  ● slack      operational
    live::slack::default::def456
```

The connection key (e.g., `live::gmail::default::abc123`) is needed when executing actions.

### Add a Connection

Connect a new platform via OAuth in the browser:

```bash
pica add gmail
pica add slack
pica add hubspot
```

This opens a browser window to complete the OAuth flow. The CLI polls until the connection is established.

### List Platforms

See all 200+ available platforms:

```bash
pica platforms
pica platforms --category "CRM"
pica platforms --json
```

### Search Actions

Find available API actions on a platform:

```bash
pica search <platform> [query]
```

Examples:

```bash
pica search gmail "send email"
pica search slack "post message"
pica search hubspot "create contact"
pica search stripe "list payments"
pica search shopify "get orders"
```

Options:
- `--limit <n>` - Max results (default: 10)
- `--json` - Output raw JSON

Output shows the HTTP method, path, title, and action ID for each result:

```
  GET     /gmail/v1/users/{{userId}}/messages
         List Messages
         conn_mod_def::ABC123::XYZ789

  POST    /gmail/v1/users/{{userId}}/messages/send
         Send Message
         conn_mod_def::DEF456::UVW012
```

The action ID is what you pass to `knowledge` and `execute`.

### Get Action Knowledge (API Docs)

Get full API documentation for a specific action:

```bash
pica actions knowledge <actionId>
```

Examples:

```bash
pica actions knowledge conn_mod_def::ABC123::XYZ789
pica actions k conn_mod_def::ABC123::XYZ789          # alias
```

Options:
- `--full` - Show complete documentation (default truncates at 50 lines)
- `--json` - Output raw JSON

Output includes: title, platform, method, path, base URL, tags, path variables, and the full API documentation (parameter schemas, request/response examples, caveats).

### Execute an Action

Execute an API call through Pica:

```bash
pica exec <actionId> [options]
```

Options:
- `-c, --connection <key>` - Connection key to use (auto-detected if only one exists for the platform)
- `-d, --data <json>` - Request body as JSON string
- `-p, --path-var <key=value>` - Path variable (repeatable)
- `-q, --query <key=value>` - Query parameter (repeatable)
- `--form-data` - Send as multipart/form-data
- `--form-urlencoded` - Send as application/x-www-form-urlencoded
- `--json` - Output raw JSON

Examples:

```bash
# Send a Gmail message (fully specified)
pica exec conn_mod_def::ABC123::XYZ789 \
  -c live::gmail::default::abc123 \
  -d '{"to": "someone@example.com", "subject": "Hello", "body": "Test"}' \
  -p userId=me

# List Slack channels (auto-selects connection)
pica exec conn_mod_def::DEF456::UVW012

# Get HubSpot contacts with query params
pica exec conn_mod_def::GHI789::RST345 \
  -q limit=10 -q after=abc123
```

**Interactive mode:** If you omit required options, the CLI prompts for them:
- If no `--connection` is given, it fetches connections for the platform and auto-selects (or prompts if multiple)
- If path has `{{variables}}`, it prompts for each one not provided via `--path-var`
- If the method is POST/PUT/PATCH and no `--data` is given, it prompts for the JSON body

## Typical Workflow

The standard flow for interacting with any platform:

```bash
# 1. Check if you have a connection
pica list

# 2. If not, add one
pica add gmail

# 3. Search for the action you need
pica search gmail "send email"

# 4. Read the docs to understand parameters
pica actions knowledge <actionId>

# 5. Execute it
pica exec <actionId> -d '{"to": "...", "subject": "...", "body": "..."}'
```

## Command Reference

| Command | Alias | Description |
|---------|-------|-------------|
| `pica init` | | Set up API key and install MCP |
| `pica list` | `pica ls` | List connections with keys |
| `pica add <platform>` | | Add a new connection via OAuth |
| `pica platforms` | `pica p` | List all available platforms |
| `pica search <platform> [query]` | | Search platform actions |
| `pica actions search <platform> [query]` | `pica a search` | Same as above |
| `pica actions knowledge <actionId>` | `pica a k` | Get API docs for an action |
| `pica actions execute <actionId>` | `pica a x` | Execute an action |
| `pica exec <actionId>` | | Shortcut for actions execute |

## Notes

- All actions route through Pica's passthrough proxy, which handles auth injection, rate limiting, and retries.
- Connection keys are scoped per-environment (`live::` for production, `test::` for sandbox).
- Action IDs always start with `conn_mod_def::`. The CLI normalizes this automatically, so you can pass either the full ID or just the suffix.
- The `--json` flag on any command outputs machine-readable JSON for scripting.
