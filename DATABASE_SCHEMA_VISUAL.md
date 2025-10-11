# 🗄️ DATABASE SCHEMA VISUAL GUIDE

## Database: messfeedbacksqlserver

---

## 📊 TABLE RELATIONSHIPS DIAGRAM

```
┌─────────────────────────────────────────────────────────────────────┐
│                         MESS FEEDBACK SYSTEM                         │
│                         DATABASE ARCHITECTURE                        │
└─────────────────────────────────────────────────────────────────────┘

┌──────────────────┐
│     users        │ ◄─────────────────┐
├──────────────────┤                   │
│ PK id            │                   │
│    username      │                   │
│    password      │                   │
│    role          │                   │
│    is_active     │                   │
│    last_login    │                   │
│    login_attempts│                   │
│    locked_until  │                   │
└────────┬─────────┘                   │
         │                             │
         │ 1:N                         │
         │                             │
         ├─────────────────────────────┼─────────────────┐
         │                             │                 │
         │                             │                 │
         ▼                             │                 ▼
┌──────────────────┐          ┌──────────────────┐  ┌──────────────────┐
│ user_profiles    │          │  feedback_       │  │  complaints      │
├──────────────────┤          │  submissions     │  ├──────────────────┤
│ PK id            │          ├──────────────────┤  │ PK id            │
│ FK user_id       │          │ PK id            │  │ FK user_id       │
│    full_name     │          │ FK user_id       │  │    complaint_type│
│    email         │          │    submission_   │  │    title         │
│    phone         │          │    date          │  │    description   │
│    department    │          │    meal_type     │  │    severity      │
│    year_of_study │          │    mess_hall     │  │    status        │
│    credit_points │          │    service_rating│  │    mess_hall     │
│    total_feedback│          │    cleanliness_  │  │    meal_time     │
└──────────────────┘          │    rating        │  │    incident_date │
                              │    ambience_     │  │    priority_level│
         ▲                    │    rating        │  │ FK assigned_to   │
         │                    │    food_quality_ │  │    resolution_   │
         │ 1:N                │    rating        │  │    notes         │
         │                    │    comments      │  │    resolved_at   │
┌──────────────────┐          │    suggestions   │  └──────────────────┘
│  user_points     │          │    is_anonymous  │
├──────────────────┤          └──────────────────┘
│ PK id            │
│ FK user_id       │                   │
│    points        │                   │ 1:N
│    total_earned  │                   │
│    total_spent   │                   ▼
│    last_updated  │          ┌──────────────────┐
└──────────────────┘          │    Feedback      │
                              │   (Legacy)       │
         ▲                    ├──────────────────┤
         │                    │ PK id            │
         │ 1:N                │    StudentName   │
         │                    │    Roll          │
┌──────────────────┐          │    Meal          │
│  notifications   │          │    Rating        │
├──────────────────┤          │    Emotion       │
│ PK id            │          │    Comment       │
│ FK user_id       │          │    created_at    │
│ FK sender_id     │          │    mess_hall     │
│    sender_name   │          │    meal_time     │
│    title         │          │    food_quality_ │
│    message       │          │    rating        │
│    type          │          │    service_rating│
│    priority      │          │    cleanliness_  │
│    is_read       │          │    rating        │
│    created_at    │          │    is_anonymous  │
│    expires_at    │          └──────────────────┘
└──────────────────┘


┌──────────────────┐          ┌──────────────────┐
│   mess_halls     │          │   menu_items     │
├──────────────────┤          ├──────────────────┤
│ PK id            │          │ PK id            │
│    name          │          │    name          │
│    location      │          │    category      │
│    capacity      │          │    description   │
│ FK manager_id    │          │    is_vegetarian │
│    operating_hrs │          │    is_vegan      │
│    contact_number│          │    spice_level   │
│    is_active     │          │    calories_per_ │
└────────┬─────────┘          │    serving       │
         │                    └────────┬─────────┘
         │ 1:N                         │
         │                             │ N:M
         │                             │
         ▼                             ▼
┌──────────────────┐          ┌──────────────────┐
│  daily_menus     │◄────────►│ daily_menu_items │
├──────────────────┤   N:M    ├──────────────────┤
│ PK id            │          │ PK id            │
│ FK mess_hall_id  │          │ FK daily_menu_id │
│    menu_date     │          │ FK menu_item_id  │
│    meal_type     │          └──────────────────┘
│    created_at    │
└──────────────────┘

         ▲
         │ 1:N
         │
┌──────────────────┐
│   meal_types     │
├──────────────────┤
│ PK id            │
│    name          │
│    display_name  │
│    time_range    │
│    is_active     │
└──────────────────┘
```

