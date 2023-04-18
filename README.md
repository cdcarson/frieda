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
_Required._ The relative path to a directory meant to contain the code Frieda generates. It should be a dedicated folder, conveniently near, but not containing your own source code. For example, `src/db/_generated` in the structure below:

```
src
├── db
│   ├── _generated
│   │   ├── database.ts
│   │   ├── model-definitions.ts
│   │   ├── schema-cast.ts
│   │   └── types.ts
│   └── your-db-code.ts
└── index.ts
```

#### envFilePath (Database URL)
_Optional._ Default: `.env`

The relative path to an environment variables file where the database URL can be found as either
 - `FRIEDA_DATABASE_URL` or 
 - `DATABASE_URL`. 
 
`FRIEDA_DATABASE_URL` will be used if both are present. 

The environment variable should be in the format `mysql://user:password@host`.

Notes: 

- The database URL should probably point to a dev branch of your database, not the production branch.
- The file at `.env` (or whatever `envFilePath` is) should be added to `.gitignore`, since the URL contains the password.


#### jsonTypeImports
_Optional._ Default: `[]`

An  array of import statements that correspond to the types you have assigned to `json` columns. Frieda includes these _as is_ at in  `<generatedCodeDirectory>/types.ts`. Note that the import paths are not validated, so it's up to you to provide paths that resolve correctly from `generatedCodeDirectory`, according to your project setup. (E.g., type aliases you have defined will work.)


#### typeTinyIntOneAsBoolean
_Optional._ Default: `true`

If `true` (default, recommended) Frieda will type fields with the column type `tinyint(1)` as javascript `boolean`. You can turn this behavior off for an individual `tinyint` column by specifying a "column width" other than `1`. (This has no effect on the range of integer values that can be stored.) 

Examples:

```sql
-- will be typed as javascript boolean...
ALTER TABLE `Triangle` 
  MODIFY COLUMN `isPointy` tinyint(1) NOT NULL DEFAULT 1;

-- will be typed as javascript number...
ALTER TABLE `Triangle` 
  MODIFY COLUMN `numSides` tinyint(2) NOT NULL DEFAULT 3;
```

Setting `typeTinyIntOneAsBoolean` to `false` will turn off this behavior globally. All `tinyint` columns will be typed as `number`.

#### typeBigIntAsString
_Optional._ Default: `true`

If `true` (default, recommended) Frieda types and casts `bigint` columns as `string`. Reasoning: The bulk of `bigint` columns are likely to be primary or secondary keys, and it's just simpler to deal with strings in that context (JSON serialization, interoperability with other javascript APIs.) 

You can opt out of this behavior on an individual field by setting the `@bigint` column comment annotation:

```sql
-- will be typed as and cast to javascript bigint
ALTER TABLE `CatPerson` 
  MODIFY COLUMN `numCats` bigint unsigned NOT NULL COMMENT '@bigint';
```

Setting `typeTinyIntOneAsBoolean` to `false` will turn off this behavior globally. All `bigint` columns will be typed as (and cast to) javascript `bigint`.








## Migration workflow

- `migrationsDirectory`: The relative path where Frieda will place migration and introspection files.
- `generatedModelsDirectory`: The relative path where Frieda will create model code.
- `jsonTypeImports`: If the schema contains `json` columns that you want to type, enter an array of import statements here. Frieda will include these import statements where necessary in the generated code, but does not check that they are valid. You can use whatever type aliases you have defined, e.g.: `"import type { Foo } from '$lib/types.js'"` rather than `"import type { Foo } from '../../lib/types.js'"`.


### Other

In order to connect securely with mysql2, the program needs to read a `.pem` certificate file from your machine. 
The default is `/etc/ssl/cert.pem`. This **should** work out of the box, but if it doesn't you can specify a different path


- The current migration in `<schema-directory>/current-migration.sql`
- The current schema definition in `<schema-directory>/current-schema.sql`
- Migration history in `<schema-directory>/history`