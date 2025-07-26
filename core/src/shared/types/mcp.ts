/**
 * MCP (Model Context Protocol) types for consistent communication
 */

import { z } from 'zod';

// MCP Server Configuration
export const MCPServerConfigSchema = z.object({
  command: z.string().describe('Command to execute the MCP server'),
  args: z.array(z.string()).describe('Arguments to pass to the command'),
  env: z.record(z.string()).optional().describe('Environment variables for the server'),
});

export type MCPServerConfig = z.infer<typeof MCPServerConfigSchema>;

// MCP Tool Call Request
export const MCPToolCallSchema = z.object({
  name: z.string().describe('Name of the tool to call'),
  arguments: z.record(z.any()).describe('Arguments to pass to the tool'),
});

export type MCPToolCall = z.infer<typeof MCPToolCallSchema>;

// MCP Tool Result Response
export const MCPToolResultSchema = z.object({
  content: z.array(z.object({
    type: z.string().describe('Content type (text, image, etc.)'),
    text: z.string().describe('Content text'),
  })).describe('Tool execution results'),
  isError: z.boolean().optional().describe('Whether the result represents an error'),
});

export type MCPToolResult = z.infer<typeof MCPToolResultSchema>;

// MCP Resource Request
export const MCPResourceRequestSchema = z.object({
  uri: z.string().describe('Resource URI to read'),
});

export type MCPResourceRequest = z.infer<typeof MCPResourceRequestSchema>;

// MCP Resource Result Response
export const MCPResourceResultSchema = z.object({
  contents: z.array(z.object({
    uri: z.string().describe('Resource URI'),
    mimeType: z.string().describe('MIME type of the resource'),
    text: z.string().describe('Resource content'),
  })).describe('Resource contents'),
});

export type MCPResourceResult = z.infer<typeof MCPResourceResultSchema>;

// MCP Server Status
export const MCPServerStatusSchema = z.object({
  connected: z.boolean().describe('Whether the server is connected'),
  tools: z.number().describe('Number of available tools'),
  resources: z.number().describe('Number of available resources'),
});

export type MCPServerStatus = z.infer<typeof MCPServerStatusSchema>;

// MCP JSON-RPC Message schemas
export const MCPJsonRpcMessageSchema = z.object({
  jsonrpc: z.literal('2.0'),
  id: z.union([z.string(), z.number()]).optional(),
  method: z.string().optional(),
  params: z.record(z.any()).optional(),
  result: z.any().optional(),
  error: z.object({
    code: z.number(),
    message: z.string(),
    data: z.any().optional(),
  }).optional(),
});

export type MCPJsonRpcMessage = z.infer<typeof MCPJsonRpcMessageSchema>;

// MCP Initialize Request
export const MCPInitializeRequestSchema = z.object({
  protocolVersion: z.string().default('2024-11-05'),
  capabilities: z.object({
    tools: z.record(z.any()).optional(),
    resources: z.record(z.any()).optional(),
  }),
  clientInfo: z.object({
    name: z.string(),
    version: z.string(),
  }),
});

export type MCPInitializeRequest = z.infer<typeof MCPInitializeRequestSchema>;

// MCP Tool Definition
export const MCPToolDefinitionSchema = z.object({
  name: z.string().describe('Tool name'),
  description: z.string().describe('Tool description'),
  inputSchema: z.record(z.any()).describe('JSON schema for tool input'),
});

export type MCPToolDefinition = z.infer<typeof MCPToolDefinitionSchema>;

// MCP Resource Template
export const MCPResourceTemplateSchema = z.object({
  uriTemplate: z.string().describe('URI template for the resource'),
  name: z.string().describe('Resource name'),
  description: z.string().describe('Resource description'),
  mimeType: z.string().optional().describe('MIME type of the resource'),
});

export type MCPResourceTemplate = z.infer<typeof MCPResourceTemplateSchema>;