import {
  fmtVal,
  fmtVarName,
  log,
  maskDatabaseURLPassword,
  onUserCancelled
} from './utils.js';
import type { Code } from './code.js';
import type { Database } from './database.js';
import type { FileSystem } from './file-system.js';
import type { Model } from './model.js';
import type { Options } from './options.js';
import type { Schema } from './schema.js';
import { prompt } from './utils.js';
import kleur from 'kleur';
import type { Field } from './field.js';

export class Explorer {
  currentModel: Model | undefined;
  currentField: Field | undefined;
  constructor(
    public schema: Schema,
    public code: Code,
    public readonly fs: FileSystem,
    public readonly db: Database,
    public readonly options: Options
  ) {}

  async run() {
    if (this.options.model || this.options.field) {
      return await this.promptModel(this.options.model, this.options.field);
    } else {
      return await this.schemaScreen();
    }
  }

  async promptModel(modelName?: string, fieldName?: string): Promise<void> {
    type Choice = {
      title: string;
      value: Model;
    };
    const choices: Choice[] = this.schema.models.map((m) => {
      return {
        title: m.modelName,
        value: m
      };
    });

    const suggest = (inp: string, choices: Choice[]) => {
      return choices.filter(
        (c) =>
          c.title.toLowerCase().startsWith(inp.toLowerCase()) ||
          c.value.tableName.toLowerCase().startsWith(inp.toLowerCase())
      );
    };
    const initialChoice = suggest(modelName || '', choices)[0] || choices[0];
    this.currentModel = (await prompt({
      type: 'autocomplete',
      name: 'model',
      message: 'Model',
      initial: initialChoice.title,
      choices,
      limit: 5,
      suggest: async (inp: string, choices) => {
        return suggest(inp, choices as Choice[]);
      }
    })) as unknown as Model;
    if (fieldName) {
      return await this.promptField(this.currentModel, fieldName);
    }
    return await this.modelScreen(this.currentModel);
  }

  async promptField(model: Model, partialName?: string): Promise<void> {
    type Choice = {
      title: string;
      value: Field;
    };
    const choices: Choice[] = model.fields.map((f) => {
      return {
        title: f.fieldName,
        value: f
      };
    });

    const suggest = (inp: string, choices: Choice[]) => {
      return choices.filter(
        (c) =>
          c.title.toLowerCase().startsWith(inp.toLowerCase()) ||
          c.value.columnName.toLowerCase().startsWith(inp.toLowerCase())
      );
    };
    const initialChoice = suggest(partialName || '', choices)[0] || choices[0];
    this.currentField = (await prompt({
      type: 'autocomplete',
      name: 'field',
      message: 'Field',
      initial: initialChoice.title,
      choices,
      limit: 5,
      suggest: async (inp: string, choices) => {
        return suggest(inp, choices as Choice[]);
      }
    })) as unknown as Field;
    return await this.fieldScreen(model, this.currentField);
  }

  async schemaScreen() {
    log.header(`↓  Schema: ${this.schema.databaseName}`);
    log.info(kleur.bold('Schema'));
    log.table([
      ['Database', fmtVal(this.schema.databaseName)],
      ['URL', maskDatabaseURLPassword(this.options.databaseDetails.databaseUrl)]
    ]);
    console.log();
    log.info(
      kleur.bold('Models') + kleur.dim(` (${this.schema.models.length})`)
    );
    log.table(
      [
        ...this.schema.models.map((m) => [
          fmtVal(m.modelName),
          kleur.dim(m.tableName)
        ])
      ],
      ['Model Name', 'Table Name']
    );
    log.header(`↑ Schema: ${this.schema.databaseName}`);
  }

  async modelScreen(m: Model) {
    log.header(`↓ Model: ${m.modelName}`);
    log.info(kleur.bold('Model'));
    log.table([
      ['Model', fmtVal(m.modelName)],
      ['Table', fmtVal(m.tableName)]
    ]);
    console.log();
    log.info(kleur.bold('Fields') + kleur.dim(` (${m.fields.length})`));
    log.table(
      [
        ...m.fields.map((f) => [
          fmtVarName(f.fieldName),
          fmtVal(f.javascriptType),
          kleur.dim(f.column.Type)
        ])
      ],
      ['Field', 'JS Type', 'Column Type']
    );
    log.header(`↑ Model: ${m.modelName}`);

    type Next = 'field' | 'model' | 'schema' | 'exit';
    const next = await prompt<Next>({
      type: 'select',
      name: 'next',
      message: `Model: ${m.modelName}`,
      choices: [
        { title: 'Show/Modify Field', value: 'field' },
        { title: 'Show Another Model', value: 'model' },
        { title: 'Show Schema', value: 'schema' },
        { title: 'Exit', value: 'exit' }
      ]
    });
    if (next === 'exit') {
      return onUserCancelled();
    }
    if (next === 'field') {
      return await this.promptField(m);
    }
    if (next === 'model') {
      return await this.promptModel();
    }
    if (next === 'schema') {
      return await this.schemaScreen();
    }
  }

