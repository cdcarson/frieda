# Frieda

Javascript code generator for the PlanetScale serverless driver.

> This library is a work in progress. Bug reports, suggestions and PRs are entirely welcome.

- [Why?](#why)
- [Quick Start](#quick-start)
- [Options](#options)
- [Project Structure](#project-structure)

## Why?

Frieda aims to create solid database code for typescript/javascript projects using the [PlanetScale serverless driver](https://github.com/planetscale/database-js):

- Typed javascript models based on a database's tables and views.
- Typed methods to take care of the boring stuff: `SELECT` and CrUD.
- Accurate typing for more interesting stuff written in vanilla SQL.

Other key features:

- No bespoke data definition language. There's just a plain typescript file containing model types. Initially this file is populated using a set of reasonable conventions mapping MySQL column types to javascript field types. Need to change how a field is typed and cast? Just edit its javascript type.
- No other unnecessary features. Frieda is not an ORM or a query builder. Models have no notion of their relations. Beyond simple `SELECT` and CrUD, Frieda does not write SQL for you. It does not create migrations. It does not let you switch to MongoDb. Net, Frieda assumes...
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

These options are saved to `.friedarc.json`. You don't have to go through the prompts every time. Frieda then fetches the schema and generates code.

### Basic Usage

Create a `get-db.js` (or `.ts`) file next to the `generated` folder in the path you specified. (It doesn't have to be here, just keeping things simple.)
```
└── src
    └──lib (aliased as $lib in the example below)
       └── db  (assuming src/lib/db is the path you specified)
           ├── generated (created by Frieda, contains generated code files)
           ├── get-db.js (your new file)
           └── schema.d.ts (created by Frieda, contains editable model types)
```

Paste this in:
```js
// get-db.js
// Example quick start code. Exports a function that returns a singleton AppDb instance.

import { connect } from '@planetscale/database';

// Get the database URL variable (or the host, username, password variables.)
// This is how you'd do it in SvelteKit...
import { DATABASE_URL } from '$env/static/private';

// Import the generated AppDb class...
import { AppDb } from './generated/app-db';

/** @type {AppDb|undefined} */
let _appDb = undefined;

/** @returns {AppDb} */
export const getDb = () => {
  if (!_appDb) {
    _appDb = new AppDb(connect({ url: DATABASE_URL }));
  }
  return _appDb;
};
```

This exports a `getDb` functions that returns a singleton instance of the generated `AppDb` class<Link TKTK>. `AppDb` exposes:

- A `ViewDb` <Link TKTK> instance for each model based on a database _view_. This has `find*` and `count*` methods.
- A `CrudDb` <Link TKTK> instance for each model based on a database _table_. In adition to `find*` and `count*` this has `create*`, `update*` and `delete*` methods.
- Methods to perform arbitrary queries (not based directly on a model.)

Use `AppDb`:

```js
// a SvelteKit example +page.server.js file
// src/routes/cats/[catId]/+page.server.js
import { error } from '@svelte/kit';
import { getDb } from '$lib/db/get-db.js'

export const load = async (event) => {
  const db = getDb();
  const id = event.params.catId
  const cat = await db.cat.find({where: {id}});
  if (! cat) {
    throw error(404, `Cat ID ${id} not found!`)
  }
  // note `cat` is typed as `CatSelectAll` from '$lib/db/generated/models.js'
  return { cat }
}
```




### Generated Code

```
└── src
     └──db  (assuming src/db is the path you specified)
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

#### `schema-definition.d.ts`
This file contains a model type for each table and view. 
- The field types are **initially** based on default conventions mapping MySQL column types to javascript types. But it's expected that you will edit the field types to suit your application. The field types in this file are the source of truth; the default conventions are only used when you add a table or column
- A `generated` folder with the code you will use in your application.


`frieda` should be re-run each time:
- The database schema is modified.
- `schema-definition.d.ts` is modified.







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
- `schema-definition.d.ts` and the generated code should be considered part of your source code, that is, added to git and included in your javascript/typescript build step. (Unlike with, say, Prisma, there is no separate build step on deploy.)
- You can override the value in `.friedarc.json` by doing `frieda --output-directory <some-other-path>`.

### CLI-only Options

- `--init` Make changes to the two options above. (You can also edit `.friedarc.json` directly.)
- `--help` Show help.

## Project Structure

Assuming you've run `frieda` with `outputDirectory` set to `src/lib/db` your project will have these files and directories added:

```
.
├── .frieda-metadata
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

### `.frieda-metadata`

The `.frieda-metadata` directory contains convenient information about the schema. Frieda only updates the contents; it does not rely on them. You can safely add it to `.gitignore`, and probably should, since a version folder gets added to `.frieda-metadata/history` every time `frieda` runs. Contents:

- `schema.json`: The schema as (1) fetched and (2) parsed. Useful for debugging and filing issues.
- `schema.sql`: The current `CREATE TABLE` / `CREATE VIEW` statements
- `history`: A directory where past versions are saved. Each version has a folder containing:
  - The previous versions of `schema.json` and `schema.sql`
  - The previous version of `<outputDirectory>/schema-definition.d.ts`

### `.friedarc.json`

Contains the two main [options](#options). It should be added to git.

### `schema-definition.d.ts`

The `<outputDirectory>/schema-definition.d.ts` file is (initially) populated from the database schema, using some reasonable assumptions mapping MySQL column types to javascript field types. Edit this file as needed to override those assumptions, or narrow the type. Examples:

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

With some exceptions MySQL column types can be mapped unambiguously and usefully to javascript types. The exceptions (according to Frieda) are:

1. How to type `bigint` columns in javascript.
1. How to represent javascipt `boolean`s in the database.
1. Specifying the javascript type of `json` columns.
1. Whether to type `set` columns as javascript `Set`
1. Column types where there's no equivalent in plain javascript, like the [geospatial types](https://dev.mysql.com/doc/refman/8.0/en/spatial-type-overview.html).

Frieda (initially) uses the following assumptions to map MySQL to javascript types. These assumptions can be overridden in `schema-definition.d.ts`. Except for the arcane column types case (5) all the exceptions can be easily overcome in this way.

#### Default Field Type Assumptions

| MySql Type                                                                                                       | Default Javascript Type                                                         |
| ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `bigint`                                                                                                         | `string` ([reasoning](#why-are-bigint-columns-typed-as-string))                 |
| `tinyint(1)`, `boolean`, `bool`                                                                                  | `boolean`                                                                       |
| `tinyint` (except `tinyint(1)`,) `int`, `integer`, `smallint`, `mediumint`, `year`                               | `number`                                                                        |
| `float`, `double`, `real`, `decimal`, `numeric`                                                                  | `number`                                                                        |
| `date`, `datetime`, `timestamp`                                                                                  | `Date`                                                                          |
| `set('a','b')`                                                                                                   | <code>Set<'a'&#124;'b'></code> ([reasoning](#why-are-set-columns-typed-as-set)) |
| `enum('a','b')`                                                                                                  | <code>'a'&#124;'b'</code>                                                       |
| `json`                                                                                                           | `unknown` ([reasoning](#why-are-json-columns-typed-as-unknown))                 |
| `char`, `varchar`,                                                                                               | `string`                                                                        |
| `binary`, `varbinary`                                                                                            | `string`                                                                        |
| `text`, `tinytext`, `mediumtext`, `longtext`                                                                     | `string`                                                                        |
| `blob`, `tinyblob`, `mediumblob`, `longblob`                                                                     | `string`                                                                        |
| `bit`                                                                                                            | `string`                                                                        |
| `time`                                                                                                           | `string`                                                                        |
| Everything else, e.g. the [geospatial types](https://dev.mysql.com/doc/refman/8.0/en/spatial-type-overview.html) | `string`                                                                        |

##### Some explanations

###### Why are `bigint` columns typed as `string`?

- A common (the most common?) case for `bigint` columns is auto-incrementing primary keys, where it does not make (much) sense to manipulate the values in javascript or compare them other than on equality. If doing those things to keys are necessary, it's easy to convert the values with`BigInt(id)`.
- A stronger argument is that many folks use `JSON` to put data on the wire. Typing columns as `bigint` by default would force them to convert the values to string first.
- That said, there are definitely cases where you want a `bigint` column to be numeric in javascript, either as `bigint` or `number`. In that case provide `bigint` or `number` as the type of the field in `schema-definition.d.ts`. ([recipe](#typing-bigint-fields))

###### Why are `set` columns typed as `Set`?

- It seems like the right thing to do. On the javascript side a `Set` seems more readily manipulable than a string with comma-separated values. But TBH this is pie in the sky. Feedback from folks who actually use `set` columns rather than just theorize about them is welcome.
- For now, you can turn this off for an individual field by typing it as `string` in `schema-definition.d.ts`.

###### Why are `json` columns typed as `unknown`?

- There's no other valid typescript type for this case. For example things like `{}` or `any|any[]` would throw typescript linting errors in addition to (probably) being factually incorrect.
- It's easy to [specify a useful type](#typing-json-fields) in `schema-definition.d.ts`.

#### Field Type Recipes

How to modify javascript field types in `schema-definition.d.ts`.

##### Typing `bigint` fields

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

It's worth having a word here about casting from numerical database types. There are two determining factors. First, the javascript type assigned to a field in `schema-definition.d.ts`. Second, whether or not the underlying MySQL type is float-y (in the limited javascript sense that "float-y" values should be sent to `parseFloat` rather than `parseInt`)

- If the javascript type is `boolean` the value is always cast with `parseInt(value) !== 0`.
- If the javascript type is `bigint` the value is always cast with `BigInt(value)`.
- If the javascript type is `number`:
  - If the MySQL column type is float-y, the value is cast with `parseFloat(value)`.
  - Otherwise the value is cast with `parseInt(value)`.

##### Typing `json` fields

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

Notes:

- **Important:** Don't use top level import declaration(s) in `schema-definition.d.ts`. Such imports cannot be preserved. Instead, use the inline `import('foo').Bar` syntax shown above.
- Any import paths referencing project files should be relative to `schema-definition.d.ts`. Frieda adjusts those imports accordingly. For example `'../api.js'` in `schema-definition.d.ts` becomes `'../../api.js'` in the generated code, relying on the fact that the generated code files reside one level down from `schema-definition.d.ts`.
- Using type aliases defined in the project, e.g., `import('$lib/api.js').CatPreferences`, should be fine, however.

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

### Casting and Serialization

The PlanetScale serverless driver returns all database column values as javascript `string|null`. _Casting_ means turning that raw `string|null` value into a field value whose javascript type matches what you expect.

_Serialization_ means turning a javascript value into a something that can be passed into a MySQL query. Most javascript types work out of the box, but there are two exceptions.

`null` field values coming from the database are always returned as javascript `null`. Likewise, `null` values passed into queries are always turned into MySQL `NULL`. Excluding that special universal case, there are eight other cases:

| Cast Type   | Casting Algorithm                  | Serialization Algorithm                       |
| ----------- | ---------------------------------- | --------------------------------------------- |
| `'bigint'`  | `(val) => BigInt(val)`             | n/a                                           |
| `'int'`     | `(val) => parseInt(val)`           | n/a                                           |
| `'float'`   | `(val) => parseFloat(val)`         | n/a                                           |
| `'boolean'` | `(val) => parseInt(val) !== 0`     | n/a                                           |
| `'json'`    | `(val) => JSON.parse(val)`         | `(val) => JSON.stringify(val)`                |
| `'date'`    | `(val) => new Date(val)`           | n/a                                           |
| `'set'`     | `(val) => new Set(val.split(','))` | `(val) => Array.from(val.values()).join(',')` |
| `'string'`  | n/a                                | n/a                                           |

## API

### type `CustomModelCast`
