-- On retire la table download_events : la traçabilité des téléchargements
-- n'est pas requise par les spécifications du MVP.
DROP TABLE IF EXISTS download_events;
