# Frieda

Javascript code generator for the PlanetScale serverless driver.

> This library is a work in progress. Bug reports, suggestions and PRs are entirely welcome.

- [Goals](#goals)
- [Quick Start](#quick-start)
- [Options](#options)
- [Project Structure](#project-structure)


## Goals

Frieda aims to provide a dead-simple developer experience for typescript/javascript projects using the [PlanetScale serverless driver](https://github.com/planetscale/database-js). 

### Features

- Solid database code for javascript applications.
- Models based on database tables and views.
- Well-typed `CrUD` and `SELECT` methods for the boring things.
- Type-safety for more interesting things written in vanilla SQL.
- Minimal data definition API. Javascript types are primarily derived from the database schema itself using a set of reasonable assumptions. Type customization, where necessary, is done by editing model types in a typescript `schema-definition.d.ts` file.


### Non-goal

Frieda is not meant to be an ORM or a query builder. 

- It doesn't understand relations between tables. 
- Beyond some basic `CrUD` and `SELECT` queries and a couple of helper functions, it does not attempt to abstract away SQL. 
- It does not create or manage migrations. 
- Etc.

_Not having these features is in itself a feature_. Frieda does a limited set of things for one particular stack. It assumes (from experience) that it's better to write non-trivial queries in plain SQL rather relying on abstraction.

That said, Frieda may not be for everyone. If you need an ORM and/or query-building that works with the serverless driver and edge functions, try [Prisma](https://github.com/prisma/prisma) (to manage the schema) and [Kysely with the PlanetScale dialect](https://github.com/depot/kysely-planetscale) (to help write queries.)


## Quick Start

```bash
# install...
npm i frieda
# run...
./node_modules/.bin/frieda 
```
You will be prompted to enter a couple of [options](#options). Frieda will then fetch the schema and generate code.

## Options

Frieda's two main options are stored in a `.friedarc.json` file at the root of the project. This file should be added to git. If it doesn't exist or is somehow invalid, Frieda will prompt you for:

### `envFilePath`
The path to an environment variables file, (e.g. `.env`) containing the database URL. The variable name can be either `DATABASE_URL` or `FRIEDA_DATABASE_URL`. If you use host, username and password to connect to the database, you can easily construct the URL and add it to `.env`:

```bash
FRIEDA_DATABASE_URL=mysql://<YOUR USERNAME>:<YOUR PASSWORD>@aws.connect.psdb.cloud
```
Notes: 

- The URL specified here is only used by Frieda to query the schema and generate code. The generated code itself uses a PlanetScale connection passed in from application code. 
- Remember to add the environment file to `.gitignore`.
- You can override the value in `.friedarc.json` by passing `--env-file <some-other-env-file>` to `frieda`.

### `outputDirectory`
The folder where the generated database code should go, e.g. `src/db`. After you run `frieda` this folder will contain:

- `schema-definition.d.ts` A file you can edit to modify the javascript types.
- `generated` A folder containing the generated code.

Notes: 
- You can keep other files and folders in the `outputDirectory` as long as they do not conflict with the paths mentioned above. But do not put your own code in the `generated` folder, since Frieda nukes its contents befor regenerating code.
- `schema-definition.d.ts`  and the generated code should be considered part of your source code, that is, added to git and included in your javascript/typescript build step. (Unlike with, say, Prisma, there is no separate build step on deploy.)
- You can override the value in `.friedarc.json` by doing `frieda --output-directory <some-other-path>`.

### CLI-only Options

- `--init` Make changes to the two options above. (You can also edit `.friedarc.json` directly.)
- `--help` Show help.


## Project Structure

Assuming you've run `frieda` with `outputDirectory` set to `src/lib/db` your project will have these files and directories added:


```
.
├── .frieda-schema
│   ├── history
│   ├── schema.json
│   └── schema.sql
├── .friedarc.json
└── src
    └── db
        ├── generated
        │   ├── app-db.js
        │   ├── full-text-search-indexes.js
        │   ├── models-db.js
        │   ├── models.d.ts
        │   ├── schema-cast-map.js
        │   ├── schema-definition.js
        │   └── transaction-db.js
        └── schema-definition.d.ts

```

The `.frieda-schema` directory contains convenient information about the schema. Frieda only updates it; it does not rely on the contents. You can safely add it to `.gitignore`, and probably should, since a version folder gets added to `.frieda-schema/history` every time `frieda` runs. Contents:

- `schema.json`: The schema as (1) fetched and (2) parsed. Useful for debugging and filing issues.
- `schema.sql`: The current `CREATE TABLE` / `CREATE VIEW` statements
- `history`: A directory containing past versions of the above. Each version has a folder containing:
  - The previous versions of `schema.json` and `schema.sql`
  - The previous version of `<outputDirectory>/schema-definition.d.ts`




## Javascript Types

### Naming Conventions

- Model types are named with the PascalCase'd table name, e.g. `UserAccount`, `UserAccountCreate`, etc. for a table named with some variation of `user_account` or `UserAccount`.
- Field names are the camelCase'd column name, e.g. `emailVerified` for `email_verified`.

You can use whatever naming convention you want for tables and columns, but there are a couple of edge cases:

- Frieda does not try to fix the case where two tables or two columns within the same table resolve to the same model or field name. For example, tables named `user_account`, `user__account` and `UserAccount` would all result in `UserAccount`. Net: Be consistent when naming tables and columns.
- If a table or column name would result in an invalid javascript identifier Frieda prepends an underscore. For example, `2023_stats` is a valid MySQL name but an invalid javascript identifier. It would be turned into `_2023Stats`. Net: Try not to do this.

### Model Types

For each table (excluding views) in the database, Frieda generates a set of types for selecting, creating and updating the model. Given the following table...

```sql
CREATE TABLE `Triangle` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `url` varchar(300) NOT NULL,
  `description` text INVISIBLE,
  `a` double NOT NULL,
  `b` double NOT NULL,
  `c` double GENERATED ALWAYS AS (sqrt(((`a` * `b`) + (`a` * `b`)))) STORED NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `triangle_url` (`url`)
)
```

...the following model types are generated:

#### Base Model Type

```ts
export type Triangle = {
  id: string;
  name: string;
  url: string;
  description?: string | null;
  a: number;
  b: number;
  c: number;
};
```

This type contains all the fields in the model. If a field has been marked as `INVISIBLE` (see `description` above) it will be optional in the base model type, since `INVISIBLE` columns are omitted when the table is queried with `SELECT *`.

#### Select All Type

```ts
export type TriangleSelectAll = {
  id: string;
  name: string;
  url: string;
  a: number;
  b: number;
  c: number;
};
```

This type represents the model when queried with `SELECT *`. It omits `INVISIBLE` columns. You probably won't have to use it directly. Frieda uses it to infer the result type of model repo `find*` methods. TKTK LINK

#### Primary Key Type

```ts
export type TrianglePrimaryKey = {
  id: string;
};
```

This type is returned by the model repo's `create` method, and is used to select models by primary key. It is an object to account for tables with multiple primary keys, e.g.:

```ts
export type CompanyDashboardUserPrimaryKey = {
  companyId: string;
  userId: string;
};
```

#### Create Type

```ts
export type TriangleCreate = {
  id?: string;
  name: string;
  url: string;
  description?: string | null;
  a: number;
  b: number;
};
```

Represents the data needed to create a model. Fields where the underlying column is `GENERATED` are omitted, (e.g. the `c` column is generated). Fields where the underlying column is `auto_increment` or has a default value are optional.

#### Update Type

```ts
export type TriangleUpdate = {
  name?: string;
  url?: string;
  description?: string | null;
  a?: number;
  b?: number;
};
```

Represents the data needed to update a model. Primary keys and `GENERATED` columns are omitted. All other fields are optional.

#### Find Unique Type

```ts
export type TriangleFindUnique = TrianglePrimaryKey | { url: string };
```

Type representing the ways one can uniquely select a model. This always includes the primary key type plus types derived from the table's other unique indexes (e.g., `url` in `Triangle` has a unique index).

#### Model Db Type

```ts
export type TriangleDb = ModelDb<
  Triangle,
  TriangleSelectAll,
  TrianglePrimaryKey,
  TriangleCreate,
  TriangleUpdate,
  TriangleFindUnique
>;
```

A convenience type for a specific `ModelDb`. TKTK LINK You probably won't need to use it.

### Field Types

Most MySQL column types can be mapped unambiguously to javascript types. Frieda recognizes five exceptions to this rule:

1. How to represent javascipt [`boolean`s](#boolean) in the database.
1. How to type [`bigint`](#bigint) columns in javascript.
1. Specifying the javascript type of [`json`](#json) columns.
1. Whether to type [`set`](#set) columns as javascript `Set`
1. Column types where there's no equivalent in plain javascript, like the [geospatial types](https://dev.mysql.com/doc/refman/8.0/en/spatial-type-overview.html). These columns are typed as javascript `string`.

All [other column types](#other-column-types) are assumed to have obvious javascript counterparts.

#### `boolean`

By convention, any column with the exact type `tinyint(1)` is typed as javascript `boolean` and cast via `parseInt(value) !== 0`. All other flavors of `tinyint` (e.g. just `tinyint`) are typed as javascript `number` and cast as `parseInt(value)`. Note that swapping the column type from `tinyint(1)` to `tinyint` or vice versa has no effect on the range of values the column can represent.

#### `bigint`

`bigint` columns are typed as javascript `string` by default. Reasoning:

- A salient case for `bigint` columns is auto-incrementing primary keys, where it does not make (much) sense to manipulate the values in javascript or compare them other than on equality. If those things are necessary, it's easy to convert the values with`BigInt(id)`.
- Many folks still use `JSON` to put data on the wire. Typing columns as `bigint` by default would force them to convert the values to string first.

This convention can be overridden with a `@bigint` type annotation:

```sql
-- will be typed as (and cast to) javascript bigint
ALTER TABLE `CatPerson`
  MODIFY COLUMN `numCats` bigint unsigned NOT NULL COMMENT '@bigint';
```

#### `json`

By default MySQL `json` columns are typed as `unknown`. You can overcome this by providing a type using the `@json(MyType)` type annotation, in which `MyType` is an inline type (in valid typescript) or an imported type. Examples

```sql
-- An inline type. Must be valid typescript.
ALTER TABLE `FabulousOffer`
  MODIFY COLUMN `pricing` json  NOT NULL
    COMMENT '@json({price; number; discounts: {price: number; quantity: number}[]}';

-- Type imported from a library.
ALTER TABLE
  CompanyStripeAccount
MODIFY
  COLUMN `stripeAccount` json NOT NULL COMMENT '@json(import(''stripe'').Stripe.Account)';

-- An imported type from the application.
ALTER TABLE
  PricingPlan
MODIFY
  COLUMN `discounts` json NOT NULL COMMENT '@json(import(''../types.js'').DiscountTier[])';
  -- note the import path above should be relative to
  -- the `outputPath` where the database code is generated
```

#### `set`

MySQL `set` columns are typed as javascript `string`. Adding the `@set` annotation to a column will change the javascript type to `Set`:

```sql
-- typed as Set<'lg'|'xl'|'xxl'>, using the set definition
ALTER TABLE `Catapult`
  MODIFY COLUMN `size` set('lg', 'xl', 'xxl')  NOT NULL
    COMMENT '@Set';
```

#### Other column types

The remainder of the MySQL column types are handled conventionally.

##### Integer column types

Typed as javascript `number` and cast with `parseInt(value)`:

- `tinyint` [except `tinyint(1)` which is boolean by convention](#boolean)
- `int`
- `integer`
- `smallint`
- `mediumint`
- `year`

##### Float column types

Typed as javascript `number` and cast with `parseFloat(value)`:

- `float`
- `double`
- `real`
- `decimal`
- `numeric`

##### Date column types

Typed as javascript `Date` and cast with `new Date(value)`:

- `date`
- `datetime`
- `timestamp`

##### String column types

Every other column type will be typed as javascript `string`. This includes (but is not limited to):

- `char`, `binary`, `varchar`, `varbinary`
- `blob`, `tinyblob`, `mediumblob`, `longblob`
- `text`, `tinytext`, `mediumtext`, `longtext`
- `time`
- `bit`

### Typing arbitrary `SELECT` queries

Second, you can use a custom model cast TKTK LINK:

```ts
type CatPersonStats = {
  catPersonId: string;
  catCount: bigint;
  fleaCount: bigint;
};
const customCast: CustomModelCast<CatPersonStats> = {
  catCount: 'bigint',
  fleaCount: 'bigint'
};
const results = await db.executeSelect<CatPersonStats>(
  sql`
    SELECT
      CatPerson.id AS catPersonId,
      COALESCE(CatStats.catCount, 0) AS catCount,
      COALESCE(CatStats.fleaCount, 0) AS fleaCount
    FROM
      CatPerson
      LEFT JOIN (
        SELECT
          Cat.ownerId AS ownerId,
          COUNT(*) AS catCount,
          SUM(Cat.fleaCount) AS fleaCount
        FROM
          Cat
        GROUP BY
          Cat.ownerId
      ) AS CatStats ON CatStats.ownerId = CatPerson.id;
  `,
  customCast
);
```

## API

### type `CustomModelCast`





