> **craft-design adaptation.** There is no daemon and no
> `/api/craft/connectors/poll` endpoint. Build the dashboard in mock mode with the
> seeded data and keep the refresh, tween and stale-state behaviour working against
> that data. When the user wants real numbers, fetch them with the tools the agent
> already has (connected MCP servers, `gh`, files) and write them into the seed
> data; never put provider URLs or tokens into the artifact.
