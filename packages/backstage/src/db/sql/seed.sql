INSERT INTO users (id, email, created_at) VALUES ('u1', 'a@example.com', 0);

INSERT INTO pages (id, created_at, updated_at) VALUES ('p1', 0, 0), ('p2', 0, 0);

INSERT INTO page_locales (page_id, locale, slug) VALUES ('p1', 'fr', 'bonjour');

INSERT INTO page_blocks (id, page_id, position, block, content) VALUES ('b1', 'p1', 0, 'hero', '{}');

INSERT INTO media (id, r2_key, filename, content_type, size, width, height, uploaded_by, created_at) VALUES (
  'm1', 'k', 'a.png', 'image/png', 1, 1, 1, 'u1', 0
);
