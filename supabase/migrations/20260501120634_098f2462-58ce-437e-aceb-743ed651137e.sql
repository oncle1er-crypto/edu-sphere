
-- Reset password for admin user
UPDATE auth.users 
SET encrypted_password = crypt('Providence2025!', gen_salt('bf'))
WHERE email = 'admin@gsp.ci';
