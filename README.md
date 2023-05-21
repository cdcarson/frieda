# Frieda

Typescript / javascript code generator for the PlanetScale serverless driver.

## Motivation

Frieda's goal is to provide a dead-simple developer experience for javascript and typescript projects using PlanetScale. The focus is on generating useful, solid application code, not on managing migrations or abstracting away SQL. Frieda is not an ORM or a query builder. Those types of tools seem great, but they tend to try to be all things to all people, sacrificing simplicity in exchange for certain (ahem) benefits.

Frieda may be for you if:

- You're using PlanetScale and the serverless driver.
- Your project is in typescript or javascript.
- You don't need schema / migration management beyond that provided by PlanetScale.
- You're cool with writing some queries by hand.

## What Frieda does

- Defines a reasonable set of rules to map MySQL column types to javascript types. In the limited set of cases where a useful javascript type cannot be directly inferred from the MySQL type, or where it may be convenient for the javascript type to be narrowed, Frieda defines **type annotations**, which can be added to the column `COMMENT`.
- Given a database URL, introspects the schema, and generates some code:
  - Javascript types for each table based on the reasonable rules, including the base model type and types for selecting, creating and updating models.
  - Casting logic (e.g. `parseFloat` vs `parseInt` vs `JSON.parse`, etc.)
  - An `AppDb` class. This class provides CrUD methods (`db.user.create`, `db.account.update` and so on) and simple (single table) select methods (`db.user.findFirst`, etc.). `AppDb` also provides `select` and `execute` methods for running queries outside the context of a single table/model.
  - Some other useful helpers for constructing queries.

## Quick Start

```bash
npm i -D @nowzoo/frieda
```

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

#### `boolean`

- Any column with the exact type `tinyint(1)` is typed as javascript `boolean` and cast into javascript with `parseInt(value) !== 0`.
- All other flavors of `tinyint` (e.g. just `tinyint`) are typed as javascript `number` and cast as `parseInt(value)`.

Note that swapping the column type from `tinyint(1)` to `tinyint` or vice versa has no effect on the range of values the column can represent.

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

#### `set`

MySQL set columns are typed as javascript `string`. Adding the `@set` annotation to a column will change the javascript type to `Set`:

```sql
-- typed as Set<'lg'|'xl'|'xxl'>, using the set definition
ALTER TABLE `TeeShirt`
  MODIFY COLUMN `size` set('lg', 'xl', 'xxl')  NOT NULL
    COMMENT '@Set';

-- typed as Set<MyTeeShirtSize>
ALTER TABLE `TeeShirt`
  MODIFY COLUMN `size` set('lg', 'xl', 'xxl')  NOT NULL
    COMMENT '@Set(MyTeeShirtSize)';
-- add "import type { MyTeeShirtSize } from '../wherever/api'" to typeImports in .friedarc.json
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
