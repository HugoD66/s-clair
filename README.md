# s-clair

Application web d’entraînement à la caisse claire. Ce premier lot fournit le
socle technique local ; le parcours musical sera développé dans un lot suivant.

## Ce que permet le socle

La page de démonstration lit une donnée fictive dans PostgreSQL via l’API, permet
de demander une donnée absente et affiche l’erreur en français ou en anglais.
Le choix de langue est mémorisé dans le navigateur. Aucun compte ni donnée élève
n’est utilisé à cette étape.

| Service Docker | Rôle                                      | Technologie                              |
| -------------- | ----------------------------------------- | ---------------------------------------- |
| `web`          | Interface responsive FR/EN                | Angular                                  |
| `api`          | API REST `/api/v1`, validation et erreurs | NestJS/Express en ESM                    |
| `db`           | Données persistantes                      | PostgreSQL, Prisma ORM et Prisma Migrate |

TypeScript strict, workspace pnpm, CLI locaux ; le front et l’API se rechargent
pendant le développement. Le [plan de développement](https://github.com/HugoD66/s-clair/issues/2)
présente les lots suivants.

## Démarrage local

Prérequis : Git, Docker Engine et Docker Compose v2 ou plus récent, Bash.
Les commandes ci-dessous sont prévues pour Linux et les runners Linux de la CI.
Node.js, pnpm et les CLI s’exécutent dans Docker ; aucune installation hôte n’est
nécessaire. Les dépendances restent dans des dossiers locaux ignorés par Git.

```sh
cp .env.example .env
./scripts/dev.sh setup
./scripts/dev.sh seed
./scripts/dev.sh up
```

Ouvrir [http://localhost:4200](http://localhost:4200). Choisir **Lire la donnée**
pour afficher `s-clair demo`, puis **Tester une donnée absente** pour l’erreur.
Passer à **English** : le message déjà affiché change sans rechargement.

`setup` installe les dépendances verrouillées, génère le client Prisma, démarre
PostgreSQL et applique les migrations. `seed` ajoute explicitement la donnée
fictive ; il préserve une ligne déjà existante. Aucun seed n’est exécuté au
démarrage ou au redémarrage des services.

Les identifiants de `.env.example` sont fictifs et réservés au développement.
La base et l’API n’exposent aucun port sur l’hôte. Seul le front écoute sur
`127.0.0.1` ; son proxy transmet `/api` à l’API. Swagger est accessible en
local à [http://localhost:4200/api/docs](http://localhost:4200/api/docs).

Pour arrêter puis relancer sans effacer les données :

```sh
./scripts/dev.sh down
./scripts/dev.sh up
```

Le volume nommé `database` conserve PostgreSQL, y compris lors de la recréation
des conteneurs. `docker compose down --volumes` supprimerait ces données.
Consulter les journaux avec `./scripts/dev.sh logs`.

Si le réseau bridge Docker n’accède pas au registre npm, Linux permet d’utiliser
le réseau hôte pour l’installation et les builds uniquement :

```sh
BUILDX_BUILDER=default BUILD_NETWORK=host ./scripts/dev.sh setup
```

Les services applicatifs conservent leur réseau Compose. Les scripts utilisent
l’UID/GID de l’utilisateur pour éviter de créer des sources appartenant à root.

## Vérifications

Le point d’entrée commun au poste et à GitHub Actions est :

```sh
./scripts/check.sh
```

Il installe les dépendances figées et vérifie formatage, lint, types, tests
unitaires, contrat généré et compilations. Il construit ensuite les images et
exécute les tests d’intégration API/PostgreSQL et les parcours Playwright sur
Chromium. La recette recrée les services sans seed, contrôle la persistance,
arrête temporairement SQL puis vérifie la détection de panne et la reprise.

Cette commande fonctionne sans `.env` ni document privé. Elle crée un projet
Compose unique et une base de test distincte, puis supprime ses conteneurs et
son volume en sortie. Elle n’efface pas le volume de développement. En cas de
réseau bridge bloqué : `BUILDX_BUILDER=default BUILD_NETWORK=host ./scripts/check.sh`.

Contrôles ciblés, après `setup` :

```sh
docker compose run --rm --no-deps api pnpm check
docker compose run --rm --no-deps api pnpm test:unit
python3 scripts/check_repository.py
```

Les tests d’intégration requièrent la base temporaire `sclair_test` et refusent
une autre base. Ils sont orchestrés par `check.sh`. La CI s’exécute sur push et
PR : **Documentation checks** et **Application checks** doivent réussir avant
fusion. Aucun déploiement n’est déclenché par la CI.

## Contrat, migrations et diagnostic

- Schéma : [schema.prisma](apps/api/prisma/schema.prisma). Migrations SQL
  versionnées dans `apps/api/prisma/migrations` ; les migrations appliquées sont
  corrigées par de nouvelles migrations.
- Contrat : [OpenAPI](contracts/openapi.json). Types front générés dans
  `apps/web/src/app/api-types.ts`. Pour les régénérer après modification de l’API :
  `docker compose run --rm --no-deps api pnpm contract:generate`.
  `pnpm contract:check` détecte un contrat ou des types non actualisés.
- Les erreurs suivent `application/problem+json`, avec une clé `code` et un
  `requestId`. Les traductions résident dans le front ; les diagnostics restent
  en anglais. Les messages internes ne sont pas transmis à l’interface.
- `/api/v1/health/live` vérifie le processus ; `/api/v1/health/ready` interroge
  PostgreSQL et retourne 503 pendant une indisponibilité. Les logs JSON associent
  statut, durée et identifiant à chaque requête.

## Versions et organisation

Versions principales verrouillées : Node 24.21.0, pnpm 12.10.1, Angular 22.2.2,
NestJS 12.1.2, TypeScript 6.0.3, PostgreSQL 18.6, Prisma 7.10.0.
Les images Node/PostgreSQL sont épinglées par digest et `pnpm-lock.yaml` est
versionné. Le générateur OpenAPI utilise un outil séparé sous `tools/contracts`
avec son pair TypeScript 5 ; les applications utilisent TypeScript 6.

- `apps/web` : Angular et catalogues FR/EN.
- `apps/api` : NestJS, Prisma et tests d’intégration.
- `tests/e2e` : parcours navigateur.
- `compose.yaml` : développement avec rechargement et volume persistant.
- `compose.test.yaml` : recette isolée des images compilées.

Les images de recette servent à vérifier les builds ; l’hébergement, les secrets
et la préparation d’une mise en ligne feront l’objet d’un lot dédié. Les documents
internes, questionnaires, secrets et artefacts locaux restent exclus du dépôt
public et du contexte de build des images.
