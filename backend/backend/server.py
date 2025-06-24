from fastapi import FastAPI, APIRouter, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime, date
import json
from collections import defaultdict, Counter
import uuid

# Initialize emergentintegrations
from emergentintegrations.llm.chat import LlmChat, UserMessage

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# OpenAI Configuration
OPENAI_API_KEY = os.environ.get('OPENAI_API_KEY')

# In-memory storage for MVP
personal_info_storage = None
daily_time_logs_storage = []
daily_journals_storage = []
insights_storage = []

app = FastAPI(title="The Life Audit - Stage One")
api_router = APIRouter(prefix="/api")

# === DATA MODELS ===

class PersonalInfoForm(BaseModel):
    date_completed: date = Field(default_factory=date.today)
    more_time_activities: List[str] = Field(max_items=5)
    resent_time_activities: List[str] = Field(max_items=5)
    love_time_activities: List[str] = Field(max_items=5)
    regrets: List[str] = Field(max_items=5)
    wishes: List[str] = Field(max_items=5)
    notes: str = ""

class TimeSlot(BaseModel):
    hour: int  # 0-23
    half_hour: int  # 0 or 30
    label: str = ""  # sleep, work, social media, creative, etc.

class DailyTimeLogForm(BaseModel):
    date: date
    day_of_week: str
    sleep_time: str
    time_slots: List[TimeSlot] = []
    daily_notes: str = ""

class MorningCheckin(BaseModel):
    feeling: str
    because: str

class Health(BaseModel):
    issues: str = ""
    weight: Optional[float] = None
    exercise: str = ""
    supplements: str = ""

class FoodAndDrink(BaseModel):
    breakfast: str = ""
    lunch: str = ""
    supper: str = ""
    snacks: str = ""
    beverages: str = ""
    alcohol: str = ""
    cigarettes: str = ""
    diet_units: str = ""

class Relationships(BaseModel):
    special_person: bool = False
    friends: bool = False
    family: bool = False
    colleagues: bool = False
    acquaintances: bool = False
    professional_support: bool = False

class DailyLife(BaseModel):
    domestic_chores: str = ""
    work_completed: str = ""
    achievements: str = ""
    frustrations: str = ""
    money_earned: str = ""
    money_spent: str = ""
    clothing: str = ""
    leisure: str = ""
    citizenship_activity: str = ""

class EveningCheckin(BaseModel):
    feeling: str
    because: str

class DailyJournalForm(BaseModel):
    date: date
    day_of_week: str
    morning_checkin: MorningCheckin
    health: Health
    food_and_drink: FoodAndDrink
    relationships: Relationships
    daily_life: DailyLife
    evening_checkin: EveningCheckin
    blessings_counted: str = ""
    other_notes: str = ""

