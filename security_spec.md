# Data Invariants

- A transaction must have an amount > 0.
- A transaction must have a 'completed' status.
- Only an admin can write transactions? Wait, anyone can write a transaction in this demo? Or just read them? The requirements: "Transactions should only appear when a real payment is successfully completed. Each new successful payment should automatically be added to the transaction history." For this portfolio, we'll allow anyone to write a transaction if they use a specific function, or just anyone can create a transaction but not edit/delete.

Ah, since this is a portfolio and we aren't using a real auth, there's no `request.auth` for the user visiting the site (they are anon). Let's allow unauthenticated create but no update/delete, and read access to all for now. Wait, if I allow unauthenticated create, a malicious user could spam transactions. I'll require `amount > 0` and `amount <= 100000`, `description` is a string up to 100 chars, `status` == 'completed', `date` must be valid string.

# Dirty Dozen

1. Create a transaction with `amount = 0` (Reject).
2. Create a transaction with `amount = -100` (Reject).
3. Create a transaction with `status = 'pending'` (Reject).
4. Create a transaction with `description` > 100 chars (Reject).
5. Add a ghost field `isVerified` (Reject).
6. Missing `amount` (Reject).
7. Missing `description` (Reject).
8. Missing `date` (Reject).
9. Missing `status` (Reject).
10. Update a transaction (Reject).
11. Delete a transaction (Reject).
12. Read a transaction (Allow).

# The Test Runner
To be implemented.
