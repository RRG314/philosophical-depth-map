\set ON_ERROR_STOP on
BEGIN;
INSERT INTO pdm.participants(id) VALUES ('00000000-0000-4000-8000-000000000001'),('00000000-0000-4000-8000-000000000002');
CREATE ROLE pdm_test_reader NOLOGIN;
GRANT USAGE ON SCHEMA pdm TO pdm_test_reader;
GRANT SELECT ON ALL TABLES IN SCHEMA pdm TO pdm_test_reader;
GRANT EXECUTE ON FUNCTION pdm.current_participant() TO pdm_test_reader;
SET LOCAL ROLE pdm_test_reader;
DO $$ BEGIN IF (SELECT count(*) FROM pdm.participants)<>0 THEN RAISE EXCEPTION 'Anonymous access leaked'; END IF; END $$;
SET LOCAL pdm.participant_id='00000000-0000-4000-8000-000000000001';
DO $$ BEGIN IF (SELECT count(*) FROM pdm.participants)<>1 THEN RAISE EXCEPTION 'Isolation failed'; END IF; END $$;
DO $$ BEGIN INSERT INTO pdm.participants VALUES ('00000000-0000-4000-8000-000000000003',now(),NULL); RAISE EXCEPTION 'Write unexpectedly allowed'; EXCEPTION WHEN insufficient_privilege THEN NULL; END $$;
RESET ROLE;
DO $$ BEGIN INSERT INTO pdm.sessions VALUES ('00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000000099','explore',now(),NULL);RAISE EXCEPTION 'Foreign key failed'; EXCEPTION WHEN foreign_key_violation THEN NULL; END $$;
ROLLBACK;
