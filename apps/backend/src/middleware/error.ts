import { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { AppError } from '@instabuild/shared';

export async function errorHandler(
  error: FastifyError,
  _request: FastifyRequest,
  reply: FastifyReply
) {
  // Log the error
  console.error('Request error:', error.message, error.stack);

  // Handle known application errors
  if (error instanceof AppError) {
    return reply.status(error.statusCode).send({
      error: error.name,
      message: error.message,
      details: error.isOperational ? {} : undefined,
    });
  }

  // Handle Fastify validation errors
  if (error.validation) {
    return reply.status(400).send({
      error: 'ValidationError',
      message: 'Request validation failed',
      details: error.validation,
    });
  }

  // Handle generic errors
  const statusCode = error.statusCode || 500;
  const message = statusCode === 500 ? 'Internal Server Error' : error.message;

  return reply.status(statusCode).send({
    error: error.name || 'Error',
    message,
    details: {},
  });
}
