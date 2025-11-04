-- Check t_customers table definition for family fields
SELECT 
    column_name,
    data_type,
    character_maximum_length,
    column_default,
    is_nullable
FROM information_schema.columns
WHERE table_name = 't_customers'
  AND column_name LIKE '%family%'
ORDER BY ordinal_position;

-- Check for CHECK constraints
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conrelid = 't_customers'::regclass;
