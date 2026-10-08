#!/usr/bin/env node
/**
 * Ultrathink MCP Server
 *
 * Save and search entries in your Ultrathink knowledge base from any MCP-compatible
 * client (Claude Desktop, Claude Code, etc).
 *
 * Configuration (env vars take priority over file-based config):
 *   ULTRATHINK_DEVICE_KEY  - your Ultrathink device key (required)
 *   ULTRATHINK_API_BASE    - API base URL (default: production Ultrathink API)
 *
 * Get a device key at https://tryultrathink.com
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const DEFAULT_API_BASE = 'https://us-central1-ultrathink-50f7f.cloudfunctions.net';

// Fallback config paths (used only when env vars are not set)
const CONFIG_PATHS = [
  join(process.env.HOME || '', 'scripts/ultrathink/.ultrathink-kevin.json'),
  join(__dirname, '.ultrathink-kevin.json'),
  join(process.env.HOME || '', '.ultrathink-kevin.json'),
];

function loadConfig() {
  if (process.env.ULTRATHINK_DEVICE_KEY) {
    return {
      deviceKey: process.env.ULTRATHINK_DEVICE_KEY,
      apiBase: process.env.ULTRATHINK_API_BASE || DEFAULT_API_BASE,
    };
  }
  for (const configPath of CONFIG_PATHS) {
    if (existsSync(configPath)) {
      return JSON.parse(readFileSync(configPath, 'utf-8'));
    }
  }
  throw new Error(
    'Ultrathink config not found. Set ULTRATHINK_DEVICE_KEY in your environment, ' +
    'or get a device key at https://tryultrathink.com'
  );
}

// API call helper
async function apiCall(endpoint, payload) {
  const config = loadConfig();
  
  const response = await fetch(`${config.apiBase}/${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    // The server hashes the key and looks it up.
    body: JSON.stringify({
      ...payload,
      deviceKey: config.deviceKey,
    }),
  });
  
  const result = await response.json();
  
  if (!response.ok) {
    throw new Error(result.error || `API error: ${response.status}`);
  }
  
  return result;
}

// Create MCP server
const server = new Server(
  {
    name: 'ultrathink-mcp',
    version: '1.0.1',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'ultrathink_save',
        description: 'Save an entry to Ultrathink knowledge base. Use this to store notes, ideas, links, snippets, and other knowledge.',
        inputSchema: {
          type: 'object',
          properties: {
            title: {
              type: 'string',
              description: 'Title of the entry',
            },
            notes: {
              type: 'string',
              description: 'Notes or description (main content for most entries)',
            },
            content: {
              type: 'string',
              description: 'Full content (for longer entries)',
            },
            type: {
              type: 'string',
              enum: ['note', 'link', 'idea', 'snippet', 'para', 'outlook', 'chatgpt', 'claude', 'perplexity', 'notion', 'long-note', 'profile'],
              description: 'Type of entry. Default: note',
            },
            url: {
              type: 'string',
              description: 'URL (required for link type)',
            },
            visibility: {
              type: 'string',
              enum: ['private', 'org'],
              description: 'Visibility: private (default) or org (shared with organization)',
            },
          },
          required: ['title'],
        },
      },
      {
        name: 'ultrathink_search',
        description: 'Search the Ultrathink knowledge base using natural language. Returns an AI-generated answer based on stored entries.',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Natural language search query',
            },
            entityFilter: {
              type: 'string',
              enum: ['project', 'task', 'knowledge'],
              description: 'Optional filter by entity type',
            },
          },
          required: ['query'],
        },
      },
    ],
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  
  try {
    switch (name) {
      case 'ultrathink_save': {
        const entry = {
          title: args.title || '',
          notes: args.notes || '',
          content: args.content || '',
          type: args.type || 'note',
          url: args.url || '',
          visibility: args.visibility || 'private',
          source: process.env.ULTRATHINK_SOURCE || 'mcp',
          timestamp: new Date().toISOString(),
        };
        
        // Remove empty fields
        Object.keys(entry).forEach(key => {
          if (entry[key] === '') delete entry[key];
        });
        
        const result = await apiCall('saveEntry', { entry });
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                message: `Entry saved successfully`,
                id: result.id,
                title: entry.title,
                type: entry.type,
              }, null, 2),
            },
          ],
        };
      }
      
      case 'ultrathink_search': {
        const payload = {
          query: args.query,
        };
        
        if (args.entityFilter) {
          payload.entityFilter = args.entityFilter;
        }
        
        const result = await apiCall('searchKB', payload);
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                answer: result.answer,
                matchingTimestamps: result.matchingTimestamps || [],
                entriesSearched: result.debugInfo?.entryCount || 0,
              }, null, 2),
            },
          ],
        };
      }
      
      default:
        return {
          content: [
            {
              type: 'text',
              text: `Unknown tool: ${name}`,
            },
          ],
          isError: true,
        };
    }
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${error.message}`,
        },
      ],
      isError: true,
    };
  }
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Ultrathink MCP server running on stdio');
}

main().catch(console.error);
