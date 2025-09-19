-- UTM Link Creator Database Schema for MySQL

-- Table for UTM settings
CREATE TABLE IF NOT EXISTS utm_settings (
    id VARCHAR(36) PRIMARY KEY,
    normalize_values BOOLEAN DEFAULT TRUE,
    lowercase_values BOOLEAN DEFAULT TRUE,
    replace_spaces BOOLEAN DEFAULT TRUE,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Table for UTM options (sources, mediums, campaigns)
CREATE TABLE IF NOT EXISTS utm_options (
    id VARCHAR(36) PRIMARY KEY,
    kind ENUM('source', 'medium', 'campaign') NOT NULL,
    value VARCHAR(255) NOT NULL,
    label VARCHAR(255) NOT NULL,
    active BOOLEAN DEFAULT TRUE,
    display_order INT DEFAULT 0,
    requires_keyword BOOLEAN DEFAULT FALSE,
    requires_location_event BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_kind_active (kind, active),
    INDEX idx_display_order (display_order)
);

-- Table for UTM links
CREATE TABLE IF NOT EXISTS utm_links (
    id VARCHAR(36) PRIMARY KEY,
    link_name VARCHAR(255) NOT NULL,
    destination_url TEXT NOT NULL,
    utm_source VARCHAR(255) NOT NULL,
    utm_medium VARCHAR(255) NOT NULL,
    utm_campaign VARCHAR(255) NOT NULL,
    utm_term VARCHAR(255) DEFAULT NULL,
    utm_content VARCHAR(255) DEFAULT NULL,
    custom_params JSON DEFAULT NULL,
    final_url TEXT NOT NULL,
    user_id VARCHAR(36) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_created_at (created_at),
    INDEX idx_campaign (utm_campaign),
    INDEX idx_source (utm_source),
    INDEX idx_medium (utm_medium)
);

-- Insert default settings
INSERT IGNORE INTO utm_settings (id, normalize_values, lowercase_values, replace_spaces, updated_at) 
VALUES (UUID(), TRUE, TRUE, TRUE, NOW());

-- Insert default UTM sources
INSERT IGNORE INTO utm_options (id, kind, value, label, active, display_order, requires_keyword, requires_location_event, created_at, updated_at) VALUES
(UUID(), 'source', 'google', 'Google', TRUE, 1, FALSE, FALSE, NOW(), NOW()),
(UUID(), 'source', 'facebook', 'Facebook', TRUE, 2, FALSE, FALSE, NOW(), NOW()),
(UUID(), 'source', 'twitter', 'Twitter', TRUE, 3, FALSE, FALSE, NOW(), NOW()),
(UUID(), 'source', 'linkedin', 'LinkedIn', TRUE, 4, FALSE, FALSE, NOW(), NOW()),
(UUID(), 'source', 'instagram', 'Instagram', TRUE, 5, FALSE, FALSE, NOW(), NOW()),
(UUID(), 'source', 'youtube', 'YouTube', TRUE, 6, FALSE, FALSE, NOW(), NOW()),
(UUID(), 'source', 'email', 'Email', TRUE, 7, FALSE, FALSE, NOW(), NOW()),
(UUID(), 'source', 'direct', 'Direct', TRUE, 8, FALSE, FALSE, NOW(), NOW());

-- Insert default UTM mediums
INSERT IGNORE INTO utm_options (id, kind, value, label, active, display_order, requires_keyword, requires_location_event, created_at, updated_at) VALUES
(UUID(), 'medium', 'cpc', 'CPC (Cost Per Click)', TRUE, 1, FALSE, FALSE, NOW(), NOW()),
(UUID(), 'medium', 'social', 'Social Media', TRUE, 2, FALSE, FALSE, NOW(), NOW()),
(UUID(), 'medium', 'email', 'Email', TRUE, 3, FALSE, FALSE, NOW(), NOW()),
(UUID(), 'medium', 'organic', 'Organic Search', TRUE, 4, FALSE, FALSE, NOW(), NOW()),
(UUID(), 'medium', 'referral', 'Referral', TRUE, 5, FALSE, FALSE, NOW(), NOW()),
(UUID(), 'medium', 'display', 'Display Ads', TRUE, 6, FALSE, FALSE, NOW(), NOW()),
(UUID(), 'medium', 'affiliate', 'Affiliate', TRUE, 7, FALSE, FALSE, NOW(), NOW()),
(UUID(), 'medium', 'direct', 'Direct', TRUE, 8, FALSE, FALSE, NOW(), NOW());

-- Insert default UTM campaigns
INSERT IGNORE INTO utm_options (id, kind, value, label, active, display_order, requires_keyword, requires_location_event, created_at, updated_at) VALUES
(UUID(), 'campaign', 'summer-sale', 'Summer Sale', TRUE, 1, FALSE, FALSE, NOW(), NOW()),
(UUID(), 'campaign', 'product-launch', 'Product Launch', TRUE, 2, FALSE, FALSE, NOW(), NOW()),
(UUID(), 'campaign', 'newsletter', 'Newsletter', TRUE, 3, FALSE, FALSE, NOW(), NOW()),
(UUID(), 'campaign', 'brand-awareness', 'Brand Awareness', TRUE, 4, FALSE, FALSE, NOW(), NOW());