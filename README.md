# Naive plugins

Naive is an AI-native venture development framework: it gives a venture (a startup, a fund, a small business) a structure of records and decisions that an agent can work in, while the founder makes the decisions.

This repository is the plugin that puts Naive inside your agent. You don't need to install Node packages or read docs first.

## Claude Code

```
/plugin marketplace add tchjhnsn/naive-plugins
/plugin install naive@naive
```

Then, in an empty folder, say **"Start a new venture with Naive."** The plugin will:
1. ask what you're building and who is founding it;
2. create the venture;
3. walk you through setup in conversation: your people and hats, where each function keeps its truth, your strategic foundation, and a goal for discovery.

Naive drafts and asks, and you decide. Nothing is settled until you confirm it.

The plugin needs Node.js 20 or later on your machine, which Claude Code already uses.

## What's inside

- `plugins/naive/bin/naive-mcp.mjs` is Naive's MCP server. In a venture folder, it runs `naive mcp` from [naive-framework](https://www.npmjs.com/package/naive-framework). In an empty folder, it offers one tool, `naive_new_venture`, and once the venture exists, the full tool set appears.
- `plugins/naive/skills/new-venture` creates the venture.
- `plugins/naive/skills/naive-setup` walks you through setup, with progress shown as an artifact.

## License

MIT
