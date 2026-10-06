INSERT INTO users (
    role,
    name,
    email,
    phone,
    password_hash,
    avatar_path,
    preferred_language,
    is_active,
    last_login_at
)
VALUES
(
    'CUSTOMER',
    'Kamal Perera',
    'kamal@example.com',
    '+94771234567',
    '$2a$10$mockedhashedpassword1',
    'https://i.pravatar.cc/150?img=12',
    'EN',
    true,
    NOW()
),
(
    'WORKER',
    'Nimal Silva',
    'nimal@example.com',
    '+94712345678',
    '$2a$10$mockedhashedpassword2',
    'https://i.pravatar.cc/150?img=11',
    'SI',
    true,
    NOW()
),
(
    'ADMIN',
    'Admin User',
    'admin@apewada.com',
    '+94701234567',
    '$2a$10$mockedhashedpassword3',
    'https://i.pravatar.cc/150?img=5',
    'EN',
    true,
    NOW()
);

INSERT INTO customer_profiles (user_id, address, district, city, venue)
SELECT id, '123 Main Street', 'Colombo', 'Colombo', 'Colombo 03'
FROM users
WHERE email = 'kamal@example.com';

INSERT INTO worker_profiles (user_id, bio, experience_years, education_summary, district, city, venue, approval_status, availability_status)
SELECT id, 'Experienced local service professional.', 5, 'Diploma in technical services', 'Gampaha', 'Ja-Ela', 'Ja-Ela', 'APPROVED', 'AVAILABLE'
FROM users
WHERE email = 'nimal@example.com';