-- The Mastra-based single-shot retro feature is replaced by the AI Agent
-- (conversations + tool calls). Retros now live as chat history instead of
-- one row per week.
drop table if exists public.retros;
