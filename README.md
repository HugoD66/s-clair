# s-clair

Projet d’application web d’entraînement à la caisse claire, en phase de cadrage.

Le socle prévu repose sur Angular, NestJS, TypeScript et PostgreSQL, avec pnpm
et Docker Compose. L’application n’est pas encore implémentée.

## Développement

Les changements sont préparés sur des branches dédiées et proposés à `main`
par demande de fusion, après vérifications et revue.

La CI GitHub Actions s’exécute sur les pushes et les demandes de fusion.
Elle vérifie actuellement les fichiers publics du dépôt. Les tests applicatifs
seront ajoutés avec les premières fonctionnalités.

Vérification locale, avec Python 3 :

```sh
python3 scripts/check_repository.py
```

Les documents de travail internes, questionnaires, données et configurations
locales sont exclus du dépôt public par `.gitignore`.
