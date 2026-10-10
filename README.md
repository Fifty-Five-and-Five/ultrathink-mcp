# Ultrathink MCP Server

Save and search your [Ultrathink](https://tryultrathink.com) knowledge base from any MCP-compatible client: Claude Desktop, Claude Code, Cursor, Zed and more.

Ultrathink is a second-brain app that captures notes, links, screenshots, AI conversations, PDFs and more into a single AI-searchable knowledge base.

## New: the hosted Ultrathink MCP server

Ultrathink now runs its own MCP server online, so there is nothing to install. It has more tools than this package: search, read an entry in full, related entries, recent changes, everything about a person or a topic, lists of your topics and people, and adding and updating entries.

Connect Claude Code with one command, using a device key with API access:

```bash
claude mcp add --transport http ultrathink https://us-central1-ultrathink-50f7f.cloudfunctions.net/mcp --header "Authorization: Bearer YOUR_DEVICE_KEY"
```

Any MCP client that supports remote servers over HTTP with a header can use the same address. Setup, tools and troubleshooting are in the [MCP server guide](https://tryultrathink.com/docs/integrations/mcp-server/).

The hosted server is the recommended way to connect. This package keeps working, with the two tools below, for clients that only run local servers.

## This package

It gives your AI assistant two tools:

- `ultrathink_save`: store a note, link, idea or snippet in your knowledge base
- `ultrathink_search`: natural-language search across everything you've captured

## Install

```bash
npm install -g ultrathink-mcp
```

Or use directly with `npx ultrathink-mcp` (no install needed).

## Configuration

You need an Ultrathink device key. Get one at [tryultrathink.com](https://tryultrathink.com).

Set as environment variables:

```bash
export ULTRATHINK_DEVICE_KEY="your-device-key-here"
```

Optional:

```bash
export ULTRATHINK_API_BASE="https://us-central1-ultrathink-50f7f.cloudfunctions.net"  # default
export ULTRATHINK_SOURCE="claude-code"  # tag entries with a source label
```

## Use with Claude Code

Add to your `~/.claude.json` mcpServers:

```json
{
  "mcpServers": {
    "ultrathink": {
      "command": "npx",
      "args": ["-y", "ultrathink-mcp"],
      "env": {
        "ULTRATHINK_DEVICE_KEY": "your-device-key-here"
      }
    }
  }
}
```

## Use with Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "ultrathink": {
      "command": "npx",
      "args": ["-y", "ultrathink-mcp"],
      "env": {
        "ULTRATHINK_DEVICE_KEY": "your-device-key-here"
      }
    }
  }
}
```

## Tools

### `ultrathink_save`

Save an entry to your Ultrathink knowledge base.

Inputs:
- `title` (required): title of the entry
- `notes`: main content for most entries
- `content`: full content for longer entries
- `type`: one of `note`, `link`, `idea`, `snippet`, `para`, `chatgpt`, `claude`, `perplexity`, `notion`, `long-note`, `profile`. Default: `note`
- `url`: required when `type` is `link`
- `visibility`: `private` (default) or `org`

### `ultrathink_search`

Natural-language search across your Ultrathink knowledge base. Returns an AI-generated answer based on stored entries.

Inputs:
- `query` (required): natural-language search query
- `entityFilter`: optional, one of `project`, `task`, `knowledge`

## Licence

MIT
