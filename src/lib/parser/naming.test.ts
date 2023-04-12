import { describe, it, expect } from 'vitest';

import {
  fieldName,
  modelName,
  modelPrimaryKeyName,
  modelCreateDataName,
  modelUpdateDataName,
  modelFindUniqueParamsName
} from './naming.js';

describe('fieldName', () => {
  it('should handle snake case', () => {
    expect(fieldName('email_verified')).toBe('emailVerified');
  });
  it('should handle pascal case', () => {
    expect(fieldName('EmailVerified')).toBe('emailVerified');
  });
  it('should not change camel case', () => {
    expect(fieldName('emailVerified')).toBe('emailVerified');
  });
  it('should get rid of extra snake case underscores', () => {
    expect(fieldName('email__verified')).toBe('emailVerified');
    expect(fieldName('_email_verified')).toBe('emailVerified');
    expect(fieldName('email_verified____')).toBe('emailVerified');
  });
});

describe('modelName', () => {
  it('should handle snake case', () => {
    expect(modelName('cat_person')).toBe('CatPerson');
  });
  it('should handle pascal case', () => {
    expect(modelName('CatPerson')).toBe('CatPerson');
  });
  it('should handle camel case', () => {
    expect(modelName('catPerson')).toBe('CatPerson');
  });
  it('should get rid of extra snake case underscores', () => {
    expect(modelName('cat____person')).toBe('CatPerson');
    expect(modelName('_cat_person')).toBe('CatPerson');
    expect(modelName('cat_person____')).toBe('CatPerson');
  });
});

describe('modelPrimaryKeyName', () => {
  it('should handle snake case', () => {
    expect(modelPrimaryKeyName('cat_person')).toBe('CatPersonPrimaryKey');
  });
  it('should handle pascal case', () => {
    expect(modelPrimaryKeyName('CatPerson')).toBe('CatPersonPrimaryKey');
  });
});

describe('modelCreateDataName', () => {
  it('should handle snake case', () => {
    expect(modelCreateDataName('cat_person')).toBe('CatPersonCreateData');
  });
  it('should handle pascal case', () => {
    expect(modelCreateDataName('CatPerson')).toBe('CatPersonCreateData');
  });
});
describe('modelUpdateDataName', () => {
  it('should handle snake case', () => {
    expect(modelUpdateDataName('cat_person')).toBe('CatPersonUpdateData');
  });
  it('should handle pascal case', () => {
    expect(modelUpdateDataName('CatPerson')).toBe('CatPersonUpdateData');
  });
});
describe('modelFindUniqueParamsName', () => {
  it('should handle snake case', () => {
    expect(modelFindUniqueParamsName('cat_person')).toBe(
      'CatPersonFindUniqueParams'
    );
  });
  it('should handle pascal case', () => {
    expect(modelFindUniqueParamsName('CatPerson')).toBe(
      'CatPersonFindUniqueParams'
    );
  });
});
