-- Preenche date_email com created_at onde estiver NULL (publicações antigas passam a exibir uma data na lista).
UPDATE publicacoes_oab
SET date_email = created_at
WHERE date_email IS NULL;
