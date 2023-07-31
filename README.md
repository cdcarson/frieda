# Frieda

Javascript code generator for the PlanetScale serverless driver.

## Caveats / Welcome

This library is a work in progress. So far it's been developed against a single project and a single database schema. It seems to work fine, but use with caution. Bugs may occur. There are limitations.

Bug reports, suggestions and PRs are entirely welcome.

## Motivation

Frieda aims to provide a dead-simple developer experience for javascript and typescript projects using the PlanetScale serverless driver.

### Goals

- Create solid, documented javascript code based on a database schema.
- Provide well-typed `CrUD` and `SELECT` methods for the boring things.
- Allow writing more interesting things in vanilla MySQL, with type-safety.
- Eliminate `xyz.schema` files, and minimize data definition. The single source of truth is the database schema itself. Javascript types are mostly inferred from the schema using a set of reasonable conventions. There are a small number of ["type annotations"](#field-types) to deal with cases where a convention might need to be overridden or a javascript type narrowed. These annotations are stored in database column comments.

### Non-goals

Frieda is not meant to be an ORM or a query builder. It doesn't understand or manage relations between tables. Beyond certain basic `CrUD` and `SELECT` queries, it does not attempt to write SQL for you. Frieda does not manage the schema or track migrations. If you need these things, try Prisma (to manage the schema) and Kysely (to help write queries.)

### So, Frieda may be for you if...

- You're cool with writing at least some SQL by hand.
- You're using PlanetScale and the serverless driver.
- Your project is in typescript or javascript.
- You don't need schema / migration management beyond that provided by PlanetScale.

## Quick Start

```bash
npm i @nowzoo/frieda
```

This will:

- Ask you a few questions:
  - Where to find the environment variable containing the `DATABASE_URL` of the schema.
  - The relative path to a directory in your project to contain the files generated by Frieda.
  - Whether to compile the code to javascript or leave it in typescript.
  - Whether to save the above settings to `.friedarc.json`
- Query the schema at `DATABASE_URL`.
- Generate and save the

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
1. Column types where there's no equivalent in plain javascript, like the [geospatial types](https://dev.mysql.com/doc/refman/8.0/en/spatial-type-overview.html).

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


MySQL set columns are typed as javascript `string`. Adding the `@set` annotation to a column will change the javascript type to `Set`:

```sql
-- typed as Set<'lg'|'xl'|'xxl'>, using the set definition
ALTER TABLE `Catapult`
  MODIFY COLUMN `size` set('lg', 'xl', 'xxl')  NOT NULL
    COMMENT '@Set';

```


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


## Known Limitations

### Models are not created for views

MySQL does not allow comments on view columns. So adding _accurately_ typed views would necessitate introducing a schema file, that is, a separate source of truth from the database schema. The separate source of truth thing is a can of worms which Frieda does not want open.

This does not mean you can't have views in your schema. It just means that you have to write the type yourself, and provide appropriate casting when you query the view.

# FROM BEFORE

## Javascript types

There is no schema file or separate data modeling language, per se. The source of truth about the schema, is, well, the schema itself. In the few cases where a javascript type cannot be sufficiently inferred from the column type, Frieda uses "type annotations" in column `COMMENT`s.

### Field types

Most MySQL column types can be reasonably mapped directly to javascript field types. The exceptions Frieda handles are:

1. How javascript `boolean` fields are to be represented in the database.
1. How MySQL `bigint` columns should be typed in javascript.
1. Providing useful javascript types for MySQL `json` columns.
1. Typing a MySQL `set` column as a `Set<T>` rather than `string`.
1. Mapping an `enum` column to a typescript `enum` or javascript type.

Frieda takes care of these cases as follows:



#### `bigint`

MySQL `bigint` columns are typed by default as javascript `string`. You can override this behavior for a particular column
by adding the `@bigint` annotation to the column's `COMMENT`. Example:

```sql
-- will be typed and cast to javascript bigint
ALTER TABLE `CatPerson`
  MODIFY COLUMN `numCats` bigint unsigned NOT NULL COMMENT '@bigint';
```

#### `json`

By default MySQL `json` columns are typed as `unknown`. You can overcome this by providing a type using the `@bigint` annotation to the column's `COMMENT`. Examples:

```sql
-- with an inline type as valid typescript
ALTER TABLE `FabulousOffer`
  MODIFY COLUMN `pricing` json  NOT NULL
    COMMENT '@json({price; number; discounts: {price: number; quantity: number}[]}';

-- with an imported type
ALTER TABLE `FabulousOffer`
  MODIFY COLUMN `pricing` json  NOT NULL
    COMMENT '@json(FabulousPricing)';
-- add "import type { FabulousPricing } from '../wherever/api'" to typeImports in .friedarc.json
```



#### `enum`

By default `enum` columns are typed using the MySQL column definition.

```sql
-- typed as 'lg'|'xl'|'xxl'
ALTER TABLE `TeeShirt`
  MODIFY COLUMN `size` enum('lg', 'xl', 'xxl')  NOT NULL;
```

If necessary, you can add an `@enum(MyType)` annotation to specify the type:

```sql
-- typed as MyTeeShirtSize
ALTER TABLE `TeeShirt`
  MODIFY COLUMN `size` enum('lg', 'xl', 'xxl')  NOT NULL
  COMMENT '@enum(MyTeeShirtSize)'
-- add "import type { MyTeeShirtSizes } from '../wherever/api'" to typeImports in .friedarc.json
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

### Model types

For each table in the database, Frieda generates several model types:

#### Base model type

The base representation of a row in the table.

- If the underlying column is nullable, the field's javascript type is followed by `|null`.
- If the underlying column is `INVISIBLE` is marked as optional, since it will be `undefined` when using `SELECT *` to retrieve the model. See the [SELECT ALL type](#select-all-type) below.

Example:

```SQL
CREATE TABLE `BlogPost` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `category` varchar(200) DEFAULT NULL,
  `content` text NOT NULL /*!80023 INVISIBLE */,
  `slug` varchar(100) NOT NULL,
  `title` varchar(100) NOT NULL,
  PRIMARY KEY (`id`)
)
```

```ts
export type BlogPost = {
  id: string;
  category: string | null; // column is nullable
  content?: string; // optional: column is INVISIBLE
  slug: string;
  title: string;
};
```

#### SELECT ALL type

This type omits fields from the model where the corresponding column has been marked `INVISIBLE`. It is what will be returned if you use `SELECT *` to get the model, rather than passing a column list or `'all'` to the `find` methods.

Example:

```SQL
CREATE TABLE `BlogPost` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `category` varchar(200) DEFAULT NULL,
  `content` text NOT NULL /*!80023 INVISIBLE */,
  `slug` varchar(100) NOT NULL,
  `title` varchar(100) NOT NULL,
  PRIMARY KEY (`id`)
)
```

```ts
// content column is INVISIBLE, so omitted
export type BlogPostSelectAll = {
  id: string;
  category: string | null;
  slug: string;
  title: string;
};
```

#### Primary key type

This type is used to select, update and delete models with `findUnique`, `update` and `delete` methods, and is what is returned by the `create` method.

Example:

```SQL
CREATE TABLE `BlogPost` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  -- etc...
  PRIMARY KEY (`id`)
)
```

```ts
export type BlogPostPrimaryKey = { id: string };
```

With multiple primary keys:

```SQL
 CREATE TABLE `AccountUser` (
  `accountId` bigint unsigned NOT NULL,
  `userId` bigint unsigned NOT NULL,
  -- etc...
  PRIMARY KEY (`userId`,`publicationId`)
)
```

```ts
export type AccountUserPrimaryKey = {
  accountId: string;
  userId: string;
};
```

#### Create Data Type

The type of data that you pass to create a model.

- If a column is `auto_increment` or has a default value, the field is optional.
- `GENERATED` fields are omitted.

Example:

```SQL

```

#### Update Data Type

The type of data that you pass to update a model.

- Primary keys are omitted.
- `GENERATED` fields are omitted.

Example:

```SQL

```

#### Find Unique Type

A union of the primary key type plus any other fields that are unique in the model.

Example:

```SQL
CREATE TABLE `UserAccount` (
  `userId` bigint unsigned NOT NULL,
  `email` varchar(320) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `password` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`userId`),
  UNIQUE KEY `UserAccount_email_key` (`email`),
  KEY `UserAccount_userId_idx` (`userId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci

```

Generated model type:

```ts
export type UserAccountFindUnique = UserAccountPrimaryKey | { email: string };
```

### Casting

The serverless driver returns column values as `string|null`. Frieda defines a limited set of casting rules to
