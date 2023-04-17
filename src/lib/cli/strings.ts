import colors from 'picocolors';
import { fmtPath, fmtVarName, fmtValue, squishWords, fmtEx } from './utils.js';
import { FRIEDA_RC_FILE_NAME } from './constants.js';

export const typeTinyIntOneAsBooleanPrompt = `Type ${fmtValue(`tinyint(1)`)} columns as ${fmtValue('boolean')} by default`;

export const typeTinyIntOneAsDesc = `${colors.bold(typeTinyIntOneAsBooleanPrompt)}
${fmtPath(FRIEDA_RC_FILE_NAME)}: ${fmtVarName('typeTinyIntOneAsBoolean')} 
Default: ${fmtValue('true')}\n\n` + 
squishWords(`
If set to ${fmtValue('true')}, Frieda will type model fields with the column type ${fmtValue('tinyint(1)')} as javascript ${fmtValue('boolean')}. 

You can turn this behavior off for an individual ${fmtValue('tinyint')} column by 
specifying a "column width" other than ${fmtValue('1')}. 
(This has no effect on the range of integer values that can be stored.)
Example:

${fmtEx('ALTER TABLE `Triangle` MODIFY COLUMN `numSides` tinyint(2) NOT NULL DEFAULT 3;')}

Setting ${fmtVarName('typeTinyIntOneAsBoolean')} to ${fmtValue('false')}  in ${fmtPath(FRIEDA_RC_FILE_NAME)} will turn off this behavior globally.
`);

export const typeBigIntAsStringPrompt = `Type ${fmtValue(`bigint`)} columns as ${fmtValue('string')} by default`;

export const typeBigIntAsStringDesc = `${colors.bold(typeBigIntAsStringPrompt)}
${fmtPath(FRIEDA_RC_FILE_NAME)}: ${fmtVarName('typeBigIntAsString')} 
Default: ${fmtValue('true')}\n\n` + 
squishWords(`
If set to ${fmtValue('true')}, Frieda will type model fields with the column type ${fmtValue('bigint')} as javascript ${fmtValue('string')}. The assumption is that most ${fmtValue('bigint')} columns represent primary or secondary keys, where the primary use case is comparing values rather than manipulating them as numbers.

You can turn this behavior off for an individual ${fmtValue('bigint')} column by adding a ${fmtValue('@bigint')} annotation to the column COMMENT. Example:

${fmtEx('ALTER TABLE `CatPerson` MODIFY COLUMN `numCats` bigint unsigned NOT NULL COMMENT \'@bigint\';')}

Setting ${fmtVarName('typeBigIntAsString')} to ${fmtValue('false')}  in ${fmtPath(FRIEDA_RC_FILE_NAME)} will turn off this behavior globally.
`);
