USE event_scheduler;

CREATE TABLE tenants (
  id           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  uuid         CHAR(36) NOT NULL UNIQUE,
  name         VARCHAR(255) NOT NULL,
  slug         VARCHAR(100) NOT NULL UNIQUE,
  time_zone    VARCHAR(64) NOT NULL,
  created_at   DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB;

CREATE TABLE users (
  id             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  tenant_id      BIGINT UNSIGNED NOT NULL,
  email          VARCHAR(255) NOT NULL,
  password_hash  VARCHAR(255) NOT NULL,
  role           ENUM('SYSTEM_ADMIN','ORG_ADMIN','SCHEDULER','VIEWER') NOT NULL,
  firstname      VARCHAR(255) NOT NULL,
  lastname       VARCHAR(255) NOT NULL,
  telephone      VARCHAR(50) NOT NULL,
  created_at     DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  CONSTRAINT fk_users_tenant
    FOREIGN KEY (tenant_id) REFERENCES tenants(id)
    ON DELETE CASCADE,

  CONSTRAINT uq_users_tenant_email UNIQUE (tenant_id, email)
) ENGINE=InnoDB;

CREATE TABLE buildings (
  id           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  tenant_id    BIGINT UNSIGNED NOT NULL,
  name         VARCHAR(255) NOT NULL,
  time_zone    VARCHAR(64) NOT NULL,
  created_at   DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  CONSTRAINT fk_buildings_tenant
    FOREIGN KEY (tenant_id) REFERENCES tenants(id)
    ON DELETE CASCADE,

  INDEX idx_buildings_tenant (tenant_id)
) ENGINE=InnoDB;

CREATE TABLE rooms (
  id           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  tenant_id    BIGINT UNSIGNED NOT NULL,
  building_id  BIGINT UNSIGNED NOT NULL,
  name         VARCHAR(255) NOT NULL,
  capacity     INT NULL,
  features     JSON NULL,
  created_at   DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  CONSTRAINT fk_rooms_tenant
    FOREIGN KEY (tenant_id) REFERENCES tenants(id)
    ON DELETE CASCADE,

  CONSTRAINT fk_rooms_building
    FOREIGN KEY (building_id) REFERENCES buildings(id)
    ON DELETE CASCADE,

  INDEX idx_rooms_tenant (tenant_id),
  INDEX idx_rooms_building (building_id)
) ENGINE=InnoDB;

CREATE TABLE devices (
  id             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  tenant_id      BIGINT UNSIGNED NOT NULL,
  room_id        BIGINT UNSIGNED NOT NULL,
  pairing_code   VARCHAR(32) NOT NULL,
  last_seen_at   DATETIME(3) NULL,
  created_at     DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  CONSTRAINT fk_devices_tenant
    FOREIGN KEY (tenant_id) REFERENCES tenants(id)
    ON DELETE CASCADE,

  CONSTRAINT fk_devices_room
    FOREIGN KEY (room_id) REFERENCES rooms(id)
    ON DELETE CASCADE,

  CONSTRAINT uq_devices_pairing_code UNIQUE (pairing_code),

  INDEX idx_devices_tenant (tenant_id),
  INDEX idx_devices_room (room_id)
) ENGINE=InnoDB;

CREATE TABLE events (
  id               BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  tenant_id        BIGINT UNSIGNED NOT NULL,
  room_id          BIGINT UNSIGNED NOT NULL,
  title            VARCHAR(255) NOT NULL,
  facilitator_name VARCHAR(255) NULL,
  start_time       DATETIME(3) NOT NULL,
  end_time         DATETIME(3) NOT NULL,
  description      TEXT NULL,
  event_type       VARCHAR(50) NULL,
  created_at       DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  CONSTRAINT fk_events_tenant
    FOREIGN KEY (tenant_id) REFERENCES tenants(id)
    ON DELETE CASCADE,

  CONSTRAINT fk_events_room
    FOREIGN KEY (room_id) REFERENCES rooms(id)
    ON DELETE CASCADE,

  INDEX idx_events_tenant_room_time (tenant_id, room_id, start_time),
  INDEX idx_events_tenant_time (tenant_id, start_time)
) ENGINE=InnoDB;
