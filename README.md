# Frieda

Javascript code generator for the PlanetScale serverless driver.

> This library is a work in progress. Bug reports, suggestions and PRs are entirely welcome.

- [Why?](#why)
- [Quick Start](#quick-start)
  - [Example: Using the generated `ApplicationDatabase` class](#example-using-the-generated-applicationdatabase-class)
  - [Example: Modifying a field type](#example-modifying-a-field-type)
- [Project Structure](#project-structure)
  - [Metadata and option files](#metadata-and-option-files)
  - [Generated code files](#generated-code-files)
- [Naming Conventions](#naming-conventions)
- [Field Types](#field-types)
  - [Field Type Conventions](#field-type-conventions)
  - [Modifying field types](#modifying-field-types)
    - [Recipe: Typing `json` fields](#recipe-typing-json-fields)
    - [Recipe: Typing `bigint` aggregate fields](#recipe-typing-bigint-aggregate-fields)
- [Model Types](#model-types)
- [Casting](#casting)
- [Arbitrary `SELECT` Queries](#arbitrary-select-queries)
- [Options](#options)
- [API](#api)
- [Contributing](#contributing)
- [Who's Frieda](#whos-frieda)

## Why?

Frieda aims to create solid database code for typescript/javascript projects using the [PlanetScale serverless driver](https://github.com/planetscale/database-js):

- Typed javascript models based on a database's tables and views.
- Typed methods to take care of the boring stuff: `SELECT` and CrUD.
- Accurate typing for more interesting stuff written in vanilla SQL.

Other key features:

- No bespoke data definition language. There's just a plain typescript file containing model types. Initially this file is populated using a set of reasonable conventions mapping MySQL column types to javascript field types. Need to change how a field is typed and cast? Just edit its javascript type.
- No other unnecessary features. Frieda is not an ORM or a query builder. Models have no notion of their relations. Beyond simple `SELECT` and CrUD, Frieda does not write SQL for you. It does not create migrations. It does not let you switch to MongoDb. Frieda assumes...
  - You're cool with writing a certain amount of SQL by hand.
  - You're happy with PlanetScale's built-in schema workflow.

> Frieda not what you want? Try [Prisma](https://github.com/prisma/prisma) (to manage the schema) and [Kysely with the PlanetScale dialect](https://github.com/depot/kysely-planetscale) (to help write queries.)

## Quick Start

```bash
# install...
npm i frieda
# run...
./node_modules/.bin/frieda
```

Frieda will ask for a few [options](#options):

- Where to find your database URL.
- Where you want the generated database code to go.
- ([Experimental](#compilejs).) Whether you want to compile to javascript rather typescript.

These options are saved to `.friedarc.json`, so you don't have to go through the prompts every time.

Frieda then fetches the schema and generates code.

### Example: Using the generated `ApplicationDatabase` class

_Note: this example assumes you are using typescript with [`compileJs`](#compilejs) off. If you're using javascript you'll have to adjust a few things_

Create a `get-db.ts` file in the `outputDirectory` path you specified, next to the generated files. (It doesn't have to be here, just keeping things simple.)

```
src/lib/db            <-- outputDirectory
├── frieda-models.ts  <-- generated by frieda, editable by you
├── frieda.ts         <-- generated code, don't edit
└── get-db.ts         <-- add this
```

```ts
// src/lib/db/get-db.ts
import { connect } from '@planetscale/database';
// Get the database URL. E.g., in SvelteKit:
import { DATABASE_URL } from '$env/static/private';
// import the generated AppDb class...
import { ApplicationDatabase } from './frieda.js';

let _appDb: ApplicationDatabase | undefined = undefined;

export const getDb = (): ApplicationDatabase => {
  if (!_appDb) {
    _appDb = new ApplicationDatabase(connect({ url: DATABASE_URL }));
  }
  return _appDb;
};
```

This example exports a `getDb` functions that returns a singleton instance of the generated [`ApplicationDatabase`](#class-applicationdatabase-generated) class. `ApplicationDatabase` exposes:

- A [`ViewDatabase`](#class-viewdatabase) instance for each model based on a database _view_. This has `find*` and `count*` methods.
- A [`TableDatabase`](#class-tabledatabase) instance for each model based on a database _table_. In addition to `find*` and `count*` this has `create*`, `update*` and `delete*` methods.
- Methods to perform arbitrary queries (not based directly on a model.)

Import `getDb` and use the `ApplicationDatabase` instance:

```ts
// a SvelteKit example +page.server.js file
// src/routes/cats/[catId]/+page.server.js
import { error } from '@sveltejs/kit';
// note src/lib is aliased as $lib
import { getDb } from '$lib/db/get-db.js';

export const load = async (event) => {
  const db = getDb();
  const id = event.params.catId;
  const cat = await db.cat.find({ where: { id } });
  if (!cat) {
    throw error(404, `Cat ID ${id} not found!`);
  }
  // note `cat` is typed as `CatSelectAll` from '$lib/db/frieda'
  return { cat };
};
```

### Example: Modifying a field type

Open `frieda-models.ts` file in the output directory. This is where you can edit javascript field types.

```
src/lib/db           <-- outputDirectory
├── frieda-models.ts <-- generated by frieda, editable by you
└── frieda.ts        <-- generated code, don't edit
```

When you first run `frieda`, or when you add a table or column to the database schema, the field types are based on [a few conventions](#field-type-conventions). One of those conventions is that `bigint` columns are types as javascript `string`. So if you have a table like this...

```sql
CREATE TABLE
  `Cat` (
    `id` bigint unsigned NOT NULL AUTO_INCREMENT,
    `ownerId` bigint unsigned NOT NULL,
    `name` varchar(100) NOT NULL,
    `fleaCount` bigint NOT NULL DEFAULT '0',
    PRIMARY KEY (`id`)
  )
```

...the `fleaCount` field will `string` both in the editable type...

```ts
// frieda-models.ts
type Cat = {
  id: string;
  ownerId: string;
  name: string;
  fleaCount: string;
};
```

...and in the generated `Cat*` types:

```ts
// frieda.ts (or frieda.d.ts if compileJs is true)
export type Cat = {
  id: string;
  ownerId: string;
  name: string;
  fleaCount: string;
};
// ditto for the other Cat* types, `CatCreate`, `CatUpdate`, etc.
```

This is probably not what you want. Edit the `Cat` type.

```diff
// frieda-models.ts
type Cat = {
  id: string;
  ownerId: string;
  name: string;
-  fleaCount: string;
+  fleaCount: bigint;
};
```

Re-run `frieda`...

```bash
./node_modules/.bin/frieda
```

You won't see any changes to `frieda-models.ts` (your changes to this file are always preserved as long as the model and field are not dropped in the database,) but the **generated** `Cat*` model types in `frieda.ts` (or `frieda.d.ts`) will reflect the change:

```diff
// frieda.ts (or frieda.d.ts if compileJs is true)
export type Cat = {
  id: string;
  ownerId: string;
  name: string;
-  fleaCount: string;
+  fleaCount: bigint;
};
// ditto for the other Cat* types, `CatCreate`, `CatUpdate`, etc.
```

## Project Structure

A typical project using Frieda will look like this. `outputDirectory` in this example is `src/lib/db`.

```
.
├── .frieda-metadata
│   ├── history
│   │   └── 2023-08-06T22:46:08.925Z
│   │       ├── frieda-models.ts
│   │       ├── schema.json
│   │       └── schema.sql
│   ├── .gitignore
│   ├── schema.json
│   └── schema.sql
├── .friedarc.json
└── src
    ├── lib
    │   └── db <-- outputDirectory
    |       ├── frieda-models.ts
    |       ├── frieda.{ts|js}
    │       └── frieda.d.ts (only if compileJs is true)
    └── ...other source code
```

### Metadata and option files

- The `.frieda-metadata` directory contains information about the current schema and previous versions, for reference and debugging purposes. Frieda only writes to this folder &mdash; it does not rely on the contents. The `.frieda-metadata/history` folder is .gitignore'd by default since it a new version is created every time you run `frieda`. (Edit `.frieda-metadata/.gitignore` to change this behavior.)
- `.friedarc.json` saves your current [options](#options).

### Generated code files

Freida generates the following two files in the [`outputDirectory`](#outputdirectory):

- `frieda-models.ts` This file contains model type definitions for each table and view. It's meant to be edited. See [Modify field types in `frieda-models.ts`](#modify-field-types-in-frieda-modelsts). Note that the types here are only analyzed by Frieda &mdash; they are not used in the generated database code.
- `frieda.{ts|js}` This file exports application-ready database code, including [model types](#model-types) and the [`ApplicationDatabase` class](#class-applicationdatabase-generated).
- If the [compileJs](#compilejs) is true an additional `frieda.d.ts` file will be created next to `frieda.js`. The `.d.ts` file contains the types stripped out when compiling `frieda.js`.

Notes:

- You can co-locate other files and folders in `outputDirectory`. Frieda only writes to the file paths mentioned above.
- The contents of `outputDirectory` should be considered part of your source code. That is add it to git and include it in your javascript/typescript build step.

## Naming Conventions

- Model types are named with the PascalCase'd table name, e.g. `UserAccount`, `UserAccountCreate`, etc. for a table named with some variation of `user_account` or `UserAccount`.
- Field names are the camelCase'd column name, e.g. `emailVerified` for `email_verified`.

You can use whatever naming convention you want for tables and columns, but there are a couple of edge cases:

- Frieda does not try to fix the case where two tables or two columns within the same table resolve to the same model or field name. For example, tables named `user_account`, `user__account` and `UserAccount` would all result in `UserAccount`. Net: Be consistent when naming tables and columns.
- If a table or column name would result in an invalid javascript identifier Frieda prepends an underscore. For example, `2023_stats` is a valid MySQL name but an invalid javascript identifier. It would be turned into `_2023Stats`. Net: Try not to do this.

## Field Types

When you first run `frieda` (and thereafter when a new table or column is added) field types are based on some [default conventions](#field-type-conventions) mapping MySQL column types to javascript field types. Mostly this will give you the javascript field type you want.

In some cases, however, you will want to override the convention or narrow the type. You can do this by [editing the field in `frieda-models.ts`](#modify-field-types-in-model-typesdts), using typescript. Frieda does not limit or validate the javascript type based on the column type. You can type any field as anything you like, as long as it's valid typescript, **but...**

**...a word about casting:** In some circumstances Frieda uses the javascript type you define to determine how to [cast](#casting) values. It's therefore up to you to choose a javascript type that won't produce unexpected results. For example...

- Typing numeric columns as `boolean` will work fine.
- Typing a string columns as `boolean` will not work.

### Field Type Conventions

| MySql Type                                                                                                                                                                                          | Default Javascript Type                                                         |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `bigint`                                                                                                                                                                                            | `string` ([reasoning](#why-are-bigint-columns-typed-as-string))                 |
| `tinyint(1)`, `boolean`, `bool`                                                                                                                                                                     | `boolean`                                                                       |
| `tinyint` (except `tinyint(1)`,) `int`, `integer`, `smallint`, `mediumint`, `year`                                                                                                                  | `number`                                                                        |
| `float`, `double`, `real`, `decimal`, `numeric`                                                                                                                                                     | `number`                                                                        |
| `date`, `datetime`, `timestamp`                                                                                                                                                                     | `Date`                                                                          |
| `set('a','b')`                                                                                                                                                                                      | <code>Set<'a'&#124;'b'></code> ([reasoning](#why-are-set-columns-typed-as-set)) |
| `enum('a','b')`                                                                                                                                                                                     | <code>'a'&#124;'b'</code>                                                       |
| `json`                                                                                                                                                                                              | `unknown` ([reasoning](#why-are-json-columns-typed-as-unknown))                 |
| `char`, `varchar`,                                                                                                                                                                                  | `string`                                                                        |
| `binary`, `varbinary`                                                                                                                                                                               | `string`                                                                        |
| `text`, `tinytext`, `mediumtext`, `longtext`                                                                                                                                                        | `string`                                                                        |
| `blob`, `tinyblob`, `mediumblob`, `longblob`                                                                                                                                                        | `string`                                                                        |
| `bit`                                                                                                                                                                                               | `string`                                                                        |
| `time`                                                                                                                                                                                              | `string`                                                                        |
| Everything else, including column types where there is no corresponding type in vanilla javascript, e.g. the [geospatial types](https://dev.mysql.com/doc/refman/8.0/en/spatial-type-overview.html) | `string`                                                                        |

#### Why are `bigint` columns typed as `string`?

- A common (the most common?) case for `bigint` columns is auto-incrementing primary keys, where it does not make (much) sense to manipulate the values in javascript or compare them other than on equality. If doing those things to keys are necessary, it's easy to convert the values with`BigInt(id)`.
- A stronger argument is that many folks use `JSON` to put data on the wire. Typing columns as `bigint` by default would force them to convert the values to string first.
- That said, there are definitely cases where you want a `bigint` column to be numeric in javascript, either as `bigint` or `number`. In that case provide `bigint` or `number` as the type of the field in `frieda-models.ts`. ([recipe](#recipe-typing-bigint-aggregate-fields))

#### Why are `set` columns typed as `Set`?

- `Set` seems more readily manipulable than a string with comma-separated values. (TBH, that's just a theory. Feedback welcome from folks who actually use `set` columns)
- You can turn this off for an individual field by typing it as `string` in `frieda-models.ts`.

#### Why are `json` columns typed as `unknown`?

- There's no other valid typescript type for this case. For example things like `{}` or `any|any[]` would throw typescript linting errors in addition to (probably) being factually incorrect.
- It's easy to [specify a useful type](#recipe-typing-json-fields) in `frieda-models.ts`.

### Modifying field types

The `frieda-models.ts` file contains a "virtual" model type for each table and view in the database. It's the primary source of truth for Frieda to generate the "real" application model types found in `frieda.ts`.

Edit this file to change the javascript type of model fields. Although the file is regenerated each time you run `freida`, a change you make here is preserved &mdash; so long as the column or its table has not been dropped from the schema. Previous versions are saved in `.frieda-metadata/history`.

The model types in `frieda-models.ts` are not (and cannot be) exported. This prevents your code from importing the "virtual" types by accident. The types in this file only exist to be analyzed by Frieda. Changes do not automatically update the types in `frieda.ts`. You need to re-run `frieda` for the changes to take effect.

Field types in this file **should not** include `|null` or optionality (`?`), just the javascript type. Frieda adds `|null` and optionality to the actual model types where appropriate.

```diff
type Foo = {
  id: string;
- bar?: string|null;
+ bar: string;
}
```

Top-level import declarations are not allowed. Such imports cannot be preserved. Use inline `import('foo').Bar` statements instead:

```diff
- import Stripe from 'stripe';

type StripeCustomer = {
  userId: string;
-  customer: Stripe.Customer;
+  customer: import('stripe').Stripe.Customer;
}
```

#### Recipe: Typing `json` fields

Model fields based on `json` columns can be typed with a literal type...

```ts
type Cat {
  // literal type...
  lastSeenLocation: {lat: number; lng: number; upTree: boolean};
}
```

...or an import...

```ts
type Cat {
  // imported from project code...
  prefs: import('../api.js').CatPreferences;
  // imported from a library...
  savedCard: import('stripe').Stripe.Source;
}
```

> Remember that top level import declaration are not allowed in `frieda-models.ts`. Instead, use the inline `import('foo').Bar` syntax shown above.

#### Recipe: Typing `bigint` aggregate fields

As mentioned [above](#why-are-bigint-columns-typed-as-string), by default `bigint` columns are typed as javascript `string`. This makes sense for primary/secondary keys, but it's a pain in the neck when you actually want a numeric value, a situation that often occurs when dealing with view columns that do aggregation. Fix:

```ts
// assume all the columns in this database view are `bigint`...
type CatPersonLeaderboardStats {
  // Keep as `string`, since it's a key.
  catPersonId: string;

  // Let's type this one as `number`, since we know there can't possibly be more than
  // 9,007,199,254,740,991 cats in the whole world, much less belonging to one person. Right?
  catCount: number;

  // OK, we're not quite so certain about the realistic bounds on this one, or are just
  // too lazy to figure it out, so let's err on the safe side.
  aggregateFleaCount: bigint;
}
```

## Model Types

For each "virtual" model type in `frieda-models.ts` Frieda generates a set of types in `frieda.ts`. Models based on database views only have a [base model type](#base-model-type). Models based on tables have several more types:

- [select all type](#select-all-type)
- [primary key type](#primary-key-type)
- [create type](#create-type)
- [update type](#update-type)
- [find unique type](#find-unique-type)

> Generated model types are intentionally repetitive / verbose. They could be cleverer, but "clever" typescript in this case leads to a less straightforward developer experience.

#### Base Model Type

_Table and view models_ | Example Type Name: `Cat`

This type contains all the fields in the model. If a field has been marked as `INVISIBLE` it will be optional in the base model type, since `INVISIBLE` columns are omitted when the table is queried with `SELECT *`. [Example](#cat-base-model-type)

#### Select All Type

_Table models only_ | Example Type Name: `CatSelectAll`

This type represents the model when queried with `SELECT *`. It omits `INVISIBLE` columns. You probably won't have to use it directly. Frieda uses it to infer the result type of model repo `find*` methods. TKTK LINK TO SPECIAL `select: 'all'` option. [Example](#catselectall-select-all-type)

#### Primary Key Type

_Table models only_ | Example Type Name: `CatPrimaryKey`

This type is returned by the model repo's `create` method, and is used to select models by primary key. It's an object to account for tables with multiple primary keys. [Example](#catprimarykey-primary-key-type)

#### Create Type

_Table models only_ | Example Type Name: `CatCreate`

Represents the data needed to create a model. Fields where the underlying column is `GENERATED` are omitted. Fields where the underlying column is `auto_increment` or has a default value are optional. [Example](#catcreate-create-type)

#### Update Type

_Table models only_ | Example Type Name: `CatUpdate`

Represents the data needed to update a model. Primary keys and `GENERATED` columns are omitted. All other fields are optional. [Example](#catupdate-update-type)

#### Find Unique Type

_Table models only_ | Example Type Name: `CatFindUnique`

Type representing the ways one can uniquely select a model. This always includes the primary key type plus types derived from the table's other unique indexes. [Example](#catfindunique-findunique-type)

### Example: Model types generated for a table

Table:

```sql
CREATE TABLE `Cat` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `ownerId` bigint unsigned NOT NULL,
  `name` varchar(100) NOT NULL,
  `email` varchar(350) NOT NULL,
  `lastSeen` json,
  `shortDescription` varchar(320),
  `longDescription` text INVISIBLE,
  `fleaCount` bigint NOT NULL DEFAULT(0),
  `height` double NOT NULL,
  `length` double NOT NULL,
  `breadth` double NOT NULL,
  `volume` double GENERATED ALWAYS AS (`height` * `length` * `breadth`) STORED NOT NULL
  PRIMARY KEY (`id`),
  UNIQUE KEY `CatEmail` (`email`)
)
```

Field type changes in `frieda-models.ts`:

```diff
// frieda-models.ts
type Cat = {
  id: string;
  ownerId: string;
  name: string;
  email: string;
-  lastSeen: unknown;
+  lastSeen: {lat: number; lng: number; upTree: boolean}
  shortDescription: string;
  longDescription: string;
-  fleaCount: string;
+  fleaCount: number;
  height: number;
  length: number;
  breadth: number;
  volume: number;
};
```

#### `Cat`: Base Model Type

```ts
// frieda.ts
export type Cat = {
  id: string;
  ownerId: string;
  name: string;
  email: string;
  lastSeen: { lat: number; lng: number; upTree: boolean } | null;
  shortDescription: string | null;
  longDescription?: string | null;
  fleaCount: number;
  height: number;
  length: number;
  breadth: number;
  volume: number;
};
```

Notes:

- `longDescription` is **optional**, since the column is marked `INVISIBLE`. It won't be present when the model is selected with `SELECT *`.

#### `CatSelectAll`: Select All Type

```ts
// frieda.ts
export type CatSelectAll = {
  id: string;
  ownerId: string;
  name: string;
  email: string;
  lastSeen: { lat: number; lng: number; upTree: boolean } | null;
  shortDescription: string | null;
  fleaCount: number;
  height: number;
  length: number;
  breadth: number;
  volume: number;
};
```

Notes:

- `longDescription` is **omitted**, since the column is marked `INVISIBLE`. It won't be present when the model is selected with `SELECT *`.

#### `CatPrimaryKey`: Primary Key Type

```ts
// frieda.ts
export type CatPrimaryKey = {
  id: string;
};
```

#### `CatCreate`: Create Type

```ts
// frieda.ts
export type CatCreate = {
  id?: string;
  ownerId: string;
  name: string;
  email: string;
  lastSeen?: { lat: number; lng: number; upTree: boolean } | null;
  shortDescription?: string | null;
  longDescription?: string | null;
  fleaCount?: number;
  height: number;
  length: number;
  breadth: number;
};
```

Notes:

- `fleaCount` is **optional**, since the column has a default value.
- The nullable fields are optional.
- `volume` is **omitted**, since it's column is `GENERATED ALWAYS`

#### `CatUpdate`: Update Type

```ts
// frieda.ts
export type CatUpdate = {
  ownerId?: string;
  name?: string;
  email?: string;
  lastSeen?: { lat: number; lng: number; upTree: boolean } | null;
  shortDescription?: string | null;
  longDescription?: string | null;
  fleaCount?: number;
  height?: number;
  length?: number;
  breadth?: number;
};
```

Notes:

- `id` is **omitted**, since it's the primary key.
- `volume` is **omitted**, since it's column is `GENERATED ALWAYS`
- All other fields are optional.

#### `CatFindUnique`: FindUnique Type

```ts
// frieda.ts
export type CatFindUnique = CatPrimaryKey | { email: string };
```

Notes:

- `email` has a unique index.

## Casting

The serverless driver returns all database column values as javascript `string|null`. _Casting_ means turning that raw `string|null` value into a field value whose javascript type matches what you expect.

Frieda defines eight cast types:

| [`CastType`](#type-casttype) | Casting Algorithm                  |
| ---------------------------- | ---------------------------------- |
| `'bigint'`                   | `(val) => BigInt(val)`             |
| `'int'`                      | `(val) => parseInt(val)`           |
| `'float'`                    | `(val) => parseFloat(val)`         |
| `'boolean'`                  | `(val) => parseInt(val) !== 0`     |
| `'json'`                     | `(val) => JSON.parse(val)`         |
| `'date'`                     | `(val) => new Date(val)`           |
| `'set'`                      | `(val) => new Set(val.split(','))` |
| `'string'`                   | n/a                                |

In all cases if a column value is `null` it isn't cast &mdash; the field value will be `null`.

## Arbitrary `SELECT` Queries

[`ApplicationDatabase`](#class-applicationdatabase-generated) allows for executing arbitrary `SELECT` queries with `db.selectMany(query)`, `db.selectFirst(query)` and `db.selectFirstOrThrow(query)`. These methods accept a second, optional [`CustomModelCast`](#type-custommodelcast) argument. This is a partial map from the selected fields to a [`CastType`](#type-casttype).

Example:

```ts
type CatPersonStats = {
  catPersonId: string;
  catCount: bigint;
  fleaCount: bigint;
};
const customCast: CustomModelCast<CatPersonStats> = {
  catCount: 'number',
  fleaCount: 'bigint'
};
const { rows } = await db.selectMany<CatPersonStats>(
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

- `rows` is typed as `CatPersonStats[]`
- `catCount` is cast with `parseInt(value)`
- `fleaCount` is cast with `BigInt(value)`

## Options

Frieda's main options are stored in a `.friedarc.json` file at the root of the project. This file should be added to git. If it doesn't exist or is somehow invalid, Frieda will prompt you for:

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

- `frieda-models.ts` A file you can edit to modify the javascript types.
- `frieda.ts` A file that exports the generated code

Notes:

- You can keep other files and folders in the `outputDirectory` as long as they do not conflict with the paths mentioned above.
- The generated code should be considered part of your source code, that is, added to git and included in your javascript/typescript build step.
- You can override the value in `.friedarc.json` by doing `frieda --output-directory <some-other-path>`.

### `compileJs`

**Experimental.** Whether or not to produce javascript files rather than typescript. If set, Frieda will generate `frieda.js` and `frieda.d.ts` rather than `frieda.ts`. This should be turned off for typescript projects &mdash; just let the project build step take care of it. The same can be said for some javascript projects where the build step can consume typescript.

Failing that, javascript is compiled with:

```ts
{
  compilerOptions: {
    module: ts.ModuleKind.ES2022,
    target: ts.ScriptTarget.ESNext,
    lib: ['esnext'],
    preserveConstEnums: true,
    preserveValueImports: true
  }
}
```

Notes:

- Compiling to javascript has been tested and works on a SvelteKit javascript project. If you run into problems with a similar modern framework/build setup please file an issue.
- You can override the value in `.friedarc.json` by doing `frieda --compile-js`.

### CLI-only Options

- `--init` Make changes to the two options above. (You can also edit `.friedarc.json` directly.)
- `--help` Show help.

## API

### type `CastType`

Documentation TKTK

### type `CustomModelCast`

Documentation TKTK

### type `SchemaDefinition`

Documentation TKTK

### class `BaseDatabase`

Documentation TKTK

### class `ViewDatabase`

Documentation TKTK

### class `TableDatabase`

Documentation TKTK

### class `ApplicationDatabase` (generated)

Documentation TKTK

### class `ModelsDatabase` (generated)

Documentation TKTK

### class `TransactionDatabase` (generated)

Documentation TKTK

### utility function: `getSearchSql`

Documentation TKTK

## Contributing

TKTK, basically:

- Setup, including reference userland projects
- PRs
- Tests

## Who's Frieda?

The dog. She disavows any responsibility for this project, and considers the time I've spent on it, when I could have been playing keep away with her and Mr. Sheep, to have been wasted.

<div style="display:flex; justify-content:center">
<img src="./docs/frieda.jpeg" alt="The dog Frieda with her toys" style="max-width:95vw"/>
</div>
