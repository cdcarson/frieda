# Frieda

Javascript code generator for the PlanetScale serverless driver.

> This library is a work in progress. Bug reports, suggestions and PRs are entirely welcome.

- [Why?](#why)
- [Quick Start](#quick-start)
  - [Example: Using the generated `ApplicationDatabase` class](#example-using-the-generated-applicationdatabase-class)
  - [Example: Modifying a field type](#example-modifying-a-field-type)
- [Project Structure](#project-structure)
  - [Metadata and option files](#metadata-and-option-files)
  - [`outputDirectory` files (generated code)](#outputdirectory-files-generated-code)
- [Field Types](#field-types)
  - [Field Type Conventions](#field-type-conventions)
  - [Modify field types in `frieda-models.ts`](#modify-field-types-in-model-typesdts)
    - [Recipe: Typing `json` fields](#recipe-typing-json-fields)
    - [Recipe: Typing `bigint` aggregate fields](#recipe-typing-bigint-aggregate-fields)
- [Model Types](#model-types)
- [Field Casting](#casting)
- [Options](#options)

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

Frieda will ask for a couple of [options](#options):

- Where to find your database URL.
- Where you want the generated code to go.

These options are saved to `.friedarc.json`, so you don't have to go through the prompts every time.

Frieda then fetches the schema and generates code.

### Example: Using the generated `ApplicationDatabase` class

Create a `get-db.js` (or `.ts`) file next to the `generated` folder in the path you specified. (It doesn't have to be here, just keeping things simple.)

```
src/lib/db <-- outputDirectory
├── generated <-- folder generated by frieda
├── get-db.js <-- your code
└── frieda-models.ts <-- file generated by frieda
```

Paste this in:

```js
// get-db.js
// Example quick start code. Exports a function that returns a singleton ApplicationDatabase instance.

import { connect } from '@planetscale/database';

// Get the database URL variable (or the host, username, password variables.)
// This is how you'd do it in SvelteKit...
import { DATABASE_URL } from '$env/static/private';

// Import the generated ApplicationDatabase class...
import { ApplicationDatabase } from './frieda';

/** @type {ApplicationDatabase|undefined} */
let _appDb = undefined;

/** @returns {ApplicationDatabase} */
export const getDb = () => {
  if (!_appDb) {
    _appDb = new ApplicationDatabase(connect({ url: DATABASE_URL }));
  }
  return _appDb;
};
```

This file exports a `getDb` functions that returns a singleton instance of the generated [`ApplicationDatabase`](#class-applicationdatabase-generated) class. `ApplicationDatabase` exposes:

- A [`ViewDatabase`](#class-viewdatabase) instance for each model based on a database _view_. This has `find*` and `count*` methods.
- A [`TableDatabase`](#class-tabledatabase) instance for each model based on a database _table_. In addition to `find*` and `count*` this has `create*`, `update*` and `delete*` methods.
- Methods to perform arbitrary queries (not based directly on a model.)

Import `getDb` and use the `ApplicationDatabase` instance:

```js
// a SvelteKit example +page.server.js file
// src/routes/cats/[catId]/+page.server.js
import { error } from '@sveltejs/kit';
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
src/lib/db <-- outputDirectory
├── generated <-- folder generated by frieda
└── frieda-models.ts <-- file generated by frieda, edited by you
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
// frieda.ts
export type Cat = {
  id: string;
  ownerId: string;
  name: string;
  fleaCount: string;
};
// ...other Cat* types
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

You won't see any changes to `frieda-models.ts` (your changes to this file are always preserved as long as the model and field are not dropped in the database,) but the **generated** `Cat` model types in `frieda.ts` will reflect the change:

```diff
// frieda.ts
export type Cat = {
  id: string;
  ownerId: string;
  name: string;
-  fleaCount: string;
+  fleaCount: bigint;
};
// ditto for the other generated Cat model types, `CatCreate`, `CatUpdate`, etc.
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
    └── ...other source code
```

### Metadata and option files

- The `.frieda-metadata` directory contains information about the current schema and previous versions, for reference and debugging purposes. Frieda only writes to this folder &mdash; it does not rely on the contents. The `.frieda-metadata/history` folder is .gitignore'd by default since it a new version is created every time you run `frieda`. (Edit `.frieda-metadata/.gitignore` to change this behavior.)
- `.friedarc.json` saves your current [options](#options).

### `outputDirectory` files (generated code)

Frieda creates one file, `frieda-models.ts`, and one folder, `generated`, in the [`outputDirectory`](#outputdirectory). Assuming `outputDirectory` is `src/lib/db`:

```
src/lib/db <-- outputDirectory
├── generated
│   ├── database-classes
│   │   ├── application-database.js
│   │   ├── models-database.js
│   │   └── transaction-database.js
│   ├── index.js
│   ├── models.d.ts
│   ├── schema
│   │   ├── schema-cast-map.js
│   │   └── schema-definition.js
│   └── search
│       └── full-text-search-indexes.js
└── frieda-models.ts
```

General notes:

- You can co-locate other files and folders in the `outputDirectory` as long as they don't conflict with the `frieda-models.ts` or `generated` paths.
- But don't put your own code in the `generated` folder. Its contents are deleted each time `frieda` runs.
- The contents of `outputDirectory` should be considered part of your source code. That is add it to git and include it in your javascript/typescript build step.

Files:

- `generated` contains the generated application code.
  - `database-classes`
    - `application-database.js` exports the generated [`ApplicationDatabase`](#class-applicationdatabase-generated) class.
    - `models-database.js` exports the generated [`ModelsDatabase`](#class-modelsdatabase-generated) class.
    - `transaction-database.js` exports the generated [`ModelsDatabase`](#class-transactiondatabase-generated) class.
  - `schema`
    - `schema-cast-map.js` exports a map constant associating each field with a [`CastType`](#type-casttype)
    - `schema-definition.js` exports the calculated [`SchemaDefinition`](#type-schemadefinition)
  - `search`
    - `full-text-search-indexes.js` exports all the full text search indexes for use with the [`getSearchSql`](#utility-function-getsearchsql) utility.
  - `index.js` exports everything in the `generated` folder
  - `models.d.ts` The "actual" model types calculated from `frieda-models.ts`. Each "virtual" model type produces [several "actual" model types](#model-types).
- `frieda-models.ts` This is where you edit the javascript field types of your models. [More...](#modify-field-types-in-model-typesdts)

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

### Modify field types in `frieda-models.ts`

The `frieda-models.ts` file contains a "virtual" model type for each table and view in the database. It's the primary source of truth for Frieda to generate the "real" model types found in `frieda.ts`.

Edit this file to change the javascript type of model fields. Although the file is regenerated each time you run `freida`, a change you make here is preserved &mdash; so long as the column or its table has not been dropped from the schema.

The model types in `frieda-models.ts` are not (and cannot be) exported. This prevents your code from importing the "virtual" types by accident. The types in this file only exist to be analyzed by Frieda.

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

Given a database table or view and its corresponding "virtual" model type in `frieda-models.ts`, Frieda generates the

- [base model type](#base-model-type)

_For tables only_, several other types are generated:

- [select all type](#select-all-type)
- [primary key type](#primary-key-type)
- [create type](#create-type)
- [update type](#update-type)
- [find unique type](#find-unique-type)

> Generated model types are intentionally repetitive / verbose. They could be cleverer, but "clever" typescript in this case leads to a less straightforward developer experience.

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

### Base Model Type

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

## Casting

The serverless driver returns all database column values as javascript `string|null`. _Casting_ means turning that raw `string|null` value into a field value whose javascript type matches what you expect.

A column value is `null` is always returned as `null`. Excluding that case, there are eight cast types:

| Cast Type   | Casting Algorithm                  |
| ----------- | ---------------------------------- |
| `'bigint'`  | `(val) => BigInt(val)`             |
| `'int'`     | `(val) => parseInt(val)`           |
| `'float'`   | `(val) => parseFloat(val)`         |
| `'boolean'` | `(val) => parseInt(val) !== 0`     |
| `'json'`    | `(val) => JSON.parse(val)`         |
| `'date'`    | `(val) => new Date(val)`           |
| `'set'`     | `(val) => new Set(val.split(','))` |
| `'string'`  | n/a                                |

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

- `frieda-models.ts` A file you can edit to modify the javascript types.
- `generated` A folder containing the generated code.

Notes:

- You can keep other files and folders in the `outputDirectory` as long as they do not conflict with the paths mentioned above. But do not put your own code in the `generated` folder, since Frieda nukes its contents before regenerating code.
- `frieda-models.ts` and the generated code should be considered part of your source code, that is, added to git and included in your javascript/typescript build step. (Unlike with, say, Prisma, there is no separate build step on deploy.)
- You can override the value in `.friedarc.json` by doing `frieda --output-directory <some-other-path>`.

### CLI-only Options

- `--init` Make changes to the two options above. (You can also edit `.friedarc.json` directly.)
- `--help` Show help.

## API

### type `CastType`

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

# OLD STUFF

## How?

The primary problem Frieda solves is how to map MySQL column types to javascript types. Most MySQL column types can be mapped unambiguously to javascript types. The exceptions to this rule (according to Frieda) are:

1. How to type `bigint` columns in javascript.
1. How to represent javascript `boolean`s in the database.
1. Specifying the javascript type of `json` columns.
1. Whether to type `set` columns as javascript `Set`
1. Column types where there's no equivalent in plain javascript, like the [geospatial types](https://dev.mysql.com/doc/refman/8.0/en/spatial-type-overview.html).

Frieda (initially, partially) solves this ambiguity with the following conventions:

1. `bigint` columns are typed as javascript `string`
1. `tinyint(1)` columns are typed as `boolean`; all other `tinyint` columns are typed as `number`
1. `json` columns are typed as `unknown`
1. `set('a','b')` is typed as `Set<'a'|'b'>`
1. un

### `.frieda-metadata`

The `.frieda-metadata` directory contains convenient information about the schema. Frieda only updates the contents; it does not rely on them. You can safely add it to `.gitignore`, and probably should, since a version folder gets added to `.frieda-metadata/history` every time `frieda` runs. Contents:

- `schema.json`: The schema as (1) fetched and (2) parsed. Useful for debugging and filing issues.
- `schema.sql`: The current `CREATE TABLE` / `CREATE VIEW` statements
- `history`: A directory where past versions are saved. Each version has a folder containing:
  - The previous versions of `schema.json` and `schema.sql`
  - The previous version of `<outputDirectory>/frieda-models.ts`

### `.friedarc.json`

Contains the two main [options](#options). It should be added to git.

### `frieda-models.ts`

The `<outputDirectory>/frieda-models.ts` file is (initially) populated from the database schema, using some reasonable assumptions mapping MySQL column types to javascript field types. Edit this file as needed to override those assumptions, or narrow the type. Examples:

- Type a `bigint` column as javascript `bigint` or `number` rather than the default of `string`.
- Assign a `json` column a type imported from your project or a library.
- See [Field Types](#field-types) for more examples.

## Javascript Types

### Naming Conventions

- Model types are named with the PascalCase'd table name, e.g. `UserAccount`, `UserAccountCreate`, etc. for a table named with some variation of `user_account` or `UserAccount`.
- Field names are the camelCase'd column name, e.g. `emailVerified` for `email_verified`.

You can use whatever naming convention you want for tables and columns, but there are a couple of edge cases:

- Frieda does not try to fix the case where two tables or two columns within the same table resolve to the same model or field name. For example, tables named `user_account`, `user__account` and `UserAccount` would all result in `UserAccount`. Net: Be consistent when naming tables and columns.
- If a table or column name would result in an invalid javascript identifier Frieda prepends an underscore. For example, `2023_stats` is a valid MySQL name but an invalid javascript identifier. It would be turned into `_2023Stats`. Net: Try not to do this.

### Field Types

With some exceptions MySQL column types can be mapped unambiguously and usefully to javascript types. The exceptions (according to Frieda) are:

1. How to type `bigint` columns in javascript.
1. How to represent javascript `boolean`s in the database.
1. Specifying the javascript type of `json` columns.
1. Whether to type `set` columns as javascript `Set`
1. Column types where there's no equivalent in plain javascript, like the [geospatial types](https://dev.mysql.com/doc/refman/8.0/en/spatial-type-overview.html).

Frieda (initially) uses the following assumptions to map MySQL to javascript types. These assumptions can be overridden in `frieda-models.ts`. Except for the arcane column types case (5) all the exceptions can be easily overcome in this way.

#### Field Type Recipes

How to modify javascript field types in `frieda-models.ts`.

It's worth having a word here about casting from numerical database types. There are two determining factors. First, the javascript type assigned to a field in `frieda-models.ts`. Second, whether or not the underlying MySQL type is float-y (in the limited javascript sense that "float-y" values should be sent to `parseFloat` rather than `parseInt`)

- If the javascript type is `boolean` the value is always cast with `parseInt(value) !== 0`.
- If the javascript type is `bigint` the value is always cast with `BigInt(value)`.
- If the javascript type is `number`:
  - If the MySQL column type is float-y, the value is cast with `parseFloat(value)`.
  - Otherwise the value is cast with `parseInt(value)`.

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
