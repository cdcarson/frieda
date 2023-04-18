export type Model = Record<string, unknown>;
export type FieldDefinition<M extends Model, F extends keyof M & string> = {
  fieldName: F;
};

export type ModelDefinition<M extends Model, N extends string> = {
  modelName: N;
  fields: {
    [K in keyof M & string]: FieldDefinition<M, K>;
  };
};
export type SchemaDefinition<D extends ModelDefinition<Model, string>[]> = {
  [K in D[number]['modelName']]: D[number];
};

type User = {
  id: string;
  createdAt: Date;
};

type Triangle = {
  id: string;
  createdAt: Date;
  a: number;
  b: number;
  c: number;
};

const userDef: ModelDefinition<User, 'User'> = {
  modelName: 'User',
  fields: {
    id: {
      fieldName: 'id'
    },
    createdAt: {
      fieldName: 'createdAt'
    }
  }
};

const triangleDef: ModelDefinition<Triangle, 'Triangle'> = {
  modelName: 'Triangle',
  fields: {
    id: {
      fieldName: 'id'
    },
    createdAt: {
      fieldName: 'createdAt'
    },
    a: {
      fieldName: 'a'
    },
    b: {
      fieldName: 'b'
    },
    c: {
      fieldName: 'c'
    }
  }
};

const schema: SchemaDefinition<[typeof userDef]> = {
  User: userDef
};
