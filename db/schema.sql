-- Toeshee backend schema (MySQL / MariaDB — GoDaddy cPanel)
-- Import this once via cPanel → phpMyAdmin → your database → Import.

CREATE TABLE IF NOT EXISTS users (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(255) NOT NULL,
  company       VARCHAR(255) NOT NULL,
  email         VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS contact_submissions (
  id                INT AUTO_INCREMENT PRIMARY KEY,
  name              VARCHAR(255),
  email             VARCHAR(255),
  phone             VARCHAR(100),
  company           VARCHAR(255),
  job_title         VARCHAR(255),
  website           VARCHAR(255),
  country           VARCHAR(255),
  company_type      VARCHAR(100),
  company_size      VARCHAR(50),
  annual_revenue    VARCHAR(50),
  support_model     VARCHAR(100),
  support_team_size VARCHAR(50),
  support_volume    VARCHAR(50),
  helpdesk          VARCHAR(100),
  audience          TEXT,
  services          TEXT,
  industries        TEXT,
  regions           TEXT,
  channels          TEXT,
  message           TEXT,
  preferred_date    VARCHAR(50),
  time_window       VARCHAR(50),
  time_zone         VARCHAR(100),
  attendees         VARCHAR(255),
  marketing_opt_in  TINYINT(1) DEFAULT 0,
  created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS chat_logs (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  session_id VARCHAR(64),
  role       VARCHAR(20),
  content    TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
