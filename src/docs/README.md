# API Documentation

This directory contains the Swagger/OpenAPI documentation for the OTP Backend API.

## Structure

- `otpRoutes.yaml` - Documentation for OTP-related endpoints
- `customerRoutes.yaml` - Documentation for customer management endpoints

## How it works

1. **Route files** (`src/routes/*.js`) contain only the essential route definitions and middleware
2. **Documentation files** (`src/docs/*.yaml`) contain the detailed Swagger/OpenAPI specifications
3. **Swagger configuration** (`src/config/swagger.js`) automatically combines both sources

## Benefits

- ✅ **Clean route files** - No more cluttered route definitions
- ✅ **Maintainable documentation** - Easy to update API docs separately
- ✅ **Version control friendly** - Documentation changes don't affect route logic
- ✅ **Team collaboration** - Non-developers can update documentation easily
- ✅ **Reusable** - YAML files can be used for other documentation tools

## Adding new endpoints

1. Add the route definition in the appropriate route file
2. Add the Swagger documentation in the corresponding YAML file
3. The documentation will automatically be included in the Swagger UI

## Viewing documentation

Visit `http://localhost:3000/api-docs` to see the interactive API documentation.
