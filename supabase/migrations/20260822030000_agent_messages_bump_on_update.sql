-- agent_messages rows are now upserted, not just inserted: a tool-approval
-- response updates an existing row in place (same message id), and so does
-- the continuation that follows once the model resumes. The original
-- trigger only fired on insert, so those turns never bumped the
-- conversation's last_message_at. Fire on both.
drop trigger agent_messages_bump_conversation on public.agent_messages;

create trigger agent_messages_bump_conversation
  after insert or update on public.agent_messages
  for each row execute function public.bump_agent_conversation_last_message();
