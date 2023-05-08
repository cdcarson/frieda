import ts from 'typescript';
export const compileToJavascript = (pathToDatabaseTs: string): void => {
  const program = ts.createProgram([pathToDatabaseTs], { declaration: true });
  program.emit();
};