---

## 📋 TABLE DETAILS

### 1️⃣ users (Authentication Core)
```
┌─────────────────────────────────────────┐
│ users                                   │
├─────────────────────────────────────────┤
│ id              INT IDENTITY(1,1) PK    │
│ username        VARCHAR(100) UNIQUE     │
│ password        VARCHAR(255)            │ ← bcrypt hashed
│ role            VARCHAR(50)             │ ← 'student' or 'admin'
│ created_at      DATETIME2               │
│ updated_at      DATETIME2               │
│ is_active       BIT                     │
│ last_login      DATETIME2               │
│ login_attempts  INT                     │
│ locked_until    DATETIME2               │
└─────────────────────────────────────────┘
Indexes:
  - IX_users_username (username)
  - IX_users_role (role)
```

### 2️⃣ feedback_submissions (Main Feedback)
```
┌─────────────────────────────────────────┐
│ feedback_submissions                    │
├─────────────────────────────────────────┤
│ id                    INT IDENTITY PK   │
│ user_id               INT FK → users    │
│ submission_date       DATE              │
│ meal_type             VARCHAR(50)       │ ← 'breakfast','lunch','dinner'
│ mess_hall             VARCHAR(100)      │
│ service_rating        INT (1-5)         │
│ cleanliness_rating    INT (1-5)         │
│ ambience_rating       INT (1-5)         │
│ food_quality_rating   INT (1-5)         │
│ comments              NVARCHAR(1000)    │
│ suggestions           NVARCHAR(1000)    │
│ is_anonymous          BIT               │
│ created_at            DATETIME2         │
└─────────────────────────────────────────┘
Indexes:
  - IX_feedback_user_date (user_id, created_at)
  - IX_feedback_meal_date (created_at DESC)
```

### 3️⃣ complaints (Issue Tracking)
```
┌─────────────────────────────────────────┐
│ complaints                              │
├─────────────────────────────────────────┤
│ id                INT IDENTITY PK       │
│ user_id           INT FK → users        │
│ complaint_type    VARCHAR(50)           │ ← Type of complaint
│ title             VARCHAR(255)          │
│ description       NVARCHAR(2000)        │
│ severity          VARCHAR(20)           │ ← 'low','medium','high','critical'
│ status            VARCHAR(20)           │ ← 'open','in_progress','resolved','closed'
│ mess_hall         VARCHAR(100)          │
│ meal_time         VARCHAR(20)           │
│ incident_date     DATETIME2             │
│ priority_level    INT (1-5)             │
│ assigned_to       INT FK → users        │
│ resolution_notes  NVARCHAR(1000)        │
│ resolved_at       DATETIME2             │
│ created_at        DATETIME2             │
│ updated_at        DATETIME2             │
└─────────────────────────────────────────┘
Indexes:
  - IX_complaints_user_id (user_id)
  - IX_complaints_status (status)
  - IX_complaints_type (complaint_type)
```

### 4️⃣ notifications (User Alerts)
```
┌─────────────────────────────────────────┐
│ notifications                           │
├─────────────────────────────────────────┤
│ id             INT IDENTITY PK          │
│ user_id        INT FK → users           │
│ sender_id      INT FK → users           │
│ sender_name    VARCHAR(255)             │
│ title          VARCHAR(500)             │
│ message        NVARCHAR(2000)           │
│ type           VARCHAR(50)              │ ← 'info','warning','success','error'
│ priority       VARCHAR(50)              │ ← 'normal','high','urgent'
│ is_read        BIT                      │
│ created_at     DATETIME2                │
│ expires_at     DATETIME2                │ ← Auto-expire after 7 days
└─────────────────────────────────────────┘
Indexes:
  - IX_notifications_user_id (user_id)
  - IX_notifications_created_at (created_at)
  - IX_notifications_expires_at (expires_at)
```

