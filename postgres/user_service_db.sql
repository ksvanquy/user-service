-- ======================================================================
--                  USER MANAGEMENT SERVICE DATABASE SCHEMA
--                        (Phiên bản cập nhật)
-- ======================================================================

-- Database: user_service_db

-- ------------ EXTENSIONS (Nếu cần cho case-insensitive) ------------
-- CREATE EXTENSION IF NOT EXISTS citext; -- Bỏ comment nếu muốn dùng citext cho username/email

-- ------------ FUNCTIONS ------------

-- Trigger Function để tự động cập nhật cột updated_at
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW(); -- NOW() trả về TIMESTAMPTZ hiện tại
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- ------------ ENUMS ------------

-- Định nghĩa kiểu ENUM cho loại token dùng một lần
CREATE TYPE user_token_type AS ENUM (
    'EMAIL_VERIFICATION',
    'PASSWORD_RESET'
    -- Có thể thêm các loại khác trong tương lai
);


-- ------------ TABLES ------------

-- Bảng người dùng cốt lõi (Định danh & Xác thực)
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username citext NOT NULL UNIQUE,        -- Sử dụng citext
    email citext NOT NULL UNIQUE,           -- Sử dụng citext
    password VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    email_verified BOOLEAN DEFAULT FALSE NOT NULL,
    last_login_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Bảng thông tin hồ sơ người dùng
CREATE TABLE user_profiles (
    user_id INT PRIMARY KEY,               -- Khóa chính, đồng thời là khóa ngoại trỏ đến users.id
    full_name VARCHAR(255) NULL,
    avatar_url VARCHAR(512) NULL,
    date_of_birth DATE NULL,
    bio TEXT NULL,
    location VARCHAR(255) NULL,
    website VARCHAR(255) NULL,
    is_phone_verified BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,

    -- Mối quan hệ một-một: Xóa profile khi user bị xóa
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Bảng vai trò
CREATE TABLE roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    description TEXT NULL,

    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Bảng quyền hạn
CREATE TABLE permissions (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT NULL,

    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Bảng nối Vai trò - Quyền hạn (Many-to-Many)
CREATE TABLE role_permissions (
    role_id INT NOT NULL,
    permission_id INT NOT NULL,

    PRIMARY KEY (role_id, permission_id),
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
    FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
);

-- Bảng nối Người dùng - Vai trò (Many-to-Many)
CREATE TABLE user_roles (
    user_id INT NOT NULL,
    role_id INT NOT NULL,

    PRIMARY KEY (user_id, role_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE
);

-- Bảng lưu trữ Refresh Tokens
CREATE TABLE refresh_tokens (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    jti VARCHAR(255) NOT NULL UNIQUE, -- ID duy nhất cho mỗi refresh token (JWT ID)
    token_hash TEXT NOT NULL,         -- Hash của refresh token
    device_name TEXT NULL,
    ip_address inet NULL,
    user_agent TEXT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    is_revoked BOOLEAN DEFAULT FALSE NOT NULL,

    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    revoked_at TIMESTAMPTZ NULL,

    -- Đảm bảo tính toàn vẹn: Xóa refresh token khi người dùng tương ứng bị xóa
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Bảng lưu trữ token dùng một lần (Xác thực email, Đặt lại mật khẩu, v.v.)
CREATE TABLE user_tokens (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    type user_token_type NOT NULL,      -- Loại token (sử dụng ENUM đã định nghĩa)
    token_hash VARCHAR(255) NOT NULL UNIQUE, -- Hash của token thực tế (Không lưu trữ token gốc)
    expires_at TIMESTAMPTZ NOT NULL,    -- Thời điểm token hết hạn

    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    -- Không cần updated_at cho loại token này

    -- Đảm bảo tính toàn vẹn: Xóa token khi người dùng tương ứng bị xóa
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);


-- ------------ INDEXES ------------

-- Indexes cho bảng users
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
-- CREATE UNIQUE INDEX idx_users_username_lower ON users (LOWER(username)); -- Nếu không dùng citext
-- CREATE UNIQUE INDEX idx_users_email_lower ON users (LOWER(email));       -- Nếu không dùng citext

-- Index cho bảng roles
CREATE INDEX idx_roles_name ON roles(name);

-- Index cho bảng permissions
CREATE INDEX idx_permissions_name ON permissions(name);

-- Indexes cho bảng nối user_roles
CREATE INDEX idx_user_roles_user ON user_roles(user_id);
CREATE INDEX idx_user_roles_role ON user_roles(role_id);

-- Indexes cho bảng nối role_permissions
CREATE INDEX idx_role_permissions_role ON role_permissions(role_id);
CREATE INDEX idx_role_permissions_permission ON role_permissions(permission_id);

-- Indexes cho bảng refresh_tokens
CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_jti ON refresh_tokens(jti);
CREATE INDEX idx_refresh_tokens_expires_at ON refresh_tokens(expires_at); -- Cho việc dọn dẹp token hết hạn

-- Indexes cho bảng user_tokens
CREATE INDEX idx_user_tokens_user_id ON user_tokens(user_id);
CREATE INDEX idx_user_tokens_type ON user_tokens(type);
-- Index trên token_hash đã được bao gồm bởi ràng buộc UNIQUE
CREATE INDEX idx_user_tokens_expires_at ON user_tokens(expires_at); -- Quan trọng cho việc dọn dẹp token hết hạn


-- ------------ TRIGGERS ------------

-- Trigger cho bảng users để cập nhật updated_at
CREATE TRIGGER set_users_timestamp
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

-- Trigger cho bảng user_profiles để cập nhật updated_at
CREATE TRIGGER set_user_profiles_timestamp
BEFORE UPDATE ON user_profiles
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

-- Trigger cho bảng roles để cập nhật updated_at
CREATE TRIGGER set_roles_timestamp
BEFORE UPDATE ON roles
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

-- Trigger cho bảng permissions để cập nhật updated_at
CREATE TRIGGER set_permissions_timestamp
BEFORE UPDATE ON permissions
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

-- Không cần trigger updated_at cho user_tokens, role_permissions, user_roles, refresh_tokens (trừ khi có logic cập nhật)

-- ======================================================================
--                          END OF SCHEMA
-- ======================================================================