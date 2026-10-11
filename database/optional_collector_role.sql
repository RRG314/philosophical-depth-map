-- OPTIONAL: apply only when provisioning the private coordinator collector.
-- This grants no public/browser role and does not enable collection or approve consent.
BEGIN;
CREATE ROLE lab_collector NOLOGIN NOSUPERUSER NOBYPASSRLS;
GRANT USAGE ON SCHEMA reasoning_lab TO lab_collector;
GRANT SELECT ON reasoning_lab.configurations, reasoning_lab.consent_versions, reasoning_lab.question_versions, reasoning_lab.protocols TO lab_collector;
CREATE POLICY collector_config_read ON reasoning_lab.configurations FOR SELECT TO lab_collector USING(true);
CREATE POLICY collector_consent_read ON reasoning_lab.consent_versions FOR SELECT TO lab_collector USING(true);
CREATE POLICY collector_question_read ON reasoning_lab.question_versions FOR SELECT TO lab_collector USING(true);
CREATE POLICY collector_protocol_read ON reasoning_lab.protocols FOR SELECT TO lab_collector USING(true);
DO $$ DECLARE t text; BEGIN
FOREACH t IN ARRAY ARRAY['participants','consents','sessions','assignments','responses','revisions','ai_invocations'] LOOP
 EXECUTE format('GRANT SELECT, INSERT ON reasoning_lab.%I TO lab_collector',t);
 EXECUTE format('CREATE POLICY collector_approved ON reasoning_lab.%I FOR ALL TO lab_collector USING(EXISTS(SELECT 1 FROM reasoning_lab.configurations WHERE id=''four-methods-1.0'' AND collection_enabled AND approval_reference IS NOT NULL AND approved_at IS NOT NULL)) WITH CHECK(EXISTS(SELECT 1 FROM reasoning_lab.configurations WHERE id=''four-methods-1.0'' AND collection_enabled AND approval_reference IS NOT NULL AND approved_at IS NOT NULL))',t);
END LOOP; END $$;
GRANT UPDATE(completed_at) ON reasoning_lab.sessions TO lab_collector;
COMMIT;
