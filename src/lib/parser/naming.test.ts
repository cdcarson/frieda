import { describe, it, expect } from 'vitest';

import {
  getFieldName,
  getModelName,
  getModelPrimaryKeyTypeName,
  getModelCreateDataTypeName,
  getModelUpdateDataTypeName,
  getModelFindUniqueParamsTypeName
} from './naming.js';

describe('fieldName', () => {
  it('should handle snake case', () => {
    expect(getFieldName('email_verified')).toBe('emailVerified');
  });
  it('should handle pascal case', () => {
    expect(getFieldName('EmailVerified')).toBe('emailVerified');
  });
  it('should not change camel case', () => {
    expect(getFieldName('emailVerified')).toBe('emailVerified');
  });
  it('should get rid of extra snake case underscores', () => {
    expect(getFieldName('email__verified')).toBe('emailVerified');
    expect(getFieldName('_email_verified')).toBe('emailVerified');
    expect(getFieldName('email_verified____')).toBe('emailVerified');
  });
});

describe('modelName', () => {
  it('should handle snake case', () => {
    expect(getModelName('cat_person')).toBe('CatPerson');
  });
  it('should handle pascal case', () => {
    expect(getModelName('CatPerson')).toBe('CatPerson');
  });
  it('should handle camel case', () => {
    expect(getModelName('catPerson')).toBe('CatPerson');
  });
  it('should get rid of extra snake case underscores', () => {
    expect(getModelName('cat____person')).toBe('CatPerson');
    expect(getModelName('_cat_person')).toBe('CatPerson');
    expect(getModelName('cat_person____')).toBe('CatPerson');
  });
});

describe('modelPrimaryKeyName', () => {
  it('should handle snake case', () => {
    expect(getModelPrimaryKeyTypeName('cat_person')).toBe('CatPersonPrimaryKey');
  });
  it('should handle pascal case', () => {
    expect(getModelPrimaryKeyTypeName('CatPerson')).toBe('CatPersonPrimaryKey');
  });
});

describe('modelCreateDataName', () => {
  it('should handle snake case', () => {
    expect(getModelCreateDataTypeName('cat_person')).toBe('CatPersonCreateData');
  });
  it('should handle pascal case', () => {
    expect(getModelCreateDataTypeName('CatPerson')).toBe('CatPersonCreateData');
  });
});
describe('modelUpdateDataName', () => {
  it('should handle snake case', () => {
    expect(getModelUpdateDataTypeName('cat_person')).toBe('CatPersonUpdateData');
  });
  it('should handle pascal case', () => {
    expect(getModelUpdateDataTypeName('CatPerson')).toBe('CatPersonUpdateData');
  });
});
describe('modelFindUniqueParamsName', () => {
  it('should handle snake case', () => {
    expect(getModelFindUniqueParamsTypeName('cat_person')).toBe(
      'CatPersonFindUniqueParams'
    );
  });
  it('should handle pascal case', () => {
    expect(getModelFindUniqueParamsTypeName('CatPerson')).toBe(
      'CatPersonFindUniqueParams'
    );
  });
});
