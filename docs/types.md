### Field Type Inference

Most MySQL column types have an obvious javascript counterpart, that is, where it is clear:

- how the javascript field corresponding to the column should be typed,
- how the value coming from the database should be cast, and
- how the javascript value being set to the database should be transformed.

The gray areas are:

#### Whether `bigint` columns should be `string` or `bigint` in javascript.

By default, Frieda types and casts `bigint` columns as `string`. In most cases the bulk of `bigint` columns are primary or secondary keys, and it's just easier to deal with strings in that context (JSON serialization, interoperability with other APIs.)

You can opt out of this behavior on a column by setting a column comment annotation:

```sql
ALTER TABLE `CatPerson`
  MODIFY COLUMN `numCats` bigint unsigned NOT NULL COMMENT '@bigint';
```

You can also opt out of the behavior globally. Set `typeBigIntAsString` to `false`...

```jsonc
//.friedarc
{
  // other settings
  "typeBigIntAsString": false
}
```

In this case all `bigint` columns will be typed as javascript `bigint`.

#### Deciding which database column type represents a javascript `boolean`.

Columns with the type `tinyint(1)` will be cast as javascript `boolean` by default. Note that the **M** in `tinyint[(M)]` has to be `1` for this to take effect. Also note the **M** is just the column "width". It has no bearing on the range of values the column can store.

```sql
-- let's say this was a smallint or tinyint(2), but we want it as a boolean...
ALTER TABLE `Triangle`
  MODIFY COLUMN `isPointy` tinyint(1) NOT NULL DEFAULT 1;

-- conversely, let's say this was tinyint(1), but we want it as an integer...
-- setting the type to tinyint(2) doesn't affect the range of values
ALTER TABLE `Triangle`
  MODIFY COLUMN `numSides` tinyint(2) NOT NULL DEFAULT 3;
```

You can opt out of this behavior by setting `typeTinyIntOneAsBoolean` to `false`...

```jsonc
//.friedarc
{
  // other settings
  "typeTinyIntOneAsBoolean": false
}
```

In this case all `tinyint` columns will be typed javascript `number`, withot regard to **M**.

#### Assigning `json` columns a useful javascript type.

By default `json` columns are typed as `any`. You can improve this by passing the `@json(MyType)` annotation:

```sql
-- with an inline type
ALTER TABLE `FabulousOffer` (
  MODIFY COLUMN `pricing` json  NOT NULL
    COMMENT '@json({price; number; discounts: {price: number; quantity: number}[]})',
  PRIMARY KEY (`id`)
);

-- with an imported type
ALTER TABLE `FabulousOffer` (
  MODIFY COLUMN `pricing` json  NOT NULL
    COMMENT '@json(FabulousPricing)',
  PRIMARY KEY (`id`)
);

```

In the latter case, add the import to `jsonTypeImports` in .friedarc...

```jsonc
{
  // ...other settings
  "jsonTypeImports": ["import type { FabulousPricing } from '../../api'"]
}
```

| MySQL Type                                                                                                  | Column Annotation         | Javascript Type                                                                              | Cast                                                                                                 | Transform                                                                                         |
| ----------------------------------------------------------------------------------------------------------- | ------------------------- | -------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `bigint`                                                                                                    | &mdash;                   | `string`                                                                                     | &mdash;                                                                                              | &mdash;                                                                                           |
| `bigint`<br><small><em>with annotation</em></small>                                                         | `COMMENT '@bigint'`       | `bigint`                                                                                     | `BigInt(value)`                                                                                      | &mdash;                                                                                           |
| `tinyint(1)`<br>`bool`, `boolean`                                                                           | &mdash;                   | `boolean`                                                                                    | `parseInt(value) !== 0`                                                                              | &mdash;                                                                                           |
| `tinyint[(M)]`<br/><small><em>where M != 1</em></small><br/>`smallint`<br/>`mediumint`<br/>`int`, `integer` | &mdash;                   | `number`                                                                                     | `parseInt(value)`                                                                                    | &mdash;                                                                                           |
| `double`, `real`<br/>`float`<br/>`decimal`, `numeric`                                                       | &mdash;                   | `number`                                                                                     | `parseFloat(value)`                                                                                  | &mdash;                                                                                           |
| `datetime`<br>`timestamp`<br>`date`                                                                         | &mdash;                   | `Date`                                                                                       | `new Date(value)`                                                                                    | &mdash;                                                                                           |
| `year`                                                                                                      | &mdash;                   | `number`                                                                                     | `parseInt(value)`                                                                                    | &mdash;                                                                                           |
| `time`                                                                                                      | &mdash;                   | `string`                                                                                     | &mdash;                                                                                              | &mdash;                                                                                           |
| `json`                                                                                                      | &mdash;`                  | `any`                                                                                        | `JSON.parse(value)`                                                                                  | if the value is not `null`, Frieda will `JSON.stringify` the value                                |
| `json`<br><small><em>with annotation</em></small>                                                           | `COMMENT '@json(MyType)'` | `MyType`                                                                                     | see above                                                                                            | see above                                                                                         |
| `enum('a','b')`                                                                                             | &mdash;                   | <code>'a'&#124;'b'</code>                                                                    | &mdash;                                                                                              | &mdash;                                                                                           |
| `set('a','b')`                                                                                              | &mdash;                   | <code style="overflow-x: scroll;white-space: nowrap;display:block;">Set<'a'&#124;'b'></code> | <code style="overflow-x: scroll;white-space: nowrap;display:block;">new Set(value.split(','))</code> | if the value is not `null`, Frieda will convert the `Set` to a string with comma-separated values |
| `char`<br/> `varchar`<br/> `binary` <br/> `varbinary` <br/> `blob` <br/> `text`                             | &mdash;                   | `string`                                                                                     | &mdash;                                                                                              | &mdash;                                                                                           |