### 5️⃣ user_profiles (Extended Info)
```
┌─────────────────────────────────────────┐
│ user_profiles                           │
├─────────────────────────────────────────┤
│ id                    INT IDENTITY PK   │
│ user_id               INT FK → users    │
│ full_name             VARCHAR(255)      │
│ email                 VARCHAR(255)      │
│ phone                 VARCHAR(20)       │
│ department            VARCHAR(100)      │
│ year_of_study         INT               │
│ employee_id           VARCHAR(50)       │
│ mess_preference       VARCHAR(100)      │
│ dietary_restrictions  NVARCHAR(500)     │
│ profile_picture_url   VARCHAR(500)      │
│ date_of_birth         DATE              │
│ gender                VARCHAR(10)       │
│ address               NVARCHAR(500)     │
│ emergency_contact     VARCHAR(20)       │
│ credit_points         INT               │ ← Reward points
│ total_feedback_given  INT               │
│ created_at            DATETIME2         │
│ updated_at            DATETIME2         │
└─────────────────────────────────────────┘
```

### 6️⃣ user_points (Points System)
```
┌─────────────────────────────────────────┐
│ user_points                             │
├─────────────────────────────────────────┤
│ id             INT IDENTITY PK          │
│ user_id        INT FK → users           │
│ points         INT                      │ ← Current balance
│ total_earned   INT                      │ ← Lifetime earned
│ total_spent    INT                      │ ← Lifetime spent
│ last_updated   DATETIME2                │
└─────────────────────────────────────────┘
```

### 7️⃣ mess_halls (Facility Management)
```
┌─────────────────────────────────────────┐
│ mess_halls                              │
├─────────────────────────────────────────┤
│ id                INT IDENTITY PK       │
│ name              VARCHAR(100)          │
│ location          VARCHAR(255)          │
│ capacity          INT                   │
│ manager_id        INT FK → users        │
│ operating_hours   VARCHAR(100)          │
│ contact_number    VARCHAR(20)           │
│ facilities        NVARCHAR(500)         │
│ is_active         BIT                   │
│ created_at        DATETIME2             │
└─────────────────────────────────────────┘
```

### 8️⃣ menu_items (Food Database)
```
┌─────────────────────────────────────────┐
│ menu_items                              │
├─────────────────────────────────────────┤
│ id                    INT IDENTITY PK   │
│ name                  VARCHAR(255)      │
│ category              VARCHAR(50)       │ ← 'breakfast','lunch','dinner','snacks'
│ description           NVARCHAR(500)     │
│ ingredients           NVARCHAR(500)     │
│ allergens             VARCHAR(255)      │
│ nutritional_info      NVARCHAR(500)     │
│ price                 DECIMAL(10,2)     │
│ is_vegetarian         BIT               │
│ is_vegan              BIT               │
│ spice_level           VARCHAR(20)       │ ← 'mild','medium','spicy','very_spicy'
│ calories_per_serving  INT               │
│ created_at            DATETIME2         │
└─────────────────────────────────────────┘
```

### 9️⃣ daily_menus (Menu Planning)
```
┌─────────────────────────────────────────┐
│ daily_menus                             │
├─────────────────────────────────────────┤
│ id             INT IDENTITY PK          │
│ mess_hall_id   INT FK → mess_halls      │
│ menu_date      DATE                     │
│ meal_type      VARCHAR(50)              │
│ created_at     DATETIME2                │
└─────────────────────────────────────────┘
Indexes:
  - IX_daily_menus_hall_date (mess_hall_id, menu_date, meal_type)
```

