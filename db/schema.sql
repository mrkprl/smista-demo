-- Unica tabella del progetto: i contatori dei limiti giornalieri di "Prova con un tuo messaggio".
-- Non contiene messaggi. La chiave è '__totale__' oppure l'HMAC-SHA256 di (giorno, IP) con SMISTA_SALE_IP,
-- quindi lo stesso IP non è collegabile tra un giorno e l'altro.
create table if not exists smista_contatori (
  giorno    date    not null,
  chiave    text    not null,
  conteggio integer not null default 0,
  primary key (giorno, chiave)
);

-- Pulizia facoltativa delle righe vecchie:
-- delete from smista_contatori where giorno < current_date - 7;
