---
name: new-venture
description: >
  Create a new Naive venture from inside the agent, then hand off to setup.
  Use when the founder says start a venture, new venture, create a venture,
  start a startup, start a fund, try Naive, or set up Naive here.
---

# New venture

The plugin's naive MCP server is running in this folder. With no venture here, its one tool is `naive_new_venture`.

1. Ask what the venture is in a few words. Map it to one of the venture types listed on `naive_new_venture` (a software startup, a VC fund, a services business and so on) and confirm the type with the founder.
   Then ask their role, offering only that type's roles as the tool lists them. In a VC fund, the person running it is a general partner and an investor in it is a limited partner. Do not guess the type or the role.
2. Ask whether they work solo or with a team, and the names of the people.
3. Ask whether a function already keeps its truth somewhere (finance in Rho, product in a GitHub repository, sales in Stripe). Skip it if they don't know.
4. Call `naive_new_venture` with a folder name, the founder's name, the team, the confirmed `type`, the role, and any `sources` (such as `finance=rho`).
5. When it returns, Naive's full tool set appears on the same server, with no restart. Run the naive-setup skill. Nothing in the venture is settled until the founder confirms it.

If the tool is not there (an older client that ignores tool-list changes), run `/mcp` and reconnect naive, or start a new session in the venture's folder.
