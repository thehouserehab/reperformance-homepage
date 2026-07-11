CREATE INDEX IF NOT EXISTS rp_clients_page_cursor_idx
  ON rp_clients (updated_at DESC, created_at DESC, id DESC);
