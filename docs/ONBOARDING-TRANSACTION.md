# Onboarding transaction boundary

Platform capability and module catalog rows are initialized outside the school registration transaction. Registration only creates tenant-owned records and assigns already-existing catalog rows, keeping the tenant creation transaction short and atomic.