### 🔟 meal_types (Meal Definitions)
```
┌─────────────────────────────────────────┐
│ meal_types                              │
├─────────────────────────────────────────┤
│ id             INT IDENTITY PK          │
│ name           VARCHAR(50)              │ ← 'breakfast','lunch','dinner'
│ display_name   VARCHAR(100)             │
│ time_range     VARCHAR(50)              │ ← '7:00 AM - 10:00 AM'
│ is_active      BIT                      │
└─────────────────────────────────────────┘
```

### 1️⃣1️⃣ Feedback (Legacy Table)
```
┌─────────────────────────────────────────┐
│ Feedback (Legacy - Still Used)          │
├─────────────────────────────────────────┤
│ id                    INT IDENTITY PK   │
│ StudentName           VARCHAR(255)      │
│ Roll                  VARCHAR(50)       │
│ Meal                  VARCHAR(100)      │
│ Rating                INT (1-5)         │
│ Emotion               VARCHAR(50)       │
│ Comment               NVARCHAR(1000)    │
│ created_at            DATETIME2         │
│ mess_hall             VARCHAR(100)      │
│ meal_time             VARCHAR(20)       │
│ food_quality_rating   INT (1-5)         │
│ service_rating        INT (1-5)         │
│ cleanliness_rating    INT (1-5)         │
│ is_anonymous          BIT               │
└─────────────────────────────────────────┘
Indexes:
  - IX_feedback_roll_date (Roll, created_at DESC)
  - IX_feedback_meal_rating (Meal, Rating)
```

---

## 🔗 FOREIGN KEY RELATIONSHIPS

```
users (id)
  ├─► user_profiles (user_id)
  ├─► user_points (user_id)
  ├─► feedback_submissions (user_id)
  ├─► complaints (user_id)
  ├─► complaints (assigned_to)
  ├─► notifications (user_id)
  ├─► notifications (sender_id)
  └─► mess_halls (manager_id)

mess_halls (id)
  └─► daily_menus (mess_hall_id)

menu_items (id)
  └─► daily_menu_items (menu_item_id)

daily_menus (id)
  └─► daily_menu_items (daily_menu_id)
```

---

## 📈 DATA FLOW DIAGRAM

```
┌─────────────┐
│   STUDENT   │
└──────┬──────┘
       │
       │ Login
       ▼
┌─────────────────────┐
│  Authentication     │
│  (users table)      │
└──────┬──────────────┘
       │
       │ Success → JWT Token
       ▼
┌─────────────────────┐
│  Student Dashboard  │
└──────┬──────────────┘
       │
       ├─────► Submit Feedback ──────► feedback_submissions
       │
       ├─────► File Complaint ────────► complaints
       │
       ├─────► View Notifications ────► notifications
       │
       └─────► Earn Points ───────────► user_points (+10)


┌─────────────┐
│    ADMIN    │
└──────┬──────┘
       │
       │ Login
       ▼
┌─────────────────────┐
│  Authentication     │
│  (users table)      │
└──────┬──────────────┘
       │
       │ Success → JWT Token
       ▼
┌─────────────────────┐
│  Admin Dashboard    │
└──────┬──────────────┘
       │
       ├─────► View All Users ────────► users
       │
       ├─────► View Feedback ─────────► feedback_submissions
       │
       ├─────► Manage Complaints ─────► complaints (update status)
       │
       ├─────► Send Notifications ────► notifications (insert)
       │
       └─────► View Analytics ────────► Aggregate queries
```

---

## 🎯 COMMON QUERIES

### Get User with Profile
```sql
SELECT 
    u.id, u.username, u.role,
    p.full_name, p.email, p.credit_points
FROM users u
LEFT JOIN user_profiles p ON u.id = p.user_id
WHERE u.id = @userId;
```

### Get User Feedback History
```sql
SELECT 
    f.id, f.meal_type, f.mess_hall,
    f.service_rating, f.cleanliness_rating,
    f.comments, f.created_at
FROM feedback_submissions f
WHERE f.user_id = @userId
ORDER BY f.created_at DESC;
```

