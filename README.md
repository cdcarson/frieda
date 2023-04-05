# Frieda
Database schema things designed for the PlanetScale Serverless Driver.

- A simple migration manager that tries to play well with PlanetScale branches and deploy requests.
- Javascript models derived from the database schema (i.e. without a full-on bespoke schema language.)
- A `FreidaDb` class that provides, among other things, simple, typesafe CrUD access to those models.


## Design goals and intentional limitations.

- Roll your own SQL. Frieda is neither a fully featured ORM (a la Prisma) nor a query builder (a la Kysely.) Other than simple `SELECT`s and CrUD statements, Frieda doesn't write queries.
- Frieda is designed to work with the Planetscale/Vitess/MySQL stack. The `FriedaDb` class uses PlanetScale's Serverless Driver.


## CLI

There are three things you can do with the cli.


### Settings

Most settings reside in a `.friedarc` JSON file in the project root directory. The exception is the database URL, which you can provide as an environment variable. 

`.friedarc` can and should be committed to git.  

#### Database URL

Frieda uses this to connect to your database both via the serverless driver and via mysql2 (to run migrations). The format is: `mysql://user:pass@host`. If your app uses separate `host`, `user` and `password` variables to connect, you need to add another variable named either `DATABASE_URL` or `FRIEDA_DATABASE_URL`. `FRIEDA_DATABASE_URL` takes precedence.

By default, Frieda will look for an `.env` file in the project root directory. If your environment variables reside elsewhere, you can specify the path to the file in `.friedarc`, using the `envFile` key. The file must be parseable by [dotenv](https://github.com/motdotla/dotenv). Example:

```jsonc
{
  // other settings
  "envFile": ".dev.vars"
}
```

If a valid database URL can't be found in `.env` or the environment file you specified, Frieda will prompt you for it each time. 

Don't forget to add the environment file to `.gitignore`.

#### .friedarc

This is a JSON file at the project root that contains settings for your project. These settings are non-sensitive and shareable between developers, so `.friedarc` should be commited to git.

```json
{
  "migrationsDirectory": "migrations",
  "generatedModelsDirectory": "src/db/_generated",
  "externalTypeImports": [
    "import type Stripe from 'stripe'",
    "import type { Foo } from '../../lib/types.js'"
  ]
}
```

- `migrationsDirectory`: The relative path where Frieda will place migration and introspection files.
- `generatedModelsDirectory`: The relative path where Frieda will create model code.
- `externalTypeImports`: If the schema contains `json` columns that you want to type, enter an array of import statements here. Frieda will include these import statements where necessary in the generated code, but does not check that they are valid. You can use whatever type aliases you have defined, e.g.: `"import type { Foo } from '$lib/types.js'"` rather than `"import type { Foo } from '../../lib/types.js'"`.


### Other

In order to connect securely with mysql2, the program needs to read a `.pem` certificate file from your machine. 
The default is `/etc/ssl/cert.pem`. This **should** work out of the box, but if it doesn't you can specify a different path


