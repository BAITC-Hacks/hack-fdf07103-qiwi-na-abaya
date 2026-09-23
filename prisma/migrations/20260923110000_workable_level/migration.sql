-- SQLite enum values are stored as text; preserve every task.
UPDATE Task SET readinessLevel = 'WORKABLE' WHERE readinessLevel = 'WORKING';
