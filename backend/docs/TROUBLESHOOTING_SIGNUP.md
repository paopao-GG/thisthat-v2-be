# Troubleshooting Signup Issues

If you're seeing "Failed to create account", check the following:

## 1. Database Connection

Make sure PostgreSQL is running and the `DATABASE_URL` in `.env` is correct:

```env
DATABASE_URL=postgresql://user:password@localhost:5432/thisthat_v1
```

## 2. Run Prisma Migrations

The database schema needs to be created/updated:

```bash
cd backend
npx prisma migrate dev --name add_name_field
npx prisma generate
```

If you get errors about the `name` field already existing, you can skip the migration or reset:

```bash
# Reset database (WARNING: deletes all data)
npx prisma migrate reset

# Or just push the schema without migration
npx prisma db push
npx prisma generate
```

## 3. Check Backend Logs

When you try to sign up, check the backend console for error messages. Common errors:

- **Prisma Client not initialized**: Run `npx prisma generate`
- **Database connection failed**: Check `DATABASE_URL` and PostgreSQL is running
- **Table doesn't exist**: Run migrations
- **Column doesn't exist**: The `name` field might not be in the database

## 4. Check Browser Console

Open browser DevTools (F12) and check:
- **Network tab**: Look at the `/api/v1/auth/signup` request
  - Status code (should be 201 for success)
  - Response body (shows actual error message)
- **Console tab**: Look for JavaScript errors

## 5. Verify Backend is Running

Test the health endpoint:
```bash
curl http://localhost:3001/health
```

Should return: `{"status":"ok","timestamp":"..."}`

## 6. Test Signup Endpoint Directly

```bash
curl -X POST http://localhost:3001/api/v1/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password": "password123",
    "name": "Test User"
  }'
```

Check the response - it will show the actual error.

## Common Issues

### Issue: "Email already registered" or "Username already taken"
- Solution: Use a different email/username or delete the existing user from the database

### Issue: "Validation error"
- Solution: Check that all fields are filled correctly:
  - Username: 3-50 chars, alphanumeric + underscores only
  - Email: Valid email format
  - Password: At least 8 characters
  - Name: Required, 1-100 characters

### Issue: Database connection error
- Solution: 
  1. Make sure PostgreSQL is running: `pg_isready` or check your PostgreSQL service
  2. Verify `DATABASE_URL` in `.env` is correct
  3. Test connection: `psql $DATABASE_URL`

### Issue: Prisma Client error
- Solution: Run `npx prisma generate` in the backend directory

## Quick Fix Commands

```bash
# 1. Generate Prisma Client
cd backend
npx prisma generate

# 2. Push schema to database (creates/updates tables)
npx prisma db push

# 3. Restart backend server
npm run dev
```

## Still Having Issues?

1. Check backend logs when you submit the signup form
2. Check browser Network tab for the actual API response
3. Verify PostgreSQL is running: `pg_isready` or check your service manager
4. Verify `.env` file has correct `DATABASE_URL` and `JWT_ACCESS_SECRET`

