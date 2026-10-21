> **craft-design adaptation.** There is no OpenDesign daemon and no
> `/api/od/connectors/poll` endpoint. Build the dashboard in mock mode with the
> seeded data and keep the refresh, tween and stale-state behaviour working against
> that data. When the user wants real numbers, fetch them with the tools the agent
> already has (connected MCP servers, `gh`, files) and write them into the seed
> data; never put provider URLs or tokens into the artifact.