### Get Active Complaints
```sql
SELECT 
    c.id, c.title, c.severity, c.status,
    u.username as submitted_by,
    c.created_at
FROM complaints c
JOIN users u ON c.user_id = u.id
WHERE c.status IN ('open', 'in_progress')
ORDER BY c.priority_level DESC, c.created_at DESC;
```

### Get Dashboard Statistics
```sql
SELECT 
    (SELECT COUNT(*) FROM users) as total_users,
    (SELECT COUNT(*) FROM feedback_submissions) as total_feedback,
    (SELECT COUNT(*) FROM complaints WHERE status = 'open') as active_complaints,
    (SELECT AVG(CAST(service_rating as FLOAT)) FROM feedback_submissions) as avg_rating;
```

### Get User Points
```sql
SELECT 
    up.points as current_points,
    up.total_earned,
    up.total_spent,
    (SELECT COUNT(*) FROM feedback_submissions WHERE user_id = @userId) * 10 as calculated_points
FROM user_points up
WHERE up.user_id = @userId;
```

---

## 🔢 SAMPLE DATA

### users Table
| id | username | role | is_active |
|----|----------|------|-----------|
| 1 | admin | admin | 1 |
| 2 | student001 | student | 1 |
| 3 | student002 | student | 1 |

### feedback_submissions Table
| id | user_id | meal_type | service_rating | cleanliness_rating |
|----|---------|-----------|----------------|-------------------|
| 1 | 2 | lunch | 4 | 5 |
| 2 | 3 | breakfast | 5 | 4 |

### complaints Table
| id | user_id | title | status | severity |
|----|---------|-------|--------|----------|
| 1 | 2 | Cold food | open | medium |
| 2 | 3 | Slow service | in_progress | low |

---

## 📊 TABLE SIZES (Estimated)

| Table | Columns | Avg Row Size | Growth Rate |
|-------|---------|--------------|-------------|
| users | 10 | ~200 bytes | Low |
| feedback_submissions | 13 | ~500 bytes | High |
| complaints | 15 | ~800 bytes | Medium |
| notifications | 11 | ~600 bytes | High |
| user_profiles | 18 | ~1 KB | Low |
| mess_halls | 9 | ~300 bytes | Very Low |
| menu_items | 13 | ~500 bytes | Low |

---

## 🔐 SECURITY CONSIDERATIONS

### Password Storage
- **Algorithm:** bcrypt
- **Salt Rounds:** 12
- **Hash Example:** `$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj6hsxq/VjVe`

### Account Lockout
- **Max Attempts:** 5
- **Lockout Duration:** 15 minutes
- **Fields:** `login_attempts`, `locked_until`

### Data Encryption
- **In Transit:** TLS/SSL (encrypt=true)
- **At Rest:** Azure SQL encryption
- **Connection:** Encrypted by default

---

## 📝 INDEXES SUMMARY

```sql
-- Users table
CREATE INDEX IX_users_username ON users (username);
CREATE INDEX IX_users_role ON users (role);

-- Feedback table
CREATE INDEX IX_feedback_roll_date ON Feedback (Roll, created_at DESC);
CREATE INDEX IX_feedback_meal_rating ON Feedback (Meal, Rating);

-- Feedback submissions
CREATE INDEX IX_feedback_user_date ON feedback_submissions (user_id, created_at DESC);
CREATE INDEX IX_feedback_meal_date ON feedback_submissions (created_at DESC);

-- Complaints
CREATE INDEX IX_complaints_user_id ON complaints (user_id);
CREATE INDEX IX_complaints_status ON complaints (status);
CREATE INDEX IX_complaints_type ON complaints (complaint_type);

-- Notifications
CREATE INDEX IX_notifications_user_id ON notifications (user_id);
CREATE INDEX IX_notifications_created_at ON notifications (created_at);

-- Daily menus
CREATE INDEX IX_daily_menus_hall_date ON daily_menus (mess_hall_id, menu_date, meal_type);
```

---

**END OF SCHEMA DOCUMENTATION**

*For queries or modifications, refer to scripts/ folder*
