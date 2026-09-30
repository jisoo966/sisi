-- 006_visualization_moments.sql  (NOT APPLIED — write-only on the redesign branch)
--
-- Picture it: "What stayed with you?" is kept as a Moment on the selected
-- Star with type = 'visualization' (label "Visualization"). Additive only.

alter table signs drop constraint if exists signs_type_check;
alter table signs add constraint signs_type_check check (type in (
  'general', 'something_good', 'small_step', 'companion_note', 'visualization'));
