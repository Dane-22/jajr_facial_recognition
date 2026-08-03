# Chat Widget & AI Assistant Architecture and Technical Flow

## 1. Executive Summary

The **Chat Widget & AI Assistant** in the Facial Recognition Attendance System is a dual-mode, real-time interactive widget embedded across the Admin Portal. Designed for seamless administration, system monitoring, and inter-admin communication, it operates on a **hybrid local-first architecture**:

1. **🤖 AI Assistant Engine (`assistantEngine.js`)**: A 100% local, zero-API-key Natural Language Processing (NLP) and rule-based intent engine. It features Web Speech API integration (voice dictation and voice synthesis), automatic UI tab navigation dispatching, and dynamic retrieval of live backend metrics.
2. **💬 Real-Time Group Chat Messenger (`AIChatWidget.jsx`, `server.js`, `chatRoutes.js`)**: A multi-channel real-time chat platform powered by Socket.IO and REST endpoints. It supports room management, live typing indicators, message replies, attachments, and emoji reactions.

---

## 2. System Architecture & High-Level Flow

Below is an overview of how the Chat Widget interfaces with the Frontend UI, the Local NLP Engine, Web APIs, and Backend Services:

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                                FRONTEND CLIENT                                   │
│                                                                                  │
│   ┌──────────────────────────────────────────────────────────────────────────┐   │
│   │                      AdminLayout.jsx / App.jsx                           │   │
│   │  - Holds Active Portal Tab State ('dashboard', 'employees', 'logs', etc.)│   │
│   │  - Handles Navigation Callbacks (onNavigate)                             │   │
│   └─────────────────────────────────────┬────────────────────────────────────┘   │
│                                         │                                        │
│   ┌─────────────────────────────────────▼────────────────────────────────────┐   │
│   │                         AIChatWidget.jsx (Floating Button)               │   │
│   │  - State: isOpen, activeWidgetTab ('ai' | 'group'), aiMessages, unread  │   │
│   │  - Controls Web Speech API (SpeechRecognition & SpeechSynthesis)         │   │
│   └──────────────────────────┬───────────────────────────────┬───────────────┘   │
│                              │                               │                   │
│            (Tab 1: AI Assistant Query)            (Tab 2: Group Chat Messaging)  │
│                              │                               │                   │
│   ┌──────────────────────────▼──────────┐         ┌──────────▼───────────────┐   │
│   │        assistantEngine.js           │         │ GroupChatView & Socket   │   │
│   │  - Lowercase Regex Intent Matcher   │         │ - socket.io-client       │   │
│   │  - Formats Cards & Action Chips     │         │ - Real-time listeners    │   │
│   └──────────────────────────┬──────────┘         └──────────┬───────────────┘   │
└──────────────────────────────┼───────────────────────────────┼───────────────────┘
                               │ HTTP / GET                    │ WebSocket / REST
                               ▼                               ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│                                 BACKEND SERVER                                   │
│                                                                                  │
│   ┌─────────────────────────────────────┐         ┌──────────────────────────┐   │
│   │     /api/assistant/summary          │         │       Socket.IO          │   │
│   │  - Executes SQL Queries for Stats   │         │ - chat:send_message      │   │
│   │  - Returns Attendance Summaries     │         │ - chat:add_reaction      │   │
│   └──────────────────────────┬──────────┘         └──────────┬───────────────┘   │
│                              │                               │                   │
│                              └───────────────┬───────────────┘                   │
│                                              ▼                                   │
│                              ┌───────────────────────────────┐                   │
│                              │        MySQL Database         │                   │
│                              │  - users                      │                   │
│                              │  - attendance_logs            │                   │
│                              │  - chat_messages & reactions  │                   │
│                              └───────────────────────────────┘                   │
└──────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Dual-Mode Architecture

The floating trigger button rendered by `AIChatWidget.jsx` opens an overlay containing a top tab-bar selector:

