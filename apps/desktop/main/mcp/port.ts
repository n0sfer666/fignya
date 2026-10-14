export const MCP_DEFAULT_PORT = 7341;

export const mcpPort = (value: string | undefined): number => {
  const port = Number(value);
  return value !== undefined && Number.isInteger(port) && port > 0 && port < 65536 ? port : MCP_DEFAULT_PORT;
};
