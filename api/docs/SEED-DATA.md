# Database Seed Data Guide

This document describes how to populate the database with test data for development and testing purposes.

## Quick Start

Run the seed script to populate the database with test data:

```bash
npm run seed
```

## What Gets Created

The seed script creates comprehensive test data including:

### Users (6 total)
- **1 Administrator**: `admin@daycare.com`
- **2 Staff Members**: `maria@daycare.com`, `joao@daycare.com`
- **3 Responsáveis**: `ana.silva@example.com`, `carlos.santos@example.com`, `patricia.oliveira@example.com`

**⚠️ Important**: All users have the password: `test1234`

### Classes (5 total)
- Berçário A (0-12 months, capacity: 10)
- Maternal I (12-24 months, capacity: 12)
- Maternal II (24-36 months, capacity: 15)
- Jardim I (36-48 months, capacity: 18)
- Jardim II (48-60 months, capacity: 20)

### Children (4 total)
- Lucas Silva (Berçário A) - Parent: Ana Silva
- Sofia Santos (Maternal I) - Parent: Carlos Santos
- Pedro Oliveira (Maternal II) - Parent: Patricia Oliveira
- Isabella Silva (Jardim I) - Parent: Ana Silva

### Other Data
- **4 Staff Assignments** - Staff members assigned to classes
- **4 Guardians** - Guardians for children
- **2 Pickup Persons** - Authorized pickup persons
- **2 Activities** - Educational activities
- **3 Daily Reports** - Daily reports for children
- **2 Report Photos** - Photos attached to reports
- **4 Attendance Records** - Check-in/out records
- **3 Calendar Events** - Calendar events (party, meeting, holiday)
- **3 Invoices** - Billing invoices (2 pending, 1 paid)
- **2 Payments** - Payment records
- **4 Expense Categories** - Categories for expenses
- **3 Expenses** - Expense records
- **3 Messages** - Messages between users
- **3 Monthly Reports** - Monthly reports (draft, submitted, validated)

## Test User Credentials

| Role | Email | Password |
|------|-------|----------|
| Administrador | admin@daycare.com | test1234 |
| Staff | maria@daycare.com | test1234 |
| Staff | joao@daycare.com | test1234 |
| Responsável | ana.silva@example.com | test1234 |
| Responsável | carlos.santos@example.com | test1234 |
| Responsável | patricia.oliveira@example.com | test1234 |

## Usage

### Prerequisites

1. Ensure MongoDB is running and accessible
2. Set `MONGODB_URI` in your `.env` file
3. Install dependencies: `npm install`

### Running the Seed Script

```bash
# Using npm script
npm run seed

# Or directly with ts-node
npx ts-node scripts/seed.ts
```

### What Happens

1. **Connects** to MongoDB using your `MONGODB_URI`
2. **Clears** all existing data (optional - can be commented out)
3. **Creates** all test data in the correct order
4. **Displays** a summary of created data
5. **Disconnects** from the database

### Warning

⚠️ **The seed script will DELETE all existing data** before creating new test data. This is intentional for development/testing purposes. If you want to keep existing data, comment out the deletion section in `scripts/seed.ts`.

## Customizing Seed Data

To customize the seed data:

1. Open `scripts/seed.ts`
2. Modify the data objects as needed
3. Run `npm run seed` again

## Troubleshooting

### Error: Cannot connect to MongoDB
- Check your `MONGODB_URI` in `.env`
- Ensure MongoDB is running
- Verify network connectivity

### Error: Duplicate key error
- The script clears existing data first, but if it fails partway through, you may need to manually clear collections
- Or comment out the deletion section and manually delete specific collections

### Error: Validation errors
- Check that all required fields are provided
- Ensure date formats are correct
- Verify ObjectId references exist

## Data Relationships

The seed script creates data with proper relationships:

- Children are linked to classes and parents
- Staff assignments link staff to classes
- Guardians and pickup persons are linked to children
- Daily reports are linked to children and created by staff
- Attendance records are linked to children
- Invoices are linked to children and parents
- Payments are linked to invoices, parents, and children
- Monthly reports are linked to children and created by staff

## Notes

- All dates use current date or recent dates for realistic test data
- Passwords are hashed using bcrypt (same as production)
- All users have `emailVerified: true` and `status: 'active'`
- The script creates a realistic data set for testing all features
