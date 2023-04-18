## Generating Typescript Code

Note: As of now, Frieda isn't smart enough to compile directly to javascript or consume jsdoc-style userland types. This may change.

To generate code, run...

```bash
frieda g
```

If you have not yet set up `.friedarc` you'll be prompted for `generatedCodeDirectory` and other necessary settings. Although Frieda will not delete anything in the generated code directory, it's a good idea to specify a dedicated folder, separate from your own code, as in `src/db/_frieda-generated-code` below:

```
src
├── db
│   ├── _frieda-generated-code
│   └── my-db.ts
└── index.ts
```

Once everything is set up, Frieda will analyze your database and produce the following files in `path/to/generated-code`:

- constants.server.ts. Exports the `schemaCasts` and `searchIndexes` constants
- database.server.ts. Exports the `ModelReposDb`, `TxDb` and `AppDb` classes.
- models.ts. Exports just the base model types, suitable for importing into browser-side code.
- shared.server.ts. Exports subsidiary model types and definition constants consumed by the `*Db` classes.

Frieda analyzes your database schema to generate a set of typescript models.

There is no separate "schema" file. Each table (excluding views) produces a set of types. Assuming your table is named `FooBar` or `foo_bar`, the following types are generated:

- `FooBar`: The complete model.
- `FooBarPrimaryKeys`
- `FooBarCreateData`
- `FooBarUpdateData`
- `FooBarFindUniqueParams`

Instead, Frieda uses "SQL comment annotations" to provide types in the small number of cases when a javascript type cannot be inferred from the database type.

- `@key` is used to type a `bigint` column as a secondary key (i.e. as `string`) when the relation cannot be inferred from the column name.
- `@boolean` is used to type a column that is not `tinyint(1)` as `boolean`. Conversely `@boolean(false)` applied to a `tinyint(1)` colum will type it as a `number`.
- `@enum(<EnumName>)` is used to associate an `enum` column with a typescript enum (or a javascript enum-like constant.) Otherwise `enum` types are derived from the SQL definition: `enum('a', 'b')` results in the javascript type `'a' | 'b'`.
- `@json(<JavascriptType>)` is used to associate a `json` column with a type.

as SQL and produce a useful set of javascript models and types, without resort to a separate source of truth, and without (as far as possible) the developer having to learn a bespoke data definition language.

Frieda analyzes your database schema and creates a set of models for each table. For now:

- A map of `<table name>.<column name>` to typescript type.
- A set of models corresponding

## Typing and Casting Fields

### `int/bigint` Keys

By default Frieda assumes that you will want to handle primary and secondary keys as `string` in Javascript, even if in the database schema they are some variation of `int`. Therefore, Frieda will type (and cast) anything she can reasonably infer is a key to `string`.

> ℹ️ Opt out of this behavior globally by setting `castKeysToString` to `false` in `.friedaRc`

Assuming you like this behavior, it can be automatic if you follow a consistent table and column naming convention.

**Primary keys** can always be distinguished since the `Key` in column info is `"PRI"`.

**Secondary keys.** Since Vitess does not have foreign key constraints, determining whether a column is a secondary key from the schema has to be based on the column name and type. A column will be considered a secondary key _automatically_ if...

- Its name matches the name of another table plus the name of that other table's primary key, and
- Its type matches the type of the other table's primary key, and
- It only matches one other table/primary key combination in this way. (Multiple matches are possible if table/column names do not follow a consistent naming convention.)

The name matching algorithm is kinda loose, in that it compares camel- and snake-case variations in a case-insenitive fashion. For example, both `Comment.blogPostId` and `comment.blog_post_id` will match each of `BlogPost.id`, `blog.post_id`, `Blog.postId`.

Note that Frieda makes no attempt to normalize pluralized table names. If you have a table `posts` with a primary key `id`, a column name would have to include the `s` (`comments.posts_id`) to be automatically considered a key.

**Annotations** If you want to mark a column as a secondary key without changing its name, use the `@key` annotation:

```sql
-- assuming the table post_id references is named posts
ALTER TABLE `comments`
  MODIFY COLUMN `post_id` bigint unsigned NOT NULL COMMENT '@key';
```

Conversely, if Frieda is wrongly typing / casting an integer column to `string`:

```sql
ALTER TABLE `comments`
  MODIFY COLUMN `post_id` bigint unsigned NOT NULL COMMENT '@key(false)';
```

### `boolean` Fields

By default Frieda assumes any field with the type `tinyint(1)` is meant to be typed and cast as a Javascript `boolean`. Note that `tinyint(1)` will be the schema type even if you created the table with `bool` or `boolean`.

You can opt out of this behavior gloabally by setting `castTinyIntOneToBoolean` to false in `.friedarc`.

To type a different flavor of `int` column as `boolean` without changing the type, use the `@boolean` annotation:

```sql
ALTER TABLE `Triangle`
  MODIFY COLUMN `isPointy` smallint NOT NULL DEFAULT 1 COMMENT '@boolean';
```

To disable this behavor on a particular `tinyInt(1)` column without changing the type set `@boolean(false)`:

```sql
ALTER TABLE `Triangle`
  MODIFY COLUMN `numSides` tinyInt(1) NOT NULL DEFAULT 3 COMMENT '@boolean(false)';
```

### `enum` Fields

Frieda will automatically type database `enum` columns as one-off typescript types. For example, this table...

```sql
CREATE TABLE `PlatformUser` (
  `userId` bigint unsigned NOT NULL,
  `permission` enum('ADMIN','VIEWER')  NOT NULL,
  PRIMARY KEY (`userId`)
);
```

...will result in this model type:

```ts
export type PlatformUser = {
  userId: string;
  permission: 'ADMIN' | 'VIEWER';
};
```

If you need to map the column to an actual typescript `enum` you can use the `@enum(<name>)` annotation, passing the enum's name...

```sql
CREATE TABLE `PlatformUser` (
  `userId` bigint unsigned NOT NULL,
  `permission` enum('ADMIN','VIEWER')  NOT NULL
    COMMENT '@enum(PlatformPermission)',
  PRIMARY KEY (`userId`)
);
```

...remembering to add the import to `jsonTypeImports` in `.friedarc`.

### `json` Fields

By default Frieda will type `json` columns as `unknown`. You can get around this by providing an explicit type using the `@json(<type>)` annotation, where `<type>` is either a one-off type or a symbol you've imported via `jsonTypeImports` in `.friedarc`. Examples:

```sql
CREATE TABLE `FabulousOffer` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `pricing` json  NOT NULL
    COMMENT '@json({price; number; discounts: {price: number; quantity: number}[]})',
  PRIMARY KEY (`id`)
);

-- or probably more manageably...
CREATE TABLE `FabulousOffer` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `pricing` json  NOT NULL
    COMMENT '@json(FabulousOfferPricing)',
  PRIMARY KEY (`id`)
);

-- an external type
CREATE TABLE `StripeCustomer` (
  `userId` bigint unsigned NOT NULL ,
  `customer` json  NOT NULL
    COMMENT '@json(Stripe.Customer)',
  PRIMARY KEY (`userId`)
);
```
