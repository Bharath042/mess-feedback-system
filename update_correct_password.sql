UPDATE users SET password = '$2a$12$y1qwlCN2rI8sSwkEpecVZ.1OrH8w85AeR2WeWcXj1dyrBA0eKf9yS' WHERE username='student001';
SELECT LEN(password) as hash_length, password FROM users WHERE username='student001';
