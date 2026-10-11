BEGIN;
DO $$ BEGIN
IF EXISTS(SELECT 1 FROM pg_tables WHERE schemaname='reasoning_lab' AND NOT rowsecurity) THEN RAISE EXCEPTION 'Unprotected table'; END IF;
IF EXISTS(SELECT 1 FROM pg_policies WHERE schemaname='reasoning_lab' AND cmd IN ('ALL','INSERT','UPDATE')) THEN RAISE EXCEPTION 'Collection writable'; END IF;
BEGIN
 INSERT INTO reasoning_lab.configurations VALUES('invalid','1','{}',true,NULL,NULL);
 RAISE EXCEPTION 'Approval gate failed';
EXCEPTION WHEN check_violation THEN NULL; END;
INSERT INTO reasoning_lab.configurations(id,version,config) VALUES('test','1','{}');
IF (SELECT collection_enabled FROM reasoning_lab.configurations WHERE id='test') THEN RAISE EXCEPTION 'Collection enabled'; END IF;
END $$;
ROLLBACK;