class InsightModel(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    type: str  # theme, pattern, recommendation
    title: str
    content: str
    priority: int  # 1-5, 5 being highest
    created_at: datetime = Field(default_factory=datetime.utcnow)
    based_on_days: int = 0

class AnalysisRequest(BaseModel):
    include_personal_info: bool = True
    date_range_start: Optional[date] = None
    date_range_end: Optional[date] = None

class CompletionStatus(BaseModel):
    date: date
    personal_info_completed: bool
    time_log_completed: bool
    journal_completed: bool

# === API ENDPOINTS ===

@api_router.get("/")
async def root():
    return {"message": "Welcome to The Life Audit - Stage One: Awareness & Reflection"}

@api_router.post("/personal-info")
async def submit_personal_info(form_data: PersonalInfoForm):
    """Submit the one-time Really Personal Information form"""
    global personal_info_storage
    
    if personal_info_storage is not None:
        raise HTTPException(status_code=400, detail="Personal information form has already been completed")
    
    personal_info_storage = form_data.dict()
    return {"message": "Personal information saved successfully", "data": personal_info_storage}

@api_router.get("/personal-info")
async def get_personal_info():
    """Get the personal information form data"""
    if personal_info_storage is None:
        return {"completed": False, "data": None}
    return {"completed": True, "data": personal_info_storage}

@api_router.post("/daily-time-log")
async def submit_daily_time_log(form_data: DailyTimeLogForm):
    """Submit daily time log"""
    # Check if already submitted for this date
    existing = next((log for log in daily_time_logs_storage if log["date"] == str(form_data.date)), None)
    if existing:
        # Update existing entry
        daily_time_logs_storage.remove(existing)
    
    daily_time_logs_storage.append(form_data.dict())
    await generate_insights()  # Auto-update insights
    return {"message": "Daily time log saved successfully"}

@api_router.post("/daily-journal")
async def submit_daily_journal(form_data: DailyJournalForm):
    """Submit daily journal"""
    # Check if already submitted for this date
    existing = next((journal for journal in daily_journals_storage if journal["date"] == str(form_data.date)), None)
    if existing:
        # Update existing entry
        daily_journals_storage.remove(existing)
    
    daily_journals_storage.append(form_data.dict())
    await generate_insights()  # Auto-update insights
    return {"message": "Daily journal saved successfully"}

@api_router.get("/daily-time-log/{date_str}")
async def get_daily_time_log(date_str: str):
    """Get time log for specific date"""
    log = next((log for log in daily_time_logs_storage if log["date"] == date_str), None)
    return {"data": log}

@api_router.get("/daily-journal/{date_str}")
async def get_daily_journal(date_str: str):
    """Get journal for specific date"""
    journal = next((journal for journal in daily_journals_storage if journal["date"] == date_str), None)
    return {"data": journal}

@api_router.get("/completion-status")
async def get_completion_status():
    """Get completion status for each day"""
    status_list = []
    
    # Get unique dates from both daily forms
    time_log_dates = {log["date"] for log in daily_time_logs_storage}
    journal_dates = {journal["date"] for journal in daily_journals_storage}
    all_dates = time_log_dates.union(journal_dates)
    
    for date_str in sorted(all_dates):
        status_list.append(CompletionStatus(
            date=date_str,
            personal_info_completed=personal_info_storage is not None,
            time_log_completed=date_str in time_log_dates,
            journal_completed=date_str in journal_dates
        ).dict())
    
    return {"completion_status": status_list, "total_days": len(status_list)}

@api_router.post("/analyze")
async def analyze_data(request: AnalysisRequest):
    """Generate comprehensive analysis and insights"""
    await generate_insights()
    return {"insights": insights_storage, "total_insights": len(insights_storage)}

@api_router.get("/insights")
async def get_insights():
    """Get current insights"""
    return {"insights": insights_storage, "total_insights": len(insights_storage)}

async def generate_insights():
    """Generate AI-powered insights from collected data"""
    global insights_storage
    insights_storage.clear()
    
    # Calculate days of data
    total_days = len(set([log["date"] for log in daily_time_logs_storage + daily_journals_storage]))
    
    # PATTERN ANALYSIS
    
    # 1. Morning vs Evening Mood Patterns
    morning_feelings = []
    evening_feelings = []
    for journal in daily_journals_storage:
        morning_feelings.append(journal["morning_checkin"]["feeling"].lower())
        evening_feelings.append(journal["evening_checkin"]["feeling"].lower())
    
    if morning_feelings:
        common_morning = Counter(morning_feelings).most_common(3)
        common_evening = Counter(evening_feelings).most_common(3)
        
        insights_storage.append(InsightModel(
            type="pattern",
            title="Mood Patterns",
            content=f"You most commonly wake up feeling '{common_morning[0][0]}' and go to bed feeling '{common_evening[0][0]}'. Understanding these patterns can help you optimize your daily rhythm.",
            priority=4,
            based_on_days=total_days
        ).dict())
    
    # 2. Frustration Themes
    frustrations = []
    for journal in daily_journals_storage:
        if journal["daily_life"]["frustrations"]:
            frustrations.append(journal["daily_life"]["frustrations"].lower())
    
    if frustrations:
        # Simple keyword analysis
        frustration_words = []
        for f in frustrations:
            frustration_words.extend(f.split())
        
        common_frustrations = Counter(frustration_words).most_common(5)
        if common_frustrations:
            insights_storage.append(InsightModel(
                type="theme",
                title="Recurring Frustrations",
                content=f"Your most frequent frustration involves '{common_frustrations[0][0]}'. Consider strategies to address or minimize this source of stress.",
                priority=5,
                based_on_days=total_days
            ).dict())
    
    # 3. Achievement Recognition
    achievements = [journal["daily_life"]["achievements"] for journal in daily_journals_storage if journal["daily_life"]["achievements"]]
    if achievements:
        insights_storage.append(InsightModel(
            type="recommendation",
            title="Celebrating Progress",
            content=f"You've recorded {len(achievements)} achievements over {total_days} days. You're making progress - remember to celebrate these wins!",
            priority=3,
            based_on_days=total_days
        ).dict())
    
    # 4. Personal Information vs Daily Life Alignment
    if personal_info_storage:
        # Check alignment between "love spending time on" and daily activities
        loved_activities = [activity.lower() for activity in personal_info_storage["love_time_activities"] if activity]
        
        if loved_activities:
            insights_storage.append(InsightModel(
                type="recommendation",
                title="Values Alignment Check",
                content=f"You mentioned loving to spend time on {', '.join(loved_activities[:2])}. Review your daily logs to see if you're making enough time for these priorities.",
                priority=4,
                based_on_days=total_days
            ).dict())
    
    # 5. Relationship Patterns
    relationship_days = 0
    for journal in daily_journals_storage:
        relationships = journal["relationships"]
        if any([relationships["special_person"], relationships["friends"], relationships["family"]]):
            relationship_days += 1
    
    if total_days > 0:
        relationship_percentage = (relationship_days / total_days) * 100
        if relationship_percentage < 50:
            insights_storage.append(InsightModel(
                type="recommendation",
                title="Social Connection",
                content=f"You've spent meaningful time with others on {relationship_percentage:.0f}% of tracked days. Consider prioritizing social connections - they're crucial for wellbeing.",
                priority=4,
                based_on_days=total_days
            ).dict())
    
    # 6. Health Tracking Insights
    exercise_days = sum(1 for journal in daily_journals_storage if journal["health"]["exercise"])
    if total_days > 0 and exercise_days > 0:
        exercise_percentage = (exercise_days / total_days) * 100
        insights_storage.append(InsightModel(
            type="pattern",
            title="Exercise Consistency",
            content=f"You've exercised on {exercise_percentage:.0f}% of tracked days. Consistency is key - even small daily movements make a difference.",
            priority=3,
            based_on_days=total_days
        ).dict())

@api_router.get("/export")
async def export_data():
    """Export all user data"""
    export_data = {
        "personal_info": personal_info_storage,
        "daily_time_logs": daily_time_logs_storage,
        "daily_journals": daily_journals_storage,
        "insights": insights_storage,
        "export_date": datetime.utcnow().isoformat()
    }
    return {"data": export_data}

# Include router and setup CORS
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
