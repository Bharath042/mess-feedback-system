-- Create notifications table for admin-to-user messaging
-- Notifications expire after 7 days and include sender information

CREATE TABLE notifications (
    id INT IDENTITY(1,1) PRIMARY KEY,
    user_id INT NOT NULL,
    sender_id INT NULL,
    sender_name VARCHAR(255) NULL,
    title VARCHAR(500) NOT NULL,
    message NVARCHAR(2000) NOT NULL,
    type VARCHAR(50) DEFAULT 'info', -- info, warning, success, error
    priority VARCHAR(50) DEFAULT 'normal', -- normal, high, urgent
    is_read BIT DEFAULT 0,
    created_at DATETIME2 DEFAULT GETDATE(),
    expires_at DATETIME2 NULL, -- Notifications expire after 7 days
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (sender_id) REFERENCES users(id)
);

-- Create index for better performance
CREATE INDEX IX_notifications_user_id ON notifications(user_id);
CREATE INDEX IX_notifications_created_at ON notifications(created_at);
CREATE INDEX IX_notifications_expires_at ON notifications(expires_at);

-- Insert sample notifications
INSERT INTO notifications (user_id, sender_id, sender_name, title, message, type, priority, expires_at)
VALUES 
    (2, 1, 'admin', 'Welcome to Mess Feedback System', 'Welcome! Start giving feedback to earn points and help us improve our services.', 'info', 'normal', DATEADD(day, 7, GETDATE())),
    (2, 1, 'admin', 'Feedback Rewards Program', 'Earn 10 points for each feedback submission! Points can be redeemed for special privileges.', 'success', 'normal', DATEADD(day, 7, GETDATE()));

-- Clean up expired notifications (run this periodically)
-- DELETE FROM notifications WHERE expires_at < GETDATE();
