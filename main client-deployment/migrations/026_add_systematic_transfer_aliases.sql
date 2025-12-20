-- Migration 026: Add SYSTEMATIC TRANSFER IN/OUT aliases to m_transaction_types
--
-- REASON: Import files may have "SYSTEMATIC TRANSFER OUT" or "SYSTEMATIC TRANSFER IN"
-- instead of the standard txn_codes "STP-OUT" or "STP-IN"
--
-- Date: 2024-12-12

-- Add SYSTEMATIC TRANSFER OUT (alias for STP-OUT)
INSERT INTO m_transaction_types (txn_code, txn_name, txn_type, is_active, description)
VALUES (
    'SYSTEMATIC TRANSFER OUT',
    'Systematic Transfer Out',
    'Deduction',
    TRUE,
    'Systematic transfer of funds to another scheme (outgoing) - alternate code'
)
ON CONFLICT (txn_code) DO NOTHING;

-- Add SYSTEMATIC TRANSFER IN (alias for STP-IN)
INSERT INTO m_transaction_types (txn_code, txn_name, txn_type, is_active, description)
VALUES (
    'SYSTEMATIC TRANSFER IN',
    'Systematic Transfer In',
    'Addition',
    TRUE,
    'Systematic transfer of funds from another scheme (incoming) - alternate code'
)
ON CONFLICT (txn_code) DO NOTHING;

-- Verification
SELECT txn_code, txn_name, txn_type, is_active
FROM m_transaction_types
WHERE txn_code LIKE '%SYSTEMATIC%' OR txn_code LIKE '%STP%'
ORDER BY txn_code;
