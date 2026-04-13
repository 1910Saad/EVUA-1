-- DataFlow AI Pipeline - MySQL Database Schema

CREATE TABLE IF NOT EXISTS users (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_email (email)
);

CREATE TABLE IF NOT EXISTS datasets (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    filename VARCHAR(255) NOT NULL,
    original_row_count INT,
    cleaned_row_count INT,
    columns JSON,
    column_types JSON,
    cleaning_summary JSON,
    user_id CHAR(36),
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(50) DEFAULT 'processing',
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_datasets_user (user_id),
    INDEX idx_datasets_status (status)
);

CREATE TABLE IF NOT EXISTS analysis_results (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    dataset_id CHAR(36) NOT NULL,
    statistics JSON,
    correlations JSON,
    outliers JSON,
    insights JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (dataset_id) REFERENCES datasets(id) ON DELETE CASCADE,
    INDEX idx_analysis_dataset (dataset_id)
);

CREATE TABLE IF NOT EXISTS visualizations (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    dataset_id CHAR(36) NOT NULL,
    charts JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (dataset_id) REFERENCES datasets(id) ON DELETE CASCADE,
    INDEX idx_viz_dataset (dataset_id)
);

CREATE TABLE IF NOT EXISTS predictions (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    dataset_id CHAR(36) NOT NULL,
    predictions JSON,
    summary TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (dataset_id) REFERENCES datasets(id) ON DELETE CASCADE,
    INDEX idx_pred_dataset (dataset_id)
);

CREATE TABLE IF NOT EXISTS reports (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    dataset_id CHAR(36) NOT NULL,
    report JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (dataset_id) REFERENCES datasets(id) ON DELETE CASCADE,
    INDEX idx_reports_dataset (dataset_id)
);

CREATE TABLE IF NOT EXISTS anomaly_results (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    dataset_id CHAR(36) NOT NULL,
    anomalies JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (dataset_id) REFERENCES datasets(id) ON DELETE CASCADE,
    INDEX idx_anomaly_dataset (dataset_id)
);

CREATE TABLE IF NOT EXISTS chat_history (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    dataset_id CHAR(36) NOT NULL,
    user_id CHAR(36),
    question TEXT,
    answer JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (dataset_id) REFERENCES datasets(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_chat_dataset (dataset_id),
    INDEX idx_chat_user (user_id)
);
