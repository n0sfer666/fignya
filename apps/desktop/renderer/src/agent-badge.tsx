import { Show, type JSX } from "solid-js";

interface AgentBadgeProps {
  connected: boolean;
}

export const AgentBadge = (props: AgentBadgeProps): JSX.Element => (
  <Show when={props.connected}>
    <div class="agent-badge" title="An agent is connected over MCP">
      Agent connected
    </div>
  </Show>
);
