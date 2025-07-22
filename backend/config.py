import os 
from dotenv import load_dotenv

load_dotenv()

curr_env = os.environ["MODE"] if "MODE" in os.environ else "development"
DB_URL = "" if curr_env == "production" else "localhost"
DB_USERNAME = os.getenv("DB_USERNAME")
DB_PASSWORD = os.getenv("DB_PASSWORD")
DB_NAME = os.getenv("DB_NAME")
TIMEZONE = os.getenv("TIMEZONE")

APP_SECRET_KEY = os.getenv("APP_SECRET_KEY")

config = {
    "SQL_URI": "postgresql+psycopg2://theyearly@localhost:5432/amplace",
    "TIMEZONE": TIMEZONE,
    "APP_SECRET_KEY" : APP_SECRET_KEY
}
