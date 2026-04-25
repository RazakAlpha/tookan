-- migrations/001_delivery_address_schema.sql
-- Add normalized address fields to delivery orders / tasks

-- ─── Option A: Extend existing delivery_orders table ─────────────────

ALTER TABLE delivery_orders
  ADD COLUMN IF NOT EXISTS customer_address_line1    VARCHAR(255),
  ADD COLUMN IF NOT EXISTS customer_address_line2    VARCHAR(255),
  ADD COLUMN IF NOT EXISTS customer_city             VARCHAR(100),
  ADD COLUMN IF NOT EXISTS customer_state            VARCHAR(50),
  ADD COLUMN IF NOT EXISTS customer_postal_code      VARCHAR(20),
  ADD COLUMN IF NOT EXISTS customer_country          VARCHAR(10),
  ADD COLUMN IF NOT EXISTS customer_latitude         DECIMAL(10, 7),
  ADD COLUMN IF NOT EXISTS customer_longitude        DECIMAL(10, 7),
  ADD COLUMN IF NOT EXISTS customer_place_id         VARCHAR(255),
  ADD COLUMN IF NOT EXISTS customer_formatted_address TEXT,
  ADD COLUMN IF NOT EXISTS address_validation_status VARCHAR(30),
  ADD COLUMN IF NOT EXISTS service_area_allowed      BOOLEAN,
  ADD COLUMN IF NOT EXISTS service_area_reason       VARCHAR(255),
  ADD COLUMN IF NOT EXISTS service_area_distance_km  DECIMAL(8, 2),
  ADD COLUMN IF NOT EXISTS address_provider          VARCHAR(30),
  ADD COLUMN IF NOT EXISTS provider_task_id          VARCHAR(100),
  ADD COLUMN IF NOT EXISTS provider_tracking_url     TEXT,
  ADD COLUMN IF NOT EXISTS provider_status           VARCHAR(30),
  ADD COLUMN IF NOT EXISTS provider_raw_response     JSONB,
  ADD COLUMN IF NOT EXISTS dispatch_metadata         JSONB;

-- Index for task lookups
CREATE INDEX IF NOT EXISTS idx_delivery_orders_provider_task_id
  ON delivery_orders(provider_task_id);

-- Index for address searches
CREATE INDEX IF NOT EXISTS idx_delivery_orders_customer_place_id
  ON delivery_orders(customer_place_id);


-- ─── Option B: Separate addresses table (cleaner for multi-use) ──────

CREATE TABLE IF NOT EXISTS delivery_addresses (
  id              SERIAL PRIMARY KEY,
  order_id        INTEGER REFERENCES delivery_orders(id) ON DELETE CASCADE,
  address_type    VARCHAR(20) NOT NULL DEFAULT 'delivery', -- 'delivery' | 'pickup'
  
  -- Normalized fields
  address_line1       VARCHAR(255),
  address_line2       VARCHAR(255),
  city                VARCHAR(100),
  state               VARCHAR(50),
  postal_code         VARCHAR(20),
  country             VARCHAR(10),
  formatted_address   TEXT,
  
  -- Coordinates
  latitude            DECIMAL(10, 7),
  longitude           DECIMAL(10, 7),
  
  -- Provider data
  place_id            VARCHAR(255),
  address_provider    VARCHAR(30),
  
  -- Validation
  validation_status   VARCHAR(30),
  service_area_allowed BOOLEAN,
  service_area_reason  VARCHAR(255),
  distance_from_store  DECIMAL(8, 2),
  
  -- Raw data
  raw_provider_data   JSONB,
  
  -- Timestamps
  created_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_delivery_addresses_order_id
  ON delivery_addresses(order_id);

CREATE INDEX IF NOT EXISTS idx_delivery_addresses_place_id
  ON delivery_addresses(place_id);

CREATE INDEX IF NOT EXISTS idx_delivery_addresses_coords
  ON delivery_addresses(latitude, longitude);


-- ─── Tookan task tracking table ──────────────────────────────────────

CREATE TABLE IF NOT EXISTS delivery_tasks (
  id                  SERIAL PRIMARY KEY,
  order_id            INTEGER REFERENCES delivery_orders(id) ON DELETE SET NULL,
  
  -- Tookan / provider fields
  provider            VARCHAR(30) NOT NULL DEFAULT 'tookan',
  provider_task_id    VARCHAR(100),
  pickup_task_id      VARCHAR(100),
  delivery_task_id    VARCHAR(100),
  tracking_url        TEXT,
  pickup_tracking_url TEXT,
  delivery_tracking_url TEXT,
  
  -- Status
  status              VARCHAR(30) DEFAULT 'created',
  status_code         INTEGER,
  
  -- Agent assignment
  agent_name          VARCHAR(100),
  agent_phone         VARCHAR(30),
  
  -- Timestamps
  dispatched_at       TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  started_at          TIMESTAMP WITH TIME ZONE,
  completed_at        TIMESTAMP WITH TIME ZONE,
  cancelled_at        TIMESTAMP WITH TIME ZONE,
  
  -- Payload snapshot
  dispatch_payload    JSONB,
  provider_response   JSONB,
  
  created_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_delivery_tasks_order_id
  ON delivery_tasks(order_id);

CREATE INDEX IF NOT EXISTS idx_delivery_tasks_provider_task_id
  ON delivery_tasks(provider_task_id);

CREATE INDEX IF NOT EXISTS idx_delivery_tasks_status
  ON delivery_tasks(status);
