-- Local e Vara do Recorte podem ser longos (ex.: comarca + vara); evita truncar demais.
ALTER TABLE "publicacoes_oab" ALTER COLUMN "local" TYPE varchar(500);
ALTER TABLE "publicacoes_oab" ALTER COLUMN "vara" TYPE varchar(500);
