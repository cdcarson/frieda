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

- Defines a reasonable set of rules to map MySQL column types to javascript types.
- Given a database URL, introspects the schema, and generates:
  - Javascript model types for each table, including the base model type and types for creating and updating models.
  - Casting logic (e.g. `parseFloat` vs `parseInt` vs `JSON.parse`, etc.)
  - An `AppDb` class. This class provides CrUD methods (`db.user.create`, `db.account.update` and so on) and simple (single table) select methods (`db.user.findFirst`, etc.). `AppDb` also provides `select` and `execute` methods for running queries outside the context of a single table/model.
  - Some other useful helpers for constructing queries.


## Quick Start

```bash
npm i -D @nowzoo/frieda
```


## Type Logic

There is no schema file or separate data modeling language. The source of truth about the schema, is, well, the schema itself.

### Column/field type disambiguation

For the most part MySQL column types can be reasonably mapped directly to javascript types. The three salient exceptions are:

1. How javascript `boolean` fields are to be represented in the database.
1. How MySQL `bigint` columns should be typed in javascript.
1. Providing useful javascript types for MySQL `json` columns.

Frieda takes care of these cases as follows:

#### Javascript `boolean`s

- Any column with the exact type `tinyint(1)` is typed as javascript `boolean` and cast into javascript with `parseInt(value) !== 0`.
- All other flavors of `tinyint` (e.g. just `tinyint`) are typed as javascript `number` and cast as `parseInt(value)`.


#### MySQL `bigint` columns

MySQL `bigint` columns are typed by default as javascript `string`. You can override this behavior for a particular column
by adding the `@bigint` annotation to the column's `COMMENT`. Example:


```sql
ALTER TABLE `CatPerson`
  MODIFY COLUMN `numCats` bigint unsigned NOT NULL COMMENT '@bigint';
```

#### MySQL `json` columns

By default MySQL `json` columns are typed unhelpfully as `unknown`. You can overcome this by providing a type using the `@bigint` annotation to the column's `COMMENT`. Examples:

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











