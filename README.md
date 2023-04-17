# Frieda
Database schema things designed for the PlanetScale Serverless Driver.

- A simple migration manager that tries to play well with PlanetScale branches and deploy requests.
- Javascript models derived from the database schema (i.e. without a full-on bespoke schema language.)
- A `FreidaDb` class that provides, among other things, simple, typesafe CrUD access to those models.


## Design goals and intentional limitations.

- Roll your own SQL. Frieda is neither a fully featured ORM (a la Prisma) nor a query builder (a la Kysely.) Other than simple `SELECT`s and CrUD statements, Frieda doesn't write queries.
- Frieda is designed to work with the Planetscale/Vitess/MySQL stack. The `FriedaDb` class uses PlanetScale's Serverless Driver.


## CLI

### Quick start

```bash
frieda init
```

### Commands

#### fetch
```bash
frieda fetch
# or
frieda f
```
Fetch the current database schema. The output is a series of `CREATE TABLE`

- schema | s
- migrate | m



### Settings

Most settings reside in a `.friedarc` JSON file in the project root directory. The exception is the database URL, which needs to be provided as an environment variable, since `.friedarc` can and should be committed to git. 

Example `.friedarc`:

```json
{
  "schemaDirectory": "schema",
  "generatedCodeDirectory": "src/db/_generated",
  "externalImports": [
    "import type Stripe from 'stripe'",
    "import type { Foo } from '../../lib/types.js'"
  ]
}
```

#### schemaDirectory

_Required._ The relative path to a dedicated directory meant to contain the current schema, the current migration, and the migration history. 

#### generatedCodeDirectory
_Required._ The relative path to a directory meant to contain the
code Frieda generates. It should be a dedicated folder,
not containing your own code.


- `externalImports`: Optional. An array of full import statements corresponding to the types you have defined for JSON columns. These import statements will be added as is to the generated code files. Import paths should be relative to `generatedCodeDirectory` (path aliases are fine.)

Running `frieda init` will ask you for `schemaDirectory` and `generatedCodeDirectory`, and create or modify  `.friedarc`. You must edit `externalImports` by hand.

#### Database URL 

Frieda uses a URL in the format  `mysql://user:pass@host` to connect to your database. If your app uses separate `host`, `user` and `password` variables to connect, you need to combine them into this format. The variable should be named either `DATABASE_URL` or `FRIEDA_DATABASE_URL`. If `FRIEDA_DATABASE_URL` is valid, it will be used rather than `DATABASE_URL`.

Frieda will look for the value in an `.env` file in the project root directory. If a valid database URL can't be found, Frieda will prompt you to enter it. If you add a `.env` file with the URL, don't forget to add it to `.gitignore`.

The database URL should point to a dev branch of your database, not the production branch.




## Migration workflow

- `migrationsDirectory`: The relative path where Frieda will place migration and introspection files.
- `generatedModelsDirectory`: The relative path where Frieda will create model code.
- `externalTypeImports`: If the schema contains `json` columns that you want to type, enter an array of import statements here. Frieda will include these import statements where necessary in the generated code, but does not check that they are valid. You can use whatever type aliases you have defined, e.g.: `"import type { Foo } from '$lib/types.js'"` rather than `"import type { Foo } from '../../lib/types.js'"`.


### Other

In order to connect securely with mysql2, the program needs to read a `.pem` certificate file from your machine. 
The default is `/etc/ssl/cert.pem`. This **should** work out of the box, but if it doesn't you can specify a different path


- The current migration in `<schema-directory>/current-migration.sql`
- The current schema definition in `<schema-directory>/current-schema.sql`
- Migration history in `<schema-directory>/history`