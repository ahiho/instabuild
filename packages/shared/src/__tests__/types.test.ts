import { describe, it, expect } from 'vitest';
import { AppError, ValidationError, NotFoundError } from '../types/errors';

describe('Shared Types', () => {
  it('should create AppError correctly', () => {
    const error = new AppError('Test error', 400);
    expect(error.message).toBe('Test error');
    expect(error.statusCode).toBe(400);
    expect(error.isOperational).toBe(true);
  });

  it('should create ValidationError correctly', () => {
    const error = new ValidationError('Invalid input');
    expect(error.message).toBe('Invalid input');
    expect(error.statusCode).toBe(400);
  });

  it('should create NotFoundError correctly', () => {
    const error = new NotFoundError('User');
    expect(error.message).toBe('User not found');
    expect(error.statusCode).toBe(404);
  });
});