### Mode 1: 🤖 AI Assistant Tab
Focuses on natural language query processing, voice command handling, system diagnostics, FAQ troubleshooting, and interactive UI navigation.

Key features:
- **Zero API Key Requirement**: Operates without external paid APIs (e.g., OpenAI or Claude), ensuring low latency, high privacy, and zero operational cost.
- **Voice Dictation**: Uses browser-native Web Speech API (`webkitSpeechRecognition` / `SpeechRecognition`) to convert spoken user speech to text input.
- **Speech Synthesis**: Converts bot responses into speech using `window.speechSynthesis`.
- **UI Navigation Dispatching**: Can issue `SWITCH_TAB` actions to change portal screens automatically.
- **Structured Data Cards**: Renders visual statistics (`STAT_SUMMARY`) and list layouts (`EMPLOYEE_LIST`).

### Mode 2: 💬 Group Chat Tab
A real-time messenger for administrators and system operators.

Key features:
- **Room Navigation (`ConversationList.jsx`)**: Lists all group chat channels with unread badges, last message previews, and group creation triggers (`CreateGroupModal.jsx`).
- **Real-Time Communication (`GroupChatView.jsx`)**: Manages room messages over WebSocket via Socket.IO, handling live typing indicators, message replies, file attachments, and emoji reactions (`👍`, `❤️`, `😂`, `😮`, `😢`, `🔥`).

---

## 4. Deep Dive: AI Assistant Engine (`assistantEngine.js`)

The `assistantEngine.js` service is the intelligence core of the AI Assistant. It exports two primary functions:

### 1. `getAssistantSummary()`
Fetches current attendance statistics from the backend REST API:
- Endpoint: `GET /api/assistant/summary` with `Authorization: Bearer <admin_token>`.
- **Offline Fallback**: If the server is unreachable or offline during maintenance, it gracefully catches the error and returns a mock dataset (50 total employees, 42 present, 8 absent, 3 late) to prevent UI crashes.

### 2. `processAssistantQuery(query, currentTab)`
Main intent-classification handler. Operates in 5 sequential stages:

#### Step 1: Input Normalization
- Trims whitespace and converts raw query text to lowercase.
- Empty query check: Returns a polite prompt asking the user to speak or type.

#### Step 2: Intent Matching Engine (Regex Rules)
The query is evaluated against categorized regular expression patterns:

| Intent Category | Regex Match Patterns | Action / Output |
| :--- | :--- | :--- |
| **Greetings** | `^(hi\|hello\|hey\|greetings\|good morning...)` | Returns welcoming greeting & suggested action chips. |
| **Navigation: Register** | `(register\|enroll\|add new face...)` | Text response + Action: `{ type: 'SWITCH_TAB', payload: 'employees' }`. |
| **Navigation: Logs** | `(daily log\|check in log\|attendance log...)` | Text response + Action: `{ type: 'SWITCH_TAB', payload: 'logs' }`. |
| **Navigation: Employees** | `(employee list\|staff\|directory...)` | Text response + Action: `{ type: 'SWITCH_TAB', payload: 'employees' }`. |
| **Navigation: Audit** | `(attendance audit\|verify attendance...)` | Text response + Action: `{ type: 'SWITCH_TAB', payload: 'audit' }`. |
| **Navigation: System Audit** | `(audit log\|security log\|system log...)` | Text response + Action: `{ type: 'SWITCH_TAB', payload: 'audit-logs' }`. |
| **Navigation: Reports** | `(report\|export\|excel\|download\|pdf...)` | Text response + Action: `{ type: 'SWITCH_TAB', payload: 'reports' }`. |
| **Navigation: Admin** | `(admin management\|manage admin\|add admin...)`| Text response + Action: `{ type: 'SWITCH_TAB', payload: 'admin-management' }`. |
| **Navigation: Settings** | `(setting\|config\|change password...)` | Text response + Action: `{ type: 'SWITCH_TAB', payload: 'settings' }`. |
| **Navigation: Dashboard** | `(dashboard\|chart\|graph\|analytics...)` | Text response + Action: `{ type: 'SWITCH_TAB', payload: 'dashboard' }`. |
| **Data Query: Summary** | `(summary\|overview\|status\|attendance rate...)`| Fetches metrics via `getAssistantSummary()`, returns `STAT_SUMMARY` card. |
| **Data Query: Late** | `(late\|tardy\|delay\|after 9\|who is late)` | Fetches metrics, parses `lateEmployees`, returns `EMPLOYEE_LIST` card + switches to `'logs'`. |
| **Data Query: Absent** | `(absent\|missing\|not checked in)` | Fetches metrics, returns `STAT_SUMMARY` card with absent counts. |
| **Troubleshooting FAQ** | `(camera\|lighting\|face not detected...)` | Returns multi-step guide on camera positioning, distance, lighting, and descriptor samples. |
| **Registration FAQ** | `(how to register\|enroll new employee...)` | Returns 4-step registration guide + Action: `{ type: 'SWITCH_TAB', payload: 'register' }`. |
| **Fallback** | *Unmatched input* | Returns default helpful guidance and general suggested action chips. |

