-- Add sample questions to the active template
INSERT INTO question_configs (id, template_id, question_id, title, type, required, created_at) 
VALUES 
('q1-test', 'b674f52e-154b-4d0c-8218-1c893daabaaa', '1', 'Átvevő neve', 'text', 1, 1756203800000),
('q2-test', 'b674f52e-154b-4d0c-8218-1c893daabaaa', '2', 'Szerelő neve', 'text', 1, 1756203800001),
('q3-test', 'b674f52e-154b-4d0c-8218-1c893daabaaa', '3', 'Lift típusa', 'text', 1, 1756203800002);