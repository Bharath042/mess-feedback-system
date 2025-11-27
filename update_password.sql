UPDATE users SET password = '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj6hsxq/VjVe' WHERE username='student001';
SELECT LEN(password) as hash_length, password FROM users WHERE username='student001';
