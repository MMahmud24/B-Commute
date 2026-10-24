# B-Commute

Commuter app for Binghamton University students: transit planner + carpooling.

## Run locally

Backend (http://localhost:8000):

    cd backend
    python3 -m venv .venv && source .venv/bin/activate   # first time only
    pip install -r requirements.txt                      # first time only
    cp .env.example .env                                 # first time only
    python manage.py migrate
    python manage.py runserver

Frontend (http://localhost:5173):

    cd frontend
    cp .env.example .env                                 # first time only
    npm install                                          # first time only
    npm run dev
