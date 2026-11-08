SELECT
  (SELECT count(*) FROM page_blocks) AS blocks,
  (SELECT count(*) FROM page_locales) AS locales;