---

## 5. Backend Assistant API (`assistantRoutes.js`)

Located at `/backend/routes/assistantRoutes.js`, this router handles metric generation and employee search queries. All routes require admin authentication (`verifyAdminToken`).

### Endpoint 1: `GET /api/assistant/summary`
Performs parallel/sequential SQL queries on `facial_attendance_db`:

1. **Total Registered Employees**:
   ```sql
   SELECT COUNT(*) as total FROM users;
   ```
2. **Today's Check-ins & Check-outs**:
   ```sql
   SELECT 
     COUNT(DISTINCT CASE WHEN status = 'IN' THEN user_id END) as checked_in,
     COUNT(DISTINCT CASE WHEN status = 'OUT' THEN user_id END) as checked_out
   FROM attendance_logs
   WHERE DATE(timestamp) = CURDATE();
   ```
3. **Absence Calculation**:
   `absent = Math.max(0, totalEmployees - checkedIn)`
4. **Attendance Rate Calculation**:
   `attendanceRate = Math.round((checkedIn / totalEmployees) * 100)`
5. **Late Arrivals List (Check-ins after 09:00:00 AM)**:
   ```sql
   SELECT 
     u.id, 
     u.name as full_name, 
     u.role as employee_id, 
     al.timestamp
   FROM attendance_logs al
   JOIN users u ON al.user_id = u.id
   WHERE DATE(al.timestamp) = CURDATE()
     AND al.status = 'IN'
     AND TIME(al.timestamp) > '09:00:00'
   ORDER BY al.timestamp ASC
   LIMIT 10;
   ```
6. **Recent System Audit Events**:
   ```sql
   SELECT action, user_type, entity_type, timestamp 
   FROM audit_logs 
   ORDER BY timestamp DESC 
   LIMIT 3;
   ```

### Endpoint 2: `GET /api/assistant/search?q=:query`
Searches the `users` table by employee name or role string for quick lookups (`LIKE %q%`).

---

## 6. End-to-End Execution Flows

### Flow A: Voice-Driven AI Assistant Query & Portal Navigation