  async fieldScreen(m: Model, f: Field) {
    log.header(`↓ Field: ${f.fieldName}`);
    log.table([
      ['Model', fmtVal(m.modelName)],
      ['Field', fmtVarName(f.fieldName)],
      ['Column', kleur.dim(f.columnName)]
    ]);
    console.log();
    log.info(kleur.bold('Javascript Type'));
    log.table([
      [
        'JS Type',
        fmtVal(f.javascriptType),
        kleur.dim(`(${f.jsTypeExplanation})`)
      ],
      ['Column Type', kleur.dim(f.column.Type)]
    ]);
    log.header(`↑ Field: ${f.fieldName}`);
    type Next = 'change' | 'field' | 'model' | 'schema' | 'exit';

    const next = await prompt<Next>({
      type: 'select',
      name: 'next',
      message: `Model: ${m.modelName} | Field: ${f.fieldName}`,
      choices: [
        { title: 'Modify or Drop Field', value: 'change' },
        { title: 'Show Another Field', value: 'fiels' },
        { title: 'Show Another Model', value: 'model' },
        { title: 'Show Schema', value: 'schema' },
        { title: 'Exit', value: 'exit' }
      ]
    });
  }

  async promptFieldChange(m: Model, f: Field) {
    type Next =
      | 'typeTinyInt'
      | 'typeBigInt'
      | 'typeJson'
      | 'typeEnum'
      | 'typeSet'
      | 'rename'
      | 'setInvisible'
      | 'editByHand'
      | 'drop';
    type Choice = {
      title: string;
      value: Next;
    };
    const choices: Choice[] = [];
    if (f.mysqlBaseType === 'tinyint') {
      if (f.isTinyIntOne) {
        choices.push({
          title: `Type as javascript ${fmtVal(
            'number'
          )} (change column type to ${fmtVal('tinyint')})`,
          value: 'typeTinyInt'
        });
      } else {
        choices.push({
          title: `Type as javascript ${fmtVal(
            'boolean'
          )} (change column type to ${fmtVal('tinyint(1)')})`,
          value: 'typeTinyInt'
        });
      }
    }
    if (f.mysqlBaseType === 'bigint') {
      if (f.bigIntAnnotation) {
        choices.push({
          title: `Type as javascript ${fmtVal('string')} (remove ${kleur.red(
            '@bigint'
          )} type annotation)`,
          value: 'typeTinyInt'
        });
      } else {
        choices.push({
          title: `Type as javascript ${fmtVal('bigint')} (add ${kleur.red(
            '@bigint'
          )} type annotation)`,
          value: 'typeTinyInt'
        });
      }
    }
    if (f.mysqlBaseType === 'json') {
      if (f.jsonAnnotation) {
        choices.push({
          title: `Edit or remove the ${kleur.red('@json')} type annotation`,
          value: 'typeJson'
        });
      } else {
        choices.push({
          title: `Add a ${kleur.red('@json')} type annotation`,
          value: 'typeJson'
        });
      }
    }
    if (f.mysqlBaseType === 'enum') {
      if (f.enumAnnotation) {
        choices.push({
          title: `Edit or remove the ${kleur.red('@enum')} type annotation`,
          value: 'typeEnum'
        });
      } else {
        choices.push({
          title: `Add an ${kleur.red('@enum')} type annotation`,
          value: 'typeEnum'
        });
      }
    }
    if (f.mysqlBaseType === 'set') {
      if (f.setAnnotation) {
        choices.push({
          title: `Edit or remove the ${kleur.red('@set')} type annotation`,
          value: 'typeSet'
        });
      } else {
        choices.push({
          title: `Add an ${kleur.red('@set')} type annotation`,
          value: 'typeSet'
        });
      }
    }
    if (f.isInvisible) {
      choices.push({
        title: `Make field visible (remove ${kleur.red('INVISIBLE')})`,
        value: 'setInvisible'
      });
    } else {
      choices.push({
        title: `Make field invisible (add ${kleur.red('INVISIBLE')})`,
        value: 'setInvisible'
      });
    }
  }
}
