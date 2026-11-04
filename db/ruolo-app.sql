-- Ruolo usato dall'app su Vercel: solo i permessi che servono, non il proprietario del database.
-- Da eseguire nel SQL Editor di Neon dopo schema.sql, sostituendo la password.
-- La stringa di connessione per DATABASE_URL è quella del proprietario con utente e password di questo ruolo.
create role smista_app login password 'SCEGLI_UNA_PASSWORD_LUNGA';
grant usage on schema public to smista_app;
grant select, insert, update on smista_contatori to smista_app;