```
  USER              AIChatWidget          Speech API      assistantEngine        AdminLayout
   │                     │                    │                 │                     │
   │─── Clicks 🎙️ ────────►│                    │                 │                     │
   │                     │─── .start() ──────►│                 │                     │
   │                     │                    │                 │                     │
   │── (Speaks "Who is late today?") ────────►│                 │                     │
   │                     │◄── transcript ─────│                 │                     │
   │                     │                    │                 │                     │
   │                     │─── processAssistantQuery("who is late today?") ───────────►│
   │                     │                                      │                     │
   │                     │                                      │─── GET /api/assistant/summary
   │                     │                                      │◄── SQL Results      │
   │                     │                                      │                     │
   │                     │◄── { text, card: EMPLOYEE_LIST, action: SWITCH_TAB }───────│
   │                     │                                                            │
   │◄── Render Card ─────│                                                            │
   │    & Speak Response │─── window.speechSynthesis ─────────────────────────────────┤
   │                     │                                                            │
   │                     │─── onNavigate('logs') ────────────────────────────────────►│
   │                     │                                                            │ (Tab switches to 'logs')
```

### Flow B: Group Chat Real-Time Messaging & Reactions

```
Admin A (Sender)          Socket.IO Server            MySQL DB            Admin B (Recipient)
   │                            │                        │                        │
   │─── chat:send_message ─────►│                        │                        │
   │    { roomId: 1, content }  │                        │                        │
   │                            │─── INSERT INTO ───────►│                        │
   │                            │    chat_messages       │                        │
   │                            │◄── insertId ───────────│                        │
   │                            │                                                 │
   │◄── chat:new_message ───────┼────────────────────────────────────────────────►│ (UI Updates &
   │    (Echo Ack)              │                                                 │  Unread Badge Increment)
   │                            │                                                 │
   │                            │◄── chat:add_reaction ───────────────────────────│
   │                            │    { messageId, emoji: '👍' }                    │
   │                            │                        │                        │
   │                            │─── INSERT INTO ───────►│                        │
   │                            │    reactions           │                        │
   │                            │                        │                        │
   │◄── chat:reaction_updated ──┴─────────────────────────────────────────────────┤
```

---

## 7. Component Reference & Configuration

### Frontend Components Map
- **[AIChatWidget.jsx](file:///c:/wamp64/www/face_recog/frontend/src/components/AIChatWidget.jsx)**: Main floating widget container managing state for both tabs, Web Speech API instances, and socket events.
- **[assistantEngine.js](file:///c:/wamp64/www/face_recog/frontend/src/services/assistantEngine.js)**: Local intent matching rules, backend API wrapper, and fallback data provider.
- **[ConversationList.jsx](file:///c:/wamp64/www/face_recog/frontend/src/components/chat/ConversationList.jsx)**: Renders available group chat rooms with search and unread message indicators.
- **[GroupChatView.jsx](file:///c:/wamp64/www/face_recog/frontend/src/components/chat/GroupChatView.jsx)**: Renders active room transcript, reaction bar, reply preview, and text box.
- **[CreateGroupModal.jsx](file:///c:/wamp64/www/face_recog/frontend/src/components/chat/CreateGroupModal.jsx)**: Modal for creating new group channels and selecting member participants.

### Backend Components Map
- **[assistantRoutes.js](file:///c:/wamp64/www/face_recog/backend/routes/assistantRoutes.js)**: Express router for system metrics and employee search.
- **[chatRoutes.js](file:///c:/wamp64/www/face_recog/backend/routes/chatRoutes.js)**: REST router for message histories, participants, and room creation.
- **[server.js](file:///c:/wamp64/www/face_recog/backend/server.js)**: Socket.IO setup, connection authorization (`join-admin`), room handling, message persistence, and broadcast emitters.

---

## 8. Summary of Key Strengths

1. **Privacy & Zero Cost**: Runs 100% on-device/on-premise using client regex and local database queries; requires no third-party API subscriptions or internet API keys.
2. **Interactive UI Control**: The AI is direct-linked to the React routing state (`onNavigate`), letting admins control portal tabs via voice or text prompts (e.g., "Take me to Register Face").
3. **Resilience**: Features graceful offline fallback datasets for summary queries, ensuring the UI remains responsive even if the backend service is restarting.
4. **Rich Visual Output**: Combines raw text responses with interactive stat cards, progress bars, employee lists, suggested quick-chips, and audio synthesis.
