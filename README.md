# QuizPro MCA Professional

A polished MCA-level Online Assessment & Learning Portal using Node.js, Express, MySQL and a responsive HTML/CSS/JavaScript frontend.

## Highlights
- 👨‍🎓 Boy student avatar, 👩‍🎓 Girl student avatar and 🧑‍🎓 Other avatar
- 📚 Subject-specific emojis
- ⏱ 10-minute timed quizzes
- 🧭 Question palette and progress bar
- 📊 Attempts, average score, best score and accuracy
- ✅ Correct / ❌ Wrong / ⭕ Not Attempted counts
- 🔍 Detailed attempt review
- 💡 Correct answer + explanation for every question
- 🏆 Leaderboard
- 🛠 Admin dashboard for students, subjects and questions
- 💾 MySQL persistence
- 🔧 Automatic database migration: if an older `online_quiz` database is already imported, the server adds the new `gender`, `icon`, `color` and `explanation` columns automatically. No re-import is required.

## Run
1. Start Apache/MySQL from XAMPP (MySQL is the important service).
2. If you already imported `online_quiz`, keep it. Do not import it again.
3. Open this folder in VS Code.
4. Open a terminal:
   `cd backend`
5. Install dependencies:
   `npm install`
6. Start:
   `npm start`
7. Open `http://localhost:3000`

## Demo accounts
- Admin: `admin@quiz.com` / `admin123`
- Boy student: `aarav@quiz.com` / `student123`
- Girl student: `ananya@quiz.com` / `student123`

> This is a local MCA project/demo. Passwords are intentionally simple for classroom demonstration; production systems should use password hashing and authenticated server-side sessions/JWT.


## New MCA assessment controls
- Admin can delete student accounts and subjects.
- Admin can set each subject's test duration in minutes (1-180).
- Students receive visible time warnings at 1 minute, 30 seconds and 10 seconds.
- At 0 seconds the quiz automatically submits and closes.
- Existing `online_quiz` databases are upgraded automatically; no re-import is required.
