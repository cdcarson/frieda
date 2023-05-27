import { describe, it, expect, beforeEach } from 'vitest';

import { Model } from './model.js';
import type { FetchedTable, IModel } from './types.js';

describe('Model', () => {
  let table: FetchedTable;
  beforeEach(() => {
    table = {
      name: 'foo_bar',
      columns: [],
      indexes: [],
      createSql: ''
    };
  });
  it('names', () => {
    expect(new Model(table).modelName).toBe('FooBar');
    expect(new Model(table).tableName).toBe('foo_bar');
    expect(new Model(table).modelName).toBe('FooBar');
    expect(new Model(table).modelName).toBe('FooBar');
  });
  it('creates fields', () => {
    table.columns.push(
      {
        Field: 'id',
        Collation: '',
        Comment: '',
        Default: null,
        Extra: 'auto_increment',
        Key: 'PRI',
        Null: 'NO',
        Privileges: '',
        Type: 'bigint unsigned'
      },
      {
        Field: 'name',
        Collation: '',
        Comment: '',
        Default: null,
        Extra: '',
        Key: '',
        Null: 'NO',
        Privileges: '',
        Type: 'varchar(50)'
      }
    );
    const m = new Model(table);
    expect(m.fields.length).toBe(2);
    expect(m.fields[0].fieldName).toBe('id');
    expect(m.fields[1].fieldName).toBe('name');
  });

  it('type names', () => {
    const m = new Model(table);
    expect(m.selectAllTypeName).toBe('FooBarSelectAll');
    expect(m.primaryKeyTypeName).toBe('FooBarPrimaryKey');
    expect(m.createTypeName).toBe('FooBarCreate');
    expect(m.updateTypeName).toBe('FooBarUpdate');
    expect(m.findUniqueTypeName).toBe('FooBarFindUnique');
    expect(m.dbTypeName).toBe('FooBarDb');
    expect(m.appDbKey).toBe('fooBar');
  });

  it('can be stringified', () => {
    table.columns.push(
      {
        Field: 'id',
        Collation: '',
        Comment: '',
        Default: null,
        Extra: 'auto_increment',
        Key: 'PRI',
        Null: 'NO',
        Privileges: '',
        Type: 'bigint unsigned'
      },
      {
        Field: 'name',
        Collation: '',
        Comment: '',
        Default: null,
        Extra: '',
        Key: '',
        Null: 'NO',
        Privileges: '',
        Type: 'varchar(50)'
      }
    );
    const m = new Model(table);
    const ser = JSON.stringify(m);
    const deser: IModel = JSON.parse(ser);
    expect(deser.modelName).toEqual(m.modelName);
    expect(deser.fields[1].fieldName).toEqual('name');
  });

  describe('findUniqueTypes and findUniqueTypeDeclaration', () => {
    it('works for unique indexes with multiple keys', () => {
      table = {
        createSql: '',
        name: 'Article',
        columns: [
          {
            Field: 'id',
            Type: 'bigint unsigned',
            Collation: null,
            Null: 'NO',
            Key: 'PRI',
            Default: null,
            Extra: 'auto_increment',
            Privileges: 'select,insert,update,references',
            Comment: ''
          },
          {
            Field: 'publicationArticleId',
            Type: 'varchar(100)',
            Collation: 'utf8mb4_unicode_ci',
            Null: 'NO',
            Key: 'MUL',
            Default: null,
            Extra: '',
            Privileges: 'select,insert,update,references',
            Comment: ''
          },
          {
            Field: 'publicationId',
            Type: 'bigint unsigned',
            Collation: null,
            Null: 'NO',
            Key: 'MUL',
            Default: null,
            Extra: '',
            Privileges: 'select,insert,update,references',
            Comment: ''
          }
        ],
        indexes: [
          {
            Table: 'Article',
            Non_unique: 0,
            Key_name: 'PRIMARY',
            Seq_in_index: 1,
            Column_name: 'id',
            Collation: 'A',
            Cardinality: '0',
            Sub_part: null,
            Packed: null,
            Null: '',
            Index_type: 'BTREE',
            Comment: '',
            Index_comment: '',
            Visible: 'YES',
            Expression: null
          },
          {
            Table: 'Article',
            Non_unique: 0,
            Key_name: 'Article_publicationArticleId_publicationId_key',
            Seq_in_index: 1,
            Column_name: 'publicationArticleId',
            Collation: 'A',
            Cardinality: '0',
            Sub_part: null,
            Packed: null,
            Null: '',
            Index_type: 'BTREE',
            Comment: '',
            Index_comment: '',
            Visible: 'YES',
            Expression: null
          },
          {
            Table: 'Article',
            Non_unique: 0,
            Key_name: 'Article_publicationArticleId_publicationId_key',
            Seq_in_index: 2,
            Column_name: 'publicationId',
            Collation: 'A',
            Cardinality: '0',
            Sub_part: null,
            Packed: null,
            Null: '',
            Index_type: 'BTREE',
            Comment: '',
            Index_comment: '',
            Visible: 'YES',
            Expression: null
          }
        ]
      };
      const m = new Model(table);
      expect(m.findUniqueTypes.length).toBe(1);
      expect(m.findUniqueTypes[0]).toEqual(
        `{publicationArticleId:string;publicationId:string}`
      );
      expect(m.findUniqueTypeDeclaration).toEqual('export type ArticleFindUnique=ArticlePrimaryKey|{publicationArticleId:string;publicationId:string}')
    });
    it('works for indexes with one key', () => {
      table = {
        name: 'UserAccount',
        columns: [
          {
            Field: 'userId',
            Type: 'bigint unsigned',
            Collation: null,
            Null: 'NO',
            Key: 'PRI',
            Default: null,
            Extra: '',
            Privileges: 'select,insert,update,references',
            Comment: ''
          },
          {
            Field: 'createdAt',
            Type: 'datetime(3)',
            Collation: null,
            Null: 'NO',
            Key: '',
            Default: 'CURRENT_TIMESTAMP(3)',
            Extra: 'DEFAULT_GENERATED',
            Privileges: 'select,insert,update,references',
            Comment: ''
          },
          {
            Field: 'updatedAt',
            Type: 'datetime(3)',
            Collation: null,
            Null: 'NO',
            Key: '',
            Default: 'CURRENT_TIMESTAMP(3)',
            Extra: 'DEFAULT_GENERATED on update CURRENT_TIMESTAMP(3)',
            Privileges: 'select,insert,update,references',
            Comment: ''
          },
          {
            Field: 'lastSignedInAt',
            Type: 'datetime(3)',
            Collation: null,
            Null: 'NO',
            Key: '',
            Default: null,
            Extra: '',
            Privileges: 'select,insert,update,references',
            Comment: ''
          },
          {
            Field: 'email',
            Type: 'varchar(320)',
            Collation: 'utf8mb4_unicode_ci',
            Null: 'NO',
            Key: 'UNI',
            Default: null,
            Extra: '',
            Privileges: 'select,insert,update,references',
            Comment: ''
          },
          {
            Field: 'password',
            Type: 'varchar(191)',
            Collation: 'utf8mb4_unicode_ci',
            Null: 'NO',
            Key: '',
            Default: null,
            Extra: '',
            Privileges: 'select,insert,update,references',
            Comment: ''
          },
          {
            Field: 'emailVerified',
            Type: 'tinyint',
            Collation: null,
            Null: 'NO',
            Key: '',
            Default: null,
            Extra: '',
            Privileges: 'select,insert,update,references',
            Comment: ''
          }
        ],
        indexes: [
          {
            Table: 'UserAccount',
            Non_unique: 0,
            Key_name: 'PRIMARY',
            Seq_in_index: 1,
            Column_name: 'userId',
            Collation: 'A',
            Cardinality: '0',
            Sub_part: null,
            Packed: null,
            Null: '',
            Index_type: 'BTREE',
            Comment: '',
            Index_comment: '',
            Visible: 'YES',
            Expression: null
          },
          {
            Table: 'UserAccount',
            Non_unique: 0,
            Key_name: 'UserAccount_email_key',
            Seq_in_index: 1,
            Column_name: 'email',
            Collation: 'A',
            Cardinality: '0',
            Sub_part: null,
            Packed: null,
            Null: '',
            Index_type: 'BTREE',
            Comment: '',
            Index_comment: '',
            Visible: 'YES',
            Expression: null
          },
          {
            Table: 'UserAccount',
            Non_unique: 1,
            Key_name: 'UserAccount_userId_idx',
            Seq_in_index: 1,
            Column_name: 'userId',
            Collation: 'A',
            Cardinality: '0',
            Sub_part: null,
            Packed: null,
            Null: '',
            Index_type: 'BTREE',
            Comment: '',
            Index_comment: '',
            Visible: 'YES',
            Expression: null
          },
          {
            Table: 'UserAccount',
            Non_unique: 1,
            Key_name: 'UserAccount_email_idx',
            Seq_in_index: 1,
            Column_name: 'email',
            Collation: null,
            Cardinality: '0',
            Sub_part: null,
            Packed: null,
            Null: '',
            Index_type: 'FULLTEXT',
            Comment: '',
            Index_comment: '',
            Visible: 'YES',
            Expression: null
          }
        ],
        createSql: ''
      };
      const m = new Model(table);
      expect(m.findUniqueTypes.length).toBe(1);
      expect(m.findUniqueTypes[0]).toEqual(`{email:string}`);
      expect(m.findUniqueTypeDeclaration).toEqual('export type UserAccountFindUnique=UserAccountPrimaryKey|{email:string}')

    });
    it('works if there are no other unique indexes', () => {
      table = {
        name: 'User',
        columns: [
          {
            Field: 'id',
            Type: 'bigint unsigned',
            Collation: null,
            Null: 'NO',
            Key: 'PRI',
            Default: null,
            Extra: 'auto_increment',
            Privileges: 'select,insert,update,references',
            Comment: ''
          },
          {
            Field: 'createdAt',
            Type: 'datetime(3)',
            Collation: null,
            Null: 'NO',
            Key: '',
            Default: 'CURRENT_TIMESTAMP(3)',
            Extra: 'DEFAULT_GENERATED',
            Privileges: 'select,insert,update,references',
            Comment: ''
          }
        ],
        indexes: [
          {
            Table: 'User',
            Non_unique: 0,
            Key_name: 'PRIMARY',
            Seq_in_index: 1,
            Column_name: 'id',
            Collation: 'A',
            Cardinality: '0',
            Sub_part: null,
            Packed: null,
            Null: '',
            Index_type: 'BTREE',
            Comment: '',
            Index_comment: '',
            Visible: 'YES',
            Expression: null
          }
        ],
        createSql:''
      };
      const m = new Model(table);
      expect(m.findUniqueTypes.length).toBe(0);
      expect(m.findUniqueTypeDeclaration).toEqual('export type UserFindUnique=UserPrimaryKey')
    });
  });

  describe('modelTypeDeclaration', () => {
    beforeEach(() => {
      table = {
        name: 'foo_bar',
        columns: [
          {
            Field: 'id',
            Collation: '',
            Comment: '',
            Default: null,
            Extra: 'auto_increment',
            Key: 'PRI',
            Null: 'NO',
            Privileges: '',
            Type: 'bigint unsigned'
          },
          {
            Field: 'name',
            Collation: '',
            Comment: '',
            Default: null,
            Extra: '',
            Key: '',
            Null: 'NO',
            Privileges: '',
            Type: 'varchar(50)'
          }
        ],
        indexes: [],
        createSql: ''
      };
    })
    it('works', () => {
      
      const m = new Model(table);
      expect(m.modelTypeDeclaration).toEqual('export type FooBar={id:string;name:string}')
    });
    it('works if a field is invisible', () => {
      table.columns[1].Extra = 'INVISIBLE'
      const m = new Model(table);
      expect(m.modelTypeDeclaration).toEqual('export type FooBar={id:string;name?:string}')
    });
    it('works if a field is nullable', () => {
      table.columns[1].Null = 'YES'
      const m = new Model(table);
      expect(m.modelTypeDeclaration).toEqual('export type FooBar={id:string;name:string|null}')
    });
  })
  describe('selectAllTypeDeclaration', () => {
    beforeEach(() => {
      table = {
        name: 'foo_bar',
        columns: [
          {
            Field: 'id',
            Collation: '',
            Comment: '',
            Default: null,
            Extra: 'auto_increment',
            Key: 'PRI',
            Null: 'NO',
            Privileges: '',
            Type: 'bigint unsigned'
          },
          {
            Field: 'name',
            Collation: '',
            Comment: '',
            Default: null,
            Extra: '',
            Key: '',
            Null: 'NO',
            Privileges: '',
            Type: 'varchar(50)'
          }
        ],
        indexes: [],
        createSql: ''
      };
    })
    it('works', () => {
      
      const m = new Model(table);
      expect(m.selectAllTypeDeclaration).toEqual('export type FooBarSelectAll={id:string;name:string}')
    });
    it('works if a field is invisible', () => {
      table.columns[1].Extra = 'INVISIBLE'
      const m = new Model(table);
      expect(m.selectAllTypeDeclaration).toEqual('export type FooBarSelectAll={id:string}')
    });
    it('works if a field is nullable', () => {
      table.columns[1].Null = 'YES'
      const m = new Model(table);
      expect(m.selectAllTypeDeclaration).toEqual('export type FooBarSelectAll={id:string;name:string|null}')
    });
  })

  describe('selectAllTypeDeclaration', () => {

    it('works', () => {
      table = {
        name: 'foo_bar',
        columns: [
          {
            Field: 'id',
            Collation: '',
            Comment: '',
            Default: null,
            Extra: 'auto_increment',
            Key: 'PRI',
            Null: 'NO',
            Privileges: '',
            Type: 'bigint unsigned'
          },
          {
            Field: 'name',
            Collation: '',
            Comment: '',
            Default: null,
            Extra: '',
            Key: '',
            Null: 'NO',
            Privileges: '',
            Type: 'varchar(50)'
          }
        ],
        indexes: [],
        createSql: ''
      };
      const m = new Model(table);
      expect(m.primaryKeyTypeDeclaration).toEqual('export type FooBarPrimaryKey={id:string}')
    });
    it('works if there are two primary keys', () => {
      table = {
        name: 'foo_bar',
        columns: [
          {
            Field: 'userId',
            Collation: '',
            Comment: '',
            Default: null,
            Extra: '',
            Key: 'PRI',
            Null: 'NO',
            Privileges: '',
            Type: 'bigint unsigned'
          },
          {
            Field: 'accountId',
            Collation: '',
            Comment: '',
            Default: null,
            Extra: '',
            Key: 'PRI',
            Null: 'NO',
            Privileges: '',
            Type: 'varchar(50)'
          }
        ],
        indexes: [],
        createSql: ''
      };
      const m = new Model(table);
      expect(m.primaryKeyTypeDeclaration).toEqual('export type FooBarPrimaryKey={userId:string;accountId:string}')
    });
   
  })

  describe('createTypeDeclaration', () => {
    it('works', () => {
      table = {
        name: 'foo_bar',
        columns: [
          {
            Field: 'id',
            Collation: '',
            Comment: '',
            Default: null,
            Extra: 'auto_increment',
            Key: 'PRI',
            Null: 'NO',
            Privileges: '',
            Type: 'bigint unsigned'
          },
          {
            Field: 'name',
            Collation: '',
            Comment: '',
            Default: null,
            Extra: '',
            Key: '',
            Null: 'NO',
            Privileges: '',
            Type: 'varchar(50)'
          }
        ],
        indexes: [],
        createSql: ''
      };
      const m = new Model(table);
      expect(m.createTypeDeclaration).toEqual('export type FooBarCreate={id?:string;name:string}')
    });
    it('works if a col is nullable', () => {
      table = {
        name: 'foo_bar',
        columns: [
          {
            Field: 'id',
            Collation: '',
            Comment: '',
            Default: null,
            Extra: 'auto_increment',
            Key: 'PRI',
            Null: 'NO',
            Privileges: '',
            Type: 'bigint unsigned'
          },
          {
            Field: 'name',
            Collation: '',
            Comment: '',
            Default: null,
            Extra: '',
            Key: '',
            Null: 'YES',
            Privileges: '',
            Type: 'varchar(50)'
          }
        ],
        indexes: [],
        createSql: ''
      };
      const m = new Model(table);
      expect(m.createTypeDeclaration).toEqual('export type FooBarCreate={id?:string;name?:string|null}')
    });
    it('works if a col has a default', () => {
      table = {
        name: 'foo_bar',
        columns: [
          {
            Field: 'id',
            Collation: '',
            Comment: '',
            Default: null,
            Extra: 'auto_increment',
            Key: 'PRI',
            Null: 'NO',
            Privileges: '',
            Type: 'bigint unsigned'
          },
          {
            Field: 'name',
            Collation: '',
            Comment: '',
            Default: 'a',
            Extra: '',
            Key: '',
            Null: 'NO',
            Privileges: '',
            Type: 'varchar(50)'
          }
        ],
        indexes: [],
        createSql: ''
      };
      const m = new Model(table);
      expect(m.createTypeDeclaration).toEqual('export type FooBarCreate={id?:string;name?:string}')
    });
    it('works if the pk is not auto increment', () => {
      table = {
        name: 'foo_bar',
        columns: [
          {
            Field: 'id',
            Collation: '',
            Comment: '',
            Default: null,
            Extra: '',
            Key: 'PRI',
            Null: 'NO',
            Privileges: '',
            Type: 'bigint unsigned'
          },
          {
            Field: 'name',
            Collation: '',
            Comment: '',
            Default: null,
            Extra: '',
            Key: '',
            Null: 'NO',
            Privileges: '',
            Type: 'varchar(50)'
          }
        ],

        indexes: [],
        createSql: ''
      };
      const m = new Model(table);
      expect(m.createTypeDeclaration).toEqual('export type FooBarCreate={id:string;name:string}')
    });
    it('works if a col is generated', () => {
      table = {
        name: 'foo_bar',
        columns: [
          {
            Field: 'id',
            Collation: '',
            Comment: '',
            Default: null,
            Extra: 'auto_increment',
            Key: 'PRI',
            Null: 'NO',
            Privileges: '',
            Type: 'bigint unsigned'
          },
          {
            Field: 'name',
            Collation: '',
            Comment: '',
            Default: null,
            Extra: 'STORED GENERATED',
            Key: '',
            Null: 'NO',
            Privileges: '',
            Type: 'varchar(50)'
          }
        ],
        indexes: [],
        createSql: ''
      };
      const m = new Model(table);
      expect(m.createTypeDeclaration).toEqual('export type FooBarCreate={id?:string}')
    });
  })
  describe('updateTypeDeclaration', () => {
    it('works', () => {
      table = {
        name: 'foo_bar',
        columns: [
          {
            Field: 'id',
            Collation: '',
            Comment: '',
            Default: null,
            Extra: 'auto_increment',
            Key: 'PRI',
            Null: 'NO',
            Privileges: '',
            Type: 'bigint unsigned'
          },
          {
            Field: 'name',
            Collation: '',
            Comment: '',
            Default: null,
            Extra: '',
            Key: '',
            Null: 'NO',
            Privileges: '',
            Type: 'varchar(50)'
          }
        ],
        indexes: [],
        createSql: ''
      };
      const m = new Model(table);
      expect(m.updateTypeDeclaration).toEqual('export type FooBarUpdate={name?:string}')
    });
    it('works if a col is nullable', () => {
      table = {
        name: 'foo_bar',
        columns: [
          {
            Field: 'id',
            Collation: '',
            Comment: '',
            Default: null,
            Extra: 'auto_increment',
            Key: 'PRI',
            Null: 'NO',
            Privileges: '',
            Type: 'bigint unsigned'
          },
          {
            Field: 'name',
            Collation: '',
            Comment: '',
            Default: null,
            Extra: '',
            Key: '',
            Null: 'YES',
            Privileges: '',
            Type: 'varchar(50)'
          }
        ],
        indexes: [],
        createSql: ''
      };
      const m = new Model(table);
      expect(m.updateTypeDeclaration).toEqual('export type FooBarUpdate={name?:string|null}')
    });
   
    it('works if a col is generated', () => {
      table = {
        name: 'foo_bar',
        columns: [
          {
            Field: 'id',
            Collation: '',
            Comment: '',
            Default: null,
            Extra: 'auto_increment',
            Key: 'PRI',
            Null: 'NO',
            Privileges: '',
            Type: 'bigint unsigned'
          },
          {
            Field: 'name',
            Collation: '',
            Comment: '',
            Default: null,
            Extra: 'STORED GENERATED',
            Key: '',
            Null: 'NO',
            Privileges: '',
            Type: 'varchar(50)'
          }
        ],
        indexes: [],
        createSql: ''
      };
      const m = new Model(table);
      expect(m.updateTypeDeclaration).toEqual('export type FooBarUpdate={}')
    });
    
  })

  describe('dbTypeDeclaration', () => {
    it('works', () => {
      table = {
        name: 'a',
        columns: [],
        indexes: [],
        createSql: ''
      }
      const m = new Model(table);
      expect(m.dbTypeDeclaration).toEqual(`export type ADb=<A,ASelectAll,APrimaryKey,ACreate,AUpdate,AFindUnique>`)

    })
  })
});
